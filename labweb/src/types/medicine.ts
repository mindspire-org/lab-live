export interface Medicine {
  id: string;
  name: string;
  genericName: string;
  manufacturer: string;
  category: string;
  barcode: string;
  price: number;
  stock: number;
  quantity: number;
  minStock?: number;
  maxStock?: number;
  purchasePrice?: number;
  expiryDate: Date;
  manufacturingDate?: Date;
  batchNumber?: string;
  supplierTransactions?: MedicineSupplierTransaction[];
  customerTransactions?: MedicineCustomerTransaction[];
}

export interface MedicineSupplierTransaction {
  id: string;
  medicineId: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  quantity: number;
  purchasePrice: number;
  date: Date;
  batchNumber?: string;
}

export interface MedicineCustomerTransaction {
  id: string;
  medicineId: string;
  customerId: string;
  customerName: string;
  receiptNumber: string;
  quantity: number;
  salePrice: number;
  date: Date;
}

export interface InvoiceTracking {
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  date: Date;
  medicines: {
    medicineId: string;
    medicineName: string;
    quantity: number;
    purchasePrice: number;
    batchNumber?: string;
  }[];
}
