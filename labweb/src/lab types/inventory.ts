export interface InventoryItem {
  id: string;
  name: string;
  category: "reagent" | "consumable" | "equipment" | "calibrator" | "control";
  sku: string;
  currentStock: number;
  minimumStock: number;
  maxCapacity: number;
  unit: string;
  costPerUnit: number;
  supplier: string;
  expiryDate?: Date;
  batchNumber?: string;
  location: string;
  status: "in_stock" | "low_stock" | "out_of_stock" | "expired";
  lastUpdated: Date;
}

export interface Equipment {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  manufacturer: string;
  installDate: Date;
  lastMaintenance?: Date;
  nextMaintenance: Date;
  maintenanceInterval: number; // days
  status: "operational" | "maintenance" | "out_of_service" | "calibration";
  location: string;
  notes?: string;
  expiry?: Date;
  stock?: number;
  value?: number;
}

export interface MaintenanceRecord {
  id: string;
  equipmentId: string;
  type: "preventive" | "corrective" | "calibration";
  description: string;
  performedBy: string;
  performedAt: Date;
  cost?: number;
  nextMaintenanceDate?: Date;
  notes?: string;
}
