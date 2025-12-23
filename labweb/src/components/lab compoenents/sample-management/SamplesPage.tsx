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
  Eye, 
  Edit, 
  Trash2,
  ExternalLink, 
  X,
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

const normalizeSampleStatus = (raw: string | undefined | null): "collected" | "processing" | "completed" => {
  const s = String(raw || "").toLowerCase();
  if (s.includes("process")) return "processing";
  if (s.includes("complet")) return "completed";
  return "collected";
};

const SamplesPage: React.FC = () => {
  const { toast } = useToast();
  const modulePerm = getModulePermission('Samples');
  
  // Sample Management state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [samples, setSamples] = useState<any[]>([]);

  // Add Sample Modal state
  const [showAddSampleModal, setShowAddSampleModal] = useState(false);
  const [newSample, setNewSample] = useState({
    patientName: "",
    test: "",
    assignedAnalyzer: "",
    priority: "normal"
  });
  const [isSubmittingNewSample, setIsSubmittingNewSample] = useState(false);

  // Action Modals state
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSample, setSelectedSample] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteSample, setPendingDeleteSample] = useState<any>(null);
  const [editingSample, setEditingSample] = useState({
    patientName: "",
    test: "",
    status: "",
    phone: "",
    cnic: "",
    address: "",
    referringDoctor: "",
    sampleCollectedBy: "",
    collectedSample: "",
  });
  const [isUpdatingSample, setIsUpdatingSample] = useState(false);

  const [processingDialogOpen, setProcessingDialogOpen] = useState(false);
  const [processingTargetSample, setProcessingTargetSample] = useState<any>(null);
  const [processingBy, setProcessingBy] = useState('');
  const [expectedCompletionAt, setExpectedCompletionAt] = useState('');
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  // Load samples from backend
  const loadSamplesFromBackend = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/labtech/samples", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const arr = Array.isArray(res.data) ? res.data : [];
      const mapped = arr.map((s: any) => {
        const testsLabel =
          Array.isArray(s.tests) && s.tests.length
            ? s.tests.map((t: any) => t?.name || t?.test).filter(Boolean).join(", ")
            : s.test || "";
        const statusNorm = normalizeSampleStatus(s.status);
        return {
          // keep full backend sample so dialogs can show all fields
          ...s,
          sampleId: s.sampleNumber || s._id || s.id || "",
          barcode: s.barcode || "",
          patientName: s.patientName || "",
          test: testsLabel,
          status: statusNorm,
          priority: (s?.priority || 'normal'),
          collectionTime: s.createdAt
            ? new Date(s.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "",
        };
      });
      setSamples(mapped);
    } catch (err) {
      console.error("Failed to load samples from backend", err);
    }
  }, []);

  // Helper functions for sample management
  const getStatusBadge = (status: string) => {
    const norm = normalizeSampleStatus(status);
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

  // Initial load from backend
  useEffect(() => {
    loadSamplesFromBackend();
  }, [loadSamplesFromBackend]);

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const formatCountdown = (iso: string | Date | undefined | null) => {
    if (!iso) return '-';
    const dt = new Date(iso as any);
    if (isNaN(dt.getTime())) return '-';
    const diffMs = dt.getTime() - nowTick;
    const abs = Math.abs(diffMs);
    const totalSec = Math.floor(abs / 1000);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    const clock = `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
    const left = days > 0 ? `${days}d ${clock}` : clock;
    return diffMs >= 0 ? left : `Overdue ${left}`;
  };

  const openProcessingDialog = (sample: any) => {
    setProcessingTargetSample(sample);
    setProcessingBy(String(sample?.processingBy || '').trim());
    const existing = sample?.expectedCompletionAt;
    if (existing) {
      const dt = new Date(existing);
      if (!isNaN(dt.getTime())) {
        const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setExpectedCompletionAt(local);
      } else {
        setExpectedCompletionAt('');
      }
    } else {
      setExpectedCompletionAt('');
    }
    setProcessingDialogOpen(true);
  };

  // React to cross-component updates (intake submission, status changes)
  useEffect(() => {
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

  // Search functionality
  const performSearch = useCallback((term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    const searchableFields = samples.flatMap(sample => [
      String((sample as any).barcode || ''),
      String((sample as any).patientName || ''),
      String((sample as any).test || ''),
      String((sample as any).status || '')
    ]);

    const uniqueMatches = [...new Set(
      searchableFields.filter(field => 
        String(field || '').toLowerCase().includes(term.toLowerCase())
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
    const q = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      String((sample as any).barcode || '').toLowerCase().includes(q) ||
      String((sample as any).patientName || '').toLowerCase().includes(q) ||
      String((sample as any).test || '').toLowerCase().includes(q) ||
      String((sample as any).status || '').toLowerCase().includes(q);
    
    const matchesStatus = statusFilter === "All Status" || normalizeSampleStatus(sample.status) === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Action handlers
  const handleViewSample = (sample: any) => {
    setSelectedSample(sample);
    setShowViewModal(true);
  };

  const handleEditSample = (sample: any) => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: "You only have view permission for Samples.", variant: 'destructive' });
      return;
    }
    setSelectedSample(sample);
    setEditingSample({
      patientName: sample.patientName || "",
      test: sample.test || "",
      status: sample.status || "",
      phone: sample.phone || sample.patientPhone || "",
      cnic: sample.cnic || sample.patientCnic || "",
      address: sample.address || "",
      referringDoctor: sample.referringDoctor || "",
      sampleCollectedBy: sample.sampleCollectedBy || "",
      collectedSample: sample.collectedSample || "",
    });
    setShowEditModal(true);
  };

  const handleDeleteSample = async (sample: any) => {
    if (!modulePerm.delete) {
      toast({ title: 'Not allowed', description: "You don't have delete permission for Samples.", variant: 'destructive' });
      return;
    }

    const sampleId = sample?._id || sample?.id;
    if (!sampleId) {
      toast({ title: 'Error', description: 'Sample id not found.', variant: 'destructive' });
      return;
    }

    setPendingDeleteSample(sample);
    setShowDeleteConfirm(true);
    return;
  };

  const confirmDeleteSample = async () => {
    const sample = pendingDeleteSample;
    setShowDeleteConfirm(false);
    setPendingDeleteSample(null);

    if (!sample) return;
    if (!modulePerm.delete) {
      toast({ title: 'Not allowed', description: "You don't have delete permission for Samples.", variant: 'destructive' });
      return;
    }

    const sampleId = sample?._id || sample?.id;
    if (!sampleId) {
      toast({ title: 'Error', description: 'Sample id not found.', variant: 'destructive' });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await api.delete(`/labtech/samples/${sampleId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      toast({ title: 'Deleted', description: 'Sample deleted successfully.' });
      await loadSamplesFromBackend();
    } catch (err) {
      console.error('Failed to delete sample', err);
      toast({ title: 'Error', description: 'Failed to delete sample.', variant: 'destructive' });
    }
  };

  // export/print functionality removed from SamplesPage actions

  // Update sample status for tracking (moved from Barcodes)
  const handleUpdateStatus = async (
    sample: any,
    newStatus: "collected" | "processing" | "completed"
  ) => {
    if (newStatus === 'processing') {
      openProcessingDialog(sample);
      return;
    }
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: 'You only have view permission for Samples.', variant: 'destructive' });
      return;
    }
    const sampleId = sample?._id || sample?.id;
    if (!sampleId) {
      toast({
        title: "Cannot update status",
        description: "This row has no backend sample id. Please reload Samples or use Token Generation.",
        variant: "destructive",
      });
      await loadSamplesFromBackend();
      return;
    }

    const nowIso = new Date().toISOString();

    // Optimistic UI update
    setSamples((prev) => {
      return prev.map((s) => {
        if ((s as any)._id !== sampleId && (s as any).id !== sampleId) return s;
        const next: any = { ...s, status: newStatus, updatedAt: nowIso };
        if (newStatus === "completed") {
          if (!next.processedAt) {
            next.processedAt = nowIso;
          }
          next.completedAt = nowIso;
        }
        return next;
      });
    });

    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const payload: any = { status: newStatus, sampleStatus: newStatus };
      if (newStatus === "completed") {
        payload.processedAt = (sample as any).processedAt || nowIso;
        payload.completedAt = nowIso;
      }

      const primaryUrl = `/labtech/samples/${sampleId}`;
      const altId = (sample as any).sampleNumber || (sample as any).barcode;
      const altUrl = altId && String(altId) !== String(sampleId) ? `/labtech/samples/${altId}` : null;

      try {
        await api.patch(primaryUrl, payload, { headers });
      } catch (e: any) {
        const code = e?.response?.status;
        if (code === 404 && altUrl) {
          await api.patch(altUrl, payload, { headers });
        } else {
          throw e;
        }
      }

      try {
        window.dispatchEvent(new Event("samplesChanged"));
      } catch {}

      toast({
        title: "Status Updated",
        description: `Sample ${(sample as any).sampleNumber || (sample as any).sampleId || (sample as any).barcode || ''} marked as ${newStatus}.`,
      });
    } catch (err: any) {
      console.error("Failed to update sample status in backend", err?.response?.data || err);
      await loadSamplesFromBackend();
      const code = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || 'Request failed';
      toast({
        title: "Error",
        description: `Failed to update sample status (HTTP ${code || 'n/a'}). ${msg}`,
        variant: "destructive",
      });
    }
  };

  const handleStartProcessing = async () => {
    const sample = processingTargetSample;
    if (!sample) return;
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: 'You only have view permission for Samples.', variant: 'destructive' });
      return;
    }
    const sampleId = sample?._id || sample?.id;
    if (!sampleId) {
      toast({ title: 'Error', description: 'Sample id not found.', variant: 'destructive' });
      return;
    }
    const by = String(processingBy || '').trim();
    if (!by) {
      toast({ title: 'Error', description: 'Processing by is required.', variant: 'destructive' });
      return;
    }
    if (!expectedCompletionAt) {
      toast({ title: 'Error', description: 'Expected Completed Time/Days is required.', variant: 'destructive' });
      return;
    }

    const expectedIso = new Date(expectedCompletionAt).toISOString();
    const nowIso = new Date().toISOString();

    setProcessingDialogOpen(false);

    setSamples((prev) => {
      return prev.map((s) => {
        if ((s as any)._id !== sampleId && (s as any).id !== sampleId) return s;
        return {
          ...s,
          status: 'processing',
          processedAt: (s as any).processedAt || nowIso,
          processingBy: by,
          expectedCompletionAt: expectedIso,
          updatedAt: nowIso,
        };
      });
    });

    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      const payload: any = {
        status: 'processing',
        sampleStatus: 'processing',
        processedAt: (sample as any).processedAt || nowIso,
        processingBy: by,
        expectedCompletionAt: expectedIso,
      };

      const primaryUrl = `/labtech/samples/${sampleId}`;
      const altId = (sample as any).sampleNumber || (sample as any).barcode;
      const altUrl = altId && String(altId) !== String(sampleId) ? `/labtech/samples/${altId}` : null;

      try {
        await api.patch(primaryUrl, payload, { headers });
      } catch (e: any) {
        const code = e?.response?.status;
        if (code === 404 && altUrl) {
          await api.patch(altUrl, payload, { headers });
        } else {
          throw e;
        }
      }

      try {
        window.dispatchEvent(new Event("samplesChanged"));
      } catch {}

      toast({
        title: 'Processing Started',
        description: `Sample ${(sample as any).sampleNumber || (sample as any).sampleId || (sample as any).barcode || ''} marked as processing.`,
      });
    } catch (err: any) {
      console.error("Failed to start processing in backend", err?.response?.data || err);
      await loadSamplesFromBackend();
      const code = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || 'Request failed';
      toast({
        title: 'Error',
        description: `Failed to start processing (HTTP ${code || 'n/a'}). ${msg}`,
        variant: 'destructive',
      });
    } finally {
      setProcessingTargetSample(null);
      setProcessingBy('');
      setExpectedCompletionAt('');
    }
  };

  // Add Sample Modal handlers
  const openAddSampleModal = () => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: "You only have view permission for Samples.", variant: 'destructive' });
      return;
    }
    setNewSample({
      patientName: "",
      test: "",
      assignedAnalyzer: "",
      priority: "normal"
    });
    setShowAddSampleModal(true);
  };

  const handleAddSample = async () => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: "You only have view permission for Samples.", variant: 'destructive' });
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
      // Generate new sample data
      const newSampleData = {
        barcode: `LAB-2024-${String(samples.length + 1).padStart(3, '0')}`,
        patientName: newSample.patientName,
        test: newSample.test,
        status: "collected",
        assignedAnalyzer: newSample.assignedAnalyzer,
        collectionTime: new Date().toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      };

      // Add to samples list and persist as mock data
      setSamples(prev => {
        const updated = [...prev, newSampleData];
        try {
          localStorage.setItem("samplesPageSamples", JSON.stringify(updated));
        } catch {
          // ignore storage errors
        }
        return updated;
      });
      
      toast({
        title: "Success",
        description: `Sample ${newSampleData.barcode} added successfully`,
      });

      setShowAddSampleModal(false);
      setNewSample({
        patientName: "",
        test: "",
        assignedAnalyzer: "",
        priority: "normal"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add sample",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingNewSample(false);
    }
  };

  // Edit Sample Modal handlers
  const handleUpdateSample = async () => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: "You only have view permission for Samples.", variant: 'destructive' });
      return;
    }
    if (!editingSample.patientName) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsUpdatingSample(true);
    try {
      // Backend-driven update: PATCH the sample on the server
      if (!selectedSample || !selectedSample._id && !selectedSample.id) {
        throw new Error("Missing sample identifier for update");
      }

      const sampleId = selectedSample._id || selectedSample.id;
      const token = localStorage.getItem("token");

      const payload: any = {
        patientName: editingSample.patientName,
        phone: editingSample.phone,
        cnic: editingSample.cnic,
        address: editingSample.address,
        referringDoctor: editingSample.referringDoctor,
        sampleCollectedBy: editingSample.sampleCollectedBy,
        collectedSample: editingSample.collectedSample,
      };

      // If backend expects tests array, we keep existing tests and only adjust label/test name here.
      if (Array.isArray(selectedSample.tests) && selectedSample.tests.length > 0) {
        payload.tests = selectedSample.tests;
      } else {
        payload.test = editingSample.test;
      }

      const res = await api.patch(`/labtech/samples/${sampleId}`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      const updatedFromBackend = res.data;

      // Merge backend response into local samples list
      setSamples(prev => {
        return prev.map(sample => {
          const sameId = (sample._id && updatedFromBackend._id && sample._id === updatedFromBackend._id)
            || (sample.id && updatedFromBackend.id && sample.id === updatedFromBackend.id);
          const sameBarcode = !sameId && sample.barcode && updatedFromBackend.sampleNumber
            ? sample.barcode === updatedFromBackend.sampleNumber
            : sample.barcode === updatedFromBackend.barcode;

          if (!sameId && !sameBarcode) return sample;

          const testsLabel =
            Array.isArray(updatedFromBackend.tests) && updatedFromBackend.tests.length
              ? updatedFromBackend.tests.map((t: any) => t?.name || t?.test).filter(Boolean).join(", ")
              : updatedFromBackend.test || editingSample.test;

          return {
            ...sample,
            ...updatedFromBackend,
            barcode: updatedFromBackend.sampleNumber || updatedFromBackend.barcode || sample.barcode,
            patientName: updatedFromBackend.patientName || editingSample.patientName,
            test: testsLabel,
            status: updatedFromBackend.status || sample.status,
            phone: updatedFromBackend.phone || editingSample.phone,
            patientPhone: updatedFromBackend.patientPhone || editingSample.phone,
            cnic: updatedFromBackend.cnic || editingSample.cnic,
            patientCnic: updatedFromBackend.patientCnic || editingSample.cnic,
            address: updatedFromBackend.address ?? editingSample.address,
          };
        });
      });

      toast({
        title: "Success",
        description: `Sample ${selectedSample.barcode} updated successfully`,
      });

      setShowEditModal(false);
      setSelectedSample(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update sample",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingSample(false);
      setShowEditModal(false);
    }
  };

  return (
    <div className="space-y-8 p-6">
      {/* Page Header */}
      <div className="space-y-2 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Samples</h1>
        <p className="text-sm text-muted-foreground">Manage and track all laboratory samples in one place</p>
      </div>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Sample Management</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-6 pt-0">
          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by barcode, patient name, test, or status..."
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

          {/* Samples Count and Search Results */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {searchTerm ? (
                <span>
                  Found <strong>{filteredSamples.length}</strong> sample{filteredSamples.length !== 1 ? 's' : ''} 
                  {statusFilter !== "All Status" && ` with status "${statusFilter}"`}
                  {searchTerm && ` matching "${searchTerm}"`}
                </span>
              ) : (
                <span>
                  Samples ({filteredSamples.length})
                  {statusFilter !== "All Status" && ` - Filtered by: ${statusFilter}`}
                </span>
              )}
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
          <div className="border rounded-lg overflow-hidden mt-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sample ID</TableHead>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Test(s)</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Collection Date/Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expected Completion Time/Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSamples.map((sample) => (
                  <TableRow key={sample._id || sample.id || sample.sampleNumber || sample.sampleId || sample.barcode}>
                    <TableCell className="font-medium">{sample.sampleNumber || sample.sampleId || sample._id || sample.id || '-'}</TableCell>
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
                    <TableCell className="capitalize">{sample.priority || 'normal'}</TableCell>
                    <TableCell>
                      {(() => {
                        const raw = (sample as any).createdAt || (sample as any).collectionTime;
                        if (!raw) return <span>-</span>;
                        try {
                          const dt = new Date(raw);
                          if (!isNaN(dt.getTime())) {
                            return (
                              <div className="space-y-0.5">
                                <div className="text-xs text-gray-600">{dt.toLocaleDateString()}</div>
                                <div className="text-xs font-mono">{dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                              </div>
                            );
                          }
                        } catch {
                          // ignore
                        }
                        return <span className="text-xs text-gray-700">{String(raw)}</span>;
                      })()}
                    </TableCell>
                    <TableCell>{getStatusBadge(sample.status)}</TableCell>
                    <TableCell>
                      {(() => {
                        const norm = normalizeSampleStatus(sample.status);
                        if (norm === 'completed') {
                          const doneAt = sample.completedAt || sample.updatedAt;
                          if (!doneAt) return <span>-</span>;
                          try {
                            return <span className="text-xs text-gray-700">{new Date(doneAt).toLocaleString()}</span>;
                          } catch {
                            return <span>-</span>;
                          }
                        }

                        if (sample.expectedCompletionAt) {
                          return (
                            <div className="space-y-0.5">
                              <div className="text-xs text-gray-600">
                                {(() => {
                                  try {
                                    return new Date(sample.expectedCompletionAt).toLocaleString();
                                  } catch {
                                    return '-';
                                  }
                                })()}
                              </div>
                              <div className="text-xs font-mono">
                                {formatCountdown(sample.expectedCompletionAt)}
                              </div>
                            </div>
                          );
                        }

                        return <span>-</span>;
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              title="Update status"
                              disabled={!modulePerm.edit}
                              className={
                                !modulePerm.edit
                                  ? 'opacity-50 cursor-not-allowed border-blue-800 text-blue-800'
                                  : 'border-blue-800 text-blue-800 hover:bg-blue-50'
                              }
                              onClick={() => {
                                if (!modulePerm.edit) {
                                  toast({ title: 'Not allowed', description: 'You only have view permission for Samples.', variant: 'destructive' });
                                }
                              }}
                            >
                              Update Status
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(() => {
                              const raw = String(sample?.status || '').toLowerCase();
                              const current: "collected" | "processing" | "completed" =
                                raw.includes('complet') ? 'completed' : raw.includes('process') ? 'processing' : 'collected';
                              return (
                                <>
                                  <DropdownMenuItem
                                    disabled={!modulePerm.edit || current === 'collected' || current === 'completed'}
                                    onClick={() => handleUpdateStatus(sample, 'collected')}
                                  >
                                    Collected
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    disabled={!modulePerm.edit || current === 'processing'}
                                    onClick={() => handleUpdateStatus(sample, 'processing')}
                                  >
                                    Processing
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    disabled={!modulePerm.edit || current === 'completed'}
                                    onClick={() => handleUpdateStatus(sample, 'completed')}
                                  >
                                    Completed
                                  </DropdownMenuItem>
                                </>
                              );
                            })()}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleViewSample(sample)}
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditSample(sample)}
                          title="Edit sample"
                          disabled={!modulePerm.edit}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteSample(sample)}
                          title="Delete sample"
                          disabled={!modulePerm.delete}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredSamples.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Search className="w-10 h-10 text-gray-300" />
                        <p>No samples available yet</p>
                        <p className="text-xs text-gray-400">New samples from Intake will appear here automatically</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={processingDialogOpen} onOpenChange={(open) => { if (!open) { setProcessingDialogOpen(false); setProcessingTargetSample(null); } }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Processing Details</DialogTitle>
            <DialogDescription>
              Enter processing information before starting processing.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Processing by</Label>
              <Input
                value={processingBy}
                onChange={(e) => setProcessingBy(e.target.value)}
                placeholder="Enter name"
              />
            </div>
            <div className="grid gap-2">
              <Label>Expected Completed Time/Days</Label>
              <Input
                type="datetime-local"
                value={expectedCompletionAt}
                onChange={(e) => setExpectedCompletionAt(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setProcessingDialogOpen(false);
                setProcessingTargetSample(null);
                setProcessingBy('');
                setExpectedCompletionAt('');
              }}
            >
              Cancel
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleStartProcessing}>
              Start Processing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Sample Modal */}
      <Dialog open={showAddSampleModal} onOpenChange={setShowAddSampleModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Sample</DialogTitle>
            <DialogDescription>
              Enter the details for the new sample.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="patientName" className="text-right">
                Patient Name *
              </Label>
              <Input
                id="patientName"
                value={newSample.patientName}
                onChange={(e) => setNewSample({...newSample, patientName: e.target.value})}
                className="col-span-3"
                placeholder="Enter patient name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="test" className="text-right">
                Test *
              </Label>
              <Select value={newSample.test} onValueChange={(value) => setNewSample({...newSample, test: value})}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select test" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Complete Blood Count">Complete Blood Count</SelectItem>
                  <SelectItem value="Lipid Profile">Lipid Profile</SelectItem>
                  <SelectItem value="Liver Function Test">Liver Function Test</SelectItem>
                  <SelectItem value="Kidney Function Test">Kidney Function Test</SelectItem>
                  <SelectItem value="Thyroid Profile">Thyroid Profile</SelectItem>
                  <SelectItem value="Blood Sugar">Blood Sugar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="analyzer" className="text-right">
                Analyzer *
              </Label>
              <Select value={newSample.assignedAnalyzer} onValueChange={(value) => setNewSample({...newSample, assignedAnalyzer: value})}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select analyzer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mindray BC 700">Mindray BC 700</SelectItem>
                  <SelectItem value="Abbott Architect">Abbott Architect</SelectItem>
                  <SelectItem value="Roche Cobas">Roche Cobas</SelectItem>
                  <SelectItem value="Sysmex XN-1000">Sysmex XN-1000</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="priority" className="text-right">
                Priority
              </Label>
              <Select value={newSample.priority} onValueChange={(value) => setNewSample({...newSample, priority: value})}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="stat">STAT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSampleModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSample} disabled={isSubmittingNewSample}>
              {isSubmittingNewSample ? "Adding..." : "Add Sample"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Sample</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this sample permanently?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setPendingDeleteSample(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteSample}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Sample Modal */}
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

      {/* Edit Sample Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="w-full max-w-lg sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Edit Sample</DialogTitle>
            <DialogDescription>
              Update the editable fields for this sample. Barcode and status are read-only.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {selectedSample && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                  <Label className="sm:text-right text-xs sm:text-sm">Sample ID</Label>
                  <p className="sm:col-span-3 text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                    {selectedSample.barcode}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                  <Label className="sm:text-right text-xs sm:text-sm">Phone</Label>
                  <Input
                    value={editingSample.phone}
                    onChange={(e) => setEditingSample({ ...editingSample, phone: e.target.value })}
                    className="sm:col-span-3"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                  <Label className="sm:text-right text-xs sm:text-sm">CNIC</Label>
                  <Input
                    value={editingSample.cnic}
                    onChange={(e) => setEditingSample({ ...editingSample, cnic: e.target.value })}
                    className="sm:col-span-3"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                  <Label className="sm:text-right text-xs sm:text-sm">Address</Label>
                  <Input
                    value={editingSample.address}
                    onChange={(e) => setEditingSample({ ...editingSample, address: e.target.value })}
                    className="sm:col-span-3"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                  <Label className="sm:text-right text-xs sm:text-sm">Ref Doctor</Label>
                  <Input
                    value={editingSample.referringDoctor}
                    onChange={(e) => setEditingSample({ ...editingSample, referringDoctor: e.target.value })}
                    className="sm:col-span-3"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                  <Label className="sm:text-right text-xs sm:text-sm">Collected By</Label>
                  <Input
                    value={editingSample.sampleCollectedBy}
                    onChange={(e) => setEditingSample({ ...editingSample, sampleCollectedBy: e.target.value })}
                    className="sm:col-span-3"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                  <Label className="sm:text-right text-xs sm:text-sm">Sample</Label>
                  <Input
                    value={editingSample.collectedSample}
                    onChange={(e) => setEditingSample({ ...editingSample, collectedSample: e.target.value })}
                    className="sm:col-span-3"
                  />
                </div>
              </>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label htmlFor="editPatientName" className="text-right">
                Patient Name *
              </Label>
              <Input
                id="editPatientName"
                value={editingSample.patientName}
                onChange={(e) => setEditingSample({...editingSample, patientName: e.target.value})}
                className="sm:col-span-3"
              />
            </div>
            
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSample} disabled={isUpdatingSample}>
              {isUpdatingSample ? "Updating..." : "Update Sample"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SamplesPage;
