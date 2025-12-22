import React, { useState, useRef, useMemo, useEffect } from "react";
import { authFetch } from "@/utils/authFetch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Lab inventory routes are mounted under /api/lab/inventory
const API_BASE = "/api/lab/inventory";

interface Category { _id: string; name: string; }

interface AddNewItemFormProps {
  onClose: () => void;
  onAddItem: (item: any) => void;
  onAddCategory: (name: string) => Promise<void>;
  dbCategories: Category[];
  suppliers?: string[];
}

const AddNewItemForm: React.FC<AddNewItemFormProps> = ({ 
  onClose, 
  onAddItem, 
  onAddCategory,
  dbCategories,
  suppliers = []
}) => {
  const { toast } = useToast();
  const [newItem, setNewItem] = useState({
    name: "",
    category: "", // holds category id when selected
    currentStock: 0,
    minThreshold: 0,
    maxCapacity: 0,
    unit: "",
    costPerUnit: 0,
    supplier: "",
    location: "",
    expiryDate: undefined
  });
  // Category add state
  const [newCategoryName, setNewCategoryName] = useState("");

  // Pack-based fields
  const [packs, setPacks] = useState<string>("0");
  const [itemsPerPack, setItemsPerPack] = useState<string>("0");
  const [buyPricePerPack, setBuyPricePerPack] = useState<string>("0");
  const [salePricePerPack, setSalePricePerPack] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  // supplier select or new
  const [newSupplier, setNewSupplier] = useState<string>("");
  const [supplierList, setSupplierList] = useState<string[]>([]);

  // Load suppliers from backend (preferred source)
  useEffect(() => {
    authFetch('/api/lab/suppliers')
      .then(async r => {
        if (!r.ok) throw new Error(r.status === 401 ? 'Session expired. Please login again.' : 'Failed to load suppliers');
        return r.json();
      })
      .then((rows: any[]) => {
        if (Array.isArray(rows)) setSupplierList(rows.map(r => r.name).filter(Boolean));
      })
      .catch((e) => {
        setSupplierList([]);
        const msg = (e as Error).message || 'Failed to load suppliers';
        // Soft warn; avoid noisy toasts at mount unless helpful
        console.warn('[Suppliers] load error:', msg);
      });
  }, []);

  // Derived values
  const derived = useMemo(() => {
    const p = parseFloat(packs) || 0;
    const ipp = parseFloat(itemsPerPack) || 0;
    const bpp = parseFloat(buyPricePerPack) || 0;
    const spp = salePricePerPack !== "" ? (parseFloat(salePricePerPack) || 0) : undefined;
    const totalUnits = p * ipp;
    const costPerUnit = ipp > 0 ? bpp / ipp : 0;
    const totalBuy = p * bpp;
    const saleUnit = spp != null && ipp > 0 ? (spp / ipp) : undefined;
    return { totalUnits, costPerUnit, totalBuy, saleUnit };
  }, [packs, itemsPerPack, buyPricePerPack, salePricePerPack]);

  // simple date input like UpdateStockDialog

  // Refs for keyboard navigation (removed Max Capacity input)
  const inputRefs = Array.from({ length: 8 }, () => useRef<HTMLInputElement>(null));

  const handleEnterKey = (e: React.KeyboardEvent, nextIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRefs[nextIndex]?.current?.focus();
    }
  };

  const handleSave = () => {
    if (!newItem.name || !newItem.category) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }
    // Compute derived fields for backend compatibility
    const payload = {
      ...newItem,
      unit: newItem.unit && newItem.unit.trim() ? newItem.unit : 'unit',
      // derived
      currentStock: derived.totalUnits || newItem.currentStock,
      costPerUnit: derived.costPerUnit || newItem.costPerUnit,
      packs: parseFloat(packs) || 0,
      itemsPerPack: parseFloat(itemsPerPack) || 0,
      buyPricePerPack: parseFloat(buyPricePerPack) || 0,
      salePricePerPack: salePricePerPack !== "" ? (parseFloat(salePricePerPack) || 0) : undefined,
      salePricePerUnit: derived.saleUnit,
      invoiceNumber,
    };
    onAddItem(payload);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-4 mb-4">
        <Button variant="outline" size="sm" onClick={onClose}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-extrabold text-indigo-600">Add Inventory</h1>
      </div>

      <div className="space-y-4">
          {/* Item name full-width */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="itemName">Item Name</Label>
              <Input
                id="itemName"
                placeholder="Enter item name"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <div className="flex gap-2">
                <select
                  id="category"
                  className="flex-1 border rounded-md p-2"
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                >
                  <option value="">-- Select category --</option>
                  {dbCategories.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
                <Input
                  placeholder="New category name"
                  value={newCategoryName}
                  onChange={e=> setNewCategoryName(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!newCategoryName.trim()}
                  onClick={async () => {
                    const name = newCategoryName.trim();
                    if (!name) return;
                    await onAddCategory(name);
                    const created = dbCategories.find(c => c.name.toLowerCase() === name.toLowerCase());
                    if (created) setNewItem(prev => ({ ...prev, category: created._id }));
                    setNewCategoryName("");
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>No. of Packs</Label>
              <Input placeholder="Number of packs" type="number" value={packs} onChange={e=> setPacks(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Minimum Stock</Label>
              <Input
                type="number"
                placeholder="Enter minimum stock"
                value={Number.isNaN(newItem.minThreshold) ? '' : newItem.minThreshold}
                onChange={(e) => setNewItem({ ...newItem, minThreshold: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Expiry</Label>
              <Input
                type="date"
                value={newItem.expiryDate ? new Date(newItem.expiryDate).toISOString().slice(0,10) : ''}
                onChange={e => setNewItem({ ...newItem, expiryDate: e.target.value ? new Date(e.target.value) : undefined })}
              />
            </div>
          </div>

          {/* Pack-based entry */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Units / Pack</Label>
              <Input value={itemsPerPack} type="number" onChange={e=> setItemsPerPack(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Buy Price</Label>
              <Input value={buyPricePerPack} type="number" step="0.01" onChange={e=> setBuyPricePerPack(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Sale Price</Label>
              <Input value={salePricePerPack} type="number" step="0.01" onChange={e=> setSalePricePerPack(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Cost per Unit (auto)</Label>
              <Input value={derived.costPerUnit.toFixed(2)} disabled />
            </div>
            <div className="space-y-2">
              <Label>Sale Price per Unit (auto)</Label>
              <Input value={derived.saleUnit != null ? derived.saleUnit.toFixed(2) : ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Total Price</Label>
              <Input value={derived.totalBuy.toFixed(2)} disabled />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Storage Location</Label>
              <Input
                id="location"
                placeholder="e.g., Storage A1, Refrigerator B2"
                value={newItem.location}
                onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                ref={inputRefs[6]}
                onKeyDown={e => handleEnterKey(e, 7)}
              />
            </div>
            <div className="space-y-2">
              <Label>Invoice Number</Label>
              <Input placeholder="Invoice number" value={invoiceNumber} onChange={e=> setInvoiceNumber(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Supplier</Label>
            <div className="flex gap-2">
              <select className="border rounded-md p-2 flex-1" value={newItem.supplier}
                onChange={e=> setNewItem({ ...newItem, supplier: e.target.value })}
              >
                <option value="">Select supplier</option>
                {(supplierList.length ? supplierList : suppliers).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <Input placeholder="+ New" value={newSupplier} onChange={e=> setNewSupplier(e.target.value)} />
              <Button type="button" variant="outline" onClick={async ()=>{
                const name = newSupplier.trim();
                if (!name) return;
                try {
                  const res = await authFetch('/api/lab/suppliers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name })
                  });
                  if (!res.ok) {
                    const err = await res.json().catch(()=>({ message: 'Failed to create supplier' }));
                    throw new Error(res.status === 401 ? 'Session expired. Please login again.' : (err.message || 'Failed to create supplier'));
                  }
                  setSupplierList(prev => [name, ...prev.filter(n => n.toLowerCase() !== name.toLowerCase())]);
                  setNewItem(prev => ({ ...prev, supplier: name }));
                  setNewSupplier("");
                  toast({ title: 'Supplier Added', description: `${name} created successfully.` });
                } catch (e) {
                  toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' });
                }
              }}>+ New</Button>
            </div>
        </div>

          <div className="flex justify-end space-x-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
      </div>
    </div>
  );
}

export default AddNewItemForm;
