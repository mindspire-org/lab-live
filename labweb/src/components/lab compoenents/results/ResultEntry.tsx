import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { TestType } from "@/types/sample";
import { AlertTriangle, CheckCircle, Send, ArrowLeft, Search, Plus, Trash, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

interface ResultEntryProps {
  onNavigateBack?: () => void;
}

export interface BackendSample {
  _id: string;
  patientName: string;
  phone: string;
  tests: TestType[];
  status: "collected" | "processing" | "completed";
  results?: BackendResult[];
  interpretation?: string;
  age?: string;
  gender?: string;
}

export interface BackendResult {
  parameterId: string;
  value: number | string | null;
  comment?: string;
  isAbnormal?: boolean;
  isCritical?: boolean;
  // optional fields for manual/custom rows and robustness in reports
  label?: string;
  unit?: string;
  normalText?: string;
}

export interface TestParameter {
  id: string;
  name: string;
  unit: string;
  normalRange: { min?: number; max?: number };
  // optional group-specific ranges (may be string like "4-11" or object)
  normalRangeMale?: any;
  normalRangeFemale?: any;
  normalRangePediatric?: any;
  criticalRange?: { min: number; max: number };
}

const ResultEntryClean = ({ onNavigateBack }: ResultEntryProps) => {
  const { toast } = useToast();
  const modulePerm = getModulePermission('Result Entry');
  const viewOnly = !modulePerm.edit;
  const [samples, setSamples] = useState<BackendSample[]>([]);
  const [selectedSample, setSelectedSample] = useState<BackendSample | null>(null);
  const [results, setResults] = useState<BackendResult[]>([]);
  const [interpretation, setInterpretation] = useState("");
  const [testInterpretations, setTestInterpretations] = useState<Record<string, string>>({});
  const [testCollectedSamples, setTestCollectedSamples] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [rowStatusMap, setRowStatusMap] = useState<Record<string, string>>({});

  // Dynamic parameter list fetched per selected test
  const [testParameters, setTestParameters] = useState<TestParameter[]>([]);
  // Grouped by test so we can render tabs
  type TestWithParams = { key: string; name: string; parameters: TestParameter[] };
  const [testsWithParams, setTestsWithParams] = useState<TestWithParams[]>([]);
  // Derived reference group (read-only UI)
  const [referenceGroup, setReferenceGroup] = useState<'male' | 'female' | 'pediatric'>('male');
  const [patientAge, setPatientAge] = useState<number | ''>('');
  const [patientSex, setPatientSex] = useState<'male' | 'female' | ''>('');
  // Track raw input strings so users can type freely (including empty string)
  const [resultInputs, setResultInputs] = useState<Record<string, string>>({});
  const [hiddenParameterIds, setHiddenParameterIds] = useState<string[]>([]);

  // Custom/manual rows
  type ManualRow = { id: string; name: string; unit: string; normalText: string };
  const [manualRows, setManualRows] = useState<ManualRow[]>([]);
  // Track which test tab is active so new rows go to the correct test
  const [activeTestKey, setActiveTestKey] = useState<string | null>(null);

  const buildNormalTextForParam = (p: any): string => {
    if (!p) return '';
    const pick = referenceGroup === 'male' ? p.normalRangeMale
      : referenceGroup === 'female' ? p.normalRangeFemale
        : p.normalRangePediatric;
    if (typeof pick === 'string' && pick.trim()) return pick.trim();
    const nr = p.normalRange;
    if (nr && (typeof nr.min !== 'undefined' || typeof nr.max !== 'undefined')) {
      const min = typeof nr.min === 'number' ? `${nr.min}` : '';
      const max = typeof nr.max === 'number' ? `${nr.max}` : '';
      const parts = [min, max].filter(Boolean);
      return parts.length ? parts.join(' - ') : '';
    }
    return '';
  };

  // ResultEntry is now fully backend-driven; samples are always loaded from /labtech/samples

  const fetchParameters = async (testKey: string) => {
    const mapParams = (data: any) =>
      (data?.parameters || []).map((p: any, idx: number) => ({
        id: p?.id || (p?.name || p?.unit ? `${p?.name || ''}|${p?.unit || ''}` : `p_${idx}`),
        name: p?.name,
        unit: p?.unit,
        normalRange: p?.normalRange || { min: undefined, max: undefined },
        normalRangeMale: p?.normalRangeMale || p?.normalRange_male || null,
        normalRangeFemale: p?.normalRangeFemale || p?.normalRange_female || null,
        normalRangePediatric: p?.normalRangePediatric || p?.normalRange_pediatric || null,
        criticalRange: p?.criticalRange || undefined,
      }));

    // Try common endpoints first
    try {
      const { data } = await api.get(`/tests/${testKey}`);
      setTestParameters(mapParams(data));
      return;
    } catch {}
    try {
      const { data } = await api.get(`/labtech/tests/${testKey}`);
      setTestParameters(mapParams(data));
      return;
    } catch {}

    // If testKey looks like a name (not an ObjectId), try name-based search
    try {
      if (typeof testKey === 'string' && !/^[a-f\d]{24}$/i.test(testKey)) {
        const { data } = await api.get(`/tests`);
        const match = Array.isArray(data)
          ? data.find((t: any) => String(t?.name || '').toLowerCase() === testKey.toLowerCase())
          : null;
        if (match) {
          setTestParameters(mapParams(match));
          return;
        }
      }
    } catch {}

    toast({ title: "Error", description: "Failed to load test parameters", variant: "destructive" });
  };

  const handleDeleteParameterRow = (parameterId: string) => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: 'You only have view permission for Result Entry.', variant: 'destructive' });
      return;
    }
    setHiddenParameterIds(prev => (prev.includes(parameterId) ? prev : [...prev, parameterId]));
    setResults(prev => prev.filter(r => r.parameterId !== parameterId));
    setResultInputs(prev => {
      const next = { ...prev };
      delete next[parameterId];
      return next;
    });
  };

  // Derived counters for summary
  const criticalCount = results.filter(r => r.isCritical).length;
  const abnormalCount = results.filter(r => !r.isCritical && r.isAbnormal).length;

  // Auto-select reference group from selected sample demographics
  useEffect(() => {
    if (!selectedSample) {
      setTestsWithParams([]);
      setTestInterpretations({});
      setTestCollectedSamples({});
      setActiveTestKey(null);
      return;
    }
    // reset per-sample UI state
    setManualRows([]);
    if (selectedSample.gender) {
      const g = selectedSample.gender.toLowerCase();
      if (g === 'male' || g === 'm') { setPatientSex('male'); setReferenceGroup('male'); }
      if (g === 'female' || g === 'f') { setPatientSex('female'); setReferenceGroup('female'); }
    }
    if (selectedSample.age) {
      const years = parseFloat(selectedSample.age);
      if (!isNaN(years)) {
        setPatientAge(years);
        if (years < 13) setReferenceGroup('pediatric');
      }
    }
    // Load parameter definitions for all tests in this sample so units and normal ranges auto-fill
    const loadParamsForSample = async () => {
      try {
        const sampleTests = (selectedSample.tests || []) as any[];
        if (!sampleTests.length) { setTestParameters([]); setTestsWithParams([]); return; }

        // Fetch all tests once from backend and match only the ones used in this sample
        const { data } = await api.get('/tests');
        const allTests = Array.isArray(data) ? data : [];
        if (!allTests.length) { setTestParameters([]); setTestsWithParams([]); return; }

        const mappedTests: TestWithParams[] = [];
        const flatParams: any[] = [];

        sampleTests.forEach((t: any, idx: number) => {
          const rawName = typeof t === 'string' ? t : (t?.name || t?.testName || '');
          const name = rawName || `Test ${idx + 1}`;
          const key = (typeof t === 'string' ? rawName : (t?._id || t?.id || t?.test)) || name || `test-${idx}`;
          if (!name) return;

          const match = allTests.find((test: any) => String(test?.name || '').toLowerCase() === name.toLowerCase());
          const paramsSrc = (match?.parameters || []) as any[];
          const mappedParams = paramsSrc.map((p: any, pIdx: number) => ({
            id: p?.id || (p?.name || p?.unit ? `${p?.name || ''}|${p?.unit || ''}` : `p_${pIdx}`),
            name: p?.name,
            unit: p?.unit,
            normalRange: p?.normalRange || { min: undefined, max: undefined },
            normalRangeMale: p?.normalRangeMale || null,
            normalRangeFemale: p?.normalRangeFemale || null,
            normalRangePediatric: p?.normalRangePediatric || null,
            criticalRange: p?.criticalRange || undefined,
          }));

          if (mappedParams.length) {
            mappedTests.push({ key: String(key), name, parameters: mappedParams as any });
            flatParams.push(...mappedParams);
          }
        });

        // Fallback: if we couldn't map any tests, clear grouped view but keep previous flat behavior
        if (!mappedTests.length) {
          setTestsWithParams([]);
        } else {
          setTestsWithParams(mappedTests);
          // default active tab to first test when mapping succeeds
          setActiveTestKey(String(mappedTests[0]?.key || ''));

          // Auto-create rows for each parameter so Select/Edit dialogs show full parameter list
          const autoRows: ManualRow[] = [];
          mappedTests.forEach((t) => {
            const prefix = `${String(t.key)}::`;
            (t.parameters || []).forEach((p: any) => {
              const rowId = `${prefix}${String(p.id)}`;
              autoRows.push({
                id: rowId,
                name: String(p.name || ''),
                unit: String(p.unit || ''),
                normalText: buildNormalTextForParam(p),
              });
            });
          });
          setManualRows((prev) => {
            const existing = new Set((prev || []).map((r) => r.id));
            const merged = [...(prev || [])];
            autoRows.forEach((r) => {
              if (!existing.has(r.id)) merged.push(r);
            });
            return merged;
          });
        }

        // Merge and de-duplicate flat params for range/submit logic
        const merged: any[] = [];
        const seen = new Set<string>();
        flatParams.forEach((p: any) => {
          const key = p?.id || `${p?.name || ''}|${p?.unit || ''}`;
          if (key && !seen.has(key)) { seen.add(key); merged.push(p); }
        });

        setTestParameters(merged as any);
      } catch {
        toast({ title: 'Error', description: 'Failed to load parameters for sample tests', variant: 'destructive' });
      }
    };
    // reset raw input cache and hidden parameters when sample changes
    setResultInputs({});
    setHiddenParameterIds([]);
    setRowStatusMap({});
    // hydrate per-test interpretations from sample if present
    const anySample: any = selectedSample as any;
    if (Array.isArray(anySample.interpretations)) {
      const map: Record<string, string> = {};
      const csMap: Record<string, string> = {};
      anySample.interpretations.forEach((it: any) => {
        if (!it) return;
        const key = String(it.testKey || it.testName || "");
        if (!key) return;
        map[key] = it.text || "";
        if (typeof it.collectedSample === 'string') {
          csMap[key] = it.collectedSample;
        }
      });
      setTestInterpretations(map);
      setTestCollectedSamples(csMap);
    } else {
      setTestInterpretations({});
      setTestCollectedSamples({});
    }
    loadParamsForSample();
  }, [selectedSample]);

  const loadSamples = () => {
    const token = localStorage.getItem('token');
    api
      .get<BackendSample[]>("/labtech/samples", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      .then(({ data }) => {
        const listRaw = Array.isArray(data) ? data : [];
        const normalized = listRaw.map((s: any) => {
          const st = String(s?.status || '').toLowerCase();
          const normStatus: any = st.includes('complet') ? 'completed' : st.includes('process') ? 'processing' : 'collected';
          return { ...s, status: normStatus };
        });
        const completedOnly = normalized.filter((s: any) => s.status === 'completed');
        setSamples(completedOnly as any);
      })
      .catch((err) => {
        console.error('Failed to load samples for ResultEntry', err);
        setSamples([]);
      });
  };

  useEffect(() => {
    loadSamples();
  }, []);

  useEffect(() => {
    const onChange = () => loadSamples();
    try {
      window.addEventListener('samplesChanged', onChange);
      window.addEventListener('sampleSubmitted', onChange);
    } catch {}
    return () => {
      try {
        window.removeEventListener('samplesChanged', onChange);
        window.removeEventListener('sampleSubmitted', onChange);
      } catch {}
    };
  }, []);

  // helper to get numeric min/max from parameter based on group
  const getGroupRange = (param: any): { min?: number; max?: number } => {
    const pick = referenceGroup === 'male' ? param.normalRangeMale
      : referenceGroup === 'female' ? param.normalRangeFemale
        : param.normalRangePediatric;
    const toRange = (r: any): { min?: number; max?: number } | null => {
      if (!r) return null;
      if (typeof r === 'object' && (typeof r.min === 'number' || typeof r.max === 'number')) return { min: r.min, max: r.max };
      if (typeof r === 'string') {
        const m = r.match(/(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)/);
        if (m) return { min: parseFloat(m[1]), max: parseFloat(m[2]) };
      }
      return null;
    };
    return toRange(pick) || param.normalRange || {};
  };

  const updateResult = (parameterId: string, value: string) => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: 'You only have view permission for Result Entry.', variant: 'destructive' });
      return;
    }
    // cache raw input so user can type freely
    setResultInputs(prev => ({ ...prev, [parameterId]: value }));
    const param: any = testParameters.find((p: any) => p.id === parameterId);
    if (value === '') {
      // allow clearing the field; keep entry with null value and clear flags
      setResults(prev => {
        const existing = prev.find(r => r.parameterId === parameterId);
        if (existing) return prev.map(r => (r.parameterId === parameterId ? { ...r, value: null as any } : r));
        return [...prev, { parameterId, value: null as any }];
      });
      return;
    }
    const normalized = value.trim();
    const num = parseFloat(normalized.replace(/,/g, "."));
    if (normalized !== '' && isNaN(num)) {
      // qualitative value: save as string and clear flags
      setResults(prev => {
        const existing = prev.find(r => r.parameterId === parameterId);
        if (existing) return prev.map(r => (r.parameterId === parameterId ? { ...r, value: normalized } : r));
        return [...prev, { parameterId, value: normalized }];
      });
      return;
    }
    setResults((prev) => {
      const existing = prev.find((r) => r.parameterId === parameterId);
      if (existing) {
        return prev.map((r) => (r.parameterId === parameterId ? { ...r, value: num } : r));
      }
      return [...prev, { parameterId, value: num }];
    });
  };

  const updateComment = (parameterId: string, comment: string) => {
    setResults((prev) => {
      const existing = prev.find(r => r.parameterId === parameterId);
      if (existing) return prev.map(r => (r.parameterId === parameterId ? { ...r, comment } : r));
      // create entry if not exists so comments are allowed before numeric value
      return [...prev, { parameterId, value: null as any, comment }];
    });
  };



  const handleSubmit = async () => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: 'You only have view permission for Result Entry.', variant: 'destructive' });
      return;
    }
    if (!selectedSample) return;
    setSubmitting(true);
    try {
      // helper to build normal range string like in the table
      const buildNormalText = (p: any): string => {
        if (!p) return '';
        const pick = referenceGroup === 'male' ? p.normalRangeMale
          : referenceGroup === 'female' ? p.normalRangeFemale
            : p.normalRangePediatric;
        const toRangeText = (rng: any): string => {
          if (!rng) return '';
          if (typeof rng === 'string') return rng;
          if (typeof rng === 'object' && (typeof rng.min !== 'undefined' || typeof rng.max !== 'undefined')) {
            const min = typeof rng.min === 'number' ? `${rng.min}` : '';
            const max = typeof rng.max === 'number' ? `${rng.max}` : '';
            const parts = [min, max].filter(Boolean);
            return parts.length ? parts.join(' - ') : '';
          }
          return '';
        };
        const fromGroup = toRangeText(p.normalRangeMale && referenceGroup === 'male' ? p.normalRangeMale
          : p.normalRangeFemale && referenceGroup === 'female' ? p.normalRangeFemale
            : p.normalRangePediatric && referenceGroup === 'pediatric' ? p.normalRangePediatric : null);
        if (fromGroup) return fromGroup;
        return toRangeText(p.normalRange);
      };

      // enrich existing results with label/unit/normalText for auto parameters and manual rows
      const enrichedResults: BackendResult[] = results.map(r => {
        const fromParam: any = testParameters.find(p => p.id === r.parameterId);
        const fromManual = manualRows.find(m => m.id === r.parameterId);
        let label = r.label;
        let unit = r.unit;
        let normalText = r.normalText;
        if (fromParam) {
          label = label || fromParam.name;
          unit = unit || fromParam.unit;
          normalText = normalText || buildNormalText(fromParam);
        }
        if (fromManual) {
          label = fromManual.name || label;
          unit = fromManual.unit || unit;
          normalText = fromManual.normalText || normalText;
        }
        return { ...r, label, unit, normalText };
      });

      const mergedResults = [
        ...enrichedResults,
        // add any manual rows that don't yet have a result entry
        ...manualRows
          .filter(r => !enrichedResults.some(er => er.parameterId === r.id))
          .map(r => ({
            parameterId: r.id,
            value: (results.find(x => x.parameterId === r.id)?.value) ?? null,
            comment: (results.find(x => x.parameterId === r.id)?.comment) ?? undefined,
            label: r.name,
            unit: r.unit,
            normalText: r.normalText,
          })),
      ];
      // keep only rows that have a value (number or non-empty string)
      const cleaned = mergedResults.filter(r => {
        const v: any = (r as any).value;
        return v !== null && v !== undefined && String(v).trim() !== '';
      });
      if (cleaned.length === 0) {
        toast({ title: 'No results', description: 'Please enter at least one result value before submitting.', variant: 'destructive' });
        return;
      }

      // Build per-test interpretations array, aligned with testsWithParams
      const interpretationsPayload = (testsWithParams || []).map(t => ({
        testKey: String(t.key || ''),
        testName: String(t.name || ''),
        text: (testInterpretations[String(t.key || '')] || '').trim(),
        collectedSample: (testCollectedSamples[String(t.key || '')] || '').trim(),
      })).filter(it => it.testKey || it.text || it.collectedSample); // keep entries that have key/text/sample

      const token = localStorage.getItem('token');
      try {
        await api.patch(`/labtech/samples/${selectedSample._id}`, { results: cleaned, interpretation, interpretations: interpretationsPayload, status: "completed", editExisting: isEditing }, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
      } catch (err: any) {
        if (err?.response?.status === 404) {
          const altId = (selectedSample as any).sampleNumber || (selectedSample as any).barcode;
          if (altId && String(altId) !== String(selectedSample._id)) {
            await api.patch(`/labtech/samples/${altId}`, { results: cleaned, interpretation, interpretations: interpretationsPayload, status: "completed", editExisting: isEditing }, {
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }
      toast({ title: isEditing ? "Updated" : "Submitted", description: isEditing ? "Results updated for this sample" : "Results submitted and sample marked completed" });
      // Optimistically mark the row as submitted to prevent re-entry without waiting for reload
      try {
        const selId = String((selectedSample as any)._id || '');
        const selNum = String(((selectedSample as any).sampleNumber || (selectedSample as any).barcode || ''));
        setSamples(prev => (prev || []).map((row: any) => {
          const match = String((row as any)._id || '') === selId || String((row as any).sampleNumber || (row as any).barcode || '') === selNum;
          return match ? { ...row, status: 'completed', results: cleaned } : row;
        }));
      } catch {}
      setSelectedSample(null);
      setResults([]);
      setInterpretation("");
      setTestInterpretations({});
      setTestCollectedSamples({});
      setManualRows([]);
      setIsEditing(false);
      loadSamples();
      try {
        window.dispatchEvent(new Event('samplesChanged'));
      } catch {}
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to submit';
      toast({ title: "Error", description: msg, variant: "destructive" });
      console.error('[ResultEntry submit]', err?.response?.data || err);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (parameterId: string) => {
    const sel = rowStatusMap[parameterId];
    if (sel) {
      const v = sel.toLowerCase();
      if (v === 'critical') return <Badge className="bg-red-600 text-white">{sel}</Badge>;
      if (v === 'normal') return <Badge className="bg-green-600 text-white">{sel}</Badge>;
      return <Badge className="bg-orange-600 text-white">{sel}</Badge>;
    }
    const res = results.find((r) => r.parameterId === parameterId);
    if (!res) return null;
    if (res.isCritical) return <Badge className="bg-red-600 text-white">Critical</Badge>;
    if (res.isAbnormal) return <Badge className="bg-orange-600 text-white">Abnormal</Badge>;
    return <Badge className="bg-green-600 text-white">Normal</Badge>;
  };

  const getStatusLabel = (parameterId: string): string => {
    if (rowStatusMap[parameterId]) return rowStatusMap[parameterId];
    const res = results.find((r) => r.parameterId === parameterId);
    if (!res) return "Normal";
    if (res.isCritical) return "Critical";
    if (res.isAbnormal) return "Abnormal";
    return "Normal";
  };

  const handleStatusChange = (parameterId: string, value: string) => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: 'You only have view permission for Result Entry.', variant: 'destructive' });
      return;
    }
    // Store the exact selection so the dropdown reflects user's choice
    setRowStatusMap(prev => ({ ...prev, [parameterId]: value }));
    setResults(prev => {
      const existing = prev.find(r => r.parameterId === parameterId);
      const base = existing || { parameterId, value: null as any };
      // Reflect selection in flags without changing the visible label.
      let updated: BackendResult = { ...base } as any;
      const v = value.toLowerCase();
      if (v === 'normal') {
        updated = { ...updated, isCritical: false as any, isAbnormal: false as any } as any;
      } else if (v === 'critical') {
        updated = { ...updated, isCritical: true as any, isAbnormal: false as any } as any;
      } else if (v === 'abnormal' || v === 'high' || v === 'low' || v === 'average') {
        updated = { ...updated, isCritical: false as any, isAbnormal: true as any } as any;
      }
      if (existing) {
        return prev.map(r => (r.parameterId === parameterId ? updated : r));
      }
      return [...prev, updated];
    });
  };

  // Always have some rows for the selected sample: prefer full parameter metadata,
  // but if it's not available, fall back to the sample's own tests array from DB.
  const derivedParameters: TestParameter[] | any[] =
    (testParameters.length || !selectedSample
      ? testParameters
      : (selectedSample.tests || []).map((t: any, idx: number) => {
          const name = typeof t === 'string' ? t : (t?.name || '');
          const unit = typeof t === 'string' ? '' : (t?.unit || '');
          return {
            id: typeof t === 'string' ? `test-${idx}` : (t?._id || t?.id || `test-${idx}`),
            name,
            unit,
            normalRange: { min: undefined as any, max: undefined as any },
          };
        }))
      .filter((p: any) => p && !hiddenParameterIds.includes(p.id));

  // Enable submit only when every required parameter has a non-empty value
  const allCoreParametersHaveResult = selectedSample
    ? (testsWithParams.length > 0
        // When we have per-test tabs, require that each test has at least one row
        // and that all of its rows have a filled result value.
        ? (testsWithParams.length > 0 && testsWithParams.every(t => {
            const prefix = `${t.key}::`;
            const rowsForTest = manualRows.filter(r => r.id.startsWith(prefix));
            if (rowsForTest.length === 0) return false;
            return rowsForTest.every(r => {
              const res = results.find(x => x.parameterId === r.id);
              const raw = resultInputs[r.id] ?? (res?.value as any);
              if (raw === null || raw === undefined) return false;
              return String(raw).trim() !== '';
            });
          }))
        // Fallback (no tabs): use derivedParameters like before
        : (derivedParameters.length > 0 && derivedParameters.every((p: any) => {
            const res = results.find(r => r.parameterId === p.id);
            const raw = resultInputs[p.id] ?? (res?.value as any);
            if (raw === null || raw === undefined) return false;
            return String(raw).trim() !== '';
          })))
    : false;

  // When we have per-test tabs, also require interpretation text for each test
  const allTestsHaveInterpretation =
    testsWithParams.length > 0
      ? testsWithParams.every(t => {
          const text = (testInterpretations[String(t.key)] || "").trim();
          return text.length > 0;
        })
      : true;

  // When we have per-test tabs, also require collected sample selection for each test
  const allTestsHaveCollectedSample =
    testsWithParams.length > 0
      ? testsWithParams.every(t => {
          const v = (testCollectedSamples[String(t.key)] || "").trim();
          return v.length > 0;
        })
      : true;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Result Entry</h1>
          <p className="text-sm text-gray-500 mt-1">Enter and verify test results for patient samples.</p>
        </div>
      </div>

      {/* Sample picker (full-width tabular layout) */}
      <Card>
        <CardHeader>
          <CardTitle>Select Sample</CardTitle>
          <CardDescription>Choose a sample to enter test results</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search by Sample ID, patient, CNIC, phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <div className="overflow-auto">
              <table className="min-w-full text-sm border">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-600">
                    <th className="px-3 py-2 border-b">Sample ID</th>
                    <th className="px-3 py-2 border-b">Patient</th>
                    <th className="px-3 py-2 border-b">Test(s)</th>
                    <th className="px-3 py-2 border-b">CNIC</th>
                    <th className="px-3 py-2 border-b">Phone</th>
                    <th className="px-3 py-2 border-b">Status</th>
                    <th className="px-3 py-2 border-b text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {samples
                    .filter(s => {
                      const q = searchTerm.toLowerCase();
                      const sampleId =
                        (s as any).sampleNumber ||
                        (s as any).barcode ||
                        (s._id || '');
                      const cnic = (s as any).cnic || (s as any).patientCnic || (s as any).patientCNIC || '';
                      const phone = (s as any).phone || (s as any).patientPhone || '';
                      return (
                        String(sampleId).toLowerCase().includes(q) ||
                        (s.patientName || '').toLowerCase().includes(q) ||
                        String(cnic).toLowerCase().includes(q) ||
                        String(phone).toLowerCase().includes(q)
                      );
                    })
                    .map(s => {
                      const sampleId =
                        (s as any).sampleNumber ||
                        (s as any).barcode ||
                        (s._id || '-');
                      const cnic = (s as any).cnic || (s as any).patientCnic || (s as any).patientCNIC || '-';
                      const phone = (s as any).phone || (s as any).patientPhone || '-';
                      return (
                        <tr key={s._id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 border-b">{sampleId}</td>
                          <td className="px-3 py-2 border-b">
                            <div className="font-medium">{s.patientName}</div>
                            <div className="text-xs text-gray-500">{(s as any).patientId || ''}</div>
                          </td>
                          <td className="px-3 py-2 border-b">
                            {(() => {
                              const names: string[] = [];
                              if (Array.isArray((s as any).tests)) {
                                for (const t of (s as any).tests) {
                                  const n = String((t && (t.name || t.test)) || '').trim();
                                  if (n) names.push(n);
                                }
                              }
                              if (typeof (s as any).test === 'string') {
                                splitCommaOutsideParens(String((s as any).test)).forEach((v) => v && names.push(v));
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
                          </td>
                          <td className="px-3 py-2 border-b">{cnic}</td>
                          <td className="px-3 py-2 border-b">{phone}</td>
                          <td className="px-3 py-2 border-b">
                            <div>
                              <Badge className={
                                String(s.status).toLowerCase().includes('complet')
                                  ? 'bg-green-600 text-white'
                                  : String(s.status).toLowerCase().includes('process')
                                  ? 'bg-yellow-600 text-white'
                                  : 'bg-blue-600 text-white'
                              }>
                                {s.status}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-gray-500 mt-1">
                              {(() => {
                                const anyS: any = s as any;
                                const d = anyS.updatedAt || anyS.completedAt || anyS.processedAt || anyS.receivedAt || anyS.createdAt;
                                if (!d) return null;
                                try {
                                  const when = new Date(d).toLocaleDateString();
                                  return when;
                                } catch {
                                  return null;
                                }
                              })()}
                            </div>
                          </td>
                          <td className="px-3 py-2 border-b text-right">
                            <div className="flex items-center justify-end gap-2">
                              {Array.isArray((s as any).results) && (s as any).results.length > 0 ? (
                                <div className="inline-flex items-center gap-1 text-green-700">
                                  <CheckCircle className="w-4 h-4" />
                                  <span className="text-xs font-medium">Submitted</span>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  className={viewOnly ? 'opacity-50 cursor-not-allowed' : undefined}
                                  onClick={() => {
                                    const hasSubmitted = Array.isArray((s as any).results) && (s as any).results.length > 0;
                                    if (hasSubmitted) return;
                                    if (!modulePerm.edit) {
                                      toast({ title: 'Not allowed', description: 'You only have view permission for Result Entry.', variant: 'destructive' });
                                      return;
                                    }
                                    setIsEditing(false);
                                    const anyS: any = s as any;
                                    setSelectedSample(s);
                                    setResults(s.results || []);
                                    setInterpretation(s.interpretation || "");
                                    if (Array.isArray(anyS.interpretations)) {
                                      const map: Record<string, string> = {};
                                      const csMap: Record<string, string> = {};
                                      anyS.interpretations.forEach((it: any) => {
                                        if (!it) return;
                                        const key = String(it.testKey || it.testName || "");
                                        if (!key) return;
                                        map[key] = it.text || "";
                                        if (typeof it.collectedSample === 'string') {
                                          csMap[key] = it.collectedSample;
                                        }
                                      });
                                      setTestInterpretations(map);
                                      setTestCollectedSamples(csMap);
                                    } else {
                                      setTestInterpretations({});
                                      setTestCollectedSamples({});
                                    }
                                  }}
                                >
                                  Select
                                </Button>
                              )}

                              {Array.isArray((s as any).results) && (s as any).results.length > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className={`${viewOnly ? 'opacity-50 cursor-not-allowed' : ''} border-blue-800 text-blue-800 hover:bg-blue-50 hover:text-blue-800`}
                                  onClick={async () => {
                                    if (!modulePerm.edit) {
                                      toast({ title: 'Not allowed', description: 'You only have view permission for Result Entry.', variant: 'destructive' });
                                      return;
                                    }
                                    setIsEditing(true);
                                    const anyS: any = s as any;
                                    setSelectedSample(s);
                                    setResults([]);
                                    setManualRows([]);
                                    setInterpretation("");
                                    setTestInterpretations({});
                                    // Fetch latest test_result document for this sample to hydrate fields from DB
                                    const token = localStorage.getItem('token');
                                    const doFetch = async (idOrNumber: string) => {
                                      return api.get(`/labtech/samples/${idOrNumber}/test-result`, {
                                        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                                      });
                                    };
                                    try {
                                      let resp = await doFetch(String((anyS as any)._id || ''));
                                      let tr = (resp?.data || null) as any;
                                      if (!tr || !tr._id) {
                                        const altId = String(anyS.sampleNumber || anyS.barcode || '');
                                        if (altId) {
                                          resp = await doFetch(altId);
                                          tr = (resp?.data || null) as any;
                                        }
                                      }
                                      if (tr && Array.isArray(tr.results)) {
                                        setResults(tr.results);
                                        // Merge custom/manual rows (manual-*) into existing auto parameter rows
                                        const manual: ManualRow[] = tr.results
                                          .filter((r: any) => typeof r?.parameterId === 'string' && r.parameterId.includes('manual-'))
                                          .map((r: any) => ({
                                            id: String(r.parameterId),
                                            name: String(r?.label || r?.parameterName || r?.parameter || ''),
                                            unit: String(r?.unit || ''),
                                            normalText: String(r?.normalText || r?.normalRange || ''),
                                          }));
                                        if (manual.length) {
                                          setManualRows((prev) => {
                                            const existing = new Set((prev || []).map((x) => x.id));
                                            const merged = [...(prev || [])];
                                            manual.forEach((m) => {
                                              if (!existing.has(m.id)) merged.push(m);
                                            });
                                            return merged;
                                          });
                                        }
                                      }
                                      if (typeof tr?.interpretation === 'string') {
                                        setInterpretation(tr.interpretation);
                                      }
                                      if (Array.isArray(tr?.interpretations)) {
                                        const map: Record<string, string> = {};
                                        const csMap: Record<string, string> = {};
                                        tr.interpretations.forEach((it: any) => {
                                          if (!it) return;
                                          const key = String(it.testKey || it.testName || "");
                                          if (!key) return;
                                          map[key] = it.text || "";
                                          if (typeof it.collectedSample === 'string') {
                                            csMap[key] = it.collectedSample;
                                          }
                                        });
                                        setTestInterpretations(map);
                                        setTestCollectedSamples(csMap);
                                      }
                                    } catch (err) {
                                      console.error('Failed to fetch test-result for edit', err);
                                    }
                                  }}
                                >
                                  Edit
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  {samples.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Search className="w-10 h-10 text-gray-300" />
                          <p>No samples available for result entry</p>
                          <p className="text-xs text-gray-400">Completed or in-progress samples from Intake will appear here automatically</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

      {/* Entry form in dialog */}
      <Dialog open={!!selectedSample} onOpenChange={(open) => { if (!open) { setSelectedSample(null); setIsEditing(false); } }}>
        <DialogContent className="w-full max-w-5xl max-h-[90vh] overflow-y-auto sm:rounded-2xl p-4 sm:p-6">
          {selectedSample && (
            <>
              <DialogHeader>
                <DialogTitle>Result Entry</DialogTitle>
                <DialogDescription className="sr-only">Enter and verify test results for the selected sample.</DialogDescription>
              </DialogHeader>

              {/* patient intake details block above parameters */}
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                  <div className="space-y-1.5">
                    <div>
                      <p className="text-gray-600">Patient ID</p>
                      <p className="text-gray-900">{(selectedSample as any).patientId || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Patient Name</p>
                      <p className="font-medium text-gray-900">{selectedSample.patientName}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Phone</p>
                      <p className="text-gray-900">{(selectedSample as any).phone || (selectedSample as any).patientPhone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">CNIC</p>
                      <p className="text-gray-900">{(selectedSample as any).cnic || (selectedSample as any).patientCnic || (selectedSample as any).patientCNIC || '-'}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:text-right">
                    <div>
                      <p className="text-gray-600">Sample ID</p>
                      <p className="text-gray-900">{(selectedSample as any).sampleNumber || (selectedSample as any).barcode || selectedSample._id}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Age</p>
                      <p className="text-gray-900">{selectedSample.age || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Sex</p>
                      <p className="text-gray-900 capitalize">{selectedSample.gender || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Address</p>
                      <p className="text-gray-900 break-words">{(selectedSample as any).address || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Parameter Entry (table-like) */}
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Parameters</CardTitle>
                  <CardDescription>
                    Enter results. Reference group is derived from patient demographics.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="ml-auto">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!modulePerm.edit}
                        onClick={() => {
                          if (!modulePerm.edit) {
                            toast({ title: 'Not allowed', description: 'You only have view permission for Result Entry.', variant: 'destructive' });
                            return;
                          }
                          // When using per-test tabs, scope new rows to the active test key
                          if (testsWithParams.length > 0) {
                            const key = activeTestKey || String(testsWithParams[0]?.key || '');
                            const id = `${key}::manual-${Date.now()}`;
                            setManualRows(prev => [...prev, { id, name: '', unit: '', normalText: '' }]);
                          } else {
                            const id = `manual-${Date.now()}`;
                            setManualRows(prev => [...prev, { id, name: '', unit: '', normalText: '' }]);
                          }
                        }}
                        className="gap-2 border-blue-800 text-blue-800 hover:bg-blue-50 hover:text-blue-800"
                      >
                        <Plus className="w-4 h-4" /> Add Row
                      </Button>
                    </div>
                  </div>

                  <div className="overflow-auto">
                    {testsWithParams.length > 0 ? (
                      <Tabs
                        value={activeTestKey || testsWithParams[0]?.key}
                        onValueChange={(val) => setActiveTestKey(val)}
                        className="w-full"
                      >
                        <TabsList className="mb-2 flex flex-wrap justify-start">
                          {testsWithParams.map(test => (
                            <TabsTrigger
                              key={test.key}
                              value={test.key}
                              className="text-xs sm:text-sm data-[state=active]:bg-blue-800 data-[state=active]:text-white"
                            >
                              {test.name}
                            </TabsTrigger>
                          ))}
                        </TabsList>

                        {testsWithParams.map(test => {
                          const prefix = `${test.key}::`;
                          const rowsForTest = manualRows.filter(r => r.id.startsWith(prefix));
                          return (
                            <TabsContent key={test.key} value={test.key} className="mt-0">
                              <table className="min-w-full text-sm border">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="p-3 border-b text-left font-medium text-gray-600">Test Parameter</th>
                                    <th className="p-3 border-b text-left font-medium text-gray-600">Normal range</th>
                                    <th className="p-3 border-b text-left font-medium text-gray-600">Unit</th>
                                    <th className="p-3 border-b text-left font-medium text-gray-600">Result</th>
                                    <th className="p-3 border-b text-left font-medium text-gray-600">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {rowsForTest.map((r) => {
                                    const res = results.find(x => x.parameterId === r.id);
                                    return (
                                      <tr key={r.id} className="align-top bg-gray-50/30">
                                        <td className="p-2 border">
                                          <Input
                                            value={r.name}
                                            onChange={(e) => {
                                              if (!modulePerm.edit) {
                                                toast({ title: 'Not allowed', description: 'You only have view permission for Result Entry.', variant: 'destructive' });
                                                return;
                                              }
                                              const v = e.target.value;
                                              setManualRows(prev => prev.map(m => m.id === r.id ? { ...m, name: v } : m));
                                            }}
                                            placeholder="Custom test name"
                                            className="h-9"
                                          />
                                        </td>
                                        <td className="p-2 border w-48">
                                          <Input
                                            value={r.normalText}
                                            onChange={(e) => {
                                              if (!modulePerm.edit) {
                                                toast({ title: 'Not allowed', description: 'You only have view permission for Result Entry.', variant: 'destructive' });
                                                return;
                                              }
                                              const v = e.target.value;
                                              setManualRows(prev => prev.map(m => m.id === r.id ? { ...m, normalText: v } : m));
                                            }}
                                            placeholder="e.g., 4-11"
                                            className="h-9"
                                          />
                                        </td>
                                        <td className="p-2 border w-32">
                                          <Input
                                            value={r.unit}
                                            onChange={(e) => {
                                              if (!modulePerm.edit) {
                                                toast({ title: 'Not allowed', description: 'You only have view permission for Result Entry.', variant: 'destructive' });
                                                return;
                                              }
                                              const v = e.target.value;
                                              setManualRows(prev => prev.map(m => m.id === r.id ? { ...m, unit: v } : m));
                                            }}
                                            placeholder="Unit"
                                            className="h-9"
                                          />
                                        </td>
                                        <td className="p-2 border w-40">
                                          <Input
                                            type="text"
                                            value={resultInputs[r.id] ?? String((results.find(x => x.parameterId === r.id)?.value ?? '') as any)}
                                            onChange={(e) => {
                                              if (!modulePerm.edit) {
                                                toast({ title: 'Not allowed', description: 'You only have view permission for Result Entry.', variant: 'destructive' });
                                                return;
                                              }
                                              const val = e.target.value;
                                              setResultInputs(prev => ({ ...prev, [r.id]: val }));
                                              setResults(prev => {
                                                const existing = prev.find(x => x.parameterId === r.id);
                                                if (existing) return prev.map(x => (x.parameterId === r.id ? { ...x, value: val } : x));
                                                return [...prev, { parameterId: r.id, value: val }];
                                              });
                                            }}
                                            placeholder="-"
                                            className="h-9"
                                          />
                                        </td>
                                        <td className="p-2 border w-32">
                                          <div className="flex items-center gap-2">
                                            <Select
                                              value={getStatusLabel(r.id)}
                                              onValueChange={(v) => handleStatusChange(r.id, v)}
                                              disabled={!modulePerm.edit}
                                            >
                                              <SelectTrigger className="w-full h-9 text-sm">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="Normal">Normal</SelectItem>
                                                <SelectItem value="High">High</SelectItem>
                                                <SelectItem value="Low">Low</SelectItem>
                                                <SelectItem value="Average">Average</SelectItem>
                                                <SelectItem value="Critical">Critical</SelectItem>
                                                <SelectItem value="Abnormal">Abnormal</SelectItem>
                                              </SelectContent>
                                            </Select>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              disabled={!modulePerm.edit}
                                              onClick={() => {
                                                setManualRows(prev => prev.filter(m => m.id !== r.id));
                                              }}
                                            >
                                              <Trash className="w-4 h-4" />
                                            </Button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </TabsContent>
                          );
                        })}
                      </Tabs>
                    ) : (
                      <table className="min-w-full text-sm border">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="p-3 border-b text-left font-medium text-gray-600">Test Parameter</th>
                            <th className="p-3 border-b text-left font-medium text-gray-600">Normal range</th>
                            <th className="p-3 border-b text-left font-medium text-gray-600">Unit</th>
                            <th className="p-3 border-b text-left font-medium text-gray-600">Result</th>
                            <th className="p-3 border-b text-left font-medium text-gray-600">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {derivedParameters.map((p: any) => {
                            const result = results.find(r => r.parameterId === p.id);
                            // derive normal text by group if provided else default min-max
                            let normalText = '';
                            const rangeForGroup = referenceGroup === 'male' ? p.normalRangeMale : referenceGroup === 'female' ? p.normalRangeFemale : p.normalRangePediatric;
                            if (rangeForGroup) {
                              normalText = typeof rangeForGroup === 'string' ? rangeForGroup : '';
                            } else if (p.normalRange && (p.normalRange.min !== undefined || p.normalRange.max !== undefined)) {
                              const min = p.normalRange.min ?? '';
                              const max = p.normalRange.max ?? '';
                              normalText = `${min} - ${max}`.trim();
                            }
                            return (
                              <tr key={p.id} className="align-top">
                                <td className="p-2 border">
                                  <Input
                                    type="text"
                                    placeholder="Test name"
                                    value={p.name || ''}
                                    onChange={(e) => {
                                      if (!modulePerm.edit) {
                                        toast({ title: 'Not allowed', description: 'You only have view permission for Result Entry.', variant: 'destructive' });
                                        return;
                                      }
                                      const v = e.target.value;
                                      // allow user override of name in local metadata
                                      p.name = v;
                                    }}
                                    className="h-9 text-sm"
                                  />
                                </td>
                                <td className="p-2 border w-48">
                                  <Input
                                    type="text"
                                    placeholder="Normal range"
                                    value={normalText || ''}
                                    onChange={() => { /* keep display editable; backend still uses stored ranges */ }}
                                    className="h-9 text-sm"
                                  />
                                </td>
                                <td className="p-2 border w-32">
                                  <Input
                                    type="text"
                                    placeholder="Unit"
                                    value={p.unit || ''}
                                    onChange={(e) => {
                                      if (!modulePerm.edit) {
                                        toast({ title: 'Not allowed', description: 'You only have view permission for Result Entry.', variant: 'destructive' });
                                        return;
                                      }
                                      const v = e.target.value;
                                      p.unit = v;
                                    }}
                                    className="h-9 text-sm"
                                  />
                                </td>
                                <td className="p-2 border w-40">
                                  <Input
                                    type="text"
                                    placeholder="-"
                                    value={resultInputs[p.id] ?? (result?.value ?? '') as any}
                                    onChange={(e) => {
                                      if (!modulePerm.edit) {
                                        toast({ title: 'Not allowed', description: 'You only have view permission for Result Entry.', variant: 'destructive' });
                                        return;
                                      }
                                      const val = e.target.value;
                                      setResultInputs(prev => ({ ...prev, [p.id]: val }));
                                      setResults(prev => {
                                        const existing = prev.find(x => x.parameterId === p.id);
                                        if (existing) return prev.map(x => (x.parameterId === p.id ? { ...x, value: val } : x));
                                        return [...prev, { parameterId: p.id, value: val }];
                                      });
                                    }}
                                    className="h-9"
                                  />
                                </td>
                                <td className="p-2 border w-32">
                                  <div className="flex items-center gap-2">
                                    <Select
                                      value={getStatusLabel(p.id)}
                                      onValueChange={(v) => handleStatusChange(p.id, v)}
                                      disabled={!modulePerm.edit}
                                    >
                                      <SelectTrigger className="w-full h-9 text-sm">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Normal">Normal</SelectItem>
                                        <SelectItem value="High">High</SelectItem>
                                        <SelectItem value="Low">Low</SelectItem>
                                        <SelectItem value="Average">Average</SelectItem>
                                        <SelectItem value="Critical">Critical</SelectItem>
                                        <SelectItem value="Abnormal">Abnormal</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      disabled={!modulePerm.edit}
                                      onClick={() => handleDeleteParameterRow(p.id)}
                                    >
                                      <Trash className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}

                          {manualRows.map((r, idx) => {
                            const res = results.find(x => x.parameterId === r.id);
                            return (
                              <tr key={r.id} className="align-top bg-gray-50/30">
                                <td className="p-2 border">
                                  <Input
                                    value={r.name}
                                    onChange={(e) => {
                                      if (!modulePerm.edit) {
                                        toast({ title: 'Not allowed', description: 'You only have view permission for Result Entry.', variant: 'destructive' });
                                        return;
                                      }
                                      const v = e.target.value; setManualRows(prev => prev.map((m, i) => i === idx ? { ...m, name: v } : m));
                                    }}
                                    placeholder="Custom test name"
                                    className="h-9"
                                  />
                                </td>
                                <td className="p-2 border w-48">
                                  <Input
                                    value={r.normalText}
                                    onChange={(e) => {
                                      if (!modulePerm.edit) {
                                        toast({ title: 'Not allowed', description: 'You only have view permission for Result Entry.', variant: 'destructive' });
                                        return;
                                      }
                                      const v = e.target.value; setManualRows(prev => prev.map((m, i) => i === idx ? { ...m, normalText: v } : m));
                                    }}
                                    placeholder="e.g., 4-11"
                                    className="h-9"
                                  />
                                </td>
                                <td className="p-2 border w-32">
                                  <Input
                                    value={r.unit}
                                    onChange={(e) => {
                                      if (!modulePerm.edit) {
                                        toast({ title: 'Not allowed', description: 'You only have view permission for Result Entry.', variant: 'destructive' });
                                        return;
                                      }
                                      const v = e.target.value; setManualRows(prev => prev.map((m, i) => i === idx ? { ...m, unit: v } : m));
                                    }}
                                    placeholder="Unit"
                                    className="h-9"
                                  />
                                </td>
                                <td className="p-2 border w-40">
                                  <Input
                                    type="text"
                                    value={resultInputs[r.id] ?? String((results.find(x => x.parameterId === r.id)?.value ?? '') as any)}
                                    onChange={(e) => {
                                      if (!modulePerm.edit) {
                                        toast({ title: 'Not allowed', description: 'You only have view permission for Result Entry.', variant: 'destructive' });
                                        return;
                                      }
                                      const val = e.target.value;
                                      setResultInputs(prev => ({ ...prev, [r.id]: val }));
                                      setResults(prev => {
                                        const existing = prev.find(x => x.parameterId === r.id);
                                        if (existing) return prev.map(x => (x.parameterId === r.id ? { ...x, value: val } : x));
                                        return [...prev, { parameterId: r.id, value: val }];
                                      });
                                    }}
                                    placeholder="-"
                                    className="h-9"
                                  />
                                </td>
                                <td className="p-2 border w-32">
                                  <div className="flex items-center gap-2">
                                    <Select
                                      value={getStatusLabel(r.id)}
                                      onValueChange={(v) => handleStatusChange(r.id, v)}
                                      disabled={!modulePerm.edit}
                                    >
                                      <SelectTrigger className="w-full h-9 text-sm">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Normal">Normal</SelectItem>
                                        <SelectItem value="High">High</SelectItem>
                                        <SelectItem value="Low">Low</SelectItem>
                                        <SelectItem value="Average">Average</SelectItem>
                                        <SelectItem value="Critical">Critical</SelectItem>
                                        <SelectItem value="Abnormal">Abnormal</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      disabled={!modulePerm.edit}
                                      onClick={() => {
                                        setManualRows(prev => prev.filter((_, i) => i !== idx));
                                      }}
                                    >
                                      <Trash className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* interpretation */}
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Interpretation</CardTitle>
                </CardHeader>
                <CardContent>
                  {testsWithParams.length > 0 ? (
                    <Tabs defaultValue={testsWithParams[0]?.key} className="w-full">
                      <TabsList className="mb-2 flex flex-wrap justify-start">
                        {testsWithParams.map(test => (
                          <TabsTrigger
                            key={test.key}
                            value={test.key}
                            className="text-xs sm:text-sm data-[state=active]:bg-blue-800 data-[state=active]:text-white"
                          >
                            {test.name}
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {testsWithParams.map(test => (
                        <TabsContent key={test.key} value={test.key} className="mt-0">
                          <textarea
                            className="w-full p-3 border rounded text-sm"
                            rows={4}
                            value={testInterpretations[String(test.key)] ?? ""}
                            onChange={(e) => {
                              if (!modulePerm.edit) {
                                toast({ title: 'Not allowed', description: 'You only have view permission for Result Entry.', variant: 'destructive' });
                                return;
                              }
                              const value = e.target.value;
                              setTestInterpretations(prev => ({ ...prev, [String(test.key)]: value }));
                            }}
                            disabled={!modulePerm.edit}
                            placeholder={`Interpretation for ${test.name}...`}
                          />

                          <div className="mt-3">
                            <p className="text-sm font-medium text-gray-700">Collected Sample</p>
                            <Select
                              value={testCollectedSamples[String(test.key)] ?? ''}
                              onValueChange={(v) => {
                                if (!modulePerm.edit) {
                                  toast({ title: 'Not allowed', description: 'You only have view permission for Result Entry.', variant: 'destructive' });
                                  return;
                                }
                                const next = v === '__none__' || v === '__no_samples__' ? '' : v;
                                setTestCollectedSamples(prev => ({ ...prev, [String(test.key)]: next }));
                              }}
                              disabled={!modulePerm.edit}
                            >
                              <SelectTrigger className="w-full h-9 mt-2">
                                <SelectValue placeholder="Select collected sample" />
                              </SelectTrigger>
                              <SelectContent>
                                {(() => {
                                  const anyS: any = selectedSample as any;
                                  const list: string[] = [];
                                  try {
                                    if (Array.isArray(anyS?.collectedSamples) && anyS.collectedSamples.length) {
                                      anyS.collectedSamples.forEach((x: any) => {
                                        const v = String(x || '').trim();
                                        if (v) list.push(v);
                                      });
                                    }
                                    if (!list.length) {
                                      const raw = String(anyS?.collectedSample || '').trim();
                                      if (raw) {
                                        raw.split(',').map((v) => v.trim()).filter(Boolean).forEach((v) => list.push(v));
                                      }
                                    }
                                  } catch {}
                                  const uniq = Array.from(new Set(list.map((v) => v.toLowerCase()))).map((lower) => list.find((v) => v.toLowerCase() === lower) || lower);
                                  if (!uniq.length) {
                                    return <SelectItem value="__no_samples__" disabled>No collected samples</SelectItem>;
                                  }
                                  return (
                                    <>
                                      <SelectItem value="__none__">None</SelectItem>
                                      {uniq.map((v) => (
                                        <SelectItem key={v} value={v}>{v}</SelectItem>
                                      ))}
                                    </>
                                  );
                                })()}
                              </SelectContent>
                            </Select>
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  ) : (
                    <textarea
                      className="w-full p-3 border rounded"
                      rows={4}
                      value={interpretation}
                      onChange={(e) => {
                        if (!modulePerm.edit) {
                          toast({ title: 'Not allowed', description: 'You only have view permission for Result Entry.', variant: 'destructive' });
                          return;
                        }
                        setInterpretation(e.target.value);
                      }}
                      disabled={!modulePerm.edit}
                      placeholder="Clinical interpretation..."
                    />
                  )}
                </CardContent>
              </Card>

              {/* submit at bottom */}
              <div className="mt-6 flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={(!modulePerm.edit) || submitting || !allCoreParametersHaveResult || !allTestsHaveInterpretation || !allTestsHaveCollectedSample}
                >
                  <Send className="w-4 h-4 mr-1" />{isEditing ? 'Update' : 'Submit'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResultEntryClean;
