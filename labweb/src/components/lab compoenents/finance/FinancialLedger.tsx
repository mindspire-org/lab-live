import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  Plus,
  Search,
  Filter,
  Calendar,
  Trash2,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

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

type LedgerDateRange = "last-30-days" | "last-90-days" | "this-year" | "all";
type LedgerTxTypeFilter = "all" | "Income" | "Expense";

type FinanceRecord = {
  _id: string;
  date: string;
  type: "Income" | "Expense";
  category: string;
  description: string;
  amount: number;
  department?: string;
  patientId?: string;
  admissionId?: string;
  reference?: string;
};

type FinanceSummary = {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  monthlyNet?: number;
  testRevenue?: number;
};

type NewEntryForm = {
  date: string;
  type: "Income" | "Expense";
  amount: string;
  category: string;
  description: string;
  patientId?: string;
};

const formatCurrency = (amount: number) => {
  return `PKR ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const CATEGORY_COLORS = ["#2563eb", "#22c55e", "#f97316", "#a855f7"];

const getCategoryColor = (label: string, index: number) => {
  const lower = label.toLowerCase();
  if (lower.includes("sample")) return "#2563eb";
  if (lower.includes("payment")) return "#22c55e";
  if (lower.includes("expense")) return "#f97316";
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
};

const getDateLimit = (range: LedgerDateRange) => {
  const now = new Date();
  if (range === "all") return undefined;
  if (range === "this-year") {
    return new Date(now.getFullYear(), 0, 1);
  }
  const days = range === "last-90-days" ? 90 : 30;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
};

const FinancialLedger: React.FC = () => {
  const { toast } = useToast();
  const modulePerm = getModulePermission('Financial Ledger');
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [baseRecords, setBaseRecords] = useState<FinanceRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [reportType, setReportType] = useState("financial-summary");
  const [reportDateRange, setReportDateRange] = useState<LedgerDateRange>("last-30-days");
  const [reportTxType, setReportTxType] = useState<LedgerTxTypeFilter>("all");

  const [tableDateRange, setTableDateRange] = useState<LedgerDateRange>("last-30-days");
  const [tableTxType, setTableTxType] = useState<LedgerTxTypeFilter>("all");

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newEntry, setNewEntry] = useState<NewEntryForm>({
    date: new Date().toISOString().slice(0, 10),
    type: "Income",
    amount: "",
    category: "General",
    description: "",
    patientId: "",
  });

  const [createSaving, setCreateSaving] = useState(false);

  const handleDeleteEntry = async (id: string) => {
    if (!modulePerm.delete) {
      toast({ title: 'Not allowed', description: "You don't have delete permission for Financial Ledger.", variant: 'destructive' });
      return;
    }
    if (!id) return;
    const ok = window.confirm('Delete this ledger entry?');
    if (!ok) return;
    try {
      await api.delete(`/finance/ledger/${id}`);
      await loadLedger();
      toast({ title: 'Deleted', description: 'Entry removed.' });
    } catch (err: any) {
      toast({
        title: 'Failed to delete',
        description:
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          'Failed to delete entry',
        variant: 'destructive',
      });
    }
  };

  const loadLedger = async () => {
    setRecordsLoading(true);
    setRecordsError(null);
    try {
      const [ledgerRes, summaryRes] = await Promise.all([
        api.get('/finance/ledger', { params: { department: 'Lab' } }),
        api.get('/finance/summary', { params: { department: 'Lab' } }),
      ]);

      const rows = Array.isArray(ledgerRes.data) ? (ledgerRes.data as FinanceRecord[]) : [];
      setBaseRecords(rows);

      const s = summaryRes.data as FinanceSummary;
      setSummary(s && typeof s === 'object' ? s : null);
    } catch (err: any) {
      setBaseRecords([]);
      setSummary(null);
      setRecordsError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Failed to load ledger'
      );
    } finally {
      setRecordsLoading(false);
    }
  };

  useEffect(() => {
    loadLedger();
  }, []);

  const metrics = useMemo(() => {
    let income = summary?.totalIncome ?? 0;
    let expense = summary?.totalExpense ?? 0;

    if (!summary) {
      income = baseRecords
        .filter((r) => r.type === "Income")
        .reduce((sum, r) => sum + (r.amount || 0), 0);
      expense = baseRecords
        .filter((r) => r.type === "Expense")
        .reduce((sum, r) => sum + (r.amount || 0), 0);
    }

    const net = summary?.netBalance ?? income - expense;
    const pendingCount = baseRecords.length;
    const pendingTotal = baseRecords.reduce((sum, r) => sum + (r.amount || 0), 0);

    return {
      totalIncome: income,
      totalExpense: expense,
      netBalance: net,
      pendingCount,
      pendingTotal,
    };
  }, [summary, baseRecords]);

  const filteredRecords = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();
    const minDate = getDateLimit(tableDateRange);

    return baseRecords.filter((r) => {
      const d = new Date(r.date);
      if (minDate && d < minDate) return false;

      if (tableTxType !== "all" && r.type !== tableTxType) return false;

      if (!search) return true;

      const haystack = [
        r.description,
        r.category,
        r.patientId,
        r.admissionId,
        r.department,
        r.type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [baseRecords, searchTerm, tableDateRange, tableTxType]);

  const recordsWithBalance = useMemo(() => {
    let balance = 0;
    return filteredRecords
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((r) => {
        const delta = r.type === "Income" ? r.amount : -r.amount;
        balance += delta;
        return { ...r, balance } as FinanceRecord & { balance: number };
      });
  }, [filteredRecords]);

  const totalItems = recordsWithBalance.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const pageItems = recordsWithBalance.slice(startIdx, endIdx);

  const categoryBreakdown = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const r of baseRecords) {
      const key = r.category || "Uncategorized";
      totals[key] = (totals[key] || 0) + (r.amount || 0);
    }
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const top = entries.slice(0, 3);
    const othersTotal = entries.slice(3).reduce((sum, [, v]) => sum + v, 0);
    if (othersTotal > 0) {
      top.push(["Other", othersTotal]);
    }
    const grandTotal = entries.reduce((sum, [, v]) => sum + v, 0) || 1;
    return top.map(([label, value]) => ({
      label,
      value,
      percent: (value / grandTotal) * 100,
    }));
  }, [baseRecords]);

  const monthlyTrends = useMemo(() => {
    const buckets: Record<string, { income: number; expense: number; label: string }> = {};
    for (const r of baseRecords) {
      const d = new Date(r.date);
      if (Number.isNaN(d.getTime())) continue;
      const ym = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
      if (!buckets[ym]) {
        const label = d.toLocaleString(undefined, { month: "short", year: "2-digit" });
        buckets[ym] = { income: 0, expense: 0, label };
      }
      if (r.type === "Income") buckets[ym].income += r.amount || 0;
      if (r.type === "Expense") buckets[ym].expense += r.amount || 0;
    }
    const keys = Object.keys(buckets).sort().slice(-6);
    return keys.map((k) => ({
      monthKey: k,
      monthLabel: buckets[k].label,
      income: buckets[k].income,
      expense: buckets[k].expense,
    }));
  }, [baseRecords]);

  const handleExportCsv = () => {
    const rows = filteredRecords.length ? filteredRecords : baseRecords;
    if (!rows.length) return;

    const headers = [
      "Date",
      "Type",
      "Category",
      "Description",
      "Amount",
      "Department",
      "PatientId",
      "AdmissionId",
    ];

    const csvRows = rows.map((r) => [
      new Date(r.date).toLocaleString(),
      r.type,
      r.category,
      r.description,
      r.amount.toFixed(2),
      r.department,
      r.patientId ?? "",
      r.admissionId ?? "",
    ]);

    const csv = [headers, ...csvRows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financial_ledger_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateReport = () => {
    const minDate = getDateLimit(reportDateRange);

    let rows = baseRecords.filter((r) => {
      const d = new Date(r.date);
      if (minDate && d < minDate) return false;

      if (reportTxType !== "all" && r.type !== reportTxType) return false;

      return true;
    });

    if (reportType === "income-only") {
      rows = rows.filter((r) => r.type === "Income");
    } else if (reportType === "expenses-only") {
      rows = rows.filter((r) => r.type === "Expense");
    }

    if (!rows.length) return;

    const headers = [
      "Date",
      "Type",
      "Category",
      "Description",
      "Amount",
      "Department",
      "PatientId",
      "AdmissionId",
    ];

    const csvRows = rows.map((r) => [
      new Date(r.date).toLocaleString(),
      r.type,
      r.category,
      r.description,
      r.amount.toFixed(2),
      r.department,
      r.patientId ?? "",
      r.admissionId ?? "",
    ]);

    const csv = [headers, ...csvRows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financial_report_${reportType}_${reportDateRange}_${reportTxType}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddEntry = () => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: 'You only have view permission for Financial Ledger.', variant: 'destructive' });
      return;
    }
    if (!newEntry.description || !newEntry.amount) return;

    const payload = {
      date: newEntry.date,
      amount: parseFloat(newEntry.amount),
      category: newEntry.category || "General",
      description: newEntry.description,
      department: "Lab" as const,
      type: newEntry.type,
      patientId: newEntry.patientId || undefined,
    };

    (async () => {
      setCreateSaving(true);
      try {
        await api.post('/finance/ledger', payload);
        await loadLedger();
        setIsAddOpen(false);
        setNewEntry({
          date: new Date().toISOString().slice(0, 10),
          type: "Income",
          amount: "",
          category: "General",
          description: "",
          patientId: "",
        });
        toast({ title: 'Saved', description: 'Entry added to ledger.' });
      } catch (err: any) {
        toast({
          title: 'Failed to save',
          description:
            err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            'Failed to save entry',
          variant: 'destructive',
        });
      } finally {
        setCreateSaving(false);
      }
    })();
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 overflow-x-hidden w-full max-w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Ledger</h1>
          <p className="text-sm text-gray-600">
            Track all financial transactions and activity logs.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button variant="outline" onClick={handleExportCsv}>
            <Download className="w-4 h-4 mr-2" />
            Export Ledger
          </Button>
          <Button
            disabled={!modulePerm.edit}
            onClick={() => {
              if (!modulePerm.edit) {
                toast({ title: 'Not allowed', description: 'You only have view permission for Financial Ledger.', variant: 'destructive' });
                return;
              }
              setIsAddOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Manual Entry
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">
                Total Income
              </p>
              <p className="mt-2 text-2xl font-bold text-emerald-600">
                {formatCurrency(metrics.totalIncome)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">
                Total Expenses
              </p>
              <p className="mt-2 text-2xl font-bold text-red-600">
                {formatCurrency(metrics.totalExpense)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">
                Net Balance
              </p>
              <p className="mt-2 text-2xl font-bold">
                <span
                  className={
                    metrics.netBalance >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                  }
                >
                  {formatCurrency(metrics.netBalance)}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">
                Total Transactions
              </p>
              <p className="mt-2 text-2xl font-bold text-blue-900">
                {metrics.pendingCount}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle>Detailed Reporting</CardTitle>
            <CardDescription>
              Generate and visualize customizable financial reports.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 min-w-0">
            <div className="space-y-4 min-w-0">
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Report Type</Label>
                <Select
                  value={reportType}
                  onValueChange={(v) => setReportType(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="financial-summary">
                      Financial Summary
                    </SelectItem>
                    <SelectItem value="income-only">Income Only</SelectItem>
                    <SelectItem value="expenses-only">Expenses Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Date Range</Label>
                <Select
                  value={reportDateRange}
                  onValueChange={(v: LedgerDateRange) => setReportDateRange(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                    <SelectItem value="last-90-days">Last 90 Days</SelectItem>
                    <SelectItem value="this-year">This Year</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Transaction Type</Label>
                <Select
                  value={reportTxType}
                  onValueChange={(v: LedgerTxTypeFilter) => setReportTxType(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Income">Income</SelectItem>
                    <SelectItem value="Expense">Expenses</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Export Options</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={handleExportCsv}
                  >
                    <Download className="w-3 h-3 mr-1" /> CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    PDF
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center min-w-0 w-full overflow-hidden">
              {categoryBreakdown.length > 0 ? (
                <>
                  <div className="h-44 w-full max-w-xs mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryBreakdown}
                          dataKey="value"
                          nameKey="label"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={3}
                          stroke="#ffffff"
                        >
                          {categoryBreakdown.map((entry, index) => (
                            <Cell
                              key={entry.label}
                              fill={getCategoryColor(entry.label, index)}
                            />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(val: any, _name, item: any) => [
                            formatCurrency(Number(val) || 0),
                            item?.payload?.label ?? "Amount",
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 w-full max-w-xs">
                    {categoryBreakdown.map((c, index) => (
                      <div
                        key={c.label}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{
                              backgroundColor: getCategoryColor(c.label, index),
                            }}
                          />
                          <span className="text-gray-700">{c.label}</span>
                        </div>
                        <span className="text-gray-500">
                          {c.percent.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-gray-500">
                  No category data yet.
                </p>
              )}
            </div>

            <div className="space-y-3 min-w-0 w-full overflow-hidden">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Calendar className="w-3 h-3" />
                <span>Monthly Trends</span>
              </div>
              {monthlyTrends.length > 0 ? (
                <div className="h-44 w-full overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="monthLabel"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#6b7280" }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#6b7280" }}
                      />
                      <RechartsTooltip
                        formatter={(val: any, name: any) => [
                          formatCurrency(Number(val) || 0),
                          name === "income" ? "Income" : "Expenses",
                        ]}
                      />
                      <Legend
                        verticalAlign="bottom"
                        align="center"
                        wrapperStyle={{ paddingTop: 8 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="income"
                        name="Income"
                        stroke="#2563eb"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="expense"
                        name="Expenses"
                        stroke="#ef4444"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  No monthly trend data available.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white w-full max-w-full overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <div className="relative flex-1 min-w-0 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search transactions..."
                  className="w-full pl-10 rounded-full bg-gray-50 border border-gray-200 focus-visible:ring-0 focus-visible:ring-offset-0"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
              >
                <Calendar className="w-3 h-3" />
                Date Range
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
              >
                <Filter className="w-3 h-3" />
                Filter Type
              </Button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <span className="font-medium">Table Range:</span>
              <Select
                value={tableDateRange}
                onValueChange={(v: LedgerDateRange) => {
                  setTableDateRange(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-7 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                  <SelectItem value="last-90-days">Last 90 Days</SelectItem>
                  <SelectItem value="this-year">This Year</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-medium">Type:</span>
              <Select
                value={tableTxType}
                onValueChange={(v: LedgerTxTypeFilter) => {
                  setTableTxType(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-7 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Income">Income</SelectItem>
                  <SelectItem value="Expense">Expenses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 min-w-0">
          <div className="border rounded-lg overflow-x-auto w-full max-w-full">
            <Table className="min-w-[920px] w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead className="w-[140px] hidden md:table-cell">Transaction ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">Balance</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recordsLoading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm py-6">
                      Loading transactions...
                    </TableCell>
                  </TableRow>
                )}

                {!recordsLoading && recordsError && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm py-6 text-red-600">
                      {recordsError}
                    </TableCell>
                  </TableRow>
                )}

                {!recordsLoading && !recordsError && pageItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm py-6">
                      No transactions found.
                    </TableCell>
                  </TableRow>
                )}

                {!recordsLoading &&
                  pageItems.map((r) => {
                    const signedAmount = r.type === "Income" ? r.amount : -r.amount;
                    const isIncome = r.type === "Income";
                    return (
                      <TableRow key={r._id}>
                        <TableCell className="text-sm text-gray-700">
                          {new Date(r.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-gray-500 hidden md:table-cell">
                          {r._id}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={isIncome ? "default" : "destructive"}
                            className="text-xs capitalize"
                          >
                            {r.type.toLowerCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-700">
                          {r.category}
                        </TableCell>
                        <TableCell className="text-sm text-gray-700 max-w-[220px] sm:max-w-xs truncate">
                          {r.description}
                        </TableCell>
                        <TableCell
                          className={`text-sm text-right font-semibold ${
                            isIncome ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {signedAmount >= 0 ? "+" : "-"}
                          {formatCurrency(Math.abs(signedAmount))}
                        </TableCell>
                        <TableCell
                          className={`text-sm text-right font-semibold hidden lg:table-cell ${
                            (r as any).balance >= 0
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          {formatCurrency(Math.abs((r as any).balance))}
                        </TableCell>
                        <TableCell className="text-right hidden sm:table-cell">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!modulePerm.delete}
                            onClick={() => handleDeleteEntry(r._id)}
                            title={modulePerm.delete ? 'Delete' : 'No delete permission'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 text-sm text-gray-600">
            <div>
              Showing {totalItems === 0 ? 0 : startIdx + 1}-
              {Math.min(endIdx, totalItems)} of {totalItems} entries
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">Rows per page</span>
              <span className="text-xs">{pageSize}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                Previous
              </Button>
              <span className="text-xs">
                Page {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={isAddOpen}
        onOpenChange={(open) => {
          if (open && !modulePerm.edit) {
            toast({ title: 'Not allowed', description: 'You only have view permission for Financial Ledger.', variant: 'destructive' });
            return;
          }
          setIsAddOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add Manual Entry</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Date
              </Label>
              <Input
                id="date"
                type="date"
                className="col-span-3"
                value={newEntry.date}
                onChange={(e) =>
                  setNewEntry((prev) => ({ ...prev, date: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Type
              </Label>
              <Select
                value={newEntry.type}
                onValueChange={(v: "Income" | "Expense") =>
                  setNewEntry((prev) => ({ ...prev, type: v }))
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Income">Income</SelectItem>
                  <SelectItem value="Expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount
              </Label>
              <Input
                id="amount"
                type="number"
                className="col-span-3"
                value={newEntry.amount}
                onChange={(e) =>
                  setNewEntry((prev) => ({ ...prev, amount: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">
                Category
              </Label>
              <Input
                id="category"
                className="col-span-3"
                value={newEntry.category}
                onChange={(e) =>
                  setNewEntry((prev) => ({ ...prev, category: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Input
                id="description"
                className="col-span-3"
                value={newEntry.description}
                onChange={(e) =>
                  setNewEntry((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="patientId" className="text-right">
                Patient ID (optional)
              </Label>
              <Input
                id="patientId"
                className="col-span-3"
                value={newEntry.patientId}
                onChange={(e) =>
                  setNewEntry((prev) => ({ ...prev, patientId: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddEntry} disabled={createSaving || !modulePerm.edit}>
              {createSaving ? "Saving..." : "Save Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinancialLedger;
