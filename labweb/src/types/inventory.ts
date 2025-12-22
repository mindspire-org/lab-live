export interface InventoryItem {
  id: string;
  medicineId: string;
  name: string;
  quantity: number;
  lastUpdated: string;
  location?: string;
  batchNumber?: string;
  invoiceNumber?: string;
}
