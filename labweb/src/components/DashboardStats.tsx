
import React, { useState, useEffect } from 'react';
import { Users, FileText, DollarSign, Calendar, TestTube, Clock, AlertTriangle, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '@/lib/api';

interface Token {
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

const DashboardStats = () => {
  const [stats, setStats] = useState({
    todayPatients: 0,
    tokensGenerated: 0,
    todayRevenue: 0,
    appointments: 0
  });
  
  // Lab-specific statistics, derived from the same local samples used by
  // SamplesPage / Barcodes so the whole system stays in sync.
  const [labStats, setLabStats] = useState({
    totalSamplesToday: 0,
    inProcessSamples: 0,
    completedReports: 0,
    criticalAlerts: 0,
    urgentTests: 0,
  });
  
  // Chart data is also derived from backend samples instead of hardcoded demo data.
  const [workflowData, setWorkflowData] = useState<any[]>([]);

  // Derive lab statistics and chart data from backend samples so dashboard follows the
  // same flows as SamplesPage / Barcodes, but is database-driven.
  const refreshLabFromSamples = async () => {
    let samples: any[] = [];
    try {
      const token = localStorage.getItem('token');
      const { data } = await api.get('/labtech/samples', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      samples = Array.isArray(data) ? data : [];
    } catch {
      samples = [];
    }
    const now = new Date();
    const todayKeyUtc = now.toISOString().slice(0, 10); // YYYY-MM-DD in UTC
    const isTodayCreated = (dt: any) => {
      const d = dt ? new Date(dt) : null;
      if (!d || isNaN(d.getTime())) return false;
      const key = d.toISOString().slice(0, 10);
      return key === todayKeyUtc;
    };

    // "Total Samples Today" should count samples intake today (createdAt date)
    const samplesToday = samples.filter(s => isTodayCreated(s.createdAt));

    const totalSamplesToday = samplesToday.length;
    const inProcessSamples = samplesToday.filter(s => {
      const st = String(s.status || '').toLowerCase();
      return st === 'in process' || st === 'processing' || st === 'received';
    }).length;
    const completedReports = samplesToday.filter(s => String(s.status || '').toLowerCase().includes('completed')).length;
    const criticalAlerts = samplesToday.filter(s => {
      if (Array.isArray(s.results)) {
        return s.results.some((r: any) => r?.isCritical);
      }
      return false;
    }).length;
    const urgentTests = samplesToday.filter(s => {
      const pr = String(s.priority || '').toLowerCase();
      const urgentByPriority = pr === 'urgent' || pr === 'high';
      const urgentByCritical = Array.isArray(s.results) && s.results.some((r: any) => r?.isCritical);
      return urgentByPriority || urgentByCritical;
    }).length;

    setLabStats({
      totalSamplesToday,
      inProcessSamples,
      completedReports,
      criticalAlerts,
      urgentTests,
    });

    // Simple workflow data: group today's samples by hour
    const workflowMap: Record<string, number> = {};
    samplesToday.forEach(s => {
      const d = s.collectionTime ? new Date(s.collectionTime) : (s.createdAt ? new Date(s.createdAt) : null);
      if (!d || isNaN(d.getTime())) return;
      const label = `${d.getHours().toString().padStart(2, '0')}:00`;
      workflowMap[label] = (workflowMap[label] || 0) + 1;
    });
    const workflowArr = Object.keys(workflowMap)
      .sort()
      .map(k => ({ time: k, samples: workflowMap[k] }));
    setWorkflowData(workflowArr);

    // Derive patient & revenue stats purely from backend samples
    const todayPatients = samplesToday.length;
    const todayRevenue = samplesToday.reduce((sum: number, s: any) => {
      const amount = typeof s.totalAmount === 'number' ? s.totalAmount : 0;
      return sum + amount;
    }, 0);
    const totalTokensGeneratedToday = todayPatients;
    const appointments = todayPatients;

    setStats({
      todayPatients,
      tokensGenerated: totalTokensGeneratedToday,
      todayRevenue,
      appointments,
    });

  };

  // Initial load and refresh when samples change elsewhere in the app
  useEffect(() => {
    refreshLabFromSamples();
    const handler = () => { refreshLabFromSamples(); };
    window.addEventListener('sampleSubmitted', handler);
    window.addEventListener('samplesChanged', handler);
    return () => {
      window.removeEventListener('sampleSubmitted', handler);
      window.removeEventListener('samplesChanged', handler);
    };
  }, []);

  const statsData = [
    {
      title: 'Today\'s Patients',
      value: stats.todayPatients.toString(),
      change: '+0%',
      icon: Users,
      card: 'bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200',
      titleClass: 'text-blue-700',
      valueClass: 'text-blue-900',
      iconWrap: 'bg-blue-100 text-blue-700'
    },
    {
      title: 'Today\'s Revenue',
      value: `Rs. ${stats.todayRevenue.toLocaleString()}`,
      change: '+0%',
      icon: DollarSign,
      card: 'bg-gradient-to-br from-purple-50 to-violet-100 border border-violet-200',
      titleClass: 'text-violet-700',
      valueClass: 'text-violet-900',
      iconWrap: 'bg-violet-100 text-violet-700'
    },
    {
      title: 'Appointments',
      value: stats.appointments.toString(),
      change: '+0%',
      icon: Calendar,
      card: 'bg-gradient-to-br from-amber-50 to-orange-100 border border-orange-200',
      titleClass: 'text-orange-700',
      valueClass: 'text-orange-900',
      iconWrap: 'bg-amber-100 text-orange-700'
    },
    {
      title: 'Urgent Tests',
      value: labStats.urgentTests.toString(),
      change: '',
      icon: Activity,
      card: 'bg-gradient-to-br from-rose-50 to-red-100 border border-red-200',
      titleClass: 'text-red-700',
      valueClass: 'text-red-900',
      iconWrap: 'bg-red-100 text-red-700'
    }
  ];
  
  // Lab-specific statistics
  const labStatsData = [
    {
      title: 'Total Samples Today',
      value: labStats.totalSamplesToday.toString(),
      icon: TestTube,
      card: 'bg-blue-50 border border-blue-100 hover:shadow-md',
      titleClass: 'text-blue-700',
      valueClass: 'text-blue-900',
      iconWrap: 'bg-blue-100 text-blue-600',
      description: 'Samples collected today'
    },
    {
      title: 'In-Process Samples',
      value: labStats.inProcessSamples.toString(),
      icon: Clock,
      card: 'bg-amber-50 border border-amber-100 hover:shadow-md',
      titleClass: 'text-amber-700',
      valueClass: 'text-amber-900',
      iconWrap: 'bg-amber-100 text-amber-600',
      description: 'Currently being processed'
    },
    {
      title: 'Completed Reports',
      value: labStats.completedReports.toString(),
      icon: FileText,
      card: 'bg-emerald-50 border border-emerald-100 hover:shadow-md',
      titleClass: 'text-emerald-700',
      valueClass: 'text-emerald-900',
      iconWrap: 'bg-emerald-100 text-emerald-600',
      description: 'Reports ready for review'
    },
    {
      title: 'Critical Alerts',
      value: labStats.criticalAlerts.toString(),
      icon: AlertTriangle,
      card: 'bg-rose-50 border border-rose-100 hover:shadow-md',
      titleClass: 'text-rose-700',
      valueClass: 'text-rose-900',
      iconWrap: 'bg-rose-100 text-rose-600',
      description: 'Require immediate attention'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Patient & Revenue Statistics */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Patient & Revenue Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsData.map((stat, index) => (
            <Card key={index} className={`${stat.card} hover:shadow-xl transition-all duration-200`}> 
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={`text-sm font-medium ${stat.titleClass}`}>
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-full ${stat.iconWrap}`}>
                  <stat.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stat.valueClass}`}>{stat.value}</div>
                <p className="text-xs text-gray-600 mt-1">Real-time data</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Lab Statistics */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Laboratory Operations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {labStatsData.map((stat, index) => (
            <Card key={`lab-${index}`} className={`${stat.card} transition-all duration-200`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={`text-sm font-medium ${stat.titleClass}`}>
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.iconWrap}`}>
                  <stat.icon className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stat.valueClass}`}>{stat.value}</div>
                <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Charts Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Analytics & Performance</h2>
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          {/* Sample Workflow Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                Sample Workflow
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={workflowData.length > 0 ? workflowData : [
                    { time: '08:00', samples: 0 },
                    { time: '10:00', samples: 1 },
                    { time: '12:00', samples: 0 },
                    { time: '14:00', samples: 1 },
                    { time: '16:00', samples: 0 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="time" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#666' }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#666' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="samples" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: '#3b82f6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

    </div>
  );
};

export default DashboardStats;
