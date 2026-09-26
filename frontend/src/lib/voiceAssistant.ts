/**
 * Voice Assistant Service
 * Handles speech recognition and text-to-speech
 */

export interface VoiceAssistantConfig {
  language?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export interface VoiceCommand {
  text: string;
  confidence: number;
  timestamp: Date;
}

class VoiceAssistantService {
  private recognition: any;
  private synthesis: SpeechSynthesis;
  private isListening: boolean = false;
  private config: VoiceAssistantConfig;

  constructor(config: VoiceAssistantConfig = {}) {
    this.config = {
      language: config.language || 'en-US',
      rate: config.rate || 1,
      pitch: config.pitch || 1,
      volume: config.volume || 1,
    };

    // Initialize speech synthesis
    this.synthesis = window.speechSynthesis;

    // Initialize speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.language = this.config.language;
    }
  }

  /**
   * Check if voice assistant is supported
   */
  isSupported(): boolean {
    return !!this.recognition && !!this.synthesis;
  }

  /**
   * Start listening for voice commands
   */
  startListening(onResult: (command: VoiceCommand) => void, onError: (error: string) => void, onEnd?: () => void, onInterimResult?: (text: string) => void): void {
    if (!this.recognition) {
      onError('Speech recognition not supported in this browser');
      return;
    }

    if (this.isListening) {
      return;
    }

    this.isListening = true;

    this.recognition.onstart = () => {
      console.log('Voice recognition started');
    };

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;

        if (event.results[i].isFinal) {
          finalTranscript = transcript.trim();
          if (finalTranscript) {
            console.log(`SkyView AI final match (${confidence.toFixed(2)}): ${finalTranscript}`);
            onResult({
              text: finalTranscript,
              confidence: confidence,
              timestamp: new Date(),
            });
          }
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript && onInterimResult) {
        onInterimResult(interimTranscript);
      }
    };

    this.recognition.onerror = (event: any) => {
      const errorMessage = this.getErrorMessage(event.error);
      onError(errorMessage);
      this.isListening = false;
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (onEnd) onEnd();
    };

    this.recognition.start();
  }

  /**
   * Stop listening
   */
  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  /**
   * Speak text using text-to-speech
   */
  speak(text: string, onEnd?: () => void): void {
    if (!this.synthesis) {
      console.error('Speech synthesis not supported');
      if (onEnd) onEnd();
      return;
    }

    // Cancel any ongoing speech and resume in case it's paused
    this.synthesis.cancel();
    this.synthesis.resume();

    // Sanitize: remove agent prefixes, special chars, and rupee symbols
    let cleanText = text
      .replace(/\[.*?\]\s*/g, '')         // remove [Mandi Agent] etc.
      .replace(/₹/g, 'rupees ')            // ₹ symbol to word
      .replace(/[^\w\s.,!?'-]/g, ' ')      // strip remaining special chars
      .replace(/\s+/g, ' ')               // collapse whitespace
      .trim();

    if (!cleanText) {
      if (onEnd) onEnd();
      return;
    }

    // Chrome has a ~200 char limit per utterance — chunk long text
    const chunks = this.chunkText(cleanText, 180);
    let chunkIndex = 0;

    const speakNextChunk = () => {
      if (chunkIndex >= chunks.length) {
        console.log('SkyView AI: Speech finished');
        if (onEnd) onEnd();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[chunkIndex]);

      // Attempt to pick a good voice
      const voices = this.synthesis.getVoices();
      if (voices.length > 0) {
        const preferredVoice = voices.find(v => v.lang.startsWith(this.config.language || 'en'));
        if (preferredVoice) utterance.voice = preferredVoice;
      }

      utterance.rate = this.config.rate || 1;
      utterance.pitch = this.config.pitch || 1;
      utterance.volume = this.config.volume || 1;
      utterance.lang = this.config.language || 'en-US';

      utterance.onend = () => {
        chunkIndex++;
        speakNextChunk();
      };

      utterance.onerror = (event: any) => {
        // "interrupted" is normal when user cancels — don't log as error
        if (event.error !== 'interrupted') {
          console.warn('SkyView AI Speech warning:', event.error);
        }
        chunkIndex++;
        speakNextChunk(); // skip failed chunk, continue
      };

      this.synthesis.speak(utterance);
    };

    console.log('SkyView AI: Speaking...', cleanText.substring(0, 60) + '...');

    // Small delay ensures previous cancel/resume takes effect
    setTimeout(speakNextChunk, 120);
  }

  /**
   * Split text into chunks at sentence boundaries
   */
  private chunkText(text: string, maxLen: number): string[] {
    if (text.length <= maxLen) return [text];
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
    const chunks: string[] = [];
    let current = '';
    for (const s of sentences) {
      if ((current + s).length > maxLen && current) {
        chunks.push(current.trim());
        current = s;
      } else {
        current += s;
      }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks;
  }

  /**
   * Cancel all speech
   */
  stopSpeaking(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: string): string {
    const errorMap: Record<string, string> = {
      'no-speech': 'No speech was detected. Please try again.',
      'network': 'Network error. Please check your connection.',
      'not-allowed': 'Microphone permission denied.',
      'audio-capture': 'No microphone found.',
    };

    return errorMap[error] || `Error: ${error}`;
  }

  /**
   * Parse voice command and extract intent
   */
  parseCommand(text: string): VoiceCommandIntent {
    const normalizedText = text.toLowerCase().trim();

    // Weather queries
    if (this.matchesKeywords(normalizedText, ['temperature', 'how hot', 'how cold', 'temp'])) {
      return {
        intent: 'get_temperature',
        confidence: 0.9,
      };
    }

    if (this.matchesKeywords(normalizedText, ['humidity', 'humidity level', 'moisture'])) {
      return {
        intent: 'get_humidity',
        confidence: 0.9,
      };
    }

    if (this.matchesKeywords(normalizedText, ['wind', 'wind speed', 'wind direction'])) {
      return {
        intent: 'get_wind',
        confidence: 0.9,
      };
    }

    if (this.matchesKeywords(normalizedText, ['rain', 'rainfall', 'precipitation'])) {
      return {
        intent: 'get_rainfall',
        confidence: 0.9,
      };
    }

    if (this.matchesKeywords(normalizedText, ['pressure', 'barometric', 'barometer'])) {
      return {
        intent: 'get_pressure',
        confidence: 0.9,
      };
    }

    if (this.matchesKeywords(normalizedText, ['alert', 'alerts', 'warning'])) {
      return {
        intent: 'get_alerts',
        confidence: 0.9,
      };
    }

    if (this.matchesKeywords(normalizedText, ['health', 'system health', 'status'])) {
      return {
        intent: 'get_health',
        confidence: 0.9,
      };
    }

    if (this.matchesKeywords(normalizedText, ['trend', 'trends', 'history'])) {
      return {
        intent: 'show_trends',
        confidence: 0.9,
      };
    }

    if (this.matchesKeywords(normalizedText, ['report', 'summary', 'generate'])) {
      return {
        intent: 'show_reports',
        confidence: 0.9,
      };
    }

    if (this.matchesKeywords(normalizedText, ['dashboard', 'home', 'main'])) {
      return {
        intent: 'show_dashboard',
        confidence: 0.9,
      };
    }

    // Generic chat fallback - handle any question not matched above
    return {
      intent: 'generic_chat',
      confidence: 0.7,
      rawText: text, // Pass original text for generic processing
    };
  }

  /**
   * Check if text contains keywords
   */
  private matchesKeywords(text: string, keywords: string[]): boolean {
    return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
  }
}

export interface VoiceCommandIntent {
  intent: string;
  confidence: number;
  rawText?: string; // For generic chat, pass the original text
}

// Create singleton instance
let instance: VoiceAssistantService | null = null;

export const getVoiceAssistant = (config?: VoiceAssistantConfig): VoiceAssistantService => {
  if (!instance) {
    instance = new VoiceAssistantService(config);
  }
  return instance;
};

export default VoiceAssistantService;
