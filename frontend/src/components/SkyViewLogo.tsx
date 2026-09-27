import React from 'react';

interface SkyViewLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
  isDark?: boolean;
}

export function SkyViewLogo({
  size = 32,
  showText = false,
  className = '',
  isDark = false,
}: SkyViewLogoProps) {
  return (
    <div
      className={`inline-flex items-center gap-2.5 ${className}`}
      style={{ textDecoration: 'none' }}
    >
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: `${Math.round(size * 0.28)}px`,
          background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.95)',
          border: isDark
            ? '1px solid rgba(255, 255, 255, 0.15)'
            : '1px solid rgba(16, 185, 129, 0.25)',
          boxShadow: isDark
            ? '0 2px 10px rgba(0, 0, 0, 0.35)'
            : '0 2px 10px rgba(16, 185, 129, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2px',
          overflow: 'hidden',
          flexShrink: 0,
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
      >
        <img
          src="/skyview-emblem.png"
          alt="SkyView AI Logo"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))',
          }}
        />
      </div>

      {showText && (
        <span
          style={{
            fontSize: `${Math.max(14, Math.round(size * 0.44))}px`,
            fontWeight: 800,
            color: isDark ? '#ffffff' : '#0f172a',
            letterSpacing: '-0.02em',
            whiteSpace: 'nowrap',
            lineHeight: 1,
          }}
        >
          SkyView{' '}
          <span style={{ color: '#10B981', fontWeight: 800 }}>AI</span>
        </span>
      )}
    </div>
  );
}
