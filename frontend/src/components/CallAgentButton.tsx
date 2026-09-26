import { useState } from 'react';
import { useTheme } from 'next-themes';
import { Phone, X, PhoneCall } from 'lucide-react';

const SUPPORT_HOTLINE = '+1 (279) 759 9216';

export function CallAgentButton() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="fixed bottom-6 left-6 z-40">
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: isDark ? '#2A2A2A' : '#FFFFFF',
            borderRadius: '30px', 
            padding: '12px 20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '10px',
            transition: 'all 0.3s ease',
          }}
          title="Call Support Agent"
        >
          <Phone style={{ width: 18, height: 18, color: isDark ? '#FFF' : '#000' }} />
          <span style={{
            fontSize: '13px', fontWeight: 700, letterSpacing: '0.5px',
            color: isDark ? '#FFF' : '#000',
            textTransform: 'uppercase',
          }}>
            CALL AGENT
          </span>
        </button>
      </div>
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            width: '100%', maxWidth: '400px',
            borderRadius: '24px', overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            background: isDark ? '#1a2a1a' : '#fff',
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #E74C3C, #C0392B)',
              padding: '24px', color: 'white',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <PhoneCall style={{ width: 24, height: 24 }} />
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Call Support Agent</h2>
                  <p style={{ fontSize: '12px', opacity: 0.9, margin: 0 }}>AI farming assistant in your language</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.2)', border: 'none',
                  borderRadius: '8px', padding: '6px', cursor: 'pointer',
                }}
              >
                <X style={{ width: 18, height: 18, color: 'white' }} />
              </button>
            </div>

            <div style={{ padding: '28px 24px', textAlign: 'center' }}>
              <p style={{
                fontSize: '12px', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '1.5px', marginBottom: '12px',
                color: isDark ? '#6A8A6A' : '#5A7A60',
              }}>
                 Dial this number
              </p>

              <a
                href={`tel:${SUPPORT_HOTLINE.replace(/[^+\d]/g, '')}`}
                style={{
                  display: 'block',
                  fontSize: '30px', fontWeight: 900,
                  color: '#2ECC71', textDecoration: 'none',
                  fontFamily: "'Nunito', monospace",
                  letterSpacing: '1px', marginBottom: '16px',
                }}
              >
                {SUPPORT_HOTLINE}
              </a>

              <p style={{
                fontSize: '12px',
                color: isDark ? '#4A6A4A' : '#8A9A8C',
                lineHeight: '1.6',
              }}>
                Available 24/7 • AI-powered voice agent<br />
                Speaks Hindi, English & regional languages<br />
                Get help with mandi rates, weather, crop advice & more
              </p>
            </div>

            <div style={{
              padding: '12px 24px',
              background: isDark ? 'rgba(255,255,255,0.02)' : '#fafafa',
              borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
              textAlign: 'center',
            }}>
              <p style={{ fontSize: '11px', color: isDark ? '#4A6A4A' : '#999', margin: 0 }}>
                Standard call charges apply
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
