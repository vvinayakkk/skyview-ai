import React from 'react';
import { useTheme } from 'next-themes';


export function FarmBackground() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 0,
            overflow: 'hidden', pointerEvents: 'none',
        }}>
            <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: "url('/bg.png')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                transition: 'background 0.6s ease',
            }} />
            {/* Blurr and grayish tint overlay */}
            <div style={{
                position: 'absolute', inset: 0,
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)',
                backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.12)',
            }} />
        </div>
    );
}

export function GlassSection({ title, icon, children, noHeader, style }: {
    title?: string; icon?: React.ReactNode; children: React.ReactNode; noHeader?: boolean; style?: React.CSSProperties;
}) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <div style={{
            background: isDark ? 'rgba(20, 20, 25, 0.65)' : 'rgba(255, 255, 255, 0.55)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRadius: '24px',
            padding: noHeader ? '0' : '24px 32px',
            boxShadow: isDark
                ? '0 8px 32px rgba(0,0,0,0.3)'
                : '0 8px 32px rgba(0,0,0,0.06)',
            border: isDark
                ? '1px solid rgba(255,255,255,0.08)'
                : '1px solid rgba(255,255,255,0.6)',
            overflow: 'hidden',
            transition: 'all 0.4s ease',
            ...style
        }}>
            {!noHeader && title && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    marginBottom: '24px',
                }}>
                    {icon && <span style={{ fontSize: '20px' }}>{icon}</span>}
                    <h2 style={{
                        fontSize: '18px', fontWeight: 700,
                        color: isDark ? '#FFFFFF' : '#111827',
                        letterSpacing: '-0.3px',
                        transition: 'color 0.4s ease',
                    }}>
                        {title}
                    </h2>
                </div>
            )}
            {children}
        </div>
    );
}


export function GlassCard({ children, className }: {
    children: React.ReactNode; className?: string;
}) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <div
            style={{
                background: isDark ? '#2C2C2E' : '#F9FAFB',
                borderRadius: '16px',
                padding: '20px',
                border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.03)',
                boxShadow: isDark ? '0 2px 10px rgba(0,0,0,0.15)' : '0 2px 10px rgba(0,0,0,0.02)',
                transition: 'all 0.3s ease',
            }}
            className={className}
        >
            {children}
        </div>
    );
}
