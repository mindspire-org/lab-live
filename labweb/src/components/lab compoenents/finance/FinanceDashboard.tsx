
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Search,
  Download,
  Filter
} from "lucide-react";
import { getAllLedgerEntries, LabLedgerEntry } from "@/components/lab compoenents/finance/labFinanceStore";

interface FinanceRecord {
  id: string;
  type: "income" | "expense";
  category: string;
  description: string;
  amount: number;
  date: Date;
  reference?: string;
}

interface NewExpenseForm {
  description: string;
  amount: string;
  category: string;
}


const FinanceDashboard = () => {
  const [dateFilter, setDateFilter] = useState("thisMonth");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddFinanceOpen, setIsAddFinanceOpen] = useState(false);
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const expenseCategories = [
    "Lab Bills",
    "Equipment Expenses",
    "Salaries",
    "Utilities",
    "Supplies"
  ];

  const [newExpense, setNewExpense] = useState<NewExpenseForm>({
    description: "",
    amount: "",
    category: expenseCategories[0]
  });

   

  const [financeData, setFinanceData] = useState<FinanceRecord[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  // pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const txSectionRef = useRef<HTMLDivElement | null>(null);

  // load transactions from backend ledger
  useEffect(() => {
    let cancelled = false;
    setTxLoading(true);
    setTxError(null);
    (async () => {
      try {
        const entries = await getAllLedgerEntries();
        if (cancelled) return;
        const mapped: FinanceRecord[] = entries.map((e: LabLedgerEntry) => ({
          id: e.id,
          type: e.type,
          category: e.category,
          description: e.description,
          amount: e.amount,
          date: new Date(e.date),
          reference: e.reference,
        }));
        setFinanceData(mapped);
      } catch (err: any) {
        if (cancelled) return;
        setFinanceData([]);
        setTxError(
          err?.response?.data?.error ||
            err?.response?.data?.message ||
            err?.message ||
            'Failed to load transactions'
        );
      } finally {
        if (!cancelled) setTxLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // fetch inventory for stock value
  useEffect(() => {
    // Prefer finance_token when used inside Finance portal
    const token = localStorage.getItem('finance_token') || localStorage.getItem('token');
    fetch(`/api/lab/inventory/inventory`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      credentials: 'include'
    })
      .then(res => res.ok ? res.json() : [])
      .then(rows => Array.isArray(rows) ? setInventory(rows) : setInventory([]))
      .catch(() => setInventory([]));
  }, []);

  // compute total income from ledger
  useEffect(() => {
    const income = financeData
      .filter(r => r.type === "income")
      .reduce((sum, r) => sum + r.amount, 0);
    setTotalIncome(income);
  }, [financeData]);

    // Current month filter helpers
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const getTotalIncome = () => totalIncome;

  const getTotalExpenses = () => {
    return financeData
      .filter(record => record.type === "expense" && record.date.getMonth() === currentMonth && record.date.getFullYear() === currentYear)
      .reduce((total, record) => total + record.amount, 0);
  };

  const getNetProfit = () => {
    return getTotalIncome() - getTotalExpenses();
  };

  const getTotalPurchasesThisMonth = () => {
    return financeData
      .filter(r => r.type === 'expense' && r.category === 'Supplies' && r.date.getMonth() === currentMonth && r.date.getFullYear() === currentYear)
      .reduce((sum, r) => sum + r.amount, 0);
  };

  const getTotalStockValue = () => {
    return inventory.reduce((sum: number, it: any) => {
      const unitPrice = (typeof it.salePricePerUnit === 'number' && !isNaN(it.salePricePerUnit)) ? it.salePricePerUnit : (it.costPerUnit || 0);
      return sum + (it.currentStock || 0) * unitPrice;
    }, 0);
  };

  const jumpToTransactions = (cat?: string) => {
    if (cat) setCategoryFilter(cat);
    setTimeout(() => {
      txSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const filteredRecords = financeData.filter(record => {
    const matchesSearch = record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || record.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // reset to first page when filters/search change
  useEffect(() => { setPage(1); }, [searchTerm, categoryFilter]);

  const totalItems = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const pageItems = filteredRecords.slice(startIdx, endIdx);

  const categories = ["all", "Lab Bills", "Equipment Expenses", "Salaries", "Utilities", "Supplies"];

  // Export filtered records to CSV
  const handleExport = () => {
    const headers = ["Description", "Category", "Type", "Amount", "Date", "Reference"];
    const rows = filteredRecords.map(r => [
      r.description,
      r.category,
      r.type,
      r.amount,
      r.date.toLocaleDateString(),
      r.reference ?? ""
    ]);
    const csvContent = [headers, ...rows]
      .map(e => e.map(value => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `finance_report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance Dashboard</h1>
          <p className="text-sm text-gray-600">Track income, expenses, and profitability</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" className="mr-2" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card ref={txSectionRef as any}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Income</p>
                <p className="text-2xl font-bold text-green-600">PKR {getTotalIncome().toFixed(2)}</p>
                <p className="text-xs text-gray-500">This month</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">PKR {getTotalExpenses().toFixed(2)}</p>
                <p className="text-xs text-gray-500">This month</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Net Profit</p>
                <p className={`text-2xl font-bold ${getNetProfit() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  PKR {(getNetProfit()/1000).toFixed(1)}K
                </p>
                <p className="text-xs text-gray-500">This month</p>
              </div>
              
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Purchases</p>
                <p className="text-2xl font-bold text-blue-900">PKR {getTotalPurchasesThisMonth().toFixed(2)}</p>
                <p className="text-xs text-gray-500">Supplies • This month</p>
              </div>
              {/* removed View Details button */}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Stock Value</p>
                <p className="text-2xl font-bold text-purple-800">PKR {getTotalStockValue().toFixed(2)}</p>
                <p className="text-xs text-gray-500">Current inventory</p>
              </div>
              {/* removed View Details button */}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <select
          className="p-2 border border-gray-300 rounded-md"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          {categories.map(category => (
            <option key={category} value={category}>
              {category === 'all' ? 'All Categories' : category}
            </option>
          ))}
        </select>

        <select
          className="p-2 border border-gray-300 rounded-md"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        >
          <option value="thisMonth">This Month</option>
          <option value="lastMonth">Last Month</option>
          <option value="thisQuarter">This Quarter</option>
          <option value="thisYear">This Year</option>
        </select>
      </div>

      {/* Transaction List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest financial activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {txLoading ? (
              <div className="text-sm text-gray-600">Loading transactions...</div>
            ) : null}
            {!txLoading && txError ? (
              <div className="text-sm text-red-600">{txError}</div>
            ) : null}
            {pageItems.map((record) => (
              <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className={`w-2 h-8 rounded ${record.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <div>
                    <h4 className="font-medium">{record.description}</h4>
                    <p className="text-sm text-gray-600">{record.category}</p>
                    <p className="text-xs text-gray-500">
                      {record.date.toLocaleDateString()} 
                      {record.reference && ` • Ref: ${record.reference}`}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <Badge variant={record.type === "income" ? "default" : "destructive"}>
                    {record.type}
                  </Badge>
                  <p className={`text-lg font-bold mt-1 ${record.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {record.type === 'income' ? '+' : '-'}PKR {record.amount.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
            {pageItems.length === 0 && (
              <div className="text-sm text-gray-500">{txLoading ? ' ' : 'No transactions found.'}</div>
            )}
          </div>
          {/* Pagination controls */}
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-sm text-gray-600">
              Showing {totalItems === 0 ? 0 : startIdx + 1}-{Math.min(endIdx, totalItems)} of {totalItems}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Rows per page</label>
              <select
                className="p-1 border rounded-md text-sm"
                value={pageSize}
                onChange={(e)=>{ setPageSize(parseInt(e.target.value)||10); setPage(1); }}
              >
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

export default FinanceDashboard;
