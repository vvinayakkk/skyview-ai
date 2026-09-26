import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useAuth } from '@/contexts/AuthContext';
import {
  LogOut,
  LayoutDashboard,
  Database,
  Landmark,
  ShoppingBasket,
  TrendingUp,
  FileText,
  Bot,
  Rocket,
  BarChart3,
  Shuffle,
  Map,
  Cloud,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTheme } from 'next-themes';

interface DashboardHeaderProps {
  lastUpdateSeconds: number;
  sensorNodeOnline: boolean;
}

export function DashboardHeader({
  lastUpdateSeconds,
  sensorNodeOnline,
}: DashboardHeaderProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();

  const isDark = theme === 'dark';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      path: '/profile',
      label: 'Gov Schemes',
      icon: Landmark,
    },
    {
      path: '/marketplace',
      label: 'Marketplace',
      icon: Shuffle,
    },
    {
      path: '/map',
      label: 'Map',
      icon: Map,
    },
    {
      path: '/reports',
      label: 'Reports',
      icon: FileText,
    },
    {
      path: '/advisor',
      label: 'Farm Advisor',
      icon: Bot,
    },
    {
      path: '/accelerator',
      label: 'AI Accelerator',
      icon: Rocket,
    },
    {
      path: '/mandi',
      label: 'Mandi',
      icon: ShoppingBasket,
    },
    {
      path: '/trends',
      label: 'Trends',
      icon: TrendingUp,
    },
    {
      path: '/overview',
      label: 'System Overview',
      icon: BarChart3,
    },
  ];

  return (
    <div
      style={{
        position: 'sticky',
        top: '20px',
        zIndex: 50,
        padding: '0 24px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        maxWidth: '1480px',
        margin: '0 auto',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1400px',
          height: '64px',        // was 58px
          borderRadius: '18px',
          overflow: 'hidden',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          background: isDark ? 'rgba(10,10,10,0.92)' : 'rgba(255,255,255,0.95)',
          border: isDark
            ? '1.5px solid rgba(255,255,255,0.07)'
            : '1.5px solid rgba(15,23,42,0.10)',
          borderTop: isDark
            ? '2px solid rgba(16,185,129,0.40)'
            : '2px solid rgba(16,185,129,0.30)',
          boxShadow: isDark
            ? '0 8px 28px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.20)'
            : '0 8px 24px rgba(15,23,42,0.07), 0 2px 6px rgba(15,23,42,0.04)',
        }}
      >
        <div
          style={{
            height: '100%',
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <Cloud size={18} fill="#ffffff" strokeWidth={0} />
            </div>
            <span
              style={{
                fontSize: '15px',
                fontWeight: 800,
                color: isDark ? '#ffffff' : '#0f172a',
                letterSpacing: '-0.02em',
                whiteSpace: 'nowrap',
              }}
            >
              SkyView{' '}
              <span style={{ color: '#10B981', fontWeight: 800 }}>AI</span>
            </span>
          </Link>

          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flex: 1,
              minWidth: 0,
              overflowX: 'auto',
              scrollbarWidth: 'none',
            }}
          >
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const words = item.label.split(' ');

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '6px 14px',
                    borderRadius: '10px',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    fontSize: '12.5px',
                    lineHeight: '1.2',
                    fontWeight: isActive ? 700 : 600,
                    flexShrink: 0,
                    transition: 'all 0.25s ease',
                    textAlign: 'center',
                    color: isActive
                      ? isDark
                        ? '#ffffff'
                        : '#0f172a'
                      : isDark
                        ? 'rgba(255,255,255,0.55)'
                        : 'rgba(15,23,42,0.55)',
                    background: isActive
                      ? isDark
                        ? 'rgba(255,255,255,0.1)'
                        : '#ffffff'
                      : 'transparent',
                    boxShadow: isActive && !isDark
                      ? '0 2px 8px rgba(0,0,0,0.06)'
                      : 'none',
                    border: isActive
                      ? isDark
                        ? '1px solid rgba(255,255,255,0.08)'
                        : '1px solid rgba(0,0,0,0.04)'
                      : '1px solid transparent',
                  }}
                >
                  {words.map((word, wIdx) => (
                    <span key={wIdx} style={{ display: 'block' }}>{word}</span>
                  ))}
                </Link>
              );
            })}
          </nav>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  background: sensorNodeOnline
                    ? 'rgba(16,185,129,0.12)'
                    : 'rgba(239,68,68,0.12)',
                }}
              >
                <div
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: sensorNodeOnline ? '#10B981' : '#EF4444',
                  }}
                />

                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: sensorNodeOnline ? '#10B981' : '#EF4444',
                    textTransform: 'uppercase',
                  }}
                >
                  {sensorNodeOnline ? 'Active' : 'Offline'}
                </span>
              </div>

              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.4)',
                  whiteSpace: 'nowrap',
                }}
              >
                L-SYNC 0s
              </span>
            </div>

            <ThemeToggle />
            <LanguageSelector />

            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
              }}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut
                style={{
                  width: '15px',
                  height: '15px',
                }}
              />
            </Button>
          </div>
        </div>
      </div>

      <Link
        to="/db"
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          background: location.pathname === '/db'
            ? isDark ? 'rgba(16,185,129,0.18)' : 'rgba(16,185,129,0.12)'
            : isDark ? 'rgba(10,10,10,0.92)' : 'rgba(255,255,255,0.95)',
          border: location.pathname === '/db'
            ? '2px solid #10B981'
            : isDark ? '1.5px solid rgba(255,255,255,0.07)' : '1.5px solid rgba(15,23,42,0.10)',
          boxShadow: isDark
            ? '0 8px 28px rgba(0,0,0,0.35)'
            : '0 8px 24px rgba(15,23,42,0.07)',
          transition: 'all 0.25s ease',
          flexShrink: 0,
        }}
        title="Database Explorer"
        className="hover:scale-105"
      >
        <Database
          style={{
            width: '18px',
            height: '18px',
            color: location.pathname === '/db'
              ? '#10B981'
              : isDark ? 'rgba(255,255,255,0.70)' : 'rgba(15,23,42,0.70)',
          }}
        />
      </Link>
    </div>
  );
}