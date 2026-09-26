import { useState, useCallback, useEffect } from 'react';
import { getVoiceAssistant, VoiceCommandIntent } from '@/lib/voiceAssistant';

export interface UseVoiceAssistantReturn {
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  clearTranscript: () => void;
  parseCommand: (text: string) => VoiceCommandIntent;
}

export const useVoiceAssistant = (): UseVoiceAssistantReturn => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const assistant = getVoiceAssistant();

  useEffect(() => {
    setIsSupported(assistant.isSupported());
  }, [assistant]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Voice assistant not supported in this browser');
      return;
    }

    setError(null);
    setTranscript('');
    setInterimTranscript('');
    setIsListening(true);

    assistant.startListening(
      (command) => {
        setTranscript(command.text);
        setInterimTranscript('');
      },
      (errorMsg) => {
        setError(errorMsg);
        setIsListening(false);
      },
      () => {
        setIsListening(false);
      },
      (interim) => {
        setInterimTranscript(interim);
      }
    );
  }, [assistant, isSupported]);

  const stopListening = useCallback(() => {
    assistant.stopListening();
    setIsListening(false);
  }, [assistant]);

  const speak = useCallback(
    (text: string) => {
      setIsSpeaking(true);

      // Safety timeout to reset speaking state if browser fails to trigger onend
      const safetyTimeout = setTimeout(() => {
        setIsSpeaking(false);
      }, 15000); // 15s max per response

      assistant.speak(text, () => {
        clearTimeout(safetyTimeout);
        setIsSpeaking(false);
      });
    },
    [assistant]
  );

  const stopSpeaking = useCallback(() => {
    assistant.stopSpeaking();
    setIsSpeaking(false);
  }, [assistant]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  const parseCommand = useCallback(
    (text: string) => {
      return assistant.parseCommand(text);
    },
    [assistant]
  );

  return {
    isListening,
    isSpeaking,
    transcript,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    clearTranscript,
    parseCommand,
  };
};
