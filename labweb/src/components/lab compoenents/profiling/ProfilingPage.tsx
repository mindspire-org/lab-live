import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { printSampleSlip } from "../../../utils/printSample";
import { printHtmlOverlay } from "@/utils/printOverlay";
import { api } from "@/lib/api";

interface ProfilingRecord {
  _id: string;
  patientId?: string | null;
  name: string;
  cnic: string;
  phone: string;
  numberOfVisits: number;
  lastVisitDate: string | null;
  sampleTypes: string[];
  profilingNotes: string;
  age?: string | null;
  gender?: string | null;
  address?: string;
}

const ProfilingPage = () => {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<ProfilingRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simple create form state
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [cnic, setCnic] = useState("");
  const [phone, setPhone] = useState("");
  const [profilingNotes, setProfilingNotes] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [editNotes, setEditNotes] = useState("");

  const [samples, setSamples] = useState<any[]>([]);
  const [samplesLoading, setSamplesLoading] = useState(false);

  const [viewSample, setViewSample] = useState<any | null>(null);
  const [reportTemplate, setReportTemplate] = useState<any | null>(null);
  const [labSettings, setLabSettings] = useState<any | null>(null);

  const loadProfiling = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<{ success: boolean; items: ProfilingRecord[] }>("/lab/profiling");
      const list = Array.isArray(data.items) ? data.items : [];
      setItems(list);
      if (!selectedId && list.length > 0) {
        setSelectedId(list[0]._id);
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Failed to load profiling";
      setError(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadSamples = async () => {
      try {
        setSamplesLoading(true);
        const { data } = await api.get<any[]>("/labtech/samples");
        const arr = Array.isArray(data) ? data : [];
        setSamples(arr);
      } catch (e) {
        console.error("Failed to load samples for profiling", e);
      } finally {
        setSamplesLoading(false);
      }
    };

    loadSamples();
  }, []);

  useEffect(() => {
    api
      .get("/settings")
      .then(({ data }) => {
        setReportTemplate(data?.reportTemplate || null);
        setLabSettings(data || null);
      })
      .catch(() => {
        setReportTemplate(null);
        setLabSettings(null);
      });
  }, []);

  const handleCreate = async () => {
    setError(null);
    if (!name || !cnic || !phone) {
      setError("Name, CNIC and phone are required.");
      return;
    }
    try {
      await api.post("/lab/profiling", {
        name,
        cnic,
        phone,
        profilingNotes: profilingNotes || "",
      });
      setName("");
      setCnic("");
      setPhone("");
      setProfilingNotes("");
      setShowCreate(false);
      await loadProfiling();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Failed to create profiling";
      setError(msg);
    }
  };

  const handleStartEdit = () => {};

  const handleSaveEdit = async () => {};

  const filtered = items.filter((p) => {
    const value = `${p.name} ${p.cnic} ${p.phone}`.toLowerCase();
    return value.includes(search.toLowerCase());
  });

  const selected = filtered.find((p) => p._id === selectedId) ?? filtered[0] ?? null;

  const patientSamples = selected
    ? samples.filter((s) => {
        const sCnic = String(s.cnic || "").trim();
        const sPhone = String(s.phone || "").trim();
        const sPatientId = String(s.patientId || "").trim();
        const pCnic = String(selected.cnic || "").trim();
        const pPhone = String(selected.phone || "").trim();
        const pPatientId = String(selected.patientId || "").trim();
        return (
          (!!pCnic && sCnic === pCnic) ||
          (!!pPhone && sPhone === pPhone) ||
          (!!pPatientId && sPatientId === pPatientId)
        );
      })
    : [];

  const handleViewSample = (sample: any) => {
    setViewSample(sample);
  };

  const normalizeSampleStatus = (raw: string | undefined | null): "collected" | "processing" | "completed" => {
    const s = String(raw || "").toLowerCase();
    if (s.includes("process")) return "processing";
    if (s.includes("complet")) return "completed";
    return "collected";
  };

  const getStatusBadge = (status: string) => {
    const norm = normalizeSampleStatus(status);
    const statusConfig: Record<"collected" | "processing" | "completed", { color: string; text: string }> = {
      collected: { color: "bg-blue-600 text-white", text: "Collected" },
      processing: { color: "bg-yellow-600 text-white", text: "Processing" },
      completed: { color: "bg-green-600 text-white", text: "Completed" },
    };
    const config = statusConfig[norm];
    return <Badge className={`${config.color} text-xs`}>{config.text}</Badge>;
  };

  const extractTestsLabel = (sample: any): string => {
    if (Array.isArray(sample?.tests) && sample.tests.length) {
      const names = sample.tests
        .map((t: any) => (t && (t.name || t.test)) || "")
        .filter((v: string) => !!v);
      const uniq = Array.from(new Set(names.map((n) => n.toLowerCase()))).map(
        (lower) => names.find((n) => n.toLowerCase() === lower) || lower
      );
      return uniq.join(", ");
    }
    if (typeof sample?.test === "string") return sample.test;
    return "-";
  };

  const getLabContactFromStorage = () => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem("labSettings") : null;
      if (!raw) return { phone: "", email: "", address: "" };
      const parsed = JSON.parse(raw) as { phone?: string; email?: string; address?: string };
      return {
        phone: parsed.phone || "",
        email: parsed.email || "",
        address: parsed.address || "",
      };
    } catch {
      return { phone: "", email: "", address: "" };
    }
  };

  const splitCommaOutsideParens = (input: string): string[] => {
    const out: string[] = [];
    let buf = "";
    let depth = 0;
    for (let i = 0; i < input.length; i++) {
      const ch = input[i];
      if (ch === "(") depth++;
      if (ch === ")" && depth > 0) depth--;
      if (ch === "," && depth === 0) {
        const v = buf.trim();
        if (v) out.push(v);
        buf = "";
        continue;
      }
      buf += ch;
    }
    const last = buf.trim();
    if (last) out.push(last);
    return out;
  };

  const getSampleTestNames = (sample: any): string[] => {
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
  };

  const sampleHasCBC = (sample: any): boolean => {
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
      const lookup = ["complete blood count", "cbc", "complete blood count (cbc)"];
      return names.some((n) => lookup.some((k) => n.includes(k)));
    } catch {
      return false;
    }
  };

  const buildPatientReportData = (sample: any, testKey?: string) => {
    const reportDate = new Date().toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const patientName = sample?.patientName || "";
    const age = sample?.age ? `${sample.age} Years` : "N/A";
    const gender = sample?.gender || "N/A";
    const phone = sample?.phone || sample?.patientPhone || "";
    const cnic = sample?.cnic || sample?.patientCnic || sample?.patientCNIC || "";
    const address = sample?.address || "";
    const referringDoctor = (sample?.referringDoctor || sample?.referringPhysician || sample?.referringPhysicianName || "").toString();
    const sampleCollectedBy = (sample?.sampleCollectedBy || sample?.collectedBy || "").toString();
    const collectedSample = (sample?.collectedSample || sample?.sampleType || "").toString();
    const collection = sample?.createdAt
      ? new Date(sample.createdAt).toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : sample?.collectionTime || "N/A";
    const sampleId = sample?.sampleNumber || sample?.barcode || sample?._id || "N/A";

    let testResults: Array<{ parameter: string; result: string; unit: string; referenceRange: string; status: string }> = [];

    if (Array.isArray(sample?.results) && sample.results.length > 0) {
      const src = testKey
        ? sample.results.filter((r: any) => typeof r?.parameterId === "string" && r.parameterId.startsWith(`${testKey}::`))
        : sample.results;
      testResults = src.map((r: any) => {
        const name = r.label || r.parameter || r.name || r.parameterId || "Parameter";
        const unit = r.unit || "";
        const referenceRange = r.normalText || "-";
        const value = typeof r.value === "number" || typeof r.value === "string" ? String(r.value) : "-";
        const status = r.isCritical ? "Critical" : r.isAbnormal ? "Abnormal" : "Normal";
        return { parameter: name, result: value, unit, referenceRange, status };
      });
    } else {
      const selectedNames = getSampleTestNames(sample);
      if (selectedNames.length > 0) {
        testResults = selectedNames.map((name) => ({
          parameter: name,
          result: "-",
          unit: "-",
          referenceRange: "-",
          status: "Normal",
        }));
      }
    }

    // Prefer per-test interpretation when testKey provided; otherwise overall interpretation.
    // Do NOT use mock text; if DB has no interpretation, leave empty.
    let clinicalText = "";
    try {
      if (testKey && Array.isArray(sample?.interpretations)) {
        const it = sample.interpretations.find((x: any) => {
          const k = String(x?.testKey || x?.testName || "").trim();
          return k && k === String(testKey);
        });
        if (it && typeof it.text === "string" && it.text.trim().length) {
          clinicalText = it.text.trim();
        }
      }
    } catch {
      // ignore
    }
    if (!clinicalText && typeof sample?.interpretation === "string") {
      const t = sample.interpretation.trim();
      if (t.length) clinicalText = t;
    }

    return {
      patientInfo: {
        name: patientName,
        id: sample?.patientId || "",
        age,
        gender,
        phone,
        cnic,
        address,
        referringDoctor,
        sampleCollectedBy,
        collectedSample,
        collectionDate: collection,
        reportDate,
        sampleId,
      },
      testResults,
      clinicalNotes: clinicalText,
    };
  };

  const buildHtmlFromTemplate = (
    template: any,
    reportData: any,
    options: {
      labName: string;
      labSubtitle: string;
      labLogoUrl: string | null;
      labContact: { phone: string; email: string; address: string };
    }
  ) => {
    const fontSize = template?.styles?.fontSize || 12;
    const headerColor = template?.styles?.headerColor || "#f3f4f6";

    const headerHtml = `
      <div style="border-bottom:1px solid #d1d5db;padding:16px 0;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;">
          <div style="width:64px;height:64px;display:flex;align-items:center;justify-content:center;">
            ${options.labLogoUrl
              ? `<img src="${options.labLogoUrl}" alt="Lab Logo" style="max-width:100%;max-height:100%;object-fit:contain;" />`
              : `<span style="font-size:10px;font-weight:bold;color:#1d4ed8;">Lab Logo</span>`}
          </div>
          <div style="flex:1;text-align:center;">
            <h1 style="margin:0;font-size:20px;font-weight:bold;text-transform:uppercase;">${options.labName}</h1>
            <p style="margin:4px 0 0;font-size:12px;color:#4b5563;">Accredited by ${options.labSubtitle}</p>
          </div>
          <div style="width:64px;"></div>
        </div>
        <div style="margin-top:8px;font-size:10px;color:#374151;display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">
          <span><strong>Phone:</strong> ${options.labContact.phone || "N/A"}</span>
          <span><strong>Email:</strong> ${options.labContact.email || "N/A"}</span>
          <span><strong>Address:</strong> ${options.labContact.address || "N/A"}</span>
        </div>
      </div>
    `;

    const patientInfo = reportData.patientInfo;
    const patientHtml = `
      <div style="border-bottom:1px solid #e5e7eb;padding:12px 0;margin-bottom:12px;">
        <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;font-size:11px;">
          <div>
            <p><strong>Patient ID:</strong> ${patientInfo.id || "N/A"}</p>
            <p><strong>Patient Name:</strong> ${patientInfo.name || "N/A"}</p>
            <p><strong>Age/Gender:</strong> ${patientInfo.age || "N/A"} / ${patientInfo.gender || "N/A"}</p>
            <p><strong>Phone:</strong> ${patientInfo.phone || "N/A"}</p>
            <p><strong>CNIC:</strong> ${patientInfo.cnic || "N/A"}</p>
          </div>
          <div>
            <p><strong>Sample ID:</strong> ${patientInfo.sampleId || "N/A"}</p>
            <p><strong>Collection Date:</strong> ${patientInfo.collectionDate || "N/A"}</p>
            <p><strong>Report Date:</strong> ${patientInfo.reportDate || "N/A"}</p>
          </div>
          <div>
            <p><strong>Ref Doctor:</strong> ${patientInfo.referringDoctor || "N/A"}</p>
            <p><strong>Collected By:</strong> ${patientInfo.sampleCollectedBy || "N/A"}</p>
            <p><strong>Sample:</strong> ${patientInfo.collectedSample || "N/A"}</p>
            <p><strong>Department:</strong> Pathology</p>
          </div>
        </div>
        <div style="margin-top:6px;font-size:11px;">
          <p><strong>Address:</strong> ${patientInfo.address || "N/A"}</p>
        </div>
      </div>
    `;

    const resultsRows = (reportData.testResults || [])
      .map((r: any) => `
        <tr>
          <td style="padding:4px 6px;border:1px solid #e5e7eb;">${r.parameter}</td>
          <td style="padding:4px 6px;border:1px solid #e5e7eb;">${r.referenceRange}</td>
          <td style="padding:4px 6px;border:1px solid #e5e7eb;color:#4b5563;">${r.unit}</td>
          <td style="padding:4px 6px;border:1px solid #e5e7eb;">${r.result}</td>
          <td style="padding:4px 6px;border:1px solid #e5e7eb;">${r.status}</td>
        </tr>
      `)
      .join("");

    const testNameHtml = reportData && (reportData as any).currentTestName
      ? `<div style="padding:6px 8px;font-weight:600;color:#374151;background:#f9fafb;border-bottom:1px solid #d1d5db;">${(reportData as any).currentTestName}</div>`
      : "";

    const resultsHtml = `
      <div style="border:1px solid #d1d5db;border-radius:4px;overflow:hidden;margin-bottom:16px;">
        ${testNameHtml}
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <thead>
            <tr style="background:${headerColor};">
              <th style="padding:6px;border-right:1px solid #d1d5db;text-align:left;">Test Parameters</th>
              <th style="padding:6px;border-right:1px solid #d1d5db;text-align:center;">Normal Range</th>
              <th style="padding:6px;border-right:1px solid #d1d5db;text-align:center;">Units</th>
              <th style="padding:6px;border-right:1px solid #d1d5db;text-align:center;">Result</th>
              <th style="padding:6px;text-align:center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${resultsRows || `<tr><td colspan="5" style="padding:12px;text-align:center;color:#6b7280;">No test results available</td></tr>`}
          </tbody>
        </table>
      </div>
    `;

    const interpretationHtml = `
      <div style="border:1px solid #d1d5db;border-radius:4px;padding:12px;font-size:11px;margin-top:8px;">
        <h3 style="margin:0 0 6px;font-weight:600;">Clinical Interpretation</h3>
        <p style="margin:0;">${reportData.clinicalNotes || ""}</p>
      </div>
    `;

    const footerHtml = `
      <div class="footer" style="margin-top:8px;padding-top:8px;border-top:1px solid #000;font-size:${fontSize}px;text-align:center;color:#000;">
        System Generated Report, No Signature Required. Approved By Consultant. Not Valid For Any Court Of Law.
      </div>
    `;

    const pieces: string[] = [];
    const components = Array.isArray(template?.components) ? template.components : [];
    for (const comp of components) {
      switch (comp.type) {
        case "header-text":
          pieces.push(headerHtml);
          break;
        case "patient-info":
          pieces.push(patientHtml);
          break;
        case "result-table":
          pieces.push(resultsHtml);
          break;
        case "notes":
          pieces.push(interpretationHtml);
          break;
        default:
          break;
      }
    }
    if (!pieces.length) {
      pieces.push(headerHtml, patientHtml, resultsHtml, interpretationHtml);
    }

    return `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: Arial, sans-serif;
          line-height: 1.4;
          color: #111827;
          padding: 0;
          font-size: ${fontSize}px;
          display: block;
        }
        .page {
          width: 794px;
          height: 1123px;
          border: 1px solid #e5e7eb;
          padding: 16px 24px;
          background: white;
          display: grid;
          grid-template-rows: auto 1fr auto;
          position: relative;
          margin: 0 auto;
          page-break-after: always;
          break-after: page;
        }
        .content { min-height: 0; }
        .footer { position: absolute; left: 0; right: 0; bottom: 16px; }
        @media print {
          @page { size: A4; margin: 8mm; }
          body { margin: 0; padding: 0; }
          .page {
            width: 100%;
            height: calc(297mm - 16mm);
            min-height: 0;
            border: none;
            padding: 0;
            margin: 0 auto;
          }
          .footer { position: absolute; left: 0; right: 0; bottom: 8mm; }
        }
      </style>
      <div class="page">
        <div class="content">
          ${pieces.join("\n")}
        </div>
        ${footerHtml}
      </div>
    `;
  };

  const handlePrintReport = (sample: any) => {
    const statusRaw = String(sample?.status || "").toLowerCase();
    if (!statusRaw.includes("complet")) return;

    const id = sample?._id || sample?.sampleNumber || sample?.barcode;
    if (!id) return;

    api
      .get(`/labtech/samples/${id}`)
      .then(({ data }) => {
        const sampleDoc = data || sample;
        const contact = getLabContactFromStorage();
        const labName = labSettings?.hospitalName || labSettings?.labName || "Medical Laboratory Report";
        const labLogoUrl = labSettings?.labLogoUrl || null;
        const labSubtitle = labSettings?.labSubtitle || "ISO 15189:2012";

        const resolveName = (key: string): string => {
          try {
            const tests = Array.isArray(sampleDoc?.tests) ? sampleDoc.tests : [];
            const byId = tests.find((t: any) => {
              const ids = [t?._id, t?.id, t?.test].map((x: any) => String(x || ""));
              return ids.includes(String(key));
            });
            if (byId && (byId.name || byId.test)) return String(byId.name || byId.test);
            const byName = tests.find((t: any) => String(t?.name || "").toLowerCase() === String(key).toLowerCase());
            if (byName && byName.name) return String(byName.name);
            return String(key);
          } catch {
            return String(key);
          }
        };

        const resArr: any[] = Array.isArray(sampleDoc?.results) ? sampleDoc.results : [];
        const keysSet = new Set<string>();
        resArr.forEach((r: any) => {
          const pid = String(r?.parameterId || "");
          const idx = pid.indexOf("::");
          if (idx > 0) keysSet.add(pid.slice(0, idx));
        });
        const keys = Array.from(keysSet);

        const tmpl = reportTemplate || { components: [] };

        let html: string;
        if (keys.length > 0) {
          const pages: string[] = [];
          keys.forEach((key) => {
            const reportDataK: any = buildPatientReportData(sampleDoc, key);
            reportDataK.currentTestName = resolveName(key);
            const page = buildHtmlFromTemplate(tmpl, reportDataK, {
              labName,
              labSubtitle,
              labLogoUrl,
              labContact: contact,
            });
            pages.push(page);
          });
          html = pages.join("\n");
        } else {
          const reportData = buildPatientReportData(sampleDoc);
          html = buildHtmlFromTemplate(tmpl, reportData, {
            labName,
            labSubtitle,
            labLogoUrl,
            labContact: contact,
          });
        }

        printHtmlOverlay(html, { autoPrint: true, width: 794, height: 1123 });
      })
      .catch((err) => {
        console.error("Failed to print full report", err);
        // fallback: print sample slip if report build fails
        const tests = Array.isArray(sample?.tests)
          ? sample.tests.map((t: any) => ({
              name: (t && (t.name || t.test)) || "",
              price: typeof t?.price === "number" ? t.price : undefined,
            }))
          : [];
        printSampleSlip({
          sampleNumber: sample.sampleNumber || sample.barcode || sample._id,
          dateTime: sample.createdAt,
          patientName: sample.patientName || selected?.name || "",
          guardianRelation: sample.guardianRelation,
          guardianName: sample.guardianName,
          cnic: sample.cnic || selected?.cnic || "",
          phone: sample.phone || selected?.phone || "",
          age: sample.age || selected?.age,
          gender: sample.gender || selected?.gender,
          address: sample.address || selected?.address,
          referringDoctor: sample.referringDoctor,
          sampleCollectedBy: sample.sampleCollectedBy,
          collectedSample: sample.collectedSample,
          tests,
          totalAmount: sample.totalAmount,
        });
      });
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-4 h-full">
      <div className="md:col-span-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Patient Profiling</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {error && <div className="text-sm text-red-600">{error}</div>}
            <Input
              placeholder="Search by name, CNIC, or phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {showCreate && (
              <div className="space-y-2 border rounded-md p-3 bg-muted/40">
                <div className="grid grid-cols-1 gap-2">
                  <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
                  <Input placeholder="CNIC" value={cnic} onChange={(e) => setCnic(e.target.value)} />
                  <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  <Textarea
                    placeholder="Complete profiling / history notes"
                    value={profilingNotes}
                    onChange={(e) => setProfilingNotes(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowCreate(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleCreate} disabled={loading}>
                    Save
                  </Button>
                </div>
              </div>
            )}
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>CNIC</TableHead>
                    <TableHead>Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {filtered.map((row) => (
                        <TableRow
                          key={row._id}
                          className={row._id === selected?._id ? "bg-muted/60 cursor-pointer" : "cursor-pointer"}
                          onClick={() => setSelectedId(row._id)}
                        >
                          <TableCell className="font-medium">{row.name}</TableCell>
                          <TableCell>{row.cnic}</TableCell>
                          <TableCell>{row.phone}</TableCell>
                        </TableRow>
                      ))}
                      {filtered.length === 0 && !loading && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                            No patients found
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-8 space-y-4">
        {selected ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Patient ID</div>
                  <div className="font-medium">{selected.patientId || selected._id}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Number of Visits</div>
                  <div className="font-medium">{selected.numberOfVisits}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Patient Name</div>
                  <div className="font-medium">{selected.name}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">CNIC</div>
                  <div className="font-medium">{selected.cnic}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Phone</div>
                  <div className="font-medium">{selected.phone}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Age</div>
                  <div className="font-medium">{selected.age ?? "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Gender</div>
                  <div className="font-medium">{selected.gender || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Address</div>
                  <div className="font-medium">{selected.address || "-"}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Complete Profiling</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Samples for this patient</div>
                  {samplesLoading ? (
                    <div className="text-xs text-muted-foreground">Loading samples...</div>
                  ) : patientSamples.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No samples found for this patient.</div>
                  ) : (
                    <div className="space-y-3">
                      {patientSamples.map((s) => {
                        const testsLabel = Array.isArray(s.tests) && s.tests.length
                          ? s.tests
                              .map((t: any) => (t && (t.name || t.test)) || "")
                              .filter((v: string) => !!v)
                              .join(", ")
                          : "-";
                        const priority = s.priority || "normal";
                        const statusRaw = String(s.status || "").toLowerCase();
                        const status = statusRaw.includes("complet")
                          ? "Completed"
                          : statusRaw.includes("process")
                          ? "Processing"
                          : "Collected";
                        const collectionTime = s.createdAt
                          ? new Date(s.createdAt).toLocaleString()
                          : "-";
                        return (
                          <div
                            key={s._id || s.sampleNumber}
                            className="border rounded-md p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                          >
                            <div className="space-y-1 text-xs md:text-sm">
                              <div className="font-medium text-sm">Sample ID: {s.sampleNumber || "-"}</div>
                              <div>
                                <span className="text-muted-foreground">Tests: </span>
                                <span>{testsLabel}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Priority: </span>
                                <span className="capitalize">{priority}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Collection Time: </span>
                                <span>{collectionTime}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Status: </span>
                                <span>{status}</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                type="button"
                                onClick={() => handleViewSample(s)}
                              >
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                type="button"
                                disabled={!statusRaw.includes("complet")}
                                onClick={() => handlePrintReport(s)}
                              >
                                Print Report
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="h-full flex items-center justify-center">
            <CardContent>
              <div className="text-center text-sm text-muted-foreground">
                Select a patient from the left to view profiling details.
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!viewSample} onOpenChange={(open) => !open && setViewSample(null)}>
        <DialogContent className="w-full max-w-lg sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Sample Details</DialogTitle>
            <DialogDescription>
              View detailed information about this sample.
            </DialogDescription>
          </DialogHeader>
          {viewSample && (
            <div className="grid gap-4 py-2 sm:py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Sample ID</Label>
                  <p className="text-sm font-mono bg-gray-100 p-2 rounded">{viewSample.sampleNumber || viewSample.barcode || viewSample._id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <div className="mt-1">{getStatusBadge(viewSample.status)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Patient Name</Label>
                  <p className="text-sm">{viewSample.patientName || "-"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Phone</Label>
                  <p className="text-sm">{viewSample.phone || viewSample.patientPhone || selected?.phone || "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">CNIC</Label>
                  <p className="text-sm">{viewSample.cnic || viewSample.patientCnic || selected?.cnic || "-"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Age / Gender</Label>
                  <p className="text-sm">
                    {(viewSample.age || viewSample.patientAge || selected?.age || "-")}
                    {" / "}
                    {viewSample.gender || viewSample.patientGender || selected?.gender || "-"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Address</Label>
                  <p className="text-sm break-words">{viewSample.address || selected?.address || "-"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Guardian</Label>
                  <p className="text-sm">
                    {viewSample.guardianRelation || viewSample.guardianName
                      ? `${viewSample.guardianRelation || ""} ${viewSample.guardianName || ""}`.trim()
                      : "-"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Priority</Label>
                  <p className="text-sm capitalize">{viewSample.priority || "normal"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Created At</Label>
                  <p className="text-sm">
                    {viewSample.createdAt ? new Date(viewSample.createdAt).toLocaleString() : viewSample.collectionTime || "-"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Referring Doctor</Label>
                  <p className="text-sm break-words">{viewSample.referringDoctor || "-"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Sample Collected By</Label>
                  <p className="text-sm break-words">{viewSample.sampleCollectedBy || "-"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Collected Sample</Label>
                  <p className="text-sm break-words">{viewSample.collectedSample || "-"}</p>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-500">Tests</Label>
                {Array.isArray(viewSample.tests) && viewSample.tests.length > 0 ? (
                  <ul className="list-disc list-inside text-sm">
                    {viewSample.tests.map((t: any, idx: number) => (
                      <li key={idx}>{t?.name || t?.test || viewSample.test || "-"}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm">{viewSample.test || extractTestsLabel(viewSample) || "-"}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilingPage;
