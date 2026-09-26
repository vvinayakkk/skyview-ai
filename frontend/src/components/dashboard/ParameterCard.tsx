import { ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from 'next-themes';
import { ParameterStatus } from '@/lib/weatherData';

interface ParameterCardProps {
  icon: ReactNode;
  labelKey: string;
  value: number | string;
  unit: string;
  status?: ParameterStatus;
  colorClass?: string;
}

const PRIMARY = '#10B981';

const STATUS_CONFIG: Record<ParameterStatus, { label: string; color: string; bg: string }> = {
  normal:   { label: 'Normal',   color: PRIMARY,    bg: 'rgba(16,185,129,0.12)' },
  elevated: { label: 'Elevated', color: '#F59E0B',  bg: 'rgba(245,158,11,0.12)' },
  critical: { label: 'Critical', color: '#EF4444',  bg: 'rgba(239,68,68,0.12)'  },
};

export function ParameterCard({
  icon,
  labelKey,
  value,
  unit,
  status = 'normal',
  colorClass = '',
}: ParameterCardProps) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.normal;

  return (
    <div
      style={{
        background: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
        borderRadius: '16px',
        padding: '14px 16px',
        border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.06)',
        boxShadow: isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.04)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        transition: 'box-shadow 0.2s',
        cursor: 'default',
      }}
      onMouseEnter={e => { if (!isDark) (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'; }}
      onMouseLeave={e => { if (!isDark) (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)'; }}
    >
      {/* Icon bubble */}
      <div style={{
        width: '42px',
        height: '42px',
        borderRadius: '12px',
        background: cfg.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: cfg.color,
      }}>
        {icon}
      </div>

      {/* Label + value */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0,
          fontSize: '11px',
          fontWeight: 600,
          color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {t(labelKey)}
        </p>
        <p style={{
          margin: '2px 0 0',
          fontSize: '22px',
          fontWeight: 700,
          color: isDark ? '#fff' : '#0f172a',
          letterSpacing: '-0.5px',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}>
          {value}
          <span style={{ fontSize: '13px', fontWeight: 500, color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)', marginLeft: '3px' }}>
            {unit}
          </span>
        </p>
      </div>

      {/* Status pill */}
      <span style={{
        flexShrink: 0,
        padding: '3px 9px',
        borderRadius: '20px',
        fontSize: '10px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.4px',
        color: cfg.color,
        background: cfg.bg,
        whiteSpace: 'nowrap',
      }}>
        {cfg.label}
      </span>
    </div>
  );
}