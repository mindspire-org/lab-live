import React, { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, Download, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AppointmentHistoryRecord {
  id: string;
  patientName: string;
  patientId: string;
  contact: string;
  service: string;
  datetime: string; // display string
  date: string; // YYYY-MM-DD for filtering
  status: "Completed" | "Cancelled" | "No-Show";
}

const MOCK_APPOINTMENTS: AppointmentHistoryRecord[] = [
  {
    id: "1",
    patientName: "John Doe",
    patientId: "P-1001",
    contact: "john.doe@example.com",
    service: "Complete Blood Count (CBC)",
    datetime: "Oct 26, 2023, 10:15 AM",
    date: "2023-10-26",
    status: "Completed",
  },
  {
    id: "2",
    patientName: "Jane Smith",
    patientId: "P-1002",
    contact: "(555) 123-1002",
    service: "Lipid Panel",
    datetime: "Oct 25, 2023, 09:00 AM",
    date: "2023-10-25",
    status: "Completed",
  },
  {
    id: "3",
    patientName: "Robert Brown",
    patientId: "P-1003",
    contact: "robert.brown@example.com",
    service: "Thyroid Function Test",
    datetime: "Oct 24, 2023, 11:30 AM",
    date: "2023-10-24",
    status: "Cancelled",
  },
  {
    id: "4",
    patientName: "Emily White",
    patientId: "P-1004",
    contact: "(555) 123-1004",
    service: "Urinalysis",
    datetime: "Oct 23, 2023, 02:00 PM",
    date: "2023-10-23",
    status: "Completed",
  },
  {
    id: "5",
    patientName: "Michael Green",
    patientId: "P-1005",
    contact: "michael.green@example.com",
    service: "Glucose Tolerance Test",
    datetime: "Oct 22, 2023, 08:45 AM",
    date: "2023-10-22",
    status: "Completed",
  },
  {
    id: "6",
    patientName: "Sophia Lee",
    patientId: "P-1006",
    contact: "sophia.lee@example.com",
    service: "Kidney Function Test",
    datetime: "Oct 21, 2023, 11:00 AM",
    date: "2023-10-21",
    status: "Cancelled",
  },
  {
    id: "7",
    patientName: "Arjun Patel",
    patientId: "P-1007",
    contact: "(555) 123-1007",
    service: "HbA1c",
    datetime: "Oct 20, 2023, 09:30 AM",
    date: "2023-10-20",
    status: "Completed",
  },
  {
    id: "8",
    patientName: "Emma Wilson",
    patientId: "P-1008",
    contact: "emma.wilson@example.com",
    service: "Vitamin D",
    datetime: "Oct 19, 2023, 10:00 AM",
    date: "2023-10-19",
    status: "Completed",
  },
  {
    id: "9",
    patientName: "Carlos Martinez",
    patientId: "P-1009",
    contact: "c.martinez@example.com",
    service: "Lipid Panel",
    datetime: "Oct 18, 2023, 02:15 PM",
    date: "2023-10-18",
    status: "Cancelled",
  },
  {
    id: "10",
    patientName: "Hana Suzuki",
    patientId: "P-1010",
    contact: "hana.suzuki@example.com",
    service: "Complete Blood Count",
    datetime: "Oct 17, 2023, 08:45 AM",
    date: "2023-10-17",
    status: "Completed",
  },
  {
    id: "11",
    patientName: "David Johnson",
    patientId: "P-1011",
    contact: "d.johnson@example.com",
    service: "Thyroid Profile",
    datetime: "Oct 16, 2023, 09:15 AM",
    date: "2023-10-16",
    status: "Completed",
  },
  {
    id: "12",
    patientName: "Li Wei",
    patientId: "P-1012",
    contact: "(555) 123-1012",
    service: "Urinalysis",
    datetime: "Oct 15, 2023, 02:30 PM",
    date: "2023-10-15",
    status: "Completed",
  },
  {
    id: "13",
    patientName: "Fatima Ahmed",
    patientId: "P-1013",
    contact: "fatima.ahmed@example.com",
    service: "Glucose Fasting",
    datetime: "Oct 14, 2023, 08:30 AM",
    date: "2023-10-14",
    status: "Cancelled",
  },
  {
    id: "14",
    patientName: "Omar Khan",
    patientId: "P-1014",
    contact: "omar.khan@example.com",
    service: "Liver Function Test",
    datetime: "Oct 13, 2023, 11:15 AM",
    date: "2023-10-13",
    status: "Completed",
  },
  {
    id: "15",
    patientName: "Sara Ali",
    patientId: "P-1015",
    contact: "s.ali@example.com",
    service: "CRP",
    datetime: "Oct 12, 2023, 10:05 AM",
    date: "2023-10-12",
    status: "Completed",
  },
  {
    id: "16",
    patientName: "Natalie Green",
    patientId: "P-1016",
    contact: "n.green@example.com",
    service: "ESR",
    datetime: "Oct 11, 2023, 09:10 AM",
    date: "2023-10-11",
    status: "Completed",
  },
  {
    id: "17",
    patientName: "Jason Miller",
    patientId: "P-1017",
    contact: "j.miller@example.com",
    service: "Renal Profile",
    datetime: "Oct 10, 2023, 10:20 AM",
    date: "2023-10-10",
    status: "Cancelled",
  },
  {
    id: "18",
    patientName: "Priya Singh",
    patientId: "P-1018",
    contact: "(555) 777-2233",
    service: "Kidney Function Test",
    datetime: "Oct 09, 2023, 11:30 AM",
    date: "2023-10-09",
    status: "Completed",
  },
  {
    id: "19",
    patientName: "Thomas Anderson",
    patientId: "P-1019",
    contact: "t.anderson@example.com",
    service: "Renal Profile",
    datetime: "Oct 08, 2023, 09:20 AM",
    date: "2023-10-08",
    status: "Completed",
  },
  {
    id: "20",
    patientName: "Laura Chen",
    patientId: "P-1020",
    contact: "laura.chen@example.com",
    service: "Lipid Panel",
    datetime: "Oct 07, 2023, 10:15 AM",
    date: "2023-10-07",
    status: "Cancelled",
  },
  {
    id: "21",
    patientName: "Ahmed Raza",
    patientId: "P-1021",
    contact: "ahmed.raza@example.com",
    service: "Blood Sugar Fasting",
    datetime: "Oct 06, 2023, 09:30 AM",
    date: "2023-10-06",
    status: "Completed",
  },
  {
    id: "22",
    patientName: "Olivia Martin",
    patientId: "P-1022",
    contact: "(555) 333-9900",
    service: "Thyroid Function Test",
    datetime: "Oct 05, 2023, 08:50 AM",
    date: "2023-10-05",
    status: "Completed",
  },
  {
    id: "23",
    patientName: "Yusuf Ali",
    patientId: "P-1023",
    contact: "y.ali@example.com",
    service: "Urinalysis",
    datetime: "Oct 04, 2023, 09:00 AM",
    date: "2023-10-04",
    status: "Completed",
  },
  {
    id: "24",
    patientName: "Hassan Khan",
    patientId: "P-1024",
    contact: "h.khan@example.com",
    service: "Complete Blood Count",
    datetime: "Oct 03, 2023, 10:30 AM",
    date: "2023-10-03",
    status: "Completed",
  },
  {
    id: "25",
    patientName: "Elena Rossi",
    patientId: "P-1025",
    contact: "elena.rossi@example.com",
    service: "Glucose Tolerance Test",
    datetime: "Oct 02, 2023, 11:00 AM",
    date: "2023-10-02",
    status: "Cancelled",
  },
];

const getStatusBadgeClasses = (status: AppointmentHistoryRecord["status"]) => {
  switch (status) {
    case "Completed":
      return "bg-emerald-500 text-white border-transparent";
    case "Cancelled":
      return "bg-red-500 text-white border-transparent";
    case "No-Show":
    default:
      return "bg-amber-500 text-white border-transparent";
  }
};

const AppointmentsHistory: React.FC = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const fromInputRef = useRef<HTMLInputElement | null>(null);
  const toInputRef = useRef<HTMLInputElement | null>(null);

  const [selected, setSelected] = useState<AppointmentHistoryRecord | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const services = useMemo(
    () => Array.from(new Set(MOCK_APPOINTMENTS.map((a) => a.service))),
    []
  );

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();

    return MOCK_APPOINTMENTS.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (serviceFilter !== "all" && a.service !== serviceFilter) return false;

      if (dateFrom && a.date < dateFrom) return false;
      if (dateTo && a.date > dateTo) return false;

      if (term) {
        const haystack = `${a.patientName} ${a.patientId} ${a.contact} ${a.service}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      return true;
    });
  }, [search, statusFilter, serviceFilter, dateFrom, dateTo]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pageItems = filtered.slice(startIndex, endIndex);

  const handleExport = () => {
    if (filtered.length === 0) return;
    const headers = [
      "Patient ID",
      "Patient Name",
      "Contact Info",
      "Service/Test",
      "Date",
      "Date & Time",
      "Status",
    ];

    const rows = filtered.map((a) => [
      a.patientId,
      a.patientName,
      a.contact,
      a.service,
      a.date,
      a.datetime,
      a.status,
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "appointments-history.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments History</h1>
          <p className="text-sm text-gray-600">
            Review past appointments with quick filters.
          </p>
        </div>
        <Button className="bg-blue-800 hover:bg-blue-700 text-white rounded-full px-5" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black h-4 w-4" />
                <Input
                  placeholder="Search by Patient Name or ID..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10 rounded-full bg-gray-50 border border-gray-200 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <div className="flex flex-1 flex-col md:flex-row gap-2 md:items-center">
                <div className="flex gap-2 w-full md:w-auto">
                  <div className="space-y-1 w-full md:w-40">
                    <span className="block text-[11px] font-medium text-gray-500">From</span>
                    <div className="relative">
                      <button
                        type="button"
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-black h-4 w-4 flex items-center justify-center"
                        onClick={() => {
                          const el = fromInputRef.current;
                          if (!el) return;
                          // try showPicker if supported, otherwise focus
                          if (el.showPicker) el.showPicker(); else el.focus();
                        }}
                      >
                        <Calendar className="h-4 w-4" />
                      </button>
                      <Input
                        type="date"
                        ref={fromInputRef}
                        value={dateFrom}
                        onChange={(e) => {
                          setDateFrom(e.target.value);
                          setPage(1);
                        }}
                        className="pl-10 rounded-full bg-gray-50 border border-gray-200 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1 w-full md:w-40">
                    <span className="block text-[11px] font-medium text-gray-500">To</span>
                    <div className="relative">
                      <button
                        type="button"
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-black h-4 w-4 flex items-center justify-center"
                        onClick={() => {
                          const el = toInputRef.current;
                          if (!el) return;
                          if (el.showPicker) el.showPicker(); else el.focus();
                        }}
                      >
                        <Calendar className="h-4 w-4" />
                      </button>
                      <Input
                        type="date"
                        ref={toInputRef}
                        value={dateTo}
                        onChange={(e) => {
                          setDateTo(e.target.value);
                          setPage(1);
                        }}
                        className="pl-10 rounded-full bg-gray-50 border border-gray-200 text-sm"
                      />
                    </div>
                  </div>
                </div>
                <Select
                  value={serviceFilter}
                  onValueChange={(val) => {
                    setServiceFilter(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="rounded-full bg-gray-50 border border-gray-200 text-sm w-full md:w-44">
                    <SelectValue placeholder="Service/Test" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    {services.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={statusFilter}
                  onValueChange={(val) => {
                    setStatusFilter(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="rounded-full bg-gray-50 border border-gray-200 text-sm w-full md:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="border border-gray-200 rounded-2xl overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Service/Test</TableHead>
                  <TableHead>Date &amp; Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-sm text-gray-700 font-medium">{a.patientId}</TableCell>
                    <TableCell>
                      <div className="font-medium text-gray-900">{a.patientName}</div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-700">{a.contact}</TableCell>
                    <TableCell className="text-sm text-gray-700">{a.service}</TableCell>
                    <TableCell className="text-sm text-gray-700">{a.datetime}</TableCell>
                    <TableCell>
                      <Badge
                        className={`text-xs px-2 py-0.5 rounded-full border ${getStatusBadgeClasses(a.status)}`}
                      >
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-gray-400 space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-black hover:text-gray-900"
                        onClick={() => {
                          setSelected(a);
                          setIsDetailsOpen(true);
                        }}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
            <span>
              Showing {totalItems === 0 ? 0 : startIndex + 1}-
              {Math.min(endIndex, totalItems)} of {totalItems} results
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-xs rounded-full"
                disabled={currentPage === 1}
                onClick={() => currentPage > 1 && setPage(currentPage - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-xs rounded-full"
                disabled={currentPage === totalPages || totalItems === 0}
                onClick={() => currentPage < totalPages && setPage(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Patient Details</DialogTitle>
            <DialogDescription>
              Full information for this appointment.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-2 text-sm text-gray-800">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Patient ID</h3>
                  <p className="font-medium text-gray-900">{selected.patientId}</p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Patient Name</h3>
                  <p className="font-medium text-gray-900">{selected.patientName}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Contact Info</h3>
                  <p>{selected.contact}</p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Status</h3>
                  <Badge
                    className={`text-xs px-2 py-0.5 rounded-full border ${getStatusBadgeClasses(selected.status)}`}
                  >
                    {selected.status}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Service/Test</h3>
                  <p>{selected.service}</p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Date &amp; Time</h3>
                  <p>{selected.datetime}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppointmentsHistory;
