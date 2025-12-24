import React, { useState, useEffect } from 'react';
import { getDailyAttendance } from '@/lab utils/staffService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Plus, 
  Clock, 
  User,
  Download,
  RefreshCw,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Trash2,
  Eye,
  FileText,
  Calendar as CalendarIcon
} from 'lucide-react';
import { MonthYearPicker } from '@/components/lab compoenents/ui/month-year-picker';
import type { UIStaff } from '@/lab utils/staffService';
import ConfirmStaffDeleteDialog from './ConfirmStaffDeleteDialog';
import {
  getStaff as fetchStaff,
  getStaffById,
  addStaff as apiAddStaff,
  updateStaff as apiUpdateStaff,
  deleteStaff as apiDeleteStaff,
  clockIn as apiClockIn,
  clockOut as apiClockOut,
  getMonthlyAttendance,
  getAttendanceSettings,
  saveAttendanceSettings,
  addAttendance as apiAddAttendance,
  getServerTime,
  getStaffLeaves,
  addStaffLeave,
  deleteStaffLeave,
  getStaffDeductions,
  addStaffDeduction,
  deleteStaffDeduction,
  getStaffSalaries,
  addStaffSalary,
  deleteStaffSalary,
} from '@/lab utils/staffService';
import AttendanceForm from './AttendanceForm';
import StaffForm from './StaffForm';
import StaffReport from './StaffReport';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';

function getModulePermission(moduleName: string): { view: boolean; edit: boolean; delete: boolean } {
  try {
    const roleRaw = typeof window !== 'undefined' ? window.localStorage.getItem('role') : null;
    const role = String(roleRaw || '').trim().toLowerCase();
    const isAdmin = new Set(['admin', 'administrator', 'lab supervisor', 'lab-supervisor', 'supervisor']).has(role);
    if (isAdmin) {
      return { view: true, edit: true, delete: true };
    }
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem('permissions') : null;
    const parsed = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) {
      return { view: true, edit: true, delete: true };
    }

    const wanted = String(moduleName || '').trim().toLowerCase();
    const found = parsed.find((p: any) => String(p?.name || '').trim().toLowerCase() === wanted);
    if (!found) {
      return { view: true, edit: false, delete: false };
    }
    return {
      view: !!found.view,
      edit: !!found.edit,
      delete: !!found.delete,
    };
  } catch {
    return { view: true, edit: true, delete: true };
  }
}

interface StaffAttendanceProps {
  isUrdu: boolean;
}

type TranslationKeys = {
  title: string;
  attendance: string;
  staffManagement: string;
  searchPlaceholder: string;
  addAttendance: string;
  addStaff: string;
  exportReport: string;
  dailyView: string;
  monthlyView: string;
  filterMonth: string;
  staffName: string;
  position: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: string;
  notes: string;
  present: string;
  absent: string;
  late: string;
  halfDay: string;
  phone: string;
  email: string;
  salary: string;
  joinDate: string;
  edit: string;
  delete: string;
  view: string;
  pharmacist: string;
  assistant: string;
  cashier: string;
  manager: string;
  active: string;
  inactive: string;
  noRecords: string;
  noRecordsDesc: string;
  employee: string;
  time: string;
};

const StaffAttendance: React.FC<StaffAttendanceProps> = ({ isUrdu }) => {
  const modulePerm = getModulePermission('Staff Attendance');
  const formatTime = (iso?: string) => {
    if (!iso) return '--:--';
    // If already a HH:MM string (or similar), don't try to parse as Date.
    if (!/[TzZ]/.test(iso) && !/\d{4}-\d{2}-\d{2}/.test(iso)) return iso;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [serverToday, setServerToday] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [showStaffReport, setShowStaffReport] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('daily');
  const [loadingButton, setLoadingButton] = useState<string | null>(null);
  const [disabledIn, setDisabledIn] = useState<Record<string, boolean>>({});
  const [disabledOut, setDisabledOut] = useState<Record<string, boolean>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [salaryData, setSalaryData] = useState<any[]>([]);
  const [leaveRecords, setLeaveRecords] = useState<any[]>([]);
  const [deductionRecords, setDeductionRecords] = useState<any[]>([]);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showDeductionDialog, setShowDeductionDialog] = useState(false);
  const [showSalaryDialog, setShowSalaryDialog] = useState(false);
  const [showRecordDetails, setShowRecordDetails] = useState(false);
  const [recordDetails, setRecordDetails] = useState<any>(null);
  const [currentStaff, setCurrentStaff] = useState<any>(null);
  const [leaveData, setLeaveData] = useState({ days: 0, reason: '', type: '' });
  const [deductionData, setDeductionData] = useState({ amount: 0, reason: '' });
  const [salaryDataState, setSalaryDataState] = useState({ amount: 0, bonus: 0, month: '' });
  const [salaryRecords, setSalaryRecords] = useState<any[]>([]);
  // backend-driven attendance
  const [dailyRows, setDailyRows] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMonth, setProfileMonth] = useState('');
  const [profileMonthlyRows, setProfileMonthlyRows] = useState<any[]>([]);
  const [profileMonthlyLoading, setProfileMonthlyLoading] = useState(false);
  const [monthlyRows,setMonthlyRows]=useState<any[]>([]);
  const [selectedEmployeeId,setSelectedEmployeeId]=useState('');
  const [attendanceDefaults,setAttendanceDefaults]=useState<{staffId?:string;date?:string}>({});
  const [lastRefreshed,setLastRefreshed]=useState('');

  const formatDateOnly = (val?: any) => {
    if (!val) return '-';
    const s = String(val);
    const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s.slice(0, 10);
    return d.toISOString().slice(0, 10);
  };

  const profileYm = React.useMemo(() => {
    return profileMonth || selectedMonth || new Date().toISOString().slice(0, 7);
  }, [profileMonth, selectedMonth]);

  const profileJoinMonth = React.useMemo(() => {
    const joinKey = String(selectedEmployee?.joinDate || '').slice(0, 10);
    return joinKey ? joinKey.slice(0, 7) : '';
  }, [selectedEmployee?.joinDate]);

  const profileIsBeforeJoinMonth = React.useMemo(() => {
    return !!(profileJoinMonth && profileYm && profileYm < profileJoinMonth);
  }, [profileJoinMonth, profileYm]);

  const profileJoinMonthLabel = React.useMemo(() => {
    return profileJoinMonth
      ? new Date(`${profileJoinMonth}-01T00:00:00`).toLocaleString(undefined, { month: 'long', year: 'numeric' })
      : profileJoinMonth;
  }, [profileJoinMonth]);

  // Initialize selectedMonth + serverToday from server time (avoid relying on client clock)
  useEffect(() => {
    if (selectedMonth) return;
    getServerTime()
      .then((t) => {
        const serverDate = String(t.date || '').slice(0, 10);
        if (serverDate) setServerToday(serverDate);
        const ym = String(t.date || '').slice(0, 7);
        if (ym) setSelectedMonth(ym);
      })
      .catch(() => {
        const localDate = new Date().toISOString().split('T')[0];
        setServerToday(localDate);
        setSelectedMonth(new Date().toISOString().slice(0, 7));
      });
  }, [selectedMonth]);

  // Helper to safely display a time string whether ISO or already HH:MM
  const displayTime = (val?: string) => {
    if (!val) return '--:--';
    // If looks like ISO (contains 'T' or 'Z' or full date), format to local HH:MM
    if (/[TzZ]/.test(val) || /\d{4}-\d{2}-\d{2}/.test(val)) return formatTime(val);
    // Otherwise assume already user-friendly time
    return val;
  };

  // Prepare and open profile with enriched data (use already-fetched staff with embedded attendance)
  const handleViewProfile = async (staffMember: any) => {
    const staffId = String(staffMember._id || staffMember.id || '');
    if (!staffId) return;
    setCurrentStaff(staffMember);
    setShowProfile(true);
    setProfileLoading(true);
    setProfileMonth((prev) => prev || selectedMonth || new Date().toISOString().slice(0, 7));
    try {
      const [profile, leaves, deductions, salaries] = await Promise.all([
        getStaffById(staffId),
        getStaffLeaves(staffId),
        getStaffDeductions(staffId),
        getStaffSalaries(staffId),
      ]);

      const base = profile || staffMember;
      const status = (base.status || 'inactive').toLowerCase();
      const salary = base.salary ?? base.baseSalary ?? 0;
      const attendance = (base as any).attendance || [];

      setSelectedEmployee({
        ...base,
        status,
        salary,
        attendance,
      });
      setLeaveRecords(leaves);
      setDeductionRecords(deductions);
      setSalaryRecords(salaries);
    } catch (err) {
      console.error('Failed to load staff profile records', err);
      // Keep dialog open but clear details
      setSelectedEmployee({ ...staffMember, attendance: staffMember.attendance || [] });
      setLeaveRecords([]);
      setDeductionRecords([]);
      setSalaryRecords([]);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (!showProfile) return;
    const staffId = String(selectedEmployee?._id || currentStaff?._id || '');
    if (!staffId) return;
    if (!profileMonth) return;
    if (profileIsBeforeJoinMonth) {
      setProfileMonthlyRows([]);
      return;
    }
    setProfileMonthlyLoading(true);
    getMonthlyAttendance(staffId, profileMonth)
      .then((rows) => setProfileMonthlyRows(Array.isArray(rows) ? rows : []))
      .catch(() => setProfileMonthlyRows([]))
      .finally(() => setProfileMonthlyLoading(false));
  }, [showProfile, selectedEmployee?._id, currentStaff?._id, profileMonth, profileIsBeforeJoinMonth]);
  // Attendance Settings state
  const [attendanceSettings, setAttendanceSettings] = useState(() => {
    const saved = localStorage.getItem('pharmacy_attendance_settings');
    return saved
      ? JSON.parse(saved)
      : {
          paidAbsentDays: 0,
          absentDeduction: 0,
          officialDaysOff: [],
          lateReliefMinutes: 0,
          lateDeduction: 0,
          earlyOutDeduction: 0,
          clockInTime: '09:00',
          clockOutTime: '18:00',
        };
  });

  // Initial load from backend settings
  useEffect(()=>{
    getAttendanceSettings().then((s)=>{
      if (s) {
        setAttendanceSettings((prev: any) => ({
          ...prev,
          ...s,
          paidAbsentDays: Number((s as any).paidAbsentDays ?? prev.paidAbsentDays ?? 0) || 0,
          absentDeduction: Number((s as any).absentDeduction ?? prev.absentDeduction ?? 0) || 0,
          lateReliefMinutes: Number((s as any).lateReliefMinutes ?? prev.lateReliefMinutes ?? 0) || 0,
          officialDaysOff: Array.isArray((s as any).officialDaysOff) ? (s as any).officialDaysOff : (prev as any).officialDaysOff || [],
        }));
      }
    }).catch(console.error);
  },[]);

  // Save attendance settings to localStorage (cache)
  useEffect(() => {
    localStorage.setItem('pharmacy_attendance_settings', JSON.stringify(attendanceSettings));
  }, [attendanceSettings]);

  const [staff, setStaff] = useState<any[]>([]);

  // --- Load staff list from backend on mount ---
  useEffect(() => {
    fetchStaff()
      .then(setStaff)
      .catch(err => {
        console.error('Failed to fetch staff list from backend', err);
        setStaff([]);
      });
  }, []);

  // Staff + Attendance are backend-driven; keep settings cached only.

  const text = {
    en: {
      title: 'Staff & Attendance',
      attendance: 'Attendance',
      staffManagement: 'Staff Management',
      searchPlaceholder: 'Search staff...',
      addAttendance: 'Add Attendance',
      addStaff: 'Add Staff',
      exportReport: 'Export Report',
      dailyView: 'Daily View',
      monthlyView: 'Monthly View',
      filterMonth: 'Filter by Month',
      staffName: 'Staff Name',
      position: 'Position',
      date: 'Date',
      checkIn: 'Check In',
      checkOut: 'Check Out',
      status: 'Status',
      notes: 'Notes',
      present: 'Present',
      absent: 'Absent',
      late: 'Late',
      halfDay: 'Half Day',
      phone: 'Phone',
      email: 'Email',
      salary: 'Salary',
      joinDate: 'Join Date',
      edit: 'Edit',
      delete: 'Delete',
      view: 'View',
      pharmacist: 'Pharmacist',
      assistant: 'Assistant',
      cashier: 'Cashier',
      manager: 'Manager',
      active: 'Active',
      inactive: 'Inactive',
      noRecords: 'No attendance records',
      noRecordsDesc: 'No attendance records found for the selected period',
      employee: 'Employee',
      time: 'Time',
    },
    ur: {
      title: 'عملہ اور حاضری',
      attendance: 'حاضری',
      staffManagement: 'عملے کا انتظام',
      searchPlaceholder: 'عملہ تلاش کریں...',
      addAttendance: 'حاضری شامل کریں',
      addStaff: 'عملہ شامل کریں',
      exportReport: 'رپورٹ برآمد کریں',
      dailyView: 'روزانہ نظارہ',
      monthlyView: 'ماہانہ نظارہ',
      filterMonth: 'مہینے کے ذریعے فلٹر',
      staffName: 'عملے کا نام',
      position: 'عہدہ',
      date: 'تاریخ',
      checkIn: 'آمد',
      checkOut: 'رخصت',
      status: 'حالت',
      notes: 'نوٹس',
      present: 'حاضر',
      absent: 'غائب',
      late: 'دیر',
      halfDay: 'آدھا دن',
      phone: 'فون',
      email: 'ای میل',
      salary: 'تنخواہ',
      joinDate: 'شمولیت کی تاریخ',
      edit: 'تبدیل کریں',
      delete: 'حذف کریں',
      view: 'دیکھیں',
      pharmacist: 'فارماسسٹ',
      assistant: 'اسسٹنٹ',
      cashier: 'کیشیئر',
      manager: 'منیجر',
      active: 'فعال',
      inactive: 'غیر فعال',
      noRecords: 'کوئی حاضری ریکارڈ نہیں ملا',
      noRecordsDesc: 'منتخب مدت کے لیے کوئی حاضری کا ریکارڈ دستیاب نہیں ہے',
      employee: 'ملازم',
      time: 'وقت',
    }
  };

  const t = isUrdu ? text.ur : text.en;

  const filteredStaff = staff.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Save / update staff via backend
  const handleSaveStaff = async (formData: any) => {
    if (!modulePerm.edit) {
      toast({ title: isUrdu ? 'اجازت نہیں ہے' : 'Not allowed', description: isUrdu ? 'آپ کے پاس صرف دیکھنے کی اجازت ہے' : 'You only have view permission for Staff Attendance.', variant: 'destructive' });
      return;
    }
    try {
      // sanitize payload
      // map only allowed fields
      const payload: any = {
        name: formData.name.trim(),
        position: formData.position,
        phone: formData.phone?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        address: formData.address?.trim() || undefined,
        status: formData.status || 'active',
      } as any;
      if (formData.salary) payload.salary = Number(formData.salary);
      if (formData.joinDate) payload.joinDate = new Date(formData.joinDate);
      

      if (editingStaff && editingStaff._id) {
        await apiUpdateStaff(editingStaff._id, payload);
      } else {
        await apiAddStaff(payload);
      }
      const refreshed = await fetchStaff();
      setStaff(refreshed);
    } catch (err) {
      console.error('Failed to save staff:', err);
    }
  };

  const handleAddAttendance = async (attendanceData: any) => {
    if (!modulePerm.edit) {
      toast({ title: isUrdu ? 'اجازت نہیں ہے' : 'Not allowed', description: isUrdu ? 'آپ کے پاس صرف دیکھنے کی اجازت ہے' : 'You only have view permission for Staff Attendance.', variant: 'destructive' });
      return;
    }
    try {
      // 1. persist to backend via attendance API
      const saved = await apiAddAttendance(attendanceData);

      // 2. update local state for instant UI feedback
      setStaff(prev=>prev.map(s=> (String(s._id||s.id)===String(attendanceData.staffId))
        ? {...s, attendance:[...(s.attendance||[]), saved]}
        : s));

      // refresh daily and monthly views
      getDailyAttendance().then(setDailyRows).catch(()=>{});
      if(activeTab==='monthly' && selectedEmployeeId===String(attendanceData.staffId)){
        setMonthlyRows(m=>[...m, saved]);
      }

      toast({title: isUrdu? 'حاضری محفوظ ہو گئی':'Attendance saved'});
    } catch(err){
      console.error(err);
      toast({variant:'destructive', title:isUrdu? 'حاضری محفوظ کرنے میں ناکامی':'Failed to save attendance'});
    } finally { setShowAttendanceForm(false);} };



  const handleEditStaff = (staffMember: any) => {
    if (!modulePerm.edit) {
      toast({ title: isUrdu ? 'اجازت نہیں ہے' : 'Not allowed', description: isUrdu ? 'آپ کے پاس صرف دیکھنے کی اجازت ہے' : 'You only have view permission for Staff Attendance.', variant: 'destructive' });
      return;
    }
    setEditingStaff(staffMember);
    setShowStaffForm(true);
  };

  // ---- Delete staff helpers ----
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<UIStaff | null>(null);

  const handleConfirmDelete = async () => {
    if (!modulePerm.delete) {
      toast({ title: isUrdu ? 'اجازت نہیں ہے' : 'Not allowed', description: isUrdu ? 'آپ کے پاس حذف کرنے کی اجازت نہیں ہے' : "You don't have delete permission for Staff Attendance.", variant: 'destructive' });
      return;
    }
    if (!staffToDelete) return;
    try {
      if (staffToDelete._id) {
        await apiDeleteStaff(staffToDelete._id);
      }
      setStaff(prev => prev.filter(s => s._id !== staffToDelete?._id));
      toast({
        title: isUrdu ? 'اسٹاف حذف ہو گیا' : 'Staff deleted',
        variant: 'default'
      });
    } catch (err) {
      console.error('Failed to delete staff:', err);
      toast({
        title: isUrdu ? 'حذف ناکام ہو گیا' : 'Failed to delete staff',
        variant: 'destructive'
      });
    } finally {
      setDeleteDialogOpen(false);
      setStaffToDelete(null);
    }
  };

  const handleRequestDeleteStaff = (staffMember: UIStaff) => {
    if (!modulePerm.delete) {
      toast({ title: isUrdu ? 'اجازت نہیں ہے' : 'Not allowed', description: isUrdu ? 'آپ کے پاس حذف کرنے کی اجازت نہیں ہے' : "You don't have delete permission for Staff Attendance.", variant: 'destructive' });
      return;
    }
    setStaffToDelete(staffMember);
    setDeleteDialogOpen(true);
  };

  const exportAttendanceReport = () => {
    const header = "Staff Name,Date,Check In,Check Out,Status\n";
    let rows: string[] = [];
    if (activeTab === 'daily') {
      // dailyRows: { name, status, checkIn, checkOut, notes }
      rows = dailyRows.map((r:any) => {
        const dateStr = new Date().toISOString().split('T')[0];
        return `${r.name},${dateStr},${displayTime(r.checkIn)},${displayTime(r.checkOut)},${r.status||''}`;
      });
    } else if (activeTab === 'monthly') {
      rows = monthlyRows.map((r:any) => {
        const name = r.staffName || (staff.find(s=> String(s._id||s.id)===String(r.staffId))?.name || '');
        return `${name},${r.date},${displayTime(r.checkIn||r.checkInTime)},${displayTime(r.checkOut||r.checkOutTime)},${r.status||''}`;
      });
    } else if (activeTab === 'staff') {
      // Flatten all embedded attendance from staff list
      rows = staff.flatMap((s:any) => (s.attendance||[]).map((a:any) => {
        return `${s.name},${a.date},${displayTime(a.checkIn||a.checkInTime)},${displayTime(a.checkOut||a.checkOutTime)},${a.status||''}`;
      }));
    }

    // Robust fallbacks if primary sources are empty
    if (!rows.length) {
      if (activeTab === 'daily') {
        const today = new Date().toISOString().split('T')[0];
        rows = staff.flatMap((s:any) => (s.attendance||[])
          .filter((a:any) => String(a.date).startsWith(today))
          .map((a:any) => `${s.name},${a.date},${displayTime(a.checkIn||a.checkInTime)},${displayTime(a.checkOut||a.checkOutTime)},${a.status||''}`)
        );
      } else if (activeTab === 'monthly') {
        const month = selectedMonth; // YYYY-MM
        rows = staff.flatMap((s:any) => (s.attendance||[])
          .filter((a:any) => String(a.date).startsWith(month) && (!selectedEmployeeId || String(s._id||s.id)===String(selectedEmployeeId)))
          .map((a:any) => `${s.name},${a.date},${displayTime(a.checkIn||a.checkInTime)},${displayTime(a.checkOut||a.checkOutTime)},${a.status||''}`)
        );
      } else if (activeTab === 'staff') {
        rows = staff.flatMap((s:any) => (s.attendance||[])
          .map((a:any) => `${s.name},${a.date},${displayTime(a.checkIn||a.checkInTime)},${displayTime(a.checkOut||a.checkOutTime)},${a.status||''}`)
        );
      }
    }

    const csv = header + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_report_${selectedMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const refreshAll = async () => {
    try {
      const refreshed = await fetchStaff();
      setStaff(refreshed);
    } catch (err) { console.error(err); }
    getDailyAttendance().then(setDailyRows).catch(()=>{});
    if(activeTab==='monthly' && selectedEmployeeId){
      try {
        const rows = await getMonthlyAttendance(String(selectedEmployeeId), selectedMonth);
        setMonthlyRows(rows);
      } catch {
        setMonthlyRows([]);
      }
    }
    try {
      const st = await getServerTime();
      setLastRefreshed(st.time);
    } catch {
      setLastRefreshed(new Date().toLocaleTimeString());
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'absent':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'late':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'halfDay':
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: "default" | "destructive" | "secondary" | "outline" } = {
      present: 'default',
      absent: 'destructive',
      late: 'secondary',
      halfDay: 'outline'
    };
    return <Badge variant={variants[status] || 'outline'}>{t[status as keyof typeof t] || status}</Badge>;
  };

  const handleRequestDelete = (item: any) => {
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;
    setItemToDelete((prev: any) => (prev ? { ...prev, verified: true } : prev));
    
    // First verification - show success message but don't delete yet
    // toast({
    //   title: 'First verification complete',
    //   description: 'Please confirm again to permanently delete',
    //   variant: 'default'
    // });
    
    // Set a timeout to reset if not confirmed within 10 seconds
    setTimeout(() => {
      if (showDeleteConfirm) {
        setShowDeleteConfirm(false);
        setItemToDelete(null);
      }
    }, 10000);
  };

  const finalConfirmDelete = () => {
    if (!itemToDelete) return;
    
    // Actual deletion logic here
    if (activeTab === 'staff') {
      // Prefer backend delete when possible (local-only rows are not supported)
      const id = String(itemToDelete?._id || '');
      if (id) {
        apiDeleteStaff(id)
          .then(() => fetchStaff().then(setStaff).catch(() => setStaff((prev) => prev.filter((s: any) => String(s._id) !== id))))
          .catch((err) => console.error('Failed to delete staff:', err));
      }
    }
    
    setShowDeleteConfirm(false);
    setItemToDelete(null);
    
    // toast({
    //   title: 'Successfully deleted',
    //   description: 'The record has been permanently removed',
    //   variant: 'default'
    // });
  };

  const handleAddLeave = async () => {
    try {
      if (!modulePerm.edit) {
        toast({ title: isUrdu ? 'اجازت نہیں ہے' : 'Not allowed', description: isUrdu ? 'آپ کے پاس صرف دیکھنے کی اجازت ہے' : 'You only have view permission for Staff Attendance.', variant: 'destructive' });
        return;
      }
      const staffId = String(currentStaff?._id || currentStaff?.id || '');
      if (!staffId) throw new Error('Missing staff id');
      await addStaffLeave(staffId, {
        date: new Date().toISOString().split('T')[0],
        days: Number(leaveData.days) || 0,
        type: leaveData.type,
        reason: leaveData.reason,
      });
      const refreshed = await getStaffLeaves(staffId);
      setLeaveRecords(refreshed);
      
      // toast({
      //   title: isUrdu ? 'چھٹی درج ہو گئی' : 'Leave Added',
      //   description: isUrdu 
      //     ? `${currentStaff.name} کی چھٹی کامیابی سے درج ہو گئی` 
      //     : `Leave recorded for ${currentStaff.name}`,
      //   variant: 'default'
      // });
      
      setShowLeaveDialog(false);
      setLeaveData({ days: 0, reason: '', type: '' });
    } catch (error) {
      console.error('Failed to add leave:', error);
      // toast({
      //   title: isUrdu ? 'خرابی' : 'Error',
      //   description: isUrdu 
      //     ? 'چھٹی درج کرنے میں خرابی آئی ہے' 
      //     : 'Failed to record leave',
      //   variant: 'destructive'
      // });
    }
  };

  const handleAddDeduction = async () => {
    try {
      if (!modulePerm.edit) {
        toast({ title: isUrdu ? 'اجازت نہیں ہے' : 'Not allowed', description: isUrdu ? 'آپ کے پاس صرف دیکھنے کی اجازت ہے' : 'You only have view permission for Staff Attendance.', variant: 'destructive' });
        return;
      }
      const staffId = String(currentStaff?._id || currentStaff?.id || '');
      if (!staffId) throw new Error('Missing staff id');
      await addStaffDeduction(staffId, {
        date: new Date().toISOString().split('T')[0],
        amount: Number(deductionData.amount) || 0,
        reason: deductionData.reason,
      });
      const refreshed = await getStaffDeductions(staffId);
      setDeductionRecords(refreshed);
      
      // toast({
      //   title: isUrdu ? 'کٹوتی درج ہو گئی' : 'Deduction Added',
      //   description: isUrdu 
      //     ? `${currentStaff.name} کی کٹوتی کامیابی سے درج ہو گئی` 
      //     : `Deduction recorded for ${currentStaff.name}`,
      //   variant: 'default'
      // });
      
      setShowDeductionDialog(false);
      setDeductionData({ amount: 0, reason: '' });
    } catch (error) {
      console.error('Failed to add deduction:', error);
      // toast({
      //   title: isUrdu ? 'خرابی' : 'Error',
      //   description: isUrdu 
      //     ? 'کٹوتی درج کرنے میں خرابی آئی ہے' 
      //     : 'Failed to record deduction',
      //   variant: 'destructive'
      // });
    }
  };

  const handleAddSalary = async () => {
    try {
      if (!modulePerm.edit) {
        toast({ title: isUrdu ? 'اجازت نہیں ہے' : 'Not allowed', description: isUrdu ? 'آپ کے پاس صرف دیکھنے کی اجازت ہے' : 'You only have view permission for Staff Attendance.', variant: 'destructive' });
        return;
      }
      const staffId = String(currentStaff?._id || currentStaff?.id || '');
      if (!staffId) throw new Error('Missing staff id');
      await addStaffSalary(staffId, {
        month: salaryDataState.month,
        amount: Number(salaryDataState.amount) || 0,
        bonus: Number(salaryDataState.bonus) || 0,
        status: 'pending',
      });
      const refreshed = await getStaffSalaries(staffId);
      setSalaryRecords(refreshed);
      
      // toast({
      //   title: isUrdu ? 'تنخواہ درج ہو گئی' : 'Salary Added',
      //   description: isUrdu 
      //     ? `${currentStaff.name} کی تنخواہ کامیابی سے درج ہو گئی` 
      //     : `Salary recorded for ${currentStaff.name}`,
      //   variant: 'default'
      // });
      
      setShowSalaryDialog(false);
      setSalaryDataState({ amount: 0, bonus: 0, month: '' });
    } catch (error) {
      console.error('Failed to add salary:', error);
      // toast({
      //   title: isUrdu ? 'خرابی' : 'Error',
      //   description: isUrdu 
      //     ? 'تنخواہ درج کرنے میں خرابی آئی ہے' 
      //     : 'Failed to record salary',
      //   variant: 'destructive'
      // });
    }
  };

  const handleDeleteConfirmation = (item: any, type: 'staff' | 'attendance' | 'leave' | 'deduction' | 'salary') => {
    setItemToDelete({ ...item, type });
    setShowDeleteConfirm(true);
  };

  const handleViewRecordDetails = (item: any, type: 'leave' | 'deduction' | 'salary') => {
    setRecordDetails({ ...item, type });
    setShowRecordDetails(true);
  };

  const handleDeleteConfirmed = async () => {
    try {
      if (!itemToDelete) return;

      if (!modulePerm.delete) {
        toast({ title: isUrdu ? 'اجازت نہیں ہے' : 'Not allowed', description: isUrdu ? 'آپ کے پاس حذف کرنے کی اجازت نہیں ہے' : "You don't have delete permission for Staff Attendance.", variant: 'destructive' });
        return;
      }
      
      switch (itemToDelete.type) {
        case 'staff':
          {
            const id = String(itemToDelete?._id || '');
            if (id) {
              await apiDeleteStaff(id);
              const refreshed = await fetchStaff();
              setStaff(refreshed);
            }
          }
          break;
        
        case 'attendance':
          break;
          
        case 'leave':
          {
            const staffId = String(itemToDelete.staffId || currentStaff?._id || currentStaff?.id || '');
            const leaveId = String(itemToDelete._id || itemToDelete.id || '');
            if (staffId && leaveId) {
              await deleteStaffLeave(staffId, leaveId);
              const refreshed = await getStaffLeaves(staffId);
              setLeaveRecords(refreshed);
            }
          }
          break;
          
        case 'deduction':
          {
            const staffId = String(itemToDelete.staffId || currentStaff?._id || currentStaff?.id || '');
            const deductionId = String(itemToDelete._id || itemToDelete.id || '');
            if (staffId && deductionId) {
              await deleteStaffDeduction(staffId, deductionId);
              const refreshed = await getStaffDeductions(staffId);
              setDeductionRecords(refreshed);
            }
          }
          break;
          
        case 'salary':
          {
            const staffId = String(itemToDelete.staffId || currentStaff?._id || currentStaff?.id || '');
            const salaryId = String(itemToDelete._id || itemToDelete.id || '');
            if (staffId && salaryId) {
              await deleteStaffSalary(staffId, salaryId);
              const refreshed = await getStaffSalaries(staffId);
              setSalaryRecords(refreshed);
            }
          }
          break;
      }

      toast({
        title: isUrdu ? 'کامیابی' : 'Success',
        description: isUrdu ? 'ریکارڈ کامیابی سے حذف ہو گیا' : 'Record deleted successfully',
        variant: 'default',
      });
      
      // toast({
      //   title: isUrdu ? 'کامیابی' : 'Success',
      //   description: isUrdu 
      //     ? 'ریکارڈ کامیابی سے حذف ہو گیا' 
      //     : 'Record deleted successfully',
      //   variant: 'default'
      // });
    } catch (error) {
      console.error('Failed to delete:', error);

      toast({
        title: isUrdu ? 'خرابی' : 'Error',
        description: isUrdu ? 'ریکارڈ حذف کرنے میں خرابی آئی ہے' : 'Failed to delete record',
        variant: 'destructive',
      });
      // toast({
      //   title: isUrdu ? 'خرابی' : 'Error',
      //   description: isUrdu 
      //     ? 'ریکارڈ حذف کرنے میں خرابی آئی ہے' 
      //     : 'Failed to delete record',
      //   variant: 'destructive'
      // });
    } finally {
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    }
  };

  // fetch today on mount
  useEffect(() => {
    getDailyAttendance().then(setDailyRows).catch(console.error);
  }, []);

  // add effect for selectedMonth when tab monthly active
  useEffect(()=>{
    if(activeTab!=='monthly' || !selectedEmployeeId) return;
    (async ()=>{
      try{
        const rows = await getMonthlyAttendance(String(selectedEmployeeId), selectedMonth);
        setMonthlyRows(rows);
      }catch{setMonthlyRows([]);} })();
  },[activeTab,selectedMonth,selectedEmployeeId]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
          <p className="text-muted-foreground text-sm">
            {isUrdu
              ? 'عملے کی حاضری، شیڈول اور تنخواہ کا ریکارڈ ایک ہی جگہ دیکھیں'
              : 'Monitor staff attendance, shifts and payroll records in one place'}
          </p>
        </div>
        <div className="flex space-x-2 items-center">
          {lastRefreshed && <span className="text-sm text-gray-500">Refreshed: {lastRefreshed}</span>}
          <Button variant="outline" onClick={refreshAll}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button variant="outline" onClick={exportAttendanceReport}>
            <Download className="h-4 w-4 mr-2" />
            {t.exportReport}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="daily" className="data-[state=active]:bg-blue-800 data-[state=active]:text-white">{t.dailyView}</TabsTrigger>
          <TabsTrigger value="monthly" className="data-[state=active]:bg-blue-800 data-[state=active]:text-white">{t.monthlyView}</TabsTrigger>
          <TabsTrigger value="staff" className="data-[state=active]:bg-blue-800 data-[state=active]:text-white">{t.staffManagement}</TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-blue-800 data-[state=active]:text-white">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CalendarIcon className="h-5 w-5" />
                <span>{t.dailyView} - {new Date().toLocaleDateString()}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dailyRows.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.employee}</TableHead>
                      <TableHead>{t.status}</TableHead>
                      <TableHead>{t.time}</TableHead>
                      <TableHead>{t.notes}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyRows.map((record) => (
                      <TableRow key={record.staffId}>
                        <TableCell>{record.staffName || record.name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={record.status === 'present' ? 'default' : 'destructive'}>
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatTime(record.checkIn)} - {formatTime(record.checkOut)}</TableCell>
                        <TableCell>{record.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CalendarIcon className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p>{t.noRecords}</p>
                  <p className="text-sm">{t.noRecordsDesc}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={selectedEmployeeId} onValueChange={(v)=>{ setSelectedEmployeeId(v); if(v){ getMonthlyAttendance(String(v), selectedMonth).then(setMonthlyRows).catch(()=>setMonthlyRows([])); } }}>
              <SelectTrigger className="w-64"><SelectValue placeholder={t.staffName}/></SelectTrigger>
              <SelectContent>
                {staff.map(s=><SelectItem key={s._id||s.id} value={s._id||s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <MonthYearPicker
                value={selectedMonth}
                onChange={setSelectedMonth}
                className="w-full sm:w-48"
              />
            </div>
          </div>
          {monthlyRows.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CalendarIcon className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p>{t.noRecords}</p>
              <p className="text-sm">{t.noRecordsDesc}</p>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CalendarIcon className="h-5 w-5" />
                  <span>{t.monthlyView} - {selectedMonth}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(() => {
                    const pad = (n:number)=> (n<10?`0${n}`:String(n));
                    const formatDateOnly = (val:any)=>{
                      const s = String(val||"");
                      const m = s.match(/^\d{4}-\d{2}-\d{2}$/);
                      if(m){ const [y,mn,d]=s.split('-'); return `${d}/${mn}/${y}`; }
                      try{ return new Date(s).toLocaleDateString(); }catch{ return s; }
                    };
                    // Build display rows: normalize date keys and auto-fill missing days as leave
                    const [yy, mm] = selectedMonth.split('-').map(Number);
                    const today = new Date();
                    const isCurrentMonth = today.getFullYear()===yy && (today.getMonth()+1)===mm;
                    const daysInMonth = new Date(yy, mm, 0).getDate();
                    const lastDay = isCurrentMonth ? today.getDate() : daysInMonth;
                    const byDay: Record<string, any> = {};
                    for(const r of monthlyRows){
                      const s = String(r.date||"");
                      const match = s.match(/^(\d{4}-\d{2}-\d{2})/);
                      const key = match? match[1] : `${new Date(s).getFullYear()}-${pad(new Date(s).getMonth()+1)}-${pad(new Date(s).getDate())}`;
                      byDay[key] = { ...r, date: key };
                    }
                    for(let d=1; d<=lastDay; d++){
                      const key = `${yy}-${pad(mm)}-${pad(d)}`;
                      if(!byDay[key] && selectedEmployeeId){
                        byDay[key] = { staffId: selectedEmployeeId, staffName: (staff.find(s=> String(s._id||s.id)===String(selectedEmployeeId))?.name)||'', date: key, checkIn: null, checkOut: null, status: 'leave' };
                      }
                    }
                    const monthlyDisplayRows = Object.values(byDay).sort((a:any,b:any)=> new Date(`${a.date}T00:00:00`).getTime()-new Date(`${b.date}T00:00:00`).getTime());
                    return monthlyDisplayRows.map((record:any) => (
                      <div key={`${record.staffId}-${record.date}`} className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium">{record.staffName}</h4>
                            <p className="text-sm text-gray-600">{formatDateOnly(record.date)}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex flex-col space-y-2">
                            <div className="text-sm text-center">
                              <div className="text-gray-500 text-xs mb-1">{t.checkIn}</div>
                              <div className="font-medium">{formatTime(record.checkIn)}</div>
                            </div>
                          </div>
                          <div className="flex flex-col space-y-2">
                            <div className="text-sm text-center">
                              <div className="text-gray-500 text-xs mb-1">{t.checkOut}</div>
                              <div className="font-medium">{formatTime(record.checkOut)}</div>
                            </div>
                          </div>
                          <div className="text-sm">
                            <Badge variant={record.status==='present'?'default': (record.status==='late'?'secondary':'outline')} className="capitalize">{record.status||'-'}</Badge>
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="staff" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-64"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button 
                variant="outline" 
                onClick={() => setShowStaffReport(true)}
                className="w-full sm:w-auto"
              >
                <FileText className="h-4 w-4 mr-2" />
                Staff Report
              </Button>
              <Button 
                disabled={!modulePerm.edit}
                onClick={() => {
                  if (!modulePerm.edit) {
                    toast({ title: isUrdu ? 'اجازت نہیں ہے' : 'Not allowed', description: isUrdu ? 'آپ کے پاس صرف دیکھنے کی اجازت ہے' : 'You only have view permission for Staff Attendance.', variant: 'destructive' });
                    return;
                  }
                  setShowStaffForm(true);
                }}
                className={!modulePerm.edit ? 'opacity-50 cursor-not-allowed w-full sm:w-auto' : 'w-full sm:w-auto'}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t.addStaff}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStaff.map((staffMember) => (
              <Card key={staffMember._id ?? staffMember.id ?? staffMember.email ?? staffMember.phone} className="hover:shadow-md transition-all">
                <CardContent className="p-6">
                  {(() => {
                    const todayStr = serverToday || new Date().toISOString().split('T')[0];
                    const attendanceToday = staffMember.attendance?.find((a: any) => a.date === todayStr);
                    if(!staffMember._id) return; // skip for local-only records
                    const handleClockIn = async () => {
                      setLoadingButton(staffMember._id + '-in');
                      setDisabledIn(prev => ({ ...prev, [staffMember._id]: true }));
                      try {
                        const updated = await apiClockIn(staffMember._id);
                        setStaff(prev => prev.map(s => {
                          if (s._id !== staffMember._id) return s;
                          const filtered = (s.attendance || []).filter((a:any) => {
                            const d = new Date(a.date);
                            const day = isNaN(d as any) ? String(a.date).slice(0,10) : d.toISOString().slice(0,10);
                            return day !== todayStr;
                          });
                          return { ...s, attendance: [...filtered, updated] };
                        }));
                        toast({ title: 'Clocked in', description: `${staffMember.name} clocked in at ${updated.checkIn}` });
                        if(activeTab==='monthly' && selectedEmployeeId){
                          try{ const rows = await getMonthlyAttendance(String(selectedEmployeeId), selectedMonth); setMonthlyRows(rows);}catch{ setMonthlyRows([]);} }
                      } catch (err:any) {
                        toast({ variant:'destructive', title:'Clock in failed', description: err.response?.data?.message||err.message });
                        // re-enable on failure
                        setDisabledIn(prev => ({ ...prev, [staffMember._id]: false }));
                      } finally { setLoadingButton(null);} };
                    if(!staffMember._id) return;
                    const handleClockOut = async () => {
                      setLoadingButton(staffMember._id + '-out');
                      setDisabledOut(prev => ({ ...prev, [staffMember._id]: true }));
                      try {
                        const updated = await apiClockOut(staffMember._id);
                        setStaff(prev => prev.map(s => {
                          if (s._id !== staffMember._id) return s;
                          const filtered = (s.attendance || []).filter((a:any) => {
                            const d = new Date(a.date);
                            const day = isNaN(d as any) ? String(a.date).slice(0,10) : d.toISOString().slice(0,10);
                            return day !== todayStr;
                          });
                          return { ...s, attendance: [...filtered, updated] };
                        }));
                        toast({ title: 'Clocked out', description: `${staffMember.name} clocked out at ${updated.checkOut}` });
                        getDailyAttendance().then(setDailyRows).catch(()=>{});
                      } catch (err:any) {
                        toast({ variant:'destructive', title:'Clock out failed', description: err.response?.data?.message||err.message });
                        // re-enable on failure
                        setDisabledOut(prev => ({ ...prev, [staffMember._id]: false }));
                      } finally { setLoadingButton(null);} };
                    return (
                      <div className="mb-4">
                        {attendanceToday ? (
                          <div className="space-y-1 text-sm text-gray-700">
                            <div>Check-in: {formatTime(attendanceToday.checkIn)}</div>
                            <div>Check-out: {formatTime(attendanceToday.checkOut)}</div>
                          </div>
                        ) : null}
                        {/* clock buttons (always visible) */}
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            disabled={
                              loadingButton===staffMember._id+'-in' ||
                              !!(attendanceToday && attendanceToday.checkIn) ||
                              !!disabledIn[staffMember._id] ||
                              !modulePerm.edit
                            }
                            onClick={() => {
                              if (!modulePerm.edit) {
                                toast({ title: isUrdu ? 'اجازت نہیں ہے' : 'Not allowed', description: isUrdu ? 'آپ کے پاس صرف دیکھنے کی اجازت ہے' : 'You only have view permission for Staff Attendance.', variant: 'destructive' });
                                return;
                              }
                              handleClockIn();
                            }}
                          >
                            Clock In
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                            disabled={
                              loadingButton===staffMember._id+'-out' ||
                              !!(attendanceToday && attendanceToday.checkOut) ||
                              !!disabledOut[staffMember._id] ||
                              !modulePerm.edit
                            }
                            onClick={() => {
                              if (!modulePerm.edit) {
                                toast({ title: isUrdu ? 'اجازت نہیں ہے' : 'Not allowed', description: isUrdu ? 'آپ کے پاس صرف دیکھنے کی اجازت ہے' : 'You only have view permission for Staff Attendance.', variant: 'destructive' });
                                return;
                              }
                              handleClockOut();
                            }}
                          >
                            Clock Out
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{staffMember.name}</h3>
                        <p className="text-sm text-gray-600 capitalize">{t[staffMember.position as keyof typeof t] || staffMember.position}</p>
                      </div>
                    </div>
                    <Badge variant={staffMember.status === 'active' ? 'default' : 'secondary'}>
                      {staffMember.status === 'active' ? t.active : t.inactive}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">{t.phone}: </span>
                      <span>{staffMember.phone}</span>
                    </div>
                    <div>
                      <span className="font-medium">{t.email}: </span>
                      <span>{staffMember.email}</span>
                    </div>
                    <div>
                      <span className="font-medium">{t.salary}: </span>
                      <span>PKR {parseInt(staffMember.salary).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="font-medium">{t.joinDate}: </span>
                      <span>{formatDateOnly(staffMember.joinDate)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-4 pt-4 border-t">
                    <span className="text-xs text-gray-500">ID: {staffMember.staffCode || staffMember._id || '-'}</span>
                    <div className="flex space-x-1">
                      <Button size="sm" variant="outline" disabled={!modulePerm.edit} onClick={() => handleEditStaff(staffMember)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" disabled={!modulePerm.delete} onClick={() => handleRequestDeleteStaff(staffMember)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                        onClick={() => handleViewProfile(staffMember)}
                      >
                        <Eye className="h-3 w-3 mr-2" />
                        Manage
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Official Clock-in Time</Label>
                    <Input 
                      type="time" 
                      value={attendanceSettings.clockInTime}
                      onChange={(e) => setAttendanceSettings({
                        ...attendanceSettings,
                        clockInTime: e.target.value
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Official Clock-out Time</Label>
                    <Input 
                      type="time" 
                      value={attendanceSettings.clockOutTime}
                      onChange={(e) => setAttendanceSettings({
                        ...attendanceSettings,
                        clockOutTime: e.target.value
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Absent Deduction (Rs)</Label>
                    <Input
                      type="number"
                      value={attendanceSettings.absentDeduction}
                      onChange={(e) => setAttendanceSettings({
                        ...attendanceSettings,
                        absentDeduction: parseInt(e.target.value) || 0,
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Late Deduction (Rs)</Label>
                    <Input 
                      type="number" 
                      value={attendanceSettings.lateDeduction}
                      onChange={(e) => setAttendanceSettings({
                        ...attendanceSettings,
                        lateDeduction: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Early Out Deduction (Rs)</Label>
                    <Input 
                      type="number" 
                      value={attendanceSettings.earlyOutDeduction}
                      onChange={(e) => setAttendanceSettings({
                        ...attendanceSettings,
                        earlyOutDeduction: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Paid Leaves / Allowed Absent Days</Label>
                    <Input
                      type="number"
                      value={attendanceSettings.paidAbsentDays}
                      onChange={(e) => setAttendanceSettings({
                        ...attendanceSettings,
                        paidAbsentDays: parseInt(e.target.value) || 0,
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Late Relief (Minutes)</Label>
                    <Input
                      type="number"
                      value={attendanceSettings.lateReliefMinutes}
                      onChange={(e) => setAttendanceSettings({
                        ...attendanceSettings,
                        lateReliefMinutes: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Official Days Off</Label>
                  <div className="flex flex-wrap gap-4">
                    {[
                      { label: 'Sun', value: 0 },
                      { label: 'Mon', value: 1 },
                      { label: 'Tue', value: 2 },
                      { label: 'Wed', value: 3 },
                      { label: 'Thu', value: 4 },
                      { label: 'Fri', value: 5 },
                      { label: 'Sat', value: 6 },
                    ].map((d) => {
                      const selected = Array.isArray((attendanceSettings as any).officialDaysOff)
                        ? (attendanceSettings as any).officialDaysOff.includes(d.value)
                        : false;
                      return (
                        <label key={d.value} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={selected}
                            onCheckedChange={(checked) => {
                              const curr = Array.isArray((attendanceSettings as any).officialDaysOff)
                                ? (attendanceSettings as any).officialDaysOff
                                : [];
                              const next = checked
                                ? Array.from(new Set([...curr, d.value]))
                                : curr.filter((x: any) => Number(x) !== d.value);
                              setAttendanceSettings({
                                ...attendanceSettings,
                                officialDaysOff: next,
                              });
                            }}
                          />
                          <span>{d.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <Button 
                  type="button"
                  disabled={!modulePerm.edit}
                  onClick={async () => {
                    if (!modulePerm.edit) {
                      toast({ title: isUrdu ? 'اجازت نہیں ہے' : 'Not allowed', description: isUrdu ? 'آپ کے پاس صرف دیکھنے کی اجازت ہے' : 'You only have view permission for Staff Attendance.', variant: 'destructive' });
                      return;
                    }
                    try{
                      await saveAttendanceSettings(attendanceSettings);
                      toast({ title:'Settings saved successfully'});
                    }catch(err:any){
                      toast({ variant:'destructive', title:'Failed to save', description: err.message||'Server error' });
                    }
                  }}
                >
                  Save Settings
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showAttendanceForm && (
        <AttendanceForm
          isUrdu={isUrdu}
          staffList={staff}
          defaultStaffId={selectedEmployeeId}
          defaultDate={`${selectedMonth}-01`}
          onClose={() => setShowAttendanceForm(false)}
          onSave={(data) => {
            console.log('Saving attendance data:', data);
            handleAddAttendance(data);
          }}
        />
      )}

      {showStaffForm && (
        <StaffForm
          isUrdu={isUrdu}
          onClose={() => {
            setShowStaffForm(false);
            setEditingStaff(null);
          }}
          onSave={handleSaveStaff}
          staff={editingStaff}
        />
      )}

      {deleteDialogOpen && staffToDelete && (
        <ConfirmStaffDeleteDialog
          isOpen={deleteDialogOpen}
          staffName={staffToDelete.name}
          isUrdu={isUrdu}
          onCancel={() => {
            setDeleteDialogOpen(false);
            setStaffToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
        />
      )}

      {showStaffReport && (
        <StaffReport
          isUrdu={isUrdu}
          staffList={staff}
          onClose={() => setShowStaffReport(false)}
        />
      )}

      {showRecordDetails && recordDetails && (
        <Dialog open={showRecordDetails} onOpenChange={setShowRecordDetails}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {recordDetails.type === 'leave'
                  ? 'Leave Details'
                  : recordDetails.type === 'deduction'
                    ? 'Deduction Details'
                    : 'Salary Details'}
              </DialogTitle>
              <DialogDescription>
                {selectedEmployee?.name ? `Staff: ${selectedEmployee.name}` : 'Record details'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 text-sm">
              {recordDetails.type === 'leave' ? (
                <>
                  <div><span className="font-medium">Date:</span> {formatDateOnly(recordDetails.date)}</div>
                  <div><span className="font-medium">Days:</span> {Number(recordDetails.days || 0)}</div>
                  <div><span className="font-medium">Type:</span> {recordDetails.typeName || recordDetails.leaveType || recordDetails.leave_type || recordDetails.leaveTypeName || recordDetails.type || '-'}</div>
                  <div><span className="font-medium">Reason:</span> {recordDetails.reason || '-'}</div>
                </>
              ) : recordDetails.type === 'deduction' ? (
                <>
                  <div><span className="font-medium">Date:</span> {formatDateOnly(recordDetails.date)}</div>
                  <div><span className="font-medium">Amount:</span> Rs {Number(recordDetails.amount || 0).toLocaleString()}</div>
                  <div><span className="font-medium">Reason:</span> {recordDetails.reason || recordDetails.note || '-'}</div>
                </>
              ) : (
                <>
                  <div><span className="font-medium">Month:</span> {recordDetails.month || '-'}</div>
                  <div><span className="font-medium">Amount:</span> Rs {Number(recordDetails.amount || 0).toLocaleString()}</div>
                  <div><span className="font-medium">Bonus:</span> Rs {Number(recordDetails.bonus || 0).toLocaleString()}</div>
                  <div><span className="font-medium">Date:</span> {recordDetails.date ? formatDateOnly(recordDetails.date) : '-'}</div>
                </>
              )}
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={() => setShowRecordDetails(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {showDeleteConfirm && (
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                {itemToDelete?.name ? 
                  `Are you sure you want to delete ${itemToDelete.name}?` :
                  'Are you sure you want to delete this record?'}
              </DialogDescription>
            </DialogHeader>
            {itemToDelete?.type && itemToDelete.type !== 'staff' ? (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteConfirmed}>
                  Delete
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
                  <p className="text-sm text-yellow-700">
                    This action requires double verification. Deleting cannot be undone.
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={confirmDelete}
                  >
                    First Verification
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={finalConfirmDelete}
                    disabled={!itemToDelete?.verified}
                  >
                    Final Confirm
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {showProfile && selectedEmployee && (
        <Dialog open={showProfile} onOpenChange={setShowProfile}>
          <DialogContent className="w-[calc(100vw-24px)] sm:w-full max-w-4xl max-h-[calc(100vh-120px)] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedEmployee.name}'s Profile</DialogTitle>
            </DialogHeader>

            {profileLoading ? (
              <div className="py-6 text-sm text-gray-600">Loading...</div>
            ) : (
              <div className="grid gap-4 py-2">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
                  <div className="text-sm text-gray-600">
                    <div><span className="font-medium">ID:</span> {selectedEmployee.staffCode || selectedEmployee._id || '-'}</div>
                    <div><span className="font-medium">Join Date:</span> {formatDateOnly(selectedEmployee.joinDate)}</div>
                  </div>
                  <div className="flex flex-col sm:items-end gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Month:</span>
                      <div className="min-w-[10rem]">
                        <MonthYearPicker value={profileMonth || selectedMonth} onChange={setProfileMonth} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Status:</span>
                      <Badge variant={(selectedEmployee.status || '').toLowerCase() === 'active' ? 'default' : 'destructive'}>
                        {(selectedEmployee.status || 'inactive').toString().charAt(0).toUpperCase() + (selectedEmployee.status || 'inactive').toString().slice(1)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {(() => {
                  const ym = profileYm;

                  if (profileIsBeforeJoinMonth) {
                    return (
                      <div className="rounded-md border bg-gray-50 p-6 text-center text-sm text-gray-700">
                        <div className="font-medium">No Data</div>
                        <div className="mt-1 text-gray-600">
                          {`No Data. ${selectedEmployee?.name || 'Staff'} joined in ${profileJoinMonthLabel || profileJoinMonth}.`}
                        </div>
                      </div>
                    );
                  }

                  const baseSalary = Number(selectedEmployee.salary || 0);
                  const paidAbsentDays = Math.max(0, Number((attendanceSettings as any)?.paidAbsentDays || 0) || 0);
                  const perAbsent = Math.max(0, Number((attendanceSettings as any)?.absentDeduction || 0) || 0);
                  const perLate = Math.max(0, Number((attendanceSettings as any)?.lateDeduction || 0) || 0);

                  const officialDaysOff = Array.isArray((attendanceSettings as any)?.officialDaysOff)
                    ? ((attendanceSettings as any).officialDaysOff as any[]).map((x) => Number(x)).filter((n) => Number.isFinite(n) && n >= 0 && n <= 6)
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

                  const dateKey = (val: any) => {
                    const s = String(val || '');
                    const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
                    return m ? m[1] : s.slice(0, 10);
                  };

                  const leaveDays = new Set(
                    (leaveRecords || [])
                      .filter((l: any) => String(l.date || '').startsWith(ym))
                      .map((l: any) => dateKey(l.date))
                  );

                  const byDay: Record<string, any> = {};
                  for (const r of profileMonthlyRows || []) {
                    const key = dateKey(r.date);
                    byDay[key] = { ...r, date: key };
                  }

                  const [yy, mm] = ym.split('-').map(Number);
                  const days = new Date(yy, mm, 0).getDate();
                  const today = new Date(`${serverToday}T00:00:00`);
                  const isCurrentMonth = today.getFullYear() === yy && (today.getMonth() + 1) === mm;
                  const lastDay = isCurrentMonth ? Math.min(days, today.getDate()) : days;

                  for (let d = 1; d <= lastDay; d++) {
                    const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
                    const dayISO = `${yy}-${pad(mm)}-${pad(d)}`;
                    const wk = weekdayFromISO(dayISO);
                    const isOff = wk != null && officialDaysOff.includes(wk);

                    if (byDay[dayISO]) {
                      const st = String(byDay[dayISO]?.status || '').toLowerCase();
                      if (isOff && st === 'absent') byDay[dayISO] = { ...byDay[dayISO], status: 'official_off' };
                      continue;
                    }

                    byDay[dayISO] = {
                      staffId: selectedEmployee?._id,
                      date: dayISO,
                      checkIn: null,
                      checkOut: null,
                      status: leaveDays.has(dayISO) ? 'leave' : (isOff ? 'official_off' : 'absent'),
                    };
                  }

                  const rows = Object.values(byDay);
                  const lower = (s: any) => String(s || '').toLowerCase();
                  const present = rows.filter((r: any) => {
                    const st = lower(r.status);
                    return st === 'present' || st === 'late';
                  }).length;
                  const late = rows.filter((r: any) => lower(r.status) === 'late').length;
                  const officialOff = rows.filter((r: any) => lower(r.status) === 'official_off').length;
                  const absent = rows.filter((r: any) => lower(r.status) === 'absent').length;
                  const paidLeavesUsed = Math.min(paidAbsentDays, absent);
                  const unpaidAbsents = Math.max(0, absent - paidAbsentDays);

                  const monthDeductionRows = (deductionRecords || []).filter((d: any) => String(d.date || '').startsWith(ym));
                  const norm = (v: any) => String(v || '').trim().toLowerCase();
                  let dbLate = 0;
                  let dbAbsent = 0;
                  let dbManual = 0;
                  for (const r of monthDeductionRows) {
                    const amt = Number(r.amount) || 0;
                    const reason = norm(r.reason);
                    if (reason === 'late deduction') dbLate += amt;
                    else if (reason === 'absent deduction') dbAbsent += amt;
                    else dbManual += amt;
                  }

                  const lateDeductionCalc = perLate * late;
                  const absentDeductionCalc = perAbsent * unpaidAbsents;
                  const lateDeductionEffective = dbLate > 0 ? dbLate : lateDeductionCalc;
                  const absentDeductionEffective = unpaidAbsents <= 0 ? 0 : (dbAbsent > 0 && Math.abs(dbAbsent - absentDeductionCalc) < 0.01 ? dbAbsent : absentDeductionCalc);
                  const totalDeductions = dbManual + lateDeductionEffective + absentDeductionEffective;
                  const netSalary = Math.max(0, baseSalary - totalDeductions);

                  return (
                    <div className="grid gap-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="rounded-md border p-3">
                          <div className="text-xs text-gray-600">Base Salary</div>
                          <div className="text-lg font-semibold">{baseSalary.toLocaleString()}</div>
                        </div>
                        <div className="rounded-md border p-3">
                          <div className="text-xs text-gray-600">Total Deductions</div>
                          <div className="text-lg font-semibold">{totalDeductions.toLocaleString()}</div>
                        </div>
                        <div className="rounded-md border p-3">
                          <div className="text-xs text-gray-600">Net Salary</div>
                          <div className="text-lg font-semibold">{netSalary.toLocaleString()}</div>
                        </div>
                        <div className="rounded-md border p-3">
                          <div className="text-xs text-gray-600">Paid Leaves</div>
                          <div className="text-lg font-semibold">{paidLeavesUsed}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        <div className="rounded-md border p-3">
                          <div className="text-xs text-gray-600">Present</div>
                          <div className="text-lg font-semibold">{present}</div>
                        </div>
                        <div className="rounded-md border p-3">
                          <div className="text-xs text-gray-600">Late</div>
                          <div className="text-lg font-semibold">{late}</div>
                        </div>
                        <div className="rounded-md border p-3">
                          <div className="text-xs text-gray-600">Official Off</div>
                          <div className="text-lg font-semibold">{officialOff}</div>
                        </div>
                        <div className="rounded-md border p-3">
                          <div className="text-xs text-gray-600">Unpaid Absent</div>
                          <div className="text-lg font-semibold">{unpaidAbsents}</div>
                        </div>
                        <div className="rounded-md border p-3">
                          <div className="text-xs text-gray-600">Absent Deduction</div>
                          <div className="text-lg font-semibold">{absentDeductionEffective.toLocaleString()}</div>
                        </div>
                      </div>

                      {profileMonthlyLoading ? (
                        <div className="text-sm text-gray-600">Loading month data...</div>
                      ) : null}
                    </div>
                  );
                })()}

                {!profileIsBeforeJoinMonth ? (
                  <>
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      <Button
                        variant="outline"
                        disabled={!modulePerm.edit}
                        onClick={() => {
                          if (!modulePerm.edit) {
                            toast({ title: isUrdu ? 'اجازت نہیں ہے' : 'Not allowed', description: isUrdu ? 'آپ کے پاس صرف دیکھنے کی اجازت ہے' : 'You only have view permission for Staff Attendance.', variant: 'destructive' });
                            return;
                          }
                          setShowLeaveDialog(true);
                        }}
                      >
                        Add Leave
                      </Button>
                      <Button
                        variant="outline"
                        disabled={!modulePerm.edit}
                        onClick={() => {
                          if (!modulePerm.edit) {
                            toast({ title: isUrdu ? 'اجازت نہیں ہے' : 'Not allowed', description: isUrdu ? 'آپ کے پاس صرف دیکھنے کی اجازت ہے' : 'You only have view permission for Staff Attendance.', variant: 'destructive' });
                            return;
                          }
                          setShowDeductionDialog(true);
                        }}
                      >
                        Add Deduction
                      </Button>
                      <Button
                        variant="outline"
                        disabled={!modulePerm.edit}
                        onClick={() => {
                          if (!modulePerm.edit) {
                            toast({ title: isUrdu ? 'اجازت نہیں ہے' : 'Not allowed', description: isUrdu ? 'آپ کے پاس صرف دیکھنے کی اجازت ہے' : 'You only have view permission for Staff Attendance.', variant: 'destructive' });
                            return;
                          }
                          setShowSalaryDialog(true);
                        }}
                      >
                        Add Salary
                      </Button>
                      <div className="sm:ml-auto">
                        <Button type="button" onClick={() => setShowProfile(false)}>Close</Button>
                      </div>
                    </div>

                    <div className="grid gap-4">
                      <div>
                        <h3 className="font-medium">Clock In/Out History</h3>
                        <div className="space-y-2 mt-2">
                          {(selectedEmployee.attendance && selectedEmployee.attendance.length > 0) ? (
                            selectedEmployee.attendance.map((entry: any) => (
                              <div key={entry._id || entry.date} className="flex flex-col sm:flex-row sm:justify-between gap-1 rounded-md border px-3 py-2 text-sm">
                                <span className="font-medium">{formatDateOnly(entry.date)}</span>
                                <span className="text-gray-700">
                                  In: {displayTime(entry.checkIn || entry.checkInTime)} | Out: {displayTime(entry.checkOut || entry.checkOutTime)}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">No attendance records</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="font-medium">Leaves</h3>
                        {leaveRecords.length ? (
                          <div className="space-y-1 mt-2">
                            {leaveRecords.slice(0, 5).map((r: any) => (
                              <div key={r._id || r.id} className="flex justify-between items-center text-sm">
                                <span>{r.date} ({r.days})</span>
                                <div className="flex items-center gap-2">
                                  <Button size="sm" variant="outline" onClick={() => handleViewRecordDetails(r, 'leave')}>
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="outline" disabled={!modulePerm.delete} onClick={() => handleDeleteConfirmation(r, 'leave')}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground mt-2">No leave records</p>
                        )}
                      </div>

                      <div>
                        <h3 className="font-medium">Deductions</h3>
                        {deductionRecords.length ? (
                          <div className="space-y-1 mt-2">
                            {deductionRecords.slice(0, 5).map((r: any) => (
                              <div key={r._id || r.id} className="flex justify-between items-center text-sm">
                                <span>{r.date} (Rs {Number(r.amount || 0).toLocaleString()})</span>
                                <div className="flex items-center gap-2">
                                  <Button size="sm" variant="outline" onClick={() => handleViewRecordDetails(r, 'deduction')}>
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="outline" disabled={!modulePerm.delete} onClick={() => handleDeleteConfirmation(r, 'deduction')}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground mt-2">No deduction records</p>
                        )}
                      </div>

                      <div>
                        <h3 className="font-medium">Salaries</h3>
                        {salaryRecords.length ? (
                          <div className="space-y-1 mt-2">
                            {salaryRecords.slice(0, 5).map((r: any) => (
                              <div key={r._id || r.id} className="flex justify-between items-center text-sm">
                                <span>{r.month} (Rs {Number(r.amount || 0).toLocaleString()})</span>
                                <div className="flex items-center gap-2">
                                  <Button size="sm" variant="outline" onClick={() => handleViewRecordDetails(r, 'salary')}>
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="outline" disabled={!modulePerm.delete} onClick={() => handleDeleteConfirmation(r, 'salary')}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground mt-2">No salary records</p>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-end">
                    <Button type="button" onClick={() => setShowProfile(false)}>Close</Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {showLeaveDialog && (
        <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Leave</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1">
                <Label>Days</Label>
                <Input type="number" value={leaveData.days} onChange={(e) => setLeaveData({ ...leaveData, days: Number(e.target.value) || 0 })} />
              </div>
              <div className="grid gap-1">
                <Label>Type</Label>
                <Input value={leaveData.type} onChange={(e) => setLeaveData({ ...leaveData, type: e.target.value })} />
              </div>
              <div className="grid gap-1">
                <Label>Reason</Label>
                <Input value={leaveData.reason} onChange={(e) => setLeaveData({ ...leaveData, reason: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowLeaveDialog(false)}>Cancel</Button>
                <Button onClick={handleAddLeave} disabled={!modulePerm.edit}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {showDeductionDialog && (
        <Dialog open={showDeductionDialog} onOpenChange={setShowDeductionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Deduction</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1">
                <Label>Amount</Label>
                <Input type="number" value={deductionData.amount} onChange={(e) => setDeductionData({ ...deductionData, amount: Number(e.target.value) || 0 })} />
              </div>
              <div className="grid gap-1">
                <Label>Reason</Label>
                <Input value={deductionData.reason} onChange={(e) => setDeductionData({ ...deductionData, reason: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDeductionDialog(false)}>Cancel</Button>
                <Button onClick={handleAddDeduction} disabled={!modulePerm.edit}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {showSalaryDialog && (
        <Dialog open={showSalaryDialog} onOpenChange={setShowSalaryDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Salary</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1">
                <Label>Month (YYYY-MM)</Label>
                <Input value={salaryDataState.month} onChange={(e) => setSalaryDataState({ ...salaryDataState, month: e.target.value })} placeholder="2025-12" />
              </div>
              <div className="grid gap-1">
                <Label>Amount</Label>
                <Input type="number" value={salaryDataState.amount} onChange={(e) => setSalaryDataState({ ...salaryDataState, amount: Number(e.target.value) || 0 })} />
              </div>
              <div className="grid gap-1">
                <Label>Bonus</Label>
                <Input type="number" value={salaryDataState.bonus} onChange={(e) => setSalaryDataState({ ...salaryDataState, bonus: Number(e.target.value) || 0 })} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowSalaryDialog(false)}>Cancel</Button>
                <Button onClick={handleAddSalary} disabled={!modulePerm.edit}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default StaffAttendance;
