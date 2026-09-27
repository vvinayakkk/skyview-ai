import React, { createContext, useContext, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { getSecureRandomInt } from '@/lib/secureRandom';

const API_URL = import.meta.env.VITE_API_URL || '';

interface AuthContextType {
  isAuthenticated: boolean;
  hardwareConnected: boolean;
  connectHardware: (deviceId: string) => void;
  disconnectHardware: () => void;
  sendOtp: (phone: string, isSignup?: boolean) => Promise<{ success: boolean; message?: string; otp?: string }>;
  login: (phone: string, otp: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getFast2SMSKeys(): string[] {
  const envVal = (import.meta.env.VITE_FAST2SMS_API_KEY || '').toString();
  return envVal.split(',').map((k: string) => k.trim()).filter(Boolean);
}

async function sendDirectFast2SMS(phone: string, otp: string): Promise<boolean> {
  const keys = getFast2SMSKeys();
  if (keys.length === 0) return false;
  const cleanDigits = phone.replace('+91', '').replace(/[\s-]/g, '');
  if (cleanDigits.length !== 10 || !/^\d+$/.test(cleanDigits)) return false;

  for (const key of keys) {
    try {
      const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(key)}&variables_values=${encodeURIComponent(otp)}&route=otp&numbers=${encodeURIComponent(cleanDigits)}`;
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        if (data.return === true) {
          return true;
        }
      }
    } catch {
      // Continue to next key in pool
    }
  }
  return false;
}

export function AuthProvider({ children }: { readonly children: React.ReactNode }) {
  const { setTheme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('weather_auth') === 'true';
  });
  const [hardwareConnected, setHardwareConnected] = useState(() => {
    return localStorage.getItem('hardware_connected') === 'true';
  });

  const connectHardware = useCallback((deviceId: string) => {
    setHardwareConnected(true);
    localStorage.setItem('hardware_connected', 'true');
    localStorage.setItem('hardware_device_id', deviceId);
  }, []);

  const disconnectHardware = useCallback(() => {
    setHardwareConnected(false);
    localStorage.removeItem('hardware_connected');
    localStorage.removeItem('hardware_device_id');
  }, []);

  const sendOtp = useCallback(async (phone: string, isSignup: boolean = false): Promise<{ success: boolean; message?: string; otp?: string }> => {
    try {
      const response = await fetch(`${API_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, is_signup: isSignup }),
      });
      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, message: data.detail || 'Failed to send OTP.' };
      }

      // If signup and backend live SMS wasn't confirmed, trigger client Fast2SMS failover pool
      if (isSignup && !data.sms_sent && data.otp) {
        await sendDirectFast2SMS(phone, data.otp);
      }
      
      return { success: data.status === "success", otp: data.otp };
    } catch {
      // Offline fallback for signup
      if (isSignup) {
        const fallbackOtp = getSecureRandomInt(100000, 999999).toString();
        localStorage.setItem(`saved_user_otp_${phone}`, fallbackOtp);
        await sendDirectFast2SMS(phone, fallbackOtp);
        return { success: true, otp: fallbackOtp };
      }
      return { success: false, message: 'Network error. Please try again.' };
    }
  }, []);

  const login = useCallback(async (phone: string, otp: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await response.json();
      
      if (data.status === "success" && data.token) {
        setIsAuthenticated(true);
        localStorage.setItem('weather_auth', 'true');
        localStorage.setItem('user_phone', phone);
        localStorage.setItem(`saved_user_otp_${phone}`, otp);
        setTheme('light');
        return true;
      }
      // Local fallback check
      const localOtp = localStorage.getItem(`saved_user_otp_${phone}`);
      if (localOtp && localOtp === otp) {
        setIsAuthenticated(true);
        localStorage.setItem('weather_auth', 'true');
        localStorage.setItem('user_phone', phone);
        setTheme('light');
        return true;
      }
      return false;
    } catch {
      const localOtp = localStorage.getItem(`saved_user_otp_${phone}`);
      if (localOtp && localOtp === otp) {
        setIsAuthenticated(true);
        localStorage.setItem('weather_auth', 'true');
        localStorage.setItem('user_phone', phone);
        setTheme('light');
        return true;
      }
      return false;
    }
  }, [setTheme]);

  const logout = useCallback(async () => {
    setIsAuthenticated(false);
    setHardwareConnected(false);
    localStorage.removeItem('weather_auth');
    localStorage.removeItem('user_phone');
    localStorage.removeItem('hardware_connected');
    localStorage.removeItem('hardware_device_id');
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, hardwareConnected, connectHardware, disconnectHardware, sendOtp, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}