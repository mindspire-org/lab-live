import React, { useEffect, useMemo, useState } from "react";
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface ItemOption { _id: string; name: string }
interface Props {
  itemId?: string; // optional; when omitted, require items to select from
  items?: ItemOption[]; // optional list to render selector
  currentUnitsPerPack?: number;
  onClose: () => void;
  onUpdated: () => Promise<void> | void;
}

const UpdateStockDialog: React.FC<Props> = ({ itemId, items, currentUnitsPerPack, onClose, onUpdated }) => {
  const [selectedId, setSelectedId] = useState<string>(itemId || (items?.[0]?._id ?? ""));
  const [packs, setPacks] = useState<string>("0");
  const [itemsPerPack, setItemsPerPack] = useState<string>(currentUnitsPerPack ? String(currentUnitsPerPack) : "0");
  const [buyPricePerPack, setBuyPricePerPack] = useState<string>("0");
  const [salePricePerPack, setSalePricePerPack] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [expiry, setExpiry] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Auto-fill existing details from DB when item changes
  useEffect(() => {
    const id = selectedId || itemId;
    if (!id) return;
    const token = localStorage.getItem('token');
    let cancelled = false;
    (async () => {
      try {
        // Try to get single item first
        let res = await fetch(`/api/lab/inventory/inventory/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        let data: any | null = null;
        if (res.ok) {
          data = await res.json();
        } else {
          // Fallback: fetch list and find
          res = await fetch(`/api/lab/inventory/inventory`, { headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) {
            const arr = await res.json();
            data = (arr || []).find((x: any) => String(x._id) === String(id));
          }
        }
        if (!data || cancelled) return;
        if (data.itemsPerPack != null) setItemsPerPack(String(data.itemsPerPack));
        if (data.buyPricePerPack != null) setBuyPricePerPack(String(data.buyPricePerPack));
        if (data.salePricePerPack != null) setSalePricePerPack(String(data.salePricePerPack));
        if (data.invoiceNumber) setInvoiceNumber(String(data.invoiceNumber));
        if (data.expiryDate) {
          const d = new Date(data.expiryDate);
          if (!isNaN(d.getTime())) setExpiry(d.toISOString().slice(0, 10));
        }
      } catch {
        // ignore autofill errors
      }
    })();
    return () => { cancelled = true; };
  }, [selectedId, itemId]);

  const derived = useMemo(() => {
    const p = parseFloat(packs) || 0;
    const ipp = parseFloat(itemsPerPack) || 0;
    const bpp = parseFloat(buyPricePerPack) || 0;
    const spp = salePricePerPack !== "" ? (parseFloat(salePricePerPack) || 0) : undefined;
    const totalUnits = p * ipp;
    const cpu = ipp > 0 ? bpp / ipp : 0;
    const su = spp != null && ipp > 0 ? (spp / ipp) : undefined;
    return { totalUnits, cpu, su };
  }, [packs, itemsPerPack, buyPricePerPack, salePricePerPack]);

  const save = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const payload: any = {
        packs: parseFloat(packs) || 0,
        itemsPerPack: parseFloat(itemsPerPack) || 0,
        buyPricePerPack: parseFloat(buyPricePerPack) || 0,
      };
      if (salePricePerPack !== "") payload.salePricePerPack = parseFloat(salePricePerPack) || 0;
      if (invoiceNumber) payload.invoiceNumber = invoiceNumber;
      if (expiry) payload.expiryDate = new Date(expiry);
      const targetId = selectedId || itemId;
      if (!targetId) throw new Error('Please select an item');
      const res = await fetch(`/api/lab/inventory/inventory/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to update stock');
      await onUpdated();
      onClose();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-xl">
      <DialogHeader>
        <DialogTitle>Update Stock (Packs)</DialogTitle>
      </DialogHeader>
      {items && (
        <div className="space-y-2 mb-2">
          <Label>Item</Label>
          <select className="border rounded-md p-2 w-full" value={selectedId} onChange={e=> setSelectedId(e.target.value)}>
            <option value="">-- Select item --</option>
            {items.map(it => (
              <option key={it._id} value={it._id}>{it.name}</option>
            ))}
          </select>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Packs to add</Label>
          <Input type="number" value={packs} onChange={e=> setPacks(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Units / Pack</Label>
          <Input type="number" value={itemsPerPack} onChange={e=> setItemsPerPack(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Buy Price / Pack</Label>
          <Input type="number" value={buyPricePerPack} onChange={e=> setBuyPricePerPack(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Sale Price / Pack (optional)</Label>
          <Input type="number" value={salePricePerPack} onChange={e=> setSalePricePerPack(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Invoice Number</Label>
          <Input value={invoiceNumber} onChange={e=> setInvoiceNumber(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Expiry</Label>
          <Input type="date" value={expiry} onChange={e=> setExpiry(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        <div>
          <Label>Units to add (auto)</Label>
          <Input disabled value={derived.totalUnits} />
        </div>
        <div>
          <Label>Cost / Unit (auto)</Label>
          <Input disabled value={derived.cpu.toFixed(2)} />
        </div>
        <div>
          <Label>Sale / Unit (auto)</Label>
          <Input disabled value={derived.su != null ? derived.su.toFixed(2) : ''} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={save} disabled={saving}>Save</Button>
      </div>
    </DialogContent>
  );
};

export default UpdateStockDialog;
