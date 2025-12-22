import { api } from '@/lib/api';

export type LabLedgerEntryType = "income" | "expense";

export type LabLedgerSource = "PO" | "Expense" | "Manual";

export interface LabLedgerEntry {
  id: string;
  type: LabLedgerEntryType;
  source: LabLedgerSource;
  category: string;
  description: string;
  amount: number;
  date: string; // ISO string
  reference?: string;
}

type BackendFinanceRecord = {
  _id: string;
  date: string;
  amount: number;
  category: string;
  description: string;
  department: 'IPD' | 'OPD' | 'Pharmacy' | 'Lab';
  type: 'Income' | 'Expense';
  reference?: string;
};

function mapToEntry(r: BackendFinanceRecord): LabLedgerEntry {
  return {
    id: r._id,
    type: r.type === 'Income' ? 'income' : 'expense',
    source: 'Manual',
    category: r.category,
    description: r.description,
    amount: Number(r.amount) || 0,
    date: new Date(r.date).toISOString(),
    reference: r.reference,
  };
}

export async function getAllLedgerEntries(): Promise<LabLedgerEntry[]> {
  const res = await api.get('/finance/ledger', { params: { department: 'Lab' } });
  const rows = (res.data || []) as BackendFinanceRecord[];
  if (!Array.isArray(rows)) return [];
  return rows.map(mapToEntry);
}

export async function getExpenseEntries(): Promise<LabLedgerEntry[]> {
  const res = await api.get('/finance/ledger', { params: { department: 'Lab', type: 'Expense' } });
  const rows = (res.data || []) as BackendFinanceRecord[];
  if (!Array.isArray(rows)) return [];
  return rows.map(mapToEntry);
}

export async function getIncomeEntries(): Promise<LabLedgerEntry[]> {
  const res = await api.get('/finance/ledger', { params: { department: 'Lab', type: 'Income' } });
  const rows = (res.data || []) as BackendFinanceRecord[];
  if (!Array.isArray(rows)) return [];
  return rows.map(mapToEntry);
}

export async function addLedgerEntry(entry: Omit<LabLedgerEntry, 'id'>): Promise<LabLedgerEntry> {
  const payload = {
    date: entry.date,
    amount: entry.amount,
    category: entry.category,
    description: entry.description,
    department: 'Lab',
    type: entry.type === 'income' ? 'Income' : 'Expense',
    reference: entry.reference,
  };
  const res = await api.post('/finance/ledger', payload);
  return mapToEntry(res.data as BackendFinanceRecord);
}
