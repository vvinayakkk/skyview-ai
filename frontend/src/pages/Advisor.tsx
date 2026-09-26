import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "next-themes";
import { FarmBackground, GlassSection, GlassCard } from "@/components/FarmTheme";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import {
  Droplets, Sprout, Wind, Thermometer, Leaf, Loader2, Sparkles, RefreshCw, CheckCircle2,
  Mic, Send, User, Trash2, ChevronDown, ChevronUp, AlertCircle, Bot
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const API_URL = import.meta.env.VITE_API_URL || '';

// ─── STT/TTS helpers ──────────────────────────────────────────────────────────
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

function getSarvamLanguageCode(lang: string): string {
  const mapping: Record<string, string> = {
    hi: 'hi-IN',
    en: 'en-IN',
    bn: 'bn-IN',
    kn: 'kn-IN',
    ml: 'ml-IN',
    mr: 'mr-IN',
    pa: 'pa-IN',
    ta: 'ta-IN',
    te: 'te-IN',
    gu: 'gu-IN',
  };
  return mapping[lang] || 'hi-IN';
}

const PROCESS_LABEL: Record<string, string> = {
  intent_classify: 'Understanding your request',
  fetch_profile: 'Reading farmer profile',
  fetch_weather: 'Checking live weather sensor data',
  fetch_mandi: 'Checking mandi prices',
  fetch_gov_schemes: 'Finding matching government schemes',
  crop_advice: 'Formulating crop advice',
  soil_analysis: 'Analyzing soil conditions',
  final_response: 'Composing response',
};

// ─── React Interfaces ────────────────────────────────────────────────────────
interface ChatStep {
  process: string;
  label: string;
  done?: boolean;
  data?: any;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  status?: 'thinking' | 'done' | 'error';
  steps?: ChatStep[];
  error?: string;
}

// ─── Text Preprocessing for Markdown/JSON Cleanliness ────────────────────────
function preprocessText(text: any): string {
  if (!text) return '';
  if (typeof text !== 'string') {
    return '';
  }
  let cleaned = text;

  // Clean out raw JSON output code blocks in text replies
  if (cleaned.includes('```json')) {
    cleaned = cleaned.split('```json')[0];
  } else if (cleaned.includes('JSON object:')) {
    cleaned = cleaned.split('JSON object:')[0];
  } else if (cleaned.includes('{"summary":')) {
    cleaned = cleaned.split('{"summary":')[0];
  }

  // Inject structural newlines before bold headers
  cleaned = cleaned.replace(/\*\*Farm Advisory System\*\*/gi, '\n# Farm Advisory System\n');
  cleaned = cleaned.replace(/\*\*Current Weather Conditions:?\*\*/gi, '\n## Current Weather Conditions\n');
  cleaned = cleaned.replace(/\*\*Farm Advisory:?\*\*/gi, '\n## Farm Advisory\n');
  cleaned = cleaned.replace(/\*\*Focus Points:?\*\*/gi, '\n### Focus Points\n');
  cleaned = cleaned.replace(/\*\*Summary:?\*\*/gi, '\n### Summary\n');
  cleaned = cleaned.replace(/\*\*Detailed Advisory:?\*\*/gi, '\n### Detailed Advisory\n');

  // Inject newlines before inline lists and bullet items
  cleaned = cleaned.replace(/\s+-\s+\*\*/g, '\n- **');
  cleaned = cleaned.replace(/\.\s+\*\*/g, '.\n**');
  cleaned = cleaned.replace(/\s+(\d+)\.\s+\*\*/g, '\n$1. **');

  return cleaned.trim();
}

// ─── Custom Message Formatter ────────────────────────────────────────────────
function FormattedMessage({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split(/\n/);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13.5px', lineHeight: '1.6', textAlign: "left" }}>
      {lines.map((line, idx) => {
        let trimmed = line.trim();
        if (!trimmed) return <div key={idx} style={{ height: '4px' }} />;

        // Headings
        if (trimmed.startsWith('###')) {
          return <h4 key={idx} style={{ fontSize: '14.5px', fontWeight: 800, color: '#2ECC71', margin: '8px 0 2px' }}>{trimmed.replace(/^###\s*/, '')}</h4>;
        }
        if (trimmed.startsWith('##')) {
          return <h3 key={idx} style={{ fontSize: '15.5px', fontWeight: 800, color: '#2ECC71', margin: '12px 0 4px' }}>{trimmed.replace(/^##\s*/, '')}</h3>;
        }
        if (trimmed.startsWith('#')) {
          return <h2 key={idx} style={{ fontSize: '17px', fontWeight: 900, color: '#2ECC71', margin: '16px 0 6px' }}>{trimmed.replace(/^#\s*/, '')}</h2>;
        }

        // Bullet lists
        let isList = false;
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          isList = true;
          trimmed = trimmed.replace(/^[-*]\s*/, '');
        }

        // Bold text **word**
        const parts = trimmed.split(/(\*\*.*?\*\*)/g);
        const elements = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={pIdx} style={{ fontWeight: 800, color: '#2ECC71' }}>{part.slice(2, -2)}</strong>;
          }
          return part;
        });

        if (isList) {
          return (
            <div key={idx} style={{ display: 'flex', gap: '8px', paddingLeft: '8px', alignItems: 'flex-start' }}>
              <span style={{ color: '#2ECC71', fontSize: '10px', marginTop: '6px' }}>●</span>
              <span>{elements}</span>
            </div>
          );
        }

        return <p key={idx} style={{ margin: 0 }}>{elements}</p>;
      })}
    </div>
  );
}

// ─── Action Cards Components ────────────────────────────────────────────────
function WeatherActionCard({ data, isDark }: { data: any; isDark: boolean }) {
  if (!data) return null;
  const stats = [
    { icon: <Thermometer size={15} />, label: 'Temp', value: `${Number(data.temperature || 0).toFixed(1)}°C`, color: '#E53935' },
    { icon: <Droplets size={15} />, label: 'Humidity', value: `${Number(data.humidity || 0).toFixed(0)}%`, color: '#2196F3' },
    { icon: <Sprout size={15} />, label: 'Soil Moisture', value: `${Number(data.soil_moisture || 0).toFixed(0)}%`, color: '#4CAF50' },
    { icon: <Wind size={15} />, label: 'Wind', value: `${Number(data.wind_speed || 0).toFixed(1)} km/h`, color: '#00BCD4' },
  ];
  return (
    <div style={{
      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
      borderRadius: 12, padding: 10, marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8
    }}>
      {stats.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ color: s.color, background: `${s.color}15`, padding: 5, borderRadius: 6 }}>{s.icon}</div>
          <div>
            <p style={{ fontSize: 9, color: isDark ? '#6A8A6A' : '#777', margin: 0, textTransform: 'uppercase' }}>{s.label}</p>
            <p style={{ fontSize: 12, fontWeight: 700, color: isDark ? '#C8E8C8' : '#111', margin: 0 }}>{s.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function MandiActionCard({ data, isDark }: { data: any; isDark: boolean }) {
  const records = data?.records || data?.rates || [];
  if (!records.length) return <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>No Mandi rates found in record snapshot.</p>;
  return (
    <div style={{
      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
      borderRadius: 12, padding: 10, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6,
      maxHeight: 180, overflowY: 'auto'
    }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: '#2ECC71', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: "left" }}>Spotlight Mandi Prices</div>
      {records.slice(0, 4).map((r: any, i: number) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: i < records.length - 1 ? `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}` : 'none' }}>
          <div style={{ textAlign: "left" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#D4EDDA' : '#142A1A', margin: 0 }}>{r.commodity}</p>
            <p style={{ fontSize: 9, color: isDark ? '#5A8A6A' : '#666', margin: 0 }}>{r.market} ({r.district || r.state})</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#2ECC71', margin: 0 }}>₹{Number(r.modal_price || r.price || 0).toLocaleString()}</p>
            <p style={{ fontSize: 8, color: isDark ? '#5A8A6A' : '#888', margin: 0 }}>Min: ₹{r.min_price} | Max: ₹{r.max_price}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SchemesActionCard({ data, isDark }: { data: any; isDark: boolean }) {
  const list = data?.schemes || [];
  if (!list.length) return <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>No matching schemes found.</p>;
  return (
    <div style={{
      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
      borderRadius: 12, padding: 10, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6,
      maxHeight: 180, overflowY: 'auto'
    }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: "left" }}>Matching Government Schemes</div>
      {list.slice(0, 3).map((s: any, i: number) => (
        <div key={i} style={{ padding: '4px 0', borderBottom: i < list.length - 1 ? `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}` : 'none', textAlign: "left" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#D4EDDA' : '#142A1A', margin: '0 0 2px' }}>{s.scheme_name}</p>
          <p style={{ fontSize: 9, color: '#3B82F6', margin: '0 0 2px', fontWeight: 600 }}>{s.scheme_type}</p>
          <p style={{ fontSize: 10, color: isDark ? '#A8D89A' : '#444', margin: 0, lineHeight: 1.3 }}>{s.benefit_description}</p>
        </div>
      ))}
    </div>
  );
}

function ProfileActionCard({ data, isDark }: { data: any; isDark: boolean }) {
  if (!data || !data.available) return null;
  return (
    <div style={{
      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
      borderRadius: 12, padding: 10, marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, textAlign: "left"
    }}>
      <div style={{ gridColumn: 'span 2', fontSize: 10, fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Farmer Profile snapshot</div>
      <div>
        <p style={{ fontSize: 8, color: isDark ? '#6A8A6A' : '#777', margin: 0 }}>FARMER NAME</p>
        <p style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#C8E8C8' : '#111', margin: 0 }}>{data.name}</p>
      </div>
      <div>
        <p style={{ fontSize: 8, color: isDark ? '#6A8A6A' : '#777', margin: 0 }}>PHONE NUMBER</p>
        <p style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#C8E8C8' : '#111', margin: 0 }}>{data.phone}</p>
      </div>
      <div>
        <p style={{ fontSize: 8, color: isDark ? '#6A8A6A' : '#777', margin: 0 }}>LAND SIZE (ACRES)</p>
        <p style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#C8E8C8' : '#111', margin: 0 }}>{data.land_size_acres} Acres</p>
      </div>
      <div>
        <p style={{ fontSize: 8, color: isDark ? '#6A8A6A' : '#777', margin: 0 }}>FARM LOCATION</p>
        <p style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#C8E8C8' : '#111', margin: 0 }}>{data.location}</p>
      </div>
      <div style={{ gridColumn: 'span 2' }}>
        <p style={{ fontSize: 8, color: isDark ? '#6A8A6A' : '#777', margin: 0 }}>ACTIVE CROPS</p>
        <p style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#C8E8C8' : '#111', margin: 0 }}>{data.crops}</p>
      </div>
    </div>
  );
}

function AdvisorActionCard({ process, data, isDark }: { process: string; data: any; isDark: boolean }) {
  const insights = data?.ai_insights;
  if (!insights) return null;

  if (process === 'crop_advice' && Array.isArray(insights)) {
    return (
      <div style={{
        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
        borderRadius: 12, padding: 10, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6, textAlign: "left"
      }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#2ECC71', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Sowing Suitability Suggestions</div>
        {insights.map((item: any, i: number) => (
          <div key={i} style={{ display: 'flex', gap: 8, paddingBottom: 4, borderBottom: i < insights.length - 1 ? `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}` : 'none' }}>
            <div style={{ marginTop: '2px', color: '#10B981' }}>
              <Sprout size={16} />
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#D4EDDA' : '#142A1A', margin: 0 }}>{item.crop}</p>
              <p style={{ fontSize: 9, color: '#2ECC71', margin: '1px 0' }}>Timeline: {item.timeline}</p>
              <p style={{ fontSize: 10, color: isDark ? '#A8D89A' : '#555', margin: 0 }}>{item.tips}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (process === 'soil_analysis' && typeof insights === 'object') {
    const score = insights.score || 75;
    const status = insights.status || 'Good';
    return (
      <div style={{
        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
        borderRadius: 12, padding: 10, marginTop: 8, textAlign: "left"
      }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#2ECC71', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Soil Health Diagnostic</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%', background: 'rgba(46,204,113,0.1)', border: '2.5px solid #2ECC71',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#2ECC71', fontSize: 12
          }}>
            {score}
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#C8E8C8' : '#111', margin: 0 }}>{status} Soil Score</p>
            <p style={{ fontSize: 9, color: isDark ? '#5A8A6A' : '#666', margin: 0 }}>Risk: {insights.risk || 'Low'}</p>
          </div>
        </div>
        {insights.recommendations && Array.isArray(insights.recommendations) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {insights.recommendations.slice(0, 3).map((rec: string, i: number) => (
              <div key={i} style={{ display: 'flex', gap: 6, fontSize: 10, color: isDark ? '#A8D89A' : '#444' }}>
                <span style={{ color: '#2ECC71' }}>•</span>
                <span>{rec}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}

function ActionCardRenderer({ step, isDark }: { step: ChatStep; isDark: boolean }) {
  if (!step.data) return null;
  const process = step.process;

  if (process === 'fetch_weather') {
    return <WeatherActionCard data={step.data} isDark={isDark} />;
  }
  if (process === 'fetch_mandi') {
    return <MandiActionCard data={step.data} isDark={isDark} />;
  }
  if (process === 'fetch_gov_schemes') {
    return <SchemesActionCard data={step.data} isDark={isDark} />;
  }
  if (process === 'fetch_profile') {
    return <ProfileActionCard data={step.data} isDark={isDark} />;
  }
  if (process === 'crop_advice' || process === 'soil_analysis') {
    return <AdvisorActionCard process={process} data={step.data} isDark={isDark} />;
  }
  return null;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function Advisor() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();

  // ── States for Chat ──
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const cached = sessionStorage.getItem("advisorChatHistory");
    return cached ? JSON.parse(cached) : [];
  });
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Sync chat messages to sessionStorage
  useEffect(() => {
    sessionStorage.setItem("advisorChatHistory", JSON.stringify(messages));
  }, [messages]);

  // Scroll to bottom on load if messages exist
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, []);

  // Fetch cached sensor parameters
  const { data: sensorData = { temperature: 0, humidity: 0, wind_speed: 0, rainfall: 0, soil_moisture: 0, light: 0, uv_index: 0, pressure: 0 }, dataUpdatedAt: sensorUpdatedAt } = useQuery({
    queryKey: ['latestSensorData', 'WS01'],
    queryFn: async () => {
      const r = await fetch(`${API_URL}/api/sensors/latest/WS01`);
      if (!r.ok) throw new Error('Sensor fetch failed');
      const d = await r.json();
      return {
        temperature: d.temperature || 0,
        humidity: d.humidity || 0,
        wind_speed: d.windSpeed || d.wind_speed || 0,
        rainfall: d.rainfall || 0,
        soil_moisture: d.soilMoisture || d.soil_moisture || 0,
        light: d.lightIntensity || d.light_level || 0,
        uv_index: d.uvIndex || d.uv_index || 0,
        pressure: d.pressure || 0,
      };
    },
    refetchInterval: 15000,
  });

  const sensorOnline = !!sensorData;

  const [lastUpdateSec, setLastUpdateSec] = useState(0);
  useEffect(() => {
    if (!sensorUpdatedAt) return;
    setLastUpdateSec(0);
    const timer = setInterval(() => {
      setLastUpdateSec(Math.floor((Date.now() - sensorUpdatedAt) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [sensorUpdatedAt]);

  // Fetch AI Sowing insights (Gemini Call)
  const {
    data: overview = null,
    isFetching: isLoadingInsights,
    refetch: fetchAIOverview,
  } = useQuery({
    queryKey: ['advisorInsights', 'overview'],
    queryFn: async () => {
      const r = await fetch(`${API_URL}/api/advisor/insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "overview" }),
      });
      if (!r.ok) throw new Error('Advisor fetch failed');
      const data = await r.json();
      if (data.sensor_snapshot) {
        queryClient.setQueryData(['latestSensorData', 'WS01'], {
          temperature: data.sensor_snapshot.temperature || 0,
          humidity: data.sensor_snapshot.humidity || 0,
          wind_speed: data.sensor_snapshot.wind_speed || 0,
          rainfall: data.sensor_snapshot.rainfall || 0,
          soil_moisture: data.sensor_snapshot.soil_moisture || 0,
          light: data.sensor_snapshot.light || 0,
          uv_index: data.sensor_snapshot.uv_index || 0,
          pressure: data.sensor_snapshot.pressure || 0,
        });
      }
      return data.ai_insights;
    },
    staleTime: 5 * 60 * 1000,
  });

  const weatherStats = [
    { icon: <Thermometer style={{ width: 18, height: 18 }} />, label: t('temperature'), value: `${sensorData.temperature.toFixed(1)}°C`, color: "#E53935" },
    { icon: <Droplets style={{ width: 18, height: 18 }} />, label: t('humidity'), value: `${sensorData.humidity.toFixed(0)}%`, color: "#2196F3" },
    { icon: <Wind style={{ width: 18, height: 18 }} />, label: t('wind_speed'), value: `${sensorData.wind_speed.toFixed(1)} km/h`, color: "#00BCD4" },
    { icon: <Sprout style={{ width: 18, height: 18 }} />, label: t('soil_moisture'), value: `${sensorData.soil_moisture.toFixed(0)}%`, color: "#4CAF50" },
  ];

  // ── Speech Recording Setup ──
  const startBrowserTranscription = useCallback((langCode: string) => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = langCode;
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let interimText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const text = event.results[i][0]?.transcript || '';
          if (event.results[i].isFinal) {
            setInputText(prev => (prev + ' ' + text).trim());
          } else {
            interimText = text;
          }
        }
      };

      recognition.onerror = () => { speechRecognitionRef.current = null; };
      recognition.onend = () => { speechRecognitionRef.current = null; };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch {
      speechRecognitionRef.current = null;
    }
  }, []);

  const startRecording = async () => {
    setIsRecording(true);
    setError(null);
    const langCode = getSarvamLanguageCode(language);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      startBrowserTranscription(langCode);

      chunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        speechRecognitionRef.current?.stop?.();
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });

        setIsProcessingVoice(true);
        try {
          const transcript = await sarvamSTT(blob, langCode);
          if (transcript.trim()) {
            setInputText(prev => (prev + ' ' + transcript).trim());
          }
        } catch (sttErr) {
          console.warn('Backend STT failed, utilizing live transcription fallback.', sttErr);
        } finally {
          setIsProcessingVoice(false);
        }
      };

      mr.start();
    } catch (err) {
      console.error(err);
      setIsRecording(false);
      setError('Microphone permission blocked. Please enable it in your browser settings.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // ── Send Message Logic ──
  const handleSendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed) return;

    setInputText('');

    const userMsgId = Date.now().toString();
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: trimmed,
    };

    const botMsgId = (Date.now() + 1).toString();
    const botMsg: ChatMessage = {
      id: botMsgId,
      sender: 'bot',
      text: '',
      status: 'thinking',
      steps: [],
    };

    setMessages(prev => [...prev, userMsg, botMsg]);
    setExpandedSteps(prev => ({ ...prev, [botMsgId]: true }));

    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    try {
      const phone = localStorage.getItem('user_phone') || undefined;
      const stationId = localStorage.getItem('hardware_device_id') || 'WS01';
      const langCode = getSarvamLanguageCode(language);

      const response = await fetch(`${API_URL}/api/voice/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          stream_steps: true,
          language: langCode,
          phone,
          station_id: stationId,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let partialLine = '';

      while (reader) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = (partialLine + chunk).split('\n');
        partialLine = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          const raw = line.startsWith('data: ') ? line.slice(6) : line;
          try {
            const evt = JSON.parse(raw);
            if (evt.type === 'step') {
              setMessages(prev => prev.map(m => {
                if (m.id === botMsgId) {
                  const steps = m.steps || [];
                  const exists = steps.find(s => s.process === evt.process);
                  if (exists) {
                    return {
                      ...m,
                      steps: steps.map(s => s.process === evt.process ? { ...s, label: evt.label, data: evt.data || s.data } : s)
                    };
                  } else {
                    return {
                      ...m,
                      steps: [...steps, { process: evt.process, label: evt.label, data: evt.data }]
                    };
                  }
                }
                return m;
              }));
            } else if (evt.type === 'done') {
              setMessages(prev => prev.map(m => {
                if (m.id === botMsgId) {
                  const steps = m.steps || [];
                  const updatedSteps = steps.map((s, idx) => idx === steps.length - 1 ? { ...s, done: true } : s);
                  return {
                    ...m,
                    text: evt.response || '',
                    status: 'done',
                    steps: updatedSteps
                  };
                }
                return m;
              }));
            }
          } catch (e) {
            console.warn("SSE json decode skipped", line, e);
          }
        }
      }
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Unknown connection error';
      setMessages(prev => prev.map(m => {
        if (m.id === botMsgId) {
          return { ...m, status: 'error', error: msg };
        }
        return m;
      }));
    } finally {
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const clearChat = () => {
    if (window.confirm("Are you sure you want to clear conversation history?")) {
      setMessages([]);
      sessionStorage.removeItem("advisorChatHistory");
    }
  };

  const toggleSteps = (msgId: string) => {
    setExpandedSteps(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const activeSuggestChips = [
    { text: "Suggest best crops for my soil", label: language === 'hi' ? "फसलों की सिफारिश" : "Suggest sowing crops" },
    { text: "Latest mandi rates for wheat", label: language === 'hi' ? "गेहूं का मंडी भाव" : "Mandi rates for wheat" },
    { text: "Current weather & soil status", label: language === 'hi' ? "मौसम और मिट्टी की स्थिति" : "Weather & soil status" },
    { text: "Government schemes for my farm", label: language === 'hi' ? "सरकारी कृषि योजनाएं" : "Government schemes" }
  ];

  // Client-side parser for AI overview in case it was packed in raw text JSON
  let parsedOverview = overview;
  if (typeof overview === 'string') {
    try {
      const jsonMatch = overview.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedOverview = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.warn("Raw string overview parser skipped", e);
    }
  }

  // Colors and Design Primitives
  const borderCol = isDark ? 'rgba(46,204,113,0.12)' : 'rgba(30,100,50,0.1)';
  const surfaceCol = isDark ? 'rgba(15,28,18,0.85)' : 'rgba(255,255,255,0.92)';
  const cardStyle = {
    background: surfaceCol,
    border: `1px solid ${borderCol}`,
    borderRadius: '16px',
    backdropFilter: 'blur(16px)',
  };

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      <FarmBackground />
      <div style={{ position: "relative", zIndex: 50 }}>
        <DashboardHeader lastUpdateSeconds={lastUpdateSec} sensorNodeOnline={sensorOnline} />
      </div>

      <main style={{ position: "relative", zIndex: 10, maxWidth: "1300px", margin: "0 auto", padding: "24px 20px 60px" }}>
        
        {/* Page Title & Subtitle */}
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <h1 style={{ fontSize: 30, fontWeight: 800, fontFamily: "'Nunito', sans-serif", color: isDark ? '#A8D89A' : '#1B3A20', marginBottom: 6 }}>
            {t('advisor_title')}
          </h1>
          <p style={{ fontSize: 14, color: isDark ? '#A3B8A8' : '#2C3E30', maxWidth: "600px", margin: "0 auto" }}>
            {t('advisor_subtitle')}
          </p>
        </div>

        {/* ─── Responsive Grid ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ─── LEFT COLUMN: Telemetry + AI Crop advice overview (span 5) ─── */}
          <div className="lg:col-span-5 flex flex-col gap-6">

            {/* Live Weather Stats (Telemetry placed ABOVE advisor advice) */}
            <div style={{ ...cardStyle, padding: "20px" }}>
              <h3 style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: '0.06em', color: isDark ? "#A8D89A" : "#1B3A20", marginBottom: 14, textAlign: "left" }}>
                Live Sensor Telemetry
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                {weatherStats.map((stat, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)", border: `1px solid ${borderCol}`, padding: "10px 12px", borderRadius: 12 }}>
                    <div style={{ padding: 6, borderRadius: 8, background: `${stat.color}15`, color: stat.color }}>
                      {stat.icon}
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", color: isDark ? "#5A7A5A" : "#8A9A8C", margin: 0 }}>{stat.label}</p>
                      <p style={{ fontSize: 15, fontWeight: 900, color: isDark ? "#C8E8C8" : "#1B3A20", margin: 0, fontVariantNumeric: "tabular-nums" }}>{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Advisor Overview */}
            <div style={{ ...cardStyle, padding: "20px", textAlign: "left" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, borderBottom: `1px solid ${borderCol}`, paddingBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#2ECC71", boxShadow: "0 0 8px #2ECC71" }} />
                  <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: '0.06em', color: isDark ? "#A8D89A" : "#1B3A20" }}>
                    {t('advisor_current')}
                  </span>
                </div>
                <button
                  onClick={() => fetchAIOverview()}
                  disabled={isLoadingInsights}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 10, border: "none",
                    background: isDark ? "rgba(46,204,113,0.1)" : "rgba(46,204,113,0.06)", color: "#2ECC71",
                    fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.2s"
                  }}
                >
                  <RefreshCw style={{ width: 12, height: 12, animation: isLoadingInsights ? "spin 1.2s linear infinite" : "none" }} />
                  {isLoadingInsights ? t('advisor_analyzing') : t('advisor_refresh')}
                </button>
              </div>

              {isLoadingInsights ? (
                <div style={{ textAlign: "center", padding: "40px 10px" }}>
                  <Loader2 style={{ width: 36, height: 36, color: "#2ECC71", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
                  <h4 style={{ fontSize: 16, fontWeight: 700, color: isDark ? "#C8E8C8" : "#1B3A20", marginBottom: 6 }}>{t('advisor_ai_analyzing')}</h4>
                  <p style={{ fontSize: 12, color: isDark ? "#6A8A6A" : "#5A7A60" }}>{t('advisor_processing')}</p>
                </div>
              ) : (
                <div style={{ textAlign: "left" }}>
                  {parsedOverview && typeof parsedOverview === "object" ? (
                    <>
                      {/* Summary */}
                      {parsedOverview.summary && (
                        <div style={{ marginBottom: 16 }}>
                          <FormattedMessage text={preprocessText(parsedOverview.summary)} />
                        </div>
                      )}

                      {/* Details */}
                      {parsedOverview.details && (
                        <div style={{ marginBottom: 16, borderTop: `1px dashed ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`, paddingTop: 14 }}>
                          <FormattedMessage text={preprocessText(parsedOverview.details)} />
                        </div>
                      )}

                      {/* Focus points */}
                      {parsedOverview.focus_points && Array.isArray(parsedOverview.focus_points) && (
                        <div style={{ borderTop: `1px dashed ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`, paddingTop: 14 }}>
                          <h3 style={{ fontSize: 13, fontWeight: 800, color: "#2ECC71", textTransform: "uppercase", letterSpacing: '0.04em', marginBottom: 10 }}>
                            {t('advisor_focus')}
                          </h3>
                          <div style={{ display: "grid", gap: 8 }}>
                            {parsedOverview.focus_points.map((point: string, i: number) => (
                              <div key={i} style={{ display: "flex", gap: 10, padding: "10px", borderRadius: 10, background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)", border: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"}` }}>
                                <CheckCircle2 style={{ width: 15, height: 15, color: "#2ECC71", flexShrink: 0, marginTop: '2px' }} />
                                <p style={{ fontSize: 12, color: isDark ? "#A8D89A" : "#333", margin: 0, lineHeight: 1.4 }}>{point}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ padding: "10px 0" }}>
                      <FormattedMessage text={preprocessText(typeof overview === 'string' ? overview : t('advisor_no_data'))} />
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* ─── RIGHT COLUMN: Interactive Agentic Chatbot (span 7) ─── */}
          <div className="lg:col-span-7 flex flex-col" style={{ minHeight: "620px" }}>
            
            <div style={{
              ...cardStyle,
              flex: 1,
              display: "flex",
              flexDirection: "column",
              height: "100%",
              overflow: "hidden",
            }}>
              
              {/* Chat Header (Using customized Bot Icon) */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "14px 18px", borderBottom: `1px solid ${borderCol}`,
                background: isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.005)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(46,204,113,0.15)", border: `1px solid #2ECC71`, display: "flex", alignItems: "center", justifyContent: "center", color: "#2ECC71" }}>
                    <Bot size={18} />
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <h3 style={{ fontSize: 14, fontWeight: 800, color: isDark ? "#C8E8C8" : "#1B3A20", margin: 0 }}>
                      Kisan Mitra Chatbot
                    </h3>
                    <p style={{ fontSize: 9, color: "#2ECC71", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2ECC71", display: "inline-block", animation: "vaPulse 1.5s infinite" }} />
                      Agentic Orchestrator Online
                    </p>
                  </div>
                </div>

                {messages.length > 0 && (
                  <button
                    onClick={clearChat}
                    title="Clear history"
                    style={{
                      width: 30, height: 30, borderRadius: 8, border: "none", cursor: "pointer",
                      background: isDark ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.06)",
                      color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.2s"
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              {/* Chat Scroll Feed (Dynamically resizes via flexbox and overflow) */}
              <div style={{
                flex: 1, overflowY: "auto", padding: "16px",
                display: "flex", flexDirection: "column", gap: 14,
                scrollbarWidth: "thin",
              }}>
                
                {messages.length === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", padding: "40px 20px" }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: "50%", background: "rgba(46,204,113,0.08)",
                      display: "flex", alignItems: "center", justifyContent: "center", color: "#2ECC71",
                      marginBottom: 16, border: `1.5px dashed rgba(46,204,113,0.3)`
                    }}>
                      <Bot size={24} />
                    </div>
                    <h4 style={{ fontSize: 16, fontWeight: 800, color: isDark ? "#C8E8C8" : "#1B3A20", marginBottom: 6 }}>
                      Ask Kisan Mitra
                    </h4>
                    <p style={{ fontSize: 12, color: isDark ? "#6A8A6A" : "#666", maxWidth: "320px", lineHeight: 1.5, marginBottom: 24 }}>
                      I am an agentic farming companion. Click the microphone or type below to inquire about weather, mandi prices, or soil parameters.
                    </p>

                    {/* Centered chips for initial screen */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: "340px" }}>
                      {activeSuggestChips.map((chip, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(chip.text)}
                          style={{
                            padding: "10px 14px", borderRadius: 10, textAlign: "left", fontSize: 12,
                            background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.015)",
                            border: `1px solid ${borderCol}`, color: isDark ? "#A8D89A" : "#1B3A20",
                            cursor: "pointer", transition: "all 0.18s", fontWeight: 600,
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = "#2ECC71";
                            e.currentTarget.style.background = isDark ? "rgba(46,204,113,0.05)" : "rgba(46,204,113,0.02)";
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = borderCol;
                            e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.015)";
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: 11, color: "#2ECC71", marginBottom: 2 }}>{chip.label}</div>
                          <div>{chip.text}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => {
                      const isBot = msg.sender === 'bot';
                      return (
                        <div key={msg.id} style={{
                          display: "flex",
                          justifyContent: isBot ? "flex-start" : "flex-end",
                          animation: "vaMessageIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
                        }}>
                          <div style={{
                            maxWidth: "85%",
                            display: "flex",
                            gap: 8,
                            flexDirection: isBot ? "row" : "row-reverse",
                          }}>
                            {/* Profile avatar (Using Bot Icon) */}
                            <div style={{
                              width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                              background: isBot ? "rgba(46,204,113,0.15)" : "rgba(255,255,255,0.06)",
                              border: `1px solid ${isBot ? "#2ECC71" : borderCol}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              color: isBot ? "#2ECC71" : (isDark ? "#A8D89A" : "#1B3A20"),
                              fontSize: 11, fontWeight: 800
                            }}>
                              {isBot ? <Bot size={14} /> : <User size={12} />}
                            </div>

                            {/* Bubble body */}
                            <div style={{
                              background: isBot
                                ? (isDark ? "rgba(255,255,255,0.02)" : "#FFFFFF")
                                : (isDark ? "rgba(46,204,113,0.12)" : "rgba(46,204,113,0.08)"),
                              border: `1px solid ${isBot ? borderCol : "rgba(46,204,113,0.22)"}`,
                              borderRadius: isBot ? "0px 16px 16px 16px" : "16px 0px 16px 16px",
                              padding: "12px 14px",
                              boxShadow: isBot && !isDark ? "0 2px 10px rgba(0,0,0,0.03)" : "none"
                            }}>
                              
                              {/* User query */}
                              {!isBot && (
                                <p style={{ fontSize: 13, color: isDark ? "#D4EDDA" : "#142A1A", fontWeight: 500, margin: 0, lineHeight: 1.5, textAlign: "left" }}>
                                  {msg.text}
                                </p>
                              )}

                              {/* Bot Agent Flow */}
                              {isBot && (
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                  
                                  {/* Steps list container */}
                                  {msg.steps && msg.steps.length > 0 && (
                                    <div style={{
                                      background: isDark ? "rgba(46,204,113,0.04)" : "rgba(46,204,113,0.02)",
                                      border: `1px solid rgba(46,204,113,0.12)`,
                                      borderRadius: 10, padding: 8,
                                      minWidth: 200
                                    }}>
                                      <button
                                        onClick={() => toggleSteps(msg.id)}
                                        style={{
                                          width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                                          border: "none", background: "none", cursor: "pointer", padding: "2px 4px",
                                          color: "#2ECC71", fontSize: 11, fontWeight: 700
                                        }}
                                      >
                                        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                          ✦ Agentic Execution
                                          {msg.status === 'thinking' && (
                                            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#2ECC71", animation: "vaPulse 1s infinite" }} />
                                          )}
                                        </span>
                                        <span style={{ fontSize: 9, color: isDark ? "#6A8A6A" : "#777", display: "flex", alignItems: "center", gap: 2 }}>
                                          {msg.steps.length} Step{msg.steps.length !== 1 ? 's' : ''}
                                          {expandedSteps[msg.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                        </span>
                                      </button>

                                      {expandedSteps[msg.id] && (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}`, paddingTop: 6 }}>
                                          {msg.steps.map((step, sIdx) => {
                                            const isCurrent = sIdx === (msg.steps?.length || 0) - 1 && msg.status === 'thinking';
                                            return (
                                              <div key={sIdx} style={{ display: "flex", flexDirection: "column" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 4 }}>
                                                  <span style={{
                                                    fontSize: 8, marginTop: 1,
                                                    color: isCurrent ? "#2ECC71" : (isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)"),
                                                    animation: isCurrent ? "vaPulse 0.8s infinite" : "none"
                                                  }}>
                                                    {msg.status !== 'thinking' || sIdx < msg.steps!.length - 1 ? '✓' : '►'}
                                                  </span>
                                                  <span style={{
                                                    fontSize: 11.5,
                                                    fontWeight: isCurrent ? 700 : 400,
                                                    color: isCurrent ? (isDark ? "#FFF" : "#000") : (isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)")
                                                  }}>
                                                    {PROCESS_LABEL[step.process] || step.label}
                                                  </span>
                                                </div>
                                                
                                                {/* Render Inline Action Card for this step data */}
                                                <ActionCardRenderer step={step} isDark={isDark} />
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Error panel */}
                                  {msg.status === 'error' && (
                                    <div style={{
                                      display: "flex", gap: 8, alignItems: "flex-start", padding: 10,
                                      background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                                      borderRadius: 10, color: "#FCA5A5", fontSize: 11
                                    }}>
                                      <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                                      <div style={{ textAlign: "left" }}>
                                        <p style={{ fontWeight: 700, margin: 0 }}>Connection failure</p>
                                        <p style={{ margin: "2px 0 0" }}>{msg.error}</p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Summary output text */}
                                  {msg.status === 'thinking' && !msg.text && (
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px" }}>
                                      <Loader2 size={14} style={{ color: "#2ECC71", animation: "spin 1s linear infinite" }} />
                                      <span style={{ fontSize: 11, color: isDark ? "#6A8A6A" : "#777" }}>Mitra is composing reply...</span>
                                    </div>
                                  )}

                                  {msg.text && (
                                    <div style={{ borderTop: msg.steps && msg.steps.length > 0 ? `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}` : 'none', paddingTop: msg.steps && msg.steps.length > 0 ? 8 : 0 }}>
                                      <FormattedMessage text={preprocessText(msg.text)} />
                                    </div>
                                  )}

                                </div>
                              )}

                            </div>

                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </>
                )}
              </div>

              {/* Suggestions row above Input Box (only if message log exists) */}
              {messages.length > 0 && (
                <div style={{
                  display: "flex", gap: 6, overflowX: "auto", padding: "8px 16px",
                  borderTop: `1px solid ${borderCol}`, scrollbarWidth: "none",
                  background: isDark ? "rgba(255,255,255,0.005)" : "rgba(0,0,0,0.002)"
                }}>
                  {activeSuggestChips.map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(chip.text)}
                      style={{
                        padding: "6px 12px", borderRadius: 12, fontSize: 11,
                        background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                        border: `1px solid ${borderCol}`, color: isDark ? "#A8D89A" : "#1B3A20",
                        cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap",
                        fontWeight: 600,
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = "#2ECC71";
                        e.currentTarget.style.background = isDark ? "rgba(46,204,113,0.06)" : "rgba(46,204,113,0.03)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = borderCol;
                        e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)";
                      }}
                    >
                      {chip.text}
                    </button>
                  ))}
                </div>
              )}

              {/* Chat Input Box */}
              <div style={{
                padding: "12px 16px 16px", borderTop: `1px solid ${borderCol}`,
                background: isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.005)"
              }}>
                {error && (
                  <p style={{ color: "#EF4444", fontSize: 11, margin: "0 0 8px 4px", textAlign: "left" }}>
                    {error}
                  </p>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  
                  {/* Microphone transcribing button */}
                  <button
                    onClick={toggleRecording}
                    disabled={isProcessingVoice}
                    style={{
                      width: 44, height: 44, borderRadius: "50%", border: "none", cursor: "pointer",
                      background: isRecording ? "#EF4444" : (isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.025)"),
                      color: isRecording ? "#FFF" : (isDark ? "#A8D89A" : "#1B3A20"),
                      display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center",
                      boxShadow: isRecording ? "0 0 12px rgba(239,68,68,0.4)" : "none",
                      transition: "all 0.2s",
                      position: "relative"
                    }}
                  >
                    {isProcessingVoice ? (
                      <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                    ) : isRecording ? (
                      <div style={{ width: 12, height: 12, borderRadius: 2, background: "#FFF" }} />
                    ) : (
                      <Mic size={18} />
                    )}

                    {/* Microphone soundwaves when active */}
                    {isRecording && (
                      <span className="absolute -inset-1 rounded-full border border-red-500 animate-ping opacity-45 pointer-events-none" />
                    )}
                  </button>

                  {/* Text Input */}
                  <div style={{
                    flex: 1, display: "flex", alignItems: "center", gap: 8,
                    background: isDark ? "rgba(255,255,255,0.04)" : "#F8FAF8",
                    border: `1px solid ${borderCol}`, borderRadius: 12,
                    padding: "0 12px", height: 44,
                  }}>
                    <input
                      type="text"
                      placeholder={
                        isRecording ? "Listening, speak clearly... / बोलें..."
                        : isProcessingVoice ? "Processing speech... / प्रक्रिया..."
                        : "Ask Kisan Mitra... / पूछें..."
                      }
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          handleSendMessage(inputText);
                        }
                      }}
                      disabled={isRecording || isProcessingVoice}
                      style={{
                        flex: 1, border: "none", outline: "none", background: "transparent",
                        color: isDark ? "#D4EDDA" : "#142A1A", fontSize: 13.5,
                      }}
                    />

                    {/* Send Button */}
                    <button
                      onClick={() => handleSendMessage(inputText)}
                      disabled={!inputText.trim() || isRecording || isProcessingVoice}
                      style={{
                        border: "none", background: "none", cursor: "pointer",
                        color: inputText.trim() ? "#2ECC71" : (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"),
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "color 0.2s"
                      }}
                    >
                      <Send size={16} />
                    </button>
                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>

      </main>

      {/* ─── Page specific animations ─── */}
      <style>{`
        @keyframes vaPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.18); opacity: 0.5; }
        }
        @keyframes vaMessageIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
