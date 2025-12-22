import React, { useState, useRef, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Lab inventory routes are mounted under /api/lab/inventory
const API_BASE = "/api/lab/inventory";

interface Category { _id: string; name: string; }

interface InventoryItem {
  _id: string;
  name: string;
  category: Category;
  currentStock: number;
  minThreshold: number;
  maxCapacity: number;
  unit: string;
  costPerUnit: number;
  supplier: string;
  location: string;
  expiryDate?: Date | string;
}

interface EditItemFormProps {
  onClose: () => void;
  onUpdateItem: (updated: InventoryItem) => void;
  dbCategories: Category[];
  item: InventoryItem;
}

const EditItemForm: React.FC<EditItemFormProps> = ({ onClose, onUpdateItem, dbCategories, item }) => {
  const { toast } = useToast();
  const [editedItem, setEditedItem] = useState<InventoryItem>({ ...item });
  const [newCategoryName, setNewCategoryName] = useState("");
  // Pack fields
  const [packs, setPacks] = useState<string>(String((item as any).packs ?? 0));
  const [itemsPerPack, setItemsPerPack] = useState<string>(String((item as any).itemsPerPack ?? 0));
  const [buyPricePerPack, setBuyPricePerPack] = useState<string>(String((item as any).buyPricePerPack ?? 0));
  const [salePricePerPack, setSalePricePerPack] = useState<string>(
    (item as any).salePricePerPack != null ? String((item as any).salePricePerPack) : ""
  );
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
  // Calendar toggle state for expiry date picker
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Reduced refs count since Max Capacity input is removed from UI
  const inputRefs = Array.from({ length: 8 }, () => useRef<HTMLInputElement>(null));

  const handleEnterKey = (e: React.KeyboardEvent, nextIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRefs[nextIndex]?.current?.focus();
    }
  };

  const handleSave = async () => {
    if (!editedItem.name || !editedItem.category) {
      toast({ title: "Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/inventory/${editedItem._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...editedItem,
          category: editedItem.category._id, // backend expects id
          // pack-based
          packs: parseFloat(packs) || 0,
          itemsPerPack: parseFloat(itemsPerPack) || 0,
          buyPricePerPack: parseFloat(buyPricePerPack) || 0,
          salePricePerPack: salePricePerPack !== "" ? (parseFloat(salePricePerPack) || 0) : undefined,
          // derived for immediate consistency (backend will also compute)
          currentStock: derived.totalUnits || editedItem.currentStock,
          costPerUnit: derived.costPerUnit || editedItem.costPerUnit,
          salePricePerUnit: derived.saleUnit,
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to update item');
      }
      const updated: InventoryItem = await res.json();
      onUpdateItem(updated);
      toast({ title: 'Item Updated', description: `${updated.name} has been updated.` });
      onClose();
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm" onClick={onClose}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Edit Item</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Inventory Item</CardTitle>
          <CardDescription>Modify the fields and save changes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Item name & category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="itemName">Item Name *</Label>
              <Input
                id="itemName"
                value={editedItem.name}
                onChange={e => setEditedItem({ ...editedItem, name: e.target.value })}
                ref={inputRefs[0]}
                onKeyDown={e => handleEnterKey(e, 1)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <div className="flex flex-col gap-2">
                <select
                  id="category"
                  className="border rounded-md p-2 w-full"
                  value={editedItem.category._id}
                  onChange={e => {
                    const cat = dbCategories.find(c => c._id === e.target.value);
                    if (cat) setEditedItem({ ...editedItem, category: cat });
                  }}
                >
                  {dbCategories.map(cat => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
                <div className="flex gap-2 items-end">
                  <Input placeholder="New category name" value={newCategoryName} onChange={e=> setNewCategoryName(e.target.value)} />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!newCategoryName.trim()}
                    onClick={async ()=>{
                      const name = newCategoryName.trim();
                      if (!name) return;
                      // Create via parent InventoryManagement handler is not available here, so call API directly
                      try {
                        const tokenLocal = localStorage.getItem('token');
                        const resCat = await fetch(`${API_BASE}/categories`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenLocal}` },
                          body: JSON.stringify({ name })
                        });
                        if (resCat.ok) {
                          const created: Category = await resCat.json();
                          setNewCategoryName("");
                          setEditedItem(prev => ({ ...prev, category: created } as any));
                        }
                      } catch {}
                    }}
                  >Add</Button>
                </div>
              </div>
            </div>
          </div>

          {/* Stock thresholds (Max Capacity removed) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentStock">Current Stock</Label>
              <Input
                id="currentStock"
                type="number"
                value={editedItem.currentStock}
                onChange={e => setEditedItem({ ...editedItem, currentStock: parseInt(e.target.value) || 0 })}
                ref={inputRefs[1]}
                onKeyDown={e => handleEnterKey(e, 2)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minThreshold">Min Threshold</Label>
              <Input
                id="minThreshold"
                type="number"
                value={editedItem.minThreshold}
                onChange={e => setEditedItem({ ...editedItem, minThreshold: parseInt(e.target.value) || 0 })}
                ref={inputRefs[2]}
                onKeyDown={e => handleEnterKey(e, 3)}
              />
            </div>
          </div>

          {/* Pack-based entry */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Packs</Label>
              <Input value={packs} type="number" onChange={e=> setPacks(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Items per Pack</Label>
              <Input value={itemsPerPack} type="number" onChange={e=> setItemsPerPack(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Buy Price per Pack (PKR)</Label>
              <Input value={buyPricePerPack} type="number" step="0.01" onChange={e=> setBuyPricePerPack(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Sale Price per Pack (PKR)</Label>
              <Input value={salePricePerPack} type="number" step="0.01" onChange={e=> setSalePricePerPack(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Cost per Unit (auto)</Label>
              <Input value={derived.costPerUnit.toFixed(2)} disabled />
            </div>
            <div className="space-y-2">
              <Label>Sale Price per Unit (auto)</Label>
              <Input value={derived.saleUnit != null ? derived.saleUnit.toFixed(2) : ''} disabled />
            </div>
          </div>

          {/* Unit, location */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={editedItem.unit}
                onChange={e => setEditedItem({ ...editedItem, unit: e.target.value })}
                ref={inputRefs[3]}
                onKeyDown={e => handleEnterKey(e, 4)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={editedItem.location}
                onChange={e => setEditedItem({ ...editedItem, location: e.target.value })}
                ref={inputRefs[5]}
                onKeyDown={e => handleEnterKey(e, 6)}
              />
            </div>
          </div>

          {/* Supplier */}
          <div className="space-y-2">
            <Label htmlFor="supplier">Supplier</Label>
            <Input
              id="supplier"
              value={editedItem.supplier}
              onChange={e => setEditedItem({ ...editedItem, supplier: e.target.value })}
              ref={inputRefs[6]}
              onKeyDown={e => handleEnterKey(e, 0)}
            />
          </div>

          {/* Expiry */}
          <div className="space-y-2">
            <Label htmlFor="expiryDate">Expiry Date</Label>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCalendarOpen(v => !v)}
              className="mb-2"
            >
              <CalendarIcon className="w-4 h-4 mr-2" />
              {calendarOpen ? "Hide calendar" : (
                editedItem.expiryDate ? `Change date: ${(
                  typeof editedItem.expiryDate === 'string'
                    ? new Date(editedItem.expiryDate)
                    : editedItem.expiryDate
                )?.toLocaleDateString?.()}` : "Select expiry date"
              )}
            </Button>
            {calendarOpen && (
              <div className="relative">
                <div className="w-full border rounded-md p-2 flex items-center bg-white">
                  <Calendar
                    mode="single"
                    selected={typeof editedItem.expiryDate === 'string' ? new Date(editedItem.expiryDate) : editedItem.expiryDate}
                    onSelect={date => {
                      setEditedItem({ ...editedItem, expiryDate: date || undefined });
                      setCalendarOpen(false);
                    }}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditItemForm;
