import React, { createContext, useContext, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
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
      
      return { success: data.status === "success", otp: data.otp };
    } catch (error: any) {
      console.error('Error sending OTP:', error);
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
        setTheme('light');
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
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