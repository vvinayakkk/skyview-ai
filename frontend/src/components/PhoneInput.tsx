import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';

export interface Country {
  name: string;
  code: string;   // dial code e.g. "+91"
  iso: string;    // ISO-2 e.g. "IN"
  flag: string;   // emoji flag
}

export const COUNTRIES: Country[] = [
  { name: 'India', code: '+91', iso: 'IN', flag: '🇮🇳' },
  { name: 'United States', code: '+1', iso: 'US', flag: '🇺🇸' },
  { name: 'United Kingdom', code: '+44', iso: 'GB', flag: '🇬🇧' },
  { name: 'Australia', code: '+61', iso: 'AU', flag: '🇦🇺' },
  { name: 'Canada', code: '+1', iso: 'CA', flag: '🇨🇦' },
  { name: 'Germany', code: '+49', iso: 'DE', flag: '🇩🇪' },
  { name: 'France', code: '+33', iso: 'FR', flag: '🇫🇷' },
  { name: 'Japan', code: '+81', iso: 'JP', flag: '🇯🇵' },
  { name: 'China', code: '+86', iso: 'CN', flag: '🇨🇳' },
  { name: 'Brazil', code: '+55', iso: 'BR', flag: '🇧🇷' },
  { name: 'Russia', code: '+7', iso: 'RU', flag: '🇷🇺' },
  { name: 'South Africa', code: '+27', iso: 'ZA', flag: '🇿🇦' },
  { name: 'Nigeria', code: '+234', iso: 'NG', flag: '🇳🇬' },
  { name: 'Kenya', code: '+254', iso: 'KE', flag: '🇰🇪' },
  { name: 'Egypt', code: '+20', iso: 'EG', flag: '🇪🇬' },
  { name: 'Saudi Arabia', code: '+966', iso: 'SA', flag: '🇸🇦' },
  { name: 'UAE', code: '+971', iso: 'AE', flag: '🇦🇪' },
  { name: 'Singapore', code: '+65', iso: 'SG', flag: '🇸🇬' },
  { name: 'Malaysia', code: '+60', iso: 'MY', flag: '🇲🇾' },
  { name: 'Indonesia', code: '+62', iso: 'ID', flag: '🇮🇩' },
  { name: 'Philippines', code: '+63', iso: 'PH', flag: '🇵🇭' },
  { name: 'Thailand', code: '+66', iso: 'TH', flag: '🇹🇭' },
  { name: 'Vietnam', code: '+84', iso: 'VN', flag: '🇻🇳' },
  { name: 'Bangladesh', code: '+880', iso: 'BD', flag: '🇧🇩' },
  { name: 'Pakistan', code: '+92', iso: 'PK', flag: '🇵🇰' },
  { name: 'Sri Lanka', code: '+94', iso: 'LK', flag: '🇱🇰' },
  { name: 'Nepal', code: '+977', iso: 'NP', flag: '🇳🇵' },
  { name: 'Afghanistan', code: '+93', iso: 'AF', flag: '🇦🇫' },
  { name: 'Myanmar', code: '+95', iso: 'MM', flag: '🇲🇲' },
  { name: 'Mexico', code: '+52', iso: 'MX', flag: '🇲🇽' },
  { name: 'Argentina', code: '+54', iso: 'AR', flag: '🇦🇷' },
  { name: 'Colombia', code: '+57', iso: 'CO', flag: '🇨🇴' },
  { name: 'Chile', code: '+56', iso: 'CL', flag: '🇨🇱' },
  { name: 'Peru', code: '+51', iso: 'PE', flag: '🇵🇪' },
  { name: 'Italy', code: '+39', iso: 'IT', flag: '🇮🇹' },
  { name: 'Spain', code: '+34', iso: 'ES', flag: '🇪🇸' },
  { name: 'Portugal', code: '+351', iso: 'PT', flag: '🇵🇹' },
  { name: 'Netherlands', code: '+31', iso: 'NL', flag: '🇳🇱' },
  { name: 'Belgium', code: '+32', iso: 'BE', flag: '🇧🇪' },
  { name: 'Switzerland', code: '+41', iso: 'CH', flag: '🇨🇭' },
  { name: 'Sweden', code: '+46', iso: 'SE', flag: '🇸🇪' },
  { name: 'Norway', code: '+47', iso: 'NO', flag: '🇳🇴' },
  { name: 'Denmark', code: '+45', iso: 'DK', flag: '🇩🇰' },
  { name: 'Finland', code: '+358', iso: 'FI', flag: '🇫🇮' },
  { name: 'Poland', code: '+48', iso: 'PL', flag: '🇵🇱' },
  { name: 'Ukraine', code: '+380', iso: 'UA', flag: '🇺🇦' },
  { name: 'Turkey', code: '+90', iso: 'TR', flag: '🇹🇷' },
  { name: 'Iran', code: '+98', iso: 'IR', flag: '🇮🇷' },
  { name: 'Iraq', code: '+964', iso: 'IQ', flag: '🇮🇶' },
  { name: 'Israel', code: '+972', iso: 'IL', flag: '🇮🇱' },
  { name: 'Ethiopia', code: '+251', iso: 'ET', flag: '🇪🇹' },
  { name: 'Tanzania', code: '+255', iso: 'TZ', flag: '🇹🇿' },
  { name: 'Uganda', code: '+256', iso: 'UG', flag: '🇺🇬' },
  { name: 'Ghana', code: '+233', iso: 'GH', flag: '🇬🇭' },
  { name: 'Cameroon', code: '+237', iso: 'CM', flag: '🇨🇲' },
  { name: 'New Zealand', code: '+64', iso: 'NZ', flag: '🇳🇿' },
  { name: 'South Korea', code: '+82', iso: 'KR', flag: '🇰🇷' },
  { name: 'Taiwan', code: '+886', iso: 'TW', flag: '🇹🇼' },
  { name: 'Hong Kong', code: '+852', iso: 'HK', flag: '🇭🇰' },
  { name: 'Macau', code: '+853', iso: 'MO', flag: '🇲🇴' },
];

interface PhoneInputProps {
  readonly value: string;
  readonly onChange: (phone: string, dialCode: string) => void;
  readonly disabled?: boolean;
  readonly isDark: boolean;
}

function matchesCountry(c: Country, query: string): boolean {
  const q = query.toLowerCase();
  return c.name.toLowerCase().includes(q) || c.code.includes(q) || c.iso.toLowerCase().includes(q);
}

export function PhoneInput({ value, onChange, disabled, isDark }: PhoneInputProps) {
  const [selected, setSelected]   = useState<Country>(COUNTRIES[0]); // India default
  const [open, setOpen]           = useState(false);
  const [search, setSearch]       = useState('');
  const [number, setNumber]       = useState(value.replace(/^\+\d+\s?/, ''));
  const dropdownRef               = useRef<HTMLDivElement>(null);
  const searchRef                 = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = search.trim() ? COUNTRIES.filter(c => matchesCountry(c, search)) : COUNTRIES;

  const handleCountrySelect = (c: Country) => {
    setSelected(c);
    setOpen(false);
    setSearch('');
    onChange(number, c.code);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d\s-]/g, '');
    setNumber(raw);
    onChange(raw, selected.code);
  };

  const inputBorder = isDark ? '1.5px solid rgba(255,255,255,0.10)' : '1.5px solid rgba(15,23,42,0.12)';
  const inputBg     = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const textMain    = isDark ? '#f0fdf4' : '#0f172a';
  const textMuted   = isDark ? 'rgba(255,255,255,0.40)' : 'rgba(15,23,42,0.45)';
  const dropdownBg  = isDark ? 'rgba(12,18,12,0.97)' : 'rgba(255,255,255,0.98)';
  const hoverBg     = isDark ? 'rgba(16,185,129,0.10)' : 'rgba(16,185,129,0.07)';

  return (
    <div style={{ position: 'relative', display: 'flex', gap: '0' }} ref={dropdownRef}>
      {/* Country code selector button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          height: '46px', padding: '0 10px 0 12px',
          border: inputBorder, borderRight: 'none',
          borderRadius: '12px 0 0 12px',
          background: inputBg,
          cursor: disabled ? 'not-allowed' : 'pointer',
          flexShrink: 0, transition: 'border 0.2s',
          minWidth: '88px',
          boxSizing: 'border-box',
        }}
      >
        <span style={{ fontSize: '20px', lineHeight: 1 }}>{selected.flag}</span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: textMain }}>{selected.code}</span>
        <ChevronDown style={{
          width: '13px', height: '13px', color: textMuted,
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
        }} />
      </button>

      {/* Separator line */}
      <div style={{
        width: '1px', background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.12)',
        flexShrink: 0,
      }} />

      {/* Phone number input */}
      <input
        type="tel"
        value={number}
        onChange={handleNumberChange}
        disabled={disabled}
        placeholder="Phone number"
        style={{
          flex: 1, height: '46px', padding: '0 14px',
          border: inputBorder, borderLeft: 'none',
          borderRadius: '0 12px 12px 0',
          background: inputBg,
          fontSize: '14px', color: textMain, outline: 'none',
          fontFamily: 'inherit', boxSizing: 'border-box',
          transition: 'border 0.2s',
          opacity: disabled ? 0.6 : 1,
        }}
        onFocus={e => {
          e.target.style.borderColor = '#10B981';
          (e.target.previousElementSibling as HTMLElement | null)?.style && ((e.target.previousElementSibling as HTMLElement).style.background = 'rgba(16,185,129,0.15)');
        }}
        onBlur={e => {
          e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.12)';
        }}
      />

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 9999,
          width: '280px', maxHeight: '320px',
          background: dropdownBg,
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          border: isDark ? '1.5px solid rgba(16,185,129,0.20)' : '1.5px solid rgba(16,185,129,0.25)',
          borderRadius: '14px',
          boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.60)' : '0 20px 50px rgba(0,0,0,0.15)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Search bar */}
          <div style={{ padding: '10px 12px', borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', borderRadius: '9px', background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
              <Search style={{ width: '13px', height: '13px', color: textMuted, flexShrink: 0 }} />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search country..."
                style={{
                  border: 'none', background: 'transparent', outline: 'none',
                  fontSize: '13px', color: textMain, width: '100%', fontFamily: 'inherit',
                }}
              />
            </div>
          </div>

          {/* Country list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <p style={{ padding: '16px', textAlign: 'center', fontSize: '13px', color: textMuted }}>No results</p>
            ) : (
              filtered.map(c => (
                <button
                  key={c.iso + c.code}
                  type="button"
                  onClick={() => handleCountrySelect(c)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '9px 14px', border: 'none', background: selected.iso === c.iso ? hoverBg : 'transparent',
                    cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
                    boxSizing: 'border-box',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
                  onMouseLeave={e => (e.currentTarget.style.background = selected.iso === c.iso ? hoverBg : 'transparent')}
                >
                  <span style={{ fontSize: '18px', lineHeight: 1, flexShrink: 0 }}>{c.flag}</span>
                  <span style={{ fontSize: '13px', color: textMain, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                  <span style={{ fontSize: '12px', color: textMuted, fontWeight: 600, flexShrink: 0 }}>{c.code}</span>
                  {selected.iso === c.iso && (
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
