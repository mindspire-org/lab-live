import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Referral {
  _id: string;
  patientName: string;
  doctorName: string;
  testRequested?: string;
  status?: string;
  createdAt?: string;
}

const DoctorReferrals: React.FC = () => {
  const [items, setItems] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(false);
  const search = typeof window !== 'undefined' ? window.location.search : '';
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const patientId = params.get('patientId') || '';
  const doctorId = params.get('doctorId') || '';

  const fetchReferrals = async () => {
    setLoading(true);
    try {
      // Placeholder endpoint; backend to be implemented later
      const q = new URLSearchParams({ ...(patientId ? { patientId } : {}), ...(doctorId ? { doctorId } : {}) }).toString();
      const url = q ? `/api/lab/referrals?${q}` : "/api/lab/referrals";
      const res = await fetch(url);
      const data = await res.json();
      setItems(data?.referrals || []);
    } catch (e) {
      // silent for now; it's a stub page
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReferrals(); }, []);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold">Doctor Referrals</h1>
        <div className="text-sm text-muted-foreground">
          {patientId && <span className="mr-3">Patient ID: {patientId}</span>}
          {doctorId && <span>Doctor ID: {doctorId}</span>}
        </div>
        <Button variant="ghost" size="sm" onClick={fetchReferrals} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</Button>
      </div>
      <Card className="p-0 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">When</th>
              <th className="py-2 pr-4">Patient</th>
              <th className="py-2 pr-4">Doctor</th>
              <th className="py-2 pr-4">Tests</th>
              <th className="py-2 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r._id} className="border-b">
                <td className="py-2 pr-4">{r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}</td>
                <td className="py-2 pr-4">{r.patientName}</td>
                <td className="py-2 pr-4">{r.doctorName}</td>
                <td className="py-2 pr-4">{r.testRequested || "-"}</td>
                <td className="py-2 pr-4">{r.status || "Pending"}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-muted-foreground">No referrals yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default DoctorReferrals;
