// Hospital staff service (frontend) – wraps Hospital API endpoints
// Endpoints mounted in server/index.js:
//   /api/staff, /api/attendance, /api/hospital/staff-settings

export type UIStaff = {
  _id?: string;
  id?: string | number;
  name: string;
  position: string;
  phone?: string;
  email?: string;
  address?: string;
  status?: 'active' | 'inactive';
  salary?: number;
  joinDate?: string | Date;
  attendance?: any[];
};

// Basic attendance record shape used by StaffReport and API responses
export type AttendanceRecord = {
  _id?: string;
  staffId?: string;
  staffName?: string;
  date: string; // YYYY-MM-DD
  checkIn?: string; // ISO or HH:mm
  checkOut?: string; // ISO or HH:mm
  status?: 'present' | 'absent' | 'leave' | string;
  notes?: string;
};

const json = async (res: Response) => {
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

function getAuthHeaders() {
  const token = localStorage.getItem('token'); // hospital auth token
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(init.headers || {}),
    ...getAuthHeaders(),
  } as Record<string, string>;
  return fetch(input, { ...init, headers, credentials: 'include' });
}

// ----- Staff CRUD -----
export async function getStaff(): Promise<UIStaff[]> {
  const res = await authFetch('/api/staff');
  const data = await json(res);
  return Array.isArray(data) ? data : [];
}

export async function addStaff(payload: Partial<UIStaff>): Promise<any> {
  const res = await authFetch('/api/staff', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return json(res);
}

export async function updateStaff(id: string, payload: Partial<UIStaff>): Promise<any> {
  const res = await authFetch(`/api/staff/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return json(res);
}

export async function deleteStaff(id: string): Promise<any> {
  const res = await authFetch(`/api/staff/${id}`, { method: 'DELETE' });
  return json(res);
}

// ----- Attendance -----
export async function getDailyAttendance(date?: string): Promise<any[]> {
  const d = date || new Date().toISOString().split('T')[0];
  const res = await authFetch(`/api/attendance?date=${encodeURIComponent(d)}`);
  const data = await json(res);
  return Array.isArray(data) ? data : [];
}

// Paged: returns current page data and total count from X-Total-Count header
export async function getDailyAttendancePaged(date: string, page: number, limit: number): Promise<{ data: any[]; total: number; }> {
  const d = date || new Date().toISOString().split('T')[0];
  const url = `/api/attendance?date=${encodeURIComponent(d)}&page=${page}&limit=${limit}`;
  const res = await authFetch(url);
  if (!res.ok) throw new Error(await res.text());
  const total = parseInt(res.headers.get('X-Total-Count') || '0', 10);
  const data = await res.json();
  return { data: Array.isArray(data) ? data : [], total };
}

export async function getMonthlyAttendance(staffId: string, month: string): Promise<any[]> {
  const res = await authFetch(`/api/attendance/monthly?staffId=${encodeURIComponent(staffId)}&month=${encodeURIComponent(month)}`);
  const data = await json(res);
  return Array.isArray(data) ? data : [];
}

// Paged monthly attendance
export async function getMonthlyAttendancePaged(staffId: string, month: string, page: number, limit: number): Promise<{ data: any[]; total: number; }>{
  const url = `/api/attendance/monthly?staffId=${encodeURIComponent(staffId)}&month=${encodeURIComponent(month)}&page=${page}&limit=${limit}`;
  const res = await authFetch(url);
  if (!res.ok) throw new Error(await res.text());
  const total = parseInt(res.headers.get('X-Total-Count') || '0', 10);
  const data = await res.json();
  return { data: Array.isArray(data) ? data : [], total };
}

export async function addAttendance(payload: any): Promise<any> {
  const res = await authFetch('/api/attendance', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return json(res);
}

export async function clockIn(staffId: string): Promise<any> {
  const res = await authFetch('/api/attendance/clock-in', {
    method: 'POST',
    body: JSON.stringify({ staffId }),
  });
  return json(res);
}

export async function clockOut(staffId: string): Promise<any> {
  const res = await authFetch('/api/attendance/clock-out', {
    method: 'POST',
    body: JSON.stringify({ staffId }),
  });
  return json(res);
}

// ----- Settings (key/value) -----
export async function getAttendanceSettings(): Promise<any> {
  const res = await authFetch('/api/hospital/staff-settings/attendance');
  return json(res);
}

export async function saveAttendanceSettings(value: any): Promise<any> {
  const res = await authFetch('/api/hospital/staff-settings/attendance', {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });
  return json(res);
}
