import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from 'next-themes';
import { LanguageSelector } from '@/components/LanguageSelector';
import { ThemeToggle } from '@/components/ThemeToggle';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { AlertCircle, ArrowRight, Leaf, RefreshCw, ShieldCheck } from 'lucide-react';
import { SkyViewLogo } from '@/components/SkyViewLogo';
import { PhoneInput } from '@/components/PhoneInput';

export default function Login() {
  const [phone, setPhone]     = useState('');
  const [dialCode, setDialCode] = useState('+91');
  const [otp, setOtp]         = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [demoOtp, setDemoOtp] = useState('');
  const [error, setError]     = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, sendOtp, hardwareConnected } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const fullPhone = () => {
    const num = phone.trim().replace(/[\s\-]/g, '');
    return `${dialCode}${num}`;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError('Please enter your phone number');
      return;
    }
    setError('');
    setIsLoading(true);
    const result = await sendOtp(fullPhone());
    if (result.success) {
      setOtpSent(true);
      if (result.otp) setDemoOtp(result.otp);
    } else {
      setError(result.message || 'Phone not registered. Please sign up first.');
    }
    setIsLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const success = await login(fullPhone(), otp);
    if (success) {
      navigate(hardwareConnected ? '/dashboard' : '/hardware-setup');
    } else {
      setError('Wrong OTP. Please try again.');
    }
    setIsLoading(false);
  };

  const cardBg    = isDark ? 'rgba(10,12,10,0.90)'  : 'rgba(255,255,255,0.94)';
  const cardBorder= isDark ? '1.5px solid rgba(16,185,129,0.18)' : '1.5px solid rgba(16,185,129,0.22)';
  const inputBg   = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const inputBorder=isDark ? '1.5px solid rgba(255,255,255,0.10)' : '1.5px solid rgba(15,23,42,0.12)';
  const textMain  = isDark ? '#f0fdf4' : '#0f172a';
  const textMuted = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(15,23,42,0.50)';

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Background */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'url(/frames/ezgif-frame-284.jpg)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        filter: isDark ? 'brightness(0.35) saturate(0.8)' : 'brightness(0.55) saturate(0.9)',
      }} />

      {/* Emerald gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: isDark
          ? 'radial-gradient(ellipse at 30% 60%, rgba(16,185,129,0.12) 0%, transparent 60%), radial-gradient(ellipse at 70% 20%, rgba(5,150,105,0.08) 0%, transparent 50%)'
          : 'radial-gradient(ellipse at 30% 60%, rgba(16,185,129,0.08) 0%, transparent 60%)',
      }} />

      {/* Top-right controls */}
      <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 100, display: 'flex', gap: '8px' }}>
        <ThemeToggle />
        <LanguageSelector />
      </div>

      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 10, width: '100%', maxWidth: '420px',
        margin: '24px',
        background: cardBg,
        backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
        borderRadius: '24px',
        border: cardBorder,
        boxShadow: isDark
          ? '0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(16,185,129,0.06), inset 0 1px 0 rgba(255,255,255,0.05)'
          : '0 24px 64px rgba(0,0,0,0.12), 0 0 0 1px rgba(16,185,129,0.08)',
        padding: '40px 36px 36px',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', marginBottom: '14px' }}>
            <SkyViewLogo size={52} isDark={isDark} showText={false} />
          </div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: textMain, letterSpacing: '-0.02em' }}>
            Welcome back
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13.5px', color: textMuted }}>
            Sign in to your SkyView account
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px',
            padding: '10px 14px', borderRadius: '12px', fontSize: '13px', color: '#f87171',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)',
          }}>
            <AlertCircle style={{ width: '15px', height: '15px', flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Phone input */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Phone Number
            </label>
            <PhoneInput
              value={phone}
              onChange={(num, code) => { setPhone(num); setDialCode(code); }}
              disabled={otpSent}
              isDark={isDark}
            />
          </div>

          {/* Demo OTP display */}
          {otpSent && demoOtp && (
            <div style={{
              padding: '12px 16px', borderRadius: '12px',
              background: 'rgba(16,185,129,0.08)',
              border: '1.5px solid rgba(16,185,129,0.25)',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <ShieldCheck style={{ width: '16px', height: '16px', color: '#10B981', flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Demo Mode — Your OTP
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '22px', fontWeight: 800, color: textMain, letterSpacing: '0.25em', fontFamily: 'monospace' }}>
                  {demoOtp}
                </p>
              </div>
            </div>
          )}

          {/* OTP slots */}
          {otpSent && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: textMuted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Enter OTP
              </label>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    {[0,1,2,3,4,5].map(i => (
                      <InputOTPSlot key={i} index={i} className="h-12 w-12 text-lg border-2 border-border rounded-xl" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
          )}

          {/* Action button */}
          {!otpSent ? (
            <button
              type="button" onClick={handleSendOtp} disabled={isLoading || !phone.trim()}
              style={{
                width: '100%', height: '48px', borderRadius: '12px',
                background: 'transparent',
                border: !phone.trim()
                  ? (isDark ? '1.5px solid rgba(255,255,255,0.12)' : '1.5px solid rgba(15,23,42,0.15)')
                  : '1.5px solid #10B981',
                color: !phone.trim() ? textMuted : '#10B981',
                fontSize: '14px', fontWeight: 700,
                cursor: !phone.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: 'none',
                transition: 'all 0.2s', marginTop: '4px',
              }}
            >
              {isLoading ? <><RefreshCw style={{ width: '15px', height: '15px', animation: 'spin 1s linear infinite' }} /> Sending OTP...</>
                         : <>{t('send_otp')} <ArrowRight style={{ width: '15px', height: '15px' }} /></>}
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              <button
                type="button" onClick={handleLogin} disabled={isLoading || otp.length < 6}
                style={{
                  width: '100%', height: '48px', borderRadius: '12px',
                  background: 'transparent',
                  border: otp.length < 6
                    ? (isDark ? '1.5px solid rgba(255,255,255,0.12)' : '1.5px solid rgba(15,23,42,0.15)')
                    : '1.5px solid #10B981',
                  color: otp.length < 6 ? textMuted : '#10B981',
                  fontSize: '14px', fontWeight: 700,
                  cursor: otp.length < 6 ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: 'none',
                  transition: 'all 0.2s',
                }}
              >
                {isLoading ? <><RefreshCw style={{ width: '15px', height: '15px', animation: 'spin 1s linear infinite' }} /> Verifying...</>
                           : <><ShieldCheck style={{ width: '15px', height: '15px' }} /> {t('login_securely')}</>}
              </button>
              <button
                type="button"
                onClick={() => { setOtpSent(false); setOtp(''); setDemoOtp(''); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                  fontSize: '12px', color: textMuted, textDecoration: 'underline',
                  textUnderlineOffset: '2px',
                }}
              >
                Change phone number
              </button>
            </div>
          )}
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
          <div style={{ flex: 1, height: '1px', background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
          <span style={{ fontSize: '12px', color: textMuted }}>New to SkyView?</span>
          <div style={{ flex: 1, height: '1px', background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
        </div>

        <Link to="/signup" style={{ textDecoration: 'none' }}>
          <div style={{
            width: '100%', height: '44px', borderRadius: '12px',
            border: isDark ? '1.5px solid rgba(16,185,129,0.25)' : '1.5px solid rgba(16,185,129,0.30)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            fontSize: '14px', fontWeight: 600,
            color: '#10B981', cursor: 'pointer',
            transition: 'all 0.2s',
            background: 'transparent',
            boxSizing: 'border-box',
          }}>
            <Leaf style={{ width: '14px', height: '14px' }} />
            Create farmer account
          </div>
        </Link>

        {/* Footer */}
        <p style={{ textAlign: 'center', margin: '16px 0 0', fontSize: '11px', color: textMuted }}>
          Powered by SkyView · FPGA AI Platform
        </p>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input::placeholder { color: ${textMuted}; }
      `}</style>
    </div>
  );
}
