import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MonthYearPicker } from "@/components/lab compoenents/ui/month-year-picker";
import type { UIStaff, AttendanceRecord, StaffLeaveRecord, StaffDeductionRecord } from "@/lab utils/staffService";
import {
  getMonthlyAttendance,
  getAttendanceSettings,
  getServerTime,
  getStaffLeaves,
  getStaffDeductions,
} from "@/lab utils/staffService";

interface StaffReportProps {
  isUrdu: boolean;
  staffList: UIStaff[];
  onClose: () => void;
  initialMonth?: string; // YYYY-MM; if provided, used as the initial selected month
  initialStaffId?: string; // if provided, preselect this staff
}

const StaffReport: React.FC<StaffReportProps> = ({ isUrdu, staffList, onClose, initialMonth, initialStaffId }) => {
  const t = (en: string, ur: string) => (isUrdu ? ur : en);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState<string>(() => initialMonth || new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [monthlyRows, setMonthlyRows] = useState<AttendanceRecord[]>([]);
  const [leaveRows, setLeaveRows] = useState<StaffLeaveRecord[]>([]);
  const [deductionRows, setDeductionRows] = useState<StaffDeductionRecord[]>([]);
  const [settings, setSettings] = useState<any>({ lateDeduction: 0, absentDeduction: 0, paidAbsentDays: 0, earlyOutDeduction: 0 });
  const [serverToday, setServerToday] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    // prioritize initialStaffId when provided
    if (initialStaffId) {
      setSelectedStaffId(initialStaffId);
      return;
    }
    if (!selectedStaffId && staffList.length > 0) {
      const first = staffList[0]?._id;
      if (first) setSelectedStaffId(first);
    }
  }, [staffList, selectedStaffId, initialStaffId]);

  useEffect(() => {
    getAttendanceSettings().then((s) => {
      if (s) setSettings(s);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    getServerTime()
      .then((st) => {
        const d = String(st.date || serverToday);
        setServerToday(d);
        if (!initialMonth) {
          const ym = d.slice(0, 7);
          if (/^\d{4}-\d{2}$/.test(ym)) setMonth(ym);
        }
      })
      .catch(() => {});
  }, [initialMonth]);

  const filteredStaff = useMemo(
    () => staffList.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())),
    [staffList, search]
  );

  const selected = useMemo(
    () => filteredStaff.find((s) => (s._id || "") === selectedStaffId) || staffList.find(s => (s._id||"")===selectedStaffId),
    [filteredStaff, staffList, selectedStaffId]
  );

  const joinMonth = useMemo(() => {
    const jd = (selected as any)?.joinDate;
    if (!jd) return "";
    const s = String(jd);
    const m = s.match(/^(\d{4}-\d{2})/);
    if (m) return m[1];
    const d = new Date(s);
    if (isNaN(d as any)) return "";
    const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  }, [selected]);

  const isBeforeJoinMonth = useMemo(() => {
    if (!joinMonth || !/^\d{4}-\d{2}$/.test(joinMonth) || !/^\d{4}-\d{2}$/.test(month)) return false;
    const [jy, jm] = joinMonth.split("-").map(Number);
    const [my, mm] = month.split("-").map(Number);
    return my * 12 + mm < jy * 12 + jm;
  }, [joinMonth, month]);

  const joinMonthLabel = useMemo(() => {
    if (!joinMonth) return "";
    return new Date(`${joinMonth}-01T00:00:00`).toLocaleString(undefined, { month: "long", year: "numeric" });
  }, [joinMonth]);

  // Fetch monthly attendance for selected staff and month
  useEffect(() => {
    if (!selectedStaffId) return;
    if (isBeforeJoinMonth) {
      setMonthlyRows([]);
      return;
    }
    getMonthlyAttendance(selectedStaffId, month)
      .then((rows) => setMonthlyRows(rows))
      .catch(() => setMonthlyRows([]));
  }, [selectedStaffId, month, isBeforeJoinMonth]);

  // Fetch leave rows (used to mark leave days; otherwise missing days are absent)
  useEffect(() => {
    if (!selectedStaffId) return;
    getStaffLeaves(selectedStaffId)
      .then((rows) => setLeaveRows(rows))
      .catch(() => setLeaveRows([]));
  }, [selectedStaffId]);

  useEffect(() => {
    if (!selectedStaffId) return;
    getStaffDeductions(selectedStaffId)
      .then((rows) => setDeductionRows(rows))
      .catch(() => setDeductionRows([]));
  }, [selectedStaffId]);

  // Backend-driven rows
  const rows = useMemo(() => {
    const base = (monthlyRows || []).filter((r: any) => String(r.date).startsWith(month));

    // Helper: stable YYYY-MM-DD without TZ shift
    const dateKey = (val: any) => {
      const s = String(val || "");
      const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
      if (m) return m[1];
      const d = new Date(s);
      if (isNaN(d as any)) return s.slice(0,10);
      const pad = (n:number)=> (n<10?`0${n}`:String(n));
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    };

    // Merge by day: combine checkIn/checkOut for the same date
    const byDay: Record<string, any> = {};
    for (const r of base as any[]) {
      const day = dateKey(r.date);
      const existing = byDay[day];
      if (!existing) {
        byDay[day] = { ...r, date: day };
      } else {
        byDay[day] = {
          ...existing,
          checkIn: existing.checkIn || existing.checkInTime || r.checkIn || r.checkInTime || null,
          checkInTime: existing.checkInTime || existing.checkIn || r.checkInTime || r.checkIn || null,
          checkOut: r.checkOut || r.checkOutTime || existing.checkOut || existing.checkOutTime || null,
          checkOutTime: r.checkOutTime || r.checkOut || existing.checkOutTime || existing.checkOut || null,
          status: (String(existing.status || '').toLowerCase() === 'present' || String(r.status || '').toLowerCase() === 'present') ? 'present' : (r.status || existing.status),
        };
      }
    }
    // Mark missing days: if a leave record exists for the day => leave; else absent
    const [yy, mm] = month.split("-").map(Number); // YYYY, MM
    const days = new Date(yy, mm, 0).getDate();
    const today = new Date(`${serverToday}T00:00:00`);
    const isCurrentMonth = today.getFullYear() === yy && (today.getMonth() + 1) === mm;
    const lastDay = isCurrentMonth ? Math.min(days, today.getDate()) : days;

    const leaveDays = new Set(
      (leaveRows || [])
        .filter((l: any) => String(l.date || '').startsWith(month))
        .map((l: any) => dateKey(l.date))
    );

    const officialDaysOff = Array.isArray((settings as any)?.officialDaysOff)
      ? ((settings as any).officialDaysOff as any[]).map((x) => Number(x)).filter((n) => Number.isFinite(n) && n >= 0 && n <= 6)
      : [];

    const weekdayFromISO = (iso: string) => {
      const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!m) return null;
      const y = parseInt(m[1], 10);
      const mo = parseInt(m[2], 10);
      const d = parseInt(m[3], 10);
      if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
      const dt = new Date(y, mo - 1, d);
      if (Number.isNaN(dt.getTime())) return null;
      return dt.getDay();
    };

    for (let d = 1; d <= lastDay; d++) {
      const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
      const dayISO = `${yy}-${pad(mm)}-${pad(d)}`; // local date, avoid TZ shift
      const weekday = weekdayFromISO(dayISO);
      const isOfficialOff = weekday != null && officialDaysOff.includes(weekday);

      // If there's already a record marked absent on an official off day,
      // normalize it to official_off so it doesn't count/deduct.
      if (byDay[dayISO]) {
        const existingStatus = String((byDay as any)[dayISO]?.status || '').toLowerCase();
        if (isOfficialOff && existingStatus === 'absent') {
          (byDay as any)[dayISO] = { ...(byDay as any)[dayISO], status: 'official_off' };
        }
        continue;
      }

      if (!byDay[dayISO]) {
        byDay[dayISO] = {
          staffId: selectedStaffId,
          date: dayISO,
          checkIn: null,
          checkOut: null,
          status: leaveDays.has(dayISO) ? "leave" : (isOfficialOff ? "official_off" : "absent"),
        };
      }
    }
    // Return sorted by date asc
    return Object.values(byDay).sort((a: any, b: any) => new Date(`${a.date}T00:00:00`).getTime() - new Date(`${b.date}T00:00:00`).getTime());
  }, [monthlyRows, leaveRows, selectedStaffId, month, serverToday, settings]);

  const exportCSV = () => {
    if (!selected) return;
    const header = "Date,Check In,Check Out,Status\n";
    const csvBody = rows
      .map((r: any) => {
        const date = new Date(`${r.date}T00:00:00`).toLocaleDateString();
        const cin = r.checkIn || r.checkInTime || "";
        const cout = r.checkOut || r.checkOutTime || "";
        const status = r.status || "";
        return `${date},${cin},${cout},${status}`;
      })
      .join("\n");
    const blob = new Blob([header + csvBody], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selected.name}_attendance.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const daysInMonth = useMemo(() => {
    const [yy, mm] = month.split("-").map(Number);
    const days = new Date(yy, mm, 0).getDate();
    const today = new Date(`${serverToday}T00:00:00`);
    const isCurrentMonth = today.getFullYear() === yy && (today.getMonth() + 1) === mm;
    return isCurrentMonth ? Math.min(days, today.getDate()) : days;
  }, [month, serverToday]);

  const stats = useMemo(() => {
    const lower = (s: any) => String(s || "").toLowerCase();
    // Treat late as present (worked day) for summary counts
    const present = rows.filter((r: any) => {
      const st = lower(r.status);
      return st === "present" || st === "late";
    }).length;
    const leave = rows.filter((r: any) => lower(r.status) === "leave").length;
    const late = rows.filter((r: any) => lower(r.status) === "late").length;
    const officialOff = rows.filter((r: any) => lower(r.status) === "official_off").length;
    const absent = rows.filter((r: any) => lower(r.status) === "absent").length;
    return { present, leave, late, absent, officialOff };
  }, [rows]);

  const basicSalary = Number(selected?.salary || 0);
  const perLate = Number(settings?.lateDeduction || 0);
  const lateDeduction = perLate * stats.late;
  const paidAbsentDays = Math.max(0, Number(settings?.paidAbsentDays || 0) || 0);
  const perAbsent = Math.max(0, Number(settings?.absentDeduction || 0) || 0);
  const paidLeavesUsed = Math.min(paidAbsentDays, stats.absent);
  const unpaidAbsents = Math.max(0, stats.absent - paidAbsentDays);
  const absentDeductionCalc = perAbsent * unpaidAbsents;
  const monthDeductionRows = useMemo(
    () => (deductionRows || []).filter((d: any) => String(d.date || '').startsWith(month)),
    [deductionRows, month]
  );

  const dbGrouped = useMemo(() => {
    const norm = (v: any) => String(v || '').trim().toLowerCase();
    let late = 0;
    let absent = 0;
    let manual = 0;
    for (const r of monthDeductionRows as any[]) {
      const amt = Number(r.amount) || 0;
      const reason = norm(r.reason);
      if (reason === 'late deduction') late += amt;
      else if (reason === 'absent deduction') absent += amt;
      else manual += amt;
    }
    return { late, absent, manual };
  }, [monthDeductionRows]);

  // Prefer backend (DB) deductions when present to avoid double counting.
  // Fallback to calculated values if backend doesn't have those entries.
  const lateDeductionEffective = dbGrouped.late > 0 ? dbGrouped.late : lateDeduction;
  const absentDeductionEffective = (() => {
    // Always respect paid absent days relief and official off days.
    // `stats.absent` already excludes `official_off`.
    if (unpaidAbsents <= 0) return 0;
    const calc = absentDeductionCalc;
    const db = dbGrouped.absent;
    // Only trust DB value if it matches the settings-based calculation.
    if (db > 0 && Math.abs(db - calc) < 0.01) return db;
    return calc;
  })();
  const totalDeductions = dbGrouped.manual + lateDeductionEffective + absentDeductionEffective;
  const netSalary = Math.max(0, basicSalary - totalDeductions);

  return (
    <Dialog open onOpenChange={onClose}>
        <DialogContent className="space-y-4 max-w-4xl max-h-[calc(100vh-120px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("Staff Report", "سٹاف رپورٹ")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="w-full sm:flex-1 flex gap-2">
            <Input
              placeholder={t("Search staff by name...", "نام سے عملہ تلاش کریں...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="min-w-[10rem]">
              <MonthYearPicker value={month} onChange={setMonth} />
            </div>
          </div>
          <div className="w-full sm:w-64">
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("Select staff", "عملہ منتخب کریں")} />
              </SelectTrigger>
              <SelectContent>
                {(filteredStaff.length ? filteredStaff : staffList).map((s) => (
                  <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV} disabled={!selected || isBeforeJoinMonth}>{t("Export", "برآمد کریں")}</Button>
            <Button onClick={onClose}>{t("Close", "بند کریں")}</Button>
          </div>
        </div>

        {selected ? (
          <div className="space-y-4">
            {/* Selected Staff banner */}
            <div className="rounded-md border bg-blue-50 p-3 text-sm">
              <div className="font-semibold">{selected.name}</div>
              <div className="text-gray-500 capitalize">{selected.position || "-"}</div>
            </div>

            <div className="text-sm font-medium">
              {t("Monthly Report", "ماہانہ رپورٹ")} - {new Date(`${month}-01T00:00:00`).toLocaleString(undefined, { month: "long", year: "numeric" })}
            </div>

            {isBeforeJoinMonth ? (
              <div className="rounded-md border bg-gray-50 p-6 text-center text-sm text-gray-700">
                <div className="font-medium">{t("No Data", "کوئی ڈیٹا نہیں")}</div>
                <div className="mt-1 text-gray-600">
                  {t(
                    `No Data. ${selected.name} joined in ${joinMonthLabel || joinMonth}.`,
                    `کوئی ڈیٹا نہیں۔ ${selected.name} کی شمولیت ${joinMonthLabel || joinMonth} میں ہوئی۔`
                  )}
                </div>
              </div>
            ) : (
              <>

            {/* Details and Attendance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-semibold mb-2">{t("Staff Details", "اسٹاف کی تفصیل")}</div>
                <div className="space-y-1">
                  <div><span className="font-medium">{t("Name", "نام")}:</span> {selected.name}</div>
                  <div><span className="font-medium">{t("Position", "عہدہ")}:</span> <span className="capitalize">{selected.position || "-"}</span></div>
                  <div><span className="font-medium">{t("Basic Salary", "بنیادی تنخواہ")}:</span> {(basicSalary).toLocaleString()} PKR</div>
                </div>
              </div>
              <div>
                <div className="font-semibold mb-2">{t("Attendance", "حاضری")}</div>
                <div className={paidAbsentDays > 0 ? "grid grid-cols-2 sm:grid-cols-5 gap-2" : "grid grid-cols-2 sm:grid-cols-4 gap-2"}>
                  <div className="rounded-md bg-green-50 p-3 text-center">
                    <div className="text-2xl font-bold text-green-700">{stats.present}</div>
                    <div className="text-xs text-gray-600">{t("Present", "حاضر")}</div>
                  </div>
                  <div className="rounded-md bg-red-50 p-3 text-center">
                    <div className="text-2xl font-bold text-red-700">{paidAbsentDays > 0 ? unpaidAbsents : stats.absent}</div>
                    <div className="text-xs text-gray-600">{paidAbsentDays > 0 ? t("Unpaid Absent", "غیر ادا شدہ غیر حاضری") : t("Absent", "غیر حاضر")}</div>
                  </div>
                  {Array.isArray((settings as any)?.officialDaysOff) && (settings as any).officialDaysOff.length > 0 ? (
                    <div className="rounded-md bg-slate-50 p-3 text-center">
                      <div className="text-2xl font-bold text-slate-700">{stats.officialOff}</div>
                      <div className="text-xs text-gray-600">{t("Official Off", "سرکاری چھٹی")}</div>
                    </div>
                  ) : null}
                  {paidAbsentDays > 0 ? (
                    <div className="rounded-md bg-emerald-50 p-3 text-center">
                      <div className="text-2xl font-bold text-emerald-700">{paidLeavesUsed}</div>
                      <div className="text-xs text-gray-600">{t("Paid Leaves", "ادا شدہ چھٹیاں")}</div>
                    </div>
                  ) : null}
                  <div className="rounded-md bg-yellow-50 p-3 text-center">
                    <div className="text-2xl font-bold text-yellow-700">{stats.late}</div>
                    <div className="text-xs text-gray-600">{t("Late Arrivals", "دیر سے آمد")}</div>
                  </div>
                  <div className="rounded-md bg-blue-50 p-3 text-center">
                    <div className="text-2xl font-bold text-blue-700">{daysInMonth}</div>
                    <div className="text-xs text-gray-600">{t("Working Days", "کاروباری دن")}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Salary Details */}
            <div>
              <div className="font-semibold mb-2">{t("Salary Details", "تنخواہ کی تفصیل")}</div>
              <div className="rounded-md border p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">{t("Basic Salary", "بنیادی تنخواہ")}</div>
                  <div className="text-lg font-medium">{basicSalary.toLocaleString()} PKR</div>
                  <div className="mt-3 text-gray-600">{t("Deductions", "کٹوتیاں")}:</div>
                  <div className="text-xs text-gray-500">{t("Late Arrivals", "دیر سے آمد")} ({stats.late}): <span className="text-red-600">-{lateDeductionEffective.toLocaleString()} PKR</span></div>
                  <div className="text-xs text-gray-500">{t("Absent", "غیر حاضر")} ({unpaidAbsents}): <span className="text-red-600">-{absentDeductionEffective.toLocaleString()} PKR</span></div>
                  <div className="mt-1 font-medium">{t("Total Deductions", "کل کٹوتیاں")}: <span className="text-red-600">-{totalDeductions.toLocaleString()} PKR</span></div>
                </div>
                <div className="md:col-span-2 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-gray-600 mb-1">{t("Net Salary (After Deductions)", "خالص تنخواہ (کٹوتیوں کے بعد)")}</div>
                    <div className="text-3xl font-extrabold text-green-600">{netSalary.toLocaleString()} PKR</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance Table */}
            <div className="overflow-x-auto">
              <table className="w-full border text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 border">{t("Date", "تاریخ")}</th>
                    <th className="p-2 border">{t("Check In", "آمد")}</th>
                    <th className="p-2 border">{t("Check Out", "رخصت")}</th>
                    <th className="p-2 border">{t("Status", "حیثیت")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((rec: any, idx: number) => (
                    <tr key={idx} className="odd:bg-white even:bg-gray-50">
                      <td className="p-2 border">
                        {(() => {
                          const d = new Date(`${rec.date}T00:00:00`);
                          const dateStr = d.toLocaleDateString();
                          const dayStr = d.toLocaleDateString(undefined, { weekday: "short" });
                          return `${dateStr} (${dayStr})`;
                        })()}
                      </td>
                      <td className="p-2 border">{rec.checkIn || rec.checkInTime || '-'}</td>
                      <td className="p-2 border">{rec.checkOut || rec.checkOutTime || '-'}</td>
                      <td className="p-2 border capitalize">{String(rec.status || '-').replace(/_/g, ' ')}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td className="p-4 text-center text-gray-500 border" colSpan={4}>{t("No records", "کوئی ریکارڈ نہیں")}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-sm text-gray-600">{t("Please select a staff member to view details.", "تفصیلات دیکھنے کے لیے عملہ منتخب کریں۔")}</div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StaffReport;
