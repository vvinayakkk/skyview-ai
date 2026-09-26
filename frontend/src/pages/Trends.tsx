import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { FarmBackground, GlassSection } from '@/components/FarmTheme';
import { getSystemHealth, getHistoricalData } from '@/lib/weatherData';
import WeatherLoader from '@/components/WeatherLoader';
import { AIOverview } from '@/components/AIOverview';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, ReferenceLine, Brush,
  ComposedChart,
} from 'recharts';
import {
  Thermometer, Droplets, CloudRain, RefreshCw,
  TrendingUp, TrendingDown, Minus, Activity,
  BarChart2, Wind, Gauge,
} from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { useQuery } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || '';

interface HistoricalDataPoint {
  time: string;
  temperature: number;
  humidity: number;
  rainfall: number;
}

interface TrendInfo {
  direction: 'rising' | 'falling' | 'stable';
  rate: number;
  avg: number;
  min: number;
  max: number;
}

// ─── Shared design tokens (mirrored from MandiRates) ──────────────────────────
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
    temp: '#E53935',
    humid: '#42A5F5',
    rain: '#2ECC71',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function computeTrend(data: HistoricalDataPoint[], key: keyof Omit<HistoricalDataPoint, 'time'>): TrendInfo {
  if (!data || data.length < 2) return { direction: 'stable', rate: 0, avg: 0, min: 0, max: 0 };
  const values = data.map(d => d[key] as number);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const n = values.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = values.reduce((acc, v, i) => acc + i * v, 0);
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const direction: 'rising' | 'falling' | 'stable' =
    slope > 0.05 ? 'rising' : slope < -0.05 ? 'falling' : 'stable';
  return { direction, rate: Math.round(slope * 100) / 100, avg: Math.round(avg * 10) / 10, min: Math.round(min * 10) / 10, max: Math.round(max * 10) / 10 };
}

async function storeTrends(tempTrend: TrendInfo, humidTrend: TrendInfo, rainTrend: TrendInfo) {
  try {
    await fetch(`${API_URL}/api/sensors/trends/store`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        station_id: 'WS01',
        trends: [
          { metric: 'temperature', ...tempTrend },
          { metric: 'humidity', ...humidTrend },
          { metric: 'rainfall', ...rainTrend },
        ],
      }),
    });
  } catch { /* silent */ }
}

// ─── Badge (shared pattern from Mandi) ───────────────────────────────────────
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

// ─── Stat card (identical to MandiRates StatCard) ─────────────────────────────
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

// ─── Trend badge row ──────────────────────────────────────────────────────────
function TrendBadge({ trend, unit, isDark }: { trend: TrendInfo; unit: string; isDark: boolean }) {
  const map = {
    rising:  { color: css.text.danger,  bg: `${css.text.danger}14`,  icon: <TrendingUp size={12} /> },
    falling: { color: css.text.info,    bg: `${css.text.info}14`,    icon: <TrendingDown size={12} /> },
    stable:  { color: css.text.accent,  bg: `${css.text.accent}14`,  icon: <Minus size={12} /> },
  };
  const c = map[trend.direction];
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <Badge label={`${trend.direction.charAt(0).toUpperCase() + trend.direction.slice(1)} (${trend.rate > 0 ? '+' : ''}${trend.rate}/pt)`} color={c.color} bg={c.bg} />
      <Badge
        label={`Avg ${trend.avg}${unit}  ·  Min ${trend.min}${unit}  ·  Max ${trend.max}${unit}`}
        color={css.text.secondary(isDark)}
        bg={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}
      />
    </div>
  );
}

// ─── Chart section card (mirrors Mandi chart card) ────────────────────────────
function ChartCard({
  title, subtitle, dataPoints, isCacheHit, isLoading, isDark,
  children,
}: {
  title: string; subtitle: string; dataPoints: number;
  isCacheHit: boolean; isLoading: boolean; isDark: boolean;
  children: React.ReactNode;
}) {
  const textPrimary = css.text.primary(isDark);
  const textSecondary = css.text.secondary(isDark);
  const borderColor = isDark ? 'rgba(46,204,113,0.12)' : 'rgba(30,100,50,0.1)';

  return (
    <div style={{ ...css.card(isDark), padding: '22px 22px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 11, color: textSecondary, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', margin: '0 0 4px' }}>
            {subtitle}
          </p>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: textPrimary, margin: 0 }}>{title}</h2>
          <p style={{ fontSize: 12, color: textSecondary, margin: '3px 0 0' }}>
            {dataPoints} data points · Live sensor history
          </p>
        </div>
        <Badge
          label={isCacheHit ? '● CACHED · HIT' : '● LIVE · MISS'}
          color={isCacheHit ? '#2ECC71' : '#F59E0B'}
          bg={isCacheHit ? 'rgba(46,204,113,0.1)' : 'rgba(245,158,11,0.1)'}
        />
      </div>
      {children}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Trends() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { data: systemHealth } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: getSystemHealth,
    refetchInterval: 15000,
  });

  const {
    data: historicalData = [],
    isLoading,
    isRefetching: isRefreshing,
    error: historyError,
    refetch: refetchHistory,
    dataUpdatedAt: historyUpdatedAt,
  } = useQuery({
    queryKey: ['historicalData', 24],
    queryFn: () => getHistoricalData(24),
    refetchInterval: 15000,
  });

  const loading = isLoading && !historicalData.length;
  const error = historyError instanceof Error ? historyError.message : (historyError ? 'Failed to load data' : null);
  const lastRefresh = historyUpdatedAt ? new Date(historyUpdatedAt).toLocaleTimeString() : '';

  const tempTrend  = useMemo(() => computeTrend(historicalData, 'temperature'), [historicalData]);
  const humidTrend = useMemo(() => computeTrend(historicalData, 'humidity'),    [historicalData]);
  const rainTrend  = useMemo(() => computeTrend(historicalData, 'rainfall'),    [historicalData]);

  const isCacheHit = !isLoading && !isRefreshing && historicalData.length > 0;

  useEffect(() => {
    if (historicalData.length >= 2) storeTrends(tempTrend, humidTrend, rainTrend);
  }, [historicalData]);

  // Marquee items — mirrors Mandi marquee structure
  const marqueeItems = useMemo(() => {
    if (!historicalData.length) return [
      { label: 'TEMP',     value: '25°C',   change: 0.2,  location: 'WS01' },
      { label: 'HUMIDITY', value: '60%',    change: -0.1, location: 'WS01' },
      { label: 'RAINFALL', value: '0mm',    change: 0,    location: 'WS01' },
    ];
    const latest = historicalData[historicalData.length - 1];
    return [
      { label: 'TEMPERATURE', value: `${latest.temperature}°C`,  change: tempTrend.rate,  location: 'WS01' },
      { label: 'HUMIDITY',    value: `${latest.humidity}%`,       change: humidTrend.rate, location: 'WS01' },
      { label: 'RAINFALL',    value: `${latest.rainfall}mm`,      change: rainTrend.rate,  location: 'WS01' },
      { label: 'TEMP · AVG',  value: `${tempTrend.avg}°C`,        change: 0,               location: 'Avg'   },
      { label: 'HUMIDITY · AVG', value: `${humidTrend.avg}%`,     change: 0,               location: 'Avg'   },
      { label: 'STATION',     value: systemHealth?.solarCharging ? 'SOLAR' : 'GRID', change: 0.5, location: 'WS01' },
    ];
  }, [historicalData, tempTrend, humidTrend, rainTrend, systemHealth]);

  // Theme tokens
  const textPrimary   = css.text.primary(isDark);
  const textSecondary = css.text.secondary(isDark);
  const borderColor   = isDark ? 'rgba(46,204,113,0.12)' : 'rgba(30,100,50,0.1)';
  const gridColor     = isDark ? 'rgba(46,204,113,0.09)' : 'rgba(0,0,0,0.06)';
  const axisColor     = textSecondary;
  const tooltipBg     = isDark ? 'rgba(10,20,12,0.97)' : '#FFFFFF';

  const chartHeight = 320;

  // ── Loading / Error states ────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', position: 'relative' }}>
        <FarmBackground />
        <div style={{ position: 'relative', zIndex: 10 }}><WeatherLoader /></div>
      </div>
    );
  }

  if (error || !systemHealth) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', position: 'relative' }}>
        <FarmBackground />
        <GlassSection title="" noHeader>
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ color: '#D32F2F', marginBottom: '12px', fontWeight: 700 }}>{error || t('error')}</p>
            <p style={{ color: '#5A7A60', fontSize: '13px' }}>Ensure backend is running on {API_URL}</p>
          </div>
        </GlassSection>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <FarmBackground />

      {/* Header */}
      <div style={{ position: 'relative', zIndex: 50 }}>
        <DashboardHeader
          lastUpdateSeconds={systemHealth.lastUpdateSeconds}
          sensorNodeOnline={systemHealth.sensorNodeOnline}
        />
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
                {t('trends')}
              </h1>
              {lastRefresh && (
                <p style={{ fontSize: 12, color: isDark ? '#A3B8A8' : '#2C3E30', margin: 0 }}>
                  {t('Last_refreshed')}: {lastRefresh} · Auto-refresh every 15s
                </p>
              )}
            </div>

            {/* Refresh button — styled like Mandi refresh */}
            <button
              onClick={() => refetchHistory()}
              disabled={isRefreshing}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '0 20px', height: 44, borderRadius: 12, border: 'none',
                background: '#2ECC71', color: '#fff', cursor: isRefreshing ? 'not-allowed' : 'pointer',
                fontWeight: 700, fontSize: 14, transition: 'all 0.18s',
                opacity: isRefreshing ? 0.65 : 1, flexShrink: 0,
                boxShadow: isRefreshing ? 'none' : '0 2px 10px rgba(46,204,113,0.25)',
              }}
            >
              <RefreshCw
                size={16}
                style={{ animation: isRefreshing ? 'trends-spin 1s linear infinite' : 'none' }}
              />
              Refresh
            </button>
          </div>
        </div>

        <AIOverview page="trends" />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── Marquee ticker (mirrors Mandi ticker) ── */}
          <div style={{
            ...css.card(isDark),
            overflow: 'hidden',
            padding: '10px 0',
          }}>
            <div style={{
              display: 'flex',
              animation: 'trends-marquee 28s linear infinite',
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
                    <span style={{ color: '#2ECC71', fontWeight: 700 }}>{item.value}</span>
                    <span style={{ fontSize: 11, color: textSecondary }}>({item.location})</span>
                    <span style={{
                      color: isUp ? '#2ECC71' : '#EF4444', fontSize: 11,
                      fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 2,
                    }}>
                      {isUp ? '▲' : '▼'} {Math.abs(item.change)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Summary stat cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
            <StatCard
              label="Data Points"
              value={historicalData.length}
              icon={<BarChart2 size={20} />}
              accentColor="#2ECC71"
              isDark={isDark}
            />
            <StatCard
              label="Avg Temperature"
              value={`${tempTrend.avg}°C`}
              icon={<Thermometer size={20} />}
              accentColor={css.text.temp}
              isDark={isDark}
            />
            <StatCard
              label="Avg Humidity"
              value={`${humidTrend.avg}%`}
              icon={<Droplets size={20} />}
              accentColor={css.text.info}
              isDark={isDark}
            />
            <StatCard
              label="Total Rainfall"
              value={`${historicalData.reduce((s, d) => s + d.rainfall, 0).toFixed(1)}mm`}
              icon={<CloudRain size={20} />}
              accentColor={css.text.accent}
              isDark={isDark}
            />
          </div>

          {/* ── Main grid: charts + sidebar ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 16, alignItems: 'start' }}>

            {/* Charts column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* ── Temperature chart ── */}
              <ChartCard
                title="Temperature Trend"
                subtitle="Real-time · Avg Reference Line"
                dataPoints={historicalData.length}
                isCacheHit={isCacheHit}
                isLoading={isRefreshing}
                isDark={isDark}
              >
                <TrendBadge trend={tempTrend} unit="°C" isDark={isDark} />
                <div style={{ width: '100%', height: chartHeight, marginTop: 16 }}>
                  {historicalData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historicalData} margin={{ top: 5, right: 8, left: -24, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis dataKey="time" fontSize={10} tickLine={false} tick={{ fill: axisColor }} axisLine={{ stroke: borderColor }} interval="preserveStartEnd" />
                        <YAxis fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} tick={{ fill: axisColor }} unit="°C" />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div style={{ background: tooltipBg, border: `1px solid ${borderColor}`, padding: '10px 14px', borderRadius: 12, fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                                <p style={{ fontWeight: 700, color: textPrimary, margin: '0 0 6px' }}>{d.time}</p>
                                <p style={{ color: css.text.temp, fontWeight: 700, margin: 0 }}>Temperature: {d.temperature}°C</p>
                              </div>
                            );
                          }}
                        />
                        <ReferenceLine y={tempTrend.avg} stroke="rgba(229,57,53,0.35)" strokeDasharray="5 5" />
                        <Line type="monotone" dataKey="temperature" stroke={css.text.temp} strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: css.text.temp, stroke: isDark ? '#0d1f10' : '#fff', strokeWidth: 2 }} isAnimationActive={false} />
                        <Brush dataKey="time" height={26} stroke={isDark ? 'rgba(229,57,53,0.2)' : 'rgba(229,57,53,0.15)'} fill={isDark ? '#0d1f10' : '#F4F8F4'} travellerWidth={6} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <p style={{ color: textSecondary, fontSize: 14 }}>No data — waiting for sensor readings</p>
                    </div>
                  )}
                </div>
              </ChartCard>

              {/* ── Humidity chart ── */}
              <ChartCard
                title="Humidity Trend"
                subtitle="24-hour Area · Min/Max Band"
                dataPoints={historicalData.length}
                isCacheHit={isCacheHit}
                isLoading={isRefreshing}
                isDark={isDark}
              >
                <TrendBadge trend={humidTrend} unit="%" isDark={isDark} />
                <div style={{ width: '100%', height: chartHeight, marginTop: 16 }}>
                  {historicalData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={historicalData} margin={{ top: 5, right: 8, left: -24, bottom: 0 }}>
                        <defs>
                          <linearGradient id="humidGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#42A5F5" stopOpacity={isDark ? 0.3 : 0.25} />
                            <stop offset="100%" stopColor="#42A5F5" stopOpacity={0.03} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis dataKey="time" fontSize={10} tickLine={false} tick={{ fill: axisColor }} axisLine={{ stroke: borderColor }} interval="preserveStartEnd" />
                        <YAxis fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} tick={{ fill: axisColor }} unit="%" />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div style={{ background: tooltipBg, border: `1px solid ${borderColor}`, padding: '10px 14px', borderRadius: 12, fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                                <p style={{ fontWeight: 700, color: textPrimary, margin: '0 0 6px' }}>{d.time}</p>
                                <p style={{ color: css.text.info, fontWeight: 700, margin: 0 }}>Humidity: {d.humidity}%</p>
                              </div>
                            );
                          }}
                        />
                        <ReferenceLine y={humidTrend.avg} stroke="rgba(66,165,245,0.35)" strokeDasharray="5 5" />
                        <Area type="monotone" dataKey="humidity" stroke="#42A5F5" fill="url(#humidGrad)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#42A5F5', stroke: isDark ? '#0d1f10' : '#fff', strokeWidth: 2 }} isAnimationActive={false} />
                        <Brush dataKey="time" height={26} stroke={isDark ? 'rgba(66,165,245,0.2)' : 'rgba(66,165,245,0.15)'} fill={isDark ? '#0d1f10' : '#F4F8F4'} travellerWidth={6} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <p style={{ color: textSecondary, fontSize: 14 }}>No data — waiting for sensor readings</p>
                    </div>
                  )}
                </div>
              </ChartCard>

              {/* ── Rainfall chart ── */}
              <ChartCard
                title="Rainfall Accumulation"
                subtitle="Step-after Area · Cumulative"
                dataPoints={historicalData.length}
                isCacheHit={isCacheHit}
                isLoading={isRefreshing}
                isDark={isDark}
              >
                <TrendBadge trend={rainTrend} unit="mm" isDark={isDark} />
                <div style={{ width: '100%', height: chartHeight, marginTop: 16 }}>
                  {historicalData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={historicalData} margin={{ top: 5, right: 8, left: -24, bottom: 0 }}>
                        <defs>
                          <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2ECC71" stopOpacity={isDark ? 0.3 : 0.28} />
                            <stop offset="100%" stopColor="#2ECC71" stopOpacity={0.03} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis dataKey="time" fontSize={10} tickLine={false} tick={{ fill: axisColor }} axisLine={{ stroke: borderColor }} interval="preserveStartEnd" />
                        <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{ fill: axisColor }} unit="mm" />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div style={{ background: tooltipBg, border: `1px solid ${borderColor}`, padding: '10px 14px', borderRadius: 12, fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                                <p style={{ fontWeight: 700, color: textPrimary, margin: '0 0 6px' }}>{d.time}</p>
                                <p style={{ color: css.text.accent, fontWeight: 700, margin: 0 }}>Rainfall: {d.rainfall}mm</p>
                              </div>
                            );
                          }}
                        />
                        <Area type="stepAfter" dataKey="rainfall" stroke="#2ECC71" fill="url(#rainGrad)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#2ECC71', stroke: isDark ? '#0d1f10' : '#fff', strokeWidth: 2 }} isAnimationActive={false} />
                        <Brush dataKey="time" height={26} stroke={isDark ? 'rgba(46,204,113,0.2)' : 'rgba(46,204,113,0.15)'} fill={isDark ? '#0d1f10' : '#F4F8F4'} travellerWidth={6} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <p style={{ color: textSecondary, fontSize: 14 }}>No data — waiting for sensor readings</p>
                    </div>
                  )}
                </div>
              </ChartCard>
            </div>

            {/* ── Sidebar (mirrors Mandi sidebar) ── */}
            <div style={{ ...css.card(isDark), padding: '20px', display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 20 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={16} color="#2ECC71" />
                <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: textPrimary }}>
                  Spotlight · Sensor
                </span>
              </div>

              {/* Stats list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  { label: 'Station ID',   value: 'WS01',                                         mono: true },
                  { label: 'Source',       value: 'Neon Serverless DB',                           accent: '#2ECC71' },
                  { label: 'Cache',        value: isCacheHit ? 'HIT · Memcached' : 'MISS · DB Query', accent: isCacheHit ? '#2ECC71' : '#F59E0B' },
                  { label: 'Updated',      value: lastRefresh || 'Pending' },
                  { label: 'Data Points',  value: String(historicalData.length || '0'),            mono: true },
                  { label: 'Solar',        value: systemHealth?.solarCharging ? 'Charging' : 'Off', accent: systemHealth?.solarCharging ? '#2ECC71' : textSecondary },
                  { label: 'Battery',      value: `${systemHealth?.batteryVoltage || '—'}V` },
                  { label: 'Sensor Node',  value: systemHealth?.sensorNodeOnline ? 'ONLINE' : 'OFFLINE', accent: systemHealth?.sensorNodeOnline ? '#2ECC71' : '#EF4444' },
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

              {/* Data quality bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: textSecondary }}>Signal Quality</span>
                  <span style={{ fontSize: 11, color: '#2ECC71', fontWeight: 700 }}>94%</span>
                </div>
                <div style={{ height: 5, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: '94%', height: '100%', background: '#2ECC71', borderRadius: 4 }} />
                </div>
              </div>

              {/* Live trend summary panel */}
              <div style={{
                background: isDark ? 'rgba(46,204,113,0.04)' : 'rgba(0,0,0,0.02)',
                border: `1px solid ${isDark ? 'rgba(46,204,113,0.12)' : 'rgba(0,0,0,0.05)'}`,
                borderRadius: 12, padding: 14,
              }}>
                <p style={{ fontSize: 10, color: textSecondary, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', margin: '0 0 12px' }}>
                  Live Trend Summary
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: 'Temperature', trend: tempTrend, unit: '°C', color: css.text.temp,  icon: <Thermometer size={13} /> },
                    { label: 'Humidity',    trend: humidTrend, unit: '%',  color: css.text.info,  icon: <Droplets size={13} /> },
                    { label: 'Rainfall',    trend: rainTrend,  unit: 'mm', color: css.text.accent, icon: <CloudRain size={13} /> },
                  ].map((item, i) => {
                    const dirColor = item.trend.direction === 'rising' ? css.text.danger : item.trend.direction === 'falling' ? css.text.info : css.text.accent;
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: item.color }}>{item.icon}</span>
                          <span style={{ fontSize: 12, color: textSecondary }}>{item.label}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: item.color, fontVariantNumeric: 'tabular-nums' }}>
                            {item.trend.avg}{item.unit}
                          </span>
                          <span style={{ fontSize: 10, color: dirColor, fontWeight: 700, marginLeft: 6 }}>
                            {item.trend.direction === 'rising' ? '▲' : item.trend.direction === 'falling' ? '▼' : '●'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Refresh countdown hint */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 12px', borderRadius: 10,
                background: isDark ? 'rgba(46,204,113,0.06)' : 'rgba(46,204,113,0.08)',
                border: `1px solid ${isDark ? 'rgba(46,204,113,0.12)' : 'rgba(46,204,113,0.15)'}`,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2ECC71', animation: 'trends-pulse 2s infinite' }} />
                <span style={{ fontSize: 11, color: textSecondary }}>Auto-refresh every 15s</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes trends-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes trends-marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        @keyframes trends-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}