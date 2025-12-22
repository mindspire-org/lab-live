import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Patient {
  _id: string;
  mrNumber: string;
  name: string;
  age: number;
  gender: string;
  bloodGroup: string;
  allergies: string[];
  chronicConditions: string[];
  lastVisit: string;
  status: 'Admitted' | 'Discharged' | 'Outpatient';
}

export const usePatients = () => {
  return useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const res = await api.get('/patients');
      return res.data as Patient[];
    }
  });
};
