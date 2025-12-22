export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  taxId?: string;
  paymentTerms: string;
  creditLimit?: number;
  currentBalance?: number;
  notes?: string;
  orders?: SupplierOrder[];
  payments?: SupplierPayment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierOrder {
  id: string;
  supplierId: string;
  medicineId: string;
  medicineName: string;
  batchNumber: string;
  invoiceNumber?: string;
  quantity: number;
  unitPrice: number;
  totalCost: number;
  expectedDelivery: Date;
  actualDelivery?: Date;
  receivedQuantity?: number;
  status: OrderStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  orderId?: string;
  amount: number;
  date: Date;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  status: PaymentStatus;
  createdAt: Date;
}

export type PaymentMethod = 'cash' | 'bank_transfer' | 'cheque' | 'credit' | 'other';
export type PaymentStatus = 'completed' | 'pending' | 'failed' | 'refunded';
export type OrderStatus = 'pending' | 'delivered' | 'cancelled' | 'partially_delivered';
