import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type FinanceRecord = {
  _id: string;
  date: string;
  amount: number;
  category: string;
  description: string;
  department: 'IPD' | 'OPD' | 'Pharmacy' | 'Lab';
  type: 'Income' | 'Expense';
  recordedBy: string;
  patientId?: string;
  admissionId?: string;
};

export const useIpdFinanceRecords = (type?: 'Income' | 'Expense') => {
  return useQuery({
    queryKey: ['ipd-finance', type],
    queryFn: async () => {
      const res = await api.get('/ipd/finance', { params: type ? { type } : {} });
      const records = res.data as FinanceRecord[];
      
      // For income, only include records with patientId (billing records)
      if (type === 'Income') {
        return records.filter(r => r.patientId);
      }
      
      return records;
    },
  });
};

export const useCreateIpdFinanceRecord = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<FinanceRecord, '_id' | 'recordedBy'>) => 
      api.post('/ipd/finance', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ipd-finance'] });
      qc.invalidateQueries({ queryKey: ['finance'] }); // Invalidate admin finance queries
    },
  });
};

export const useIpdFinanceSummary = () => {
  return useQuery({
    queryKey: ['ipd-finance-summary'],
    queryFn: async () => {
      const res = await api.get('/finance/summary');
      return res.data as {
        totalIncome: number;
        totalExpense: number;
        netBalance: number;
        monthlyNet: number;
      };
    },
  });
};

export const useDeleteIpdFinanceRecord = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/ipd/finance/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ipd-finance'] });
      qc.invalidateQueries({ queryKey: ['finance'] }); // Invalidate admin finance queries
    },
  });
};
