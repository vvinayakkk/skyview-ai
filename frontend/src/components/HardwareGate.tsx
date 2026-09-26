import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { FarmBackground } from '@/components/FarmTheme';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Cpu, ArrowRight, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';

interface HardwareGateProps {
  children: React.ReactNode;
}

export function HardwareGate({ children }: HardwareGateProps) {
  const { hardwareConnected } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (hardwareConnected) {
    return <>{children}</>;
  }

  const textPrimary = isDark ? '#A8D89A' : '#1B3A20';
  const textSecondary = isDark ? '#6A8A6A' : '#5A7A60';

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <FarmBackground />
      <div style={{ position: 'relative', zIndex: 50 }}>
        <DashboardHeader lastUpdateSeconds={0} sensorNodeOnline={false} />
      </div>

      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 'calc(100vh - 72px)', padding: '32px 24px',
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            textAlign: 'center', maxWidth: '440px', width: '100%',
            background: isDark ? 'rgba(15, 25, 15, 0.88)' : 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            borderRadius: '24px',
            padding: '52px 40px',
            border: isDark ? '1px solid rgba(46,204,113,0.15)' : '1px solid rgba(200,230,200,0.6)',
            boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.35)' : '0 16px 48px rgba(0,0,0,0.1)',
          }}
        >
          {/* Icon */}
          <div style={{
            width: '80px', height: '80px', borderRadius: '22px',
            background: isDark ? 'rgba(46,204,113,0.08)' : 'rgba(46,204,113,0.06)',
            border: isDark ? '1.5px solid rgba(46,204,113,0.18)' : '1.5px solid rgba(46,204,113,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 28px',
          }}>
            <Cpu style={{ width: '40px', height: '40px', color: isDark ? '#3D6B3D' : '#A0BFA0' }} />
          </div>

          <h2 style={{
            fontSize: '24px', fontWeight: 900,
            color: textPrimary,
            fontFamily: "'Nunito', sans-serif",
            marginBottom: '14px',
          }}>
            Please Connect Hardware First
          </h2>

          <p style={{
            fontSize: '14px', color: textSecondary,
            lineHeight: 1.75, marginBottom: '36px',
          }}>
            This page streams live data from your <strong style={{ color: textPrimary }}>AgriSense WS01</strong> sensor station.
            Head to your Profile to connect your device, or purchase one if you don't have it yet.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => navigate('/profile')}
              style={{
                width: '100%', padding: '14px 20px',
                borderRadius: '14px', border: 'none',
                background: 'linear-gradient(135deg, #2ECC71, #1a9e52)',
                color: 'white', fontSize: '15px', fontWeight: 800,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: '0 4px 16px rgba(46,204,113,0.35)',
              }}
            >
              <Cpu style={{ width: '17px', height: '17px' }} />
              Connect Hardware from Profile
              <ArrowRight style={{ width: '15px', height: '15px', marginLeft: 'auto' }} />
            </button>

            <button
              onClick={() => navigate('/buy-hardware')}
              style={{
                width: '100%', padding: '12px 20px',
                borderRadius: '14px',
                border: isDark ? '1px solid rgba(33,150,243,0.25)' : '1px solid rgba(33,150,243,0.2)',
                background: isDark ? 'rgba(33,150,243,0.08)' : 'rgba(33,150,243,0.05)',
                color: '#2196F3', fontSize: '14px', fontWeight: 700,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              <ShoppingCart style={{ width: '15px', height: '15px' }} />
              Don't have one? Buy AgriSense WS01
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
