import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from 'next-themes';
import { FarmBackground } from '@/components/FarmTheme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LanguageSelector } from '@/components/LanguageSelector';
import { ThemeToggle } from '@/components/ThemeToggle';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Cloud, Lock, User, AlertCircle } from 'lucide-react';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, sendOtp, hardwareConnected } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const getFriendlyError = (msg: string) => {
    if (msg.includes('invalid-phone-number')) return 'Invalid phone number. Use format: +91XXXXXXXXXX';
    if (msg.includes('too-many-requests')) return 'Too many attempts. Please wait a few minutes.';
    if (msg.includes('invalid-verification-code')) return 'Wrong OTP. Please check and try again.';
    if (msg.includes('code-expired')) return 'OTP has expired. Please request a new one.';
    return 'Something went wrong. Please try again.';
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      setError('Please enter a valid phone number with country code (e.g. +91XXXXXXXXXX)');
      return;
    }
    setError('');
    setIsLoading(true);

    const result = await sendOtp(phone);
    if (result.success) {
      setOtpSent(true);
      if (result.otp) {
        alert(`Your AgriHub Login OTP is: ${result.otp}`);
      }
    } else {
      setError(result.message || 'Failed to send OTP. Check the number format (+91XXXXXXXXXX) or try again.');
    }
    setIsLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const success = await login(phone, otp);

    if (success) {
      navigate(hardwareConnected ? '/dashboard' : '/hardware-setup');
    } else {
      setError(getFriendlyError('invalid-verification-code'));
    }

    setIsLoading(false);
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(/frames/ezgif-frame-284.jpg)',
          backgroundSize: '100% 100%',
          backgroundPosition: 'center',
          filter: 'brightness(0.7)'
        }}
      />

      {/* Top controls */}
      <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 50, display: 'flex', gap: '8px' }}>
        <ThemeToggle />
        <LanguageSelector />
      </div>

      {/* Centered Login Card */}
      <div style={{
        position: 'relative', zIndex: 10, minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}>
        <div style={{
          width: '100%', maxWidth: '420px',
          background: isDark ? 'rgba(15, 25, 15, 0.88)' : 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '18px',
          padding: '40px 36px',
          boxShadow: isDark
            ? '0 12px 48px rgba(0,0,0,0.35), 0 2px 12px rgba(0,0,0,0.2)'
            : '0 12px 48px rgba(0,0,0,0.15), 0 2px 12px rgba(0,0,0,0.08)',
          border: isDark ? '1px solid rgba(46,204,113,0.12)' : '1px solid rgba(255,255,255,0.6)',
          transition: 'all 0.4s ease',
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '56px', height: '56px', borderRadius: '16px',
              background: 'linear-gradient(135deg, #2ECC71, #1a9e52)',
              marginBottom: '16px',
              boxShadow: '0 4px 14px rgba(46,204,113,0.35)',
            }}>
              <Cloud style={{ color: 'white', width: '28px', height: '28px' }} />
            </div>
            <h1 style={{
              fontSize: '26px', fontWeight: 800,
              color: isDark ? '#A8D89A' : '#1B3A20',
              marginBottom: '6px',
              fontFamily: "'Fredoka One', 'Nunito', sans-serif",
              transition: 'color 0.4s ease',
            }}>
              {t('login_title')}
            </h1>
            <p style={{
              fontSize: '14px',
              color: isDark ? '#6A8A6A' : '#5A7A60',
              fontFamily: "'Nunito', sans-serif",
            }}>
              {t('system_subtitle')}
            </p>
          </div>

          {/* Form */}
          <form style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                fontSize: '13px', color: '#E53935',
                background: isDark ? 'rgba(229,57,53,0.1)' : 'rgba(211,47,47,0.08)',
                padding: '10px 14px', borderRadius: '10px',
              }}>
                <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Label htmlFor="phone" style={{ fontSize: '14px', fontWeight: 600, color: isDark ? '#A8D89A' : '#2D4A30' }}>
                {t('phone_number')}
              </Label>
              <div style={{ position: 'relative' }}>
                <User style={{
                  position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                  width: '16px', height: '16px', color: isDark ? '#5A7A5A' : '#8A9A8C',
                  pointerEvents: 'none', zIndex: 1,
                }} />
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91XXXXXXXXXX (with country code)"
                  disabled={otpSent}
                  required
                  style={{
                    width: '100%', paddingLeft: '38px', height: '44px', borderRadius: '10px',
                    border: isDark ? '1.5px solid rgba(46,204,113,0.2)' : '1.5px solid #D0DCD2',
                    background: isDark ? 'rgba(20,35,20,0.6)' : 'white',
                    fontSize: '14px', color: isDark ? '#C8E8C8' : '#1B3A20',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {otpSent && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Label htmlFor="otp" style={{ fontSize: '14px', fontWeight: 600, color: isDark ? '#A8D89A' : '#2D4A30' }}>
                  {t('otp_label')}
                </Label>
                <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                  <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="h-11 w-11 border-2 border-border" />
                      <InputOTPSlot index={1} className="h-11 w-11 border-2 border-border" />
                      <InputOTPSlot index={2} className="h-11 w-11 border-2 border-border" />
                      <InputOTPSlot index={3} className="h-11 w-11 border-2 border-border" />
                      <InputOTPSlot index={4} className="h-11 w-11 border-2 border-border" />
                      <InputOTPSlot index={5} className="h-11 w-11 border-2 border-border" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
            )}

            {!otpSent ? (
              <Button
                type="button" onClick={handleSendOtp} disabled={isLoading || !phone}
                style={{
                  width: '100%', height: '48px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #2ECC71, #1a9e52)',
                  color: 'white', fontSize: '15px', fontWeight: 700,
                  fontFamily: "'Nunito', sans-serif",
                  border: 'none', cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(46,204,113,0.35)',
                  marginTop: '4px',
                }}
              >
                {isLoading ? t('sending_otp') : t('send_otp')}
              </Button>
            ) : (
              <Button
                type="button" onClick={handleLogin} disabled={isLoading || !otp}
                style={{
                  width: '100%', height: '48px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #2ECC71, #1a9e52)',
                  color: 'white', fontSize: '15px', fontWeight: 700,
                  fontFamily: "'Nunito', sans-serif",
                  border: 'none', cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(46,204,113,0.35)',
                  marginTop: '4px',
                }}
              >
                {isLoading ? t('verifying') : t('login_securely')}
              </Button>
            )}

          </form>

          {/* Signup link */}
          <p style={{
            textAlign: 'center', fontSize: '13px',
            color: isDark ? '#5A7A5A' : '#5A7A60',
            marginTop: '20px', fontFamily: "'Nunito', sans-serif",
          }}>
            {t('no_account')}{' '}
            <Link to="/signup" style={{
              color: '#2ECC71', fontWeight: 700, textDecoration: 'underline',
            }}>
              {t('sign_up')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
