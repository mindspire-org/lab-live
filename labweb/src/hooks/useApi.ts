console.log('Current token:', localStorage.getItem('token'));

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { get, post, put, del } from '@/lib/api';
import { postAudit } from '@/lib/audit';
import { toast } from 'sonner';
import { API_URL } from '../lib/api';
import { isDemoMode, mockFetch } from '@/lib/mockData';

// Simple role reader; tokens already carry role server-side, but we keep a UI hint in localStorage
const getCurrentRole = (): string | null => {
  try { return localStorage.getItem('role'); } catch { return null; }
};

// Local user creation input for hospital users (no name/email)
export type UserCreateInput = {
  username: string;
  password?: string;
  role?: 'admin' | 'receptionist' | 'doctor' | 'ipd';
};

// Enhanced request function with debugging
const makeAuthorizedRequest = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  console.log('Making request to:', url);
  console.log('Using token:', token ? 'Present' : 'Missing');

  const headers = {
    'Authorization': `Bearer ${token || ''}`,
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (isDemoMode()) {
    try {
      return await mockFetch(url, { ...options, headers });
    } catch (error) {
      console.error('Mock request failed:', error);
      throw error;
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    console.log('Response status:', response.status);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API Error:', errorData);
      const msg = errorData.message || errorData.error || errorData.err || 'Request failed';
      throw new Error(msg);
    }

    return await response.json();
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
};

export const useDoctors = () => {
  return useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      const response = await makeAuthorizedRequest(`${API_URL}/api/doctors`);
      return response;
    },
    // keep it fresh for real-time dashboard
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
};

export const useDepartments = () => {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await makeAuthorizedRequest(`${API_URL}/api/departments`);
      return response;
    }
  });
};

export const usePatientsByPhone = (phone: string) => {
  return useQuery({
    queryKey: ['patients', phone],
    queryFn: async () => {
      const response = await makeAuthorizedRequest(`${API_URL}/api/patients?phone=${phone}`);
      return response;
    },
    enabled: !!phone,
  });
};

// Fetch all patients (optionally can be filtered server-side later)
export const useAllPatients = () => {
  return useQuery({
    queryKey: ['patients', 'all'],
    queryFn: async () => {
      // Use general endpoint so all roles (admin, reception, doctor) can retrieve patients
      const response = await makeAuthorizedRequest(`${API_URL}/api/patients`);
      return response;
    },
    // Keep fresh so counts stay up-to-date
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
};

// Ad-hoc server-side search by query params
export const fetchPatients = async (params: { mrNumber?: string; phone?: string; name?: string; dateFrom?: string; dateTo?: string; department?: string; doctor?: string }) => {
  const query = new URLSearchParams();
  if (params?.mrNumber) query.set('mrNumber', params.mrNumber);
  if (params?.phone) query.set('phone', params.phone);
  if (params?.name) query.set('name', params.name); // backend may ignore name if not supported
  if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params?.dateTo) query.set('dateTo', params.dateTo);
  if (params?.department) query.set('department', params.department);
  if (params?.doctor) query.set('doctor', params.doctor);
  const qs = query.toString();
  // Use general endpoint that supports MR/phone/name query
  const url = `${API_URL}/api/patients${qs ? `?${qs}` : ''}`;
  const response = await makeAuthorizedRequest(url);
  return response;
};

export const useCreateDoctor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      username: string;
      password?: string;
      specialization: string;
      phone: string;
      cnic?: string;
      consultationFee: number;
      commissionRate: number;
    }) => {
      const password = data.password || Math.random().toString(36).slice(-8);
      
      const response = await makeAuthorizedRequest(`${API_URL}/api/doctors`, {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          password,
          mustChangePassword: !data.password
        })
      });

      return response;
    },
    onSuccess: async (result, variables) => {
      qc.invalidateQueries({ queryKey: ['doctors'] });
      toast.success('Doctor created successfully');
      try { await postAudit({ action: 'doctor.create', module: 'doctors', details: { name: variables.name, phone: variables.phone } }); } catch {}
    },
    onError: (error: Error) => {
      toast.error(`Failed to create doctor: ${error.message}`);
    }
  });
};

export const useUpdateDoctor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; payload: any }) => {
      const response = await makeAuthorizedRequest(`${API_URL}/api/doctors/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify(data.payload)
      });

      return response;
    },
    onSuccess: async (result, variables) => {
      qc.invalidateQueries({ queryKey: ['doctors'] });
      try { await postAudit({ action: 'doctor.update', module: 'doctors', details: { id: variables.id } }); } catch {}
    },
  });
};

export const useDeleteDoctor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await makeAuthorizedRequest(`${API_URL}/api/doctors/${id}`, {
        method: 'DELETE'
      });

      return response;
    },
    onSuccess: async (_result, id) => {
      qc.invalidateQueries({ queryKey: ['doctors'] });
      try { await postAudit({ action: 'doctor.delete', module: 'doctors', details: { id } }); } catch {}
    },
  });
};

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await makeAuthorizedRequest(`${API_URL}/api/users`);
      return response;
    }
  });
};

export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userData: UserCreateInput) => {
      const response = await makeAuthorizedRequest(`${API_URL}/api/users`, {
        method: 'POST',
        body: JSON.stringify({
          username: userData.username,
          password: userData.password || Math.random().toString(36).slice(-8),
          role: userData.role || 'doctor',
          mustChangePassword: true
        }),
      });

      return response;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create user: ${error.message}`);
    }
  });
};

export const useUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; payload: any }) => {
      const response = await makeAuthorizedRequest(`${API_URL}/api/users/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify(data.payload)
      });

      return response;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useDeleteUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await makeAuthorizedRequest(`${API_URL}/api/users/${id}`, {
        method: 'DELETE'
      });

      return response;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useCreateToken = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await makeAuthorizedRequest(`${API_URL}/api/tokens`, {
        method: 'POST',
        body: JSON.stringify(data)
      });

      return response;
    },
    onSuccess: async (result) => {
      qc.invalidateQueries({ queryKey: ['tokens'] });
      qc.invalidateQueries({ queryKey: ['patients'] });
      qc.invalidateQueries({ queryKey: ['doctors'] });
      try { await postAudit({ action: 'token.create', module: 'tokens', details: { tokenId: (result as any)?._id, tokenNumber: (result as any)?.tokenNumber } }); } catch {}
    },
  });
};

export const useTokens = (date?: string) => {
  const queryString = date ? `?date=${date}` : '';
  return useQuery({
    queryKey: ['tokens', date || 'all'],
    queryFn: async () => {
      const response = await makeAuthorizedRequest(`${API_URL}/api/tokens${queryString}`);
      return response;
    },
  });
};

export const useDeleteToken = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await makeAuthorizedRequest(`${API_URL}/api/tokens/${id}`, {
        method: 'DELETE',
      });
      return response;
    },
    onSuccess: async (result, id) => {
      qc.invalidateQueries({ queryKey: ['tokens'] });
      qc.invalidateQueries({ queryKey: ['doctors'] });
      try { await postAudit({ action: 'token.delete', module: 'tokens', details: { id } }); } catch {}
    },
  });
};

export const useUpdateTokenById = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await makeAuthorizedRequest(`${API_URL}/api/tokens/${data._id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      return response;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tokens'] });
      qc.invalidateQueries({ queryKey: ['patients'] });
      qc.invalidateQueries({ queryKey: ['doctors'] });
    },
  });
};

export const checkUsernameExists = async (username: string) => {
  const response = await makeAuthorizedRequest(`${API_URL}/api/users/check-username?username=${username}`);
  return response;
};

export const useDoctorDashboard = () => {
  return useQuery({
    queryKey: ['doctorDashboard'],
    queryFn: async () => {
      const response = await makeAuthorizedRequest(`${API_URL}/api/doctor/dashboard`);
      return response;
    },
    enabled: getCurrentRole() === 'doctor',
  });
};

export const useTodayAppointments = () => {
  return useQuery({
    queryKey: ['todayAppointments'],
    queryFn: async () => {
      const response = await makeAuthorizedRequest(`${API_URL}/api/doctor/appointments/today`);
      return response;
    },
    enabled: getCurrentRole() === 'doctor',
  });
};

export const useDoctorPatients = () => {
  return useQuery({
    queryKey: ['doctorPatients'],
    queryFn: async () => {
      const response = await makeAuthorizedRequest(`${API_URL}/api/doctor/patients`);
      return response;
    },
    enabled: getCurrentRole() === 'doctor',
  });
};

// Monthly overview across hospital: total patients (distinct), total tokens and total revenue for current month
export const useMonthlyOverview = () => {
  return useQuery({
    queryKey: ['monthlyOverview'],
    queryFn: async () => {
      const response = await makeAuthorizedRequest(`${API_URL}/api/overview/monthly`);
      return response as { start: string; end: string; totalTokens: number; totalPatients: number; totalRevenue: number };
    },
    // refresh every 60s
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });
};

// Corporate panels for credit billing
export const useCorporatePanels = () => {
  return useQuery({
    queryKey: ['corporatePanels'],
    queryFn: async () => {
      const response = await makeAuthorizedRequest(`${API_URL}/api/corporate/panels`);
      return response;
    },
  });
};
