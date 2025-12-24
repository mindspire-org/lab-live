import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Filter, Plus, Eye, Edit2, MoreHorizontal, XCircle, ChevronDown, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/utils/authFetch";

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

interface SupplierRecord {
  id: string;
  name: string;
  contactPerson: string;
  contactInfo: string;
  products: string[];
  contractEndDate: string; // YYYY-MM-DD
  status: "Active" | "Expiring" | "Inactive" | "Cancelled";
  totalPurchase?: number;
  paidAmount?: number;
  remaining?: number;
  balanceStatus?: "Pending" | "Cleared";
  email?: string;
  phone?: string;
  address?: string;
  contractStartDate?: string;
}

type SupplierPurchase = {
  amount: number;
  itemId?: string;
  itemName?: string;
  invoiceNumber?: string;
  createdAt?: string;
};

type SupplierPayment = {
  amount: number;
  note?: string;
  method?: string;
  invoiceNumber?: string;
  itemId?: string;
  itemName?: string;
  paidAt?: string;
};

// Computes automatic status from dates only (does NOT handle "Cancelled")
const computeStatus = (
  contractEndDate: string,
  contractStartDate?: string
): SupplierRecord["status"] => {
  if (!contractEndDate) return "Inactive";

  const today = new Date();
  const [ey, em, ed] = contractEndDate.split("-").map((v) => parseInt(v, 10));
  if (!ey || !em || !ed) return "Inactive";
  const end = new Date(ey, em - 1, ed);

  // Days remaining until contract end
  const remainingMs = end.getTime() - today.getTime();
  const remainingDays = remainingMs / (1000 * 60 * 60 * 24);

  // Determine total contract length in days if we have a valid start date
  let totalDays: number | null = null;
  if (contractStartDate) {
    const [sy, sm, sd] = contractStartDate.split("-").map((v) => parseInt(v, 10));
    if (sy && sm && sd) {
      const start = new Date(sy, sm - 1, sd);
      const totalMs = end.getTime() - start.getTime();
      totalDays = totalMs / (1000 * 60 * 60 * 24);
    }
  }

  // If contract is less than 1 year, use a 7-day expiring window.
  // If contract is 1 year or more (or start date unknown), use a 30-day window.
  const expiringWindowDays = totalDays !== null && totalDays < 365 ? 7 : 30;

  if (remainingDays < 0) return "Inactive"; // already ended
  if (remainingDays <= expiringWindowDays) return "Expiring";
  return "Active";
};

const getStatusBadgeClasses = (status: SupplierRecord["status"]) => {
  switch (status) {
    case "Active":
      return "bg-emerald-500 text-white border-transparent";
    case "Expiring":
      return "bg-amber-400 text-white border-transparent";
    case "Cancelled":
      return "bg-red-500 text-white border-transparent";
    case "Inactive":
    default:
      return "bg-slate-400 text-white border-transparent";
  }
};

const SuppliersPage: React.FC = () => {
  const modulePerm = getModulePermission('Suppliers');
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'delete-supplier' | 'cancel-contract' | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<SupplierRecord | null>(null);

  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierRecord | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewing, setViewing] = useState<SupplierRecord | null>(null);

  const [isPayOpen, setIsPayOpen] = useState(false);
  const [paying, setPaying] = useState<SupplierRecord | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');

  const [payingDetails, setPayingDetails] = useState<any>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState('');
  const [selectedItemKey, setSelectedItemKey] = useState('');

  const { toast } = useToast();

  const [addForm, setAddForm] = useState({
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
    products: "",
    totalPurchase: "",
    contractStartDate: "",
    contractEndDate: "",
  });

  const validateAddSupplier = (form: typeof addForm) => {
    const errors: string[] = [];

    const name = form.name.trim();
    const contactPerson = form.contactPerson.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const totalPurchaseRaw = String((form as any).totalPurchase ?? '').trim();
    const contractEndDate = form.contractEndDate.trim();
    const contractStartDate = form.contractStartDate.trim();

    if (!name) errors.push('Supplier name is required');
    if (name.length > 120) errors.push('Supplier name must be 120 characters or less');

    if (!contactPerson) errors.push('Contact person is required');
    if (contactPerson.length > 120) errors.push('Contact person must be 120 characters or less');

    if (!email) errors.push('Email is required');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Email is invalid');

    if (!contractEndDate) errors.push('Contract end date is required');

    if (phone) {
      const normalized = phone.replace(/[\s\-()]/g, '');
      if (!/^\+?\d{7,15}$/.test(normalized)) errors.push('Phone number is invalid');
    }

    if (contractStartDate && contractEndDate) {
      const start = new Date(contractStartDate);
      const end = new Date(contractEndDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start > end) {
        errors.push('Contract start date must be before end date');
      }
    }

    if (totalPurchaseRaw) {
      const tp = Number(totalPurchaseRaw);
      if (!Number.isFinite(tp) || tp < 0) errors.push('Total purchase must be a valid number (>= 0)');
    }

    return { ok: errors.length === 0, errors };
  };

  const addSupplierValidation = useMemo(() => validateAddSupplier(addForm), [addForm]);

  const loadSuppliers = async () => {
    try {
      const res = await authFetch('/api/lab/suppliers');
      if (!res.ok) throw new Error('Failed to load suppliers');
      const rows = await res.json();
      const mapped: SupplierRecord[] = Array.isArray(rows)
        ? rows.map((s: any) => ({
            id: String(s._id || s.id || ''),
            name: s.name || '',
            contactPerson: s.contactPerson || '',
            contactInfo: s.email || s.contactInfo || '',
            products: Array.isArray(s.products) ? s.products : [],
            contractEndDate: s.contractEndDate || '',
            status: (s.status as any) || 'Active',
            totalPurchase: typeof s.totalPurchase === 'number' ? s.totalPurchase : Number(s.totalPurchase || 0),
            paidAmount: typeof s.paidAmount === 'number' ? s.paidAmount : Number(s.paidAmount || 0),
            remaining: typeof s.remaining === 'number' ? s.remaining : Number(s.remaining || 0),
            balanceStatus: s.balanceStatus === 'Cleared' ? 'Cleared' : 'Pending',
            email: s.email || '',
            phone: s.phone || '',
            address: s.address || '',
            contractStartDate: s.contractStartDate || '',
          }))
        : [];
      setSuppliers(mapped);
    } catch (e) {
      console.error('Failed to load suppliers', e);
      setSuppliers([]);
    }
  };

  const openPay = (supplier: SupplierRecord) => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: 'You only have view permission for Suppliers.', variant: 'destructive' });
      return;
    }
    const remaining = Number(supplier.remaining || 0);
    if (remaining <= 0) {
      toast({ title: 'No remaining balance', description: 'This supplier is already cleared.', variant: 'destructive' });
      return;
    }
    setPaying(supplier);
    setPayAmount('');
    setPayNote('');
    setPayingDetails(null);
    setSelectedInvoice('');
    setSelectedItemKey('');
    setIsPayOpen(true);

    setPayLoading(true);
    (async () => {
      try {
        const res = await authFetch(`/api/lab/suppliers/${supplier.id}`);
        if (!res.ok) throw new Error('Failed to load supplier details');
        const full = await res.json();
        setPayingDetails(full);

        const purchases: SupplierPurchase[] = Array.isArray(full?.purchases) ? full.purchases : [];
        const invoiceList = Array.from(
          new Set(
            purchases
              .map((p) => String(p?.invoiceNumber || '').trim())
              .filter(Boolean)
          )
        );
        const inv = invoiceList[0] || '';
        setSelectedInvoice(inv);
      } catch (e: any) {
        toast({ title: 'Error', description: e?.message || 'Failed to load supplier details', variant: 'destructive' });
        setPayingDetails(null);
      } finally {
        setPayLoading(false);
      }
    })();
  };

  const handlePaySupplier = async () => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: 'You only have view permission for Suppliers.', variant: 'destructive' });
      return;
    }
    if (!paying) return;
    const amount = Number(payAmount);
    const remaining = Number(paying.remaining || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: 'Invalid amount', description: 'Enter a payment amount greater than 0.', variant: 'destructive' });
      return;
    }

    const purchases: SupplierPurchase[] = Array.isArray(payingDetails?.purchases) ? payingDetails.purchases : [];
    const payments: SupplierPayment[] = Array.isArray(payingDetails?.payments) ? payingDetails.payments : [];
    const inv = String(selectedInvoice || '').trim();

    let maxAllowed = remaining;
    if (inv) {
      const invoiceTotal = purchases
        .filter((p) => String(p?.invoiceNumber || '').trim() === inv)
        .reduce((sum, p) => sum + (Number(p?.amount) || 0), 0);
      const invoicePaid = payments
        .filter((p) => String(p?.invoiceNumber || '').trim() === inv)
        .reduce((sum, p) => sum + (Number(p?.amount) || 0), 0);
      const invoiceRemaining = Math.max(0, invoiceTotal - invoicePaid);
      maxAllowed = Math.min(maxAllowed, invoiceRemaining);
    }

    if (amount > maxAllowed) {
      toast({ title: 'Invalid amount', description: `Amount cannot exceed remaining (${maxAllowed}).`, variant: 'destructive' });
      return;
    }

    let itemId = '';
    let itemName = '';
    if (selectedItemKey) {
      const [idPart, namePart] = String(selectedItemKey).split('::');
      itemId = String(idPart || '').trim();
      itemName = String(namePart || '').trim();
    }
    try {
      const res = await authFetch(`/api/lab/suppliers/${paying.id}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          amount,
          note: payNote,
          method: 'Cash',
          invoiceNumber: inv,
          itemId: itemId || undefined,
          itemName: itemName || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to record payment');
      }
      await loadSuppliers();
      setIsPayOpen(false);
      setPaying(null);
      setPayAmount('');
      setPayNote('');
      setPayingDetails(null);
      setSelectedInvoice('');
      setSelectedItemKey('');
      toast({ title: 'Payment recorded', description: 'Supplier payment has been saved.' });
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message || 'Failed to record payment', variant: 'destructive' });
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const [editForm, setEditForm] = useState({
    name: "",
    contactPerson: "",
    contactInfo: "",
    products: "",
    contractEndDate: "",
    totalPurchase: "",
  });

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();

    return suppliers.filter((s) => {
      const effectiveStatus =
        s.status === "Cancelled"
          ? "Cancelled"
          : computeStatus(s.contractEndDate, s.contractStartDate);

      if (statusFilter !== "all" && statusFilter !== effectiveStatus) return false;
      if (term) {
        const haystack = `${s.name} ${s.contactPerson} ${s.contactInfo}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [suppliers, search, statusFilter]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pageItems = filtered.slice(startIndex, endIndex);

  const resetAddForm = () => {
    setAddForm({
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      products: "",
      totalPurchase: "",
      contractStartDate: "",
      contractEndDate: "",
    });
  };

  const handleAddSupplier = () => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: 'You only have view permission for Suppliers.', variant: 'destructive' });
      return;
    }
    const validation = validateAddSupplier(addForm);
    if (!validation.ok) {
      toast({
        title: 'Please fix the form',
        description: validation.errors[0] || 'Invalid supplier details',
        variant: 'destructive',
      });
      return;
    }

    const products = addForm.products
      .split(/[,\n]/)
      .map((p) => p.trim())
      .filter(Boolean);

    const status = computeStatus(addForm.contractEndDate, addForm.contractStartDate);

    const totalPurchase = addForm.totalPurchase.trim() ? Number(addForm.totalPurchase) : 0;

    (async () => {
      try {
        const res = await authFetch('/api/lab/suppliers', {
          method: 'POST',
          body: JSON.stringify({
            name: addForm.name,
            contactPerson: addForm.contactPerson,
            email: addForm.email,
            phone: addForm.phone,
            address: addForm.address,
            products,
            totalPurchase,
            contractStartDate: addForm.contractStartDate,
            contractEndDate: addForm.contractEndDate,
            status,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to add supplier');
        }
        await loadSuppliers();
        setIsAddOpen(false);
        resetAddForm();
      } catch (e) {
        toast({ title: 'Error', description: (e as Error).message || 'Failed to add supplier', variant: 'destructive' });
      }
    })();
  };

  const doDeleteSupplier = async (supplier: SupplierRecord) => {
    if (!modulePerm.delete) {
      toast({ title: 'Not allowed', description: "You don't have delete permission for Suppliers.", variant: 'destructive' });
      return;
    }
    try {
      const res = await authFetch(`/api/lab/suppliers/${supplier.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to delete supplier');
      }
      await loadSuppliers();
      toast({ title: 'Supplier deleted', description: `${supplier.name} has been deleted.` });
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message || 'Failed to delete supplier', variant: 'destructive' });
    }
  };

  const handleDeleteSupplier = (supplier: SupplierRecord) => {
    if (!modulePerm.delete) {
      toast({ title: 'Not allowed', description: "You don't have delete permission for Suppliers.", variant: 'destructive' });
      return;
    }
    setConfirmAction('delete-supplier');
    setConfirmTarget(supplier);
    setShowConfirm(true);
  };

  const openEdit = (supplier: SupplierRecord) => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: 'You only have view permission for Suppliers.', variant: 'destructive' });
      return;
    }
    setEditing(supplier);
    setEditForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      contactInfo: supplier.contactInfo,
      products: supplier.products.join(", "),
      contractEndDate: supplier.contractEndDate,
      totalPurchase: String(supplier.totalPurchase ?? ''),
    });
    setIsEditOpen(true);
  };

  const openView = (supplier: SupplierRecord) => {
    setViewing(supplier);
    setIsViewOpen(true);
  };

  const handleUpdateSupplier = () => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: 'You only have view permission for Suppliers.', variant: 'destructive' });
      return;
    }
    if (!editing) return;
    if (!editForm.name || !editForm.contactPerson) return;

    const products = editForm.products
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    const status =
      editing.status === "Cancelled"
        ? "Cancelled"
        : computeStatus(editForm.contractEndDate, editing.contractStartDate);

    const totalPurchase = editForm.totalPurchase.trim() ? Number(editForm.totalPurchase) : undefined;
    if (editForm.totalPurchase.trim()) {
      if (!Number.isFinite(totalPurchase as any) || (totalPurchase as number) < 0) {
        toast({ title: 'Invalid total purchase', description: 'Total purchase must be a valid number (>= 0).', variant: 'destructive' });
        return;
      }
    }

    (async () => {
      try {
        const res = await authFetch(`/api/lab/suppliers/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: editForm.name,
            contactPerson: editForm.contactPerson,
            email: editForm.contactInfo,
            products,
            contractEndDate: editForm.contractEndDate,
            status,
            totalPurchase,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to update supplier');
        }
        await loadSuppliers();
        setIsEditOpen(false);
        setEditing(null);
      } catch (e) {
        toast({ title: 'Error', description: (e as Error).message || 'Failed to update supplier', variant: 'destructive' });
      }
    })();
  };

  const doCancelContract = async (supplier: SupplierRecord) => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: 'You only have view permission for Suppliers.', variant: 'destructive' });
      return;
    }

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;

    try {
      const res = await authFetch(`/api/lab/suppliers/${supplier.id}`, {
        method: 'PUT',
        body: JSON.stringify({ contractEndDate: todayStr, status: 'Cancelled' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to cancel contract');
      }
      await loadSuppliers();
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message || 'Failed to cancel contract', variant: 'destructive' });
    }
  };

  const handleCancelContract = (supplier: SupplierRecord) => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: 'You only have view permission for Suppliers.', variant: 'destructive' });
      return;
    }
    setConfirmAction('cancel-contract');
    setConfirmTarget(supplier);
    setShowConfirm(true);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-slate-50">
      {/* Confirmation Dialog (reuse logout dialog style) */}
      <Dialog
        open={showConfirm}
        onOpenChange={(open) => {
          setShowConfirm(open);
          if (!open) {
            setConfirmAction(null);
            setConfirmTarget(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {confirmAction === 'delete-supplier'
                ? 'Delete Supplier'
                : confirmAction === 'cancel-contract'
                ? 'Cancel Contract'
                : 'Confirm'}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === 'delete-supplier'
                ? `Are you sure you want to delete ${confirmTarget?.name ? `"${confirmTarget.name}"` : 'this supplier'}?`
                : confirmAction === 'cancel-contract'
                ? `Are you sure you want to cancel ${confirmTarget?.name ? `"${confirmTarget.name}"` : 'this supplier'}'s contract?`
                : 'Are you sure you want to continue?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirm(false);
                setConfirmAction(null);
                setConfirmTarget(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                const action = confirmAction;
                const target = confirmTarget;
                setShowConfirm(false);
                setConfirmAction(null);
                setConfirmTarget(null);
                if (!action || !target) return;
                if (action === 'delete-supplier') {
                  await doDeleteSupplier(target);
                } else if (action === 'cancel-contract') {
                  await doCancelContract(target);
                }
              }}
            >
              {confirmAction === 'delete-supplier'
                ? 'Delete'
                : confirmAction === 'cancel-contract'
                ? 'Cancel Contract'
                : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supplier Management</h1>
          <p className="text-sm text-gray-600">
            Maintain your preferred vendors and keep contract details up to date.
          </p>
        </div>
        <Button
          className={(!modulePerm.edit
            ? 'opacity-50 cursor-not-allowed bg-blue-800 hover:bg-blue-700 text-white rounded-full px-6 shadow-sm w-full md:w-auto'
            : 'bg-blue-800 hover:bg-blue-700 text-white rounded-full px-6 shadow-sm w-full md:w-auto')}
          disabled={!modulePerm.edit}
          onClick={() => {
            if (!modulePerm.edit) {
              toast({ title: 'Not allowed', description: 'You only have view permission for Suppliers.', variant: 'destructive' });
              return;
            }
            setIsAddOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Supplier
        </Button>
      </div>

      <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by name or contact"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 rounded-full bg-gray-50 border border-gray-200 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <div className="flex items-center gap-2 w-full md:w-64">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="rounded-full bg-gray-50 border border-gray-200 text-sm">
                    <Filter className="mr-2 h-4 w-4 text-gray-400" />
                    <SelectValue placeholder="Filter by Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Expiring">Expiring</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {pageItems.length === 0 ? (
            <div className="border border-gray-200 rounded-2xl bg-gray-50 py-14 text-center">
              <div className="text-sm text-muted-foreground">
                {suppliers.length === 0 ? "No suppliers yet" : "No suppliers found"}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pageItems.map((s) => {
                const effectiveStatus =
                  s.status === "Cancelled"
                    ? "Cancelled"
                    : computeStatus(s.contractEndDate, s.contractStartDate);

                return (
                  <div
                    key={s.id}
                    className="border border-gray-200 rounded-2xl bg-white shadow-sm p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {s.name}
                        </div>
                        <div className="text-xs text-gray-600 truncate">
                          {s.contactPerson}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          className={`text-xs px-2 py-0.5 rounded-full border ${getStatusBadgeClasses(
                            effectiveStatus
                          )}`}
                        >
                          {effectiveStatus}
                        </Badge>
                        {modulePerm.delete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteSupplier(s)}
                            title="Delete supplier"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 space-y-2 text-xs text-gray-700">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-500">Email</span>
                        <span className="truncate max-w-[60%]">{s.contactInfo || "-"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-500">Contract end</span>
                        <span>{s.contractEndDate || "-"}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-2">
                          <div className="text-[10px] text-gray-500">Total Purchase</div>
                          <div className="text-xs font-semibold text-gray-900">{Number(s.totalPurchase || 0).toFixed(0)}</div>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-2">
                          <div className="text-[10px] text-gray-500">Paid</div>
                          <div className="text-xs font-semibold text-gray-900">{Number(s.paidAmount || 0).toFixed(0)}</div>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-2">
                          <div className="text-[10px] text-gray-500">Remaining</div>
                          <div className={`text-xs font-semibold ${Number(s.remaining || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{Number(s.remaining || 0).toFixed(0)}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-500">Products</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 px-3 text-xs rounded-full">
                              View ({s.products.length})
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="max-w-xs">
                            {s.products.length === 0 ? (
                              <DropdownMenuItem className="text-xs text-gray-500">
                                No products listed
                              </DropdownMenuItem>
                            ) : (
                              s.products.map((p) => (
                                <DropdownMenuItem key={p} className="text-xs text-gray-700">
                                  {p}
                                </DropdownMenuItem>
                              ))
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs rounded-full w-full sm:w-auto"
                        onClick={() => openView(s)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-2" />
                        View
                      </Button>
                      {modulePerm.edit && Number(s.remaining || 0) > 0 && (
                        <Button
                          size="sm"
                          className="h-8 px-3 text-xs rounded-full bg-blue-800 text-white hover:bg-blue-900 w-full sm:w-auto"
                          onClick={() => openPay(s)}
                        >
                          Pay
                        </Button>
                      )}
                      {modulePerm.edit && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs rounded-full w-full sm:w-auto"
                          onClick={() => openEdit(s)}
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-2" />
                          Edit
                        </Button>
                      )}
                      {modulePerm.edit && effectiveStatus !== "Cancelled" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs rounded-full text-red-600 border-red-200 hover:bg-red-50 w-full sm:w-auto"
                          onClick={() => handleCancelContract(s)}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-2" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
            <span>
              Showing {totalItems === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} entries
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-xs rounded-full"
                disabled={currentPage === 1}
                onClick={() => currentPage > 1 && setPage(currentPage - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-xs rounded-full"
                disabled={currentPage === totalPages || totalItems === 0}
                onClick={() => currentPage < totalPages && setPage(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[720px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Supplier</DialogTitle>
            <DialogDescription>Fill in the supplier details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-2">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Supplier Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Supplier Name *</label>
                  <Input
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    placeholder="e.g. MedSupply Inc."
                    required
                    maxLength={120}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Contact Person *</label>
                  <Input
                    value={addForm.contactPerson}
                    onChange={(e) => setAddForm({ ...addForm, contactPerson: e.target.value })}
                    placeholder="e.g. John Doe"
                    required
                    maxLength={120}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Email Address *</label>
                  <Input
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    placeholder="contact@medsupply.com"
                    required
                    maxLength={254}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Phone Number</label>
                  <Input
                    type="tel"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    inputMode="tel"
                    pattern="^\\+?[0-9\\s\\-()]{7,20}$"
                    maxLength={20}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Total Purchase</label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="1"
                    value={addForm.totalPurchase}
                    onChange={(e) => setAddForm({ ...addForm, totalPurchase: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Location</h3>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Physical Address</label>
                <Input
                  value={addForm.address}
                  onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                  placeholder="123 Lab Way, Suite 456, Science City, ST 78901"
                  className="h-20"
                  maxLength={250}
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Business Details</h3>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Products/Services Supplied</label>
                <Input
                  value={addForm.products}
                  onChange={(e) => setAddForm({ ...addForm, products: e.target.value })}
                  placeholder={"Reagents, Lab Glassware, Calibration Services, Medical Equipment"}
                  className="h-24"
                  maxLength={500}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Contract Start Date (Optional)</label>
                  <Input
                    type="date"
                    value={addForm.contractStartDate}
                    onChange={(e) =>
                      setAddForm({ ...addForm, contractStartDate: e.target.value })
                    }
                    max={addForm.contractEndDate || undefined}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Contract End Date *</label>
                  <Input
                    type="date"
                    value={addForm.contractEndDate}
                    onChange={(e) =>
                      setAddForm({ ...addForm, contractEndDate: e.target.value })
                    }
                    required
                    min={addForm.contractStartDate || undefined}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSupplier} disabled={!modulePerm.edit || !addSupplierValidation.ok}>
              Save Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
            <DialogDescription>Update the supplier details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium">Name</label>
              <Input
                className="col-span-3"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium">Contact Person</label>
              <Input
                className="col-span-3"
                value={editForm.contactPerson}
                onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium">Contact Info</label>
              <Input
                className="col-span-3"
                value={editForm.contactInfo}
                onChange={(e) => setEditForm({ ...editForm, contactInfo: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium">Products</label>
              <Input
                className="col-span-3"
                value={editForm.products}
                onChange={(e) => setEditForm({ ...editForm, products: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium">Contract End Date</label>
              <Input
                className="col-span-3"
                type="date"
                value={editForm.contractEndDate}
                onChange={(e) => setEditForm({ ...editForm, contractEndDate: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium">Total Purchase</label>
              <Input
                className="col-span-3"
                type="number"
                inputMode="decimal"
                min={0}
                step="1"
                value={editForm.totalPurchase}
                onChange={(e) => setEditForm({ ...editForm, totalPurchase: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSupplier}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Supplier Details</DialogTitle>
            <DialogDescription>View full information about this supplier.</DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4 py-2 text-sm text-gray-800">
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Supplier</h3>
                <p className="font-medium text-gray-900">{viewing.name}</p>
                {viewing.contactPerson && (
                  <p className="text-gray-700">Contact: {viewing.contactPerson}</p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Contact Info</h3>
                  {viewing.email && <p>Email: {viewing.email}</p>}
                  {viewing.phone && <p>Phone: {viewing.phone}</p>}
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Contract</h3>
                  {viewing.contractStartDate && <p>Start: {viewing.contractStartDate}</p>}
                  <p>End: {viewing.contractEndDate || "-"}</p>
                  <p>
                    Status: {computeStatus(viewing.contractEndDate)}
                  </p>
                </div>
              </div>
              {viewing.address && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Address</h3>
                  <p>{viewing.address}</p>
                </div>
              )}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Products/Services</h3>
                {viewing.products.length === 0 ? (
                  <p className="text-gray-500">No products listed.</p>
                ) : (
                  <ul className="list-disc list-inside space-y-1">
                    {viewing.products.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isPayOpen}
        onOpenChange={(o) => {
          setIsPayOpen(o);
          if (!o) {
            setPaying(null);
            setPayAmount('');
            setPayNote('');
            setPayingDetails(null);
            setPayLoading(false);
            setSelectedInvoice('');
            setSelectedItemKey('');
          }
        }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] sm:w-auto sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pay Supplier</DialogTitle>
            <DialogDescription>
              Record a payment for {paying?.name || 'supplier'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {payLoading ? (
              <div className="text-xs text-gray-600">Loading supplier purchases...</div>
            ) : null}

            {(() => {
              const purchases: SupplierPurchase[] = Array.isArray(payingDetails?.purchases) ? payingDetails.purchases : [];
              const payments: SupplierPayment[] = Array.isArray(payingDetails?.payments) ? payingDetails.payments : [];
              const inv = String(selectedInvoice || '').trim();

              const invoiceTotal = inv
                ? purchases
                    .filter((p) => String(p?.invoiceNumber || '').trim() === inv)
                    .reduce((sum, p) => sum + (Number(p?.amount) || 0), 0)
                : Number(paying?.totalPurchase || 0);

              const invoicePaid = inv
                ? payments
                    .filter((p) => String(p?.invoiceNumber || '').trim() === inv)
                    .reduce((sum, p) => sum + (Number(p?.amount) || 0), 0)
                : Number(paying?.paidAmount || 0);

              const invoiceRemaining = Math.max(0, invoiceTotal - invoicePaid);

              const invoiceOptions = Array.from(
                new Set(
                  purchases
                    .map((p) => String(p?.invoiceNumber || '').trim())
                    .filter(Boolean)
                )
              );

              const itemOptions = (inv ? purchases.filter((p) => String(p?.invoiceNumber || '').trim() === inv) : purchases)
                .map((p) => {
                  const id = String(p?.itemId || '').trim();
                  const name = String(p?.itemName || '').trim();
                  if (!name && !id) return null;
                  return { key: `${id}::${name}`, id, name };
                })
                .filter(Boolean) as Array<{ key: string; id: string; name: string }>;

              const uniqueItems = Array.from(
                new Map(itemOptions.map((it) => [it.key, it])).values()
              );

              return (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">Invoice</label>
                    <Select value={selectedInvoice} onValueChange={(v) => { setSelectedInvoice(v); setSelectedItemKey(''); }}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select invoice" />
                      </SelectTrigger>
                      <SelectContent>
                        {invoiceOptions.length === 0 ? (
                          <SelectItem value="__no_invoice" disabled>
                            No invoices found
                          </SelectItem>
                        ) : null}
                        {invoiceOptions.map((invNo) => (
                          <SelectItem key={invNo} value={invNo}>
                            {invNo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">Item</label>
                    <Select value={selectedItemKey} onValueChange={setSelectedItemKey}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueItems.length === 0 ? (
                          <SelectItem value="__no_item" disabled>
                            No items found
                          </SelectItem>
                        ) : null}
                        {uniqueItems.map((it) => (
                          <SelectItem key={it.key} value={it.key}>
                            {it.name || it.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <div className="text-gray-500">Total Price</div>
                      <div className="font-semibold text-gray-900">{Number(invoiceTotal || 0).toFixed(0)}</div>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <div className="text-gray-500">Paid</div>
                      <div className="font-semibold text-gray-900">{Number(invoicePaid || 0).toFixed(0)}</div>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <div className="text-gray-500">Remaining</div>
                      <div className={`font-semibold ${invoiceRemaining > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{Number(invoiceRemaining || 0).toFixed(0)}</div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">Amount to pay</label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="1"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder={invoiceRemaining ? String(invoiceRemaining) : '0'}
                    />
                  </div>
                </>
              );
            })()}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Note (optional)</label>
              <Input value={payNote} onChange={(e) => setPayNote(e.target.value)} maxLength={200} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPayOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePaySupplier}>
              Save Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default SuppliersPage;
