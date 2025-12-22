import React, { useMemo, useState } from "react";
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface Props {
  onClose: () => void;
  onImported: () => Promise<void> | void;
}

const InventoryBulkImportDialog: React.FC<Props> = ({ onClose, onImported }) => {
  const [csv, setCsv] = useState<string>("name,category,unit,packs,itemsPerPack,buyPricePerPack,salePricePerPack,supplier,location,minThreshold,expiry,invoiceNumber\n");
  const [saving, setSaving] = useState(false);

  const rows = useMemo(() => {
    const lines = csv.split(/\r?\n/).filter(l => l.trim().length);
    if (lines.length <= 1) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const cells = line.split(',');
      const obj: any = {};
      headers.forEach((h, i) => obj[h] = cells[i]);
      return obj;
    });
  }, [csv]);

  const upload = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      for (const r of rows) {
        const payload: any = {
          name: r.name,
          unit: r.unit,
          category: r.category, // expect category id or name depending on your setup
          supplier: r.supplier,
          location: r.location,
          minThreshold: parseInt(r.minThreshold || '0') || 0,
          packs: parseFloat(r.packs || '0') || 0,
          itemsPerPack: parseFloat(r.itemsPerPack || '0') || 0,
          buyPricePerPack: parseFloat(r.buyPricePerPack || '0') || 0,
        };
        if (r.salePricePerPack) payload.salePricePerPack = parseFloat(r.salePricePerPack) || 0;
        if (r.invoiceNumber) payload.invoiceNumber = r.invoiceNumber;
        if (r.expiry) payload.expiryDate = new Date(r.expiry);
        const res = await fetch('/api/lab/inventory/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to import some rows');
      }
      await onImported();
      onClose();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-4xl">
      <DialogHeader>
        <DialogTitle>Bulk Import Inventory (CSV)</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Columns: name, category, unit, packs, itemsPerPack, buyPricePerPack, salePricePerPack, supplier, location, minThreshold, expiry (YYYY-MM-DD), invoiceNumber</p>
        <Textarea rows={10} value={csv} onChange={e=> setCsv(e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={upload} disabled={saving || rows.length === 0}>Import</Button>
        </div>
      </div>
    </DialogContent>
  );
};

export default InventoryBulkImportDialog;
