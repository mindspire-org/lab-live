
import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_URL } from '@/lib/api';
import { postAudit } from '@/lib/audit';

interface User {
  id: string;
  name: string;
  role: 'admin' | 'receptionist' | 'doctor' | 'patient';
  username: string;
}

interface BackendLoginResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  message?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Authentication now relies on the shared labTech-backend auth API (/api/auth/login).

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // On mount, clear any stale user but leave token/role handling to the backend-compatible flow.
  useEffect(() => {
    setUser(null);
    localStorage.removeItem('currentUser');
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      // Use labTech-backend auth endpoint
      const API_BASE = API_URL ? `${API_URL}/api/auth` : '/api/auth';
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Backend expects emailOrPhone + password; here we treat username as email/phone identifier
        body: JSON.stringify({ emailOrPhone: username, password }),
      });

      if (!res.ok) {
        return false;
      }

      const data: BackendLoginResponse = await res.json();

      if (!data.success || !data.token || !data.user) {
        return false;
      }

      // Only allow admin (and optionally staff) into this labweb UI; reject pure patients
      const role = String(data.user.role || '').toLowerCase();
      if (role !== 'admin') {
        return false;
      }

      // Persist JWT token and role for axios/api interceptors
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.user.role);

      const mappedUser: User = {
        id: data.user.id,
        name: data.user.name,
        role: data.user.role as any,
        username: data.user.email,
      };

      setUser(mappedUser);
      localStorage.setItem('currentUser', JSON.stringify(mappedUser));
      try { await postAudit({ action: 'login', module: 'auth', details: { username } }); } catch {}
      return true;
    } catch (err) {
      console.error('Login error', err);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    try { postAudit({ action: 'logout', module: 'auth' }); } catch {}
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
