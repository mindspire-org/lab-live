// Utility functions for Staff management and attendance
// These are minimal implementations to unblock the frontend build.
// Replace the stubbed implementations with real API calls as needed.

export interface UIStaff {
  _id: string;
  name: string;
  position: string;
  phone?: string;
  email?: string;
  address?: string;
  salary?: number;
  joinDate?: string; // ISO date string
  status?: "active" | "inactive";
  // Optional attendance array if backend returns embedded attendance
  attendance?: AttendanceRecord[];
}

export interface AttendanceRecord {
  _id?: string;
  staffId: string;
  date: string; // ISO date string
  status: "present" | "absent" | "leave";
  checkInTime?: string;
  checkOutTime?: string;
  // aliases used by some UI components
  checkIn?: string;
  checkOut?: string;
}

export interface StaffLeaveRecord {
  _id?: string;
  staffId: string;
  date: string; // YYYY-MM-DD
  days: number;
  type?: string;
  reason?: string;
}

export interface StaffDeductionRecord {
  _id?: string;
  staffId: string;
  date: string; // YYYY-MM-DD
  amount: number;
  reason?: string;
}

export interface StaffSalaryRecord {
  _id?: string;
  staffId: string;
  month: string; // YYYY-MM
  amount: number;
  bonus?: number;
  status?: "pending" | "paid";
}

// Staff CRUD lives under /api/lab/staff
const STAFF_API = "/api/lab/staff";
// Attendance remains under /api/lab/attendance
const ATTENDANCE_API = "/api/lab/attendance";

// Helper to handle fetch with JSON
async function http<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      ...options.headers,
    },
    credentials: "include",
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    const err: any = new Error(text || res.statusText);
    err.status = res.status;
    try { err.body = JSON.parse(text); } catch (_) { err.body = text; }
    throw err;
  }
  return res.json();
}

// ---------------- Staff CRUD -----------------
export async function getStaff(): Promise<UIStaff[]> {
  try {
    return await http<UIStaff[]>(`${STAFF_API}`);
  } catch {
    // return empty list on failure so UI still works offline
    return [];
  }
}

export async function getStaffById(id: string): Promise<UIStaff | null> {
  try {
    return await http<UIStaff>(`${STAFF_API}/${id}`);
  } catch {
    return null;
  }
}

export async function addStaff(staff: Partial<UIStaff>): Promise<UIStaff> {
  return http<UIStaff>(`${STAFF_API}`, {
    method: "POST",
    body: JSON.stringify(staff),
  });
}

export async function updateStaff(id: string, staff: Partial<UIStaff>): Promise<UIStaff> {
  return http<UIStaff>(`${STAFF_API}/${id}`, {
    method: "PUT",
    body: JSON.stringify(staff),
  });
}

export async function deleteStaff(id: string): Promise<void> {
  await http<void>(`${STAFF_API}/${id}`, { method: "DELETE" });
}

// ---------------- Attendance -----------------
export async function getServerTime(): Promise<{ iso: string; date: string; time: string }> {
  return http<{ iso: string; date: string; time: string }>(`${ATTENDANCE_API}/server-time`);
}

export async function getDailyAttendance(date?: string): Promise<AttendanceRecord[]> {
  // default to server date (YYYY-MM-DD) if no date supplied
  const useDate = date ?? (await getServerTime()).date;
  try {
    return await http<AttendanceRecord[]>(`${ATTENDANCE_API}/attendance?date=${useDate}`);
  } catch {
    return [];
  }
}

export async function addAttendance(record: AttendanceRecord): Promise<AttendanceRecord> {
  return http<AttendanceRecord>(`${ATTENDANCE_API}/attendance`, {
    method: "POST",
    body: JSON.stringify(record),
  });
}

export async function clockIn(staffId: string): Promise<AttendanceRecord> {
  return http<AttendanceRecord>(`${ATTENDANCE_API}/attendance/check-in`, {
    method: "POST",
    body: JSON.stringify({ staffId }),
  });
}

export async function getAttendanceSettings(): Promise<any> {
  try {
    return await http<any>(`/api/lab/staff-settings/attendance`);
  } catch (err: any) {
    if (err.status === 404) return null;
    throw err;
  }
}

export async function saveAttendanceSettings(value: any): Promise<any> {
  return http<any>(`/api/lab/staff-settings/attendance`, {
    method: "PUT",
    body: JSON.stringify(value),
  });
}

export async function getMonthlyAttendance(staffId:string, month:string): Promise<AttendanceRecord[]> {
  return http<AttendanceRecord[]>(`${ATTENDANCE_API}/attendance/monthly?staffId=${staffId}&month=${month}`);
}

export async function clockOut(staffId: string): Promise<AttendanceRecord> {
  return http<AttendanceRecord>(`${ATTENDANCE_API}/attendance/check-out`, {
    method: "POST",
    body: JSON.stringify({ staffId }),
  });
}

// ---------------- Leaves / Deductions / Salaries -----------------
export async function getStaffLeaves(staffId: string): Promise<StaffLeaveRecord[]> {
  return http<StaffLeaveRecord[]>(`${STAFF_API}/${staffId}/leaves`);
}

export async function addStaffLeave(staffId: string, payload: Omit<StaffLeaveRecord, 'staffId' | '_id'>): Promise<StaffLeaveRecord> {
  return http<StaffLeaveRecord>(`${STAFF_API}/${staffId}/leaves`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteStaffLeave(staffId: string, leaveId: string): Promise<void> {
  await http<void>(`${STAFF_API}/${staffId}/leaves/${leaveId}`, { method: 'DELETE' });
}

export async function getStaffDeductions(staffId: string): Promise<StaffDeductionRecord[]> {
  return http<StaffDeductionRecord[]>(`${STAFF_API}/${staffId}/deductions`);
}

export async function addStaffDeduction(
  staffId: string,
  payload: Omit<StaffDeductionRecord, 'staffId' | '_id'>
): Promise<StaffDeductionRecord> {
  return http<StaffDeductionRecord>(`${STAFF_API}/${staffId}/deductions`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteStaffDeduction(staffId: string, deductionId: string): Promise<void> {
  await http<void>(`${STAFF_API}/${staffId}/deductions/${deductionId}`, { method: 'DELETE' });
}

export async function getStaffSalaries(staffId: string): Promise<StaffSalaryRecord[]> {
  return http<StaffSalaryRecord[]>(`${STAFF_API}/${staffId}/salaries`);
}

export async function addStaffSalary(
  staffId: string,
  payload: Omit<StaffSalaryRecord, 'staffId' | '_id'>
): Promise<StaffSalaryRecord> {
  return http<StaffSalaryRecord>(`${STAFF_API}/${staffId}/salaries`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateStaffSalary(
  staffId: string,
  salaryId: string,
  payload: Partial<Omit<StaffSalaryRecord, 'staffId' | '_id'>>
): Promise<StaffSalaryRecord> {
  return http<StaffSalaryRecord>(`${STAFF_API}/${staffId}/salaries/${salaryId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteStaffSalary(staffId: string, salaryId: string): Promise<void> {
  await http<void>(`${STAFF_API}/${staffId}/salaries/${salaryId}`, { method: 'DELETE' });
}
