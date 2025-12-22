import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TestType } from "@/types/sample";
// import { labDataStore } from "@/store/labData";
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  TestTube,
  Eye,
  Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { triggerNotificationsRefresh } from "@/hooks/use-notifications";
import { api } from "@/lab lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TestCatalogProps {
  onNavigateBack?: () => void;
}

const TestCatalog = ({ onNavigateBack }: TestCatalogProps) => {
  const [modulePerm, setModulePerm] = useState<{ view: boolean; edit: boolean; delete: boolean }>({
    view: true,
    edit: true,
    delete: true,
  });

  useEffect(() => {
    const loadPerms = () => {
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('permissions') : null;
        const parsed = raw ? JSON.parse(raw) : null;
        if (!Array.isArray(parsed) || parsed.length === 0) return;
        const p = parsed.find((x: any) => String(x?.name || '').trim() === 'Test Catalog');
        if (!p) return;
        setModulePerm({
          view: !!p.view,
          edit: !!p.edit,
          delete: !!p.delete,
        });
      } catch {
        // ignore
      }
    };

    loadPerms();
    const onStorage = () => loadPerms();
    const onFocus = () => loadPerms();
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // Basic CSV parser (handles quoted fields and commas within quotes)
  const parseCSV = (text: string): any[] => {
    const rows: string[][] = [];
    let row: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];
      if (ch === '"') {
        if (inQuotes && next === '"') { // escaped quote
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        row.push(cur);
        cur = '';
      } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
        if (cur.length || row.length) {
          row.push(cur);
          rows.push(row);
          row = [];
          cur = '';
        }
        // handle CRLF by skipping the next \n when \r\n
        if (ch === '\r' && next === '\n') i++;
      } else {
        cur += ch;
      }
    }
    if (cur.length || row.length) {
      row.push(cur);
      rows.push(row);
    }
    if (rows.length === 0) return [];
    const headers = rows[0].map(h => (h || '').toString().trim());
    const dataRows = rows.slice(1).filter(r => r.some(c => (c || '').toString().trim() !== ''));
    return dataRows.map(cols => {
      const obj: any = {};
      headers.forEach((h, idx) => {
        obj[h] = (cols[idx] ?? '').toString().trim();
      });
      return obj;
    });
  };
  // helper functions for parameter list
  const addParam = () => {
    if (editingTest) {
      (editingTest as any).parameters = [...((editingTest as any).parameters||[]), { id:'',name:'',unit:'',normalMin:0,normalMax:0 }];
      setEditingTest({ ...editingTest });
    } else {
      setNewTest(prev=>({...prev, parameters:[...prev.parameters, { id:'',name:'',unit:'',normalMin:0,normalMax:0 }]}));
    }
  };
  const updateParam = (idx:number,key:string,value:any)=>{
    if (editingTest) {
      const arr = [...((editingTest as any).parameters||[])];
      arr[idx] = { ...arr[idx], [key]: value };
      (editingTest as any).parameters = arr;
      setEditingTest({ ...editingTest });
    } else {
      const arr = [...newTest.parameters];
      arr[idx] = { ...arr[idx], [key]: value };
      setNewTest({...newTest, parameters: arr});
    }
  };
  const removeParam = (idx:number)=>{
    if (editingTest) {
      (editingTest as any).parameters = ((editingTest as any).parameters||[]).filter((_,i)=>i!==idx);
      setEditingTest({ ...editingTest });
    } else {
      setNewTest({...newTest, parameters: newTest.parameters.filter((_,i)=>i!==idx)});
    }
  };

  const [tests, setTests] = useState<TestType[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isAddingTest, setIsAddingTest] = useState(false);
  const [showPricingDialog, setShowPricingDialog] = useState(false);
  const [pricingTax, setPricingTax] = useState<string>("");
  const [pricingDiscount, setPricingDiscount] = useState<string>("");
  // helper: specimen options
  
  const [editingTest, setEditingTest] = useState<TestType | null>(null);
  const [viewTest, setViewTest] = useState<TestType | null>(null);
  interface ParameterInput {
    id: string;
    name: string;
    unit: string;
    normalMin: number;
    normalMax: number;
    criticalMin?: number;
    criticalMax?: number;
    normalRangeMale?: string;
    normalRangeFemale?: string;
    normalRangePediatric?: string;
  }

  const [newTest, setNewTest] = useState({
    name: "",
    category: "",
    notes: "",
    
    price: 0,
    
    sampleType: "blood" as "blood" | "urine" | "other",
    parameters: [] as ParameterInput[],
    specimen: "blood",
    fastingRequired: false,
  });

  // Pricing: load tax/discount from backend Settings API
  const [taxRate, setTaxRate] = useState<number>(0);
  const [discountRate, setDiscountRate] = useState<number>(0);
  useEffect(() => {
    const loadPricing = async () => {
      try {
        const res = await api.get('/settings');
        const pricing = (res.data && res.data.pricing) || {};
        const tr = Number(pricing.taxRate) || 0;
        const dr = Number(pricing.bulkDiscountRate) || 0;
        setTaxRate(tr);
        setDiscountRate(dr);
        setPricingTax(String(tr));
        setPricingDiscount(String(dr));
      } catch (err) {
        console.error('Failed to load pricing settings', err);
        setTaxRate(0);
      }
    };
    loadPricing();
  }, []);

  const handleApplyPricing = async () => {
    const newTax = Math.max(0, Number(pricingTax) || 0);
    const newDiscount = Math.max(0, Number(pricingDiscount) || 0);
    try {
      // Get current settings, merge pricing, and save back
      const current = await api.get('/settings');
      const data = current.data || {};
      const existingPricing = data.pricing || {};

      const payload = {
        ...data,
        pricing: {
          ...existingPricing,
          taxRate: newTax,
          bulkDiscountRate: newDiscount,
        },
      };

      // Avoid sending Mongo-specific fields
      delete (payload as any)._id;
      delete (payload as any).__v;
      delete (payload as any).createdAt;
      delete (payload as any).updatedAt;

      const res = await api.put('/settings', payload);
      const updated = res.data || {};
      const updatedPricing = updated.pricing || payload.pricing;

      const finalTax = Number(updatedPricing.taxRate) || newTax;
      const finalDiscount = Number(updatedPricing.bulkDiscountRate) || newDiscount;
      setTaxRate(finalTax);
      setDiscountRate(finalDiscount);
      setPricingTax(String(finalTax));
      setPricingDiscount(String(finalDiscount));

      setShowPricingDialog(false);
      toast({
        title: "Pricing Updated",
        description: `Discount ${finalDiscount}% and tax ${finalTax}% saved for new tests.`,
      });
    } catch (err) {
      console.error('Failed to update pricing settings', err);
      toast({
        title: "Error",
        description: "Failed to update pricing settings on server.",
        variant: "destructive",
      });
    }
  };

  // Current base price and computed tax-inclusive price for real-time display
  const currentBasePrice = (editingTest ? Number((editingTest as any)?.price || 0) : Number(newTest.price || 0));
  const priceInclTax = useMemo(() => {
    const base = Number(currentBasePrice) || 0;
    const { amount } = computeIncl(base);
    return amount;
  }, [currentBasePrice, taxRate, discountRate]);

  // Helper that applies current discount and tax rate from backend settings
  function computeIncl(price: number) {
    const rate = Number(taxRate) || 0;
    const disc = Number(discountRate) || 0;
    const base = Number(price) || 0;
    const afterDiscount = base * (1 - disc / 100);
    const amount = afterDiscount * (1 + rate / 100);
    return {
      rate,
      discount: disc,
      base,
      afterDiscount,
      amount,
    } as {
      rate: number;
      discount: number;
      base: number;
      afterDiscount: number;
      amount: number;
    };
  }

  // NEW: master lab tests for auto–fill

  // helper to auto-fill based on master test match
  const autoFillFromMaster = (val: string) => {
    const v = (val || '').toString();
    const byName = masterTests.find((t) => (t.Test_Name || '').toString().toLowerCase() === v.toLowerCase());
    if (byName) {
      const filled = {
        name: byName.Test_Name,
        category: byName.Category || "",
        notes: byName.Notes || "",
        price: parseFloat(byName.Price) || 0,
        sampleType: (byName.Specimen || "blood").toLowerCase() as "blood" | "urine" | "other",
        fastingRequired: (byName.Fasting_Required || "no").toString().toLowerCase().startsWith("y"),
      };
      if (editingTest) setEditingTest({ ...(editingTest as any), ...filled });
      else setNewTest((prev) => ({ ...prev, ...filled }));
      return;
    }

    // Try realtime CSV by Test_Type
    const byType = realtimeTests.find((t) => (t.Test_Type || '').toString().toLowerCase() === v.toLowerCase());
    if (!byType) return;
    const params = buildParamsFromRealtime(byType);
    const filled = {
      name: byType.Test_Type || v,
      category: byType.Category || "",
      notes: "",
      price: 0,
      sampleType: "blood" as "blood" | "urine" | "other",
      fastingRequired: false,
    };
    if (editingTest) {
      const merged: any = { ...(editingTest as any), ...filled };
      (merged as any).parameters = params;
      setEditingTest(merged);
    } else {
      setNewTest((prev) => ({ ...prev, ...filled, parameters: params }));
    }
  }
  const [masterTests, setMasterTests] = useState<any[]>([]);
  const [realtimeTests, setRealtimeTests] = useState<any[]>([]);

  useEffect(() => {
    api
      .get("/tests")
      .then((r) => setTests(r.data))
      .catch(() => setTests([]));
  }, []);

  useEffect(() => {
    // Fetch master list once from public CSV for client-side auto-fill
    const base = (import.meta as any)?.env?.BASE_URL || './';
    const csvUrl = `${base}lab_tests_500.csv`;
    fetch(csvUrl)
      .then((r) => r.text())
      .then((csv) => {
        const data = parseCSV(csv);
        // Normalize and de-duplicate by Test_Name (case-insensitive)
        const unique = Array.from(
          new Map(
            (data as any[]).map((item: any) => [
              (item.Test_Name ?? "").toString().trim().toLowerCase(),
              item,
            ])
          ).values()
        );
        setMasterTests(unique);
      })
      .catch(() => setMasterTests([]));
  }, []);

  useEffect(() => {
    // Fetch realtime categorized CSV (large) for auto-fill by Test_Type
    const base = (import.meta as any)?.env?.BASE_URL || './';
    const csvUrl = `${base}lab_reports_realtime_1000_categorized.csv`;
    fetch(csvUrl)
      .then((r) => r.text())
      .then((csv) => {
        const data = parseCSV(csv);
        // Normalize and de-duplicate by Test_Type
        const unique = Array.from(
          new Map(
            (data as any[]).map((item: any) => [
              (item.Test_Type ?? "").toString().trim().toLowerCase(),
              item,
            ])
          ).values()
        );
        setRealtimeTests(unique);
      })
      .catch(() => setRealtimeTests([]));
  }, []);

  const { toast } = useToast();

  // Prepare an editable copy of a test loaded from DB
  const openEditTest = (test: any) => {
    const copy: any = { ...test };
    setEditingTest(copy as TestType);
  };

  // Build parameters array from realtime CSV record
  const buildParamsFromRealtime = (item: any) => {
    const params: ParameterInput[] = [] as any;
    if (!item || typeof item !== 'object') return params;
    const keys = Object.keys(item);
    // group by base name where columns follow pattern Base_NormalRange and Base_Unit
    const bases = new Set<string>();
    keys.forEach((k) => {
      if (k.endsWith('_NormalRange') || k.endsWith('_Unit')) {
        const base = k.replace(/_(NormalRange|Unit)$/,'');
        if (base && base !== 'Category') bases.add(base);
      }
    });
    bases.forEach((base) => {
      const unit = (item[`${base}_Unit`] ?? '').toString();
      const rangeStr = (item[`${base}_NormalRange`] ?? '').toString();
      let normalMin = 0, normalMax = 0;
      const m = rangeStr.match(/(-?\d*\.?\d+)\s*-\s*(-?\d*\.?\d+)/);
      if (m) {
        normalMin = parseFloat(m[1]);
        normalMax = parseFloat(m[2]);
      }
      const name = base.replace(/_/g,' ').replace(/\bfl\b/i,'fL');
      if (unit || rangeStr) {
        params.push({ id: '', name, unit, normalMin, normalMax });
      }
    });
    return params;
  };

  const handleBackButton = () => {
    if (onNavigateBack) {
      onNavigateBack();
    } else {
      window.history.back();
    }
  };

  const mapParam = (p: ParameterInput) => ({
    id: p.id,
    name: p.name,
    unit: p.unit,
    normalRange: { min: p.normalMin, max: p.normalMax },
    criticalRange: p.criticalMin !== undefined && p.criticalMax !== undefined ? { min: p.criticalMin, max: p.criticalMax } : undefined,
  });

  const handleAddTest = async () => {
    if (!modulePerm.edit) {
      toast({ title: "Not allowed", description: "You don't have permission to add tests.", variant: "destructive" });
      return;
    }
    if (!newTest.name || !newTest.category || !newTest.notes) {
      toast({
        title: "Error",
        description: "Please fill all required fields (Name, Category, Notes).",
        variant: "destructive"
      });
      return;
    }

    const basePrice = Number(newTest.price || 0);
    if (!basePrice || basePrice <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid Price greater than 0.",
        variant: "destructive",
      });
      return;
    }

    const params = (newTest.parameters && newTest.parameters.length)
      ? newTest.parameters.map(mapParam)
      : [] as any[];

    let addedTest: any;
    try {
      const res = await api.post("/tests", {
        name: newTest.name,
        category: newTest.category,
        // Store base price only (no tax/discount applied in DB)
        price: basePrice,
        sampleType: newTest.sampleType,
        description: newTest.notes,
        fastingRequired: newTest.fastingRequired,
        parameters: params,
      });
      addedTest = res.data;
    } catch (error: any) {
      const detail =
        error?.response?.data?.message ||
        (error?.response?.data && JSON.stringify(error.response.data)) ||
        "Unknown error";
      toast({ title: "Error", description: `Failed to add test: ${detail}`, variant: "destructive" });
      return;
    }
    setTests((prev) => [...prev, addedTest]);
    setNewTest({
      name: "",
      category: "",
      notes: "",
      price: 0,
      sampleType: "blood" as "blood" | "urine" | "other",
      parameters: [],
      specimen: "blood",
      fastingRequired: false,
    });
    setIsAddingTest(false);
    
    toast({
      title: "Test Added",
      description: `${addedTest.name} has been added to the catalog.`,
    });
    // Immediately refresh notifications bell/list
    triggerNotificationsRefresh();
  };

  const handleEditTest = async () => {
    if (!editingTest) return;
    if (!modulePerm.edit) {
      toast({ title: "Not allowed", description: "You don't have permission to edit tests.", variant: "destructive" });
      return;
    }
    const et: any = editingTest as any;
    const hasList = Array.isArray(et.parameters) && et.parameters.length > 0;
    const mapped = hasList ? et.parameters.map(mapParam) : [] as any[];

    const basePrice = Number((editingTest as any).price || 0);
    if (!basePrice || basePrice <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid Price greater than 0.",
        variant: "destructive",
      });
      return;
    }

    // Store base price only (no tax/discount applied in DB)
    const payload = { ...editingTest, price: basePrice, parameters: mapped };
    if (!editingTest) return;

    let updated: any;
    try {
      const res = await api.put(`/tests/${editingTest._id}`, payload);
      updated = res.data;
    } catch {
      toast({ title: "Error", description: "Failed to update test", variant: "destructive" });
      return;
    }
    setTests((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
    setEditingTest(null);
    toast({
      title: "Test Updated",
      description: `${updated.name} has been updated.`,
    });
  };

  const handleDeleteTest = async (id: string) => {
    if (!modulePerm.delete) {
      toast({ title: "Not allowed", description: "You don't have permission to delete tests.", variant: "destructive" });
      return;
    }
    try {
      await api.delete(`/tests/${id}`);
    } catch {
      toast({ title: "Error", description: "Failed to delete test", variant: "destructive" });
      return;
    }
    setTests((prev) => prev.filter((t) => t._id !== id));
    toast({
      title: "Test Deleted",
      description: "Test has been removed from the catalog.",
    });
  };

  const filteredTests = tests.filter(test => {
    const matchesSearch = test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         test.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || test.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(tests.map(test => test.category)));
  const nameOptions = useMemo(() => {
    const a = masterTests.map((t: any) => (t.Test_Name ?? "").toString().trim());
    const b = realtimeTests.map((t: any) => (t.Test_Type ?? "").toString().trim());
    return Array.from(new Set([...a, ...b].filter(Boolean)));
  }, [masterTests, realtimeTests]);

  // Specimen dropdown (blood/urine/other + any extra from master sheet)
  const specimenOptions = useMemo(() => {
    const basics = ["blood", "urine", "other"];
    const extra = Array.from(
      new Set(
        masterTests
          .map((t: any) => (t.Specimen ?? "").toString().trim().toLowerCase())
          .filter((s: string) => s && !basics.includes(s))
      )
    );
    return [...basics, ...extra];
  }, [masterTests]);

  // Input refs for Enter navigation (fix: ensure these are defined in component scope)
  const testNameRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const sampleTypeRef = useRef<HTMLSelectElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">Test Catalog</h1>
          <p className="text-sm text-gray-600">Manage and view all available lab tests</p>
        </div>
        <div className="flex sm:justify-end">
          <Button 
            className="flex items-center gap-2 bg-blue-800 text-white hover:bg-blue-700"
            onClick={() => setIsAddingTest(true)}
            disabled={!modulePerm.edit}
          >
            <Plus className="w-4 h-4" />
            Add New Test
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full max-w-3xl">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input placeholder="Search tests..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-11" />
        </div>
        
        <select className="px-3 py-2 border border-gray-200 rounded-md text-sm w-full sm:w-44" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">All Categories</option>
          {categories.map(category => (<option key={category} value={category}>{category}</option>))}
        </select>
      </div>

      {/* Add/Edit Test Form in Dialog */}
      <Dialog
        open={isAddingTest || !!editingTest}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddingTest(false);
            setEditingTest(null);
          }
        }}
      >
        <DialogContent className="w-full max-w-5xl max-h-[90vh] overflow-y-auto sm:rounded-lg">
          <DialogHeader>
            <DialogTitle>{editingTest ? "Edit Test" : "Add New Test"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="testName">Test Name</Label>
                <Input
                  id="testName"
                  ref={testNameRef}
                  placeholder="Enter test name"
                  list="test-name-options"
                  value={editingTest ? editingTest.name : newTest.name}
                  onChange={(e) => {
                    const val = e.target.value;

                    // update the name field
                    if (editingTest) {
                      setEditingTest({ ...editingTest, name: val });
                    } else {
                      setNewTest({ ...newTest, name: val });
                    }

                    // attempt auto-fill if exact match
                    autoFillFromMaster(val);

                  }}
                  onBlur={(e) => {
                    const val = e.target.value.toLowerCase();
                    autoFillFromMaster(val);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') categoryRef.current?.focus();
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  ref={categoryRef}
                  placeholder="Enter category"
                  value={editingTest ? editingTest.category : newTest.category}
                  onChange={(e) => editingTest 
                    ? setEditingTest({...editingTest, category: e.target.value})
                    : setNewTest({...newTest, category: e.target.value})
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') notesRef.current?.focus();
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  ref={notesRef}
                  placeholder="Enter test notes"
                  value={editingTest ? (editingTest as any).notes ?? "" : newTest.notes}
                  onChange={(e) => editingTest 
                    ? setEditingTest({ ...(editingTest as any), notes: e.target.value })
                    : setNewTest({ ...newTest, notes: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') priceRef.current?.focus();
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (PKR)</Label>
                <Input
                  id="price"
                  ref={priceRef}
                  type="number"
                  placeholder="0.00"
                  value={editingTest
                    ? (editingTest.price === 0 || editingTest.price === undefined ? "" : editingTest.price)
                    : (newTest.price === 0 || newTest.price === undefined ? "" : newTest.price)
                  }
                  onChange={(e) => {
                    const raw = e.target.value;
                    const num = parseFloat(raw);
                    const safe = !isNaN(num) && num > 0 ? num : 0;
                    if (editingTest) {
                      setEditingTest({ ...editingTest, price: safe });
                    } else {
                      setNewTest({ ...newTest, price: safe });
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') sampleTypeRef.current?.focus();
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sampleType">Specimen</Label>
                <select
                  id="sampleType"
                  ref={sampleTypeRef}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={editingTest ? editingTest.sampleType : newTest.sampleType}
                  onChange={(e) =>
                    editingTest
                      ? setEditingTest({ ...editingTest, sampleType: e.target.value as any })
                      : setNewTest({ ...newTest, sampleType: e.target.value as any })
                  }
                >
                  {specimenOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Fasting</Label>
                <div className="h-10 flex items-center px-3 border border-gray-300 rounded-md gap-4">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="fastingRequired"
                      value="required"
                      checked={editingTest ? !!(editingTest as any).fastingRequired : !!newTest.fastingRequired}
                      onChange={() =>
                        editingTest
                          ? setEditingTest({ ...(editingTest as any), fastingRequired: true })
                          : setNewTest({ ...newTest, fastingRequired: true })
                      }
                    />
                    <span>Required</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="fastingRequired"
                      value="not-required"
                      checked={editingTest ? !(editingTest as any).fastingRequired : !newTest.fastingRequired}
                      onChange={() =>
                        editingTest
                          ? setEditingTest({ ...(editingTest as any), fastingRequired: false })
                          : setNewTest({ ...newTest, fastingRequired: false })
                      }
                    />
                    <span>Not Required</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Parameters */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between gap-3">
                <Label>Parameters</Label>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-blue-600 text-blue-700 hover:text-blue-800 hover:border-blue-700"
                  onClick={(e) => {
                    e.preventDefault();
                    addParam();
                  }}
                >
                  Add Parameter
                </Button>
              </div>
              {(editingTest ? (editingTest as any).parameters : newTest.parameters).length === 0 ? (
                <div className="text-xs text-gray-500">
                  No parameters. Select a test name to auto-fill, or click "Add Parameter".
                </div>
              ) : (
                <div className="space-y-3">
                  {(editingTest ? (editingTest as any).parameters : newTest.parameters).map((p, idx) => (
                    <div key={idx} className="border rounded-md p-3 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                        <div className="md:col-span-2">
                          <Label className="text-xs">Name</Label>
                          <Input
                            className="h-10"
                            placeholder="Name"
                            value={p.name}
                            onChange={(e) => updateParam(idx, 'name', e.target.value)}
                          />
                        </div>
                        <div className="md:col-span-1">
                          <Label className="text-xs">Unit</Label>
                          <Input
                            className="h-10"
                            placeholder="Unit"
                            value={p.unit}
                            onChange={(e) => updateParam(idx, 'unit', e.target.value)}
                          />
                        </div>
                        <div className="md:col-span-1">
                          <Label className="text-xs">Normal Min</Label>
                          <Input
                            className="h-10"
                            type="number"
                            placeholder="Min"
                            value={p.normalMin}
                            onChange={(e) => updateParam(idx, 'normalMin', e.target.valueAsNumber)}
                          />
                        </div>
                        <div className="md:col-span-1">
                          <Label className="text-xs">Normal Max</Label>
                          <Input
                            className="h-10"
                            type="number"
                            placeholder="Max"
                            value={p.normalMax}
                            onChange={(e) => updateParam(idx, 'normalMax', e.target.valueAsNumber)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end mt-2">
                        <div className="md:col-span-1">
                          <Label className="text-xs">Critical Min</Label>
                          <Input
                            className="h-10"
                            type="number"
                            placeholder="Crit Min"
                            value={p.criticalMin ?? ''}
                            onChange={(e) => updateParam(idx, 'criticalMin', e.target.valueAsNumber)}
                          />
                        </div>
                        <div className="md:col-span-1">
                          <Label className="text-xs">Critical Max</Label>
                          <Input
                            className="h-10"
                            type="number"
                            placeholder="Crit Max"
                            value={p.criticalMax ?? ''}
                            onChange={(e) => updateParam(idx, 'criticalMax', e.target.valueAsNumber)}
                          />
                        </div>
                        <div className="md:col-span-4 flex justify-end">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              removeParam(idx);
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 mt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsAddingTest(false);
                  setEditingTest(null);
                }}
              >
                Cancel
              </Button>
              <Button
                ref={saveButtonRef}
                onClick={editingTest ? handleEditTest : handleAddTest}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (editingTest ? handleEditTest() : handleAddTest());
                }}
                disabled={!modulePerm.edit}
              >
                {editingTest ? "Update Test" : "Add Test"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pricing dialog for Discount and Tax */}
      <Dialog open={showPricingDialog} onOpenChange={setShowPricingDialog}>
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <DialogTitle>Pricing Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pricingDiscount">Discount (%)</Label>
              <Input
                id="pricingDiscount"
                type="number"
                min={0}
                value={pricingDiscount}
                onChange={(e) => setPricingDiscount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pricingTax">Tax (%)</Label>
              <Input
                id="pricingTax"
                type="number"
                min={0}
                value={pricingTax}
                onChange={(e) => setPricingTax(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowPricingDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleApplyPricing}>Apply</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Test Details Dialog */}
      <Dialog
        open={!!viewTest}
        onOpenChange={(open) => {
          if (!open) setViewTest(null);
        }}
      >
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Test Details</DialogTitle>
          </DialogHeader>
          {viewTest && (
            <div className="space-y-3 text-sm text-gray-800">
              <div className="flex justify-between">
                <span className="font-semibold">Name:</span>
                <span>{viewTest.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Category:</span>
                <span>{viewTest.category || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Price:</span>
                <span>Rs. {Number(viewTest.price || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Specimen:</span>
                <span>{viewTest.sampleType || 'blood'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Fasting:</span>
                <span>{(viewTest as any).fastingRequired ? 'Required' : 'Not Required'}</span>
              </div>

              <div className="flex flex-col gap-1 pt-1 border-t mt-2 pt-2">
                <span className="font-semibold">Notes / Description:</span>
                <span className="text-gray-700 whitespace-pre-wrap">{(viewTest as any).notes || viewTest.description || '—'}</span>
              </div>

              {/* Parameters */}
              <div className="flex flex-col gap-2 pt-1 border-t mt-2 pt-2">
                <span className="font-semibold">Parameters</span>
                {Array.isArray((viewTest as any).parameters) && (viewTest as any).parameters.length > 0 ? (
                  <div className="space-y-2">
                    {(viewTest as any).parameters.map((p: any, idx: number) => (
                      <div key={idx} className="border rounded-md p-2 space-y-1 bg-gray-50">
                        <div className="flex justify-between">
                          <span className="font-medium">Parameter:</span>
                          <span>{p.name || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Unit:</span>
                          <span>{p.unit || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Normal Range:</span>
                          <span>
                            {(() => {
                              const nr = p && p.normalRange;
                              if (nr && typeof nr === 'object') {
                                const min = nr.min ?? nr.minimum ?? '';
                                const max = nr.max ?? nr.maximum ?? '';
                                if (min !== '' && max !== '') return `${min} - ${max}`;
                                if (min !== '') return String(min);
                                if (max !== '') return String(max);
                              }
                              const fallbacks = [p?.normalRange, p?.normalRangeMale, p?.normalRangeFemale, p?.normalRangePediatric];
                              const picked = fallbacks.map((v: any) => String(v || '').trim()).find((v: string) => v);
                              return picked || '—';
                            })()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Critical Range:</span>
                          <span>
                            {(() => {
                              const cr = p && p.criticalRange;
                              if (cr && typeof cr === 'object') {
                                const min = cr.min ?? cr.minimum ?? '';
                                const max = cr.max ?? cr.maximum ?? '';
                                if (min !== '' && max !== '') return `${min} - ${max}`;
                                if (min !== '') return String(min);
                                if (max !== '') return String(max);
                              }
                              return '—';
                            })()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-500 text-xs">No parameters defined for this test.</span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <datalist id="test-name-options">
        {nameOptions.map((name, i) => (
          <option key={`${name}-${i}`} value={name} />
        ))}
      </datalist>

      {/* Tests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTests.map((test) => (
          <Card
            key={(test as any)._id || test.id || test.name}
            className="border rounded-lg shadow-sm hover:shadow transition-shadow bg-white flex flex-col h-full"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">{test.name}</CardTitle>
                  <CardDescription className="mt-1 line-clamp-2">{(test as any).notes || test.description || ''}</CardDescription>
                </div>
                <Badge variant="secondary" className="text-[10px] font-medium px-2 py-0.5">{test.category || 'Uncategorized'}</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-700 py-2">
                <div className="flex flex-col">
                  <span>PKR {Number(test.price || 0).toFixed(2)}</span>
                  <div className="text-xs text-gray-500">
                    Tax included price
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TestTube className="w-4 h-4 text-gray-500" />
                  <span>{(test.sampleType || 'blood')}</span>
                </div>
              </div>
              <div className="border-t mt-2 pt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-700">
                <button className="flex items-center gap-1 text-gray-700 hover:text-gray-900" onClick={() => setViewTest(test)}>
                  <Eye className="w-4 h-4" /> View
                </button>
                {modulePerm.edit ? (
                  <button className="flex items-center gap-1 text-gray-700 hover:text-gray-900" onClick={() => openEditTest(test)}>
                    <Edit className="w-4 h-4" /> Edit
                  </button>
                ) : null}
                {modulePerm.delete ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="flex items-center gap-1 text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Test</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this test? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700"
                          onClick={() => handleDeleteTest(test._id as string)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTests.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <TestTube className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No tests found matching your criteria</p>
        </div>
      )}
    </div>
  );
};

export default TestCatalog;
