import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  Filter, 
  X,
  Download,
  Eye,
  Barcode,
  ChevronDown,
} from "lucide-react";
import { api } from "@/lab lib/api";

function splitCommaOutsideParens(input: string): string[] {
  const out: string[] = [];
  let buf = '';
  let depth = 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '(') depth++;
    if (ch === ')' && depth > 0) depth--;
    if (ch === ',' && depth === 0) {
      const v = buf.trim();
      if (v) out.push(v);
      buf = '';
      continue;
    }
    buf += ch;
  }
  const last = buf.trim();
  if (last) out.push(last);
  return out;
}

function generateBarcodeValue() {
  const ts = Date.now().toString().slice(-6);
  return `BC-${new Date().getFullYear()}-${ts}`;
}

function BarcodeSvg({ value }: { value: string }) {
  const text = String(value || '');
  const modules = buildBarcodeModules(text);
  const height = 64;
  const barWidth = 2;
  const width = Math.max(240, modules.length * barWidth);

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Barcode ${text}`}
      className="block"
    >
      <rect x="0" y="0" width={width} height={height} fill="#fff" />
      {modules.map((m, i) =>
        m ? (
          <rect
            key={i}
            x={i * barWidth}
            y={0}
            width={barWidth}
            height={height - 16}
            fill="#000"
          />
        ) : null
      )}
      <text
        x={width / 2}
        y={height - 4}
        textAnchor="middle"
        fontFamily="monospace"
        fontSize="12"
        fill="#000"
      >
        {text}
      </text>
    </svg>
  );
}

function buildBarcodeModules(text: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    bytes.push(code & 0xff);
  }
  const modules: number[] = [];
  for (let i = 0; i < 12; i++) modules.push(0);
  for (const b of bytes) {
    for (let bit = 7; bit >= 0; bit--) {
      const on = (b >> bit) & 1;
      modules.push(on);
      modules.push(on);
    }
    modules.push(0);
  }
  for (let i = 0; i < 12; i++) modules.push(0);
  return modules;
}

function buildBarcodeSvgMarkup(value: string): string {
  const text = String(value || '');
  const modules = buildBarcodeModules(text);
  const height = 64;
  const barWidth = 2;
  const width = Math.max(240, modules.length * barWidth);
  const bars = modules
    .map((m, i) => (m ? `<rect x="${i * barWidth}" y="0" width="${barWidth}" height="${height - 16}" fill="#000" />` : ''))
    .join('');

  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#fff" />
  ${bars}
  <text x="${width / 2}" y="${height - 4}" text-anchor="middle" font-family="monospace" font-size="12" fill="#000">${escaped}</text>
</svg>`;
}

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

function getSampleTestNames(sample: any): string[] {
  try {
    const names: string[] = [];
    if (Array.isArray(sample?.tests)) {
      for (const t of sample.tests) {
        const n = String((t && (t.name || t.test)) || t || "").trim();
        if (n) names.push(n);
      }
    }
    if (typeof sample?.test === "string") {
      splitCommaOutsideParens(String(sample.test)).forEach((v) => v && names.push(v.trim()));
    }
    const uniq = Array.from(new Set(names.map((s) => s.toLowerCase())));
    return uniq.map((lower) => names.find((n) => n.toLowerCase() === lower) || lower);
  } catch {
    return [];
  }
}

function sampleHasCBC(sample: any): boolean {
  try {
    const names: string[] = [];
    if (Array.isArray(sample?.tests)) {
      for (const t of sample.tests) {
        const n = String((t && (t.name || t.test)) || t || "").toLowerCase();
        if (n) names.push(n);
      }
    }
    if (typeof sample?.test === "string") {
      splitCommaOutsideParens(String(sample.test)).forEach((v) => v && names.push(v.trim().toLowerCase()));
    }
    const lookup = [
      "complete blood count",
      "cbc",
      "complete blood count (cbc)",
    ];
    return names.some((n) => lookup.some((k) => n.includes(k)));
  } catch {
    return false;
  }
}

const Barcodes: React.FC = () => {
  const { toast } = useToast();
  const modulePerm = getModulePermission('Barcodes');
  
  // Barcode Management state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [samples, setSamples] = useState<any[]>([]);

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedSample, setSelectedSample] = useState<any>(null);
  const [showAssignBarcodeModal, setShowAssignBarcodeModal] = useState(false);
  const [barcodeTargetSample, setBarcodeTargetSample] = useState<any>(null);
  const [generatedBarcode, setGeneratedBarcode] = useState<string>("");
  const [isAssigningBarcode, setIsAssigningBarcode] = useState(false);
  const [showAddSampleModal, setShowAddSampleModal] = useState(false);
  const [cbcRows, setCbcRows] = useState<Array<{ parameter: string; value: string; unit: string; ref: string; status: string }>>([]);
  

  // New sample form state
  const [newSample, setNewSample] = useState({
    patientName: "",
    test: "",
    status: "collected" as "collected" | "processing" | "completed",
    assignedAnalyzer: "",
    collectionTime: "",
  });

  // Helper functions
  const getStatusBadge = (status: string) => {
    const raw = String(status || "").toLowerCase();
    const norm: "collected" | "processing" | "completed" =
      raw.includes("complet") ? "completed" : raw.includes("process") ? "processing" : "collected";
    const statusConfig: Record<"collected" | "processing" | "completed", { color: string; text: string }> = {
      collected: { color: "bg-blue-600 text-white", text: "Collected" },
      processing: { color: "bg-yellow-600 text-white", text: "Processing" },
      completed: { color: "bg-green-600 text-white", text: "Completed" },
    };
    const config = statusConfig[norm];
    return (
      <Badge className={`${config.color} text-xs`}>
        {config.text}
      </Badge>
    );
  };


  const formatCollectionTime = (value: any) => {
    try {
      if (!value) return 'N/A';
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      }
      return String(value);
    } catch {
      return String(value ?? 'N/A');
    }
  };

  // Search functionality
  const performSearch = useCallback((term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    const searchableFields = samples.flatMap(sample => [
      sample.barcode,
      sample.patientName,
      sample.test,
      sample.status
    ]);

    const uniqueMatches = [...new Set(
      searchableFields.filter(field => 
        field.toLowerCase().includes(term.toLowerCase())
      )
    )];

    setSearchResults(uniqueMatches.slice(0, 5));
  }, [samples]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, performSearch]);

  const handleSuggestionClick = (suggestion: string) => {
    setSearchTerm(suggestion);
    setShowSearchSuggestions(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.length > 0) {
      setShowSearchSuggestions(true);
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
    setSearchResults([]);
    setShowSearchSuggestions(false);
  };

  // Filter samples based on search and status
  const filteredSamples = samples.filter(sample => {
    const matchesSearch = !searchTerm || 
      String(sample.barcode || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(sample.patientName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(sample.test || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(sample.status || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const rawStatus = String(sample.status || "");
    const normStatus = rawStatus.toLowerCase().includes("complet")
      ? "completed"
      : rawStatus.toLowerCase().includes("process")
      ? "processing"
      : "collected";
    const matchesStatus = statusFilter === "All Status" || normStatus === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Load samples from backend API so Barcodes is backend-driven
  const loadSamplesFromBackend = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/labtech/samples", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const arr = Array.isArray(res.data) ? res.data : [];
      const mapped = arr.map((s: any) => {
        const rawStatus = String(s.status || "");
        const normStatus = rawStatus.toLowerCase().includes("complet")
          ? "completed"
          : rawStatus.toLowerCase().includes("process")
          ? "processing"
          : "collected";
        return {
          // keep full backend sample so we retain _id for PATCHing
          ...s,
          barcode: s.barcode || "",
          sampleId: s.sampleNumber || "",
          patientName: s.patientName || "",
          test:
            Array.isArray(s.tests) && s.tests.length
              ? s.tests.map((t: any) => t?.name || t?.test).filter(Boolean).join(", ")
              : s.test || "",
          status: normStatus,
          assignedAnalyzer: s.assignedAnalyzer || "",
          collectionTime: s.createdAt
            ? new Date(s.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "",
          tests: Array.isArray(s.tests) ? s.tests : [],
        };
      });
      setSamples(mapped);
    } catch (err) {
      console.error("Failed to load samples from backend", err);
      // keep existing samples state on error
    }
  }, []);

  useEffect(() => {
    loadSamplesFromBackend();
    const sync = () => {
      loadSamplesFromBackend();
    };
    window.addEventListener("samplesChanged", sync);
    window.addEventListener("sampleSubmitted", sync);
    return () => {
      window.removeEventListener("samplesChanged", sync);
      window.removeEventListener("sampleSubmitted", sync);
    };
  }, [loadSamplesFromBackend]);

  // Action handlers
  const handleViewSample = (row: any) => {
    // Pure front-end flow: use the row data only as the current mock sample
    setSelectedSample(row);
    setShowViewModal(true);
  };

  const handleOpenAssignBarcode = (sample: any) => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: 'You only have view permission for Barcodes.', variant: 'destructive' });
      return;
    }
    const sampleId = sample?._id || sample?.id;
    if (!sampleId) {
      toast({ title: 'Error', description: 'Sample id not found.', variant: 'destructive' });
      return;
    }

    setBarcodeTargetSample(sample);
    setGeneratedBarcode(String(sample?.barcode || '').trim() || generateBarcodeValue());
    setShowAssignBarcodeModal(true);

    (async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const res = await api.get(`/labtech/samples/${sampleId}`, { headers });
        const fresh = res.data;
        setBarcodeTargetSample(fresh);
        setGeneratedBarcode(String(fresh?.barcode || '').trim() || generateBarcodeValue());
      } catch {
        // ignore; best-effort refresh
      }
    })();
  };

  const handleAssignBarcode = async () => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: 'You only have view permission for Barcodes.', variant: 'destructive' });
      return;
    }
    const sample = barcodeTargetSample;
    const sampleId = sample?._id || sample?.id;
    if (!sampleId) {
      toast({ title: 'Error', description: 'Sample id not found.', variant: 'destructive' });
      return;
    }
    const barcode = String(generatedBarcode || '').trim();
    if (!barcode) {
      toast({ title: 'Error', description: 'Barcode not generated.', variant: 'destructive' });
      return;
    }
    if (String(barcodeTargetSample?.barcode || '').trim()) {
      toast({ title: 'Assigned', description: 'This sample already has an assigned barcode.' });
      return;
    }
    setIsAssigningBarcode(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      await api.patch(`/labtech/samples/${sampleId}`, { barcode }, { headers });
      toast({ title: 'Barcode Assigned', description: `Barcode ${barcode} assigned to this sample.` });
      setShowAssignBarcodeModal(false);
      setBarcodeTargetSample(null);
      setGeneratedBarcode('');
      await loadSamplesFromBackend();
      try {
        window.dispatchEvent(new Event('samplesChanged'));
      } catch {}
    } catch (err: any) {
      const code = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || 'Request failed';
      toast({ title: 'Error', description: `Failed to assign barcode (HTTP ${code || 'n/a'}). ${msg}`, variant: 'destructive' });
    } finally {
      setIsAssigningBarcode(false);
    }
  };

  const handleDownloadBarcode = () => {
    const code = String(generatedBarcode || '').trim();
    if (!code) {
      toast({ title: 'Error', description: 'Barcode not generated.', variant: 'destructive' });
      return;
    }
    const svg = buildBarcodeSvgMarkup(code);
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safe = code.replace(/[^a-zA-Z0-9-_]+/g, '_');
    a.download = `barcode_${safe}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!showViewModal || !selectedSample) return;
    const existing = Array.isArray(selectedSample.results) ? selectedSample.results : [];
    const selectedNames = getSampleTestNames(selectedSample);
    const toRow = (r: any) => ({
      parameter: String(r?.label || r?.parameter || r?.name || 'Parameter'),
      value: String(r?.value ?? ''),
      unit: String(r?.unit ?? ''),
      ref: String(r?.normalText ?? ''),
      status: r?.isCritical ? 'Critical' : (r?.isAbnormal ? 'Abnormal' : 'Normal'),
    });
    if (existing.length > 0) {
      setCbcRows(existing.map(toRow));
    } else if (selectedNames.length > 0) {
      setCbcRows(selectedNames.map((name) => ({
        parameter: name,
        value: '-',
        unit: '-',
        ref: '-',
        status: 'Normal',
      })));
    } else {
      setCbcRows([
        { parameter: 'Hemoglobin (Hgb)', value: '13.9', unit: 'g/dL', ref: '13.5 - 17.5', status: 'Normal' },
        { parameter: 'WBC', value: '7.6', unit: '10³/μL', ref: '4.0 - 11.0', status: 'Normal' },
        { parameter: 'Platelets', value: '230', unit: '10³/μL', ref: '150 - 400', status: 'Normal' },
      ]);
    }
  }, [showViewModal, selectedSample]);

  const handleNewSampleChange = (field: keyof typeof newSample, value: string) => {
    setNewSample(prev => ({ ...prev, [field]: value }));
  };

  const handleAddSample = () => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: 'You only have view permission for Barcodes.', variant: 'destructive' });
      return;
    }
    const trimmedName = newSample.patientName.trim();
    const trimmedTest = newSample.test.trim();
    const trimmedAnalyzer = newSample.assignedAnalyzer.trim();

    if (!trimmedName || !trimmedTest || !trimmedAnalyzer) {
      toast({
        title: "Missing information",
        description: "Please enter patient name, test and analyzer.",
        variant: "destructive",
      });
      return;
    }

    // Generate a simple barcode id based on count + timestamp
    const nextIndex = samples.length + 1;
    const ts = Date.now().toString().slice(-4);
    const barcode = `LAB-2024-${nextIndex.toString().padStart(3, "0")}-${ts}`;

    const time = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const sampleToAdd = {
      id: `${Date.now()}-${nextIndex}`,
      barcode,
      patientName: trimmedName,
      test: trimmedTest,
      status: newSample.status,
      assignedAnalyzer: trimmedAnalyzer,
      collectionTime: time,
    };

    setSamples(prev => {
      const updated = [sampleToAdd, ...prev];
      try {
        // Persist to the shared key used by SamplesPage so both views stay in sync
        localStorage.setItem("samplesPageSamples", JSON.stringify(updated));
        // Also mirror to the legacy key for backward compatibility
        localStorage.setItem("barcodesSamples", JSON.stringify(updated));
      } catch {
        // ignore storage errors
      }
      return updated;
    });

    toast({
      title: "Sample added",
      description: `Sample for ${trimmedName} added with barcode ${barcode}.`,
    });

    setNewSample({
      patientName: "",
      test: "",
      status: "collected",
      assignedAnalyzer: "",
      collectionTime: "",
    });
    setShowAddSampleModal(false);
  };

  const generatePatientReport = (sample: any) => {
    const reportDate = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // Prefer real backend data when available
    const patientName = sample?.patientName || '';
    const age = sample?.age ? `${sample.age} Years` : 'N/A';
    const gender = sample?.gender || 'N/A';
    const collection = sample?.createdAt
      ? new Date(sample.createdAt).toLocaleString('en-US', {
          year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true,
        })
      : sample?.collectionTime || 'N/A';
    const sampleId = sample?.barcode || sample?._id || 'N/A';

    let testResults: Array<{ parameter: string; result: string; unit: string; referenceRange: string; status: string }> = [];

    if (Array.isArray(sample?.results) && sample.results.length > 0) {
      testResults = sample.results.map((r: any) => {
        let name = r.label || r.parameter || r.name || r.parameterId || 'Parameter';
        let unit = r.unit || '';
        let referenceRange = r.normalText || '-';
        const value = (typeof r.value === 'number' || typeof r.value === 'string') ? String(r.value) : '-';
        const status = r.isCritical ? 'Critical' : (r.isAbnormal ? 'Abnormal' : 'Normal');
        return {
          parameter: name,
          result: value,
          unit,
          referenceRange,
          status,
        };
      });
    } else {
      const selectedNames = getSampleTestNames(sample);
      if (selectedNames.length > 0) {
        testResults = selectedNames.map((name) => ({
          parameter: name,
          result: '-',
          unit: '-',
          referenceRange: '-',
          status: 'Normal',
        }));
      } else {
        testResults = [
          { parameter: 'Hemoglobin (Hgb)', result: '14.2', unit: 'g/dL', referenceRange: '13.5 - 17.5', status: 'Normal' },
          { parameter: 'WBC', result: '7.8', unit: '10³/μL', referenceRange: '4.0 - 11.0', status: 'Normal' },
          { parameter: 'Platelets', result: '245', unit: '10³/μL', referenceRange: '150 - 400', status: 'Normal' },
        ];
      }
    }

    return {
      patientInfo: {
        name: patientName,
        id: sample?.patientId || `P-2024-001`,
        age,
        gender,
        collectionDate: collection,
        reportDate: reportDate,
        sampleId,
        lastUpdated: (sample?.updatedAt || sample?.completedAt) ? new Date(sample?.updatedAt || sample?.completedAt).toLocaleString('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }) : reportDate,
      },
      referringPhysician: {
        name: "Dr. Sarah Johnson, MD",
        department: "Internal Medicine",
      },
      testResults,
      clinicalNotes:
        sample?.interpretation ||
        "All test parameters are within normal reference ranges. Sample processed using Mindray BC 700 analyzer. Results verified and approved by laboratory supervisor.",
      verifiedBy: {
        name: "Dr. John Doe, PhD",
        title: "Laboratory Supervisor",
        license: "LAB-2024-SUP",
      },
    };
  };

  // Header button functionality
  const handleDownloadPDF = (sample: any) => {
    const reportData = generatePatientReport(sample);
    const includeCBC = sampleHasCBC(sample);
    const testsList = getSampleTestNames(sample);
    
    const pdfContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Medical Laboratory Report - ${sample.barcode}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.4; 
            color: #333; 
            padding: 20px;
            font-size: 12px;
          }
          .header { text-align: center; margin-bottom: 20px; }
          .logo { 
            width: 50px; 
            height: 50px; 
            background: #2563eb; 
            border-radius: 8px; 
            display: inline-flex; 
            align-items: center; 
            justify-content: center; 
            color: white; 
            font-weight: bold; 
            font-size: 18px;
            margin-bottom: 10px;
          }
          .title { font-size: 24px; font-weight: bold; color: #2563eb; margin-bottom: 5px; }
          .subtitle { font-size: 12px; color: #666; }
          .patient-info { 
            background: #eff6ff; 
            padding: 15px; 
            border-radius: 8px; 
            margin: 20px 0; 
          }
          .patient-info h3 { color: #1e40af; font-size: 16px; margin-bottom: 10px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .info-item { font-size: 11px; }
          .info-label { font-weight: bold; }
          .section { margin: 20px 0; }
          .section h3 { color: #1e40af; font-size: 16px; margin-bottom: 10px; }
          .results-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 10px 0; 
            border: 1px solid #e5e7eb;
          }
          .results-table th, .results-table td { 
            border: 1px solid #e5e7eb; 
            padding: 8px; 
            text-align: left; 
            font-size: 11px;
          }
          .results-table th { 
            background: #f9fafb; 
            font-weight: bold; 
          }
          .status-normal { 
            background: #dcfce7; 
            color: #166534; 
            padding: 2px 6px; 
            border-radius: 4px; 
            font-size: 10px;
          }
          .clinical-notes { 
            background: #f9fafb; 
            padding: 15px; 
            border-radius: 8px; 
            font-size: 11px;
            line-height: 1.5;
          }
          .signatures { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 40px; 
            margin: 30px 0; 
          }
          .signature-box { text-align: center; }
          .signature-line { 
            border-bottom: 1px solid #374151; 
            height: 40px; 
            margin-bottom: 5px; 
          }
          .signature-name { font-weight: bold; font-size: 11px; }
          .signature-title { font-size: 10px; color: #666; }
          .footer { 
            text-align: center; 
            font-size: 10px; 
            color: #666; 
            border-top: 1px solid #e5e7eb; 
            padding-top: 15px; 
            margin-top: 30px;
          }
          @media print {
            body { padding: 10px; }
            .page-break { page-break-before: always; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">ML</div>
          <div class="title">Medical Laboratory Report</div>
          <div class="subtitle">Accredited by ISO 15189:2012</div>
          <div class="subtitle">Report ID: ${reportData.patientInfo.sampleId}</div>
        </div>

        <div class="patient-info">
          <h3>Patient Information</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Patient Name:</span> ${reportData.patientInfo.name}
            </div>
            <div class="info-item">
              <span class="info-label">Patient ID:</span> ${reportData.patientInfo.id}
            </div>
            <div class="info-item">
              <span class="info-label">Age / Gender:</span> ${reportData.patientInfo.age} / ${reportData.patientInfo.gender}
            </div>
            <div class="info-item">
              <span class="info-label">Collection Date:</span> ${reportData.patientInfo.collectionDate}
            </div>
            <div class="info-item">
              <span class="info-label">Report Date:</span> ${reportData.patientInfo.reportDate}
            </div>
            <div class="info-item">
              <span class="info-label">Sample ID:</span> ${reportData.patientInfo.sampleId}
            </div>
            <div class="info-item">
              <span class="info-label">Last Updated:</span> ${reportData.patientInfo.lastUpdated}
            </div>
          </div>
        </div>

        <div class="section">
          <h3>Referring Physician</h3>
          <div class="info-item">
            <div class="info-label">${reportData.referringPhysician.name}</div>
            <div style="color: #666; font-size: 10px;">${reportData.referringPhysician.department}</div>
          </div>
        </div>

        ${testsList.length ? `
        <div class="section">
          <h3>Requested Tests</h3>
          <ul style="margin-left: 18px; margin-top: 6px;">
            ${testsList.map(t => `<li>${t}</li>`).join('')}
          </ul>
        </div>
        ` : ``}

        ${includeCBC ? `
        <div class="section">
          <h3>Complete Blood Count (CBC)</h3>
          <table class="results-table">
            <thead>
              <tr>
                <th>Test Parameter</th>
                <th>Result</th>
                <th>Unit</th>
                <th>Reference Range</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.testResults.map(result => `
                <tr>
                  <td>${result.parameter}</td>
                  <td><strong>${result.result}</strong></td>
                  <td>${result.unit}</td>
                  <td>${result.referenceRange}</td>
                  <td><span class="status-normal">${result.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ``}

        <div class="section">
          <h3>Clinical Notes</h3>
          <div class="clinical-notes">
            ${reportData.clinicalNotes}
          </div>
        </div>

        <div class="signatures">
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-name">${reportData.verifiedBy.name}</div>
            <div class="signature-title">${reportData.verifiedBy.title}</div>
            <div class="signature-title">License: ${reportData.verifiedBy.license}</div>
            <div style="font-size: 10px; color: #666; margin-top: 5px;">Verified By:</div>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-name">Digital Signature Applied</div>
            <div style="font-size: 10px; color: #666; margin-top: 5px;">Authorized Signature:</div>
          </div>
        </div>

        <div class="footer">
          <div>This is a computer-generated report and does not require a physical signature.</div>
          <div>For queries, contact: lab@medlablis.com | +1 (555) 123-4567</div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(pdfContent);
      printWindow.document.close();
      
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      };
    }

    toast({
      title: "PDF Generated",
      description: `Patient report for ${sample.patientName} generated successfully`,
    });
  };


  const handleEmailReport = (sample: any) => {
    // Simulate email functionality
    const reportData = generatePatientReport(sample);
    
    // In a real application, this would integrate with an email service
    const emailBody = `
Dear Patient,

Your laboratory report is ready. Please find the details below:

Patient: ${reportData.patientInfo.name}
Report ID: ${reportData.patientInfo.sampleId}
Collection Date: ${reportData.patientInfo.collectionDate}
Report Date: ${reportData.patientInfo.reportDate}

Test Results Summary:
${reportData.testResults.map(result => 
  `- ${result.parameter}: ${result.result} ${result.unit} (${result.status})`
).join('\n')}

Clinical Notes:
${reportData.clinicalNotes}

Best regards,
MedLab LIS Team
lab@medlablis.com
+1 (555) 123-4567
    `;

    // Create mailto link
    const subject = encodeURIComponent(`Laboratory Report - ${sample.barcode}`);
    const body = encodeURIComponent(emailBody);
    const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
    
    window.open(mailtoLink);

    toast({
      title: "Email Client Opened",
      description: `Report for ${sample.patientName} prepared for email`,
    });
  };

  const handleShareSMS = (sample: any) => {
    // Simulate SMS sharing functionality
    const reportData = generatePatientReport(sample);
    
    const smsMessage = `MedLab LIS: Your lab report is ready! 
Patient: ${reportData.patientInfo.name}
Report ID: ${reportData.patientInfo.sampleId}
Collection: ${reportData.patientInfo.collectionDate}
Status: All parameters normal
Download: https://medlablis.com/reports/${sample.barcode}
Questions? Call +1 (555) 123-4567`;

    // In a real application, this would integrate with SMS service
    // For demo, we'll copy to clipboard
    navigator.clipboard.writeText(smsMessage).then(() => {
      toast({
        title: "SMS Message Prepared",
        description: "Report summary copied to clipboard for SMS sharing",
      });
    }).catch(() => {
      toast({
        title: "SMS Sharing",
        description: `Report summary for ${sample.patientName} prepared for SMS`,
      });
    });
  };

  const handleExportBarcodes = () => {
    // Export all barcodes as CSV
    const csvContent = [
      ['Barcode', 'Patient Name', 'Test', 'Status', 'Collection Time'],
      ...filteredSamples.map(sample => [
        sample.barcode,
        sample.patientName,
        sample.test,
        sample.status,
        sample.collectionTime
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `barcodes_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: `${filteredSamples.length} barcodes exported to CSV`,
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Barcodes</h1>
        <p className="text-sm text-muted-foreground">Manage and track sample barcodes throughout the testing process</p>
      </div>
      
      {/* Barcode Management Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Sample Management</CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={handleExportBarcodes}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export Barcodes
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by barcode, patient name or test..."
                value={searchTerm}
                onChange={handleSearchChange}
                onFocus={() => searchTerm.length > 0 && setShowSearchSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              
              {/* Search Suggestions Dropdown */}
              {showSearchSuggestions && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                  {searchResults.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center gap-2">
                        <Search className="h-3 w-3 text-gray-400" />
                        <span>{suggestion}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Status">All Status</SelectItem>
                  <SelectItem value="collected">Collected</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sample Count */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span>Samples ({filteredSamples.length})</span>
              {statusFilter !== "All Status" && ` - Filtered by: ${statusFilter}`}
            </div>
            {(searchTerm || statusFilter !== "All Status") && (
              <button
                onClick={() => {
                  clearSearch();
                  setStatusFilter("All Status");
                }}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Clear all filters
              </button>
            )}
          </div>

          {/* Samples Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Sample ID</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Test(s)</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSamples.map((sample) => (
                  <TableRow key={sample._id || sample.id || sample.sampleId || sample.barcode}>
                    <TableCell className="font-medium font-mono">{sample.barcode ? sample.barcode : '-'}</TableCell>
                    <TableCell className="font-medium font-mono">{sample.sampleId || '-'}</TableCell>
                    <TableCell>{sample.patientName}</TableCell>
                    <TableCell>
                      {(() => {
                        const names: string[] = [];
                        if (Array.isArray((sample as any).tests)) {
                          for (const t of (sample as any).tests) {
                            const n = String((t && (t.name || t.test)) || t || '').trim();
                            if (n) names.push(n);
                          }
                        }
                        if (typeof (sample as any).test === 'string') {
                          splitCommaOutsideParens(String((sample as any).test)).forEach((v) => v && names.push(v));
                        }
                        const uniq = Array.from(new Set(names.map((n) => n.toLowerCase())))
                          .map((lower) => names.find((n) => n.toLowerCase() === lower) || lower);
                        const list = uniq.filter(Boolean);
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
                    </TableCell>
                    <TableCell>{sample.phone || sample.patientPhone || '-'}</TableCell>
                    <TableCell>{getStatusBadge(sample.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleViewSample(sample)}
                          title="View report"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenAssignBarcode(sample)}
                          title="Generate Barcode"
                          disabled={!modulePerm.edit}
                        >
                          <Barcode className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredSamples.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Search className="w-10 h-10 text-gray-300" />
                        <p>No samples available yet</p>
                        <p className="text-xs text-gray-400">New samples from Token Generation will appear here automatically</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Assign Barcode Modal */}
      <Dialog
        open={showAssignBarcodeModal}
        onOpenChange={(open) => {
          setShowAssignBarcodeModal(open);
          if (!open) {
            setBarcodeTargetSample(null);
            setGeneratedBarcode('');
            setIsAssigningBarcode(false);
          }
        }}
      >
        <DialogContent className="w-full max-w-lg sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Barcode</DialogTitle>
            <DialogDescription>
              Generate and assign a barcode to this sample.
            </DialogDescription>
          </DialogHeader>

          {barcodeTargetSample && (
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Sample ID</Label>
                  <p className="text-sm font-mono bg-gray-100 p-2 rounded">
                    {barcodeTargetSample.sampleId || barcodeTargetSample.sampleNumber || '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Patient Name</Label>
                  <p className="text-sm bg-gray-100 p-2 rounded">
                    {barcodeTargetSample.patientName || '-'}
                  </p>
                </div>
              </div>

              {String(barcodeTargetSample?.barcode || '').trim() ? (
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-600 text-white text-xs">Assigned</Badge>
                  <span className="text-xs text-muted-foreground">Barcode is already assigned for this sample.</span>
                </div>
              ) : null}

              <div>
                <Label className="text-sm font-medium text-gray-500">Tests</Label>
                {(() => {
                  const testsList = getSampleTestNames(barcodeTargetSample);
                  if (!testsList.length) return <p className="text-sm bg-gray-100 p-2 rounded">-</p>;
                  return (
                    <div className="bg-gray-100 p-2 rounded text-sm">
                      {testsList.join(', ')}
                    </div>
                  );
                })()}
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">Generated Barcode</Label>
                <div className="bg-white border rounded-md p-3">
                  <div className="text-xs text-gray-500">Barcode</div>
                  <div className="border-t mt-2 pt-2">
                    {generatedBarcode ? (
                      <div className="w-full">
                        <BarcodeSvg value={generatedBarcode} />
                      </div>
                    ) : (
                      <div className="font-mono text-lg tracking-widest">-</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadBarcode}
              disabled={!generatedBarcode}
            >
              Download
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAssignBarcodeModal(false)}
              disabled={isAssigningBarcode}
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={handleAssignBarcode}
              disabled={!modulePerm.edit || isAssigningBarcode || !barcodeTargetSample || !!String(barcodeTargetSample?.barcode || '').trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isAssigningBarcode ? 'Assigning...' : 'Assign Barcode'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Sample Modal */}
      <Dialog open={showAddSampleModal} onOpenChange={setShowAddSampleModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Sample</DialogTitle>
            <DialogDescription>
              Enter patient and test information to create a new sample and barcode.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-patient-name">Patient Name</Label>
              <Input
                id="new-patient-name"
                placeholder="Enter patient name"
                value={newSample.patientName}
                onChange={e => handleNewSampleChange("patientName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-test">Test</Label>
              <Input
                id="new-test"
                placeholder="Enter test name"
                value={newSample.test}
                onChange={e => handleNewSampleChange("test", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-analyzer">Assigned Analyzer</Label>
              <Input
                id="new-analyzer"
                placeholder="Enter analyzer name"
                value={newSample.assignedAnalyzer}
                onChange={e => handleNewSampleChange("assignedAnalyzer", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={newSample.status}
                onValueChange={val => handleNewSampleChange("status", val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in process">In Process</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="delayed">Delayed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddSampleModal(false);
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleAddSample} disabled={!modulePerm.edit}>
              Save Sample
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Sample Details Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="w-full max-w-lg sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Sample Details</DialogTitle>
            <DialogDescription>
              View detailed information about this sample.
            </DialogDescription>
          </DialogHeader>
          {selectedSample && (
            <div className="grid gap-4 py-2 sm:py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Sample ID</Label>
                  <p className="text-sm font-mono bg-gray-100 p-2 rounded">{selectedSample.barcode}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedSample.status)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Patient Name</Label>
                  <p className="text-sm">{selectedSample.patientName || '-'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Phone</Label>
                  <p className="text-sm">{selectedSample.phone || selectedSample.patientPhone || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">CNIC</Label>
                  <p className="text-sm">{selectedSample.cnic || selectedSample.patientCnic || '-'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Age / Gender</Label>
                  <p className="text-sm">
                    {(selectedSample.age || selectedSample.patientAge || '-')}
                    {" / "}
                    {selectedSample.gender || selectedSample.patientGender || '-'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Address</Label>
                  <p className="text-sm break-words">{selectedSample.address || '-'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Guardian</Label>
                  <p className="text-sm">
                    {selectedSample.guardianRelation || selectedSample.guardianName
                      ? `${selectedSample.guardianRelation || ''} ${selectedSample.guardianName || ''}`.trim()
                      : '-'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Priority</Label>
                  <p className="text-sm capitalize">{selectedSample.priority || 'normal'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Created At</Label>
                  <p className="text-sm">
                    {selectedSample.createdAt
                      ? new Date(selectedSample.createdAt).toLocaleString()
                      : selectedSample.collectionTime || '-'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Referring Doctor</Label>
                  <p className="text-sm break-words">{selectedSample.referringDoctor || '-'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Sample Collected By</Label>
                  <p className="text-sm break-words">{selectedSample.sampleCollectedBy || '-'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Collected Sample</Label>
                  <p className="text-sm break-words">{selectedSample.collectedSample || '-'}</p>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-500">Tests</Label>
                {Array.isArray(selectedSample.tests) && selectedSample.tests.length > 0 ? (
                  <ul className="list-disc list-inside text-sm">
                    {selectedSample.tests.map((t: any, idx: number) => (
                      <li key={idx}>
                        {t?.name || t?.test || selectedSample.test || '-'}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm">{selectedSample.test || '-'}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Barcodes;
