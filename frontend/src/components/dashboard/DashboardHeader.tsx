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
  Stethoscope,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTheme } from 'next-themes';
import { ultraCache } from '@/lib/ultraCache';
import { SkyViewLogo } from '@/components/SkyViewLogo';

interface DashboardHeaderProps {
  lastUpdateSeconds?: number;
  sensorNodeOnline?: boolean;
}

export function DashboardHeader({
  lastUpdateSeconds = 0,
  sensorNodeOnline = true,
}: DashboardHeaderProps = {}) {
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
      iconOnly: false,
    },
    {
      path: '/crop-doctor',
      label: 'Crop Doctor',
      shortLabel: 'Doctor',
      icon: Stethoscope,
      iconOnly: false,
    },
    {
      path: '/profile',
      label: 'Gov Schemes',
      shortLabel: 'Schemes',
      icon: Landmark,
      iconOnly: false,
    },
    {
      path: '/marketplace',
      label: 'Marketplace',
      shortLabel: 'Market',
      icon: Shuffle,
      iconOnly: false,
    },
    {
      path: '/map',
      label: 'Farmers Map',
      shortLabel: 'Map',
      icon: Map,
      iconOnly: false,
    },
    {
      path: '/reports',
      label: 'Reports',
      icon: FileText,
      iconOnly: false,
    },
    {
      path: '/advisor',
      label: 'Farm Advisor',
      shortLabel: 'Advisor',
      icon: Bot,
      iconOnly: false,
    },
    {
      path: '/accelerator',
      label: 'AI Accelerator',
      shortLabel: 'AI Accel',
      icon: Rocket,
      iconOnly: false,
    },
    {
      path: '/mandi',
      label: 'Mandi Rates',
      icon: ShoppingBasket,
      iconOnly: true,
    },
    {
      path: '/trends',
      label: 'Market Trends',
      icon: TrendingUp,
      iconOnly: true,
    },
    {
      path: '/overview',
      label: 'System Overview',
      icon: BarChart3,
      iconOnly: true,
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
          height: '56px',
          borderRadius: '16px',
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
            gap: '8px',
          }}
        >
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            <SkyViewLogo size={32} showText={true} isDark={isDark} />
          </Link>

          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              flex: 1,
              minWidth: 0,
              overflowX: 'auto',
              scrollbarWidth: 'none',
            }}
          >
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={item.label}
                  onMouseEnter={() => ultraCache.prewarmRoute(item.path)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: item.iconOnly ? '7px 9px' : '6px 11px',
                    borderRadius: '10px',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    fontSize: '12px',
                    lineHeight: '1',
                    fontWeight: isActive ? 700 : 500,
                    flexShrink: 0,
                    transition: 'all 0.2s ease',
                    textAlign: 'center',
                    color: isActive
                      ? '#10B981'
                      : isDark
                        ? 'rgba(255,255,255,0.70)'
                        : 'rgba(15,23,42,0.70)',
                    background: 'transparent',
                    boxShadow: 'none',
                    border: isActive
                      ? '1.5px solid #10B981'
                      : '1.5px solid transparent',
                  }}
                >
                  <Icon
                    size={item.iconOnly ? 16 : 13.5}
                    style={{
                      color: isActive ? '#10B981' : 'currentColor',
                      flexShrink: 0,
                    }}
                  />
                  {!item.iconOnly && (
                    <span>{item.shortLabel || item.label}</span>
                  )}
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
                  background: 'transparent',
                  border: sensorNodeOnline ? '1.5px solid #10B981' : '1.5px solid #EF4444',
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
                L-SYNC {lastUpdateSeconds}s
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
                background: 'transparent',
                border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(15,23,42,0.12)',
              }}
              className="text-muted-foreground hover:text-destructive"
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
        onMouseEnter={() => ultraCache.prewarmRoute('/db')}
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          background: 'transparent',
          border: location.pathname === '/db'
            ? '2px solid #10B981'
            : isDark ? '1.5px solid rgba(255,255,255,0.15)' : '1.5px solid rgba(15,23,42,0.15)',
          boxShadow: 'none',
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