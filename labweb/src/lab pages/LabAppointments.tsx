import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LabAppt {
  _id: string;
  patientName: string;
  date: string;
  time: string;
  type: string;
  status: string;
}

interface LabAppointmentsProps {
  onNavigateBack?: () => void;
}

const LabAppointmentsPage: React.FC<LabAppointmentsProps> = ({ onNavigateBack }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [catalog, setCatalog] = useState<{ _id: string; name: string }[]>([]);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [modalApptId, setModalApptId] = useState<string | null>(null);

  const [appts, setAppts] = useState<LabAppt[]>([]);
  const [loading, setLoading] = useState(true);

  // create appointment modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [apptType, setApptType] = useState("Walk-in");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<LabAppt[]>("/labtech/appointments");
      setAppts(data);
    } catch (err) {
      console.error(err);
      setAppts([]);
    } finally {
      setLoading(false);
    }
  };

  const createAppointment = async () => {
    setError(null);
    if (!patientName || !patientPhone || !date || !time || !apptType) {
      setError("Please fill in all required fields.");
      return;
    }
    try {
      await api.post("/labtech/appointments", {
        patientName,
        patientPhone,
        date, // string accepted; server normalizes to Date
        time,
        type: apptType,
        notes: notes || undefined,
        status: "Pending",
      });
      setCreateOpen(false);
      setPatientName("");
      setPatientPhone("");
      setDate("");
      setTime("");
      setApptType("Walk-in");
      setNotes("");
      await load();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Failed to create appointment";
      setError(msg);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openModal = async (id: string) => {
    setModalApptId(id);
    setSelectedTests([]);
    if (catalog.length === 0) {
      try {
        const { data } = await api.get<{ _id: string; name: string }[]>("/labtech/tests");
        setCatalog(data);
      } catch (e) {
        console.error(e);
      }
    }
    setModalOpen(true);
  };

  const submitSample = async () => {
    if (!modalApptId) return;
    try {
      await api.post(`/labtech/appointments/${modalApptId}/samples`, { tests: selectedTests });
      setModalOpen(false);
      await load();
    } catch (e) {
      console.error(e);
      const msg = (e as any)?.response?.data?.message || (e as any)?.message || "Failed to create sample";
      alert(msg);
    }
  };

  const finalize = async (id: string) => {
    try {
      await api.put(`/labtech/appointments/${id}/complete`, { reportData: {} });
      await load();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      {createOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg space-y-4 shadow-xl">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Appointment
            </h2>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input placeholder="Patient Name" value={patientName} onChange={(e) => setPatientName(e.target.value)} />
              <Input placeholder="Phone" value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} />
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              <Select value={apptType} onValueChange={(v) => setApptType(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Walk-in">Walk-in</SelectItem>
                  <SelectItem value="Referred">Referred</SelectItem>
                  <SelectItem value="Home Collection">Home Collection</SelectItem>
                </SelectContent>
              </Select>
              <div className="md:col-span-2">
                <Textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createAppointment}>Create</Button>
            </div>
          </div>
        </div>
      )}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4 shadow-xl">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Plus className="w-4 h-4" /> Select Tests
            </h2>
            <div className="max-h-60 overflow-auto border rounded">
              {catalog.map((t) => (
                <label
                  key={t._id}
                  className="flex items-center gap-2 px-3 py-1 border-b last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={selectedTests.includes(t._id)}
                    onChange={(e) => {
                      setSelectedTests((prev) =>
                        e.target.checked ? [...prev, t._id] : prev.filter((id) => id !== t._id)
                      );
                    }}
                  />
                  {t.name}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button disabled={selectedTests.length === 0} onClick={submitSample}>
                Create Sample
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Patient Appointments</CardTitle>
              <Button size="sm" onClick={() => { setError(null); setCreateOpen(true); }}>
                <Plus className="w-4 h-4 mr-1" /> Add Appointment
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appts.map((a) => (
                    <TableRow key={a._id}>
                      <TableCell>{a.patientName}</TableCell>
                      <TableCell>{new Date(a.date).toLocaleDateString()}</TableCell>
                      <TableCell>{a.time}</TableCell>
                      <TableCell>{a.type}</TableCell>
                      <TableCell>
                        <Badge>{a.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {a.status === "Pending" && (
                          <Button size="sm" onClick={() => openModal(a._id)}>
                            Start Sample
                          </Button>
                        )}
                        {a.status === "In-Progress" && (
                          <Button size="sm" onClick={() => finalize(a._id)}>
                            Finalize
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        {onNavigateBack && (
          <Button className="mt-4" onClick={onNavigateBack}>
            Back
          </Button>
        )}
      </div>
    </>
  );
};

export default LabAppointmentsPage;
