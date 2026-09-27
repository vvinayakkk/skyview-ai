import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from 'next-themes';
import { LanguageSelector } from '@/components/LanguageSelector';
import { ThemeToggle } from '@/components/ThemeToggle';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { SmartVoiceForm } from '@/components/SmartVoiceForm';
import { AlertCircle, Phone, MapPin, Leaf, RefreshCw, ShieldCheck, ArrowRight, User, Layers, Wheat, Mic } from 'lucide-react';
import { SkyViewLogo } from '@/components/SkyViewLogo';

export default function Signup() {
  const [name, setName]       = useState('');
  const [phone, setPhone]     = useState('');
  const [landSize, setLandSize] = useState('');
  const [location, setLocation] = useState('');
  const [crops, setCrops]     = useState('');
  const [otp, setOtp]         = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [demoOtp, setDemoOtp] = useState('');
  const [error, setError]     = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, sendOtp } = useAuth();
  const { t, language }   = useLanguage();
  const navigate           = useNavigate();
  const { theme }          = useTheme();
  const isDark             = theme === 'dark';

  const handleDataExtracted = (data: any) => {
    if (data.name) setName(data.name);
    if (data.phone) {
      const clean = data.phone.toString().replace(/[-\s()]/g, '').replace(/^\+?91/, '');
      setPhone(clean);
    }
    if (data.land_size_acres) setLandSize(data.land_size_acres.toString());
    if (data.location) setLocation(data.location);
    if (data.crops) setCrops(Array.isArray(data.crops) ? data.crops.join(', ') : data.crops);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) { setError('Name and phone are required.'); return; }
    const trimmedName = name.trim();
    if (trimmedName.length < 2) { setError('Please provide a valid name.'); return; }
    const phoneStr = phone.trim().replace(/[-\s()]/g, '').replace(/^\+?91/, '');
    if (!/^\d{10}$/.test(phoneStr)) { setError('Enter a valid 10-digit mobile number.'); return; }

    setError(''); setIsLoading(true);
    const fullPhone = `+91${phoneStr}`;
    const result = await sendOtp(fullPhone, true);
    if (result.success) {
      setOtpSent(true);
      if (result.otp) setDemoOtp(result.otp);
    } else {
      setError(result.message || 'Failed to send OTP.');
    }
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setIsLoading(true);
    const phoneStr = phone.trim().replace(/[-\s()]/g, '').replace(/^\+?91/, '');
    const fullPhone = `+91${phoneStr}`;

    try {
      try {
        await fetch(`${import.meta.env.VITE_API_URL || ''}/api/profile/save`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name, phone: fullPhone,
            land_size_acres: landSize ? Number(landSize) : null,
            location,
            crops: crops.split(',').map(c => c.trim()).filter(Boolean),
          }),
        });
      } catch { /* backend unavailable, continue */ }

      localStorage.setItem('user_name', name);
      if (landSize) localStorage.setItem('user_land_size', landSize);
      if (location) localStorage.setItem('user_location', location);
      if (crops)    localStorage.setItem('user_crops', crops);

      const success = await login(fullPhone, otp);
      if (success) {
        navigate('/hardware-setup');
      } else {
        setError('Wrong OTP. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setIsLoading(false);
  };

  const cardBg     = isDark ? 'rgba(10,12,10,0.90)'  : 'rgba(255,255,255,0.94)';
  const cardBorder = isDark ? '1.5px solid rgba(16,185,129,0.18)' : '1.5px solid rgba(16,185,129,0.22)';
  const inputBg    = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const inputBorder= isDark ? '1.5px solid rgba(255,255,255,0.10)' : '1.5px solid rgba(15,23,42,0.12)';
  const textMain   = isDark ? '#f0fdf4' : '#0f172a';
  const textMuted  = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(15,23,42,0.50)';
  const labelStyle = { display: 'block' as const, fontSize: '11px', fontWeight: 600 as const, color: textMuted, marginBottom: '5px', textTransform: 'uppercase' as const, letterSpacing: '0.06em' };
  const inputStyle = {
    width: '100%', height: '44px', borderRadius: '11px', border: inputBorder,
    background: inputBg, fontSize: '13.5px', color: textMain, outline: 'none',
    boxSizing: 'border-box' as const, fontFamily: 'inherit', padding: '0 14px 0 38px',
    transition: 'border 0.2s',
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Background */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'url(/frames/ezgif-frame-284.jpg)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        filter: isDark ? 'brightness(0.30) saturate(0.8)' : 'brightness(0.50) saturate(0.9)',
      }} />
      <div style={{
        position: 'fixed', inset: 0,
        background: isDark
          ? 'radial-gradient(ellipse at 20% 80%, rgba(16,185,129,0.12) 0%, transparent 55%)'
          : 'radial-gradient(ellipse at 20% 80%, rgba(16,185,129,0.07) 0%, transparent 55%)',
      }} />

      {/* Controls */}
      <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 100, display: 'flex', gap: '8px' }}>
        <ThemeToggle /><LanguageSelector />
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '32px 16px' }}>

        {/* Logo row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <SkyViewLogo size={38} isDark={isDark} showText={false} />
          <div>
            <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.08em' }}>SkyView Platform</p>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: isDark ? '#f0fdf4' : '#fff', letterSpacing: '-0.02em' }}>Create your account</h1>
          </div>
        </div>

        {/* Main card — two columns */}
        <div style={{
          width: '100%', maxWidth: '860px',
          background: cardBg, backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
          borderRadius: '24px', border: cardBorder,
          boxShadow: isDark
            ? '0 32px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)'
            : '0 24px 64px rgba(0,0,0,0.12)',
          padding: '36px',
          display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 1px minmax(0,1fr)', gap: '32px',
        }}>

          {/* LEFT — Voice setup */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Mic style={{ width: '15px', height: '15px', color: '#10B981' }} />
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Voice Setup</p>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: textMuted, lineHeight: 1.6 }}>
              Tap the mic and speak your name, phone, land size, location and crops — fields will auto-fill.
            </p>
            <SmartVoiceForm
              title=""
              description=""
              endpoint="/api/voice/process"
              onDataExtracted={handleDataExtracted}
              lang={language === 'en' ? 'en-IN' : `${language}-IN`}
            />
            {error && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 14px',
                borderRadius: '12px', fontSize: '13px', color: '#f87171',
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)',
              }}>
                <AlertCircle style={{ width: '15px', height: '15px', flexShrink: 0, marginTop: '1px' }} />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />

          {/* RIGHT — Manual form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <Leaf style={{ width: '15px', height: '15px', color: '#10B981' }} />
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Farmer Details</p>
            </div>

            <form style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Name & Phone row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Full Name *</label>
                  <div style={{ position: 'relative' }}>
                    <User style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#10B981' }} />
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Rajesh Kumar" disabled={otpSent} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Phone *</label>
                  <div style={{ position: 'relative' }}>
                    <Phone style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#10B981' }} />
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit mobile" disabled={otpSent} style={inputStyle} />
                  </div>
                </div>
              </div>

              {/* Land & Location row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Land Size (acres)</label>
                  <div style={{ position: 'relative' }}>
                    <Layers style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#10B981' }} />
                    <input type="text" value={landSize} onChange={e => setLandSize(e.target.value)} placeholder="e.g. 5.5" disabled={otpSent} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Location</label>
                  <div style={{ position: 'relative' }}>
                    <MapPin style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#10B981' }} />
                    <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="District, State" disabled={otpSent} style={inputStyle} />
                  </div>
                </div>
              </div>

              {/* Crops */}
              <div>
                <label style={labelStyle}>Crops Grown</label>
                <div style={{ position: 'relative' }}>
                  <Wheat style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#10B981' }} />
                  <input type="text" value={crops} onChange={e => setCrops(e.target.value)} placeholder="Wheat, Rice, Cotton..." disabled={otpSent} style={inputStyle} />
                </div>
              </div>

              {/* Demo OTP display */}
              {otpSent && demoOtp && (
                <div style={{
                  padding: '12px 16px', borderRadius: '12px',
                  background: 'rgba(16,185,129,0.08)', border: '1.5px solid rgba(16,185,129,0.25)',
                  display: 'flex', alignItems: 'center', gap: '12px',
                }}>
                  <ShieldCheck style={{ width: '18px', height: '18px', color: '#10B981', flexShrink: 0 }} />
                  <div>
                    <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Demo Mode — Your OTP
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '24px', fontWeight: 800, color: textMain, letterSpacing: '0.3em', fontFamily: 'monospace' }}>
                      {demoOtp}
                    </p>
                  </div>
                </div>
              )}

              {/* OTP Entry */}
              {otpSent && (
                <div>
                  <label style={labelStyle}>Enter OTP</label>
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
                    <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                      <InputOTPGroup>
                        {[0,1,2,3,4,5].map(i => (
                          <InputOTPSlot key={i} index={i} className="h-11 w-11 text-base border-2 border-border rounded-xl" />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>
              )}

              {/* Submit */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={otpSent ? handleSignup : handleSendOtp}
                  disabled={isLoading || (!otpSent && (!name.trim() || !phone.trim())) || (otpSent && otp.length < 6)}
                  style={{
                    width: '100%', height: '46px', borderRadius: '12px', border: 'none',
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    color: 'white', fontSize: '14px', fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    boxShadow: '0 4px 20px rgba(16,185,129,0.35)',
                    transition: 'all 0.2s', opacity: isLoading ? 0.8 : 1,
                  }}
                >
                  {isLoading
                    ? <><RefreshCw style={{ width: '15px', height: '15px', animation: 'spin 1s linear infinite' }} /> {otpSent ? 'Creating account...' : 'Sending OTP...'}</>
                    : otpSent
                      ? <><ShieldCheck style={{ width: '15px', height: '15px' }} /> Complete Registration</>
                      : <>{t('signup_send_code')} <ArrowRight style={{ width: '15px', height: '15px' }} /></>
                  }
                </button>
                {otpSent && (
                  <button type="button" onClick={() => { setOtpSent(false); setOtp(''); setDemoOtp(''); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: textMuted, textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                    Change details
                  </button>
                )}
              </div>
            </form>

            {/* Login link */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0 0' }}>
              <div style={{ flex: 1, height: '1px', background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
              <span style={{ fontSize: '12px', color: textMuted }}>Already have an account?</span>
              <div style={{ flex: 1, height: '1px', background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
            </div>
            <Link to="/login" style={{ textDecoration: 'none', marginTop: '10px', display: 'block' }}>
              <div style={{
                width: '100%', height: '42px', borderRadius: '11px',
                border: isDark ? '1.5px solid rgba(16,185,129,0.25)' : '1.5px solid rgba(16,185,129,0.30)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13.5px', fontWeight: 600, color: '#10B981', cursor: 'pointer',
                boxSizing: 'border-box',
              }}>
                Sign in instead
              </div>
            </Link>
          </div>
        </div>

        <p style={{ marginTop: '16px', fontSize: '11px', color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>
          Powered by SkyView · FPGA AI Platform for Indian Agriculture
        </p>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input::placeholder { opacity: 0.5; }
      `}</style>
    </div>
  );
}
