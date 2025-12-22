export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const attach = (token: string | null): RequestInit => {
    const headers = new Headers(init.headers as HeadersInit);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json');
    return { ...init, headers, credentials: 'include' };
  };

  let token = localStorage.getItem('token');
  let res = await fetch(input, attach(token));
  if (res.status !== 401) return res;

  // If unauthorized, clear token and retry once without it (in case endpoint doesn't require auth)
  localStorage.removeItem('token');
  res = await fetch(input, attach(null));
  return res;
}

export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  const h: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
  return h;
}
