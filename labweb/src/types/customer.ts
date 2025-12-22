export interface Customer {
  mrNumber: string;
  name: string;
  companyName?: string;
  phone: string;
  address?: string;
  totalCredit: number;
  creditRemaining: number;
  lastVisitDate?: Date;
  createdAt: Date;
}

export interface CustomerHistory {
  id: string;
  customerMr: string;
  type: 'medicine' | 'payment';
  amount: number;
  date: Date;
  description: string;
  medicineDetails?: {
    name: string;
    quantity: number;
    price: number;
  };
}
