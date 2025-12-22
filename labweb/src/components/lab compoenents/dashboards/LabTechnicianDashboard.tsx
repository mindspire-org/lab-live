
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/lab compoenents/common/NotificationBell";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CurrentView } from "@/lab pages/Index";
import { 
  TestTube, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Plus,
  FileText,
  Package,
  Wrench,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  DollarSign,
  RefreshCcw
} from "lucide-react";
import { api } from "@/lib/api";
import DashboardStats from "@/components/DashboardStats";

interface LabTechnicianDashboardProps {
  onViewChange: (view: CurrentView) => void;
}

const LabTechnicianDashboard = ({ onViewChange }: LabTechnicianDashboardProps) => {

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("all");

  // Helper: parse 12-hour time string to Date on today
  const parseSampleTime = (timeStr: string) => {
    const [time, meridian] = timeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (meridian && meridian.toLowerCase() === "pm" && hours < 12) hours += 12;
    if (meridian && meridian.toLowerCase() === "am" && hours === 12) hours = 0;
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
  };

  // For demo/mock data: assume completed samples have today's date
  const now = new Date();
  const todayKeyUtc = now.toISOString().slice(0, 10); // YYYY-MM-DD in UTC
  const isToday = (dateObj: Date) => {
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return false;
    const key = dateObj.toISOString().slice(0, 10);
    return key === todayKeyUtc;
  };

  // Compute dynamic stats
  const [recentSamples, setRecentSamples] = useState<any[]>([]);
  const [kpis, setKpis] = useState<{ pending?: number; inProgress?: number; completedToday?: number; urgent?: number }>({});
  const [inventory, setInventory] = useState<any[]>([]);

  const fetchSamplesCb = useCallback(() => {
    api.get(`/labtech/samples`)
      .then(({ data }) => {
        const mapped = (data || [])
          .sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map((s:any)=>({
            id: s._id,
            patient: s.patientName || "Unknown",
            test: Array.isArray(s.tests) && s.tests.length ? (typeof s.tests[0]==='string'? s.tests[0] : (s.tests[0].name || 'Test')) : 'Test',
            status: s.status || 'received',
            priority: s.priority || 'normal',
            receivedTime: new Date(s.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
            expectedTime: s.expectedCompletion ? new Date(s.expectedCompletion).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '-',
            technician: s.processedBy || 'You',
            createdAt: new Date(s.createdAt),
            totalPrice: (Array.isArray(s.tests) ? s.tests : []).reduce((sum:number, t:any)=> sum + (typeof t==='object' && typeof t.price==='number' ? t.price : 0), 0)
          }));
        setRecentSamples(mapped);
      })
      .catch(()=>setRecentSamples([]));
  }, []);

  const fetchInventoryCb = useCallback(() => {
    const token = localStorage.getItem('token');
    fetch('/api/lab/inventory/inventory', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setInventory)
      .catch(() => setInventory([]));
  }, []);

  const fetchKpisCb = useCallback(() => {
    api.get(`/lab/dashboard/kpis`)
      .then(({ data }) => { setKpis(data); })
      .catch(() => {});
  }, []);

  // fetch samples on mount and when notified
  useEffect(() => {
    fetchSamplesCb();
    const onChange = () => fetchSamplesCb();
    window.addEventListener('sampleSubmitted', onChange);
    window.addEventListener('samplesChanged', onChange);
    return () => {
      window.removeEventListener('sampleSubmitted', onChange);
      window.removeEventListener('samplesChanged', onChange);
    };
  }, [fetchSamplesCb]);

  // Fetch inventory snapshot for stock KPIs
  useEffect(() => {
    fetchInventoryCb();
  }, [fetchInventoryCb]);

  // Fetch KPIs from server and refresh on sample events
  useEffect(() => {
    fetchKpisCb();
    const onChange = () => fetchKpisCb();
    window.addEventListener('sampleSubmitted', onChange);
    window.addEventListener('samplesChanged', onChange);
    return () => {
      window.removeEventListener('sampleSubmitted', onChange);
      window.removeEventListener('samplesChanged', onChange);
    };
  }, [fetchKpisCb]);

  useEffect(() => {
    const i1 = window.setInterval(() => fetchSamplesCb(), 30000);
    const i2 = window.setInterval(() => fetchKpisCb(), 30000);
    const i3 = window.setInterval(() => fetchInventoryCb(), 60000);
    return () => {
      window.clearInterval(i1);
      window.clearInterval(i2);
      window.clearInterval(i3);
    };
  }, [fetchSamplesCb, fetchKpisCb, fetchInventoryCb]);

  // Fallback client-side counts if KPI API is not available
  const fallbackPending = recentSamples.filter((s:any) => s.status === "pending" || s.status === "received" || s.status === "collected").length;
  const fallbackInProgress = recentSamples.filter((s:any)=> s.status === "in-progress" || s.status === "processing").length;
  const fallbackCompletedToday = recentSamples.filter((s:any)=> s.status === "completed").length;
  const fallbackUrgent = recentSamples.filter((s:any)=> s.priority === "urgent" || s?.results?.some?.((r:any)=>r?.isCritical)).length;

  // Prefer backend KPIs; fall back to client-side counts only when missing
  const pendingCount = typeof kpis.pending === 'number' ? kpis.pending : fallbackPending;
  const inProgressCount = typeof kpis.inProgress === 'number' ? kpis.inProgress : fallbackInProgress;
  const completedTodayCount = typeof kpis.completedToday === 'number' ? kpis.completedToday : fallbackCompletedToday;
  const urgentCount = typeof kpis.urgent === 'number' ? kpis.urgent : fallbackUrgent;

  // Today's tests (samples created today)
  const todayTestsCount = recentSamples.filter((s:any)=> {
    const d = s.createdAt instanceof Date ? s.createdAt : new Date(s.createdAt);
    return isToday(d);
  }).length;

  // Inventory KPIs
  const totalItems = inventory.length;
  const lowStockCount = inventory.filter((it:any)=> (it.currentStock ?? 0) <= (it.minThreshold ?? 0)).length;
  const expiringSoonCount = inventory.filter((it:any)=> {
    const d = it.expiryDate ? new Date(it.expiryDate) : null;
    if (!d) return false;
    const soon = new Date(Date.now() + 30*24*60*60*1000);
    return d <= soon;
  }).length;
  const totalValue = inventory.reduce((sum:number, it:any)=> {
    const unitPrice = (typeof it.salePricePerUnit === 'number' && !isNaN(it.salePricePerUnit)) ? it.salePricePerUnit : (it.costPerUnit || 0);
    return sum + (Number(it.currentStock || 0) * unitPrice);
  }, 0);

  const stats = [
    {
      label: "Today's Tests",
      value: todayTestsCount,
      icon: Clock,
      color: "text-orange-500",
      bgColor: "bg-orange-50",
      trend: "",
      description: "Added today"
    },
    {
      label: "In Progress",
      value: inProgressCount,
      icon: TestTube,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
      trend: "",
      description: "Currently being analyzed"
    },
    {
      label: "Completed Today",
      value: completedTodayCount,
      icon: CheckCircle,
      color: "text-green-500",
      bgColor: "bg-green-50",
      trend: "",
      description: "Successfully completed (last 24h)"
    },
    {
      label: "Urgent Tests",
      value: urgentCount,
      icon: AlertTriangle,
      color: "text-red-500",
      bgColor: "bg-red-50",
      trend: "",
      description: "Requires immediate attention"
    },
  ];

  

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "in-progress": return "bg-blue-100 text-blue-800";
      case "pending": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-500 text-white";
      case "high": return "bg-orange-500 text-white";
      case "normal": return "bg-gray-500 text-white";
      default: return "bg-gray-400 text-white";
    }
  };

  const filteredSamples = recentSamples.filter(sample => {
    const matchesSearch = sample.patient.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sample.test.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sample.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = selectedPriority === "all" || sample.priority === selectedPriority;
    return matchesSearch && matchesPriority;
  });

  return (
    <div className="space-y-6 w-full">
      <div className="w-full">
        <div className="bg-white rounded-2xl shadow-xl p-4 md:p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Lab Technician Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">Manage samples, tests, and laboratory operations</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => { fetchSamplesCb(); fetchKpisCb(); fetchInventoryCb(); }}
              >
                <RefreshCcw className="w-4 h-4" />
                Refresh
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => onViewChange("finance")}
              >
                <DollarSign className="w-4 h-4" />
                Finance
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => onViewChange("ledger")}
              >
                <FileText className="w-4 h-4" />
                Ledger
              </Button>
              <Button
                className="flex items-center gap-2 bg-blue-800 hover:from-blue-900 hover:to-blue-400"
                onClick={() => onViewChange("sample-intake")}
              >
                <Plus className="w-4 h-4" />
                New Sample
              </Button>
            </div>
          </div>

          {/* Enhanced Medical Dashboard */}
          <DashboardStats />

          {/* Bottom Section: 7-day test revenue chart */}
          <div className="grid grid-cols-1 gap-6">
            <Card>
          <CardHeader className="pb-2">
            <CardTitle>7 days test revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              // build last 7 days labels
              const days: { date: Date; label: string }[] = [];
              const today = new Date();
              for (let i = 6; i >= 0; i--) {
                const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
                days.push({ date: d, label: `${d.getMonth()+1}/${d.getDate()}` });
              }
              // count samples per day
              const counts = days.map(({date}) => (
                recentSamples.filter((s:any) => {
                  const d = s.createdAt instanceof Date ? s.createdAt : new Date(s.createdAt);
                  return d.getFullYear()===date.getFullYear() && d.getMonth()===date.getMonth() && d.getDate()===date.getDate();
                }).length
              ));
              // sum amount per day (real-time)
              const amounts = days.map(({date}) => (
                recentSamples.filter((s:any) => {
                  const d = s.createdAt instanceof Date ? s.createdAt : new Date(s.createdAt);
                  return d.getFullYear()===date.getFullYear() && d.getMonth()===date.getMonth() && d.getDate()===date.getDate();
                }).reduce((sum:number, s:any)=> sum + (Number(s.totalPrice)||0), 0)
              ));
              const max = Math.max(1, ...counts);
              // chart dimensions
              const W = 620, H = 180, P = 24; // width, height, padding
              const step = (W - P*2) / (counts.length - 1);
              const toY = (v:number) => P + (H - P*2) * (1 - v / max);
              const toX = (i:number) => P + step * i;
              const points = counts.map((v,i)=>`${toX(i)},${toY(v)}`).join(' ');
              const areaPath = `M ${toX(0)} ${toY(counts[0])} ` +
                counts.map((v,i)=>`L ${toX(i)} ${toY(v)}`).join(' ') +
                ` L ${toX(counts.length-1)} ${H-P} L ${toX(0)} ${H-P} Z`;
              const [hoverIdx, setHoverIdx] = ((): [number|null,(i:number|null)=>void] => {
                // local state shim using closure with React.useState is not possible inside IIFE; instead, hoist to component? We'll use a tiny hack via window scoped symbol
                return [null, ()=>{}] as any;
              })();
              return (
                <div className="w-full overflow-x-auto">
                  <svg width={W} height={H} className="max-w-full">
                    {/* gradient background area */}
                    <defs>
                      <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#34d399" stopOpacity="0.05" />
                      </linearGradient>
                    </defs>
                    {/* axes baseline */}
                    <line x1={P} y1={H-P} x2={W-P} y2={H-P} stroke="#e5e7eb" />
                    {/* area */}
                    <path d={areaPath} fill="url(#gradA)" />
                    {/* line */}
                    <polyline points={points} fill="none" stroke="#10b981" strokeWidth={2} />
                    {/* dots */}
                    {counts.map((v,i)=> (
                      <g key={i}>
                        <circle cx={toX(i)} cy={toY(v)} r={3} fill="#10b981" stroke="#fff" strokeWidth={1}
                          onMouseEnter={(e)=>{
                            const tip = document.getElementById('samples-tip');
                            if (tip) {
                              tip.setAttribute('data-x', String(toX(i)));
                              tip.setAttribute('data-y', String(toY(v)));
                              const text = `PKR ${amounts[i].toFixed(2)}`;
                              tip.setAttribute('data-text', text);
                              const inner = tip.querySelector('div');
                              if (inner) inner.textContent = text;
                              tip.style.display = 'block';
                              tip.style.left = `${(e.currentTarget as any).ownerSVGElement.getBoundingClientRect().left + toX(i)}px`;
                              tip.style.top = `${(e.currentTarget as any).ownerSVGElement.getBoundingClientRect().top + toY(v) - 28}px`;
                            }
                          }}
                          onMouseLeave={()=>{
                            const tip = document.getElementById('samples-tip');
                            if (tip) tip.style.display = 'none';
                          }}
                        />
                        {/* labels below x-axis */}
                        <text x={toX(i)} y={H-6} textAnchor="middle" fontSize="10" fill="#6b7280">{days[i].label}</text>
                      </g>
                    ))}
                  </svg>
                  {/* simple absolute tooltip */}
                  <div id="samples-tip" style={{position:'fixed', display:'none', transform:'translate(-50%, -100%)'}} className="pointer-events-none">
                    <div className="px-2 py-1 rounded bg-green-600 text-white text-xs shadow">PKR 0.00</div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">7-day samples trend • Higher point = more tests that day</div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabTechnicianDashboard;
