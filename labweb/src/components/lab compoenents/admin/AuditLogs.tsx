import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";

interface AuditLog {
  _id: string;
  action: string;
  entity: string;
  user?: string;
  details?: any;
  createdAt?: string;
}

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [limit, setLimit] = useState<number>(10);
  const [page, setPage] = useState<number>(1);

  const skip = useMemo(() => (page - 1) * limit, [page, limit]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: any = { limit, skip };
      if (search.trim()) params.search = search.trim();
      if (action && action !== "all") params.action = action;
      if (from) params.from = from;
      if (to) params.to = to;
      const { data } = await api.get('/audit-logs', { params });
      const items: AuditLog[] = Array.isArray(data) ? data : (data?.items || data?.logs || []);
      const totalCount: number = Array.isArray(data) ? data.length : (data?.total || items.length || 0);
      setLogs(items);
      setTotal(totalCount);
    } catch (e) {
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [limit, page]);

  const onSearch = () => { setPage(1); fetchLogs(); };
  const onFilterAction = (v: string) => { setAction(v); setPage(1); fetchLogs(); };
  const onDateChange = () => { setPage(1); fetchLogs(); };

  const exportCsv = () => {
    const headers = ["When","Action","Entity","User","Details"];
    const rows = logs.map(l => [
      l.createdAt ? new Date(l.createdAt).toLocaleString() : "-",
      l.action || "-",
      l.entity || "-",
      l.user || "system",
      l.details ? (typeof l.details === 'string' ? l.details : JSON.stringify(l.details)) : "-",
    ]);
    const csv = [headers, ...rows].map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'audit-logs.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const printLogs = () => {
    const w = window.open('', '', 'width=900,height=700');
    if (!w) return;
    const rows = logs.map(l => `<tr><td>${l.createdAt ? new Date(l.createdAt).toLocaleString() : '-'}</td><td>${l.action||'-'}</td><td>${l.entity||'-'}</td><td>${l.user||'system'}</td><td style="white-space:pre-wrap;">${l.details ? (typeof l.details==='string'? l.details : JSON.stringify(l.details)) : '-'}</td></tr>`).join('');
    w.document.write(`<html><head><title>Audit Logs</title></head><body><h3>Audit Logs</h3><table border="1" cellspacing="0" cellpadding="4"><thead><tr><th>When</th><th>Action</th><th>Entity</th><th>User</th><th>Details</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    w.document.close(); w.focus(); w.print();
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-sm text-gray-600">Review system activity and user actions over time.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>Export CSV</Button>
          <Button variant="outline" size="sm" onClick={printLogs}>Print</Button>
          <Button variant="ghost" size="sm" onClick={fetchLogs} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center">
        <div className="md:col-span-2">
          <Input placeholder="Search action, entity, user, details" value={search} onChange={(e)=>setSearch(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter'){ onSearch(); } }} />
        </div>
        <div>
          <Select value={action} onValueChange={onFilterAction}>
            <SelectTrigger><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="create">Create</SelectItem>
              <SelectItem value="update">Update</SelectItem>
              <SelectItem value="delete">Delete</SelectItem>
              <SelectItem value="login">Login</SelectItem>
              <SelectItem value="logout">Logout</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} onBlur={onDateChange} className="w-full md:w-40" />
        </div>
        <div>
          <Input type="date" value={to} onChange={(e)=>setTo(e.target.value)} onBlur={onDateChange} className="w-full md:w-40" />
        </div>
        <div className="justify-self-start">
          <Button size="sm" onClick={onSearch} className="md:w-auto w-full px-4">Apply</Button>
        </div>
      </div>

      <Card className="p-0 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">When</th>
              <th className="py-2 pr-4">Action</th>
              <th className="py-2 pr-4">Entity</th>
              <th className="py-2 pr-4">User</th>
              <th className="py-2 pr-4">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l._id} className="border-b align-top">
                <td className="py-2 pr-4">{l.createdAt ? new Date(l.createdAt).toLocaleString() : "-"}</td>
                <td className="py-2 pr-4">{l.action}</td>
                <td className="py-2 pr-4">{l.entity}</td>
                <td className="py-2 pr-4">{l.user || "system"}</td>
                <td className="py-2 pr-4 whitespace-pre-wrap">{l.details ? (typeof l.details === 'string' ? l.details : JSON.stringify(l.details, null, 0)) : "-"}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-muted-foreground">No logs</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <Select value={String(limit)} onValueChange={(v)=>{ setLimit(parseInt(v||'25')||25); setPage(1); }}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Previous</Button>
          <div className="text-sm">Page {page} of {totalPages}</div>
          <Button variant="outline" size="sm" disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Next</Button>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
