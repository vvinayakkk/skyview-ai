import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from 'next-themes';
import { SystemHealth } from '@/lib/weatherData';
import {
  Battery, Sun, Radio, Server,
  CheckCircle2, AlertTriangle, XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SystemHealthPanelProps {
  health: SystemHealth;
}

export function SystemHealthPanel({ health }: SystemHealthPanelProps) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const batteryStatusConfig = {
    healthy: { icon: CheckCircle2, class: 'text-success', bg: 'bg-success/10', label: 'healthy' },
    low: { icon: AlertTriangle, class: 'text-amber-500', bg: 'bg-amber-500/10', label: 'low' },
    critical: { icon: XCircle, class: 'text-destructive', bg: 'bg-destructive/10', label: 'critical' },
  };

  const batteryConfig = batteryStatusConfig[health.batteryStatus];
  const BatteryStatusIcon = batteryConfig.icon;

  const cardBg = isDark ? 'rgba(20, 35, 20, 0.5)' : 'rgba(0,0,0,0.02)';
  const cardBorder = isDark ? '1px solid rgba(46,204,113,0.08)' : '1px solid rgba(200,220,200,0.3)';
  const labelColor = isDark ? '#6A8A6A' : undefined;
  const valueColor = isDark ? '#C8E8C8' : undefined;

  return (
    <div style={{
      background: isDark ? 'rgba(15, 25, 15, 0.75)' : 'rgba(255, 255, 255, 0.72)',
      backdropFilter: 'blur(18px)',
      WebkitBackdropFilter: 'blur(18px)',
      borderRadius: '18px',
      padding: '24px',
      boxShadow: isDark
        ? '0 8px 32px rgba(0,0,0,0.3), 0 1px 6px rgba(0,0,0,0.2)'
        : '0 8px 32px rgba(0,0,0,0.08), 0 1px 6px rgba(0,0,0,0.04)',
      border: isDark ? '1px solid rgba(46,204,113,0.12)' : '1px solid rgba(255,255,255,0.5)',
      transition: 'all 0.4s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
        <div style={{
          width: '4px', height: '22px', borderRadius: '4px',
          background: 'linear-gradient(180deg, #2ECC71, #1a9e52)',
        }} />
        <div style={{
          padding: '8px', borderRadius: '10px',
          background: isDark ? 'rgba(46,204,113,0.1)' : 'rgba(46,204,113,0.08)',
        }}>
          <Server style={{ width: '16px', height: '16px', color: '#2ECC71' }} />
        </div>
        <h3 style={{
          fontSize: '14px', fontWeight: 800, textTransform: 'uppercase',
          letterSpacing: '1.5px',
          color: isDark ? '#A8D89A' : '#5A7A60',
          fontFamily: "'Nunito', sans-serif",
        }}>
          {t('system_health')}
        </h3>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {/* Battery Voltage */}
        <div style={{ background: cardBg, borderRadius: '14px', padding: '14px', border: cardBorder }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <Battery style={{ width: '14px', height: '14px', color: labelColor || '#8A9A8C' }} />
            <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', color: labelColor || '#8A9A8C' }}>{t('battery_voltage')}</span>
          </div>
          <p style={{ fontSize: '20px', fontWeight: 900, color: valueColor, fontVariantNumeric: 'tabular-nums' }}>
            {health.batteryVoltage.toFixed(1)}<span style={{ fontSize: '11px', opacity: 0.5, marginLeft: '2px' }}>V</span>
          </p>
        </div>

        {/* Battery Status */}
        <div className={cn(batteryConfig.bg)} style={{ borderRadius: '14px', padding: '14px', border: cardBorder }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <BatteryStatusIcon className={cn('w-3.5 h-3.5', batteryConfig.class)} />
            <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', color: labelColor || '#8A9A8C' }}>{t('battery_status')}</span>
          </div>
          <p className={cn('font-black uppercase', batteryConfig.class)} style={{ fontSize: '16px' }}>
            {t(batteryConfig.label)}
          </p>
        </div>

        {/* Solar Charging */}
        <div style={{ background: cardBg, borderRadius: '14px', padding: '14px', border: cardBorder }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <Sun className={cn('w-3.5 h-3.5', health.solarCharging ? 'text-amber-500 animate-pulse' : '')} style={!health.solarCharging ? { color: labelColor || '#8A9A8C' } : {}} />
            <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', color: labelColor || '#8A9A8C' }}>{t('solar_charging')}</span>
          </div>
          <p className={cn('font-black uppercase', health.solarCharging ? 'text-amber-500' : '')} style={{ fontSize: '16px', color: !health.solarCharging ? (labelColor || '#8A9A8C') : undefined }}>
            {health.solarCharging ? t('active') : t('not_charging')}
          </p>
        </div>

      </div>

      {/* Edge System Status */}
      <div style={{
        marginTop: '18px', paddingTop: '18px',
        borderTop: isDark ? '1px solid rgba(46,204,113,0.08)' : '1px solid rgba(200,220,200,0.3)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: cardBg, borderRadius: '12px', padding: '12px 16px', border: cardBorder,
        }}>
          <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', color: labelColor || '#8A9A8C' }}>
            {t('edge_system')}
          </span>
          <span className={cn(health.edgeSystemRunning ? 'text-success' : 'text-destructive')}
            style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: health.edgeSystemRunning ? '#2ECC71' : '#E53935',
              animation: health.edgeSystemRunning ? 'pulse 2s infinite' : 'none',
            }} />
            {health.edgeSystemRunning ? t('running') : t('stopped')}
          </span>
        </div>
      </div>
    </div>
  );
}
