/**
 * VoiceAssistantButton — Sarvam AI STT / TTS + Agentic orchestration
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  CHANGES vs. original                                        │
 * │  • Uses Sarvam AI /speech-to-text & /text-to-speech APIs    │
 * │  • Panel opens anchored bottom-right (above CALL AGENT btn)  │
 * │    — NOT a full-screen overlay                               │
 * │  • No overflow: panel has max-height + scroll                │
 * │  • Agentic loop: orchestrator endpoint → streams N tool-call │
 * │    steps → each step updates the "Thinking" panel live       │
 * │  • Thought labels are mapped from server process names       │
 * └─────────────────────────────────────────────────────────────┘
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { Mic, X, RotateCcw, AlignLeft, Maximize2, ChevronDown } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';
const PRIMARY = '#10B981';
const PANEL_W = 380;

function getSarvamLanguageCode(lang: string): string {
  const supported = ['hi-IN', 'en-IN', 'bn-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'pa-IN', 'ta-IN', 'te-IN', 'gu-IN', 'or-IN', 'as-IN', 'ur-IN'];
  if (supported.includes(lang)) return lang;
  const prefix = lang.split('-')[0].toLowerCase();
  const matched = supported.find(s => s.startsWith(prefix));
  if (matched) return matched;
  return 'hi-IN';
}

const DEFAULT_LANGUAGE = getSarvamLanguageCode(navigator.language || 'hi-IN');

async function sarvamSTT(audioBlob: Blob, language = 'hi-IN'): Promise<string> {
  const form = new FormData();
  form.append('file', audioBlob, 'recording.webm');
  form.append('model', 'saaras:v3');
  form.append('language_code', language);

  const res = await fetch(`${API_URL}/api/speech/transcribe`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(`Backend STT ${res.status}`);
  const data = await res.json();
  return data.transcript || '';
}

async function sarvamTTS(text: string, language = 'hi-IN'): Promise<ArrayBuffer> {
  const res = await fetch(`${API_URL}/api/speech/synthesize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: text,
      language: language,
    }),
  });
  if (!res.ok) throw new Error(`Backend TTS ${res.status}`);
  const data = await res.json();
  const b64 = data.audio || '';
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

const PROCESS_LABEL: Record<string, string> = {
  intent_classify: 'Understanding your request',
  fetch_profile: 'Reading your farmer profile',
  fetch_weather: 'Checking live sensor data',
  fetch_mandi: 'Checking mandi prices',
  fetch_gov_schemes: 'Finding relevant schemes',
  crop_advice: 'Preparing crop advice',
  soil_analysis: 'Reviewing soil conditions',
  final_response: 'Composing the answer',
  analyzing: 'Analyzing your request...',
  retrieving: 'Retrieving relevant data...',
  generating: 'Generating response...',
};

function labelFor(step: AgentStep): string {
  return PROCESS_LABEL[step.process] || step.label || step.process;
}

interface AgentStep {
  process: string;
  label?: string;
  done?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VoiceAssistantButton() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [showPanel, setShowPanel] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userText, setUserText] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [micPermission, setMicPermission] = useState<PermissionState | 'unknown'>('unknown');
  const [isExpanded, setIsExpanded] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const browserTranscriptRef = useRef('');
  const visibleTranscriptRef = useRef('');

  // ─── Permission check ─────────────────────────────────────────────────────
  useEffect(() => {
    navigator.permissions?.query({ name: 'microphone' as PermissionName })
      .then(p => {
        setMicPermission(p.state);
        p.onchange = () => setMicPermission(p.state);
      })
      .catch(() => setMicPermission('unknown'));
  }, []);

  // ─── Stop everything on unmount ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopEverything();
    };
  }, []);

  const stopEverything = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    speechRecognitionRef.current?.stop?.();
    audioSourceRef.current?.stop();
    setIsRecording(false);
    setIsProcessing(false);
    setIsSpeaking(false);
  }, []);

  const startBrowserTranscription = useCallback(() => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = DEFAULT_LANGUAGE;
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let finalText = '';
        let interimText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const text = event.results[i][0]?.transcript || '';
          if (event.results[i].isFinal) finalText += text;
          else interimText += text;
        }
        const combined = `${browserTranscriptRef.current} ${finalText}`.trim();
        if (finalText) browserTranscriptRef.current = combined;
        const visible = (combined || interimText).trim();
        visibleTranscriptRef.current = visible;
        setLiveTranscript(visible);
        if (visible) setUserText(visible);
      };

      recognition.onerror = () => {
        speechRecognitionRef.current = null;
      };
      recognition.onend = () => {
        speechRecognitionRef.current = null;
      };

      browserTranscriptRef.current = '';
      visibleTranscriptRef.current = '';
      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch {
      speechRecognitionRef.current = null;
    }
  }, []);

  // ─── Start recording ──────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    setError(null);
    setUserText(null);
    setLiveTranscript('');
    setLastResponse(null);
    setAgentSteps([]);
    browserTranscriptRef.current = '';
    visibleTranscriptRef.current = '';

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicPermission('granted');
      startBrowserTranscription();

      chunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        speechRecognitionRef.current?.stop?.();
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(blob);
      };

      mr.start();
      setIsRecording(true);
    } catch {
      setMicPermission('denied');
      setError('Microphone permission denied. Please enable it in browser settings.');
    }
  }, [startBrowserTranscription]);

  // ─── Stop recording ───────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  // ─── Process audio: STT → agent → TTS ────────────────────────────────────
  const processAudio = useCallback(async (audioBlob: Blob) => {
    setIsProcessing(true);
    setAgentSteps([{ process: 'analyzing', label: 'Transcribing your voice...' }]);

    try {
      // 1. STT via Backend
      let transcript = '';
      try {
        transcript = await sarvamSTT(audioBlob, DEFAULT_LANGUAGE);
      } catch (sttErr) {
        console.warn('Backend STT failed; using browser transcript fallback', sttErr);
      }
      transcript = (transcript || browserTranscriptRef.current || visibleTranscriptRef.current || liveTranscript).trim();
      if (!transcript) {
        throw new Error('Could not transcribe the audio. Please try speaking again.');
      }
      browserTranscriptRef.current = transcript;
      visibleTranscriptRef.current = transcript;
      setLiveTranscript(transcript);
      setUserText(transcript);

      // 2. Agentic orchestration — expects streaming NDJSON or JSON with steps[]
      const phone = localStorage.getItem('user_phone') || undefined;
      const stationId = localStorage.getItem('hardware_device_id') || 'WS01';
      const agentRes = await fetch(`${API_URL}/api/voice/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: transcript,
          stream_steps: true,
          language: DEFAULT_LANGUAGE,
          phone,
          station_id: stationId,
        }),
      });

      if (!agentRes.ok) throw new Error(`Agent error: ${agentRes.status}`);

      const contentType = agentRes.headers.get('content-type') || '';

      let finalResponse = '';

      if (contentType.includes('text/event-stream') || contentType.includes('application/x-ndjson')) {
        // ── Streaming: read step events line-by-line ─────────────────────
        const reader = agentRes.body?.getReader();
        const decoder = new TextDecoder();
        while (reader) {
          const { value, done } = await reader.read();
          if (done) break;
          const lines = decoder.decode(value).split('\n').filter(Boolean);
          for (const line of lines) {
            // Strip SSE "data: " prefix
            const raw = line.startsWith('data: ') ? line.slice(6) : line;
            try {
              const evt = JSON.parse(raw) as { type: string; process?: string; label?: string; response?: string };
              if (evt.type === 'step') {
                setAgentSteps(prev => [...prev, { process: evt.process || 'thinking', label: evt.label }]);
              } else if (evt.type === 'done') {
                finalResponse = evt.response || '';
                setAgentSteps(prev => prev.map((s, i) => i === prev.length - 1 ? { ...s, done: true } : s));
              }
            } catch {/* skip malformed line */ }
          }
        }
      } else {
        // ── Single JSON response with optional steps array ────────────────
        const data = await agentRes.json();
        const steps: AgentStep[] = Array.isArray(data.steps)
          ? data.steps.map((s: { process: string; label?: string }) => ({ process: s.process, label: s.label }))
          : [
            { process: 'intent_classify' },
            { process: 'fetch_weather' },
            { process: 'final_response' },
          ];

        // Animate steps even for non-streaming responses
        for (let i = 0; i < steps.length; i++) {
          await new Promise(r => setTimeout(r, 550));
          setAgentSteps(prev => [...prev, steps[i]]);
        }
        finalResponse = data.response || data.text || "Maafi, samajh nahi aaya. Dobara bolein.";
      }

      setLastResponse(finalResponse);
      setIsProcessing(false);

      // 3. TTS via Sarvam
      if (finalResponse) {
        await speakSarvam(finalResponse);
      } else if (finalResponse) {
        // Browser TTS fallback
        window.speechSynthesis?.cancel();
        const utt = new SpeechSynthesisUtterance(finalResponse);
        utt.lang = DEFAULT_LANGUAGE;
        setIsSpeaking(true);
        utt.onend = () => setIsSpeaking(false);
        window.speechSynthesis?.speak(utt);
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      setLastResponse('Maafi, kuch gadbad ho gayi. Phir koshish karein.');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // ─── Speak via Sarvam TTS ─────────────────────────────────────────────────
  const speakSarvam = useCallback(async (text: string) => {
    setIsSpeaking(true);
    try {
      const buffer = await sarvamTTS(text);
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContext();
      }
      const audioBuffer = await audioCtxRef.current.decodeAudioData(buffer);
      const source = audioCtxRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtxRef.current.destination);
      audioSourceRef.current = source;
      source.onended = () => setIsSpeaking(false);
      source.start(0);
    } catch {
      window.speechSynthesis?.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = DEFAULT_LANGUAGE;
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis?.speak(utterance);
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    audioSourceRef.current?.stop();
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  const handleRestart = useCallback(() => {
    stopSpeaking();
    setUserText(null);
    setLiveTranscript('');
    setLastResponse(null);
    setAgentSteps([]);
    setError(null);
    browserTranscriptRef.current = '';
    visibleTranscriptRef.current = '';
    startRecording();
  }, [stopSpeaking, startRecording]);

  const handleClose = useCallback(() => {
    stopEverything();
    setShowPanel(false);
    setUserText(null);
    setLiveTranscript('');
    setLastResponse(null);
    setAgentSteps([]);
    setError(null);
    browserTranscriptRef.current = '';
    visibleTranscriptRef.current = '';
  }, [stopEverything]);

  const handleMicToggle = useCallback(async () => {
    if (isRecording) {
      stopRecording();
    } else if (isProcessing) {
      // do nothing while processing
    } else {
      await startRecording();
    }
  }, [isRecording, isProcessing, stopRecording, startRecording]);

  const openPanel = useCallback(async () => {
    setShowPanel(true);
    if (!isRecording && !isProcessing && !isSpeaking) {
      await startRecording();
    }
  }, [isProcessing, isRecording, isSpeaking, startRecording]);

  // ─── Colors ───────────────────────────────────────────────────────────────
  const bg = isDark ? '#0f1f15' : '#e8f5ee';
  const surface = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  const text = isDark ? '#fff' : '#111';
  const textMuted = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';

  const panelMaxH = isExpanded ? '90vh' : '480px';

  return (
    <>
      {/* ── Floating mic trigger (bottom-right, above CALL AGENT gap) ─────── */}
      <div style={{
        position: 'fixed',
        // sits just above the CALL AGENT button (which is bottom-6 left-6)
        // mic is bottom-6 right-6 — exact match with original
        bottom: '24px',
        right: '24px',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '12px',
      }}>
        {micPermission === 'denied' && !showPanel && (
          <div style={{
            background: '#fef9c3',
            border: '1px solid #fbbf24',
            borderRadius: '10px',
            padding: '8px 12px',
            fontSize: '11px',
            color: '#92400e',
            maxWidth: '220px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}>
            🎙️ Mic blocked. Enable in browser settings.
          </div>
        )}

        {/* ── Panel — anchored to the button, no full-screen overlay ─────── */}
        {showPanel && (
          <div style={{
            width: `${PANEL_W}px`,
            // ── FIX: was inset:0 full overlay; now bottom-anchored card ──
            background: bg,
            borderRadius: '22px',
            border: `1px solid ${border}`,
            boxShadow: isDark
              ? '0 -8px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)'
              : '0 -8px 48px rgba(0,0,0,0.14)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            // ── FIX: max-height stops it going off-screen ──
            maxHeight: panelMaxH,
            animation: 'vaSlideIn 0.28s cubic-bezier(.32,1,.56,1)',
          }}>

            {/* Top bar */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px 10px',
              borderBottom: `1px solid ${border}`,
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: isRecording ? '#ef4444' : isSpeaking ? '#f59e0b' : isProcessing ? PRIMARY : PRIMARY,
                  display: 'inline-block',
                  animation: (isRecording || isProcessing) ? 'vaPulse 1.2s ease-in-out infinite' : 'none',
                }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: text }}>
                  {isRecording ? 'Listening…'
                    : isProcessing ? 'Thinking…'
                      : isSpeaking ? 'Speaking…'
                        : 'Live'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setIsExpanded(v => !v)}
                  style={{
                    width: '26px', height: '26px', borderRadius: '8px',
                    background: surface, border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: textMuted,
                  }}
                >
                  {isExpanded ? <ChevronDown size={14} /> : <Maximize2 size={14} />}
                </button>
                <button
                  onClick={handleClose}
                  style={{
                    width: '26px', height: '26px', borderRadius: '8px',
                    background: surface, border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: textMuted,
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* ── Scrollable content ──────────────────────────────────────── */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              // ── FIX: explicit overflow prevents the panel from growing unbounded ──
              overflowX: 'hidden',
            }}>

              {/* User utterance */}
              {userText && (
                <div style={{
                  background: surface,
                  borderRadius: '14px',
                  padding: '10px 14px',
                  border: `1px solid ${border}`,
                }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: PRIMARY, marginBottom: '4px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    You said
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: text, lineHeight: 1.55 }}>{userText}</p>
                </div>
              )}

              {/* ── Agentic thinking panel (real-time streaming steps) ────── */}
              {(isProcessing || agentSteps.length > 0) && (
                <div style={{
                  background: isDark ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.05)',
                  border: `1px solid rgba(16,185,129,0.18)`,
                  borderRadius: '14px',
                  padding: '11px 13px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: PRIMARY, letterSpacing: '0.06em' }}>
                      ✦ Thinking
                    </span>
                    <span style={{ fontSize: '10px', color: textMuted }}>
                      {agentSteps.length} step{agentSteps.length !== 1 ? 's' : ''} ⌃
                    </span>
                  </div>
                  {agentSteps.map((step, i) => {
                    const isCurrent = i === agentSteps.length - 1 && isProcessing;
                    return (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '7px',
                          marginBottom: '4px',
                          animation: isCurrent ? 'vaStepIn 0.3s ease' : 'none',
                        }}
                      >
                        <span style={{
                          color: isCurrent ? PRIMARY : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'),
                          fontSize: '10px',
                          marginTop: '3px',
                          flexShrink: 0,
                          transition: 'color 0.3s',
                        }}>
                          {step.done ? '✓' : isCurrent ? '►' : '•'}
                        </span>
                        <span style={{
                          fontSize: '12px',
                          lineHeight: 1.5,
                          color: isCurrent
                            ? text
                            : (isDark ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.42)'),
                          fontWeight: isCurrent ? 600 : 400,
                          transition: 'all 0.3s',
                        }}>
                          {labelFor(step)}
                        </span>
                      </div>
                    );
                  })}
                  {/* Blinking cursor while processing */}
                  {isProcessing && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <span style={{ color: PRIMARY, fontSize: '10px' }}>►</span>
                      <span style={{
                        display: 'inline-block',
                        width: '6px', height: '6px',
                        borderRadius: '50%',
                        background: PRIMARY,
                        animation: 'vaBlink 0.9s ease-in-out infinite',
                      }} />
                    </div>
                  )}
                </div>
              )}

              {/* Response */}
              {lastResponse && (
                <div style={{
                  background: surface,
                  borderRadius: '14px',
                  padding: '12px 14px',
                  border: `1px solid ${border}`,
                  animation: 'vaStepIn 0.35s ease',
                }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: PRIMARY, marginBottom: '6px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Response
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: text, lineHeight: 1.6 }}>{lastResponse}</p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  fontSize: '12px',
                  color: '#fca5a5',
                }}>
                  ⚠ {error}
                </div>
              )}

              {/* Idle prompt */}
              {!isRecording && !isProcessing && !isSpeaking && !lastResponse && !userText && !error && (
                <div style={{ textAlign: 'center', padding: '20px 10px' }}>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: text, margin: 0 }}>
                    Tap mic to speak
                  </p>
                  <p style={{ fontSize: '11px', color: textMuted, margin: '5px 0 0' }}>
                    Tap response to expand. Long press for full view.
                  </p>
                </div>
              )}

              {/* Recording indicator */}
              {isRecording && (
                <div style={{ textAlign: 'center', padding: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '8px' }}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} style={{
                        width: '3px',
                        height: `${8 + i * 4}px`,
                        background: '#ef4444',
                        borderRadius: '2px',
                        animation: `vaWave 0.7s ease-in-out ${i * 0.1}s infinite alternate`,
                      }} />
                    ))}
                  </div>
                  <p style={{ fontSize: '12px', color: '#ef4444', margin: 0, fontWeight: 600 }}>Recording… tap ■ to stop</p>
                </div>
              )}
            </div>

            {/* ── Action bar ─────────────────────────────────────────────── */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '14px',
              padding: '12px 20px 16px',
              borderTop: `1px solid ${border}`,
              flexShrink: 0,
            }}>
              {/* Transcript toggle (cosmetic) */}
              <button
                style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: surface, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: textMuted,
                }}
              >
                <AlignLeft size={16} />
              </button>

              {/* Restart */}
              <button
                onClick={handleRestart}
                disabled={isProcessing}
                style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: surface, border: 'none',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: textMuted, opacity: isProcessing ? 0.4 : 1,
                }}
              >
                <RotateCcw size={16} />
              </button>

              {/* Main mic / stop / processing button */}
              <button
                onClick={isSpeaking ? stopSpeaking : handleMicToggle}
                style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  background: isRecording ? '#ef4444' : isSpeaking ? '#f59e0b' : PRIMARY,
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: isRecording
                    ? '0 4px 18px rgba(239,68,68,0.5)'
                    : `0 4px 18px rgba(16,185,129,0.4)`,
                  color: '#fff',
                  transition: 'all 0.2s',
                }}
              >
                {isProcessing ? (
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '50%',
                    border: '2.5px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    animation: 'vaSpin 0.8s linear infinite',
                  }} />
                ) : isRecording ? (
                  // square stop icon
                  <div style={{ width: '16px', height: '16px', background: '#fff', borderRadius: '3px' }} />
                ) : (
                  <Mic size={22} />
                )}
              </button>

              {/* Close / stop speaking */}
              <button
                onClick={isSpeaking ? stopSpeaking : handleClose}
                style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: '#ef4444', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff',
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── Trigger button ─────────────────────────────────────────────── */}
        {!showPanel && (
          <button
            onClick={openPanel}
            style={{
              width: '52px', height: '52px', borderRadius: '50%',
              background: isDark ? 'rgba(30,30,30,0.92)' : '#fff',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              color: isDark ? '#fff' : '#000',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
          >
            <Mic style={{ width: 22, height: 22 }} />
          </button>
        )}
      </div>

      {/* ── Animations ─────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes vaSlideIn {
          from { transform: translateY(18px) scale(0.97); opacity: 0; }
          to   { transform: translateY(0)    scale(1);    opacity: 1; }
        }
        @keyframes vaPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
        @keyframes vaStepIn {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes vaBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
        @keyframes vaSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes vaWave {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1); }
        }
      `}</style>
    </>
  );
}
