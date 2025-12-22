import { API_URL } from '@/lib/api';

export type AuditEvent = {
  action: string; // e.g., 'login', 'logout', 'token.create', 'token.delete', 'doctor.create', 'doctor.update', 'doctor.delete'
  module?: string; // e.g., 'auth', 'tokens', 'doctors'
  details?: any; // arbitrary payload; will be JSON.stringified server-side
};

export async function postAudit(event: AuditEvent) {
  try {
    const token = localStorage.getItem('token') || '';
    await fetch(`${API_URL}/api/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...event, timestamp: new Date().toISOString() }),
    });
  } catch {}
}
