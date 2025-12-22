  const handlePrint = (t: Token, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    printTokenSlip({
      tokenNumber: t.tokenNumber,
      dateTime: t.dateTime,
      patientName: t.patientName,
      age: t.age,
      gender: t.gender,
      phone: t.phone,
      address: t.address,
      doctor: t.doctor,
      department: t.department,
      finalFee: t.finalFee,
      mrNumber: t.mrNumber,
    });
  };

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, FileText, BarChart3, Search, Trash2, Undo2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useDeleteToken, useUpdateTokenById } from '@/hooks/useApi';
import { API_URL } from '@/lib/api';
import { printTokenSlip } from '@/utils/printToken';
import DashboardStats from './DashboardStats';
import { useQueryClient } from '@tanstack/react-query';
import { isDemoMode, mockFetch } from '@/lib/mockData';

interface Token {
  _id?: string;
  id?: string;
  tokenNumber: string;
  dateTime: Date | string;
  patientName: string;
  age: string | number;
  gender: string;
  phone?: string;
  address?: string;
  doctor: string;
  department: string;
  finalFee: number;
  mrNumber: string;
}

const TodayTokens = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const qc = useQueryClient();
  const [todayTokens, setTodayTokens] = useState<Token[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchError, setSearchError] = useState<string>('');
  const [filteredTokens, setFilteredTokens] = useState<Token[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTokenId, setDeleteTokenId] = useState<string | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnToken, setReturnToken] = useState<Token | null>(null);

  // Fetch today's tokens from backend (server-side pagination)
  const todayStr = new Date().toLocaleDateString('en-CA');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState<number | null>(null);
  const refetch = React.useCallback(async () => {
    try {
      const qs = new URLSearchParams({ date: todayStr, page: String(page), limit: String(limit) }).toString();
      const url = `${API_URL ? API_URL : ''}/api/tokens?${qs}`;
      const token = localStorage.getItem('token') || '';
      const data = isDemoMode()
        ? await mockFetch(`/api/tokens?${qs}`, { headers: { Authorization: `Bearer ${token}` } })
        : await (await fetch(url, { headers: { Authorization: `Bearer ${token}` } })).json();
      const items = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
      setTodayTokens(items as any);
      setTotal(!Array.isArray(data) ? (data?.total ?? null) : null);
    } catch {
      setTodayTokens([]);
      setTotal(null);
    }
  }, [todayStr, page, limit]);
  const deleteTokenMutation = useDeleteToken();
  const updateTokenMutation = useUpdateTokenById();

  useEffect(() => {
    // initial + on page/limit change
    refetch();
    // Refresh every 30 seconds to show new tokens
    const interval = setInterval(() => refetch(), 30000);
    const onGenerated = () => refetch();
    window.addEventListener('tokenGenerated', onGenerated);
    return () => {
      clearInterval(interval);
      window.removeEventListener('tokenGenerated', onGenerated);
    };
  }, [refetch]);

  useEffect(() => {
    // Filter tokens based on search term - hardened to avoid undefined errors
    if (searchTerm) {
      if (searchTerm.length > 50) {
        setSearchError('Search is too long (max 50 characters).');
      } else {
        setSearchError('');
      }
      const query = searchTerm.toLowerCase();
      const filtered = todayTokens.filter(token =>
        (token.patientName || '').toLowerCase().includes(query) ||
        (token.tokenNumber || '').toLowerCase().includes(query) ||
        (token.mrNumber || '').toLowerCase().includes(query) ||
        (token.phone?.includes(searchTerm) || false) ||
        (token.doctor || '').toLowerCase().includes(query) ||
        (token.department || '').toLowerCase().includes(query) ||
        (token.age ?? '').toString().includes(searchTerm) ||
        (token.gender || '').toLowerCase().includes(query) ||
        (token.address || '').toLowerCase().includes(query) ||
        (token.dateTime ? new Date(token.dateTime).toLocaleTimeString().includes(searchTerm) : false)
      );
      setFilteredTokens(filtered);
    } else {
      setFilteredTokens(todayTokens);
      setSearchError('');
    }
  }, [searchTerm, todayTokens]);

  // Deletion handlers now call backend API

  const openAnalytics = () => {
    // Dispatch custom event to switch to analytics tab
    window.dispatchEvent(new CustomEvent('openAnalytics'));
  };

  const handleDeleteClick = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteTokenId(id);
    setShowDeleteModal(true);
  };

  const handleReturnClick = (token: Token, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setReturnToken(token);
    setShowReturnModal(true);
  };

  const confirmDeleteToken = async () => {
    if (!deleteTokenId) return;
    try {
      await deleteTokenMutation.mutateAsync(deleteTokenId);
      await refetch();
    } finally {
      setShowDeleteModal(false);
      setDeleteTokenId(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteTokenId(null);
  };

  const confirmReturnToken = async () => {
    if (!returnToken) return;
    try {
      await updateTokenMutation.mutateAsync({
        _id: (returnToken as any)._id || (returnToken as any).id,
        status: 'returned',
        refundAmount: (returnToken as any).finalFee,
        returnedAt: new Date().toISOString(),
      });
      await refetch();
      try { window.dispatchEvent(new Event('revenueChanged')); } catch {}
      try { qc.invalidateQueries({ queryKey: ['monthlyOverview'] }); } catch {}
      try { qc.invalidateQueries({ queryKey: ['tokens'] }); } catch {}
    } finally {
      setShowReturnModal(false);
      setReturnToken(null);
    }
  };

  const cancelReturn = () => {
    setShowReturnModal(false);
    setReturnToken(null);
  };



  const openPrescription = (token: Token) => {
    // Dispatch custom event to open prescription with token data
    window.dispatchEvent(new CustomEvent('openPrescription', { detail: token }));
  };

  // CSV export for today's tokens
  const exportCsv = () => {
    const rows = (filteredTokens as Token[]).map((t) => ({
      Date: t.dateTime ? new Date(t.dateTime).toLocaleDateString('en-CA') : '',
      Time: t.dateTime ? new Date(t.dateTime).toLocaleTimeString() : '',
      Token: t.tokenNumber,
      MR: t.mrNumber,
      Patient: t.patientName,
      Age: t.age,
      Gender: t.gender,
      Phone: t.phone || '',
      Address: t.address || '',
      Doctor: t.doctor,
      Department: t.department,
      Fee: t.finalFee,
    }));
    const header = Object.keys(rows[0] || { Date: '', Time: '', Token: '', MR: '', Patient: '', Age: '', Gender: '', Phone: '', Address: '', Doctor: '', Department: '', Fee: '' });
    const csv = [header.join(','), ...rows.map(r => header.map(h => String((r as any)[h] ?? '').replace(/,/g, ' ')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `today-tokens-${todayStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card className="border-t-4 border-t-blue-600 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span>Today's Tokens</span>
              <span className="ml-2 bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-sm">
                {todayTokens.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={openAnalytics}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl shadow-lg"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
              <Button variant="outline" onClick={exportCsv}>Export CSV</Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, token#, MR#, phone, doctor, department, age, gender, address, or time..."
              className="pl-10 border-gray-300 focus:border-blue-500 rounded-xl"
            />
            {searchError && (
              <div className="text-xs text-red-600 mt-1">{searchError}</div>
            )}
          </div>

          {/* Keep top dashboard widgets */}
          <DashboardStats />

          {/* Results Count */}
          {searchTerm && (
            <div className="text-sm text-gray-600 font-medium">
              Showing {filteredTokens.length} of {todayTokens.length} patients
            </div>
          )}

          {/* Tokens Table */}
          {filteredTokens.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>{todayTokens.length === 0 ? 'No tokens generated today' : 'No patients match your search'}</p>
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-auto border rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 sticky top-0">
                  <tr className="text-left">
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Token #</th>
                    <th className="px-3 py-2">MR #</th>
                    <th className="px-3 py-2">Patient</th>
                    <th className="px-3 py-2">Age</th>
                    <th className="px-3 py-2">Gender</th>
                    <th className="px-3 py-2">Phone</th>
                    <th className="px-3 py-2">Doctor</th>
                    <th className="px-3 py-2">Department</th>
                    <th className="px-3 py-2">Fee</th>
                    <th className="px-3 py-2">Print</th>
                    {isAdmin && <th className="px-3 py-2 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredTokens.map((t, idx) => {
                    const isReturned = String((t as any).status || '').toLowerCase() === 'returned';
                    return (
                    <tr key={(t as any)._id || t.id || idx} className={`border-t hover:bg-gray-50 cursor-pointer ${isReturned ? 'bg-red-50' : ''}`} onClick={() => openPrescription(t)}>
                      <td className="px-3 py-2">{t.dateTime ? new Date(t.dateTime).toLocaleTimeString() : '-'}</td>
                      <td className="px-3 py-2 font-semibold">{t.tokenNumber}</td>
                      <td className="px-3 py-2">{t.mrNumber}</td>
                      <td className="px-3 py-2">{t.patientName}</td>
                      <td className="px-3 py-2">{t.age}</td>
                      <td className="px-3 py-2">{t.gender}</td>
                      <td className="px-3 py-2">{t.phone || ''}</td>
                      <td className="px-3 py-2">{(t.doctor || '').split(' - ')[0] || '-'}</td>
                      <td className="px-3 py-2">{t.department}</td>
                      <td className={`px-3 py-2 font-bold ${isReturned ? 'text-red-700' : 'text-green-700'}`}>{isReturned ? `- Rs. ${t.finalFee}` : `Rs. ${t.finalFee}`}</td>
                      <td className="px-3 py-2">
                        <button onClick={(e)=>handlePrint(t, e)} className="text-indigo-600 hover:text-indigo-800">Print</button>
                      </td>
                      {isAdmin && (
                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex items-center gap-3">
                            {!isReturned && (
                              <button title="Mark as Returned" onClick={(e) => handleReturnClick(t, e)} className="text-amber-600 hover:text-amber-700">
                                <Undo2 className="h-5 w-5 inline" />
                              </button>
                            )}
                            <button title="Delete" onClick={(e) => { e.stopPropagation(); handleDeleteClick(((t as any)._id || t.id) as string, e as any); }} className="text-red-600 hover:text-red-800">
                              <Trash2 className="h-5 w-5 inline" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Rows per page</span>
              <select className="border rounded h-8 px-2" value={limit} onChange={e=>{ setPage(1); setLimit(parseInt(e.target.value)||10); }}>
                {[10,20,50,100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" disabled={page<=1} onClick={()=> setPage(p => Math.max(1, p-1))}>Prev</Button>
              <div className="text-sm">Page {page}{total!=null ? ` of ${Math.max(1, Math.ceil(total/limit))}` : ''}</div>
              <Button variant="outline" disabled={total!=null ? (page*limit)>=total : todayTokens.length<limit} onClick={()=> setPage(p => p+1)}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Delete Confirmation Modal */}
      {isAdmin && showDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h2 className="text-lg font-semibold mb-2 text-red-600">Confirm Delete Token</h2>
            <p className="mb-4">Are you sure you want to delete this token?</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={cancelDelete}>No</Button>
              <Button variant="destructive" onClick={confirmDeleteToken}>Yes</Button>
            </div>
          </div>
        </div>
      )}

      {/* Return Confirmation Modal */}
      {isAdmin && showReturnModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h2 className="text-lg font-semibold mb-2 text-amber-700">Mark Token as Returned</h2>
            <p className="mb-4">Are you sure you want to mark this token as returned and reverse its revenue?</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={cancelReturn}>No</Button>
              <Button className="bg-amber-600 hover:bg-amber-700" onClick={confirmReturnToken}>Yes</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TodayTokens;
