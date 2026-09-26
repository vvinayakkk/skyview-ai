import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { FarmBackground } from '@/components/FarmTheme';
import { Cpu, ShoppingCart, Wifi, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const DEVICE_ID = 'AGRISENSE-WS01';

export default function HardwareSetup() {
  const { connectHardware } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    // Simulate device pairing (1.5s)
    await new Promise(r => setTimeout(r, 1500));
    connectHardware(DEVICE_ID);
    setConnected(true);
    await new Promise(r => setTimeout(r, 800));
    navigate('/dashboard');
  };

  const textPrimary = isDark ? '#A8D89A' : '#1B3A20';
  const textSecondary = isDark ? '#6A8A6A' : '#5A7A60';
  const cardBg = isDark ? 'rgba(15, 25, 15, 0.82)' : 'rgba(255, 255, 255, 0.92)';
  const cardBorder = isDark ? '1px solid rgba(46,204,113,0.15)' : '1px solid rgba(200,230,200,0.5)';

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <FarmBackground />

      <div style={{
        position: 'relative', zIndex: 10, minHeight: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '24px',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ width: '100%', maxWidth: '760px' }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>

            <h1 style={{
              fontSize: '30px', fontWeight: 900,
              color: textPrimary,
              fontFamily: "'Nunito', sans-serif",
              marginBottom: '10px',
            }}>
              Connect Your Hardware
            </h1>
            <p style={{ fontSize: '15px', color: isDark ? '#A3B8A8' : '#2C3E30', maxWidth: '480px', margin: '0 auto', lineHeight: 1.6 }}>
              To access live sensor data and AI-powered farm intelligence, connect your AgriSense device or get one.
            </p>
          </div>

          {/* Two Option Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

            {/* Option 1: Connect Existing */}
            <motion.div
              whileHover={{ y: -4, boxShadow: '0 16px 40px rgba(46,204,113,0.2)' }}
              transition={{ duration: 0.2 }}
              style={{
                background: cardBg,
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                borderRadius: '20px',
                border: connected
                  ? '2px solid #2ECC71'
                  : isDark ? '1px solid rgba(46,204,113,0.2)' : '1px solid rgba(200,230,200,0.6)',
                padding: '32px 28px',
                boxShadow: isDark
                  ? '0 8px 32px rgba(0,0,0,0.3)'
                  : '0 8px 32px rgba(0,0,0,0.07)',
                cursor: connecting || connected ? 'default' : 'pointer',
                transition: 'border 0.3s',
              }}
              onClick={() => !connecting && !connected && handleConnect()}
            >
              <div style={{
                width: '52px', height: '52px', borderRadius: '14px',
                background: 'rgba(46,204,113,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '20px',
              }}>
                {connected
                  ? <CheckCircle2 style={{ width: '26px', height: '26px', color: '#2ECC71' }} />
                  : <Wifi style={{ width: '26px', height: '26px', color: '#2ECC71' }} />
                }
              </div>

              <h2 style={{ fontSize: '19px', fontWeight: 800, color: textPrimary, marginBottom: '10px', fontFamily: "'Nunito', sans-serif" }}>
                Connect Existing Device
              </h2>
              <p style={{ fontSize: '13px', color: textSecondary, lineHeight: 1.6, marginBottom: '24px' }}>
                Pair your <strong style={{ color: textPrimary }}>AgriSense WS01</strong> station to start streaming live weather, soil, and crop data directly to your dashboard.
              </p>

              {/* Device chip */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                background: isDark ? 'rgba(46,204,113,0.08)' : 'rgba(46,204,113,0.06)',
                borderRadius: '12px', padding: '12px 16px',
                border: '1px solid rgba(46,204,113,0.15)',
                marginBottom: '24px',
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2ECC71', boxShadow: '0 0 6px #2ECC71' }} />
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 800, color: '#2ECC71', margin: 0 }}>AgriSense WS01</p>
                  <p style={{ fontSize: '11px', color: textSecondary, margin: 0 }}>FPGA-Accelerated Weather Station</p>
                </div>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); !connecting && !connected && handleConnect(); }}
                disabled={connecting || connected}
                style={{
                  width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                  background: connected
                    ? 'rgba(46,204,113,0.15)'
                    : 'linear-gradient(135deg, #2ECC71, #1a9e52)',
                  color: connected ? '#2ECC71' : 'white',
                  fontSize: '14px', fontWeight: 800,
                  cursor: connecting || connected ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'all 0.3s',
                  boxShadow: connected ? 'none' : '0 4px 14px rgba(46,204,113,0.35)',
                }}
              >
                {connected ? (
                  <><CheckCircle2 style={{ width: '16px', height: '16px' }} /> Connected!</>
                ) : connecting ? (
                  <><Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} /> Connecting...</>
                ) : (
                  <><Wifi style={{ width: '16px', height: '16px' }} /> Connect Device</>
                )}
              </button>
            </motion.div>

            {/* Option 2: Buy Hardware */}
            <motion.div
              whileHover={{ y: -4, boxShadow: '0 16px 40px rgba(33,150,243,0.2)' }}
              transition={{ duration: 0.2 }}
              style={{
                background: cardBg,
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                borderRadius: '20px',
                border: isDark ? '1px solid rgba(33,150,243,0.2)' : '1px solid rgba(200,210,230,0.6)',
                padding: '32px 28px',
                boxShadow: isDark
                  ? '0 8px 32px rgba(0,0,0,0.3)'
                  : '0 8px 32px rgba(0,0,0,0.07)',
                cursor: 'pointer',
              }}
              onClick={() => navigate('/buy-hardware')}
            >
              <div style={{
                width: '52px', height: '52px', borderRadius: '14px',
                background: 'rgba(33,150,243,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '20px',
              }}>
                <ShoppingCart style={{ width: '26px', height: '26px', color: '#2196F3' }} />
              </div>

              <h2 style={{ fontSize: '19px', fontWeight: 800, color: textPrimary, marginBottom: '10px', fontFamily: "'Nunito', sans-serif" }}>
                Buy New Hardware
              </h2>
              <p style={{ fontSize: '13px', color: textSecondary, lineHeight: 1.6, marginBottom: '24px' }}>
                Don't have a device yet? Order the <strong style={{ color: textPrimary }}>AgriSense WS01</strong> — our FPGA-powered precision weather station built for modern farms.
              </p>

              {/* Feature chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '24px' }}>
                {['FPGA Accelerated', 'IoT + MQTT', '8 Sensors', 'AI Ready'].map(f => (
                  <span key={f} style={{
                    fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px',
                    background: 'rgba(33,150,243,0.08)',
                    color: '#2196F3',
                    border: '1px solid rgba(33,150,243,0.15)',
                  }}>{f}</span>
                ))}
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); navigate('/buy-hardware'); }}
                style={{
                  width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                  background: 'linear-gradient(135deg, #2196F3, #1565C0)',
                  color: 'white', fontSize: '14px', fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 4px 14px rgba(33,150,243,0.35)',
                }}
              >
                <ShoppingCart style={{ width: '16px', height: '16px' }} /> View Hardware
                <ArrowRight style={{ width: '14px', height: '14px' }} />
              </button>
            </motion.div>
          </div>

          <p style={{ textAlign: 'center', fontSize: '12px', color: textPrimary, marginTop: '24px' }}>
            You can change your hardware connection at any time from your profile settings.
          </p>
        </motion.div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
