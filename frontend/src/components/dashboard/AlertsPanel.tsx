import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from 'next-themes';
import { Alert } from '@/lib/weatherData';
import { AlertTriangle, Info, AlertCircle, Bell, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface AlertsPanelProps {
  alerts: Alert[];
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const alertIcons = {
    warning: AlertTriangle,
    critical: AlertCircle,
    info: Info,
  };

  const alertStyles = {
    warning: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    critical: 'text-destructive bg-destructive/10 border-destructive/20',
    info: 'text-primary bg-primary/10 border-primary/20',
  };

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
          <Bell style={{ width: '16px', height: '16px', color: '#2ECC71' }} />
        </div>
        <h3 style={{
          fontSize: '14px', fontWeight: 800, textTransform: 'uppercase',
          letterSpacing: '1.5px',
          color: isDark ? '#A8D89A' : '#5A7A60',
          fontFamily: "'Nunito', sans-serif",
        }}>
          {t('recent_alerts')}
        </h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {alerts.length === 0 ? (
          <div style={{ padding: '36px 0', textAlign: 'center' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%', margin: '0 auto 12px',
              background: isDark ? 'rgba(46,204,113,0.06)' : 'rgba(0,0,0,0.04)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bell style={{ width: '24px', height: '24px', color: isDark ? '#3A5A3A' : '#C0D0C0' }} />
            </div>
            <p style={{
              fontSize: '10px', fontWeight: 800, textTransform: 'uppercase',
              letterSpacing: '1.5px', color: isDark ? '#5A7A5A' : '#8A9A8C',
            }}>{t('no_alerts')}</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const Icon = alertIcons[alert.type];
            return (
              <div
                key={alert.id}
                className={cn(
                  'flex items-start gap-4 p-4 rounded-xl border transition-all',
                  alertStyles[alert.type]
                )}
              >
                <div className="p-2 rounded-lg bg-background/50">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-widest mb-1 opacity-70">
                    {alert.type}
                  </p>
                  <p className="text-sm font-bold text-foreground leading-snug">
                    {t(alert.messageKey)}
                  </p>
                  <p className="text-[10px] font-medium text-muted-foreground mt-2 flex items-center gap-1">
                    {formatDistanceToNow(alert.timestamp, { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Messaging note */}
      <div style={{
        marginTop: '18px', paddingTop: '18px',
        borderTop: isDark ? '1px solid rgba(46,204,113,0.08)' : '1px solid rgba(200,220,200,0.3)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '10px',
          background: isDark ? 'rgba(46,204,113,0.06)' : 'rgba(46,204,113,0.04)',
          borderRadius: '12px', padding: '14px',
          border: isDark ? '1px solid rgba(46,204,113,0.1)' : '1px solid rgba(46,204,113,0.08)',
        }}>
          <MessageSquare style={{ width: '16px', height: '16px', color: '#2ECC71', flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '12px', color: isDark ? '#7A9A7A' : '#8A9A8C', lineHeight: '1.5', fontWeight: 500 }}>
            {t('messaging_note')}
          </p>
        </div>
      </div>
    </div>
  );
}
