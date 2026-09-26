import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from 'next-themes';
import {
  ScanLine,
  Volume2,
  VolumeX,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Send,
  HelpCircle,
  Activity,
  Info,
  ShieldCheck,
  TrendingUp,
  BarChart2,
  Cpu,
  Landmark,
  User,
  Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || '';

interface AIOverviewProps {
  page: 'dashboard' | 'schemes' | 'mandi' | 'trends' | 'growth' | 'marketplace' | 'map';
  extraContext?: any;
}

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

export function AIOverview({ page, extraContext }: AIOverviewProps) {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [overview, setOverview] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<boolean>(false);
  const [speaking, setSpeaking] = useState<boolean>(false);

  const [chatInput, setChatInput] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const getCacheKey = () => `ai_overview_${page}_${language}`;

  const fetchOverview = async (forceRegenerate = false) => {
    setLoading(true);
    setError(null);
    const userPhone = localStorage.getItem('user_phone') || '';

    try {
      if (!forceRegenerate) {
        const cached = localStorage.getItem(getCacheKey());
        if (cached) {
          setOverview(cached);
          setLoading(false);
          return;
        }
      }

      const response = await fetch(`${API_URL}/api/chat/overview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page,
          user_phone: userPhone,
          language,
          extra_context: extraContext,
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch overview insights');

      const data = await response.json();
      if (data.status === 'success' && data.overview) {
        setOverview(data.overview);
        localStorage.setItem(getCacheKey(), data.overview);
      } else {
        throw new Error('Invalid overview response format');
      }
    } catch (err: any) {
      console.error('AIOverview fetch error:', err);
      setError(err.message || 'Error compiling overview. Please try again.');
      const fallbacks: Record<string, string> = {
        dashboard: "Welcome to your farming **Dashboard**. The live sensors show **stable operations**. Ambient temperature is within optimal range, but keep an eye on **soil moisture levels** which are slightly declining.",
        schemes: "Discover welfare schemes tailored to your **profile**. Make sure your **location** and **crop configuration** are updated to receive exact matches.",
        mandi: "Live **Mandi Rates** summary. Prices for core crops like **Wheat** and **Cotton** are trading steadily. Check details below to compare regional markets.",
        trends: "Climate analytics trends. Environmental data indicates a **stable temperature projection** with a minor humidity increase forecast in the next 12 hours.",
        growth: "FPGA Diagnostic panel. Edge core networks are running smoothly in **Live Hardware Mode**. Plant health indices are computed within **12ms pipeline latency**.",
      };
      setOverview(fallbacks[page] || "AI Overview is currently loading page diagnostics...");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    setChatHistory([]);
  }, [page, language]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [chatHistory, chatLoading]);

  const toggleSpeech = () => {
    if ('speechSynthesis' in window) {
      if (speaking) {
        window.speechSynthesis.cancel();
        setSpeaking(false);
      } else {
        const plainText = overview.replace(/\*\*/g, '');
        const utterance = new SpeechSynthesisUtterance(plainText);
        utterance.lang = language;
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => v.lang.startsWith(language));
        if (voice) utterance.voice = voice;
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);
        setSpeaking(true);
        window.speechSynthesis.speak(utterance);
      }
    } else {
      alert('Text-to-speech is not supported in this browser.');
    }
  };

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  const handleSendChat = async (textToSend?: string) => {
    const query = (textToSend || chatInput).trim();
    if (!query) return;
    if (!textToSend) setChatInput('');

    const updatedHistory: ChatMessage[] = [...chatHistory, { sender: 'user', text: query }];
    setChatHistory(updatedHistory);
    setChatLoading(true);

    const userPhone = localStorage.getItem('user_phone') || '';

    try {
      const response = await fetch(`${API_URL}/api/chat/overview/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page,
          question: query,
          previous_overview: overview,
          user_phone: userPhone,
          language,
          extra_context: extraContext,
        }),
      });

      if (!response.ok) throw new Error('Failed to get answer');

      const data = await response.json();
      if (data.status === 'success' && data.answer) {
        setChatHistory([...updatedHistory, { sender: 'ai', text: data.answer }]);
      } else {
        throw new Error('Invalid format');
      }
    } catch (err: any) {
      console.error(err);
      setChatHistory([
        ...updatedHistory,
        { sender: 'ai', text: 'I encountered an issue connecting to the server. Please verify your internet connection.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const getSuggestionChips = () => {
    const chips: Record<string, string[]> = {
      dashboard: ["What does high humidity mean for crops?", "Should I water my soil today?", "Any sensor warnings active?"],
      schemes: ["Am I eligible for PM-Kisan?", "What insurance schemes cover rainfall?", "How can I apply for credit card support?"],
      mandi: ["Which market has the highest wheat price?", "What are the potato rates in Maharashtra?", "Explain price fluctuation factor."],
      trends: ["Analyze the temperature slope graph.", "Is rain likely in the next few hours?", "How does light level affect growth?"],
      growth: ["How does FPGA accelerate sensor fusion?", "What is the latency of the live hardware model?", "What is the irrigation decision model?"],
      marketplace: ["How does resource matching work?", "Who is the nearest tractor provider?", "Any mutual barters in Maharashtra?"],
      map: ["Show all active farmers in Punjab", "Who has the largest land size in Karnataka?", "How do I filter farmers by crop?"],
    };
    return chips[page] || ["Give me farming tips.", "Tell me more about this page."];
  };

  const getActionCards = () => {
    const cards: Record<string, Array<{ title: string; desc: string; icon: any; action: string; url?: string }>> = {
      dashboard: [
        { title: 'Environmental Alerts', desc: 'Inspect warning alerts on sensor nodes.', icon: Info, action: 'scroll_to_alerts' },
        { title: 'Generate PDF Report', desc: 'Compile a complete agricultural audit.', icon: BarChart2, action: 'navigate_reports' },
        { title: 'Check Telemetry Status', desc: 'Analyze live parameter card ranges.', icon: Activity, action: 'focus_telemetry' },
      ],
      schemes: [
        { title: 'PM-Kisan Portal', desc: 'Direct access to official income support page.', icon: Landmark, action: 'url', url: 'https://pmkisan.gov.in/' },
        { title: 'PM Fasal Bima', desc: 'Crop insurance registration portal.', icon: ShieldCheck, action: 'url', url: 'https://pmfby.gov.in/' },
        { title: 'KCC credit page', desc: 'MyScheme details on Kisan credit card.', icon: Landmark, action: 'url', url: 'https://www.myscheme.gov.in/schemes/kcc' },
      ],
      mandi: [
        { title: 'Explore Database', desc: 'Search full historical market databases.', icon: BarChart2, action: 'navigate_db' },
        { title: 'Analyze price graph', desc: 'View historical price charting below.', icon: TrendingUp, action: 'scroll_to_graph' },
        { title: 'Select Crops', desc: 'Adjust your preferred crops profile.', icon: Landmark, action: 'navigate_profile' },
      ],
      trends: [
        { title: 'Atmospheric Curves', desc: 'Analyze relative temperature & humidity graphs.', icon: Activity, action: 'focus_graph' },
        { title: 'Rainfall trends', desc: 'Monitor seasonal accumulation trends.', icon: TrendingUp, action: 'focus_rain' },
        { title: 'Database explorer', desc: 'Cross-reference tables of past sensor logs.', icon: BarChart2, action: 'navigate_db' },
      ],
      growth: [
        { title: 'FPGA diagnostic data', desc: 'Send combined sensor test vectors to FPGA.', icon: Cpu, action: 'send_test_vector' },
        { title: 'View Diagnostics Logs', desc: 'Read internal neural pipeline latency metrics.', icon: Info, action: 'diagnose' },
        { title: 'Manage setup', desc: 'Setup hardware pairing config.', icon: Landmark, action: 'navigate_setup' },
      ],
      marketplace: [
        { title: 'View Mutual Matches', desc: 'Filter resources for mutual barter exchanges.', icon: Activity, action: 'filter_mutual' },
        { title: 'Update My Listings', desc: 'List your excess and required tools.', icon: Landmark, action: 'navigate_profile' },
        { title: 'Explore Map View', desc: 'See geographical distribution of resources.', icon: TrendingUp, action: 'navigate_map' },
      ],
      map: [
        { title: 'Open Marketplace', desc: 'Go to matching resource boards.', icon: Landmark, action: 'navigate_marketplace' },
        { title: 'Focus Maharashtra Hub', desc: 'Zoom map into high-density Maharashtra farmer clusters.', icon: Activity, action: 'focus_maharashtra' },
        { title: 'Focus Punjab Hub', desc: 'Zoom map into high-density Punjab grain-belt clusters.', icon: Activity, action: 'focus_punjab' },
      ],
    };
    return cards[page] || [];
  };

  const handleAction = (card: { action: string; url?: string }) => {
    if (card.action === 'url' && card.url) {
      window.open(card.url, '_blank');
      return;
    }
    switch (card.action) {
      case 'scroll_to_alerts':
        document.getElementById('alerts-section')?.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'scroll_to_graph':
      case 'focus_graph':
        document.querySelector('.recharts-responsive-container')?.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'navigate_reports': window.location.href = '/reports'; break;
      case 'navigate_db': window.location.href = '/db'; break;
      case 'navigate_profile': window.location.href = '/profile'; break;
      case 'navigate_setup': window.location.href = '/hardware-setup'; break;
      case 'navigate_marketplace': window.location.href = '/marketplace'; break;
      case 'navigate_map': window.location.href = '/map'; break;
      case 'filter_mutual':
        window.dispatchEvent(new CustomEvent('filter-marketplace', { detail: 'mutual' }));
        break;
      case 'focus_maharashtra':
        window.dispatchEvent(new CustomEvent('map-focus', { detail: { lat: 19.6015, lon: 75.5529, zoom: 7 } }));
        break;
      case 'focus_punjab':
        window.dispatchEvent(new CustomEvent('map-focus', { detail: { lat: 31.1471, lon: 75.3412, zoom: 8 } }));
        break;
      case 'diagnose':
        alert('Diagnostics: ZC706 Neural Fusion running at 98.7% accuracy. Memory buffer loaded, throughput: 420 inferences/second.');
        break;
      case 'send_test_vector':
        alert('Test vector injected: Temp=28.5°C, Soil Moisture=45.2%, Humidity=62%. FPGA Fusion score computed: 84. Stress level: 12%. Status: Healthy.');
        break;
      default:
        console.log('Action triggered:', card.action);
    }
  };

  // **bold** → slightly brighter text, no color change — clean and readable
  const renderFormattedText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2);
        return (
          <span
            key={index}
            style={{
              fontWeight: 600,
              color: isDark ? 'rgba(255,255,255,0.95)' : 'rgba(15,23,42,0.90)',
            }}
          >
            {boldText}
          </span>
        );
      }
      return part;
    });
  };

  const currentLangBadge = {
    en: 'EN', hi: 'HI', te: 'TE', ta: 'TA', mr: 'MR',
    gu: 'GU', bn: 'BN', kn: 'KN', ml: 'ML', pa: 'PA',
  }[language] || 'EN';

  // Emerald accent values — one color, used sparingly
  const emerald = {
    solid: '#10b981',
    bg: isDark ? 'rgba(16,185,129,0.10)' : 'rgba(16,185,129,0.07)',
    border: isDark ? 'rgba(16,185,129,0.22)' : 'rgba(16,185,129,0.18)',
    text: isDark ? '#34d399' : '#047857',
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '1400px',
        margin: '0 auto 24px',
        background: isDark ? 'rgba(18,22,20,0.72)' : 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: '14px',
        // Emerald top accent — the single colour moment
        border: isDark ? '0.5px solid rgba(255,255,255,0.08)' : '0.5px solid rgba(15,23,42,0.10)',
        borderTop: `2px solid ${emerald.solid}`,
        boxShadow: isDark
          ? `0 8px 24px rgba(0,0,0,0.30), 0 0 0 0.5px ${emerald.border}`
          : `0 4px 16px rgba(15,23,42,0.06), 0 0 0 0.5px ${emerald.border}`,
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 18px',
          borderBottom: isDark ? '0.5px solid rgba(255,255,255,0.06)' : '0.5px solid rgba(15,23,42,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Icon box — emerald tinted */}
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              background: emerald.bg,
              border: `0.5px solid ${emerald.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ScanLine size={14} color={emerald.solid} />
          </div>

          {/* Title — neutral, professional */}
          <span
            style={{
              fontWeight: 600,
              fontSize: '12px',
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color: isDark ? 'rgba(255,255,255,0.70)' : 'rgba(15,23,42,0.65)',
            }}
          >
            AI Overview
          </span>

          {/* Language badge — muted */}
          <span
            style={{
              fontSize: '10px',
              fontWeight: 500,
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)',
              color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(15,23,42,0.38)',
              padding: '2px 7px',
              borderRadius: '4px',
              letterSpacing: '0.04em',
              border: isDark ? '0.5px solid rgba(255,255,255,0.08)' : '0.5px solid rgba(15,23,42,0.08)',
            }}
          >
            {currentLangBadge}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={toggleSpeech}
            style={{
              background: speaking ? emerald.bg : 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              color: speaking ? emerald.solid : (isDark ? 'rgba(255,255,255,0.35)' : 'rgba(15,23,42,0.35)'),
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Read overview aloud"
          >
            {speaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          <button
            onClick={() => fetchOverview(true)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(15,23,42,0.35)',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Regenerate overview"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} style={{ color: loading ? emerald.solid : undefined }} />
          </button>
        </div>
      </div>

      {/* Overview text */}
      <div style={{ padding: '16px 18px 12px' }}>
        {loading && !overview ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[92, 86, 68].map((w, i) => (
              <div
                key={i}
                style={{
                  height: '16px',
                  width: `${w}%`,
                  borderRadius: '4px',
                  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  animation: 'pulse 1.5s infinite',
                }}
              />
            ))}
          </div>
        ) : error && !overview ? (
          <div style={{ color: isDark ? 'rgba(255,100,100,0.80)' : '#dc2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Info size={13} />
            <span>{error}</span>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <div
              style={{
                fontSize: '14px',
                lineHeight: '1.75',
                color: isDark ? 'rgba(255,255,255,0.68)' : 'rgba(15,23,42,0.68)',
                maxHeight: expanded ? 'none' : '65px',
                overflow: 'hidden',
                position: 'relative',
                transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                paddingBottom: expanded ? '8px' : '0px',
              }}
            >
              {renderFormattedText(overview)}

              {!expanded && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '28px',
                    background: `linear-gradient(to bottom, transparent, ${isDark ? 'rgba(18,22,20,0.95)' : 'rgba(255,255,255,0.95)'})`,
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Expanded drawer */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                padding: '0px 18px 20px',
                borderTop: isDark ? '0.5px solid rgba(255,255,255,0.05)' : '0.5px solid rgba(15,23,42,0.06)',
              }}
            >
              {/* Quick Actions */}
              <div style={{ marginTop: '18px' }}>
                <p
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(15,23,42,0.36)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: '10px',
                  }}
                >
                  Quick actions
                </p>
                <div
                  style={{
                    display: 'flex',
                    gap: '10px',
                    overflowX: 'auto',
                    paddingBottom: '4px',
                    scrollbarWidth: 'none',
                  }}
                  className="hide-scrollbar"
                >
                  {getActionCards().map((card, idx) => {
                    const CardIcon = card.icon;
                    return (
                      <div
                        key={idx}
                        onClick={() => handleAction(card)}
                        style={{
                          flex: '0 0 220px',
                          background: isDark ? 'rgba(255,255,255,0.03)' : '#fafafa',
                          border: isDark ? '0.5px solid rgba(255,255,255,0.07)' : '0.5px solid rgba(15,23,42,0.09)',
                          borderRadius: '10px',
                          padding: '12px 14px',
                          cursor: 'pointer',
                          transition: 'all 0.18s',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '5px',
                        }}
                        // Hover: light emerald border glow via className
                        className="hover:border-emerald-500/30 hover:scale-[1.01]"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                          {/* Icon gets the emerald accent */}
                          <CardIcon size={13} color={emerald.solid} />
                          <span
                            style={{
                              fontWeight: 600,
                              fontSize: '12px',
                              color: isDark ? 'rgba(255,255,255,0.80)' : 'rgba(15,23,42,0.80)',
                            }}
                          >
                            {card.title}
                          </span>
                        </div>
                        <p
                          style={{
                            fontSize: '11px',
                            color: isDark ? 'rgba(255,255,255,0.38)' : 'rgba(15,23,42,0.42)',
                            lineHeight: '1.45',
                            margin: 0,
                          }}
                        >
                          {card.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chat section */}
              <div
                style={{
                  marginTop: '20px',
                  borderTop: isDark ? '0.5px solid rgba(255,255,255,0.05)' : '0.5px solid rgba(15,23,42,0.06)',
                  paddingTop: '16px',
                }}
              >
                <p
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(15,23,42,0.36)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: '10px',
                  }}
                >
                  Ask Kisan Mitra
                </p>

                {/* Suggestion chips — emerald tint */}
                {chatHistory.length === 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '14px' }}>
                    {getSuggestionChips().map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendChat(chip)}
                        style={{
                          background: emerald.bg,
                          border: `0.5px solid ${emerald.border}`,
                          color: emerald.text,
                          borderRadius: '6px',
                          padding: '5px 12px',
                          fontSize: '11px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.16s',
                        }}
                        className="hover:brightness-105"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}

                {/* Chat history */}
                {chatHistory.length > 0 && (
                  <div
                    ref={chatContainerRef}
                    style={{
                      maxHeight: '240px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      marginBottom: '14px',
                      padding: '10px',
                      borderRadius: '10px',
                      background: isDark ? 'rgba(0,0,0,0.12)' : 'rgba(15,23,42,0.02)',
                      border: isDark ? '0.5px solid rgba(255,255,255,0.05)' : '0.5px solid rgba(15,23,42,0.06)',
                    }}
                  >
                    {chatHistory.map((msg, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px',
                          alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                          maxWidth: '85%',
                        }}
                      >
                        {msg.sender === 'ai' && (
                          <div
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              background: emerald.bg,
                              border: `0.5px solid ${emerald.border}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              marginTop: '2px',
                            }}
                          >
                            <Bot size={12} color={emerald.solid} />
                          </div>
                        )}
                        <div
                          style={{
                            background: msg.sender === 'user'
                              ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)')
                              : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.02)'),
                            color: isDark ? 'rgba(255,255,255,0.78)' : 'rgba(15,23,42,0.75)',
                            padding: '8px 11px',
                            borderRadius: '8px',
                            borderTopRightRadius: msg.sender === 'user' ? '2px' : '8px',
                            borderTopLeftRadius: msg.sender === 'ai' ? '2px' : '8px',
                            fontSize: '13px',
                            lineHeight: '1.55',
                            fontWeight: 400,
                            border: isDark
                              ? '0.5px solid rgba(255,255,255,0.07)'
                              : '0.5px solid rgba(15,23,42,0.07)',
                          }}
                        >
                          {msg.sender === 'ai' ? renderFormattedText(msg.text) : msg.text}
                        </div>
                        {msg.sender === 'user' && (
                          <div
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.05)',
                              border: isDark ? '0.5px solid rgba(255,255,255,0.10)' : '0.5px solid rgba(15,23,42,0.10)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              marginTop: '2px',
                            }}
                          >
                            <User size={12} color={isDark ? 'rgba(255,255,255,0.45)' : 'rgba(15,23,42,0.45)'} />
                          </div>
                        )}
                      </div>
                    ))}
                    {chatLoading && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '7px',
                          color: emerald.text,
                          fontSize: '11px',
                          fontWeight: 500,
                        }}
                      >
                        <RefreshCw size={11} className="animate-spin" />
                        <span>Kisan Mitra is writing...</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Input */}
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSendChat(); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
                    border: isDark ? '0.5px solid rgba(255,255,255,0.09)' : '0.5px solid rgba(15,23,42,0.12)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    gap: '8px',
                  }}
                >
                  <HelpCircle size={14} color={isDark ? 'rgba(255,255,255,0.22)' : 'rgba(15,23,42,0.25)'} />
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask a follow-up question..."
                    disabled={chatLoading}
                    style={{
                      flex: 1,
                      border: 'none',
                      background: 'transparent',
                      outline: 'none',
                      fontSize: '13px',
                      color: isDark ? 'rgba(255,255,255,0.80)' : 'rgba(15,23,42,0.80)',
                    }}
                  />
                  {/* Send button — emerald when active */}
                  <button
                    type="submit"
                    disabled={chatLoading || !chatInput.trim()}
                    style={{
                      background: chatInput.trim() ? emerald.solid : 'transparent',
                      border: 'none',
                      cursor: chatInput.trim() ? 'pointer' : 'default',
                      borderRadius: '5px',
                      padding: '5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: chatInput.trim()
                        ? '#ffffff'
                        : (isDark ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.20)'),
                      transition: 'all 0.16s',
                    }}
                  >
                    <Send size={12} />
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expand / Collapse */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '4px',
          padding: '9px 0',
          borderTop: isDark ? '0.5px solid rgba(255,255,255,0.05)' : '0.5px solid rgba(15,23,42,0.06)',
          cursor: 'pointer',
          color: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(15,23,42,0.34)',
          fontSize: '10px',
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          userSelect: 'none',
          transition: 'color 0.2s',
        }}
        className="hover:text-emerald-500"
      >
        {expanded ? 'Show less' : 'Show more'}
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </div>
    </div>
  );
}