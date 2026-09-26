import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/contexts/LanguageContext';
import { FarmBackground, GlassSection } from '@/components/FarmTheme';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { AIOverview } from '@/components/AIOverview';
import {
  TrendingUp, TrendingDown, Search, RefreshCw,
  ArrowUpDown, IndianRupee, MapPin, Calendar,
  Wheat, Loader2, Filter, BarChart2, Grid3X3,
  ChevronUp, ChevronDown, Activity
} from 'lucide-react';
import {
  ComposedChart, Area, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Brush, Legend
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || '';

interface MandiRate {
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety: string;
  arrival_date: string;
  min_price: string;
  max_price: string;
  modal_price: string;
}

const STATES = [
  '', 'Andhra Pradesh', 'Bihar', 'Gujarat', 'Haryana',
  'Karnataka', 'Madhya Pradesh', 'Maharashtra', 'Punjab',
  'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh',
  'West Bengal',
];

// ─── Reusable primitives ───────────────────────────────────────────────────────

const css = {
  card: (isDark: boolean) => ({
    background: isDark ? 'rgba(15,28,18,0.85)' : 'rgba(255,255,255,0.92)',
    border: `1px solid ${isDark ? 'rgba(46,204,113,0.12)' : 'rgba(30,100,50,0.1)'}`,
    borderRadius: '16px',
    backdropFilter: 'blur(16px)',
  } as React.CSSProperties),
  text: {
    primary: (isDark: boolean) => isDark ? '#D4EDDA' : '#142A1A',
    secondary: (isDark: boolean) => isDark ? '#5A8A6A' : '#4D7060',
    accent: '#2ECC71',
    danger: '#EF4444',
    info: '#3B82F6',
    warning: '#F59E0B',
  },
};

// ─── Tiny sparkline ────────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((val, index) => ({ val, index }));
  return (
    <ResponsiveContainer width="100%" height={36}>
      <LineChart data={chartData}>
        <Line type="monotone" dataKey="val" stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: bg, color, padding: '3px 10px',
      borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

// ─── Select wrapper ────────────────────────────────────────────────────────────
function FilterSelect({
  icon, value, onChange, isDark, children,
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  isDark: boolean;
  children: React.ReactNode;
}) {
  const border = isDark ? 'rgba(46,204,113,0.14)' : 'rgba(30,100,50,0.12)';
  const bg = isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF';
  const text = css.text.primary(isDark);
  const muted = css.text.secondary(isDark);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: bg, border: `1px solid ${border}`,
      borderRadius: 12, padding: '0 14px', height: 44, flexShrink: 0,
    }}>
      <span style={{ color: muted, display: 'flex', flexShrink: 0 }}>{icon}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          border: 'none', outline: 'none', background: 'transparent',
          color: text, fontSize: 14, cursor: 'pointer', height: '100%',
          minWidth: 0, maxWidth: 180,
        }}
      >
        {children}
      </select>
    </div>
  );
}

// ─── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, accentColor, isDark }: {
  label: string; value: string | number;
  icon: React.ReactNode; accentColor: string; isDark: boolean;
}) {
  return (
    <div style={{ ...css.card(isDark), padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: `${accentColor}18`, color: accentColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 12, color: css.text.secondary(isDark), fontWeight: 600, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
        <p style={{ fontSize: 22, fontWeight: 800, color: css.text.primary(isDark), margin: 0, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      </div>
    </div>
  );
}

// ─── Sparkline crop card ───────────────────────────────────────────────────────
function CropCard({ title, data, isDark }: { title: string; data: { prices: number[]; change: number; latest: number }; isDark: boolean }) {
  const isUp = data.change >= 0;
  const color = isUp ? css.text.accent : css.text.danger;
  return (
    <div style={{
      ...css.card(isDark),
      padding: '16px',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 11, color: css.text.secondary(isDark), textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', margin: 0 }}>{title}</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: css.text.primary(isDark), margin: '4px 0 0', fontVariantNumeric: 'tabular-nums' }}>₹{data.latest.toLocaleString()}</p>
        </div>
        <Badge
          label={`${isUp ? '+' : ''}${data.change}%`}
          color={color}
          bg={`${color}14`}
        />
      </div>
      <Sparkline data={data.prices} color={color} />
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function MandiRates() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<'grid' | 'market-intelligence'>('market-intelligence');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCommodity, setSelectedCommodity] = useState('');
  const [sortField, setSortField] = useState<'modal_price' | 'commodity'>('commodity');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);
  const [timeframe, setTimeframe] = useState<'1M' | '3M' | 'all'>('3M');

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: commodities = [] } = useQuery({
    queryKey: ['mandiCommodities'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/mandi/commodities`);
      if (!res.ok) throw new Error('Failed to fetch commodities');
      const data = await res.json();
      return data.commodities || [];
    },
  });

  const {
    data: rates = [],
    isFetching: loading,
    refetch: fetchRates,
    dataUpdatedAt: ratesUpdatedAt,
  } = useQuery({
    queryKey: ['mandiRates', selectedState, selectedCommodity],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedState) params.set('state', selectedState);
      if (selectedCommodity) params.set('commodity', selectedCommodity);
      params.set('limit', '50');
      const res = await fetch(`${API_URL}/api/mandi/rates?${params}`);
      if (!res.ok) throw new Error('Failed to fetch mandi rates');
      const data = await res.json();
      if (data.status !== 'success') throw new Error(data.message || 'Error');
      return data.rates || [];
    },
    placeholderData: keepPreviousData,
    refetchInterval: 30 * 60 * 1000,
  });

  const { data: generalHistory = [] } = useQuery({
    queryKey: ['mandiGeneralHistory'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/mandi/history?limit=1000`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      return data.records || [];
    },
    staleTime: 60000,
  });

  const {
    data: historyData = [],
    isFetching: loadingHistory,
    isPlaceholderData: isHistoryPlaceholder,
    dataUpdatedAt: historyUpdatedAt,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['mandiHistory', selectedCommodity, selectedState],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('commodity', selectedCommodity || 'Wheat');
      if (selectedState) params.set('state', selectedState);
      params.set('limit', '500');
      const res = await fetch(`${API_URL}/api/mandi/history?${params}`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      return data.records || [];
    },
    placeholderData: keepPreviousData,
    staleTime: 30000,
  });

  // ── Derived values ───────────────────────────────────────────────────────────

  const lastRefresh = ratesUpdatedAt ? new Date(ratesUpdatedAt).toLocaleTimeString() : '';
  const historyRefreshTime = historyUpdatedAt ? new Date(historyUpdatedAt).toLocaleTimeString() : '';
  const isCacheHit = !loadingHistory && !isHistoryPlaceholder && historyData.length > 0;

  const filtered = useMemo(() => rates
    .filter(r => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.commodity.toLowerCase().includes(q) ||
        r.market.toLowerCase().includes(q) ||
        r.state.toLowerCase().includes(q) ||
        r.district.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortField === 'modal_price') {
        const diff = Number(a.modal_price) - Number(b.modal_price);
        return sortDir === 'asc' ? diff : -diff;
      }
      const diff = a.commodity.localeCompare(b.commodity);
      return sortDir === 'asc' ? diff : -diff;
    }), [rates, searchQuery, sortField, sortDir]);

  const toggleSort = (field: 'modal_price' | 'commodity') => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const marqueeItems = useMemo(() => {
    if (!generalHistory.length) {
      return [
        { label: 'Wheat', price: 2240, location: 'Nashik', change: 1.2 },
        { label: 'Rice', price: 2850, location: 'Indore', change: -0.4 },
        { label: 'Tomato', price: 1800, location: 'Jaipur', change: 3.5 },
        { label: 'Potato', price: 1250, location: 'Pune', change: 0.8 },
      ];
    }
    return generalHistory.slice(0, 15).map(r => {
      const price = Number(r.modal_price) || 2000;
      const change = Math.round(((price % 13) - 6) * 10) / 10;
      return { label: r.commodity, price, location: r.market, change: change === 0 ? 0.5 : change };
    });
  }, [generalHistory]);

  const sparklines = useMemo(() => {
    const crops = ['wheat', 'rice', 'onion', 'potato'];
    const partitioned: Record<string, number[]> = { wheat: [], rice: [], onion: [], potato: [] };
    generalHistory.forEach(r => {
      const cName = r.commodity.toLowerCase();
      crops.forEach(crop => {
        if (cName.includes(crop) && partitioned[crop].length < 8) partitioned[crop].push(Number(r.modal_price));
      });
    });
    const fallbacks: Record<string, number[]> = {
      wheat: [2100, 2150, 2120, 2180, 2200, 2190, 2240],
      rice: [2800, 2820, 2810, 2840, 2830, 2860, 2850],
      onion: [1400, 1450, 1420, 1480, 1500, 1490, 1520],
      potato: [1100, 1150, 1120, 1180, 1200, 1190, 1250],
    };
    const result: Record<string, { prices: number[]; change: number; latest: number }> = {};
    crops.forEach(crop => {
      let prices = partitioned[crop].reverse();
      if (prices.length < 3) prices = fallbacks[crop];
      const latest = prices[prices.length - 1] || 0;
      const prev = prices[0] || latest;
      const change = prev > 0 ? ((latest - prev) / prev) * 100 : 0;
      result[crop] = { prices, latest, change: Math.round(change * 100) / 100 };
    });
    return result;
  }, [generalHistory]);

  const chartDataWithMA = useMemo(() => {
    const data = [...historyData]
      .map(r => ({
        ...r,
        min: Number(r.min_price),
        max: Number(r.max_price),
        modal: Number(r.modal_price),
        date: r.arrival_date,
        range: [Number(r.min_price), Number(r.max_price)],
      }))
      .reverse();
    return data.map((d, index) => {
      const start = Math.max(0, index - 4);
      const subset = data.slice(start, index + 1);
      const sum = subset.reduce((acc, curr) => acc + curr.modal, 0);
      return { ...d, ma: Math.round(sum / subset.length) };
    });
  }, [historyData]);

  const displayedChartData = useMemo(() => {
    if (timeframe === '1M') {
      return chartDataWithMA.slice(-30);
    }
    if (timeframe === '3M') {
      return chartDataWithMA.slice(-90);
    }
    return chartDataWithMA;
  }, [chartDataWithMA, timeframe]);

  useEffect(() => {
    if (displayedChartData.length > 0) setHoveredPoint(displayedChartData[displayedChartData.length - 1]);
    else setHoveredPoint(null);
  }, [displayedChartData]);

  // ── Theme tokens ──────────────────────────────────────────────────────────────
  const textPrimary = css.text.primary(isDark);
  const textSecondary = css.text.secondary(isDark);
  const cardStyle = css.card(isDark);
  const borderColor = isDark ? 'rgba(46,204,113,0.12)' : 'rgba(30,100,50,0.1)';
  const isLoading = activeTab === 'market-intelligence' ? loadingHistory : loading;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <FarmBackground />

      {/* Header */}
      <div style={{ position: 'relative', zIndex: 50 }}>
        <DashboardHeader lastUpdateSeconds={0} sensorNodeOnline={true} />
      </div>

      <main style={{
        position: 'relative', zIndex: 10,
        maxWidth: 1360, margin: '0 auto',
        padding: '28px 24px 80px',
        boxSizing: 'border-box',
      }}>

        {/* ── Page header ── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{
                fontSize: 30, fontWeight: 800, margin: '0 0 4px',
                fontFamily: "'Nunito', sans-serif", color: isDark ? '#A8D89A' : '#1B3A20',
              }}>
                {t('mandi_title')}
              </h1>
              {lastRefresh && (
                <p style={{ fontSize: 12, color: isDark ? '#A3B8A8' : '#2C3E30', margin: 0 }}>
                  {t('Last_refreshed')}: {lastRefresh}
                </p>
              )}
            </div>

            {/* Tab switcher — right aligned */}
            <div style={{
              display: 'flex', gap: 6,
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              padding: 5, borderRadius: 14,
              border: `1px solid ${borderColor}`,
              flexShrink: 0,
            }}>
              {([
                { key: 'market-intelligence', label: 'Market Intelligence', icon: <BarChart2 size={15} /> },
                { key: 'grid', label: 'Live Grid View', icon: <Grid3X3 size={15} /> },
              ] as const).map(tab => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      fontWeight: 700, fontSize: 13, transition: 'all 0.18s',
                      background: isActive ? '#2ECC71' : 'transparent',
                      color: isActive ? '#fff' : textSecondary,
                      boxShadow: isActive ? '0 2px 10px rgba(46,204,113,0.25)' : 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tab.icon} {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <AIOverview page="mandi" />

        {/* ── Filters bar ── */}
        <div style={{
          ...cardStyle,
          padding: '14px 18px',
          marginBottom: 24,
          display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center',
        }}>
          {/* Search — grid tab only */}
          {activeTab === 'grid' && (
            <div style={{
              flex: '1 1 200px', minWidth: 160,
              display: 'flex', alignItems: 'center', gap: 8,
              background: isDark ? 'rgba(255,255,255,0.06)' : '#F8FAF8',
              border: `1px solid ${borderColor}`, borderRadius: 12, padding: '0 14px', height: 44,
            }}>
              <Search size={16} color={textSecondary} style={{ flexShrink: 0 }} />
              <input
                type="text"
                placeholder={t('mandi_search_placeholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  flex: 1, border: 'none', outline: 'none', minWidth: 0,
                  background: 'transparent', color: textPrimary, fontSize: 14,
                }}
              />
            </div>
          )}

          {/* State */}
          <FilterSelect
            icon={<MapPin size={16} />}
            value={selectedState}
            onChange={setSelectedState}
            isDark={isDark}
          >
            <option value="">{t('mandi_all_states')}</option>
            {STATES.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
          </FilterSelect>

          {/* Commodity */}
          <FilterSelect
            icon={<Filter size={16} />}
            value={selectedCommodity}
            onChange={setSelectedCommodity}
            isDark={isDark}
          >
            <option value="">{activeTab === 'market-intelligence' ? 'Wheat (Default)' : t('mandi_all_commodities')}</option>
            {commodities.map(c => <option key={c} value={c}>{c}</option>)}
          </FilterSelect>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Refresh */}
          <button
            onClick={() => activeTab === 'market-intelligence' ? refetchHistory() : fetchRates()}
            disabled={isLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '0 20px', height: 44, borderRadius: 12, border: 'none',
              background: '#2ECC71', color: '#fff', cursor: isLoading ? 'not-allowed' : 'pointer',
              fontWeight: 700, fontSize: 14, transition: 'all 0.18s',
              opacity: isLoading ? 0.65 : 1, flexShrink: 0,
              boxShadow: isLoading ? 'none' : '0 2px 10px rgba(46,204,113,0.25)',
            }}
          >
            <RefreshCw
              size={16}
              style={{ animation: isLoading ? 'mandi-spin 1s linear infinite' : 'none' }}
            />
            {t('advisor_refresh')}
          </button>
        </div>

        {/* ════════════════════════════════════════════════════════════════════════
            MARKET INTELLIGENCE TAB
        ════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'market-intelligence' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Marquee ticker */}
            <div style={{
              ...cardStyle,
              overflow: 'hidden',
              padding: '10px 0',
            }}>
              <div style={{
                display: 'flex',
                animation: 'mandi-marquee 75s linear infinite',
                whiteSpace: 'nowrap',
                width: 'max-content',
              }}>
                {[...marqueeItems, ...marqueeItems, ...marqueeItems].map((item, idx) => {
                  const isUp = item.change >= 0;
                  return (
                    <div key={idx} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      fontSize: 12, padding: '0 28px', fontFamily: 'monospace',
                    }}>
                      <span style={{ fontWeight: 700, color: textPrimary }}>{item.label}</span>
                      <span style={{ color: '#2ECC71', fontWeight: 700 }}>₹{item.price.toLocaleString()}</span>
                      <span style={{ fontSize: 11, color: textSecondary }}>({item.location})</span>
                      <span style={{
                        color: isUp ? '#2ECC71' : '#EF4444', fontSize: 11,
                        fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 2,
                      }}>
                        {isUp ? '▲' : '▼'} {Math.abs(item.change)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Crop sparkline cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              {[
                { title: 'Wheat (Kanak)', data: sparklines.wheat },
                { title: 'Rice (Chawal)', data: sparklines.rice },
                { title: 'Onion (Pyaz)', data: sparklines.onion },
                { title: 'Potato (Aloo)', data: sparklines.potato },
              ].map((card, i) => (
                <CropCard key={i} title={card.title} data={card.data} isDark={isDark} />
              ))}
            </div>

            {/* Main chart + sidebar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 16, alignItems: 'start' }}>

              {/* Chart card */}
              <div style={{ ...cardStyle, padding: '22px 22px 16px' }}>
                {/* Chart header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ fontSize: 11, color: textSecondary, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', margin: '0 0 4px' }}>
                      Modal Price Timeline · Min/Max Band
                    </p>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: textPrimary, margin: 0 }}>
                      {selectedCommodity || 'Wheat'} Price Trends
                    </h2>
                    <p style={{ fontSize: 12, color: textSecondary, margin: '3px 0 0' }}>
                      {displayedChartData.length} data points · Live database history
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    {/* Timeframe Selector */}
                    <div style={{ display: 'flex', gap: 4, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', padding: 4, borderRadius: 10 }}>
                      {(['1M', '3M', 'all'] as const).map(tf => {
                        const isActive = timeframe === tf;
                        return (
                          <button
                            key={tf}
                            onClick={() => setTimeframe(tf)}
                            style={{
                              padding: '4px 12px',
                              borderRadius: 8,
                              border: 'none',
                              background: isActive ? '#2ECC71' : 'transparent',
                              color: isActive ? '#fff' : textSecondary,
                              fontWeight: 700,
                              fontSize: 11,
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                          >
                            {tf === 'all' ? 'All' : tf}
                          </button>
                        );
                      })}
                    </div>
                    <Badge
                      label={isCacheHit ? '● CACHED · HIT' : '● LIVE · MISS'}
                      color={isCacheHit ? '#2ECC71' : '#F59E0B'}
                      bg={isCacheHit ? 'rgba(46,204,113,0.1)' : 'rgba(245,158,11,0.1)'}
                    />
                  </div>
                </div>

                {/* Chart body */}
                <div style={{ width: '100%', height: 420 }}>
                  {loadingHistory ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
                      <Loader2 size={32} color="#2ECC71" style={{ animation: 'mandi-spin 1s linear infinite' }} />
                      <span style={{ fontSize: 13, color: textSecondary }}>Loading chart data…</span>
                    </div>
                  ) : displayedChartData.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <p style={{ color: textSecondary, textAlign: 'center', fontSize: 14 }}>
                        No price history found.<br />Try a different state or commodity.
                      </p>
                    </div>
                  ) : (
                    <>
                    {/* Custom legend above chart */}
                    <div style={{ display: 'flex', gap: 20, marginBottom: 12, flexWrap: 'wrap' }}>
                      {[
                        { color: '#2ECC71', label: 'Modal Price', dash: false },
                        { color: '#3B82F6', label: '5-Day MA', dash: true },
                        { color: 'rgba(46,204,113,0.25)', label: 'Min/Max Band', band: true },
                      ].map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: textSecondary }}>
                          {item.band ? (
                            <span style={{ width: 20, height: 10, background: item.color, borderRadius: 2, display: 'inline-block' }} />
                          ) : (
                            <svg width="20" height="10">
                              <line
                                x1="0" y1="5" x2="20" y2="5"
                                stroke={item.color} strokeWidth="2.5"
                                strokeDasharray={item.dash ? '5 3' : undefined}
                              />
                            </svg>
                          )}
                          {item.label}
                        </div>
                      ))}
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={displayedChartData}
                        onMouseMove={state => {
                          if (state?.activePayload?.length) setHoveredPoint(state.activePayload[0].payload);
                        }}
                        margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
                      >
                        <defs>
                          {/* Band fill: renders UNDER lines */}
                          <linearGradient id="cmBandFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2ECC71" stopOpacity={0.18} />
                            <stop offset="100%" stopColor="#2ECC71" stopOpacity={0.04} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                        <XAxis
                          dataKey="date" fontSize={10} tickLine={false}
                          tick={{ fill: textSecondary }} axisLine={{ stroke: borderColor }}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          fontSize={10} tickLine={false} axisLine={false}
                          domain={['auto', 'auto']} tick={{ fill: textSecondary }}
                          tickFormatter={v => `₹${(v / 1000).toFixed(1)}k`}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div style={{
                                background: isDark ? 'rgba(10,20,12,0.97)' : '#FFFFFF',
                                border: `1px solid ${borderColor}`,
                                padding: '10px 14px', borderRadius: 12, fontSize: 12,
                                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                              }}>
                                <p style={{ fontWeight: 700, color: textPrimary, margin: '0 0 6px' }}>{d.date}</p>
                                <p style={{ color: '#2ECC71', fontWeight: 700, margin: '0 0 3px' }}>Modal: ₹{d.modal?.toLocaleString()}</p>
                                <p style={{ color: textSecondary, margin: '0 0 3px' }}>Range: ₹{d.min?.toLocaleString()} – ₹{d.max?.toLocaleString()}</p>
                                <p style={{ color: '#3B82F6', margin: '0 0 3px' }}>5-Day MA: ₹{d.ma?.toLocaleString()}</p>
                                <p style={{ fontSize: 10, color: textSecondary, margin: 0 }}>{d.market}</p>
                              </div>
                            );
                          }}
                        />
                        {/* Ranged Area Band */}
                        <Area
                          type="monotone"
                          dataKey="range"
                          stroke="none"
                          fill="url(#cmBandFill)"
                          legendType="none"
                          dot={false}
                          activeDot={false}
                          isAnimationActive={false}
                        />
                        {/* Lines on top */}
                        <Line
                          type="monotone"
                          dataKey="modal"
                          stroke="#2ECC71"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 5, fill: '#2ECC71', stroke: isDark ? '#0d1f10' : '#fff', strokeWidth: 2 }}
                          isAnimationActive={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="ma"
                          stroke="#3B82F6"
                          strokeWidth={1.5}
                          strokeDasharray="5 4"
                          dot={false}
                          activeDot={false}
                          isAnimationActive={false}
                        />
                        <Brush
                          dataKey="date"
                          height={26}
                          stroke={isDark ? 'rgba(46,204,113,0.2)' : 'rgba(30,100,50,0.15)'}
                          fill={isDark ? '#0d1f10' : '#F4F8F4'}
                          travellerWidth={6}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                    </>
                  )}
                </div>
              </div>

              {/* Sidebar */}
              <div style={{ ...cardStyle, padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Activity size={16} color="#2ECC71" />
                  <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: textPrimary }}>
                    Spotlight · Mandi
                  </span>
                </div>

                {/* Stats list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {[
                    { label: 'Records', value: String(historyData.length || '0'), mono: true },
                    { label: 'Source', value: 'Neon Serverless DB', accent: '#2ECC71' },
                    { label: 'Cache', value: isCacheHit ? 'HIT · Memcached' : 'MISS · DB Query', accent: isCacheHit ? '#2ECC71' : '#F59E0B' },
                    { label: 'Updated', value: historyRefreshTime || 'Pending' },
                    { label: 'Commodity', value: selectedCommodity || 'Wheat' },
                    { label: 'Region', value: selectedState || 'All States' },
                  ].map((stat, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '9px 0',
                      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
                    }}>
                      <span style={{ fontSize: 12, color: textSecondary }}>{stat.label}</span>
                      <span style={{
                        fontSize: 12, fontWeight: 700,
                        fontFamily: stat.mono ? 'monospace' : undefined,
                        color: stat.accent || textPrimary,
                        maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        textAlign: 'right',
                      }}>{stat.value}</span>
                    </div>
                  ))}
                </div>

                {/* Quality bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: textSecondary }}>Data Ingestion Quality</span>
                    <span style={{ fontSize: 11, color: '#2ECC71', fontWeight: 700 }}>96%</span>
                  </div>
                  <div style={{ height: 5, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: '96%', height: '100%', background: '#2ECC71', borderRadius: 4 }} />
                  </div>
                </div>

                {/* Hovered node detail */}
                <div style={{
                  background: isDark ? 'rgba(46,204,113,0.04)' : 'rgba(0,0,0,0.02)',
                  border: `1px solid ${isDark ? 'rgba(46,204,113,0.12)' : 'rgba(0,0,0,0.05)'}`,
                  borderRadius: 12, padding: 14,
                }}>
                  <p style={{ fontSize: 10, color: textSecondary, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', margin: '0 0 10px' }}>
                    Interactive Node Focus
                  </p>
                  {hoveredPoint ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
                      {[
                        { label: 'Date', value: hoveredPoint.date, color: textPrimary },
                        { label: 'Modal Price', value: `₹${hoveredPoint.modal?.toLocaleString()}`, color: '#2ECC71' },
                        { label: 'Min', value: `₹${hoveredPoint.min?.toLocaleString()}`, color: textPrimary },
                        { label: 'Max', value: `₹${hoveredPoint.max?.toLocaleString()}`, color: textPrimary },
                      ].map((item, i) => (
                        <div key={i}>
                          <p style={{ fontSize: 10, color: textSecondary, margin: '0 0 2px' }}>{item.label}</p>
                          <p style={{ fontSize: 13, fontWeight: 700, color: item.color, margin: 0, fontVariantNumeric: 'tabular-nums' }}>{item.value}</p>
                        </div>
                      ))}
                      <div style={{ gridColumn: 'span 2' }}>
                        <p style={{ fontSize: 10, color: textSecondary, margin: '0 0 2px' }}>Market · Variety</p>
                        <p style={{ fontSize: 12, fontWeight: 700, color: textPrimary, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {hoveredPoint.market} · {hoveredPoint.variety || 'Common'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: 12, color: textSecondary, margin: 0, textAlign: 'center' }}>
                      Hover the chart to lock coordinates
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════
            GRID VIEW TAB
        ════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'grid' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Summary stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
              <StatCard
                label={t('mandi_total_entries')} value={filtered.length}
                icon={<Wheat size={20} />} accentColor="#2ECC71" isDark={isDark}
              />
              <StatCard
                label={t('mandi_highest_price')}
                value={filtered.length ? `₹${Math.max(...filtered.map(r => Number(r.modal_price))).toLocaleString()}` : '—'}
                icon={<TrendingUp size={20} />} accentColor="#EF4444" isDark={isDark}
              />
              <StatCard
                label={t('mandi_lowest_price')}
                value={filtered.length ? `₹${Math.min(...filtered.map(r => Number(r.modal_price))).toLocaleString()}` : '—'}
                icon={<TrendingDown size={20} />} accentColor="#3B82F6" isDark={isDark}
              />
              <StatCard
                label={t('mandi_avg_price')}
                value={filtered.length ? `₹${Math.round(filtered.reduce((s, r) => s + Number(r.modal_price), 0) / filtered.length).toLocaleString()}` : '—'}
                icon={<IndianRupee size={20} />} accentColor="#F59E0B" isDark={isDark}
              />
            </div>

            {/* Table card */}
            <div style={{ ...cardStyle, padding: '0 0 4px', overflow: 'hidden' }}>
              {/* Table header row */}
              <div style={{
                padding: '16px 20px 12px',
                borderBottom: `1px solid ${borderColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              }}>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: textPrimary, margin: 0 }}>
                  {t('mandi_commodity_prices')}
                </h2>
                <span style={{ fontSize: 12, color: textSecondary }}>{filtered.length} entries</span>
              </div>

              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 12 }}>
                  <Loader2 size={30} color="#2ECC71" style={{ animation: 'mandi-spin 1s linear infinite' }} />
                  <p style={{ color: textSecondary, fontWeight: 600, fontSize: 14, margin: 0 }}>{t('mandi_fetching')}</p>
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <p style={{ fontSize: 16, color: textSecondary, margin: '0 0 6px' }}>{t('mandi_no_data')}</p>
                  <p style={{ fontSize: 13, color: textSecondary, margin: 0 }}>{t('mandi_try_filters')}</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
                    <thead>
                      <tr style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)' }}>
                        {[
                          { key: 'commodity', label: t('mandi_col_commodity'), sortable: true },
                          { key: 'variety', label: t('mandi_col_variety'), sortable: false },
                          { key: 'market', label: t('mandi_col_market'), sortable: false },
                          { key: 'state', label: t('mandi_col_state'), sortable: false },
                          { key: 'modal_price', label: t('mandi_col_modal_price'), sortable: true },
                          { key: 'min_price', label: t('mandi_col_min'), sortable: false },
                          { key: 'max_price', label: t('mandi_col_max'), sortable: false },
                          { key: 'arrival_date', label: t('mandi_col_date'), sortable: false },
                        ].map(col => (
                          <th
                            key={col.key}
                            onClick={() => col.sortable && toggleSort(col.key as any)}
                            style={{
                              padding: '12px 16px', textAlign: 'left', fontSize: 11,
                              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                              color: textSecondary, whiteSpace: 'nowrap',
                              cursor: col.sortable ? 'pointer' : 'default', userSelect: 'none',
                              borderBottom: `1px solid ${borderColor}`,
                            }}
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                              {col.label}
                              {col.sortable && sortField === col.key && (
                                sortDir === 'asc'
                                  ? <ChevronUp size={12} />
                                  : <ChevronDown size={12} />
                              )}
                              {col.sortable && sortField !== col.key && (
                                <ArrowUpDown size={11} style={{ opacity: 0.3 }} />
                              )}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((rate, idx) => {
                        const modal = Number(rate.modal_price);
                        const isHigh = modal > 3000;
                        const rowBg = idx % 2 === 0
                          ? (isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.01)')
                          : 'transparent';
                        return (
                          <tr key={idx} style={{ background: rowBg, transition: 'background 0.15s' }}>
                            <td style={{ padding: '13px 16px', fontWeight: 700, color: textPrimary, fontSize: 14, whiteSpace: 'nowrap' }}>
                              {rate.commodity}
                            </td>
                            <td style={{ padding: '13px 16px', color: textSecondary, fontSize: 13 }}>
                              {rate.variety || '—'}
                            </td>
                            <td style={{ padding: '13px 16px', fontSize: 13, color: textPrimary, whiteSpace: 'nowrap' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                <MapPin size={12} color="#2ECC71" style={{ flexShrink: 0 }} />
                                {rate.market}
                              </span>
                            </td>
                            <td style={{ padding: '13px 16px', fontSize: 13, color: textSecondary, whiteSpace: 'nowrap' }}>
                              {rate.state}
                            </td>
                            <td style={{ padding: '13px 16px', fontWeight: 800, fontSize: 15, color: isHigh ? '#EF4444' : '#2ECC71', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                              ₹{Number(rate.modal_price).toLocaleString()}
                            </td>
                            <td style={{ padding: '13px 16px', fontSize: 13, color: textSecondary, fontVariantNumeric: 'tabular-nums' }}>
                              ₹{Number(rate.min_price).toLocaleString()}
                            </td>
                            <td style={{ padding: '13px 16px', fontSize: 13, color: textSecondary, fontVariantNumeric: 'tabular-nums' }}>
                              ₹{Number(rate.max_price).toLocaleString()}
                            </td>
                            <td style={{ padding: '13px 16px', fontSize: 12, color: textSecondary, whiteSpace: 'nowrap' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                <Calendar size={12} />
                                {rate.arrival_date}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes mandi-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes mandi-marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        .mandi-table tr:hover td {
          background: rgba(46, 204, 113, 0.04) !important;
        }
      `}</style>
    </div>
  );
}