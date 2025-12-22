import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, DollarSign, Filter, Search } from "lucide-react";
import { getExpenseEntries, addLedgerEntry } from "@/components/lab compoenents/finance/labFinanceStore";
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

interface ExpenseRecord {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: Date;
  reference?: string;
}

const categories = [
  "Lab Bills",
  "Equipment Expenses",
  "Salaries",
  "Utilities",
  "Supplies",
];

const LabExpenses = () => {
  const { toast } = useToast();
  const modulePerm = getModulePermission('Expenses');
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({ description: "", amount: "", category: categories[0] });

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const rows = await getExpenseEntries();
        if (cancelled) return;
        const loaded = rows.map((e) => ({
          id: e.id,
          category: e.category,
          description: e.description,
          amount: e.amount,
          date: new Date(e.date),
          reference: e.reference,
        }));
        setExpenses(loaded);
      } catch (err: any) {
        if (cancelled) return;
        setExpenses([]);
        setError(
          err?.response?.data?.error ||
            err?.response?.data?.message ||
            err?.message ||
            'Failed to load expenses'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const matchesSearch =
        e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "all" || e.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchTerm, categoryFilter]);

  useEffect(() => setPage(1), [searchTerm, categoryFilter]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const pageItems = filtered.slice(startIdx, endIdx);

  const exportCsv = () => {
    const headers = ["Description", "Category", "Amount", "Date", "Reference"];
    const rows = filtered.map((e) => [
      e.description,
      e.category,
      e.amount.toFixed(2),
      e.date.toLocaleDateString(),
      e.reference || "",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `lab_expenses_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const addExpense = async () => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: 'You only have view permission for Expenses.', variant: 'destructive' });
      return;
    }
    if (!newExpense.description || !newExpense.amount) return;
    const created = await addLedgerEntry({
      type: "expense",
      source: "Expense",
      category: newExpense.category,
      description: newExpense.description,
      amount: parseFloat(newExpense.amount),
      date: new Date().toISOString(),
    });
    const rec: ExpenseRecord = {
      id: created.id,
      category: created.category,
      description: created.description,
      amount: created.amount,
      date: new Date(created.date),
      reference: created.reference,
    };
    setExpenses((prev) => [rec, ...prev]);
    setNewExpense({ description: "", amount: "", category: categories[0] });
    setIsAddOpen(false);
    toast({ title: 'Expense added' });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lab Expenses</h1>
          <p className="text-sm text-gray-600">Track and add laboratory expenses</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCsv}><Download className="w-4 h-4 mr-2"/>Export</Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button
                disabled={!modulePerm.edit}
                onClick={(e) => {
                  if (!modulePerm.edit) {
                    e.preventDefault();
                    toast({ title: 'Not allowed', description: 'You only have view permission for Expenses.', variant: 'destructive' });
                    return;
                  }
                }}
              >
                <DollarSign className="w-4 h-4 mr-2"/>Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Expense</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="desc" className="text-right">Description</Label>
                  <Input id="desc" className="col-span-3" value={newExpense.description} onChange={(e)=>setNewExpense({...newExpense, description: e.target.value})} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="amount" className="text-right">Amount (PKR)</Label>
                  <Input id="amount" type="number" className="col-span-3" value={newExpense.amount} onChange={(e)=>setNewExpense({...newExpense, amount: e.target.value})} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category" className="text-right">Category</Label>
                  <select id="category" className="col-span-3 border rounded-md p-2" value={newExpense.category} onChange={(e)=>setNewExpense({...newExpense, category: e.target.value})}>
                    {categories.map(c => (<option key={c} value={c}>{c}</option>))}
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={()=>setIsAddOpen(false)}>Cancel</Button>
                <Button disabled={!modulePerm.edit} onClick={addExpense}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input placeholder="Search expenses..." className="pl-10" value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} />
        </div>
        <select className="p-2 border rounded-md" value={categoryFilter} onChange={(e)=>setCategoryFilter(e.target.value)}>
          <option value="all">All Categories</option>
          {categories.map(c => (<option key={c} value={c}>{c}</option>))}
        </select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
          <CardDescription>Recent expenses</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-gray-600 mb-2">Loading...</div>
          ) : null}
          {!loading && error ? (
            <div className="text-sm text-red-600 mb-2">{error}</div>
          ) : null}
          <div className="space-y-3">
            {pageItems.map(e => (
              <div key={e.id} className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <div className="font-medium">{e.description}</div>
                  <div className="text-sm text-gray-600">{e.category}</div>
                  <div className="text-xs text-gray-500">{e.date.toLocaleDateString()} {e.reference ? `• Ref: ${e.reference}` : ''}</div>
                </div>
                <div className="text-red-600 font-bold">- PKR {e.amount.toFixed(2)}</div>
              </div>
            ))}
            {pageItems.length === 0 && (
              <div className="text-sm text-gray-500">No expenses found.</div>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-sm text-gray-600">Showing {totalItems === 0 ? 0 : startIdx + 1}-{Math.min(endIdx, totalItems)} of {totalItems}</div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Rows per page</label>
              <select className="p-1 border rounded-md text-sm" value={pageSize} onChange={(e)=>{ setPageSize(parseInt(e.target.value)||10); setPage(1); }}>
                {[5,10,20,50].map(sz => (<option key={sz} value={sz}>{sz}</option>))}
              </select>
              <Button variant="outline" size="sm" onClick={()=> setPage(p=> Math.max(1, p-1))} disabled={currentPage<=1}>Prev</Button>
              <span className="text-sm text-gray-700">Page {currentPage} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={()=> setPage(p=> Math.min(totalPages, p+1))} disabled={currentPage>=totalPages}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LabExpenses;
