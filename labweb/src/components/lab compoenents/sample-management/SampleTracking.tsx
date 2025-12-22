import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TestType } from "@/lab types/sample";
import { useToast } from "@/hooks/use-toast";
import { Search, ArrowLeft, Clock, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lab lib/api";

interface SampleTrackingProps {
  onNavigateBack?: () => void;
}

export interface BackendSample {
  _id: string;
  patientName: string;
  patientId?: string;
  barcode?: string;
  tests: TestType[];
  status: "collected" | "processing" | "completed";
  priority: "normal" | "high" | "urgent";
  results?: any[];
  resultsSubmittedAt?: string;
  submittedAt?: string;
  // Timestamps come directly from backend document
  receivedAt?: string;
  processedAt?: string;
  completedAt?: string;
  sampleCollectedBy?: string;
  processingBy?: string;
  expectedCompletionDays?: number | string;
  notes?: string;
  // Optional patient intake fields carried through for display
  phone?: string;
  patientPhone?: string;
  cnic?: string;
  patientCnic?: string;
  guardianName?: string;
  fatherName?: string;
  gender?: string;
  token?: string | number;
  tokenNo?: string | number;
  createdAt?: string;
  updatedAt?: string;
}

const SampleTrackingClean = ({ onNavigateBack }: SampleTrackingProps) => {
  const { toast } = useToast();
  const [samples, setSamples] = useState<BackendSample[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'normal' | 'urgent'>('all');
  const [trackedSample, setTrackedSample] = useState<BackendSample | null>(null);

  // Load samples from backend API
  const loadSamples = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/labtech/samples", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const arr = Array.isArray(res.data) ? res.data : [];

      const mapped: BackendSample[] = arr.map((s: any) => {
        const id = s._id || s.sampleNumber || "";
        const statusRaw = String(s.status || "").toLowerCase();
        const status: BackendSample["status"] =
          statusRaw.includes("complet")
            ? "completed"
            : statusRaw.includes("process")
            ? "processing"
            : "collected";
        const priorityRaw = String(s.priority || "").toLowerCase();
        const priority: BackendSample["priority"] =
          priorityRaw === "urgent" ? "urgent" : priorityRaw === "high" ? "high" : "normal";

        const tests: TestType[] = Array.isArray(s.tests) && s.tests.length
          ? (s.tests.map((t: any) => ({
              ...(t || {}),
              name: t?.name || t?.test || "",
            })) as TestType[])
          : [{ name: s.test || (s.tests && s.tests[0]?.name) || "" } as any];

        const normalized: BackendSample = {
          _id: String(id),
          patientName: s.patientName || "Unknown",
          patientId: s.patientId || "",
          barcode: s.barcode || "",
          tests,
          status,
          priority,
          receivedAt: s.receivedAt || s.createdAt,
          processedAt: s.processedAt,
          completedAt: s.completedAt,
          sampleCollectedBy: s.sampleCollectedBy,
          processingBy: s.processingBy,
          expectedCompletionDays: s.expectedCompletionDays,
          notes: s.notes,
          phone: s.phone,
          patientPhone: s.phone,
          cnic: s.cnic,
          patientCnic: s.cnic,
          guardianName: s.guardianName,
          fatherName: s.guardianName,
          gender: s.gender,
          token: s.sampleNumber,
          tokenNo: s.sampleNumber,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        };
        return normalized;
      });

      setSamples(mapped);
    } catch (err) {
      console.error("Failed to load samples from backend", err);
      setSamples([]);
    }
  };

  const handleTrackSampleRow = async (sample: BackendSample) => {
    setTrackedSample(sample);
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const id = String(sample._id || (sample as any).tokenNo || (sample as any).token || '');
      if (!id) return;

      const res = await api.get(`/labtech/samples/${id}/test-result`, { headers });
      const tr = (res?.data || null) as any;
      if (tr && Array.isArray(tr.results)) {
        setTrackedSample((prev) => {
          if (!prev) return prev;
          if (String(prev._id) !== String(sample._id)) return prev;
          return {
            ...prev,
            results: tr.results,
            resultsSubmittedAt: tr.resultsSubmittedAt || tr.submittedAt || tr.updatedAt,
            submittedAt: tr.submittedAt || tr.updatedAt,
          } as any;
        });
      }
    } catch (err) {
      // ignore; timeline will just not show report-created as active
    }
  };

  useEffect(() => {
    loadSamples();
    const handler = () => { loadSamples(); };
    window.addEventListener('samplesChanged', handler);
    window.addEventListener('sampleSubmitted', handler);
    return () => {
      window.removeEventListener('samplesChanged', handler);
      window.removeEventListener('sampleSubmitted', handler);
    };
  }, []);

  const filtered = samples.filter((s) => {
    const search = searchTerm.toLowerCase();
    const token = (s as any).tokenNo || (s as any).token || '';
    const cnic = (s as any).cnic || (s as any).patientCnic || '';
    const phone = (s as any).phone || (s as any).patientPhone || '';
    const priority = String((s as any).priority || '').toLowerCase();
    const matches =
      (s._id || '').toLowerCase().includes(search) ||
      (s.patientName || '').toLowerCase().includes(search) ||
      (s.patientId || '').toLowerCase().includes(search) ||
      String(token).toLowerCase().includes(search) ||
      String(cnic).toLowerCase().includes(search) ||
      String(phone).toLowerCase().includes(search) ||
      priority.includes(search) ||
      s.tests.some((t) => (t.name || '').toLowerCase().includes(search));
    const statusMatch = statusFilter === 'all' || s.status === statusFilter;
    const priNorm = priority === 'urgent' ? 'urgent' : 'normal';
    const priorityMatch = priorityFilter === 'all' || priNorm === priorityFilter;
    return matches && statusMatch && priorityMatch;
  });

  const statusColor = (status: BackendSample["status"]) => {
    switch (status) {
      case "collected":
        return "bg-blue-600 text-white";
      case "processing":
        return "bg-yellow-600 text-white";
      case "completed":
        return "bg-green-600 text-white";
      default:
        return "bg-gray-600 text-white";
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Sample Tracking</h1>
        <p className="text-sm text-muted-foreground">Track and manage sample status throughout the testing process</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by sample ID, patient, or test..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-11"
          />
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Priority</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="h-9 rounded-md border border-gray-300 bg-white pl-2 pr-8 text-sm"
            >
              <option value="all">All</option>
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-gray-300 bg-white pl-2 pr-8 text-sm"
            >
              <option value="all">All</option>
              <option value="collected">Collected</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      <Card className="border rounded-lg">
        <CardContent className="p-0">
          <div className="overflow-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 text-left text-sm text-gray-600">
                  <th className="px-3 py-2 border-b">Sample ID</th>
                  <th className="px-3 py-2 border-b">Patient</th>
                  <th className="px-3 py-2 border-b">Test(s)</th>
                  <th className="px-3 py-2 border-b">CNIC</th>
                  <th className="px-3 py-2 border-b">Phone</th>
                  <th className="px-3 py-2 border-b">Priority</th>
                  <th className="px-3 py-2 border-b">Date</th>
                  <th className="px-3 py-2 border-b">Status</th>
                  <th className="px-3 py-2 border-b text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filtered.map((s) => {
                  const token = (s as any).tokenNo || (s as any).token || s._id || '-';
                  const cnic = (s as any).cnic || (s as any).patientCnic || '-';
                  const phone = (s as any).phone || (s as any).patientPhone || '-';
                  const priority = String((s as any).priority || 'normal');
                  return (
                    <tr key={s._id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 border-b">{token}</td>
                      <td className="px-3 py-2 border-b">
                        <div className="font-medium">{s.patientName || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">{s.patientId || ''}</div>
                      </td>
                      <td className="px-3 py-2 border-b">
                        {(() => {
                          const names = Array.from(
                            new Set(
                              (Array.isArray(s.tests) ? s.tests : [])
                                .map((t: any) => String((t && (t.name || t.test)) || t || '').trim())
                                .filter(Boolean)
                                .map((n) => n.toLowerCase())
                            )
                          ).map((lower) =>
                            (Array.isArray(s.tests) ? s.tests : [])
                              .map((t: any) => String((t && (t.name || t.test)) || t || '').trim())
                              .find((n: string) => n && n.toLowerCase() === lower) || lower
                          );
                          const list = names.filter(Boolean);
                          if (list.length === 0) return <span>-</span>;
                          return (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 px-2">
                                  {list.length} {list.length === 1 ? 'test' : 'tests'}
                                  <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="max-h-64 overflow-auto">
                                {list.map((n, idx) => (
                                  <DropdownMenuItem key={`${n}-${idx}`} onSelect={(e) => e.preventDefault()}>
                                    {n}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-2 border-b">{cnic}</td>
                      <td className="px-3 py-2 border-b">{phone}</td>
                      <td className="px-3 py-2 border-b capitalize">{priority || 'normal'}</td>
                      <td className="px-3 py-2 border-b whitespace-nowrap">{(() => { const d = (s as any).createdAt || (s as any).updatedAt || s.receivedAt; try { return d ? new Date(d).toLocaleString() : '-'; } catch { return '-'; } })()}</td>
                      <td className="px-3 py-2 border-b">
                        <Badge className={statusColor(s.status)}>{s.status}</Badge>
                      </td>
                      <td className="px-3 py-2 border-b text-right">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          <Button
                            size="sm"
                            className="h-8 px-3 bg-blue-900 text-white hover:bg-blue-700"
                            onClick={() => handleTrackSampleRow(s)}
                          >
                            Track
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-gray-500">
                      <Search className="mx-auto w-10 h-10 text-gray-300 mb-2" />
                      <p>No samples available yet</p>
                      <p className="text-xs text-gray-400 mt-1">New samples from Intake will appear here automatically. You can also adjust search or filters above.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Track Sample Dialog */}
      <Dialog open={!!trackedSample} onOpenChange={(open) => { if (!open) setTrackedSample(null); }}>
        <DialogContent className="w-full max-w-3xl max-h-[90vh] overflow-y-auto sm:rounded-2xl p-4 sm:p-6">
          {trackedSample && (
            <div className="space-y-6">
              {/* Header: Sample ID */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Sample ID
                </p>
                <p className="font-mono text-sm font-semibold">
                  {(trackedSample as any).tokenNo || (trackedSample as any).token || trackedSample._id}
                </p>
              </div>

              {/* Sample Information Card */}
              <Card className="border bg-gray-50/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-gray-800">Sample Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Sample ID</p>
                    <p className="font-mono text-gray-900">
                      {(trackedSample as any).tokenNo || (trackedSample as any).token || trackedSample._id}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Patient</p>
                    <p className="font-medium text-gray-900">{trackedSample.patientName || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Test(s)</p>
                    <p className="font-medium text-gray-900">
                      {trackedSample.tests && trackedSample.tests.length
                        ? trackedSample.tests.map(t => t.name).join(', ')
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">CNIC</p>
                    <p className="text-gray-900">{(trackedSample as any).cnic || (trackedSample as any).patientCnic || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Phone</p>
                    <p className="text-gray-900">{(trackedSample as any).phone || (trackedSample as any).patientPhone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Guardian</p>
                    <p className="text-gray-900">{(trackedSample as any).fatherName || (trackedSample as any).guardianName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Gender</p>
                    <p className="text-gray-900 capitalize">{(trackedSample as any).gender || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <Badge className={statusColor(trackedSample.status)}>{trackedSample.status}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Priority</p>
                    <p className="text-gray-900 capitalize">{trackedSample.priority}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Collected On</p>
                    <p className="text-gray-900">
                      {(() => {
                        const d = (trackedSample as any).createdAt || trackedSample.receivedAt;
                        try {
                          return d ? new Date(d).toLocaleString() : '-';
                        } catch {
                          return '-';
                        }
                      })()}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-gray-800">Sample Lifecycle Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      {
                        key: 'collected',
                        label: 'Sample Collected',
                        subtitle: `Sample Collected by ${String((trackedSample as any).sampleCollectedBy || '').trim() || 'Person'}`,
                        time: trackedSample.receivedAt,
                        active: !!trackedSample.receivedAt,
                      },
                      {
                        key: 'barcode',
                        label: 'Barcode Generated & Scanned',
                        time: (trackedSample as any).barcodeGeneratedAt || trackedSample.updatedAt || trackedSample.receivedAt,
                        active: !!String((trackedSample as any).barcode || '').trim(),
                      },
                      {
                        key: 'processing',
                        label: 'Sample Processing',
                        subtitle: (() => {
                          const by = String((trackedSample as any).processingBy || '').trim();
                          const daysRaw = (trackedSample as any).expectedCompletionDays;
                          const days = daysRaw === 0 || daysRaw ? String(daysRaw).trim() : '';
                          const parts: string[] = [];
                          if (by) parts.push(`Processing by ${by}`);
                          if (days) parts.push(`Expected to be completed in ${days} day(s)`);
                          return parts.length ? parts.join(' • ') : undefined;
                        })(),
                        time: trackedSample.processedAt,
                        active: !!trackedSample.processedAt || trackedSample.status === 'processing' || trackedSample.status === 'completed',
                      },
                      {
                        key: 'processing-completed',
                        label: 'Sample processing Completed',
                        subtitle: 'Ready for result entry.',
                        time: trackedSample.processedAt,
                        active: trackedSample.status === 'completed',
                      },
                      {
                        key: 'report-created',
                        label: 'Report Created',
                        subtitle: 'Results have been entered and report is ready to print out/download',
                        time: (() => {
                          const hasResults = Array.isArray((trackedSample as any).results) && (trackedSample as any).results.length > 0;
                          if (!hasResults) return null;
                          return (
                            (trackedSample as any).reportCreatedAt ||
                            (trackedSample as any).reportGeneratedAt ||
                            (trackedSample as any).reportCreatedOn ||
                            (trackedSample as any).resultsSubmittedAt ||
                            (trackedSample as any).submittedAt ||
                            trackedSample.completedAt ||
                            null
                          );
                        })(),
                        active: (() => {
                          const hasResults = Array.isArray((trackedSample as any).results) && (trackedSample as any).results.length > 0;
                          return hasResults;
                        })(),
                      },
                    ].map((step, index, arr) => {
                      const dt = step.time ? new Date(step.time) : null;
                      const timeLabel = dt && !isNaN(dt.getTime())
                        ? dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '--:--';
                      const isLast = index === arr.length - 1;
                      const circleClass = step.active
                        ? 'bg-blue-600 border-blue-600 shadow-sm'
                        : 'bg-white border-gray-300';
                      const lineClass = step.active ? 'bg-blue-200' : 'bg-gray-200';
                      const textClass = step.active ? 'text-gray-900' : 'text-gray-500';

                      return (
                        <div key={step.key} className="flex items-start gap-3">
                          <div className="flex flex-col items-center pt-1">
                            <div className={`w-5 h-5 rounded-full border-2 ${circleClass}`}></div>
                            {!isLast && (
                              <div className={`w-px h-10 mt-1 ${lineClass}`}></div>
                            )}
                          </div>
                          <div className="flex-1 flex items-center justify-between">
                            <div>
                              <p className={`text-sm font-medium ${textClass}`}>{step.label}</p>
                              {(step as any).subtitle && (
                                <p className={`text-xs ${step.active ? 'text-gray-600' : 'text-gray-400'}`}>
                                  {(step as any).subtitle}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              <span>{timeLabel}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SampleTrackingClean;

/* Legacy SampleTracking UI preserved for reference
 Badge } from "@/components/ui/badge"; { Input } from "@/components/ui/input"; { labDataStore, StoredSample } from "@/store/labData"; { Search, Eye, Edit, MapPin, Printer, Download, ArrowLeft, X } from "lucide-react"; { useToast } from "@/hooks/use-toast";

interface SampleTrackingProps {
  onNavigateBack?: () => void;
}

const SampleTracking = ({ onNavigateBack }: SampleTrackingProps) => {
  const [samples, setSamples] = useState<StoredSample[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSample, setSelectedSample] = useState<StoredSample | null>(null);
  const [updateStatus, setUpdateStatus] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadSamples();
    const interval = setInterval(loadSamples, 5000); // Real-time updates every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSamples = () => {
    setSamples(labDataStore.getSamples());
  };

  const handleBackButton = () => {
    if (onNavigateBack) {
      onNavigateBack();
    } else {
      window.history.back();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "received": return "bg-blue-100 text-blue-800";
      case "processing": return "bg-yellow-100 text-yellow-800";
      case "completed": return "bg-green-100 text-green-800";
      case "archived": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "normal": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const filteredSamples = samples.filter(sample => {
    const matchesSearch = 
      sample.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sample.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sample.testType.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || sample.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getTimeElapsed = (receivedAt: Date) => {
    const now = new Date();
    const diff = now.getTime() - receivedAt.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ago`;
    }
    return `${minutes}m ago`;
  };

  const handleUpdateSample = (sample: StoredSample) => {
    if (!updateStatus) {
      toast({
        title: "Error",
        description: "Please select a status to update.",
        variant: "destructive"
      });
      return;
    }

    const updated = labDataStore.updateSample(sample.id, { 
      status: updateStatus as any,
      processedAt: updateStatus === "processing" ? new Date() : sample.processedAt,
      completedAt: updateStatus === "completed" ? new Date() : sample.completedAt
    });

    if (updated) {
      loadSamples();
      setUpdateStatus("");
      toast({
        title: "Sample Updated",
        description: `Sample ${sample.id} status updated to ${updateStatus}.`,
      });
    }
  };

  const handleViewSample = (sample: StoredSample) => {
    setSelectedSample(sample);
  };

  const handleTrackSample = (sampleId: string) => {
    const sample = samples.find(s => s.id === sampleId);
    if (sample) {
      setSelectedSample(sample);
      toast({
        title: "Real-time Tracking",
        description: `Tracking sample ${sampleId} in real-time.`,
      });
    }
  };

  const handlePrintReport = (sampleId: string) => {
    toast({
      title: "Printing Report",
      description: `Generating print version for sample ${sampleId}.`,
    });
    window.print();
  };

  const handleDownloadReport = (sampleId: string) => {
    toast({
      title: "Downloading Report",
      description: `Preparing PDF download for sample ${sampleId}.`,
    });
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={handleBackButton}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Sample Tracking</h1>
            <p className="text-gray-600">Monitor sample status and workflow - Real-time updates</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by sample ID, patient, or test..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex flex-wrap space-x-2">
          {["all", "received", "completed"].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className="mb-2"
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {filteredSamples.map((sample) => (
          <Card key={sample.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                  <div>
                    <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded mb-2">
                      {sample.id}
                    </div>
                    <h3 className="font-semibold text-lg">{sample.patientName}</h3>
                    <p className="text-gray-600">{sample.testType.name}</p>
                    <p className="text-sm text-gray-500">
                      Received {getTimeElapsed(sample.receivedAt)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
                  <div className="flex flex-col space-y-2">
                    <Badge className={getStatusColor(sample.status)}>
                      {sample.status}
                    </Badge>
                    <Badge className={getPriorityColor(sample.priority)}>
                      {sample.priority}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <select
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                      value={updateStatus}
                      onChange={(e) => setUpdateStatus(e.target.value)}
                    >
                      <option value="">Update Status</option>
                      <option value="received">Received</option>
                      <option value="processing">Processing</option>
                      <option value="completed">Completed</option>
                    </select>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleUpdateSample(sample)}
                    >
                      Update
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleTrackSample(sample.id)}
                    >
                      <MapPin className="w-4 h-4 mr-1" />
                      Track
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewSample(sample)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    {sample.status === "completed" && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handlePrintReport(sample.id)}
                        >
                          <Printer className="w-4 h-4 mr-1" />
                          Print
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownloadReport(sample.id)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          PDF
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              { Progress Timeline }
              <div className="mt-4 pt-4 border-t">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
                  <div className="flex flex-wrap space-x-4 sm:space-x-8">
                    <div className={`flex items-center space-x-2 ${sample.receivedAt ? 'text-green-600' : 'text-gray-400'}`}>
                      <div className={`w-3 h-3 rounded-full ${sample.receivedAt ? 'bg-green-600' : 'bg-gray-300'}`}></div>
                      <span className="text-sm">Received</span>
                    </div>
                    <div className={`flex items-center space-x-2 ${sample.processedAt ? 'text-green-600' : sample.status === 'processing' ? 'text-yellow-600' : 'text-gray-400'}`}>
                      <div className={`w-3 h-3 rounded-full ${sample.processedAt ? 'bg-green-600' : sample.status === 'processing' ? 'bg-yellow-600' : 'bg-gray-300'}`}></div>
                      <span className="text-sm">Processing</span>
                    </div>
                    <div className={`flex items-center space-x-2 ${sample.completedAt ? 'text-green-600' : 'text-gray-400'}`}>
                      <div className={`w-3 h-3 rounded-full ${sample.completedAt ? 'bg-green-600' : 'bg-gray-300'}`}></div>
                      <span className="text-sm">Completed</span>
                    </div>
                  </div>
                  
                  {sample.status === 'processing' && (
                    <div className="text-sm text-gray-600">
                      Est. completion: {new Date(sample.receivedAt.getTime() + sample.testType.duration * 60000).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      { Sample Details Modal }
      {selectedSample && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Sample Details - {selectedSample.id}</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedSample(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium">Patient Information</h4>
                  <p>Name: {selectedSample.patientName}</p>
                  <p>ID: {selectedSample.patientId}</p>
                </div>
                <div>
                  <h4 className="font-medium">Test Information</h4>
                  <p>Test: {selectedSample.testType.name}</p>
                  <p>Category: {selectedSample.testType.category}</p>
                  <p>Duration: {selectedSample.testType.duration} minutes</p>
                  <p>Price: PKR {selectedSample.testType.price.toFixed(2)}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium">Status Information</h4>
                <p>Current Status: {selectedSample.status}</p>
                <p>Priority: {selectedSample.priority}</p>
                <p>Received: {selectedSample.receivedAt.toLocaleString()}</p>
                {selectedSample.processedAt && (
                  <p>Processed: {selectedSample.processedAt.toLocaleString()}</p>
                )}
                {selectedSample.completedAt && (
                  <p>Completed: {selectedSample.completedAt.toLocaleString()}</p>
                )}
                <p>Last Updated: {selectedSample.updatedAt.toLocaleString()}</p>
              </div>

              {selectedSample.notes && (
                <div>
                  <h4 className="font-medium">Notes</h4>
                  <p>{selectedSample.notes}</p>
                </div>
              )}

              {selectedSample.results && selectedSample.results.length > 0 && (
                <div>
                  <h4 className="font-medium">Test Results</h4>
                  <div className="space-y-2">
                    {selectedSample.results.map((result, index) => (
                      <div key={index} className="p-2 bg-gray-50 rounded">
                        <p>Parameter: {result.parameterId}</p>
                        <p>Value: {result.value}</p>
                        {result.comment && <p>Comment: {result.comment}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {filteredSamples.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No samples found matching your criteria</p>
          <p className="text-sm">Try adjusting your search or filter settings</p>
        </div>
      )}
    </div>
  );
};

export default SampleTracking;
*/

//export { default } from "./SampleTrackingClean";

