import axios from 'axios';

// Determine API base URL in different environments
// - Dev (Vite or Electron dev): use VITE_API_URL or default to same origin '/api'
// - Electron Prod (file://): default to http://127.0.0.1:5003
const fromEnv = (import.meta as any)?.env?.VITE_API_URL as string | undefined;
let resolvedBase = fromEnv && String(fromEnv).trim() ? String(fromEnv).trim() : '';

{
  // In packaged Electron (file://), talk to local backend on 5002.
  const isFileProtocol = typeof window !== 'undefined' && window.location?.protocol === 'file:';
  if (isFileProtocol) {
    resolvedBase = 'http://127.0.0.1:5002';
  } else {
    // In Vite dev (http/https), prefer same-origin '/api' via proxy.
    // This prevents split-brain where inventory hits localhost proxy but finance hits a different host from VITE_API_URL.
    try {
      if ((import.meta as any)?.env?.DEV) {
        resolvedBase = '';
      }
    } catch {}

    // If not dev and no explicit base provided, keep empty (same-origin).
    if (!resolvedBase) {
      resolvedBase = '';
    }
  }
}

export const API_URL = resolvedBase;

export const api = axios.create({
  baseURL: API_URL ? `${API_URL}/api` : '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT token automatically from localStorage
api.interceptors.request.use((config) => {
  try {
    const urlPath = (() => {
      // config.url can be absolute or relative; normalize to path part
      const u = String(config.url || '');
      try {
        if (u.startsWith('http')) return new URL(u).pathname;
      } catch {}
      return u.startsWith('/') ? u : `/${u}`;
    })();

    // Use finance_token for finance routes, but fall back to normal token when finance_token isn't present.
    const isFinance = urlPath.startsWith('/finance');
    const financeToken = isFinance ? localStorage.getItem('finance_token') : null;
    const token = financeToken || localStorage.getItem('token');

    if (token) {
      const headers = (config.headers ?? {}) as any;
      headers['Authorization'] = `Bearer ${token}`;
      config.headers = headers;
    } else {
      // Dev convenience headers only when no token at all
      const headers = (config.headers ?? {}) as any;
      if (!headers['x-user-id']) headers['x-user-id'] = 'dev-lab-user';
      if (!headers['x-user-role']) headers['x-user-role'] = 'labTech';
      config.headers = headers;
    }
  } catch {}
  return config;
});

// Generic helpers (optional)
export const get = <T = any>(url: string) => api.get<T>(url).then(res => res.data);
export const post = <T = any>(url: string, data: any) => api.post<T>(url, data).then(res => res.data);
export const put = <T = any>(url: string, data: any) => api.put<T>(url, data).then(res => res.data);
export const del = <T = any>(url: string) => api.delete<T>(url).then(res => res.data);

