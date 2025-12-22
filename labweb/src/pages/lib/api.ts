// Lightweight API helpers for Corporate pages
// Location chosen to match imports like "../lib/api" from files in `src/pages/panel pages/`

const DEFAULT_API_BASE = ((): string => {
  try {
    const fromStorage = localStorage.getItem('API_BASE_URL');
    if (fromStorage) return fromStorage.replace(/\/$/, '');
  } catch {}
  // Packaged Electron (file://) -> local backend on 5002; otherwise same-origin.
  try {
    if (typeof window !== 'undefined' && window.location?.protocol === 'file:') {
      return 'http://127.0.0.1:5002';
    }
  } catch {}
  // Dev: keep empty to use same-origin proxy
  return '';
})();

function joinUrl(path: string): string {
  if (DEFAULT_API_BASE) {
    if (!path) return DEFAULT_API_BASE;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${DEFAULT_API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
  }
  // Same-origin
  if (!path) return '';
  return path.startsWith('/') ? path : `/${path}`;
}

async function handleResponse<T>(res: Response): Promise<T> {
  let data: any = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || res.statusText || 'Request failed';
    throw new Error(msg);
  }
  return data as T;
}

export async function apiGet<T = any>(path: string): Promise<T> {
  const res = await fetch(joinUrl(path), { method: 'GET' });
  return handleResponse<T>(res);
}

export async function apiPost<T = any>(path: string, body?: any): Promise<T> {
  const res = await fetch(joinUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

export async function apiPut<T = any>(path: string, body?: any): Promise<T> {
  const res = await fetch(joinUrl(path), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

export async function apiDelete<T = any>(path: string): Promise<T> {
  const res = await fetch(joinUrl(path), { method: 'DELETE' });
  return handleResponse<T>(res);
}

// Optional helper: set base URL at runtime if needed
export function setApiBase(url: string) {
  const cleaned = (url || '').replace(/\/$/, '');
  try { localStorage.setItem('API_BASE_URL', cleaned); } catch {}
  // Note: DEFAULT_API_BASE is computed once; runtime changes only affect joinUrl via localStorage next reload
}
