import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Patient } from './usePatientApi';
import { Doctor } from '@/types/Doctor';

// ---------------- GET hooks ----------------
export const useWards = () =>
  useQuery({
    queryKey: ['wards'],
    queryFn: async () => {
      const res = await api.get('/ipd/wards');
      return res.data as Ward[];
    },
  });

export const useFloors = () =>
  useQuery({
    queryKey: ['floors'],
    queryFn: async () => {
      const res = await api.get('/ipd/floors');
      return res.data as Floor[];
    },
  });

export const useRooms = (floorId?: string) =>
  useQuery({
    queryKey: ['rooms', floorId || 'all'],
    queryFn: async () => {
      const res = await api.get('/ipd/rooms', { params: floorId ? { floorId } : {} });
      return res.data as Room[];
    },
  });

export const useBeds = (status?: string) =>
  useQuery({
    queryKey: ['beds', status],
    queryFn: async () => {
      const res = await api.get('/ipd/beds', { params: status ? { status } : {} });
      return res.data as Bed[];
    },
  });

export const useAdmissions = () =>
  useQuery({
    queryKey: ['admissions', 'light'],
    queryFn: async () => {
      const res = await api.get('/ipd/admissions', { params: { light: 1 } });
      return res.data as IpdAdmission[];
    },
    // Reduce refetch churn and improve perceived performance
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    // React Query v5: use placeholderData to emulate keepPreviousData
    placeholderData: (previousData) => previousData,
  });

// Fetch a single admission with full embedded arrays
export const useAdmission = (admissionId: string) =>
  useQuery<IpdAdmission>({
    queryKey: ['admission', admissionId],
    queryFn: () => api.get(`/ipd/admissions/${admissionId}`).then(res => res.data),
    enabled: !!admissionId,
  });

export const useIpdAdmissions = () =>
  useQuery<IpdAdmission[]>({
    queryKey: ['ipdAdmissions', 'light'],
    queryFn: () => api.get('/ipd/admissions', { params: { light: 1 } }).then(res => res.data),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });

// Fetch full admissions with embedded arrays (billing, etc.) for reporting
export const useIpdAdmissionsFull = () =>
  useQuery<IpdAdmission[]>({
    queryKey: ['ipdAdmissions', 'full'],
    queryFn: () => api.get('/ipd/admissions').then(res => res.data),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });

export const useIpdFinanceRecords = () =>
  useQuery({
    queryKey: ['ipdFinanceRecords'],
    queryFn: async () => {
      const res = await api.get('/ipd/finance');
      return res.data as FinanceRecord[];
    },
  });

export const useIpdSchedule = (date: string) => useQuery<IpdScheduleEvent[]>({ 
  queryKey: ['ipdSchedule', date], 
  queryFn: () => api.get(`/ipd/schedule?date=${date}`).then(res => res.data), 
  enabled: !!date, // Only run the query if the date is provided
});

export const usePatient = (patientId: string) => useQuery<Patient>({ 
  queryKey: ['patient', patientId], 
  queryFn: () => api.get(`/patients/${patientId}`).then(res => res.data), 
  enabled: !!patientId 
});

export const useDoctor = (doctorId: string) => useQuery<Doctor>({ 
  queryKey: ['doctor', doctorId], 
  queryFn: () => api.get(`/doctors/${doctorId}`).then(res => res.data), 
  enabled: !!doctorId 
});

export const useDoctors = () =>
  useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      const res = await api.get('/doctors');
      return res.data;
    },
  });

// ---------------- Mutations ----------------
export const useCreateAdmission = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<IpdAdmissionCreatePayload>) => api.post('/ipd/admissions', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['beds'] });
      // Invalidate both base and lightweight admissions
      qc.invalidateQueries({ queryKey: ['admissions'] });
      qc.invalidateQueries({ queryKey: ['admissions', 'light'] });
    },
  });
};

export const useAddVitals = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ admissionId, vitals }: { admissionId: string; vitals: Omit<Vitals, 'dateTime'> }) => {
      const payload = { ...vitals, dateTime: new Date() };
      return api.post(`/ipd/admissions/${admissionId}/vitals`, payload);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
      queryClient.invalidateQueries({ queryKey: ['admissions', 'light'] });
      queryClient.invalidateQueries({ queryKey: ['admission', variables.admissionId] });
    },
  });
};

export const useAddMedication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ admissionId, medication }: { admissionId: string; medication: Omit<Medication, '_id'> }) =>
      api.post(`/ipd/admissions/${admissionId}/medications`, medication),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
      queryClient.invalidateQueries({ queryKey: ['admissions', 'light'] });
      queryClient.invalidateQueries({ queryKey: ['admission', variables.admissionId] });
    },
  });
};

export const useRemoveMedication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ admissionId, medicationId }: { admissionId: string; medicationId: string }) =>
      api.delete(`/ipd/admissions/${admissionId}/medications/${medicationId}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
      queryClient.invalidateQueries({ queryKey: ['admissions', 'light'] });
      queryClient.invalidateQueries({ queryKey: ['admission', variables.admissionId] });
    },
  });
};

export const useAddLabTest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ admissionId, labTest }: { admissionId: string; labTest: Omit<LabTest, '_id'> }) =>
      api.post(`/ipd/admissions/${admissionId}/lab-tests`, labTest),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
      queryClient.invalidateQueries({ queryKey: ['admissions', 'light'] });
      queryClient.invalidateQueries({ queryKey: ['admission', variables.admissionId] });
    },
  });
};

export const useUpdateLabTest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ admissionId, testId, updates }: { admissionId: string; testId: string; updates: Partial<Pick<LabTest, 'status' | 'result'>> }) =>
      api.patch(`/ipd/admissions/${admissionId}/lab-tests/${testId}`, updates),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
      queryClient.invalidateQueries({ queryKey: ['admissions', 'light'] });
      queryClient.invalidateQueries({ queryKey: ['admission', variables.admissionId] });
    },
  });
};

export const useAddDoctorVisit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ admissionId, visit }: { admissionId: string; visit: Omit<DoctorVisit, '_id'> }) =>
      api.post(`/ipd/admissions/${admissionId}/doctor-visits`, visit),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
      queryClient.invalidateQueries({ queryKey: ['admissions', 'light'] });
      queryClient.invalidateQueries({ queryKey: ['admission', variables.admissionId] });
    },
  });
};

export const useAddBillingItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ admissionId, item }: { admissionId: string; item: Omit<BillingItem, '_id'> }) =>
      api.post(`/ipd/admissions/${admissionId}/billing`, item),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
      queryClient.invalidateQueries({ queryKey: ['admissions', 'light'] });
      queryClient.invalidateQueries({ queryKey: ['ipdAdmissions', 'full'] });
      queryClient.invalidateQueries({ queryKey: ['ipdFinanceRecords'] });
      queryClient.invalidateQueries({ queryKey: ['ipd-finance'] });
      queryClient.invalidateQueries({ queryKey: ['admission', variables.admissionId] });
    },
  });
};

export const useUpdateBillingItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ admissionId, itemId, updates }: { admissionId: string; itemId: string; updates: Partial<Pick<BillingItem, 'status'>> }) =>
      api.patch(`/ipd/admissions/${admissionId}/billing/${itemId}`, updates),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
      queryClient.invalidateQueries({ queryKey: ['admissions', 'light'] });
      queryClient.invalidateQueries({ queryKey: ['ipdAdmissions', 'full'] });
      queryClient.invalidateQueries({ queryKey: ['ipdFinanceRecords'] });
      queryClient.invalidateQueries({ queryKey: ['ipd-finance'] });
      queryClient.invalidateQueries({ queryKey: ['admission', variables.admissionId] });
    },
  });
};

export const useDischargeAdmission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (admissionId: string) => api.patch(`/ipd/admissions/${admissionId}/discharge`),
    onSuccess: () => {
      // Refresh both admissions lists and beds
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
      queryClient.invalidateQueries({ queryKey: ['admissions', 'light'] });
      queryClient.invalidateQueries({ queryKey: ['beds'] });
    },
  });
};

export const useUpdateBed = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bedId, updates }: { bedId: string; updates: Partial<Bed> }) => 
      api.patch(`/ipd/beds/${bedId}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beds'] });
    },
  });
};

export const useDeleteBed = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bedId: string) => api.delete(`/ipd/beds/${bedId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beds'] });
    },
  });
};

// ---------------- Create helpers for hierarchy ----------------
export const useCreateFloor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; number?: number }) => api.post('/ipd/floors', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['floors'] });
    },
  });
};

export const useCreateRoom = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; floorId: string }) => api.post('/ipd/rooms', payload),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['rooms'] });
      qc.invalidateQueries({ queryKey: ['rooms', vars.floorId || 'all'] });
    },
  });
};

export const useUpdateRoom = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Room> & { floorId?: string } }) => api.patch(`/ipd/rooms/${id}`, updates),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['rooms'] });
      const floorKey = (vars.updates && (vars.updates as any).floorId) || 'all';
      qc.invalidateQueries({ queryKey: ['rooms', floorKey] });
    },
  });
};

export const useDeleteRoom = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => api.delete(`/ipd/rooms/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
};

export const useCreateWard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Ward>) => api.post('/ipd/wards', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wards'] });
    },
  });
};

export const useUpdateWard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Ward> & { floor?: string } }) => api.patch(`/ipd/wards/${id}`, updates),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['wards'] });
      if ((vars.updates as any).floor) {
        qc.invalidateQueries({ queryKey: ['wards', (vars.updates as any).floor] });
      }
    },
  });
};

export const useDeleteWard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => api.delete(`/ipd/wards/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wards'] });
    },
  });
};

export const useCreateScheduleEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: IpdScheduleEventCreatePayload) => api.post('/ipd/schedule', payload),
    onSuccess: () => {
      // Invalidate all schedule queries (any date) and refetch active ones
      queryClient.invalidateQueries({ queryKey: ['ipdSchedule'], exact: false, refetchType: 'active' });
    },
  });
};

export const useUpdateScheduleEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, updates }: { eventId: string; updates: Partial<IpdScheduleEventCreatePayload> }) =>
      api.patch(`/ipd/schedule/${eventId}`, updates),
    onSuccess: () => {
      // Invalidate all schedule queries (any date) and refetch active ones
      queryClient.invalidateQueries({ queryKey: ['ipdSchedule'], exact: false, refetchType: 'active' });
    },
  });
};

export const useCreateFinanceRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FinanceRecordCreatePayload) => api.post('/ipd/finance', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
      queryClient.invalidateQueries({ queryKey: ['admissions', 'light'] });
      queryClient.invalidateQueries({ queryKey: ['ipdFinanceRecords'] });
      queryClient.invalidateQueries({ queryKey: ['ipdAdmissions', 'full'] });
      queryClient.invalidateQueries({ queryKey: ['ipd-finance'] });
    },
  });
};

export const useDeleteScheduleEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => api.delete(`/ipd/schedule/${eventId}`),
    onSuccess: () => {
      // Invalidate all schedule queries (any date) and refetch active ones
      queryClient.invalidateQueries({ queryKey: ['ipdSchedule'], exact: false, refetchType: 'active' });
    },
  });
};

export const admitPatient = async (payload: Partial<IpdAdmissionCreatePayload>) => {
  try {
    const res = await api.post('/ipd/admissions', payload);
    return res.data;
  } catch (error) {
    console.error('Admission error:', {
      url: '/ipd/admissions',
      payload,
      error: error.response?.data || error.message
    });
    throw error;
  }
};

// ---------------- Types ----------------
export type Ward = {
  _id: string;
  name: string;
  category: 'General' | 'Private' | 'ICU' | 'Semi-Private';
  floor?: string;
  roomId?: string | { _id: string; name: string; floorId: string };
};

export type Floor = {
  _id: string;
  name: string;
  number?: number;
};

export type Room = {
  _id: string;
  name: string;
  floorId: string | { _id: string; name: string };
};

export interface Bed {
  _id: string;
  bedNumber: string;
  status: 'Available' | 'Occupied' | 'Maintenance' | 'Cleaning' | 'Isolation';
  rentAmount: number;
  category: string;
  rentType: string;
  wardId: string | { _id: string; name: string; floor?: string; roomId?: string };
  ward?: { _id: string; name: string };
}

export type Medication = {
  _id: string; // from database
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  startDate: string;
  endDate?: string;
  notes?: string;
};

export type LabTest = {
  _id: string; // from database
  testName: string;
  testType: string;
  orderedDate: string;
  status: 'Ordered' | 'Completed' | 'Cancelled';
  result?: string;
  notes?: string;
};

export type DoctorVisit = {
  _id: string; // from database
  dateTime: string;
  doctorId: string;
  doctorName: string;
  diagnosis?: string;
  treatment?: string;
  notes?: string;
};

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

export type BillingItem = {
  _id: string; // from database
  date: string;
  description: string;
  category: string;
  amount: number;
  status: 'Pending' | 'Paid' | 'Cancelled';
};

export type Vitals = {
  dateTime: string;
  bp: string;
  heartRate: string;
  temperature: string;
  respRate: string;
  notes?: string;
};

export interface IpdAdmission {
  _id: string;
  ipdNumber: string;
  mrNumber?: string;
  patientName?: string;
  patientId: Patient; // This is populated from the backend
  billingType?: 'cash' | 'credit';
  panelId?: string;
  wardId: string;
  bedId: string;
  doctorId: string;
  status: 'Admitted' | 'Discharged' | 'Transferred' | 'Expired';
  admitDateTime: string;
  dischargeDateTime?: string;
  admittingDiagnosis?: string;
  vitals?: Vitals[];
  medications?: Medication[];
  labTests?: LabTest[];
  doctorVisits?: DoctorVisit[];
  billing?: BillingItem[];
}

export type IpdScheduleEvent = {
  _id: string;
  dateTime: string;
  doctorId: string;
  doctorName: string;
  diagnosis?: string;
  treatment?: string;
  notes?: string;
  patientName: string;
  mrNumber: string;
  patientObjId: string;
  admissionId: string;
};

export type IpdScheduleEventCreatePayload = {
  patientId: string;
  doctorId: string;
  dateTime: string;
  notes?: string;
};

export type FinanceRecordCreatePayload = {
  amount: number;
  category: string;
  description?: string;
  type: 'Income' | 'Expense';
  department: 'IPD';
};

export type IpdAdmissionCreatePayload = {
  patientId: string;
  patientName?: string;
  wardId: string;
  bedId: string;
  doctorId?: string;
  status?: 'Admitted' | 'Discharged' | 'Transferred' | 'Expired';
  admittingDiagnosis?: string;
  initialVitals?: any;
  admitSource?: 'OPD' | 'ER' | 'Direct';
  admitDateTime?: string;
  notes?: string;
  billingType?: 'cash' | 'credit';
  panelId?: string;
};
