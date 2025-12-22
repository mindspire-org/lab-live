//export { default } from "./SampleIntakeClean";
import { useState, useEffect, useRef } from "react";
import { printSampleSlip } from "../../../utils/printSample";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { TestType } from "@/lab types/sample";
import TestSelect from "@/components/lab compoenents/ui/TestSelect";
import { Check, Search, Filter, Eye, Edit, ExternalLink, X, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lab lib/api";

function getModulePermission(moduleName: string): { view: boolean; edit: boolean; delete: boolean } {
  try {
    const roleRaw = typeof window !== 'undefined' ? window.localStorage.getItem('role') : null;
    const role = String(roleRaw || '').trim().toLowerCase();
    const isAdmin = new Set(['admin', 'administrator', 'lab supervisor', 'lab-supervisor', 'supervisor']).has(role);
    if (isAdmin) {
      return { view: true, edit: true, delete: true };
    }
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem('permissions') : null;
    const parsed = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) {
      return { view: true, edit: true, delete: true };
    }
    const wanted = String(moduleName || '').trim().toLowerCase();
    const found = parsed.find((p: any) => String(p?.name || '').trim().toLowerCase() === wanted);
    if (!found) {
      return { view: true, edit: false, delete: false };
    }
    return { view: !!found.view, edit: !!found.edit, delete: !!found.delete };
  } catch {
    return { view: true, edit: true, delete: true };
  }
}

interface SampleIntakeProps {
  onNavigateBack?: () => void;
}

const SampleIntakeClean = ({ onNavigateBack }: SampleIntakeProps) => {
  const { toast } = useToast();
  const modulePerm = getModulePermission('Sample Intake');
  const [availableTests, setAvailableTests] = useState<TestType[]>([]);
  const [selectedTests, setSelectedTests] = useState<TestType[]>([]);
  const [testPriority, setTestPriority] = useState<'normal' | 'urgent'>('normal');
  const [pendingPrefill, setPendingPrefill] = useState<{ name?: string; phone?: string; testName?: string } | null>(null);
  
  // Sample Management state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  
  // Add Sample Modal state
  const [showAddSampleModal, setShowAddSampleModal] = useState(false);
  const [newSample, setNewSample] = useState({
    patientName: "",
    test: "",
    assignedAnalyzer: "",
  });
  const [isSubmittingNewSample, setIsSubmittingNewSample] = useState(false);

  // Action Modals state
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSample, setSelectedSample] = useState<any>(null);
  const [editingSample, setEditingSample] = useState({
    patientName: "",
    test: "",
    status: ""
  });
  const [isUpdatingSample, setIsUpdatingSample] = useState(false);
  
  // Sample data (backend-driven)
  const [samples, setSamples] = useState<any[]>([]);

  // (Main patient form uses patientInfo state further below)
  
  // Pricing settings (tax)
  const [taxRate, setTaxRate] = useState<number>(0);
  const [discountRate, setDiscountRate] = useState<number>(0);
  const [urgentUpliftRate, setUrgentUpliftRate] = useState<number>(0);
  useEffect(() => {
    api
      .get("/settings")
      .then((res) => {
        const s = res.data || {};
        const tr = parseFloat(String(s?.pricing?.taxRate ?? ""));
        const dr = parseFloat(String(s?.pricing?.bulkDiscountRate ?? ""));
        const ur = parseFloat(String(s?.pricing?.urgentTestUpliftRate ?? ""));
        setTaxRate(Number.isFinite(tr) ? tr : 0);
        setDiscountRate(Number.isFinite(dr) ? dr : 0);
        setUrgentUpliftRate(Number.isFinite(ur) ? ur : 0);
      })
      .catch(() => {
        setTaxRate(0);
        setDiscountRate(0);
        setUrgentUpliftRate(0);
      });
  }, []);
  const computeIncl = (price: number) => {
    const rate = Number(taxRate) || 0;
    const amount = (Number(price) || 0) * (1 + rate / 100);
    return { rate, amount } as { rate: number; amount: number };
  };

  // Load samples from backend
  const loadSamplesFromBackend = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/labtech/samples", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const arr = Array.isArray(res.data) ? res.data : [];
      const mapped = arr.map((s: any) => ({
        barcode: s.sampleNumber || s.barcode || "",
        patientName: s.patientName || "",
        test:
          Array.isArray(s.tests) && s.tests.length
            ? s.tests.map((t: any) => t?.name).filter(Boolean).join(", ")
            : s.test || "",
        status: s.status || "received",
        assignedAnalyzer: s.assignedAnalyzer || "",
        collectionTime: s.createdAt
          ? new Date(s.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "",
      }));
      setSamples(mapped);
    } catch (err) {
      console.error("Failed to load samples from backend", err);
      // keep existing samples state on error
    }
  };

  useEffect(() => {
    loadSamplesFromBackend();
  }, []);

  const lookupAndFillPatient = async (opts: { cnic?: string; phone?: string }) => {
    try {
      const params: any = {};
      if (opts.cnic) params.cnic = opts.cnic;
      if (!params.cnic && opts.phone) params.phone = opts.phone;
      if (!params.cnic && !params.phone) return;

      const token = typeof window !== "undefined" ? window.localStorage.getItem("token") : null;
      const { data } = await api.get("/lab/patients/lookup", {
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!data?.success || !data?.patient) return;

      const p = data.patient;
      setPatientInfo((prev) => ({
        ...prev,
        name: p.name || prev.name,
        phone: p.phone || prev.phone,
        cnic: p.cnic || prev.cnic,
        age: p.age ?? prev.age,
        gender: p.gender || prev.gender,
        address: p.address || prev.address,
        guardianRelation: p.guardianRelation || prev.guardianRelation,
        guardianName: p.guardianName || prev.guardianName,
      }));
    } catch (e) {
      console.error("Failed to lookup patient", e);
    }
  };

  // Helper functions for sample management
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { color: "bg-green-100 text-green-800", text: "completed" },
      "in process": { color: "bg-blue-100 text-blue-800", text: "in process" },
      pending: { color: "bg-yellow-100 text-yellow-800", text: "pending" },
      delayed: { color: "bg-red-100 text-red-800", text: "delayed" }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  // Enhanced search functionality
  const performSearch = (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      setShowSearchSuggestions(false);
      return;
    }

    const searchLower = term.toLowerCase();
    const suggestions = new Set<string>();
    
    samples.forEach(sample => {
      // Add matching barcodes
      if (sample.barcode.toLowerCase().includes(searchLower)) {
        suggestions.add(sample.barcode);
      }
      // Add matching patient names
      if (sample.patientName.toLowerCase().includes(searchLower)) {
        suggestions.add(sample.patientName);
      }
      // Add matching tests
      if (sample.test.toLowerCase().includes(searchLower)) {
        suggestions.add(sample.test);
      }
      // analyzer removed
    });

    setSearchResults(Array.from(suggestions).slice(0, 5));
    setShowSearchSuggestions(suggestions.size > 0 && term.length > 0);
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Enhanced filtering with better matching
  const filteredSamples = samples.filter(sample => {
    if (searchTerm === "") {
      const matchesStatus = statusFilter === "All Status" || 
        sample.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesStatus;
    }

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      sample.barcode.toLowerCase().includes(searchLower) ||
      sample.patientName.toLowerCase().includes(searchLower) ||
      sample.test.toLowerCase().includes(searchLower) ||
      sample.status.toLowerCase().includes(searchLower) ||
      // Partial matching for better search results
      sample.patientName.toLowerCase().split(' ').some(word => word.startsWith(searchLower)) ||
      sample.test.toLowerCase().split(' ').some(word => word.startsWith(searchLower));
    
    const matchesStatus = statusFilter === "All Status" || 
      sample.status.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  // Handle search suggestion selection
  const handleSuggestionClick = (suggestion: string) => {
    setSearchTerm(suggestion);
    setShowSearchSuggestions(false);
  };

  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.length === 0) {
      setShowSearchSuggestions(false);
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm("");
    setSearchResults([]);
    setShowSearchSuggestions(false);
  };

  // Add Sample Modal functions
  const openAddSampleModal = () => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: "You only have view permission for Token Generation.", variant: 'destructive' });
      return;
    }
    setShowAddSampleModal(true);
    setNewSample({
      patientName: "",
      test: "",
      assignedAnalyzer: "",
    });
  };

  const closeAddSampleModal = () => {
    setShowAddSampleModal(false);
    setNewSample({
      patientName: "",
      test: "",
      assignedAnalyzer: "",
    });
  };

  // Generate new barcode
  const generateBarcode = () => {
    const year = new Date().getFullYear();
    const nextNumber = samples.length + 1;
    return `LAB-${year}-${nextNumber.toString().padStart(3, '0')}`;
  };

  // Get current time
  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Handle new sample submission
  const handleAddSample = async () => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: "You only have view permission for Token Generation.", variant: 'destructive' });
      return;
    }
    if (!newSample.patientName || !newSample.test || !newSample.assignedAnalyzer) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsSubmittingNewSample(true);

    try {
      const sampleToAdd = {
        barcode: generateBarcode(),
        patientName: newSample.patientName,
        test: newSample.test,
        status: "pending",
        assignedAnalyzer: newSample.assignedAnalyzer,
        collectionTime: getCurrentTime()
      };

      // After local add, also refresh from backend (if created through main form)
      // For now, just close modal; main form handles real submissions.
      toast({
        title: "Success",
        description: `Sample ${sampleToAdd.barcode} added successfully`,
      });

      closeAddSampleModal();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add sample. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingNewSample(false);
    }
  };

  // Available test options
  const testOptions = [
    "Complete Blood Count",
    "Lipid Profile", 
    "Thyroid Panel",
    "HbA1c",
    "Liver Function Test",
    "Kidney Function Test",
    "Cardiac Markers",
    "Diabetes Panel",
    "Electrolyte Panel",
    "Coagulation Studies"
  ];

  // Available analyzer options
  const analyzerOptions = [
    "Mindray BC 700",
    "Sysmex XN-1000",
    "Cobas C111",
    "Maglumi 800",
    "Abbott Architect",
    "Roche Cobas"
  ];

  // Status options for editing
  const statusOptions = [
    "pending",
    "in process", 
    "completed",
    "delayed"
  ];

  // Action handlers
  const handleViewSample = (sample: any) => {
    setSelectedSample(sample);
    setShowViewModal(true);
  };

  const handleEditSample = (sample: any) => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: "You only have view permission for Token Generation.", variant: 'destructive' });
      return;
    }
    setSelectedSample(sample);
    setEditingSample({
      patientName: sample.patientName,
      test: sample.test,
      status: sample.status
    });
    setShowEditModal(true);
  };

  const handleExportSample = (sample: any) => {
    // Create PDF content
    const generatePDF = () => {
      const currentDate = new Date().toLocaleString();
      
      // Create HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Sample Report - ${sample.barcode}</title>
          <style>
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 12px;
              color: #333;
              line-height: 1.2;
              font-size: 11px;
              height: 100vh;
              overflow: hidden;
            }
            .page-container {
              height: calc(100vh - 24px);
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #2563eb;
              padding: 8px 0;
              margin-bottom: 12px;
            }
            .logo {
              font-size: 18px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 2px;
            }
            .subtitle {
              color: #666;
              font-size: 10px;
              line-height: 1.1;
            }
            .report-title {
              font-size: 16px;
              font-weight: bold;
              text-align: center;
              margin: 8px 0;
              color: #1f2937;
              text-transform: uppercase;
            }
            .content-sections {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 8px;
              margin-bottom: 12px;
              flex: 1;
            }
            .info-section {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 4px;
              padding: 8px;
              height: fit-content;
            }
            .section-title {
              font-size: 10px;
              font-weight: bold;
              color: #1e40af;
              border-bottom: 1px solid #3b82f6;
              padding-bottom: 2px;
              margin-bottom: 6px;
              text-transform: uppercase;
            }
            .info-grid {
              display: grid;
              gap: 4px;
            }
            .info-item {
              background: white;
              padding: 6px;
              border-radius: 3px;
              border-left: 2px solid #3b82f6;
            }
            .info-label {
              font-weight: bold;
              color: #374151;
              font-size: 8px;
              text-transform: uppercase;
              margin-bottom: 2px;
            }
            .info-value {
              font-size: 10px;
              color: #1f2937;
              font-weight: 500;
              line-height: 1.1;
            }
            .status-badge {
              display: inline-block;
              padding: 2px 6px;
              border-radius: 10px;
              font-size: 8px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .status-completed { background: #dcfce7; color: #166534; }
            .status-pending { background: #fef3c7; color: #92400e; }
            .status-in-process { background: #dbeafe; color: #1e40af; }
            .status-delayed { background: #fee2e2; color: #dc2626; }
            .barcode {
              font-family: 'Courier New', monospace;
              font-size: 11px;
              font-weight: bold;
              letter-spacing: 1px;
              background: #f1f5f9;
              padding: 4px;
              border-radius: 3px;
              text-align: center;
            }
            .signature-section {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin: 8px 0;
              padding: 8px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 4px;
            }
            .signature-box {
              text-align: center;
              padding: 8px;
              border: 1px dashed #94a3b8;
              border-radius: 3px;
              background: white;
            }
            .signature-line {
              border-bottom: 1px solid #374151;
              height: 20px;
              margin-bottom: 4px;
            }
            .signature-title {
              font-weight: bold;
              font-size: 9px;
              margin-bottom: 2px;
            }
            .signature-date {
              font-size: 8px;
              color: #666;
            }
            .footer {
              text-align: center;
              padding: 6px;
              border-top: 1px solid #e5e7eb;
              background: #f9fafb;
              font-size: 8px;
              line-height: 1.1;
            }
            .footer-title {
              font-weight: bold;
              margin-bottom: 2px;
            }
            .footer-info {
              color: #666;
              margin: 1px 0;
            }
            @media print {
              body { 
                margin: 0; 
                padding: 8px;
                font-size: 10px;
                height: 100vh;
              }
              .page-container {
                height: calc(100vh - 16px);
              }
              .header { padding: 6px 0; margin-bottom: 8px; }
              .report-title { margin: 6px 0; }
              .content-sections { gap: 6px; margin-bottom: 8px; }
              .info-section { padding: 6px; }
              .signature-section { margin: 6px 0; padding: 6px; }
              .signature-box { padding: 6px; }
              .footer { padding: 4px; }
            }
          </style>
        </head>
        <body>
          <div class="page-container">
            <div class="header">
              <div class="logo">MedLab LIS</div>
              <div class="subtitle">Laboratory Information System - Sample Analysis Report</div>
            </div>

            <div class="report-title">Sample Report</div>

            <div class="content-sections">
              <div class="info-section">
                <div class="section-title">Sample Information</div>
                <div class="info-grid">
                  <div class="info-item">
                    <div class="info-label">Sample Barcode</div>
                    <div class="info-value barcode">${sample.barcode}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Collection Time</div>
                    <div class="info-value">${sample.collectionTime}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Current Status</div>
                    <div class="info-value">
                      <span class="status-badge status-${sample.status.replace(' ', '-')}">${sample.status}</span>
                    </div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Export Date</div>
                    <div class="info-value">${currentDate}</div>
                  </div>
                </div>
              </div>

              <div class="info-section">
                <div class="section-title">Patient Information</div>
                <div class="info-grid">
                  <div class="info-item">
                    <div class="info-label">Patient Name</div>
                    <div class="info-value">${sample.patientName}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Test Requested</div>
                    <div class="info-value">${sample.test}</div>
                  </div>
                </div>
              </div>

              <div class="info-section">
                <div class="section-title">Laboratory Information</div>
                <div class="info-grid">
                  <div class="info-item">
                    <div class="info-label">Lab Supervisor</div>
                    <div class="info-value">Dr. John Doe</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="signature-section">
              <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-title">Lab Technician</div>
                <div class="signature-date">Date: _____________</div>
              </div>
              <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-title">Lab Supervisor</div>
                <div class="signature-date">Date: _____________</div>
              </div>
            </div>

            <div class="footer">
              <div class="footer-title">MedLab LIS - Laboratory Information System</div>
              <div class="footer-info">Generated on ${currentDate}</div>
              <div class="footer-info">This is a computer-generated report. No signature required.</div>
            </div>
          </div>
        </body>
        </html>
      `;

      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Wait for content to load then print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 500);
        };
      }
    };

    generatePDF();

    toast({
      title: "Export Successful",
      description: `Sample ${sample.barcode} report generated for printing/PDF`,
    });
  };

  // Update sample function
  const handleUpdateSample = async () => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: "You only have view permission for Token Generation.", variant: 'destructive' });
      return;
    }
    if (!editingSample.patientName || !editingSample.test) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsUpdatingSample(true);

    try {
      // Update sample in the array
      setSamples(prevSamples => 
        prevSamples.map(sample => 
          sample.barcode === selectedSample.barcode 
            ? {
                ...sample,
                patientName: editingSample.patientName,
                test: editingSample.test,
                status: editingSample.status
              }
            : sample
        )
      );

      toast({
        title: "Success",
        description: `Sample ${selectedSample.barcode} updated successfully`,
      });

      setShowEditModal(false);
      setSelectedSample(null);
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to update sample. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingSample(false);
    }
  };

  // Close modals
  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedSample(null);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedSample(null);
    setEditingSample({
      patientName: "",
      test: "",
      status: ""
    });
  };
  // Appointment fields removed per requirement
  const [patientInfo, setPatientInfo] = useState({
    name: "",
    phone: "",
    age: "",
    gender: "",
    address: "",
    guardianRelation: "",
    guardianName: "",
    referringDoctor: "",
    sampleCollectedBy: "",
    collectedSample: "",
    collectedSamples: [] as string[],
    cnic: "",
  });
  const [newCollectedSample, setNewCollectedSample] = useState<string>("");
  const [touched, setTouched] = useState<{ name: boolean; phone: boolean; age: boolean; cnic: boolean; guardianName: boolean; referringDoctor: boolean; sampleCollectedBy: boolean }>({
    name: false,
    phone: false,
    age: false,
    cnic: false,
    guardianName: false,
    referringDoctor: false,
    sampleCollectedBy: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSampleId, setSubmittedSampleId] = useState<string | null>(null);
  const [availableInventory, setAvailableInventory] = useState<any[]>([]);
  const [consumables, setConsumables] = useState<Array<{ itemId: string; name: string; quantity: number; unit?: string; currentStock?: number }>>([]);
  const [selItemId, setSelItemId] = useState<string>("");
  const [selQty, setSelQty] = useState<string>("1");
  const [selItemText, setSelItemText] = useState<string>("");
  const [suggestOpen, setSuggestOpen] = useState<boolean>(false);
  const [highlightIdx, setHighlightIdx] = useState<number>(-1);

  const normalizePhone = (raw: string) => {
    const v = String(raw || '').trim();
    if (v.startsWith('+')) {
      const digits = v.replace(/[^\d]/g, '');
      return `+${digits}`.slice(0, 13);
    }
    return v.replace(/\D/g, '').slice(0, 11);
  };

  const isValidFullName = (name: string) => {
    const v = String(name || '').trim();
    if (!v) return false;
    return !/\d/.test(v);
  };

  const isValidPhone = (phone: string) => {
    const v = String(phone || '').trim();
    if (v.startsWith('+')) {
      return /^\+923\d{9}$/.test(v);
    }
    return /^03\d{9}$/.test(v);
  };

  const parseValidAge = (ageRaw: string) => {
    const digits = String(ageRaw || '').replace(/\D/g, '');
    if (!digits) return null;
    const n = parseInt(digits, 10);
    if (!Number.isFinite(n)) return null;
    if (n < 1 || n > 120) return null;
    return n;
  };

  const nameError = touched.name && !isValidFullName(patientInfo.name)
    ? 'Full name is required and cannot contain numbers'
    : '';
  const phoneError = touched.phone
    ? !patientInfo.phone
      ? 'Phone is required'
      : !isValidPhone(patientInfo.phone)
        ? 'Phone must be 03XXXXXXXXX or +923XXXXXXXXX'
        : ''
    : '';
  const ageError = touched.age && patientInfo.age && parseValidAge(patientInfo.age) === null
    ? 'Age must be between 1 and 120'
    : '';
  const cnicError = touched.cnic && patientInfo.cnic && patientInfo.cnic.length !== 13
    ? 'CNIC must be exactly 13 digits (no dashes)'
    : '';
  const guardianNameError = touched.guardianName && patientInfo.guardianName && /\d/.test(patientInfo.guardianName)
    ? 'Guardian name cannot contain numbers'
    : '';
  const referringDoctorError = touched.referringDoctor && patientInfo.referringDoctor && /\d/.test(patientInfo.referringDoctor)
    ? 'Referring Doctor cannot contain numbers'
    : '';
  const sampleCollectedByError = touched.sampleCollectedBy && patientInfo.sampleCollectedBy && /\d/.test(patientInfo.sampleCollectedBy)
    ? 'Sample Collected By cannot contain numbers'
    : '';

  // refs for Enter navigation
  const phoneRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('intakePrefill');
      if (raw) {
        const pre = JSON.parse(raw) || {};
        setPatientInfo((prev) => ({
          ...prev,
          name: pre.name || prev.name,
          phone: pre.phone || prev.phone,
          cnic: pre.cnic || prev.cnic,
          age: pre.age ?? prev.age,
          gender: pre.gender || prev.gender,
          guardianRelation: pre.guardianRelation || prev.guardianRelation,
          guardianName: pre.guardianName || prev.guardianName,
          referringDoctor: pre.referringDoctor || prev.referringDoctor,
          sampleCollectedBy: pre.sampleCollectedBy || prev.sampleCollectedBy,
          collectedSample: pre.collectedSample || prev.collectedSample,
        }));
        setPendingPrefill(pre);
        localStorage.removeItem('intakePrefill');
      }
    } catch {}
  }, []);

  useEffect(() => {
    api
      .get("/tests")
      .then((res) => {
        const arr = res.data;
        if (Array.isArray(arr)) {
          setAvailableTests(arr as any[]);
        } else {
          setAvailableTests([]);
        }
      })
      .catch(() => {
        setAvailableTests([]);
        toast({ title: "Error", description: "Failed to load tests", variant: "destructive" });
      });
  }, []);

  useEffect(() => {
    if (pendingPrefill?.testName && availableTests.length) {
      const tn = String(pendingPrefill.testName || '').toLowerCase();
      const match = availableTests.find((t) => String(t?.name || '').toLowerCase() === tn);
      if (match) setSelectedTests([match]);
      setPendingPrefill(null);
    }
  }, [availableTests, pendingPrefill]);

  useEffect(() => {
    fetch("/api/lab/inventory/inventory", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      credentials: "include",
    })
      .then((r) => r.json())
      .then((arr) => {
        setAvailableInventory(Array.isArray(arr) ? arr : []);
      })
      .catch(() => {
        setAvailableInventory([]);
        toast({ title: "Error", description: "Failed to load inventory", variant: "destructive" });
      });
  }, []);

  const handleEnter = (_e: React.KeyboardEvent, _next: React.RefObject<HTMLInputElement>) => {
    // Enter navigation simplified; email field removed
  };

  const addConsumable = () => {
    const typed = (selItemText || "").trim().toLowerCase();
    const item = availableInventory.find((i: any) => i._id === selItemId)
      || availableInventory.find((i:any)=> (i.name||'').toString().toLowerCase() === typed)
      || availableInventory.find((i:any)=> (i.name||'').toString().toLowerCase().includes(typed));
    if (!item) {
      toast({ title: "Error", description: "Select an item", variant: "destructive" });
      return;
    }
    const qty = Math.max(1, parseInt(selQty) || 0);
    if (qty > (item.currentStock || 0)) {
      toast({ title: "Error", description: "Quantity exceeds stock", variant: "destructive" });
      return;
    }
    setConsumables((prev) => {
      const idx = prev.findIndex((c) => c.itemId === item._id);
      if (idx >= 0) {
        const next = [...prev];
        const sum = next[idx].quantity + qty;
        next[idx] = { ...next[idx], quantity: Math.min(sum, item.currentStock || sum) };
        return next;
      }
      return [...prev, { itemId: item._id, name: item.name, quantity: qty, unit: item.unit, currentStock: item.currentStock }];
    });
    setSelItemId("");
    setSelItemText("");
    setSelQty("1");
  };

  const removeConsumable = (id: string) => {
    setConsumables((prev) => prev.filter((c) => c.itemId !== id));
  };

  const getBaseTotalAmount = () => selectedTests.reduce((t, s) => t + (Number(s.price) || 0), 0);
  const getSubtotalAfterUrgent = () => {
    const base = getBaseTotalAmount();
    if (testPriority !== 'urgent') return base;
    const uplift = Number(urgentUpliftRate) || 0;
    return base * (1 + uplift / 100);
  };
  const getDiscountAmount = () => {
    const base = getSubtotalAfterUrgent();
    const dr = Number(discountRate) || 0;
    return base * (dr / 100);
  };
  const getSubtotalAfterDiscount = () => {
    const base = getSubtotalAfterUrgent();
    return base - getDiscountAmount();
  };
  const getTotalAmount = () => {
    const afterDiscount = getSubtotalAfterDiscount();
    return computeIncl(afterDiscount).amount;
  };

  const handleSubmit = async () => {
    if (!isValidFullName(patientInfo.name)) {
      toast({ title: "Error", description: "Full name is required and cannot contain numbers", variant: "destructive" });
      return;
    }
    if (String(newCollectedSample || '').trim().length > 0) {
      toast({ title: "Error", description: "Please click Add to select the sample.", variant: "destructive" });
      return;
    }
    if (!patientInfo.phone) {
      toast({ title: "Error", description: "Phone is required", variant: "destructive" });
      return;
    }
    if (!isValidPhone(patientInfo.phone)) {
      toast({
        title: "Error",
        description: "Phone must be 03XXXXXXXXX (11 digits) or +923XXXXXXXXX (13 chars including +)",
        variant: "destructive",
      });
      return;
    }
    if (patientInfo.age && parseValidAge(patientInfo.age) === null) {
      toast({ title: "Error", description: "Age must be a number between 1 and 120", variant: "destructive" });
      return;
    }
    if (patientInfo.cnic) {
      if (/\D/.test(patientInfo.cnic)) {
        toast({ title: "Error", description: "CNIC cannot contain characters (digits only)", variant: "destructive" });
        return;
      }
      if (patientInfo.cnic.length !== 13) {
        toast({ title: "Error", description: "CNIC must be exactly 13 digits (no dashes)", variant: "destructive" });
        return;
      }
    }
    if (patientInfo.guardianName && /\d/.test(patientInfo.guardianName)) {
      toast({ title: "Error", description: "Guardian name cannot contain numbers", variant: "destructive" });
      return;
    }
    if (patientInfo.referringDoctor && /\d/.test(patientInfo.referringDoctor)) {
      toast({ title: "Error", description: "Referring Doctor cannot contain numbers", variant: "destructive" });
      return;
    }
    if (patientInfo.sampleCollectedBy && /\d/.test(patientInfo.sampleCollectedBy)) {
      toast({ title: "Error", description: "Sample Collected By cannot contain numbers", variant: "destructive" });
      return;
    }
    if (selectedTests.length === 0) {
      toast({ title: "Error", description: "Select at least one test", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const collectedSamples = Array.isArray((patientInfo as any).collectedSamples)
        ? (patientInfo as any).collectedSamples
            .map((s: any) => String(s || '').trim())
            .filter((s: string) => !!s)
        : [];
      const collectedSampleText = collectedSamples.length
        ? collectedSamples.join(', ')
        : (patientInfo.collectedSample || '').trim();

      const payload = {
        patientName: patientInfo.name,
        phone: normalizePhone(patientInfo.phone),
        // email removed from payload
        age: patientInfo.age ? String(parseValidAge(patientInfo.age) ?? '') : "",
        gender: patientInfo.gender,
        address: patientInfo.address,
        guardianRelation: patientInfo.guardianRelation || undefined,
        guardianName: patientInfo.guardianName || undefined,
        referringDoctor: patientInfo.referringDoctor || undefined,
        sampleCollectedBy: patientInfo.sampleCollectedBy || undefined,
        collectedSample: collectedSampleText || undefined,
        collectedSamples: collectedSamples.length ? collectedSamples : undefined,
        cnic: patientInfo.cnic || undefined,
        tests: selectedTests.map((t: any) => (t?._id ?? t?.id)).filter(Boolean),
        consumables: consumables.map((c) => ({ item: c.itemId, quantity: c.quantity })),
        totalAmount: getTotalAmount(),
        priority: testPriority,
        status: "collected",
      };
      let created: any = null;
      try {
        const token = localStorage.getItem("token");
        try {
          const res = await api.post(
            "/labtech/samples",
            payload,
            token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
          );
          created = res.data;
        } catch (networkErr: any) {
          console.error("Error calling /labtech/samples:", networkErr?.response || networkErr);
          // If backend responded (e.g. 401/400/500), bubble up so we show a real error
          if (networkErr?.response) {
            throw networkErr;
          }
          // Only mark as network (no response) for true connectivity issues
          throw new Error("network");
        }
      } catch (err: any) {
        if (err && err.message === "network") {
          const now = new Date();
          created = {
            _id: `local-${Date.now()}`,
            sampleNumber: `LAB-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${String(Math.floor(Math.random() * 999)).padStart(3, "0")}`,
            createdAt: now.toISOString(),
          };
        } else {
          // Non-network backend errors should stop submission and be handled by outer catch
          throw err;
        }
      }
      setSubmittedSampleId(created._id);
      // Reload samples from backend (if available)
      try {
        await loadSamplesFromBackend();
      } catch {}
      // Print sample slip (best effort)
      try {
        const base = getBaseTotalAmount();
        const urgentSubtotal = getSubtotalAfterUrgent();
        const urgentExtra = Math.max(0, urgentSubtotal - base);
        const discountAmt = getDiscountAmount();
        const afterDiscount = getSubtotalAfterDiscount();
        const c = computeIncl(afterDiscount);
        const taxAmt = c.amount - afterDiscount;
        printSampleSlip({
          sampleNumber: created.sampleNumber,
          dateTime: created.createdAt,
          patientName: patientInfo.name,
          guardianRelation: patientInfo.guardianRelation,
          guardianName: patientInfo.guardianName,
          cnic: patientInfo.cnic,
          phone: patientInfo.phone,
          age: patientInfo.age,
          gender: patientInfo.gender,
          address: patientInfo.address,
          referringDoctor: patientInfo.referringDoctor,
          sampleCollectedBy: patientInfo.sampleCollectedBy,
          collectedSample: collectedSampleText,
          tests: selectedTests.map(t => ({ name: t.name, price: t.price })),
          urgentRate: testPriority === 'urgent' ? (Number(urgentUpliftRate) || 0) : 0,
          urgentAmount: testPriority === 'urgent' ? urgentExtra : 0,
          discountRate: (Number(discountRate) || 0),
          discountAmount: discountAmt,
          taxRate: (Number(taxRate) || 0),
          taxAmount: taxAmt,
          totalAmount: c.amount,
        });
      } catch {}
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedSampleId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md text-center">
          <CardContent className="p-8">
            <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-700 mb-2">Sample Submitted!</h2>
            <Button onClick={() => setSubmittedSampleId(null)}>New Sample</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Token Generation</h1>
        <p className="text-sm text-muted-foreground">Register new patient samples and manage test requests</p>
      </div>

      {/* Patient Info + Appointment (Combined) */}
      <Card className="border rounded-lg">
        <CardHeader className="pb-3">
          <CardTitle>Patient Details</CardTitle>
          <CardDescription>Enter patient demographics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Patient row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Full Name *</Label>
              <Input
                value={patientInfo.name}
                placeholder="Enter full name"
                onChange={(e) => {
                  const v = (e.target.value || '').replace(/\d/g, '');
                  setPatientInfo({ ...patientInfo, name: v });
                }}
                onBlur={() => setTouched((p) => ({ ...p, name: true }))}
                onKeyDown={(e) => handleEnter(e, phoneRef)}
                className="h-10"
                required
              />
              {nameError && <div className="text-sm text-red-600 mt-1">{nameError}</div>}
            </div>
            <div>
              <Label>Phone *</Label>
              <Input
                ref={phoneRef}
                value={patientInfo.phone}
                onChange={(e) => {
                  const next = normalizePhone(e.target.value);
                  setPatientInfo({ ...patientInfo, phone: next });
                }}
                onBlur={() => {
                  setTouched((p) => ({ ...p, phone: true }));
                  if (patientInfo.phone) {
                    lookupAndFillPatient({ phone: patientInfo.phone });
                  }
                }}
                inputMode="tel"
                maxLength={13}
                placeholder="03XXXXXXXXX or +923XXXXXXXXX"
                className="h-10"
                required
              />
              {phoneError && <div className="text-sm text-red-600 mt-1">{phoneError}</div>}
            </div>
            <div>
              <Label>Age</Label>
              <Input
                value={patientInfo.age}
                placeholder="Enter age"
                onChange={(e) => {
                  const digits = (e.target.value || '').replace(/\D/g, '').slice(0, 3);
                  setPatientInfo({ ...patientInfo, age: digits });
                }}
                onBlur={() => setTouched((p) => ({ ...p, age: true }))}
                inputMode="numeric"
                pattern="[0-9]*"
                className="h-10"
              />
              {ageError && <div className="text-sm text-red-600 mt-1">{ageError}</div>}
            </div>
          </div>
          {/* Patient row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Gender</Label>
              <Select value={patientInfo.gender} onValueChange={(v) => setPatientInfo({ ...patientInfo, gender: v })}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Address</Label>
              <Input
                value={patientInfo.address}
                placeholder="Enter address"
                onChange={(e) => setPatientInfo({ ...patientInfo, address: e.target.value })}
                className="h-10"
              />
            </div>
            <div>
              <Label>CNIC</Label>
              <Input
                value={patientInfo.cnic}
                onChange={(e) => {
                  // Keep only digits, max 13
                  const digits = (e.target.value || "").replace(/\D/g, "").slice(0, 13);
                  setPatientInfo({ ...patientInfo, cnic: digits });
                }}
                onBlur={() => {
                  setTouched((p) => ({ ...p, cnic: true }));
                  if (patientInfo.cnic && patientInfo.cnic.length === 13) {
                    lookupAndFillPatient({ cnic: patientInfo.cnic });
                  }
                }}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={13}
                placeholder="Enter 13-digit CNIC"
                className="h-10"
              />
              {cnicError && <div className="text-sm text-red-600 mt-1">{cnicError}</div>}
            </div>
          </div>
          {/* Guardian and ID fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Guardian Relation</Label>
              <Select value={patientInfo.guardianRelation} onValueChange={(v) => setPatientInfo({ ...patientInfo, guardianRelation: v })}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="S/O">S/O</SelectItem>
                  <SelectItem value="D/O">D/O</SelectItem>
                  <SelectItem value="W/O">W/O</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Guardian Name</Label>
              <Input
                value={patientInfo.guardianName}
                placeholder="Enter guardian name"
                onChange={(e) => {
                  const v = (e.target.value || '').replace(/\d/g, '');
                  setPatientInfo({ ...patientInfo, guardianName: v });
                }}
                onBlur={() => setTouched((p) => ({ ...p, guardianName: true }))}
                className="h-10"
              />
              {guardianNameError && <div className="text-sm text-red-600 mt-1">{guardianNameError}</div>}
            </div>
            <div>
              <Label>Referring Doctor</Label>
              <Input
                value={patientInfo.referringDoctor}
                placeholder="Dr. Name"
                onChange={(e) => {
                  const raw = String(e.target.value || '');
                  const noDigits = raw.replace(/\d/g, '');
                  const trimmed = noDigits.trimStart();
                  const withoutPrefix = trimmed.replace(/^dr\.?\s*/i, '');
                  const next = withoutPrefix ? `Dr. ${withoutPrefix}` : '';
                  setPatientInfo({ ...patientInfo, referringDoctor: next });
                }}
                onBlur={() => setTouched((p) => ({ ...p, referringDoctor: true }))}
                className="h-10"
              />
              {referringDoctorError && <div className="text-sm text-red-600 mt-1">{referringDoctorError}</div>}
            </div>
          </div>
          {/* Additional notes removed per requirement */}
        </CardContent>
      </Card>

      {/* Lab Details */}
      <Card className="border rounded-lg">
        <CardHeader className="pb-3">
          <CardTitle>Lab Details</CardTitle>
          <CardDescription>Enter collection information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Sample Collected By</Label>
              <Input
                value={patientInfo.sampleCollectedBy}
                placeholder="Enter staff name"
                onChange={(e) => {
                  const v = (e.target.value || '').replace(/\d/g, '');
                  setPatientInfo({ ...patientInfo, sampleCollectedBy: v });
                }}
                onBlur={() => setTouched((p) => ({ ...p, sampleCollectedBy: true }))}
                className="h-10"
              />
              {sampleCollectedByError && <div className="text-sm text-red-600 mt-1">{sampleCollectedByError}</div>}
            </div>
            <div>
              <Label>Collected Sample</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newCollectedSample}
                    placeholder="Type sample (e.g. Blood) and click Add"
                    onChange={(e) => {
                      const v = String(e.target.value || '').replace(/\d/g, '');
                      setNewCollectedSample(v);
                    }}
                    className="h-10"
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      const v = String(newCollectedSample || '').trim();
                      if (!v) return;
                      setPatientInfo((prev: any) => {
                        const nextArr = Array.isArray(prev.collectedSamples) ? [...prev.collectedSamples] : [];
                        if (!nextArr.some((x) => String(x).toLowerCase() === v.toLowerCase())) {
                          nextArr.push(v);
                        }
                        return {
                          ...prev,
                          collectedSamples: nextArr,
                          collectedSample: nextArr.join(', '),
                        };
                      });
                      setNewCollectedSample('');
                    }}
                  />
                  <Button
                    type="button"
                    className="h-10 bg-blue-800 hover:bg-blue-700 text-white"
                    onClick={() => {
                      const v = String(newCollectedSample || '').trim();
                      if (!v) return;
                      setPatientInfo((prev: any) => {
                        const nextArr = Array.isArray(prev.collectedSamples) ? [...prev.collectedSamples] : [];
                        if (!nextArr.some((x) => String(x).toLowerCase() === v.toLowerCase())) {
                          nextArr.push(v);
                        }
                        return {
                          ...prev,
                          collectedSamples: nextArr,
                          collectedSample: nextArr.join(', '),
                        };
                      });
                      setNewCollectedSample('');
                    }}
                  >
                    Add
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {Array.isArray((patientInfo as any).collectedSamples) && (patientInfo as any).collectedSamples.length > 0 ? (
                    (patientInfo as any).collectedSamples.map((s: string, idx: number) => (
                      <div key={`${s}-${idx}`} className="flex items-center gap-2 px-2 py-1 border rounded-md bg-muted/40 text-sm">
                        <span>{s}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          onClick={() => {
                            setPatientInfo((prev: any) => {
                              const arr = Array.isArray(prev.collectedSamples) ? prev.collectedSamples : [];
                              const nextArr = arr.filter((_: any, i: number) => i !== idx);
                              return {
                                ...prev,
                                collectedSamples: nextArr,
                                collectedSample: nextArr.join(', '),
                              };
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground">No samples added yet.</div>
                  )}
                </div>
              </div>
            </div>
            <div className="hidden md:block" />
          </div>
        </CardContent>
      </Card>

      {/* Test selection */}
      <Card className="border rounded-lg">
        <CardHeader className="pb-2">
          <CardTitle>Select Tests</CardTitle>
          <CardDescription>Type to search and pick multiple tests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 max-w-sm">
            <Label>Test Priority</Label>
            <Select value={testPriority} onValueChange={(v) => setTestPriority(v as 'normal' | 'urgent')}>
              <SelectTrigger className="mt-1 h-10">
                <SelectValue placeholder="Select test type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <TestSelect tests={availableTests} selected={selectedTests} onChange={setSelectedTests} />
        </CardContent>
      </Card>

      <Card className="border rounded-lg">
        <CardHeader className="pb-2">
          <CardTitle>Select Consumables</CardTitle>
          <CardDescription>Choose items and quantities to use</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <Label>Item</Label>
              <div className="relative">
                <Input
                  className="h-10"
                  placeholder="Type to search..."
                  value={selItemText}
                  onFocus={()=> setSuggestOpen(true)}
                  onBlur={()=> setTimeout(()=> setSuggestOpen(false), 100)}
                  onChange={(e)=> { setSelItemText(e.target.value); setSelItemId(""); setSuggestOpen(true); setHighlightIdx(-1); }}
                  onKeyDown={(e)=> {
                    const list = availableInventory.filter((i:any)=> (i.name||'').toString().toLowerCase().includes((selItemText||'').toLowerCase())).slice(0,8);
                    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIdx((prev)=> Math.min(prev + 1, list.length - 1)); setSuggestOpen(true); }
                    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIdx((prev)=> Math.max(prev - 1, 0)); setSuggestOpen(true); }
                    if (e.key === 'Enter' && highlightIdx >= 0 && list[highlightIdx]) { e.preventDefault(); const it = list[highlightIdx]; setSelItemText(it.name); setSelItemId(it._id); setSuggestOpen(false); }
                  }}
                />
                {suggestOpen && (selItemText || '').length > 0 && (
                  (() => {
                    const suggestions = availableInventory
                      .filter((i:any)=> (i.name||'').toString().toLowerCase().includes((selItemText||'').toLowerCase()))
                      .slice(0, 8);
                    if (suggestions.length === 0) return null;
                    return (
                      <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                        {suggestions.map((it:any, idx:number)=> (
                          <button
                            type="button"
                            key={it._id}
                            className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-blue-50 ${idx===highlightIdx? 'bg-blue-50' : ''}`}
                            onMouseDown={()=> { setSelItemText(it.name); setSelItemId(it._id); setSuggestOpen(false); }}
                          >
                            <span className="truncate">{it.name}</span>
                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{(it.currentStock ?? 0)} {it.unit || ''}</span>
                          </button>
                        ))}
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                pattern="[0-9]*"
                value={selQty}
                onChange={(e) => {
                  const raw = String(e.target.value || '');
                  const digits = raw.replace(/\D/g, '');
                  setSelQty(digits);
                }}
                onBlur={() => {
                  const n = parseInt(String(selQty || ''), 10);
                  if (!Number.isFinite(n) || n < 1) {
                    setSelQty('1');
                  }
                }}
                className="h-10"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={addConsumable}>Add</Button>
            </div>
          </div>
          {consumables.length > 0 && (
            <div className="space-y-2">
              {consumables.map((c) => (
                <div key={c.itemId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-gray-600">{c.quantity} {c.unit || ''}</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => removeConsumable(c.itemId)}>Remove</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected summary */}
      {selectedTests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Tests ({selectedTests.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedTests.map((t) => (
              <div key={t._id} className="p-3 bg-gray-50 rounded">
                <div className="flex justify-between">
                  <span>{t.name}</span>
                  <span className="font-medium">PKR {Number(t.price||0).toFixed(2)}</span>
                </div>
              </div>
            ))}
            {testPriority === 'urgent' && (
              <div className="flex justify-between text-sm">
                {(() => {
                  const base = getBaseTotalAmount();
                  const uplift = Number(urgentUpliftRate) || 0;
                  const extra = getSubtotalAfterUrgent() - base;
                  return (
                    <>
                      <span>Urgent uplift ({uplift.toFixed(0)}%)</span>
                      <span>+ PKR {extra.toFixed(2)}</span>
                    </>
                  );
                })()}
              </div>
            )}
            <div className="flex justify-between text-sm">
              {(() => {
                const dr = Number(discountRate) || 0;
                const disc = getDiscountAmount();
                return (
                  <>
                    <span>Discount ({dr.toFixed(0)}%)</span>
                    <span>- PKR {disc.toFixed(2)}</span>
                  </>
                );
              })()}
            </div>
            <div className="flex justify-between text-sm">
              {(() => { 
                const base = getSubtotalAfterDiscount();
                const c = computeIncl(base);
                const tax = c.amount - base;
                return (
                <>
                  <span>Tax ({c.rate.toFixed(0)}%)</span>
                  <span>+ PKR {tax.toFixed(2)}</span>
                </>
              ); })()}
            </div>
            <div className="flex justify-between pt-2 border-t font-semibold">
              <span>Total</span>
              <span>PKR {getTotalAmount().toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onNavigateBack}>Cancel</Button>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSubmit} disabled={isSubmitting || selectedTests.length === 0 || !modulePerm.edit}>
          {isSubmitting ? "Submitting..." : "Submit Sample"}
        </Button>
      </div>

      {/* View Sample Modal */}
      {showViewModal && selectedSample && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Sample Details</h2>
              <button
                onClick={closeViewModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Barcode</Label>
                  <div className="mt-1 p-2 bg-gray-50 rounded text-sm font-mono">
                    {selectedSample.barcode}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Status</Label>
                  <div className="mt-1 p-2 bg-gray-50 rounded text-sm">
                    {getStatusBadge(selectedSample.status)}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-600">Patient Name</Label>
                <div className="mt-1 p-2 bg-gray-50 rounded text-sm">
                  {selectedSample.patientName}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-600">Test</Label>
                <div className="mt-1 p-2 bg-gray-50 rounded text-sm">
                  {selectedSample.test}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-600">Collection Time</Label>
                <div className="mt-1 p-2 bg-gray-50 rounded text-sm">
                  {selectedSample.collectionTime}
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-md">
                <div className="text-sm text-blue-800">
                  <strong>Lab Information:</strong><br />
                  MedLab LIS - Laboratory Information System<br />
                  Supervisor: Dr. John Doe
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={closeViewModal}>
                Close
              </Button>
              <Button 
                onClick={() => {
                  closeViewModal();
                  handleEditSample(selectedSample);
                }}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!modulePerm.edit}
              >
                Edit Sample
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Sample Modal */}
      {showEditModal && selectedSample && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Edit Sample</h2>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Sample Info (Read-only) */}
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Barcode: <span className="font-medium font-mono">{selectedSample.barcode}</span></div>
                  <div>Collection Time: <span className="font-medium">{selectedSample.collectionTime}</span></div>
                </div>
              </div>

              {/* Editable Fields */}
              <div>
                <Label htmlFor="editPatientName">Patient Name *</Label>
                <Input
                  id="editPatientName"
                  value={editingSample.patientName}
                  onChange={(e) => setEditingSample({ ...editingSample, patientName: e.target.value })}
                  className="mt-1"
                  disabled={!modulePerm.edit}
                />
              </div>

              <div>
                <Label htmlFor="editTest">Test *</Label>
                <Select 
                  value={editingSample.test} 
                  onValueChange={(value) => setEditingSample({ ...editingSample, test: value })}
                  disabled={!modulePerm.edit}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {testOptions.map((test) => (
                      <SelectItem key={test} value={test}>
                        {test}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="editStatus">Status *</Label>
                <Select 
                  value={editingSample.status} 
                  onValueChange={(value) => setEditingSample({ ...editingSample, status: value })}
                  disabled={!modulePerm.edit}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(status)}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button 
                variant="outline" 
                onClick={closeEditModal}
                disabled={isUpdatingSample}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateSample}
                disabled={isUpdatingSample || !editingSample.patientName || !editingSample.test || !modulePerm.edit}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isUpdatingSample ? "Updating..." : "Update Sample"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SampleIntakeClean;
