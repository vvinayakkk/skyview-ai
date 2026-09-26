import { useTheme } from 'next-themes';
import { MapPin, Navigation, Globe, Radio } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

// Station location — Mumbai, India (matching MQTT simulator)
const STATION = {
    name: 'AgriSense WS01',
    lat: 19.0760,
    lng: 72.8777,
    location: 'Mumbai, Maharashtra, India',
    elevation: '14m',
    type: 'Field Deployment',
};

export function StationMapPanel() {
    const { theme } = useTheme();
    const { t } = useLanguage();
    const isDark = theme === 'dark';

    const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${STATION.lng - 0.03},${STATION.lat - 0.02},${STATION.lng + 0.03},${STATION.lat + 0.02}&layer=mapnik&marker=${STATION.lat},${STATION.lng}`;

    const cardBg = isDark ? 'rgba(20, 35, 20, 0.5)' : 'rgba(0,0,0,0.02)';
    const cardBorder = isDark ? '1px solid rgba(46,204,113,0.08)' : '1px solid rgba(200,220,200,0.3)';
    const labelColor = isDark ? '#6A8A6A' : '#8A9A8C';
    const valueColor = isDark ? '#C8E8C8' : '#1B3A20';

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
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                <div style={{
                    width: '4px', height: '22px', borderRadius: '4px',
                    background: 'linear-gradient(180deg, #2196F3, #1565C0)',
                }} />
                <div style={{
                    padding: '8px', borderRadius: '10px',
                    background: isDark ? 'rgba(33,150,243,0.1)' : 'rgba(33,150,243,0.08)',
                }}>
                    <MapPin style={{ width: '16px', height: '16px', color: '#2196F3' }} />
                </div>
                <h3 style={{
                    fontSize: '14px', fontWeight: 800, textTransform: 'uppercase',
                    letterSpacing: '1.5px',
                    color: isDark ? '#90CAF9' : '#1565C0',
                    fontFamily: "'Nunito', sans-serif",
                    margin: 0,
                }}>
                    {t('station_location')}
                </h3>
                <div style={{
                    marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '4px 10px', borderRadius: '20px',
                    background: 'rgba(46,204,113,0.12)',
                }}>
                    <div style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: '#2ECC71',
                        animation: 'pulse 2s infinite',
                    }} />
                    <span style={{ fontSize: '9px', fontWeight: 800, color: '#2ECC71', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        LIVE
                    </span>
                </div>
            </div>

            {/* Map */}
            <div style={{
                borderRadius: '14px', overflow: 'hidden',
                border: isDark ? '1px solid rgba(46,204,113,0.12)' : '1px solid rgba(200,220,200,0.4)',
                marginBottom: '16px',
                height: '200px',
                position: 'relative',
            }}>
                <iframe
                    src={mapUrl}
                    style={{
                        width: '100%', height: '100%', border: 'none',
                        filter: isDark ? 'invert(0.9) hue-rotate(180deg) brightness(0.95) contrast(1.1)' : 'none',
                    }}
                    title="Station Location"
                    loading="lazy"
                />
                {/* Overlay gradient at bottom */}
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: '40px',
                    background: `linear-gradient(transparent, ${isDark ? 'rgba(15,25,15,0.75)' : 'rgba(255,255,255,0.72)'})`,
                    pointerEvents: 'none',
                }} />
            </div>

            {/* Station Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: cardBg, borderRadius: '12px', padding: '12px', border: cardBorder }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <Navigation style={{ width: '12px', height: '12px', color: labelColor }} />
                        <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', color: labelColor }}>
                            {t('coordinates')}
                        </span>
                    </div>
                    <p style={{ fontSize: '13px', fontWeight: 800, color: valueColor, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                        {STATION.lat.toFixed(4)}°N
                    </p>
                    <p style={{ fontSize: '13px', fontWeight: 800, color: valueColor, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                        {STATION.lng.toFixed(4)}°E
                    </p>
                </div>

                <div style={{ background: cardBg, borderRadius: '12px', padding: '12px', border: cardBorder }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <Globe style={{ width: '12px', height: '12px', color: labelColor }} />
                        <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', color: labelColor }}>
                            {t('location')}
                        </span>
                    </div>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: valueColor, margin: 0, lineHeight: 1.4 }}>
                        {STATION.location}
                    </p>
                </div>

                <div style={{ background: cardBg, borderRadius: '12px', padding: '12px', border: cardBorder }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <MapPin style={{ width: '12px', height: '12px', color: labelColor }} />
                        <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', color: labelColor }}>
                            {t('elevation')}
                        </span>
                    </div>
                    <p style={{ fontSize: '16px', fontWeight: 900, color: valueColor, margin: 0 }}>
                        {STATION.elevation}
                    </p>
                </div>

                <div style={{ background: cardBg, borderRadius: '12px', padding: '12px', border: cardBorder }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <Radio style={{ width: '12px', height: '12px', color: labelColor }} />
                        <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', color: labelColor }}>
                            {t('deployment')}
                        </span>
                    </div>
                    <p style={{ fontSize: '13px', fontWeight: 800, color: '#2ECC71', margin: 0 }}>
                        {STATION.type}
                    </p>
                </div>
            </div>
        </div>
    );
}
