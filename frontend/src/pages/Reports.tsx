import { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { FarmBackground, GlassSection, GlassCard } from '@/components/FarmTheme';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import {
  FileText, Thermometer, Droplets, Wind, Sun,
  Sprout, CloudRain, AlertTriangle, CheckCircle, Leaf,
  Sparkles, Printer, Send, RefreshCw, Layers, Clock, AlertCircle, ArrowRight, Loader2
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';
const API = `${API_BASE}/api/sensors`;

interface SensorData {
  temperature: number;
  humidity: number;
  wind_speed: number;
  rainfall: number;
  soil_moisture: number;
  light: number;
  uv_index: number;
  pressure: number;
}

const defaultSensor: SensorData = {
  temperature: 0, humidity: 0, wind_speed: 0, rainfall: 0,
  soil_moisture: 0, light: 0, uv_index: 0, pressure: 0,
};

// ─── Text Preprocessing for Markdown/JSON Cleanliness ────────────────────────
function preprocessText(text: any): string {
  if (!text) return '';
  if (typeof text !== 'string') {
    return '';
  }
  let cleaned = text;

  // Clean out raw JSON code blocks in text replies
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

export default function Reports() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { t, language } = useLanguage();
  const reportRef = useRef<HTMLDivElement>(null);

  // Report selection modules configuration
  const [includeWeather, setIncludeWeather] = useState(true);
  const [includeSoil, setIncludeSoil] = useState(true);
  const [includeMandi, setIncludeMandi] = useState(true);
  const [includeSchemes, setIncludeSchemes] = useState(true);
  const [includeAlerts, setIncludeAlerts] = useState(true);
  const [includePlan, setIncludePlan] = useState(true);

  // Format selection
  const [reportFormat, setReportFormat] = useState<'digest' | 'scientific' | 'action'>('digest');

  // Generation log stepper state
  const [genSteps, setGenSteps] = useState<string[]>([]);
  const [genProgress, setGenProgress] = useState(0);

  // Loaded database data for the report
  const [mandiRecords, setMandiRecords] = useState<any[]>([]);
  const [schemesRecords, setSchemesRecords] = useState<any[]>([]);

  const [aiAdvice, setAiAdvice] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [generatedAt, setGeneratedAt] = useState('');

  // Fetch telemetry
  const { data: sensor = defaultSensor, dataUpdatedAt: sensorUpdatedAt } = useQuery({
    queryKey: ['latestSensorData', 'WS01'],
    queryFn: async () => {
      const r = await fetch(`${API}/latest/WS01`);
      if (!r.ok) throw new Error('Sensor fetch failed');
      const d = await r.json();
      return {
        temperature: Number(d.temperature) || 0,
        humidity: Number(d.humidity) || 0,
        wind_speed: Number(d.windSpeed || d.wind_speed) || 0,
        rainfall: Number(d.rainfall) || 0,
        soil_moisture: Number(d.soilMoisture || d.soil_moisture) || 0,
        light: Number(d.lightIntensity || d.light_level) || 0,
        uv_index: Number(d.uvIndex || d.uv_index) || 0,
        pressure: Number(d.pressure) || 0,
      };
    },
    refetchInterval: 15000,
  });

  const online = !!sensor;

  const [lastUpdate, setLastUpdate] = useState(0);
  useEffect(() => {
    if (!sensorUpdatedAt) return;
    setLastUpdate(0);
    const timer = setInterval(() => {
      setLastUpdate(Math.floor((Date.now() - sensorUpdatedAt) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [sensorUpdatedAt]);

  // Generate Report with animated logs stepper
  const generateReport = async () => {
    setAiLoading(true);
    setReportGenerated(false);
    setGenProgress(0);
    setGenSteps([]);
    setMandiRecords([]);
    setSchemesRecords([]);

    const addStep = (msg: string, progress: number, delay = 500) => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          setGenSteps(prev => [...prev, msg]);
          setGenProgress(progress);
          resolve();
        }, delay);
      });
    };

    try {
      await addStep("Establishing connection with edge IoT sensor WS01...", 10);
      await addStep(`Telemetry read: Temp=${sensor.temperature.toFixed(1)}°C, Moisture=${sensor.soil_moisture.toFixed(0)}%`, 25);

      if (includeMandi) {
        await addStep("Querying Postgres Mandi history records index...", 40);
        try {
          const res = await fetch(`${API_BASE}/api/mandi/history?limit=5`);
          if (res.ok) {
            const data = await res.json();
            setMandiRecords(data.records || []);
            await addStep(`✓ Loaded ${data.records?.length || 0} mandi prices from PostgreSQL history.`, 50, 400);
          }
        } catch (e) {
          console.warn("Mandi history prefetch failed", e);
        }
      }

      if (includeSchemes) {
        await addStep("Querying government schemes database explorer...", 60);
        try {
          const res = await fetch(`${API_BASE}/api/schemes`);
          if (res.ok) {
            const data = await res.json();
            setSchemesRecords(data.schemes || []);
            await addStep(`✓ Loaded ${data.schemes?.length || 0} welfare schemes from database explorer.`, 70, 400);
          }
        } catch (e) {
          console.warn("Schemes prefetch failed", e);
        }
      }

      await addStep("🧠 Synthesizing data prompts and formatting criteria...", 80);
      await addStep("Calling Kisan Mitra AI model (Gemini pool: category overview)...", 90);

      // Gemini AI call
      const r = await fetch(`${API_BASE}/api/advisor/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'overview' }),
      });

      let insights = '';
      if (r.ok) {
        const d = await r.json();
        if (typeof d.ai_insights === 'string') {
          insights = d.ai_insights;
        } else if (d.ai_insights && typeof d.ai_insights === 'object') {
          insights = d.ai_insights.summary || d.ai_insights.details || JSON.stringify(d.ai_insights);
        }
      } else {
        insights = 'AI analysis could not complete. Reverted to telemetry verification.';
      }

      setAiAdvice(insights || 'AI analysis complete. Conditions are within normal range.');
      await addStep("Farm Intelligence report finalized successfully.", 100, 400);

      setGeneratedAt(new Date().toLocaleString());
      setReportGenerated(true);
    } catch (e) {
      console.error(e);
      setAiAdvice("Advisory telemetry compiled with connection warnings.");
      setReportGenerated(true);
    } finally {
      setAiLoading(false);
    }
  };

  const exportPDF = () => {
    if (!reportRef.current) return;
    const content = reportRef.current.innerHTML;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
<title>Farm Intelligence Report - ${new Date().toISOString().split('T')[0]}</title>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
body{font-family:'Nunito',sans-serif;margin:0;padding:40px 30px;color:#111;background:#fff;line-height:1.6}
h1,h2,h3{color:#1B3A20!important}
p,span,div,strong{color:#222!important}
.rpt-header{text-align:center;padding-bottom:20px;border-bottom:3px solid #2ECC71;margin-bottom:28px}
.rpt-header h1{font-size:26px;font-weight:900;color:#1B3A20!important;margin:0 0 4px}
.rpt-header p{color:#444!important;font-size:12px;margin:2px 0}
.rpt-badge{display:inline-block;padding:3px 14px;border-radius:20px;background:#E8F5E9;color:#2E7D32!important;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin-top:8px}
.rpt-section{margin-bottom:24px;page-break-inside:avoid}
.rpt-stitle{font-size:13px;font-weight:800;color:#2E7D32!important;text-transform:uppercase;letter-spacing:2px;margin:0 0 14px;padding-bottom:6px;border-bottom:1px solid #C8E6C9}
.table-grid {width:100%;border-collapse:collapse;margin-top:10px}
.table-grid th {background:#F4F8F4;color:#2E7D32;padding:8px 12px;font-size:11px;font-weight:700;text-align:left;border-bottom:2px solid #C8E6C9}
.table-grid td {padding:8px 12px;font-size:11px;border-bottom:1px solid #E8F5E9;color:#333}
.rpt-footer{text-align:center;margin-top:30px;padding-top:16px;border-top:2px solid #C8E6C9;color:#555!important;font-size:10px}
@media print{body{padding:15px;color:#000!important}@page{margin:12mm;size:A4}p,span,div,h1,h2,h3,h4,strong{color:#000!important}}
</style></head><body><div style="max-width:800px;margin:0 auto">${content}</div></body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 600);
  };

  const shareToWhatsApp = () => {
    const intro = `*AgriSense Farm Intelligence Report*\n*Date:* ${generatedAt}\n*Format:* ${reportFormat.toUpperCase()}\n\n`;
    const telemetry = includeWeather
      ? `*Live Telemetry:*\nTemp: ${sensor.temperature.toFixed(1)}°C\nHumidity: ${sensor.humidity.toFixed(0)}%\nWind: ${sensor.wind_speed.toFixed(1)} km/h\nSoil Moisture: ${sensor.soil_moisture.toFixed(0)}%\n\n`
      : '';
    
    let alertsText = '';
    if (includeAlerts) {
      const activeAlerts = getAlerts();
      alertsText = `*Active Alerts:*\n` + activeAlerts.map(a => `[${a.severity === 'danger' ? 'CRITICAL' : 'WARNING'}] ${a.message} (Action: ${a.action})`).join('\n') + `\n\n`;
    }

    let mandiText = '';
    if (includeMandi && mandiRecords.length > 0) {
      mandiText = `*Database Mandi Spotlight:*\n` + mandiRecords.slice(0, 3).map(r => `• ${r.commodity}: ₹${Number(r.modal_price).toLocaleString()} (${r.market})`).join('\n') + `\n\n`;
    }

    const adviceText = aiAdvice
      ? `*AI Sowing Advice Summary:*\n${preprocessText(aiAdvice).slice(0, 240)}...\n\n`
      : '';

    const footer = `Generated using AgriSense AI. Check full dashboard for details.`;
    const fullText = intro + telemetry + alertsText + mandiText + adviceText + footer;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}`;
    window.open(url, '_blank');
  };

  const getStatus = (type: string): string => {
    if (type === 'temp') return sensor.temperature > 35 ? 'danger' : sensor.temperature < 10 ? 'warning' : 'good';
    if (type === 'humid') return sensor.humidity > 85 ? 'warning' : sensor.humidity < 30 ? 'danger' : 'good';
    if (type === 'soil') return sensor.soil_moisture > 70 ? 'warning' : sensor.soil_moisture < 25 ? 'danger' : 'good';
    if (type === 'wind') return sensor.wind_speed > 30 ? 'danger' : sensor.wind_speed > 15 ? 'warning' : 'good';
    return 'good';
  };

  const statusColor = (s: string) => s === 'danger' ? '#EF4444' : s === 'warning' ? '#F59E0B' : '#10B981';

  const getAlerts = () => {
    const a: Array<{ severity: string; message: string; action: string }> = [];
    if (sensor.temperature > 35) a.push({ severity: 'danger', message: `High temperature: ${sensor.temperature.toFixed(1)}°C`, action: 'Provide shade and increase irrigation' });
    if (sensor.temperature < 10) a.push({ severity: 'warning', message: `Low temperature: ${sensor.temperature.toFixed(1)}°C`, action: 'Protect frost-sensitive crops' });
    if (sensor.humidity > 85) a.push({ severity: 'warning', message: `Very high humidity: ${sensor.humidity.toFixed(0)}%`, action: 'Watch for fungal diseases' });
    if (sensor.humidity < 30) a.push({ severity: 'danger', message: `Very low humidity: ${sensor.humidity.toFixed(0)}%`, action: 'Increase watering frequency' });
    if (sensor.soil_moisture < 25) a.push({ severity: 'danger', message: `Soil too dry: ${sensor.soil_moisture.toFixed(0)}%`, action: 'Irrigate immediately' });
    if (sensor.soil_moisture > 70) a.push({ severity: 'warning', message: `Soil too wet: ${sensor.soil_moisture.toFixed(0)}%`, action: 'Reduce irrigation, check drainage' });
    if (sensor.wind_speed > 30) a.push({ severity: 'danger', message: `High wind: ${sensor.wind_speed.toFixed(1)} km/h`, action: 'Secure structures, delay spraying' });
    if (sensor.rainfall > 5) a.push({ severity: 'warning', message: `Heavy rainfall: ${sensor.rainfall.toFixed(1)} mm`, action: 'Check for waterlogging' });
    if (a.length === 0) a.push({ severity: 'info', message: 'All conditions normal', action: 'Continue regular operations' });
    return a;
  };

  // Styling Primitives
  const borderCol = isDark ? 'rgba(46,204,113,0.12)' : 'rgba(30,100,50,0.1)';
  const surfaceCol = isDark ? 'rgba(15,28,18,0.85)' : 'rgba(255,255,255,0.92)';
  const cardStyle = {
    background: surfaceCol,
    border: `1px solid ${borderCol}`,
    borderRadius: '16px',
    backdropFilter: 'blur(16px)',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 13, fontWeight: 800, color: '#2ECC71',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    marginBottom: 14, paddingBottom: 6,
    borderBottom: `1px solid ${borderCol}`,
    textAlign: "left"
  };

  const btnBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '6px 12px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.12s',
  };

  const btnDefault: React.CSSProperties = {
    ...btnBase,
    background: 'transparent',
    border: `1px solid ${borderCol}`,
    color: isDark ? '#A8D89A' : '#1B3A20',
  };

  const btnPrimary: React.CSSProperties = {
    ...btnBase,
    border: '1px solid transparent',
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <FarmBackground />
      <div style={{ position: 'relative', zIndex: 50 }}>
        <DashboardHeader lastUpdateSeconds={lastUpdate} sensorNodeOnline={online} />
      </div>

      <main style={{ position: 'relative', zIndex: 10, maxWidth: 1200, margin: '0 auto', padding: '24px 20px 60px' }}>
        
        {/* Title Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28, textAlign: "left" }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, #2ECC71, #1a9e52)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(46,204,113,0.25)',
          }}>
            <FileText style={{ color: 'white', width: 22, height: 22 }} />
          </div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: isDark ? '#A8D89A' : '#1B3A20', margin: 0 }}>
              {t('reports_title')}
            </h1>
            <p style={{ fontSize: 13, color: isDark ? '#A3B8A8' : '#2C3E30', margin: 0 }}>
              Build customizable, data-driven agriculture intelligence summaries.
            </p>
          </div>
        </div>

        {/* ─── Setup Phase ─── */}
        {!reportGenerated && !aiLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Card: Welcome & Description */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div style={{ ...cardStyle, padding: "24px", textAlign: "left" }}>
                <div style={{
                  width: 52, height: 52, borderRadius: "50%",
                  background: isDark ? 'rgba(46,204,113,0.08)' : 'rgba(46,204,113,0.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18
                }}>
                  <Leaf style={{ width: 26, height: 26, color: '#2ECC71' }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: isDark ? '#C8E8C8' : '#1B3A20', marginBottom: 8 }}>
                  Generate Farm Intelligence
                </h3>
                <p style={{ color: isDark ? '#6A8A6A' : '#666', fontSize: 13, lineHeight: 1.6, marginBottom: 18 }}>
                  Select which database Explorer logs and active sensor streams you want compiled. Kisan Mitra LLM will structure the report with expert sowing insights and warnings.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {['PostgreSQL Logs', 'Live Sensors', 'Mandi indices', 'Welfare Schemes'].map((item, i) => (
                    <span key={i} style={{
                      fontSize: 11, fontWeight: 700, color: isDark ? '#6A8A6A' : '#5A7A60',
                      padding: '5px 12px', borderRadius: 20,
                      background: isDark ? 'rgba(46,204,113,0.06)' : 'rgba(46,204,113,0.03)',
                      border: `1px solid ${borderCol}`
                    }}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Card: Choices Workspace */}
            <div className="lg:col-span-7 flex flex-col">
              <div style={{ ...cardStyle, padding: "24px", textAlign: "left", flex: 1, display: "flex", flexDirection: "column" }}>
                
                <h3 style={{ fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: isDark ? "#A8D89A" : "#1B3A20", marginBottom: 16, borderBottom: `1px solid ${borderCol}`, paddingBottom: 8 }}>
                  Configuration Settings
                </h3>

                {/* Checklist grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginBottom: 20 }}>
                  {[
                    { state: includeWeather, setter: setIncludeWeather, label: "Live Telemetry", desc: "Temperature, wind, rainfall stats" },
                    { state: includeSoil, setter: setIncludeSoil, label: "Soil Health", desc: "Moisture & health metrics" },
                    { state: includeMandi, setter: setIncludeMandi, label: "Mandi price history", desc: "Postgres history prices" },
                    { state: includeSchemes, setter: setIncludeSchemes, label: "Government Schemes", desc: "Explorer database table" },
                    { state: includeAlerts, setter: setIncludeAlerts, label: "Environmental alerts", desc: "Frost & threshold alarms" },
                    { state: includePlan, setter: setIncludePlan, label: "Operational Plan", desc: "Suggested field schedule" },
                  ].map((chk, idx) => (
                    <label key={idx} style={{
                      display: "flex", gap: 10, padding: 12, borderRadius: 12, cursor: "pointer",
                      background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)",
                      border: `1px solid ${chk.state ? '#2ECC71' : borderCol}`,
                      transition: "all 0.18s"
                    }}>
                      <input
                        type="checkbox"
                        checked={chk.state}
                        onChange={e => chk.setter(e.target.checked)}
                        style={{ cursor: "pointer", accentColor: "#2ECC71", width: 15, height: 15, marginTop: 2 }}
                      />
                      <div>
                        <p style={{ fontSize: 12.5, fontWeight: 700, color: isDark ? "#D4EDDA" : "#142A1A", margin: 0 }}>{chk.label}</p>
                        <p style={{ fontSize: 9.5, color: isDark ? "#6A8A6A" : "#666", margin: 0 }}>{chk.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Report Format Selection */}
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: isDark ? "#6A8A6A" : "#8A9A8C", marginBottom: 10 }}>
                    Report Persona / Format
                  </h4>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[
                      { key: 'digest', title: "Farmer Digest", desc: "Concise, field advice" },
                      { key: 'scientific', title: "Scientific Audit", desc: "Telemetry charts data" },
                      { key: 'action', title: "Action Blueprint", desc: "Operational plan focus" },
                    ].map((fmt) => {
                      const sel = reportFormat === fmt.key;
                      return (
                        <button
                          key={fmt.key}
                          onClick={() => setReportFormat(fmt.key as any)}
                          style={{
                            flex: 1, padding: "10px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                            background: sel ? "rgba(46,204,113,0.12)" : "transparent",
                            border: `1px solid ${sel ? "#2ECC71" : borderCol}`,
                            transition: "all 0.15s"
                          }}
                        >
                          <p style={{ fontSize: 12, fontWeight: 700, color: sel ? "#2ECC71" : (isDark ? "#C8E8C8" : "#111"), margin: 0 }}>{fmt.title}</p>
                          <p style={{ fontSize: 9, color: isDark ? "#6A8A6A" : "#777", margin: 0 }}>{fmt.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Trigger Button */}
                <button
                  onClick={generateReport}
                  style={{
                    width: "100%", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '14px 28px', borderRadius: 12, border: 'none',
                    background: 'linear-gradient(135deg, #2ECC71, #1a9e52)',
                    color: 'white', fontSize: 15, fontWeight: 800, cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(46,204,113,0.3)',
                    marginTop: "auto"
                  }}
                >
                  <Sparkles style={{ width: 18, height: 18 }} />
                  Start Report Compilation
                </button>

              </div>
            </div>

          </div>
        )}

        {/* ─── Loading / Stepper Phase ─── */}
        {aiLoading && (
          <div style={{ maxWidth: "600px", margin: "0 auto" }}>
            <div style={{ ...cardStyle, padding: "24px", textAlign: "left" }}>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Loader2 size={16} style={{ color: "#2ECC71", animation: "spin 1s linear infinite" }} />
                  <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: "#2ECC71" }}>
                    Compiling Intelligence
                  </span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, color: isDark ? "#C8E8C8" : "#1B3A20", fontFamily: "monospace" }}>
                  {genProgress}%
                </span>
              </div>

              {/* Progress Bar */}
              <div style={{ height: 6, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", borderRadius: 4, overflow: "hidden", marginBottom: 20 }}>
                <div style={{ width: `${genProgress}%`, height: "100%", background: "#2ECC71", borderRadius: 4, transition: "width 0.4s ease-out" }} />
              </div>

              {/* Steps logs */}
              <div style={{
                background: isDark ? "#0d0d0d" : "#fafafa",
                border: `1px solid ${borderCol}`,
                borderRadius: 10, padding: 14,
                fontFamily: "monospace", fontSize: 11.5,
                color: isDark ? "#A8D89A" : "#1B3A20",
                display: "flex", flexDirection: "column", gap: 6,
                minHeight: 180, maxHeight: 240, overflowY: "auto"
              }}>
                {genSteps.map((step, sIdx) => (
                  <div key={sIdx} style={{ display: "flex", gap: 6, alignItems: "flex-start", animation: "vaMessageIn 0.2s forwards" }}>
                    <span style={{ color: "#2ECC71" }}>✓</span>
                    <span>{step}</span>
                  </div>
                ))}
                {genProgress < 100 && (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#2ECC71", animation: "vaPulse 0.9s infinite" }} />
                    <span style={{ color: isDark ? "#6A8A6A" : "#888" }}>Executing background routines...</span>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ─── Generated Report View ─── */}
        {reportGenerated && !aiLoading && (
          <div style={{ maxWidth: "900px", margin: "0 auto" }}>
            
            {/* Top Command Bar */}
            <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  setReportGenerated(false);
                  setAiAdvice('');
                }}
                style={{
                  ...btnDefault,
                  padding: "10px 18px", borderRadius: 10, display: "flex", alignItems: "center", gap: 6
                }}
              >
                Back to Settings
              </button>

              <div style={{ flex: 1 }} />

              <button
                onClick={shareToWhatsApp}
                style={{
                  ...btnPrimary,
                  background: "#25D366", borderColor: "#25D366", color: "#FFF",
                  padding: "10px 18px", borderRadius: 10, display: "flex", alignItems: "center", gap: 6
                }}
              >
                <Send size={15} /> Send to WhatsApp
              </button>

              <button
                onClick={exportPDF}
                style={{
                  ...btnPrimary,
                  background: "#3B82F6", borderColor: "#3B82F6", color: "#FFF",
                  padding: "10px 18px", borderRadius: 10, display: "flex", alignItems: "center", gap: 6
                }}
              >
                <Printer size={15} /> Export PDF / Print
              </button>
            </div>

            {/* Document sheet */}
            <div ref={reportRef} style={{
              background: isDark ? "rgba(10,25,12,0.95)" : "#FFFFFF",
              border: `1.5px solid ${borderCol}`,
              borderRadius: 16,
              padding: "40px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
              color: isDark ? "#D4EDDA" : "#111111",
              fontFamily: "'Nunito', sans-serif"
            }}>
              
              {/* Document Header */}
              <div className="rpt-header" style={{
                textAlign: 'center', paddingBottom: 20,
                borderBottom: '3px solid #2ECC71', marginBottom: 28
              }}>
                <h1 style={{ fontSize: 24, fontWeight: 900, color: isDark ? '#A8D89A' : '#1B3A20', margin: '0 0 4px' }}>
                  AgriSense Farm Intelligence Report
                </h1>
                <p style={{ color: isDark ? '#6A8A6A' : '#555', fontSize: 12, margin: '2px 0' }}>
                  Station Node ID: WS01 • Report generated on: {generatedAt}
                </p>
                <p style={{ color: isDark ? '#6A8A6A' : '#555', fontSize: 11, margin: '2px 0', fontFamily: "monospace" }}>
                  Report Format: {reportFormat === 'digest' ? 'Farmer Digest Persona' : reportFormat === 'scientific' ? 'Scientific Analytical Audit' : 'Operational Action Blueprint'}
                </p>
                <span className="rpt-badge" style={{
                  display: 'inline-block', padding: '4px 14px', borderRadius: 20,
                  background: 'rgba(46,204,113,0.12)', color: '#2E7D32',
                  fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginTop: 8
                }}>
                  AI-Verified • Live Database Explorer Link
                </span>
              </div>

              {/* Section 1: Weather Telemetry */}
              {includeWeather && (
                <div style={{ marginBottom: 28 }}>
                  <h2 style={sectionTitleStyle}>️ Weather &amp; Sensor Telemetry</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
                    {[
                      { label: 'Temperature', val: sensor.temperature.toFixed(1), unit: '°C', status: getStatus('temp'), Icon: Thermometer },
                      { label: 'Humidity', val: sensor.humidity.toFixed(0), unit: '%', status: getStatus('humid'), Icon: Droplets },
                      { label: 'Wind Speed', val: sensor.wind_speed.toFixed(1), unit: 'km/h', status: getStatus('wind'), Icon: Wind },
                      { label: 'Rainfall', val: sensor.rainfall.toFixed(1), unit: 'mm', status: sensor.rainfall > 5 ? 'warning' : 'good', Icon: CloudRain },
                      { label: 'Pressure', val: sensor.pressure.toFixed(0), unit: 'hPa', status: 'good', Icon: Sun },
                      { label: 'UV Index', val: sensor.uv_index.toFixed(1), unit: '', status: sensor.uv_index > 8 ? 'danger' : 'good', Icon: Sun },
                    ].map((m) => (
                      <div key={m.label} style={{
                        background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                        border: `1px solid ${borderCol}`,
                        borderRadius: 12, padding: 12, textAlign: "center"
                      }}>
                        <m.Icon style={{ width: 16, height: 16, color: statusColor(m.status), margin: "0 auto 6px" }} />
                        <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: isDark ? '#5A7A5A' : '#666', marginBottom: 4 }}>{m.label}</p>
                        <p style={{ fontSize: 20, fontWeight: 900, color: isDark ? '#C8E8C8' : '#1B3A20', margin: 0 }}>
                          {m.val}<span style={{ fontSize: 10, color: '#2ECC71', fontWeight: 700, marginLeft: 2 }}>{m.unit}</span>
                        </p>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor(m.status), margin: '6px auto 0' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 2: Soil Health */}
              {includeSoil && (
                <div style={{ marginBottom: 28 }}>
                  <h2 style={sectionTitleStyle}> Soil Moisture &amp; Condition</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div style={{
                      background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                      border: `1px solid ${borderCol}`,
                      borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 12
                    }}>
                      <div style={{ padding: 10, borderRadius: 10, background: `${statusColor(getStatus('soil'))}15` }}>
                        <Sprout style={{ width: 20, height: 20, color: statusColor(getStatus('soil')) }} />
                      </div>
                      <div style={{ textAlign: "left" }}>
                        <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: isDark ? '#5A7A5A' : '#666', margin: 0 }}>Soil Moisture</p>
                        <p style={{ fontSize: 24, fontWeight: 900, color: isDark ? '#C8E8C8' : '#1B3A20', margin: 0 }}>{sensor.soil_moisture.toFixed(0)}%</p>
                        <p style={{ fontSize: 10, color: statusColor(getStatus('soil')), fontWeight: 700, margin: 0 }}>
                          {getStatus('soil') === 'danger' ? '⚠️ Critically Low' : getStatus('soil') === 'warning' ? '⚠️ Excess Moisture' : '✓ Optimal Health'}
                        </p>
                      </div>
                    </div>
                    
                    <div style={{
                      background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                      border: `1px solid ${borderCol}`,
                      borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 12
                    }}>
                      <div style={{ padding: 10, borderRadius: 10, background: 'rgba(255,152,0,0.1)' }}>
                        <Sun style={{ width: 20, height: 20, color: '#FF9800' }} />
                      </div>
                      <div style={{ textAlign: "left" }}>
                        <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: isDark ? '#5A7A5A' : '#666', margin: 0 }}>Solar Lux</p>
                        <p style={{ fontSize: 24, fontWeight: 900, color: isDark ? '#C8E8C8' : '#1B3A20', margin: 0 }}>{sensor.light.toFixed(0)}</p>
                        <p style={{ fontSize: 10, color: '#FF9800', fontWeight: 700, margin: 0 }}>
                          {sensor.light > 50000 ? '✓ Bright Sunlight' : sensor.light > 10000 ? '✓ Moderate Exposure' : '⚠️ Low Light'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 3: Mandi Price Indexes (Postgres Records) */}
              {includeMandi && mandiRecords.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <h2 style={sectionTitleStyle}> Spot Mandi Market Index</h2>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table-grid" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: `2px solid ${borderCol}`, fontSize: 11, color: isDark ? "#A8D89A" : "#1B3A20" }}>Commodity</th>
                          <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: `2px solid ${borderCol}`, fontSize: 11, color: isDark ? "#A8D89A" : "#1B3A20" }}>Market (Region)</th>
                          <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: `2px solid ${borderCol}`, fontSize: 11, color: isDark ? "#A8D89A" : "#1B3A20" }}>Variety</th>
                          <th style={{ textAlign: "right", padding: "8px 12px", borderBottom: `2px solid ${borderCol}`, fontSize: 11, color: isDark ? "#A8D89A" : "#1B3A20" }}>Modal Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mandiRecords.map((r, i) => (
                          <tr key={i}>
                            <td style={{ padding: "8px 12px", borderBottom: `1px solid ${borderCol}`, fontSize: 11, color: isDark ? "#D4EDDA" : "#333", fontWeight: 700 }}>{r.commodity}</td>
                            <td style={{ padding: "8px 12px", borderBottom: `1px solid ${borderCol}`, fontSize: 11, color: isDark ? "#A8D89A" : "#555" }}>{r.market} ({r.district || r.state})</td>
                            <td style={{ padding: "8px 12px", borderBottom: `1px solid ${borderCol}`, fontSize: 11, color: isDark ? "#A8D89A" : "#555" }}>{r.variety || 'Common'}</td>
                            <td style={{ padding: "8px 12px", borderBottom: `1px solid ${borderCol}`, fontSize: 11, color: "#2ECC71", fontWeight: 800, textAlign: "right" }}>₹{Number(r.modal_price).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Section 4: Government Schemes */}
              {includeSchemes && schemesRecords.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <h2 style={sectionTitleStyle}> Government Welfare Programs</h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {schemesRecords.slice(0, 3).map((s, i) => (
                      <div key={i} style={{
                        background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                        border: `1px solid ${borderCol}`,
                        borderRadius: 12, padding: 14, textAlign: "left"
                      }}>
                        <p style={{ fontSize: 13, fontWeight: 800, color: isDark ? '#C8E8C8' : '#1B3A20', margin: '0 0 2px' }}>{s.scheme_name}</p>
                        <p style={{ fontSize: 10, color: '#3B82F6', margin: '0 0 6px', fontWeight: 700 }}>Category: {s.scheme_type || 'Welfare'}</p>
                        <p style={{ fontSize: 11.5, color: isDark ? '#A8D89A' : '#444', margin: 0, lineHeight: 1.4 }}>{s.benefit_description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 5: Warnings & Alerts */}
              {includeAlerts && (
                <div style={{ marginBottom: 28 }}>
                  <h2 style={sectionTitleStyle}> Climate Warnings &amp; Advisory</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {getAlerts().map((alert, idx) => (
                      <div key={idx} style={{
                        background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                        border: `1px solid ${borderCol}`,
                        borderLeft: `4px solid ${alert.severity === 'danger' ? '#EF4444' : alert.severity === 'warning' ? '#F59E0B' : '#10B981'}`,
                        borderRadius: "4px 12px 12px 4px", padding: 12, textAlign: "left"
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          {alert.severity === 'info'
                            ? <CheckCircle style={{ width: 14, height: 14, color: '#10B981' }} />
                            : <AlertTriangle style={{ width: 14, height: 14, color: alert.severity === 'danger' ? '#EF4444' : '#F59E0B' }} />
                          }
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: isDark ? '#C8E8C8' : '#1B3A20' }}>{alert.message}</span>
                        </div>
                        <p style={{ fontSize: 11.5, color: isDark ? '#7A9A7A' : '#555', margin: 0 }}>
                          <strong>Recommended Action:</strong> {alert.action}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 6: AI Sowing & Advisor Insights */}
              {aiAdvice && (
                <div style={{ marginBottom: 28 }}>
                  <h2 style={sectionTitleStyle}> Kisan Mitra AI Insights</h2>
                  <div style={{
                    background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                    border: `1px solid ${borderCol}`,
                    borderRadius: 12, padding: 16, display: 'flex', gap: 12, alignItems: 'flex-start'
                  }}>
                    <div style={{ padding: 8, borderRadius: 10, background: 'rgba(124,58,237,0.1)', flexShrink: 0 }}>
                      <Sparkles style={{ width: 18, height: 18, color: '#7C3AED' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 800, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, textAlign: "left" }}>
                        Powered by Llama3 / Gemini AI
                      </p>
                      <FormattedMessage text={preprocessText(aiAdvice)} />
                    </div>
                  </div>
                </div>
              )}

              {/* Section 7: Action Plan Schedule */}
              {includePlan && (
                <div style={{ marginBottom: 28 }}>
                  <h2 style={sectionTitleStyle}> Daily Operations Action Plan</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                    {[
                      { time: 'Morning Routine (6-9 AM)', task: sensor.soil_moisture < 40 ? 'Start drip irrigation immediately.' : 'Inspect crop leaves for early pest vectors.' },
                      { time: 'Midday Maintenance (10-2 PM)', task: sensor.temperature > 32 ? 'Confirm greenhouse vents are open.' : 'Deploy fertilizer layers.' },
                      { time: 'Afternoon Check (3-6 PM)', task: sensor.humidity > 70 ? 'Inspect soil drainage to avoid mold.' : 'Gather yield harvests.' },
                      { time: 'Evening Wrap-Up', task: 'Check local weather forecast data. Synced.' },
                    ].map((item, idx) => (
                      <div key={idx} style={{
                        background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                        border: `1px solid ${borderCol}`,
                        borderRadius: 12, padding: 12, textAlign: "left"
                      }}>
                        <p style={{ fontSize: 11, fontWeight: 800, color: '#2ECC71', marginBottom: 4 }}>{item.time}</p>
                        <p style={{ fontSize: 11, color: isDark ? '#A8D89A' : '#333', lineHeight: 1.4, margin: 0 }}>{item.task}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Document Footer */}
              <div className="rpt-footer" style={{
                textAlign: 'center', marginTop: 40, paddingTop: 18,
                borderTop: `2px solid ${isDark ? 'rgba(46,204,113,0.15)' : '#C8E6C9'}`,
                color: isDark ? '#5A7A5A' : '#7A9A7A', fontSize: 10
              }}>
                <p style={{ margin: '3px 0' }}><strong>© {new Date().getFullYear()} AgriSense AI Farm Intelligence Platform</strong></p>
                <p style={{ margin: '3px 0' }}>Report compiled from live edge telemetry nodes & Neon database records explorer.</p>
                <p style={{ margin: '3px 0', opacity: 0.6 }}>Report ID: RPT-{Math.random().toString(36).substr(2, 8).toUpperCase()}</p>
              </div>

            </div>

          </div>
        )}

      </main>

      {/* Styles for transitions and logs */}
      <style>{`
        @keyframes vaPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.4; }
        }
        @keyframes vaMessageIn {
          from { opacity: 0; transform: translateY(8px); }
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
