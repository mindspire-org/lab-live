import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2 } from "lucide-react";

export interface Category { _id: string; name: string }
export interface InventoryItemRow {
  _id: string;
  name: string;
  category?: Category;
  packs?: number;
  itemsPerPack?: number;
  salePricePerPack?: number;
  salePricePerUnit?: number;
  buyPricePerPack?: number;
  invoiceNumber?: string;
  currentStock: number;
  minThreshold: number;
  expiryDate?: string | Date;
  supplier: string;
  unit: string;
}

interface Props {
  rows: InventoryItemRow[];
  filter: "all" | "low" | "expiring" | "out";
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit: (row: InventoryItemRow) => void;
  onDelete: (row: InventoryItemRow) => void;
  onUpdateStock: (row: InventoryItemRow) => void;
  onAdjustUnits: (row: InventoryItemRow) => void;
}

const InventoryTable: React.FC<Props> = ({ rows, filter, canEdit = true, canDelete = true, onEdit, onDelete, onUpdateStock, onAdjustUnits }) => {
  const [sortKey, setSortKey] = useState<keyof InventoryItemRow | "totalValue">("name");
  const [asc, setAsc] = useState(true);

  const filtered = useMemo(() => {
    const now = new Date();
    const soon = new Date(now.getTime() + 30*24*60*60*1000);
    let r = rows;
    if (filter === "low") r = rows.filter(r => r.currentStock <= r.minThreshold);
    if (filter === "expiring") r = rows.filter(r => r.expiryDate && (new Date(r.expiryDate) <= soon));
    if (filter === "out") r = rows.filter(r => r.currentStock <= 0);
    return r;
  }, [rows, filter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const getVal = (x: InventoryItemRow) => {
        if (sortKey === "totalValue") return (x.currentStock || 0) * (x.salePricePerUnit || 0);
        const v: any = (x as any)[sortKey];
        return typeof v === 'string' ? v.toLowerCase() : v ?? '';
      };
      const va = getVal(a), vb = getVal(b);
      if (va < vb) return asc ? -1 : 1;
      if (va > vb) return asc ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, asc]);

  const setSort = (key: keyof InventoryItemRow | "totalValue") => {
    if (sortKey === key) setAsc(!asc); else { setSortKey(key); setAsc(true); }
  };

  return (
    <div className="w-full overflow-x-hidden">
      <table className="w-full break-words text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 px-1 cursor-pointer" onClick={()=> setSort('invoiceNumber')}>Invoice #</th>
            <th className="py-2 px-1 cursor-pointer" onClick={()=> setSort('name')}>Item</th>
            <th className="py-2 px-1 cursor-pointer" onClick={()=> setSort('category')}>Category</th>
            <th className="py-2 px-1">Packs</th>
            <th className="py-2 px-1">Units/Pack</th>
            <th className="py-2 px-1">Sale/Pack</th>
            <th className="py-2 px-1">Unit Sale</th>
            <th className="py-2 px-1 cursor-pointer" onClick={()=> setSort('currentStock')}>Total Units</th>
            <th className="py-2 px-1">Min Stock</th>
            <th className="py-2 px-1">Expiry</th>
            <th className="py-2 px-1">Supplier</th>
            <th className="py-2 px-1">Status</th>
            <th className="py-2 px-1">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(r => {
            const isLow = r.currentStock <= r.minThreshold;
            const isOut = r.currentStock <= 0;
            const exp = r.expiryDate ? new Date(r.expiryDate) : null;
            const isExpiring = exp ? (exp.getTime() <= Date.now() + 30*24*60*60*1000) : false;
            return (
              <tr key={r._id} className={`border-b ${isOut ? 'bg-red-50' : ''}`}>
                <td className="py-2 px-1">{r.invoiceNumber || '-'}</td>
                <td className="py-2 px-1 font-medium">{r.name}</td>
                <td className="py-2 px-1">{r.category?.name || 'Uncategorized'}</td>
                <td className="py-2 px-1">{r.packs ?? '-'}</td>
                <td className="py-2 px-1">{r.itemsPerPack ?? '-'}</td>
                <td className="py-2 px-1">{r.salePricePerPack != null ? r.salePricePerPack : '-'}</td>
                <td className="py-2 px-1">{r.salePricePerUnit != null ? Number(r.salePricePerUnit).toFixed(2) : '-'}</td>
                <td className="py-2 px-1">{r.currentStock}</td>
                <td className="py-2 px-1">{r.minThreshold}</td>
                <td className="py-2 px-1">{exp ? exp.toLocaleDateString() : '-'}</td>
                <td className="py-2 px-1">{r.supplier}</td>
                <td className="py-2 px-1">
                  {isOut ? (
                    <Badge variant="destructive">Out of stock</Badge>
                  ) : isLow ? (
                    <Badge variant="secondary">Low</Badge>
                  ) : isExpiring ? (
                    <Badge variant="secondary">Expiring</Badge>
                  ) : (
                    <Badge>OK</Badge>
                  )}
                </td>
                <td className="py-2 px-1">
                  <div className="flex gap-1 flex-wrap">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-slate-800 hover:text-slate-900 hover:bg-slate-100"
                      disabled={!canEdit}
                      onClick={() => onEdit(r)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={!canDelete}
                      onClick={() => onDelete(r)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={13} className="py-10 text-center text-muted-foreground">
                {rows.length === 0 ? 'No inventory items yet' : 'No items found'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryTable;
