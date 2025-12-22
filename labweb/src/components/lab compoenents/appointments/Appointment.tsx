import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TestSelect from "@/components/lab compoenents/ui/TestSelect";
import { TestType } from "@/lab types/sample";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Eye, Plus, Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/api";

interface AppointmentRecord {
  id: string;
  patientName: string;
  patientId: string;
  contact: string;
  address?: string;
  referringDoctor?: string;
  testPriority?: "normal" | "urgent";
  homeSamplingPriority?: "normal" | "urgent";
  test: string;
  date: string;
  time: string;
  status: "Confirmed" | "Pending" | "Cancelled";
  cnic?: string;
  gender?: string;
  age?: number;
  guardian?: string;
  guardianName?: string;
  payment?: string;
}

const formatDisplayDateTime = (date: string, time: string) => {
  if (!date && !time) return "-";
  try {
    const [year, month, day] = date.split("-").map((v) => parseInt(v, 10));
    if (!year || !month || !day) return `${date} ${time}`.trim();
    const [hh = "0", mm = "0"] = time.split(":");
    const d = new Date(year, month - 1, day, parseInt(hh, 10), parseInt(mm, 10));
    return d.toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return `${date} ${time}`.trim();
  }
};

const Appointment: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentRecord | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteAppointment, setPendingDeleteAppointment] = useState<AppointmentRecord | null>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentRecord | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [availableTests, setAvailableTests] = useState<TestType[]>([]);
  const [selectedTests, setSelectedTests] = useState<TestType[]>([]);
  const [editSelectedTests, setEditSelectedTests] = useState<TestType[]>([]);

  const [taxRate, setTaxRate] = useState<number>(0);
  const [discountRate, setDiscountRate] = useState<number>(0);
  const [urgentUpliftRate, setUrgentUpliftRate] = useState<number>(0);

  const [homeSamplingChargesRate, setHomeSamplingChargesRate] = useState<number>(0);
  const [homeSamplingChargesUrgentRate, setHomeSamplingChargesUrgentRate] = useState<number>(0);

  const [createForm, setCreateForm] = useState({
    fullName: "",
    phone: "",
    cnic: "",
    selectedGuardian: "none",
    guardianName: "",
    referringDoctor: "",
    address: "",
    gender: "",
    age: "",
    date: "",
    time: "",
    testPriority: "normal" as "normal" | "urgent",
    homeSamplingPriority: "normal" as "normal" | "urgent",
    paymentMethod: "" as string,
  });

  const [editForm, setEditForm] = useState({
    fullName: "",
    phone: "",
    cnic: "",
    selectedGuardian: "none",
    guardianName: "",
    referringDoctor: "",
    address: "",
    gender: "",
    age: "",
    date: "",
    time: "",
    testPriority: "normal" as "normal" | "urgent",
    homeSamplingPriority: "normal" as "normal" | "urgent",
    paymentMethod: "" as string,
  });

  const [createTouched, setCreateTouched] = useState({
    fullName: false,
    phone: false,
    cnic: false,
    gender: false,
    age: false,
    date: false,
    time: false,
    guardianName: false,
    referringDoctor: false,
  });

  const [editTouched, setEditTouched] = useState({
    fullName: false,
    phone: false,
    cnic: false,
    gender: false,
    age: false,
    date: false,
    time: false,
    guardianName: false,
    referringDoctor: false,
  });

  const normalizePhone = (raw: string) => {
    const v = String(raw || '').trim();
    if (v.startsWith('+')) {
      const digits = v.replace(/[^\d]/g, '');
      return `+${digits}`.slice(0, 13);
    }
    return v.replace(/\D/g, '').slice(0, 11);
  };

  const isValidFullName = (name: string) => {
    const v = String(name || '').trim();
    if (!v) return false;
    return !/\d/.test(v);
  };

  const isValidPhone = (phone: string) => {
    const v = String(phone || '').trim();
    if (v.startsWith('+')) {
      return /^\+923\d{9}$/.test(v);
    }
    return /^03\d{9}$/.test(v);
  };

  const parseValidAge = (ageRaw: string) => {
    const digits = String(ageRaw || '').replace(/\D/g, '');
    if (!digits) return null;
    const n = parseInt(digits, 10);
    if (!Number.isFinite(n)) return null;
    if (n < 1 || n > 120) return null;
    return n;
  };

  const selectedTestError = (createTouched as any).selectedTest && selectedTests.length === 0
    ? 'Test is required'
    : '';
  const fullNameError = createTouched.fullName && !isValidFullName(createForm.fullName)
    ? 'Full name is required and cannot contain numbers'
    : '';
  const phoneError = createTouched.phone
    ? !createForm.phone
      ? 'Phone is required'
      : !isValidPhone(createForm.phone)
        ? 'Phone must be 03XXXXXXXXX or +923XXXXXXXXX'
        : ''
    : '';
  const cnicError = createTouched.cnic && (!createForm.cnic || createForm.cnic.length !== 13)
    ? 'CNIC must be exactly 13 digits (no dashes)'
    : '';
  const ageError = createTouched.age && parseValidAge(createForm.age) === null
    ? 'Age must be between 1 and 120'
    : '';
  const genderError = createTouched.gender && !createForm.gender
    ? 'Gender is required'
    : '';
  const dateError = createTouched.date && !createForm.date
    ? 'Date is required'
    : '';
  const timeError = createTouched.time && !createForm.time
    ? 'Time is required'
    : '';
  const guardianNameError = createTouched.guardianName && createForm.guardianName && /\d/.test(createForm.guardianName)
    ? 'Guardian name cannot contain numbers'
    : '';
  const referringDoctorError = createTouched.referringDoctor && createForm.referringDoctor && /\d/.test(createForm.referringDoctor)
    ? 'Referring Doctor cannot contain numbers'
    : '';

  const getBaseTotalAmount = () => selectedTests.reduce((t, s) => t + (Number((s as any)?.price) || 0), 0);
  const getEditBaseTotalAmount = () => editSelectedTests.reduce((t, s) => t + (Number((s as any)?.price) || 0), 0);

  const getSubtotalAfterUrgent = () => {
    const base = getBaseTotalAmount();
    if (createForm.testPriority !== 'urgent') return base;
    const uplift = Number(urgentUpliftRate) || 0;
    return base * (1 + uplift / 100);
  };

  const getUrgentExtraAmount = () => Math.max(0, getSubtotalAfterUrgent() - getBaseTotalAmount());

  const getEditSubtotalAfterUrgent = () => {
    const base = getEditBaseTotalAmount();
    if (editForm.testPriority !== 'urgent') return base;
    const uplift = Number(urgentUpliftRate) || 0;
    return base * (1 + uplift / 100);
  };
  const getEditUrgentExtraAmount = () => Math.max(0, getEditSubtotalAfterUrgent() - getEditBaseTotalAmount());

  const getDiscountAmount = () => {
    const base = getSubtotalAfterUrgent();
    const dr = Number(discountRate) || 0;
    return base * (dr / 100);
  };

  const getSubtotalAfterDiscount = () => getSubtotalAfterUrgent() - getDiscountAmount();

  const getEditDiscountAmount = () => {
    const base = getEditSubtotalAfterUrgent();
    const dr = Number(discountRate) || 0;
    return base * (dr / 100);
  };
  const getEditSubtotalAfterDiscount = () => getEditSubtotalAfterUrgent() - getEditDiscountAmount();

  const getTaxAmount = () => {
    const base = getSubtotalAfterDiscount();
    const tr = Number(taxRate) || 0;
    return base * (tr / 100);
  };

  const getSubtotalAfterTax = () => getSubtotalAfterDiscount() + getTaxAmount();

  const getEditTaxAmount = () => {
    const base = getEditSubtotalAfterDiscount();
    const tr = Number(taxRate) || 0;
    return base * (tr / 100);
  };
  const getEditSubtotalAfterTax = () => getEditSubtotalAfterDiscount() + getEditTaxAmount();

  const getHomeSamplingRate = () => {
    if (createForm.homeSamplingPriority === 'urgent') return Number(homeSamplingChargesUrgentRate) || 0;
    return Number(homeSamplingChargesRate) || 0;
  };

  const getHomeSamplingAmount = () => {
    const base = getSubtotalAfterTax();
    const rate = getHomeSamplingRate();
    return base * (rate / 100);
  };

  const getFinalTotalAmount = () => getSubtotalAfterTax() + getHomeSamplingAmount();

  const getEditHomeSamplingRate = () => {
    if (editForm.homeSamplingPriority === 'urgent') return Number(homeSamplingChargesUrgentRate) || 0;
    return Number(homeSamplingChargesRate) || 0;
  };
  const getEditHomeSamplingAmount = () => {
    const base = getEditSubtotalAfterTax();
    const rate = getEditHomeSamplingRate();
    return base * (rate / 100);
  };
  const getEditFinalTotalAmount = () => getEditSubtotalAfterTax() + getEditHomeSamplingAmount();

  const mapTestNamesToObjects = (names: string[]) => {
    const wanted = new Set(names.map((n) => String(n || '').trim().toLowerCase()).filter(Boolean));
    if (!wanted.size) return [] as TestType[];
    return availableTests.filter((t: any) => wanted.has(String(t?.name || '').trim().toLowerCase()));
  };

  const loadAppointments = async () => {
    try {
      const { data } = await api.get<{
        success?: boolean;
        appointments?: any[];
      }>("/appointments/admin");

      const source = data && Array.isArray((data as any).appointments)
        ? (data as any).appointments
        : Array.isArray(data)
          ? (data as any)
          : [];

      const mapped: AppointmentRecord[] = source.map((apt: any) => ({
        id: String(apt._id || ""),
        patientName: apt.patientName || "-",
        patientId: apt.appointmentCode || (apt._id ? String(apt._id).slice(-6) : "-"),
        contact: apt.contact || "-",
        address: apt.address,
        referringDoctor: apt.referringDoctor,
        testPriority: (apt.testPriority || apt.priority) as any,
        homeSamplingPriority: apt.homeSamplingPriority as any,
        test: apt.testName || "-",
        date: apt.date || "",
        time: apt.time || "",
        status: ((apt.status === 'Completed' ? 'Confirmed' : (apt.status || 'Pending')) as AppointmentRecord["status"]),
        cnic: apt.cnic,
        gender: apt.gender,
        age: typeof apt.age === "number" ? apt.age : undefined,
        guardian: apt.guardian,
        guardianName: apt.guardianName,
        payment: apt.paymentStatus,
      }));

      setAppointments(mapped);
    } catch (err) {
      console.error("Failed to load lab appointments from labTech-backend", err);
      setAppointments([]);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  useEffect(() => {
    api
      .get("/tests")
      .then((res) => {
        const arr = res.data;
        if (Array.isArray(arr)) {
          setAvailableTests(arr as any[]);
        } else {
          setAvailableTests([]);
        }
      })
      .catch(() => {
        setAvailableTests([]);
      });
  }, []);

  useEffect(() => {
    api
      .get('/settings')
      .then((res) => {
        const pricing = (res.data && (res.data as any).pricing) || {};
        const tr = parseFloat(String(pricing.taxRate ?? ''));
        const dr = parseFloat(String(pricing.bulkDiscountRate ?? ''));
        const ur = parseFloat(String(pricing.urgentTestUpliftRate ?? ''));
        const hs = parseFloat(String(pricing.homeSamplingChargesRate ?? ''));
        const hsu = parseFloat(String(pricing.homeSamplingChargesUrgentRate ?? ''));
        setTaxRate(Number.isFinite(tr) ? tr : 0);
        setDiscountRate(Number.isFinite(dr) ? dr : 0);
        setUrgentUpliftRate(Number.isFinite(ur) ? ur : 0);
        setHomeSamplingChargesRate(Number.isFinite(hs) ? hs : 0);
        setHomeSamplingChargesUrgentRate(Number.isFinite(hsu) ? hsu : 0);
      })
      .catch(() => {
        setTaxRate(0);
        setDiscountRate(0);
        setUrgentUpliftRate(0);
        setHomeSamplingChargesRate(0);
        setHomeSamplingChargesUrgentRate(0);
      });
  }, []);

  const openCreateDialog = () => {
    setCreateError(null);
    setSelectedTests([]);
    setCreateForm({
      fullName: "",
      phone: "",
      cnic: "",
      selectedGuardian: "none",
      guardianName: "",
      referringDoctor: "",
      address: "",
      gender: "",
      age: "",
      date: "",
      time: "",
      testPriority: "normal",
      homeSamplingPriority: "normal",
      paymentMethod: "",
    });
    setCreateTouched({
      fullName: false,
      phone: false,
      cnic: false,
      gender: false,
      age: false,
      date: false,
      time: false,
      guardianName: false,
      referringDoctor: false,
    });
    setIsCreateOpen(true);
  };

  const submitCreateAppointment = async () => {
    setCreateError(null);

    setCreateTouched({
      fullName: true,
      phone: true,
      cnic: true,
      gender: true,
      age: true,
      date: true,
      time: true,
      guardianName: true,
      referringDoctor: true,
    });

    // mark test field as touched
    setCreateTouched((p: any) => ({ ...p, selectedTest: true }));

    if (selectedTests.length === 0) return;
    if (!isValidFullName(createForm.fullName)) return;
    if (!isValidPhone(createForm.phone)) return;
    if (!createForm.cnic || createForm.cnic.length !== 13) return;
    if (!createForm.gender) return;
    const ageNum = parseValidAge(createForm.age);
    if (ageNum === null) return;
    if (!createForm.date) return;
    if (!createForm.time) return;
    if (createForm.guardianName && /\d/.test(createForm.guardianName)) return;
    if (createForm.referringDoctor && /\d/.test(createForm.referringDoctor)) return;

    setIsCreating(true);
    try {
      const selectedTest = selectedTests.map((t) => t?.name).filter(Boolean).join(", ");
      await api.post("/appointments/admin", {
        selectedTest,
        fullName: createForm.fullName.trim(),
        email: normalizePhone(createForm.phone),
        cnic: createForm.cnic.trim(),
        selectedGuardian: createForm.selectedGuardian === "none" ? "" : (createForm.selectedGuardian || ""),
        guardianName: createForm.guardianName || "",
        referringDoctor: createForm.referringDoctor || "",
        address: createForm.address || "",
        priority: createForm.testPriority,
        testPriority: createForm.testPriority,
        homeSamplingPriority: createForm.homeSamplingPriority,
        gender: createForm.gender,
        age: ageNum,
        date: createForm.date,
        time: createForm.time,
        testFee: getFinalTotalAmount(),
        paymentMethod: createForm.paymentMethod === 'none' ? '' : (createForm.paymentMethod || ""),
      });

      setIsCreateOpen(false);
      await loadAppointments();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Failed to create appointment";
      setCreateError(msg);
    } finally {
      setIsCreating(false);
    }
  };

  const handleStatusChange = async (
    appt: AppointmentRecord,
    newStatus: AppointmentRecord["status"]
  ) => {
    if (appt.status === newStatus) return;
    const previousStatus = appt.status;

    try {
      setAppointments((prev) =>
        prev.map((a) => (a.id === appt.id ? { ...a, status: newStatus } : a))
      );

      await api.patch(`/appointments/admin/${appt.id}/status`, {
        status: newStatus,
      });
    } catch (err) {
      console.error("Failed to update appointment status from web", err);
      setAppointments((prev) =>
        prev.map((a) => (a.id === appt.id ? { ...a, status: previousStatus } : a))
      );
    }
  };

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return appointments.filter((appt) => {
      if (statusFilter !== "all" && appt.status !== statusFilter) return false;
      if (term) {
        const haystack = `${appt.patientName} ${appt.patientId} ${appt.test} ${appt.contact} ${appt.address ?? ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [appointments, searchTerm, statusFilter]);

  const openDetailDialog = (appt: AppointmentRecord) => {
    setSelectedAppointment(appt);
    setIsDetailOpen(true);
  };

  const closeDetailDialog = () => {
    setIsDetailOpen(false);
    setSelectedAppointment(null);
  };

  const handleDeleteAppointment = (appt: AppointmentRecord) => {
    setPendingDeleteAppointment(appt);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAppointment = async () => {
    const appt = pendingDeleteAppointment;
    setShowDeleteConfirm(false);
    setPendingDeleteAppointment(null);

    if (!appt?.id) return;

    try {
      await api.delete(`/appointments/admin/${appt.id}`);
      await loadAppointments();
    } catch (err) {
      console.error('Failed to delete appointment', err);
    }
  };

  const openEditDialog = (appt: AppointmentRecord) => {
    setEditError(null);
    setEditingAppointment(appt);

    const tests = String(appt.test || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setEditSelectedTests(mapTestNamesToObjects(tests));

    setEditForm({
      fullName: appt.patientName || "",
      phone: appt.contact || "",
      cnic: appt.cnic || "",
      selectedGuardian: appt.guardian || "none",
      guardianName: appt.guardianName || "",
      referringDoctor: appt.referringDoctor || "",
      address: appt.address || "",
      gender: appt.gender || "",
      age: appt.age ? String(appt.age) : "",
      date: appt.date || "",
      time: appt.time || "",
      testPriority: (appt.testPriority || "normal") as any,
      homeSamplingPriority: (appt.homeSamplingPriority || "normal") as any,
      paymentMethod: "none",
    });
    setEditTouched({
      fullName: false,
      phone: false,
      cnic: false,
      gender: false,
      age: false,
      date: false,
      time: false,
      guardianName: false,
      referringDoctor: false,
    });

    setIsEditOpen(true);
  };

  const submitEditAppointment = async () => {
    setEditError(null);
    setEditTouched({
      fullName: true,
      phone: true,
      cnic: true,
      gender: true,
      age: true,
      date: true,
      time: true,
      guardianName: true,
      referringDoctor: true,
    });

    if (!editingAppointment?.id) return;
    if (editSelectedTests.length === 0) return;
    if (!isValidFullName(editForm.fullName)) return;
    if (!isValidPhone(editForm.phone)) return;
    if (!editForm.cnic || editForm.cnic.length !== 13) return;
    if (!editForm.gender) return;
    const ageNum = parseValidAge(editForm.age);
    if (ageNum === null) return;
    if (!editForm.date) return;
    if (!editForm.time) return;
    if (editForm.guardianName && /\d/.test(editForm.guardianName)) return;
    if (editForm.referringDoctor && /\d/.test(editForm.referringDoctor)) return;

    setIsUpdating(true);
    try {
      const selectedTest = editSelectedTests.map((t) => t?.name).filter(Boolean).join(", ");
      await api.patch(`/appointments/admin/${editingAppointment.id}`, {
        selectedTest,
        fullName: editForm.fullName.trim(),
        email: normalizePhone(editForm.phone),
        cnic: editForm.cnic.trim(),
        selectedGuardian: editForm.selectedGuardian === "none" ? "" : (editForm.selectedGuardian || ""),
        guardianName: editForm.guardianName || "",
        referringDoctor: editForm.referringDoctor || "",
        address: editForm.address || "",
        priority: editForm.testPriority,
        testPriority: editForm.testPriority,
        homeSamplingPriority: editForm.homeSamplingPriority,
        gender: editForm.gender,
        age: ageNum,
        date: editForm.date,
        time: editForm.time,
        testFee: getEditFinalTotalAmount(),
        paymentMethod: editForm.paymentMethod === 'none' ? '' : (editForm.paymentMethod || ""),
      });
      setIsEditOpen(false);
      setEditingAppointment(null);
      await loadAppointments();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Failed to update appointment";
      setEditError(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointment Management</h1>
          <p className="text-sm text-gray-600">
            View, search, and manage all patient appointments.
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Add New Appointment
        </Button>
      </div>

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) setCreateError(null);
        }}
      >
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-[560px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Appointment</DialogTitle>
            <DialogDescription>Enter appointment details and create a new booking.</DialogDescription>
          </DialogHeader>

          {createError && <div className="text-sm text-red-600">{createError}</div>}

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Label>Test *</Label>
                <div className="mt-1">
                  <TestSelect
                    tests={availableTests}
                    selected={selectedTests}
                    onChange={setSelectedTests}
                  />
                </div>
                {selectedTestError && <div className="text-sm text-red-600 mt-1">{selectedTestError}</div>}
              </div>
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Test Priority</Label>
                  <Select
                    value={createForm.testPriority}
                    onValueChange={(v) => setCreateForm((p) => ({ ...p, testPriority: v as any }))}
                  >
                    <SelectTrigger className="h-10 mt-1">
                      <SelectValue placeholder="Select test priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Home Sampling Priority</Label>
                  <Select
                    value={createForm.homeSamplingPriority}
                    onValueChange={(v) => setCreateForm((p) => ({ ...p, homeSamplingPriority: v as any }))}
                  >
                    <SelectTrigger className="h-10 mt-1">
                      <SelectValue placeholder="Select home sampling priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Full Name *</Label>
                <Input
                  value={createForm.fullName}
                  placeholder="Enter full name"
                  onChange={(e) => {
                    const v = (e.target.value || '').replace(/\d/g, '');
                    setCreateForm((p) => ({ ...p, fullName: v }));
                  }}
                  onBlur={() => setCreateTouched((p) => ({ ...p, fullName: true }))}
                  className="h-10"
                />
                {fullNameError && <div className="text-sm text-red-600 mt-1">{fullNameError}</div>}
              </div>
              <div>
                <Label>Phone *</Label>
                <Input
                  value={createForm.phone}
                  placeholder="03XXXXXXXXX or +923XXXXXXXXX"
                  inputMode="tel"
                  maxLength={13}
                  onChange={(e) => {
                    const next = normalizePhone(e.target.value);
                    setCreateForm((p) => ({ ...p, phone: next }));
                  }}
                  onBlur={() => setCreateTouched((p) => ({ ...p, phone: true }))}
                  className="h-10"
                />
                {phoneError && <div className="text-sm text-red-600 mt-1">{phoneError}</div>}
              </div>
              <div>
                <Label>CNIC *</Label>
                <Input
                  value={createForm.cnic}
                  placeholder="Enter 13-digit CNIC"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={13}
                  onChange={(e) => {
                    const digits = (e.target.value || "").replace(/\D/g, "").slice(0, 13);
                    setCreateForm((p) => ({ ...p, cnic: digits }));
                  }}
                  onBlur={() => setCreateTouched((p) => ({ ...p, cnic: true }))}
                  className="h-10"
                />
                {cnicError && <div className="text-sm text-red-600 mt-1">{cnicError}</div>}
              </div>
              <div>
                <Label>Age *</Label>
                <Input
                  value={createForm.age}
                  placeholder="Enter age"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  onChange={(e) => {
                    const digits = (e.target.value || '').replace(/\D/g, '').slice(0, 3);
                    setCreateForm((p) => ({ ...p, age: digits }));
                  }}
                  onBlur={() => setCreateTouched((p) => ({ ...p, age: true }))}
                  className="h-10"
                />
                {ageError && <div className="text-sm text-red-600 mt-1">{ageError}</div>}
              </div>
              <div>
                <Label>Gender *</Label>
                <Select
                  value={createForm.gender}
                  onValueChange={(v) => setCreateForm((p) => ({ ...p, gender: v }))}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {genderError && <div className="text-sm text-red-600 mt-1">{genderError}</div>}
              </div>
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={createForm.date}
                  onChange={(e) => setCreateForm((p) => ({ ...p, date: e.target.value }))}
                  onBlur={() => setCreateTouched((p) => ({ ...p, date: true }))}
                  className="h-10"
                />
                {dateError && <div className="text-sm text-red-600 mt-1">{dateError}</div>}
              </div>
              <div>
                <Label>Time *</Label>
                <Input
                  type="time"
                  value={createForm.time}
                  onChange={(e) => setCreateForm((p) => ({ ...p, time: e.target.value }))}
                  onBlur={() => setCreateTouched((p) => ({ ...p, time: true }))}
                  className="h-10"
                />
                {timeError && <div className="text-sm text-red-600 mt-1">{timeError}</div>}
              </div>
              <div>
                <Label>Guardian Relation</Label>
                <Select
                  value={createForm.selectedGuardian}
                  onValueChange={(v) => setCreateForm((p) => ({ ...p, selectedGuardian: v }))}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="S/O">S/O</SelectItem>
                    <SelectItem value="D/O">D/O</SelectItem>
                    <SelectItem value="W/O">W/O</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Guardian Name</Label>
                <Input
                  value={createForm.guardianName}
                  placeholder="Enter guardian name"
                  onChange={(e) => {
                    const v = (e.target.value || '').replace(/\d/g, '');
                    setCreateForm((p) => ({ ...p, guardianName: v }));
                  }}
                  onBlur={() => setCreateTouched((p) => ({ ...p, guardianName: true }))}
                  className="h-10"
                />
                {guardianNameError && <div className="text-sm text-red-600 mt-1">{guardianNameError}</div>}
              </div>
              <div>
                <Label>Referring Doctor</Label>
                <Input
                  value={createForm.referringDoctor}
                  placeholder="Enter referring doctor"
                  onChange={(e) => {
                    const v = (e.target.value || '').replace(/\d/g, '');
                    setCreateForm((p) => ({ ...p, referringDoctor: v }));
                  }}
                  onBlur={() => setCreateTouched((p) => ({ ...p, referringDoctor: true }))}
                  className="h-10"
                />
                {referringDoctorError && <div className="text-sm text-red-600 mt-1">{referringDoctorError}</div>}
              </div>
              <div className="md:col-span-2">
                <Label>Address</Label>
                <Input
                  value={createForm.address}
                  placeholder="Enter address"
                  onChange={(e) => setCreateForm((p) => ({ ...p, address: e.target.value }))}
                  className="h-10"
                />
              </div>
            </div>
          </div>

          {selectedTests.length > 0 && (
            <div className="border rounded-lg p-3 bg-white">
              <div className="font-semibold mb-2">Selected Tests ({selectedTests.length})</div>
              <div className="space-y-2">
                {selectedTests.map((t: any) => (
                  <div key={t?._id || t?.id || t?.name} className="p-2 bg-gray-50 rounded">
                    <div className="flex justify-between text-sm">
                      <span>{t?.name || '-'}</span>
                      <span className="font-medium">PKR {Number(t?.price || 0).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t text-sm">
                  <span>Sub Total</span>
                  <span>PKR {getBaseTotalAmount().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Discount ({(Number(discountRate) || 0).toFixed(0)}%)</span>
                  <span>- PKR {getDiscountAmount().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Home Sampling ({getHomeSamplingRate().toFixed(0)}%)</span>
                  <span>+ PKR {getHomeSamplingAmount().toFixed(2)}</span>
                </div>
                {createForm.testPriority === 'urgent' && (
                  <div className="flex justify-between text-sm">
                    <span>Ugent Test Uplift ({(Number(urgentUpliftRate) || 0).toFixed(0)}%)</span>
                    <span>+ PKR {getUrgentExtraAmount().toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Tax ({(Number(taxRate) || 0).toFixed(0)}%)</span>
                  <span>+ PKR {getTaxAmount().toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-semibold">
                  <span>Total</span>
                  <span>PKR {getFinalTotalAmount().toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          <div>
            <Label>Payment Method</Label>
            <Select
              value={createForm.paymentMethod || "none"}
              onValueChange={(v) => setCreateForm((p) => ({ ...p, paymentMethod: v }))}
            >
              <SelectTrigger className="h-10 mt-1">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="Easypaisa">Easypaisa</SelectItem>
                <SelectItem value="Jazzcash">Jazzcash</SelectItem>
                <SelectItem value="Bank Account">Bank Account</SelectItem>
                <SelectItem value="Pay on Home Sampling">Pay on Home Sampling</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <Button className="w-full sm:w-auto" variant="secondary" onClick={() => setIsCreateOpen(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button className="w-full sm:w-auto" onClick={submitCreateAppointment} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by patient name, ID, test, or contact..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-full bg-gray-50 border border-gray-200 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <div className="flex items-center gap-2 w-full md:w-64">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 w-full text-xs rounded-full bg-gray-50 border border-gray-200">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="Confirmed">Confirmed</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="border border-gray-200 rounded-2xl overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>Appointment ID</TableHead>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Service/Test</TableHead>
                  <TableHead>Date &amp; Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((appt) => (
                  <TableRow key={appt.id}>
                    <TableCell className="text-sm text-gray-700 font-medium">{appt.patientId}</TableCell>
                    <TableCell className="text-sm text-gray-700">{appt.patientName}</TableCell>
                    <TableCell className="text-sm text-gray-700">{appt.contact}</TableCell>
                    <TableCell className="text-sm text-gray-700">{appt.address || "-"}</TableCell>
                    <TableCell className="text-sm text-gray-700">{appt.test}</TableCell>
                    <TableCell className="text-sm text-gray-700">
                      {formatDisplayDateTime(appt.date, appt.time)}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={appt.status}
                        onValueChange={(value) =>
                          handleStatusChange(
                            appt,
                            value as AppointmentRecord["status"]
                          )
                        }
                      >
                        <SelectTrigger className="h-8 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Confirmed">Confirmed</SelectItem>
                          <SelectItem value="Cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right text-xs text-gray-400 space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-gray-500 hover:text-gray-800"
                        title="View details"
                        onClick={() => openDetailDialog(appt)}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-gray-500 hover:text-gray-800"
                        title="Edit"
                        onClick={() => openEditDialog(appt)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-700"
                        title="Delete"
                        onClick={() => handleDeleteAppointment(appt)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Appointment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this appointment permanently?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setPendingDeleteAppointment(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteAppointment}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) {
            setEditError(null);
            setEditingAppointment(null);
          }
        }}
      >
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-[560px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Appointment</DialogTitle>
            <DialogDescription>Update appointment details and save changes.</DialogDescription>
          </DialogHeader>

          {editError && <div className="text-sm text-red-600">{editError}</div>}

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Label>Test *</Label>
                <div className="mt-1">
                  <TestSelect
                    tests={availableTests}
                    selected={editSelectedTests}
                    onChange={setEditSelectedTests}
                  />
                </div>
              </div>

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Test Priority</Label>
                  <Select
                    value={editForm.testPriority}
                    onValueChange={(v) => setEditForm((p) => ({ ...p, testPriority: v as any }))}
                  >
                    <SelectTrigger className="h-10 mt-1">
                      <SelectValue placeholder="Select test priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Home Sampling Priority</Label>
                  <Select
                    value={editForm.homeSamplingPriority}
                    onValueChange={(v) => setEditForm((p) => ({ ...p, homeSamplingPriority: v as any }))}
                  >
                    <SelectTrigger className="h-10 mt-1">
                      <SelectValue placeholder="Select home sampling priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Full Name *</Label>
                <Input
                  value={editForm.fullName}
                  placeholder="Enter full name"
                  onChange={(e) => {
                    const v = (e.target.value || '').replace(/\d/g, '');
                    setEditForm((p) => ({ ...p, fullName: v }));
                  }}
                  onBlur={() => setEditTouched((p) => ({ ...p, fullName: true }))}
                  className="h-10"
                />
                {editTouched.fullName && !isValidFullName(editForm.fullName) && (
                  <div className="text-sm text-red-600 mt-1">Full name is required and cannot contain numbers</div>
                )}
              </div>

              <div>
                <Label>Phone *</Label>
                <Input
                  value={editForm.phone}
                  placeholder="03XXXXXXXXX or +923XXXXXXXXX"
                  inputMode="tel"
                  maxLength={13}
                  onChange={(e) => {
                    const next = normalizePhone(e.target.value);
                    setEditForm((p) => ({ ...p, phone: next }));
                  }}
                  onBlur={() => setEditTouched((p) => ({ ...p, phone: true }))}
                  className="h-10"
                />
                {editTouched.phone && (!editForm.phone || !isValidPhone(editForm.phone)) && (
                  <div className="text-sm text-red-600 mt-1">Phone must be 03XXXXXXXXX or +923XXXXXXXXX</div>
                )}
              </div>

              <div>
                <Label>CNIC *</Label>
                <Input
                  value={editForm.cnic}
                  placeholder="Enter 13-digit CNIC"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={13}
                  onChange={(e) => {
                    const digits = (e.target.value || "").replace(/\D/g, "").slice(0, 13);
                    setEditForm((p) => ({ ...p, cnic: digits }));
                  }}
                  onBlur={() => setEditTouched((p) => ({ ...p, cnic: true }))}
                  className="h-10"
                />
                {editTouched.cnic && (!editForm.cnic || editForm.cnic.length !== 13) && (
                  <div className="text-sm text-red-600 mt-1">CNIC must be exactly 13 digits (no dashes)</div>
                )}
              </div>

              <div>
                <Label>Age *</Label>
                <Input
                  value={editForm.age}
                  placeholder="Enter age"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  onChange={(e) => {
                    const digits = (e.target.value || '').replace(/\D/g, '').slice(0, 3);
                    setEditForm((p) => ({ ...p, age: digits }));
                  }}
                  onBlur={() => setEditTouched((p) => ({ ...p, age: true }))}
                  className="h-10"
                />
                {editTouched.age && parseValidAge(editForm.age) === null && (
                  <div className="text-sm text-red-600 mt-1">Age must be between 1 and 120</div>
                )}
              </div>

              <div>
                <Label>Gender *</Label>
                <Select value={editForm.gender} onValueChange={(v) => setEditForm((p) => ({ ...p, gender: v }))}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {editTouched.gender && !editForm.gender && (
                  <div className="text-sm text-red-600 mt-1">Gender is required</div>
                )}
              </div>

              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm((p) => ({ ...p, date: e.target.value }))}
                  onBlur={() => setEditTouched((p) => ({ ...p, date: true }))}
                  className="h-10"
                />
                {editTouched.date && !editForm.date && (
                  <div className="text-sm text-red-600 mt-1">Date is required</div>
                )}
              </div>

              <div>
                <Label>Time *</Label>
                <Input
                  type="time"
                  value={editForm.time}
                  onChange={(e) => setEditForm((p) => ({ ...p, time: e.target.value }))}
                  onBlur={() => setEditTouched((p) => ({ ...p, time: true }))}
                  className="h-10"
                />
                {editTouched.time && !editForm.time && (
                  <div className="text-sm text-red-600 mt-1">Time is required</div>
                )}
              </div>

              <div>
                <Label>Guardian Relation</Label>
                <Select value={editForm.selectedGuardian} onValueChange={(v) => setEditForm((p) => ({ ...p, selectedGuardian: v }))}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="S/O">S/O</SelectItem>
                    <SelectItem value="D/O">D/O</SelectItem>
                    <SelectItem value="W/O">W/O</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Guardian Name</Label>
                <Input
                  value={editForm.guardianName}
                  placeholder="Enter guardian name"
                  onChange={(e) => {
                    const v = (e.target.value || '').replace(/\d/g, '');
                    setEditForm((p) => ({ ...p, guardianName: v }));
                  }}
                  onBlur={() => setEditTouched((p) => ({ ...p, guardianName: true }))}
                  className="h-10"
                />
              </div>

              <div>
                <Label>Referring Doctor</Label>
                <Input
                  value={editForm.referringDoctor}
                  placeholder="Enter referring doctor"
                  onChange={(e) => {
                    const v = (e.target.value || '').replace(/\d/g, '');
                    setEditForm((p) => ({ ...p, referringDoctor: v }));
                  }}
                  onBlur={() => setEditTouched((p) => ({ ...p, referringDoctor: true }))}
                  className="h-10"
                />
              </div>

              <div className="md:col-span-2">
                <Label>Address</Label>
                <Input
                  value={editForm.address}
                  placeholder="Enter address"
                  onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
                  className="h-10"
                />
              </div>
            </div>
          </div>

          {editSelectedTests.length > 0 && (
            <div className="border rounded-lg p-3 bg-white">
              <div className="font-semibold mb-2">Selected Tests ({editSelectedTests.length})</div>
              <div className="space-y-2">
                {editSelectedTests.map((t: any) => (
                  <div key={t?._id || t?.id || t?.name} className="p-2 bg-gray-50 rounded">
                    <div className="flex justify-between text-sm">
                      <span>{t?.name || '-'}</span>
                      <span className="font-medium">PKR {Number(t?.price || 0).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t text-sm">
                  <span>Sub Total</span>
                  <span>PKR {getEditBaseTotalAmount().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Discount ({(Number(discountRate) || 0).toFixed(0)}%)</span>
                  <span>- PKR {getEditDiscountAmount().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Home Sampling ({getEditHomeSamplingRate().toFixed(0)}%)</span>
                  <span>+ PKR {getEditHomeSamplingAmount().toFixed(2)}</span>
                </div>
                {editForm.testPriority === 'urgent' && (
                  <div className="flex justify-between text-sm">
                    <span>Ugent Test Uplift ({(Number(urgentUpliftRate) || 0).toFixed(0)}%)</span>
                    <span>+ PKR {getEditUrgentExtraAmount().toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Tax ({(Number(taxRate) || 0).toFixed(0)}%)</span>
                  <span>+ PKR {getEditTaxAmount().toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-semibold">
                  <span>Total</span>
                  <span>PKR {getEditFinalTotalAmount().toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          <div>
            <Label>Payment Method</Label>
            <Select
              value={editForm.paymentMethod || "none"}
              onValueChange={(v) => setEditForm((p) => ({ ...p, paymentMethod: v }))}
            >
              <SelectTrigger className="h-10 mt-1">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="Easypaisa">Easypaisa</SelectItem>
                <SelectItem value="Jazzcash">Jazzcash</SelectItem>
                <SelectItem value="Bank Account">Bank Account</SelectItem>
                <SelectItem value="Pay on Home Sampling">Pay on Home Sampling</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <Button
              className="w-full sm:w-auto"
              variant="secondary"
              onClick={() => setIsEditOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button className="w-full sm:w-auto" onClick={submitEditAppointment} disabled={isUpdating}>
              {isUpdating ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDetailOpen}
        onOpenChange={(open) => {
          if (!open) closeDetailDialog();
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Appointment Detail</DialogTitle>
            <DialogDescription>Full information for this appointment.</DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-2 py-2 text-sm text-gray-800">
              <div className="flex justify-between">
                <span className="text-gray-500">Lab Test</span>
                <span className="font-semibold text-right">{selectedAppointment.test}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Patient Name</span>
                <span className="text-right">{selectedAppointment.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Phone</span>
                <span className="text-right">{selectedAppointment.contact}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Address</span>
                <span className="text-right">{selectedAppointment.address || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Gender</span>
                <span className="text-right">{selectedAppointment.gender || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Age</span>
                <span className="text-right">{selectedAppointment.age ?? "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">CNIC</span>
                <span className="text-right">{selectedAppointment.cnic || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Guardian</span>
                <span className="text-right">{selectedAppointment.guardian || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Guardian Name</span>
                <span className="text-right">{selectedAppointment.guardianName || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Referring Doctor</span>
                <span className="text-right">{selectedAppointment.referringDoctor || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Test Priority</span>
                <span className="text-right">{selectedAppointment.testPriority || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Home Sampling Priority</span>
                <span className="text-right">{selectedAppointment.homeSamplingPriority || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span className="text-right">{selectedAppointment.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Time</span>
                <span className="text-right">{selectedAppointment.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment</span>
                <span className="text-right">{selectedAppointment.payment || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className="text-right">{selectedAppointment.status}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Appointment;
