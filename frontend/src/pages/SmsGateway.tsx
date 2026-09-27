import { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Copy, Check, Radio, Trash2, Smartphone, Bell, BellOff, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface OtpItem {
  id: string;
  phone: string;
  masked_phone?: string;
  otp: string;
  purpose: string;
  sender: string;
  message: string;
  timestamp: string;
  status: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'https://brics-agrin-backend.onrender.com';

export default function SmsGateway() {
  const [messages, setMessages] = useState<OtpItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  const prevCountRef = useRef<number>(0);

  const fetchOtps = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/live-otps`, {
        cache: 'no-store',
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        const list: OtpItem[] = data.otps || [];
        setMessages(list);
        setLastCheck(new Date());

        // Play chime if new message arrived
        if (list.length > prevCountRef.current && prevCountRef.current > 0 && soundEnabled) {
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.35);
          } catch { /* audio context blocked or unready */ }
        }
        prevCountRef.current = list.length;
      }
    } catch {
      // Offline or network error
    }
  };

  useEffect(() => {
    fetchOtps();
    const interval = setInterval(fetchOtps, 1500);
    return () => clearInterval(interval);
  }, [soundEnabled]);

  const handleCopy = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClear = async () => {
    try {
      await fetch(`${API_URL}/api/auth/live-otps`, { method: 'DELETE' });
      setMessages([]);
      prevCountRef.current = 0;
    } catch {
      setMessages([]);
    }
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return 'Just now';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0d0a',
      color: '#e5e7eb',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Top Mobile Carrier Status Bar */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'rgba(10, 13, 10, 0.95)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(16, 185, 129, 0.20)',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#10B981',
          }}>
            <Smartphone size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#f3f4f6', letterSpacing: '-0.02em' }}>
                SkyView Carrier Stream
              </span>
              <span style={{
                fontSize: '10px', fontWeight: 700,
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#10B981', padding: '2px 6px', borderRadius: '4px',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}>
                5G VoLTE
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                backgroundColor: '#10B981',
                boxShadow: '0 0 8px #10B981',
                animation: 'pulse 1.5s infinite',
              }} />
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                Live Stream · {messages.length} SMS Received
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Mute Chime' : 'Enable Chime'}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              padding: '6px 8px',
              color: soundEnabled ? '#10B981' : '#9ca3af',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center',
            }}
          >
            {soundEnabled ? <Bell size={16} /> : <BellOff size={16} />}
          </button>
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              title="Clear Feed"
              style={{
                background: 'transparent',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '8px',
                padding: '6px 8px',
                color: '#ef4444',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center',
              }}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </header>

      {/* Main SMS Stream Area */}
      <main style={{ flex: 1, padding: '16px', maxWidth: '640px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {messages.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '60px 20px', textAlign: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '16px',
            border: '1px dashed rgba(255, 255, 255, 0.1)',
            marginTop: '20px',
          }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#10B981', marginBottom: '16px',
            }}>
              <Radio size={28} style={{ animation: 'spin 3s linear infinite' }} />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: 700, color: '#f3f4f6' }}>
              Listening for Dispatched OTPs...
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af', maxWidth: '320px', lineHeight: 1.5 }}>
              Trigger a verification code from <strong>Signup</strong> or <strong>Login</strong> on your laptop. The OTP will appear here instantly!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {messages.map((item, idx) => {
              const isNewest = idx === 0;
              return (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: isNewest ? 'rgba(16, 185, 129, 0.06)' : 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '16px',
                    border: isNewest ? '1.5px solid rgba(16, 185, 129, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: isNewest ? '0 8px 24px rgba(16, 185, 129, 0.15)' : 'none',
                    padding: '18px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Message Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '11px', fontWeight: 800,
                        backgroundColor: '#10B981', color: '#042f1a',
                        padding: '2px 8px', borderRadius: '6px',
                        letterSpacing: '0.04em',
                      }}>
                        {item.sender || 'VK-SKYVIEW'}
                      </span>
                      <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                        {formatTime(item.timestamp)}
                      </span>
                      {isNewest && (
                        <span style={{
                          fontSize: '10px', fontWeight: 700,
                          backgroundColor: 'rgba(16, 185, 129, 0.2)',
                          color: '#34d399', padding: '1px 6px', borderRadius: '4px',
                        }}>
                          NEW
                        </span>
                      )}
                    </div>
                    <span style={{
                      fontSize: '11px', fontWeight: 600,
                      color: item.purpose.includes('Signup') ? '#60a5fa' : '#34d399',
                    }}>
                      {item.purpose}
                    </span>
                  </div>

                  {/* Highlighted OTP Box */}
                  <div style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px',
                  }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Verification Code
                      </span>
                      <span style={{
                        fontSize: '28px', fontWeight: 800,
                        color: '#10B981', letterSpacing: '0.15em',
                        fontFamily: 'monospace',
                      }}>
                        {item.otp}
                      </span>
                    </div>

                    <button
                      onClick={() => handleCopy(item.id, item.otp)}
                      style={{
                        backgroundColor: copiedId === item.id ? '#10B981' : 'transparent',
                        border: '1.5px solid #10B981',
                        borderRadius: '8px',
                        color: copiedId === item.id ? '#042f1a' : '#10B981',
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '6px',
                        transition: 'all 0.2s',
                      }}
                    >
                      {copiedId === item.id ? (
                        <><Check size={14} /> Copied</>
                      ) : (
                        <><Copy size={14} /> Copy</>
                      )}
                    </button>
                  </div>

                  {/* Full Carrier SMS Payload */}
                  <p style={{
                    margin: 0,
                    fontSize: '12.5px',
                    color: '#d1d5db',
                    lineHeight: 1.5,
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    padding: '10px 12px',
                    borderRadius: '8px',
                  }}>
                    {item.message}
                  </p>

                  {/* Recipient & Status Footer */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginTop: '10px', fontSize: '11px', color: '#6b7280',
                  }}>
                    <span>Recipient: <strong style={{ color: '#9ca3af' }}>{item.masked_phone || item.phone}</strong></span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10B981' }}>
                      <ShieldCheck size={13} /> {item.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        padding: '14px',
        textAlign: 'center',
        fontSize: '11px',
        color: '#6b7280',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
      }}>
        SkyView Telecom Gateway · Auto-refreshes every 1.5s · {lastCheck.toLocaleTimeString()}
      </footer>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.2); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
