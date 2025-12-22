import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import axios from "axios";
import { API_URL } from "@/lib/api";
import { api } from "@/lib/api";

const normalizeRole = (role: string | null): string | null => {
  if (!role) return role;
  const r = String(role).trim().toLowerCase();
  if (r === 'labtech' || r === 'lab tech' || r === 'lab-technician' || r === 'lab technician') return 'lab-technician';
  if (r === 'receptionist') return 'receptionist';
  if (r === 'researcher') return 'researcher';
  return role;
};

interface AuthContextType {
  token: string | null;
  role: string | null;
  userName: string | null;
  userId: string | null;
  permissions: any[];
  loading: boolean;
  login: (username: string, password: string) => Promise<{ role: string | null; permissions: any[]; userId: string | null }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Bootstrap auth state from localStorage once
  useEffect(() => {
    const stored = localStorage.getItem("token");
    const storedRole = localStorage.getItem("role");
    const storedUserName = localStorage.getItem('userName');
    const storedUserId = localStorage.getItem('userId');
    const storedPerms = localStorage.getItem('permissions');
    if (stored) setToken(stored);
    if (storedRole) setRole(normalizeRole(storedRole));
    if (storedUserName) setUserName(storedUserName);
    if (storedUserId) setUserId(storedUserId);
    if (storedPerms) {
      try {
        const parsed = JSON.parse(storedPerms);
        if (Array.isArray(parsed)) setPermissions(parsed);
      } catch {}
    }
    setLoading(false);
  }, []);

  // Refresh profile (name/role) from DB whenever we have a token
  useEffect(() => {
    if (!token) return;

    let canceled = false;
    (async () => {
      try {
        const res = await api.get('/profile/me');
        const profile = (res as any)?.data?.profile;
        const fullName = profile && typeof profile.fullName === 'string' ? profile.fullName : null;
        const serverRole = profile && typeof profile.role === 'string' ? profile.role : null;

        if (canceled) return;

        if (fullName) {
          setUserName(fullName);
          localStorage.setItem('userName', fullName);
        }

        if (serverRole) {
          const normalized = normalizeRole(serverRole);
          setRole(normalized);
          localStorage.setItem('role', serverRole);
        }
      } catch {
        // Ignore profile refresh errors; header will fallback to stored values
      }
    })();

    return () => {
      canceled = true;
    };
  }, [token]);

  const login = async (username: string, password: string) => {
    const API_BASE = API_URL ? `${API_URL}/api/auth` : "/api/auth";
    const res = await axios.post(`${API_BASE}/login`, {
      emailOrPhone: username,
      password,
    });

    const { success, token: jwt, user } = res.data || {};
    if (!success || !jwt || !user) {
      throw new Error("Login failed");
    }

    // Only allow non-patient roles into this lab UI
    if (String(user.role || "").toLowerCase() === "patient") {
      throw new Error("Patient accounts cannot log in here");
    }

    localStorage.setItem("token", jwt);
    localStorage.setItem("role", user.role);
    localStorage.setItem('userName', String(user.name || ''));
    localStorage.setItem('userId', String(user.id || ''));
    localStorage.setItem('permissions', JSON.stringify(Array.isArray(user.permissions) ? user.permissions : []));
    setToken(jwt);
    setRole(normalizeRole(user.role));
    setUserName(String(user.name || ''));
    setUserId(String(user.id || ''));
    setPermissions(Array.isArray(user.permissions) ? user.permissions : []);

    return {
      role: normalizeRole(user.role),
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
      userId: String(user.id || ''),
    };
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
    localStorage.removeItem('permissions');
    setToken(null);
    setRole(null);
    setUserName(null);
    setUserId(null);
    setPermissions([]);
  };

  return (
    <AuthContext.Provider value={{ token, role, userName, userId, permissions, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
