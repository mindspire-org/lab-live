import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, Printer, Search, FileText, Download, Mail, Share2, ChevronDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { api } from "@/lib/api";
import { useSettings } from "@/contexts/SettingsContext";
import { printHtmlOverlay } from "@/utils/printOverlay";
import { useToast } from "@/hooks/use-toast";

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

interface TestReport {
  id: string;
  sampleId: string;
  sampleDisplayId: string;
  patientName: string;
  testsDisplay: string;
  cnic: string;
  phone: string;
  status: "draft" | "approved" | "sent";
  createdAt: Date;
  approvedBy?: string;
  hasAbnormalValues: boolean;
  hasCriticalValues: boolean;
  // Per-test reporting (optional fields). When present, this row represents one test within a sample
  testKey?: string;
  testName?: string;
}

function getLabContactFromStorage() {
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
}

function buildHtmlFromTemplate(
  template: any,
  reportData: any,
  options: {
    labName: string;
    labSubtitle: string;
    labLogoUrl: string | null;
    labContact: { phone: string; email: string; address: string };
  }
) {
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

  const logoFromTemplate = template?.components?.find?.((c: any) => c?.type === 'logo')?.data;
  const logoUrl = logoFromTemplate?.imageUrl || options.labLogoUrl;
  const logoSize = typeof logoFromTemplate?.size === 'number' ? logoFromTemplate.size : 64;
  const logoAlignment = (logoFromTemplate?.alignment === 'center' || logoFromTemplate?.alignment === 'right')
    ? logoFromTemplate.alignment
    : 'left';

  const logoHtml = `
    <div style="display:flex;justify-content:${logoAlignment === 'left' ? 'flex-start' : logoAlignment === 'center' ? 'center' : 'flex-end'};padding:8px 0;">
      <div style="width:${logoSize}px;height:${logoSize}px;display:flex;align-items:center;justify-content:center;">
        ${logoUrl
          ? `<img src=\"${logoUrl}\" alt=\"Lab Logo\" style=\"max-width:100%;max-height:100%;object-fit:contain;\" />`
          : `<span style=\"font-size:10px;font-weight:bold;color:#1d4ed8;\">Lab Logo</span>`}
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

  const resultsRows = reportData.testResults
    .map((r) => `
      <tr>
        <td style="padding:4px 6px;border:1px solid #e5e7eb;">${r.parameter}</td>
        <td style="padding:4px 6px;border:1px solid #e5e7eb;">${r.referenceRange}</td>
        <td style="padding:4px 6px;border:1px solid #e5e7eb;color:#4b5563;">${r.unit}</td>
        <td style="padding:4px 6px;border:1px solid #e5e7eb;">${r.result}</td>
        <td style="padding:4px 6px;border:1px solid #e5e7eb;">${r.status}</td>
      </tr>
    `)
    .join("");

  const testNameHtml = reportData && reportData.currentTestName
    ? `<div style="padding:6px 8px;font-weight:600;color:#374151;background:#f9fafb;border-bottom:1px solid #d1d5db;">${reportData.currentTestName}</div>`
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

  const consultantFromTemplate = template?.components
    ?.filter?.((c: any) => c?.type === 'consultant-section')
    ?.slice?.(-1)?.[0]?.data;
  const consultantHtml = consultantFromTemplate
    ? `
      <div style="display:flex;justify-content:flex-end;">
        <div style="text-align:left;font-size:11px;min-width:220px;">
          <div><span style=\"font-weight:600;\">Consultant Name:</span> <span style=\"font-weight:400;\">${consultantFromTemplate?.consultantName || ''}</span></div>
          <div><span style=\"font-weight:600;\">Qualification:</span> <span style=\"font-weight:400;\">${consultantFromTemplate?.qualification || ''}</span></div>
          <div><span style=\"font-weight:600;\">Consultant Pathologist:</span> <span style=\"font-weight:400;\">${consultantFromTemplate?.consultantPathologist || ''}</span></div>
        </div>
      </div>
    `
    : '';

  const footerHtml = `
    <div class="footer" style="font-size:${fontSize}px;color:#000;">
      <div style="padding-top:8px;padding-bottom:8px;">${consultantHtml}</div>
      <div style="padding-top:8px;border-top:1px solid #000;text-align:center;">
        System Generated Report, No Signature Required. Approved By Consultant. Not Valid For Any Court Of Law.
      </div>
    </div>
  `;

  const pieces: string[] = [];
  const components = Array.isArray(template?.components) ? template.components : [];
  for (const comp of components) {
    switch (comp.type) {
      case "header-text":
        pieces.push(headerHtml);
        break;
      case "logo":
        pieces.push(logoHtml);
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
      case "consultant-section":
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
        display: block; /* stack pages vertically */
      }
      .page {
        width: 794px;
        height: 1123px; /* fixed screen height so grid can push footer down */
        border: 1px solid #e5e7eb;
        padding: 16px 24px;
        background: white;
        display: grid;
        grid-template-rows: auto 1fr auto;
        position: relative;
        margin: 0 auto; /* center each page */
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
          height: calc(297mm - 16mm); /* page height minus top+bottom margins */
          min-height: 0;
          border: none;
          padding: 0; /* use @page margins only */
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
}

const ReportGenerator = () => {
  const { toast } = useToast();
  const modulePerm = getModulePermission('Report Generator');
  const viewOnly = !modulePerm.edit;
  const { settings } = useSettings();
  // Prevent any stray window.open popups while this page is active
  useEffect(() => {
    const prevOpen = window.open;
    window.open = ((..._args: any[]) => null) as any;
    return () => { window.open = prevOpen; };
  }, []);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [reportTemplate, setReportTemplate] = useState<any | null>(null);
  const labContact = getLabContactFromStorage();

  const derivedLabName = settings.hospitalName || "Medical Laboratory Report";
  const derivedLabLogoUrl = settings.labLogoUrl || null;
  const derivedLabSubtitle = settings.labSubtitle || "ISO 15189:2012";
  const derivedConsultantPathologist = (settings as any).consultantPathologist || '';
  const derivedConsultantQualification = (settings as any).consultantQualification || '';

  // Fetch completed samples to display as reports
  const [reports, setReports] = useState<TestReport[]>([]);

  const fetchReports = () => {
    api
      // add cache-busting query param so browser does not reuse stale 304-cached response
      .get<any[]>("/labtech/samples", { params: { _ts: Date.now() } })
      .then(({ data }) => {
        const completedWithResults = (data || [])
          .filter(s => s.status === "completed")
          // Only include samples where at least one result has a non-empty value
          .filter(s => Array.isArray((s as any).results) && (s as any).results.some((r: any) => {
            if (!r) return false;
            const v = (r as any).value;
            if (v === null || v === undefined) return false;
            return String(v).trim() !== "";
          }));
        const out: TestReport[] = [];
        completedWithResults.forEach((s: any) => {
          const anyS: any = s as any;
          const sampleDisplayId = anyS.sampleNumber || anyS.barcode || s._id;
          const cnic = anyS.cnic || anyS.patientCnic || anyS.patientCNIC || '';
          const phone = anyS.phone || anyS.patientPhone || '';
          const testsDisplay = (s.tests || [])
            .map((t: any) => (typeof t === 'string' ? (anyS.testNames || []).find((n: string) => n && n.toLowerCase().includes(String(t).toLowerCase())) || String(t) : (t?.name || '')))
            .filter(Boolean)
            .join(', ');
          out.push({
            id: `RPT${s._id.substring(s._id.length-4)}`,
            sampleId: s._id,
            sampleDisplayId: String(sampleDisplayId),
            patientName: s.patientName,
            testsDisplay,
            cnic: String(cnic || '-'),
            phone: String(phone || '-'),
            status: "approved",
            createdAt: new Date((s as any).completedAt || (s as any).updatedAt || (s as any).createdAt),
            approvedBy: (s as any).processedBy || "LabTech",
            hasAbnormalValues: (anyS.results||[]).some((r:any)=>r.isAbnormal && !r.isCritical),
            hasCriticalValues: (anyS.results||[]).some((r:any)=>r.isCritical)
          });
        });

        setReports(out);
      })
      .catch(() => setReports([]));
  };

  // fetch reports from completed samples on mount
  useEffect(() => {
    fetchReports();
  }, []);

  // Load saved report template from settings so View/Print can use it
  useEffect(() => {
    api
      .get("/settings")
      .then(({ data }) => {
        setReportTemplate(data?.reportTemplate || null);
      })
      .catch(() => {
        setReportTemplate(null);
      });
  }, []);


  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-gray-600 text-white";
      case "approved": return "bg-green-600 text-white";
      case "sent": return "bg-blue-600 text-white";
      default: return "bg-gray-600 text-white";
    }
  };

  // Helpers copied from Barcodes so View uses the same template
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
        String(sample.test)
          .split(",")
          .map((v) => v.trim())
          .forEach((v) => v && names.push(v));
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
        String(sample.test)
          .split(",")
          .map((v) => v.trim().toLowerCase())
          .forEach((v) => v && names.push(v));
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
  };

  const buildPatientReportData = (sample: any, testKey?: string) => {
    const reportDate = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const patientName = sample?.patientName || '';
    const age = sample?.age ? `${sample.age} Years` : 'N/A';
    const gender = sample?.gender || 'N/A';
    const phone = sample?.phone || sample?.patientPhone || '';
    const cnic = sample?.cnic || sample?.patientCnic || sample?.patientCNIC || '';
    const address = sample?.address || '';
    const referringDoctor = (sample?.referringDoctor || sample?.referringPhysician || sample?.referringPhysicianName || '').toString();
    const sampleCollectedBy = (sample?.sampleCollectedBy || sample?.collectedBy || '').toString();
    const collectedSample = (sample?.collectedSample || sample?.sampleType || '').toString();
    const collection = sample?.createdAt
      ? new Date(sample.createdAt).toLocaleString('en-US', {
          year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true,
        })
      : sample?.collectionTime || 'N/A';
    const sampleId = sample?.sampleNumber || sample?.barcode || sample?._id || 'N/A';

    let testResults: Array<{ parameter: string; result: string; unit: string; referenceRange: string; status: string }> = [];
    let currentTestName: string | undefined = undefined;

    if (Array.isArray(sample?.results) && sample.results.length > 0) {
      const src = testKey
        ? sample.results.filter((r: any) => typeof r?.parameterId === 'string' && r.parameterId.startsWith(`${testKey}::`))
        : sample.results;
      // Try to infer a user-friendly test name when scoping by testKey
      try {
        if (testKey) {
          const tests = Array.isArray(sample?.tests) ? sample.tests : [];
          const byId = tests.find((t: any) => {
            const ids = [t?._id, t?.id, t?.test].map((x: any) => String(x || ''));
            return ids.includes(String(testKey));
          });
          if (byId && (byId.name || byId.test)) currentTestName = String(byId.name || byId.test);
          if (!currentTestName) {
            const byName = tests.find((t: any) => String(t?.name || '').toLowerCase() === String(testKey).toLowerCase());
            if (byName && byName.name) currentTestName = String(byName.name);
          }
          if (!currentTestName) currentTestName = String(testKey);
        }
      } catch {}
      testResults = src.map((r: any) => {
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
      }
    }

    // Prefer per-test interpretation when testKey provided; otherwise overall interpretation.
    // Do NOT use mock text; if DB has no interpretation, leave empty.
    let clinicalText = '';
    try {
      if (testKey && Array.isArray(sample?.interpretations)) {
        const it = sample.interpretations.find((x: any) => String(x?.testKey || x?.testName || '') === String(testKey));
        if (it && typeof it.text === 'string' && it.text.trim().length) clinicalText = it.text.trim();
      }
    } catch {}
    if (!clinicalText && typeof sample?.interpretation === 'string') {
      const t = sample.interpretation.trim();
      if (t.length) clinicalText = t;
    }

    return {
      patientInfo: {
        name: patientName,
        id: sample?.patientId || `P-2024-001`,
        age,
        gender,
        phone,
        cnic,
        address,
        referringDoctor,
        sampleCollectedBy,
        collectedSample,
        collectionDate: collection,
        reportDate: reportDate,
        sampleId,
        lastUpdated: (sample?.updatedAt || sample?.completedAt)
          ? new Date(sample?.updatedAt || sample?.completedAt).toLocaleString('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })
          : reportDate,
      },
      referringPhysician: {
        name: "Dr. Sarah Johnson, MD",
        department: "Internal Medicine",
      },
      testResults,
      currentTestName,
      clinicalNotes: clinicalText,
      verifiedBy: {
        name: "Dr. John Doe, PhD",
        title: "Laboratory Supervisor",
        license: "LAB-2024-SUP",
      },
    };
  };

  const handleViewHtmlReport = async (report: TestReport, autoPrint: boolean = false) => {
    try {
      const { data: sample } = await api.get(`/labtech/samples/${report.sampleId}`);
      const reportData = buildPatientReportData(sample, report.testKey);
      const includeCBC = sampleHasCBC(sample);
      const testsList = report.testKey ? [report.testsDisplay].filter(Boolean) : getSampleTestNames(sample);
      if (report.testKey && report.testsDisplay) {
        (reportData as any).currentTestName = report.testsDisplay;
      }

      let html: string;

      if (reportTemplate) {
        const tmplOptions = {
          labName: derivedLabName,
          labSubtitle: derivedLabSubtitle,
          labLogoUrl: derivedLabLogoUrl,
          labContact,
          consultantPathologist: derivedConsultantPathologist,
          consultantQualification: derivedConsultantQualification,
        };

        // Generate one page per test (when prefixed parameterIds are found) for both View and Print
        try {
          const resArr: any[] = Array.isArray(sample?.results) ? sample.results : [];
          const keysSet = new Set<string>();
          resArr.forEach((r: any) => {
            const pid = String(r?.parameterId || '');
            const idx = pid.indexOf('::');
            if (idx > 0) keysSet.add(pid.slice(0, idx));
          });
          const keys = Array.from(keysSet);
          if (keys.length > 0) {
            const resolveName = (key: string): string => {
              try {
                const tests = Array.isArray(sample?.tests) ? sample.tests : [];
                const byId = tests.find((t: any) => {
                  const ids = [t?._id, t?.id, t?.test].map((x: any) => String(x || ''));
                  return ids.includes(String(key));
                });
                if (byId && (byId.name || byId.test)) return String(byId.name || byId.test);
                const byName = tests.find((t: any) => String(t?.name || '').toLowerCase() === String(key).toLowerCase());
                if (byName && byName.name) return String(byName.name);
                return String(key);
              } catch {
                return String(key);
              }
            };
            const pages: string[] = [];
            keys.forEach((key) => {
              const dataK = buildPatientReportData(sample, key);
              (dataK as any).currentTestName = resolveName(key);
              const page = buildHtmlFromTemplate(reportTemplate, dataK, tmplOptions);
              pages.push(page);
            });
            html = pages.join("\n");
          } else {
            html = buildHtmlFromTemplate(reportTemplate, reportData, tmplOptions);
          }
        } catch {
          html = buildHtmlFromTemplate(reportTemplate, reportData, tmplOptions);
        }
      } else {
        // Use previous static HTML structure as a fallback, but wrap in A4-sized page
        // Generate one page per test using a default template when keys are found (for View and Print)
        try {
          const resArr: any[] = Array.isArray(sample?.results) ? sample.results : [];
          const keysSet = new Set<string>();
          resArr.forEach((r: any) => {
            const pid = String(r?.parameterId || '');
            const idx = pid.indexOf('::');
            if (idx > 0) keysSet.add(pid.slice(0, idx));
          });
          const keys = Array.from(keysSet);
          if (keys.length > 0) {
            const resolveName = (key: string): string => {
              try {
                const tests = Array.isArray(sample?.tests) ? sample.tests : [];
                const byId = tests.find((t: any) => {
                  const ids = [t?._id, t?.id, t?.test].map((x: any) => String(x || ''));
                  return ids.includes(String(key));
                });
                if (byId && (byId.name || byId.test)) return String(byId.name || byId.test);
                const byName = tests.find((t: any) => String(t?.name || '').toLowerCase() === String(key).toLowerCase());
                if (byName && byName.name) return String(byName.name);
                return String(key);
              } catch {
                return String(key);
              }
            };
            const fallbackTemplate = {
              components: [
                { type: 'header-text' },
                { type: 'patient-info' },
                { type: 'result-table' },
                { type: 'notes' },
              ],
              styles: { fontSize: 12, headerColor: '#f3f4f6' },
            } as any;
            const pages: string[] = [];
            keys.forEach((key) => {
              const dataK = buildPatientReportData(sample, key);
              (dataK as any).currentTestName = resolveName(key);
              const page = buildHtmlFromTemplate(fallbackTemplate, dataK, {
                labName: derivedLabName,
                labSubtitle: derivedLabSubtitle,
                labLogoUrl: derivedLabLogoUrl,
                labContact,
              });
              pages.push(page);
            });
            html = pages.join('\n');
          } else {
            html = `
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.4; 
            color: #111827; 
            padding: 0;
            font-size: 12px;
            display: block; /* stack pages vertically */
          }
          .page {
            width: 794px;
            height: 1123px; /* fixed screen height so grid can push footer down */
            border: 1px solid #e5e7eb;
            padding: 16px 24px;
            background: white;
            display: grid;
            grid-template-rows: auto 1fr auto;
            position: relative;
            margin: 0 auto; /* center each page */
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
              height: calc(297mm - 16mm); /* page height minus top+bottom margins */
              min-height: 0;
              border: none;
              padding: 0; /* use @page margins only */
              margin: 0 auto;
            }
            .footer { position: absolute; left: 0; right: 0; bottom: 8mm; }
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
          .footer { 
            text-align: center; 
            font-size: 12px; 
            color: #000; 
            border-top: 1px solid #000; 
            padding-top: 8px; 
            margin-top: 8px;
          }
        </style>

        <div class="page">
        <div class="content">
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

        </div>
        <div class="footer">
          System Generated Report, No Signature Required. Approved By Consultant. Not Valid For Any Court Of Law.
        </div>
        </div>
      `;
          }
        } catch {
          html = `
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.4; 
            color: #111827; 
            padding: 0;
            font-size: 12px;
            display: block; /* stack pages vertically */
          }
          .page {
            width: 794px;
            height: 1123px; /* fixed screen height so grid can push footer down */
            border: 1px solid #e5e7eb;
            padding: 16px 24px;
            background: white;
            display: grid;
            grid-template-rows: auto 1fr auto;
            position: relative;
            margin: 0 auto; /* center each page */
            page-break-after: always;
            break-after: page;
          }
          .content { min-height: 0; }
          @media print {
            @page { size: A4; margin: 8mm; }
            body { margin: 0; padding: 0; }
            .page {
              width: 100%;
              height: calc(297mm - 16mm); /* page height minus top+bottom margins */
              min-height: 0;
              border: none;
              padding: 0; /* use @page margins only */
              margin: 0 auto;
            }
            .footer { position: absolute; left: 0; right: 0; bottom: 0; }
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
          .footer { 
            text-align: center; 
            font-size: 12px; 
            color: #000; 
            border-top: 1px solid #000; 
            padding-top: 8px; 
            margin-top: 8px;
          }
        </style>

        <div class="page">
        <div class="content">
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

        </div>
        <div class="footer">
          System Generated Report, No Signature Required. Approved By Consultant. Not Valid For Any Court Of Law.
        </div>
        </div>
      `;
        }
      }

      printHtmlOverlay(html, { autoPrint, width: 794, height: 1123 });
    } catch (err) {
      console.error('Failed to build HTML report', err);
      alert('Failed to open report view');
    }
  };

  // Filtering for reports
  const filteredReports = reports.filter(report => {
    const matchesSearch = 
      report.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.testsDisplay.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.sampleDisplayId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || report.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const generatePDF = async (reportId: string, mode: 'save' | 'print' = 'save') => {
    // Find the report data
    const report = reports.find(r => r.id === reportId);
    if (!report) return;
    // For print, reuse the exact same HTML/template as the View dialog, but auto-trigger browser print
    if (mode === 'print') {
      await handleViewHtmlReport(report, true);
      return;
    }
    try {
      // Use statically imported jsPDF and autoTable to avoid dynamic import issues
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });

      const marginLeft = 40;
      let cursorY = 36;

      // Load branding: prefer Lab name/logo
      const settingsRaw = (typeof window !== 'undefined') ? localStorage.getItem('labSettings') : null;
      const labSettings = settingsRaw ? JSON.parse(settingsRaw) : {};
      const labName = (typeof window !== 'undefined' ? (localStorage.getItem('labName') || '') : '') || labSettings?.labName || 'Lab Management System';

      // Fetch sample with results and demographics
      let sampleData: any = null;
      if (report.sampleId) {
        try {
          const { data } = await api.get(`/labtech/samples/${report.sampleId}`);
          sampleData = data;
        } catch {}
      }

      // Compute a fallback sequential Sample # if sampleNumber absent
      let sampleNumberDisplay: string | null = null;
      if (sampleData?.sampleNumber != null) {
        sampleNumberDisplay = String(sampleData.sampleNumber);
      } else if (report.sampleId) {
        try {
          const { data: allSamples } = await api.get(`/labtech/samples`);
          const sorted = (allSamples || []).sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          const idx = sorted.findIndex((s: any) => String(s._id) === String(report.sampleId));
          if (idx >= 0) sampleNumberDisplay = String(idx + 1);
        } catch {}
      }

      // Optional logo: only use safe URL schemes to avoid file:// errors in Electron
      const storedLogo = localStorage.getItem('labLogoUrl') || localStorage.getItem('hospitalLogoUrl') || '';
      const safeLogo = /^https?:\/\//i.test(storedLogo) || /^data:/i.test(storedLogo) ? storedLogo : '';
      if (safeLogo) {
        try {
          const img = new Image();
          img.src = safeLogo;
          await new Promise(res => { img.onload = () => res(null); img.onerror = () => res(null); });
          if (img.width && img.height) {
            doc.addImage(img, 'PNG', marginLeft, cursorY, 60, 60);
          }
        } catch {}
      }

      // Header: Hospital/Lab name and report title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      // Lab name in green
      doc.setTextColor(34, 139, 34);
      doc.text(labName, marginLeft + 80, cursorY + 24);
      // Reset color for subtitle
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Laboratory Report', marginLeft + 80, cursorY + 44);

      // Right-side reporting timestamp
      doc.setFontSize(10);
      doc.text(`Reporting Time: ${new Date().toLocaleString()}`, 400, cursorY + 16);

      // Patient Details box
      cursorY += 70;
      doc.setDrawColor(200);
      doc.setLineWidth(1);
      const detailsBoxHeight = 110;
      doc.roundedRect(marginLeft, cursorY, 515, detailsBoxHeight, 6, 6);
      const pad = 10;
      let infoY = cursorY + pad + 4;
      const pName = sampleData?.patientName || report.patientName || '-';
      const pAge = (sampleData?.age != null) ? String(sampleData.age) : '-';
      const pSex = (sampleData?.gender != null) ? String(sampleData.gender) : '-';
      const pPhone = sampleData?.phone || '-';
      // Remove email per requirement
      const pAddr = sampleData?.address || '-';
      const pGuardian = (sampleData?.guardianRelation || sampleData?.guardianName)
        ? `${sampleData?.guardianRelation ? String(sampleData.guardianRelation) + ' ' : ''}${sampleData?.guardianName ? String(sampleData.guardianName) : ''}`
        : '-';
      const pCnic = (sampleData?.cnic) ? String(sampleData.cnic) : '-';
      const regDate = (sampleData?.createdAt ? new Date(sampleData.createdAt) : report.createdAt).toLocaleString();
      const sampleId = sampleNumberDisplay || 'N/A';

      // Title
      doc.setFont('helvetica', 'bold');
      doc.text('Patient Details:', marginLeft + pad, infoY);
      // Sample number on the right in the same row
      doc.text('Sample No:', marginLeft + 350, infoY);
      doc.setFont('helvetica', 'normal');
      doc.text(`${sampleId}`, marginLeft + 430, infoY);
      infoY += 16;

      // Two-column layout
      const leftX = marginLeft + pad;
      const rightX = marginLeft + 260; // roughly half width

      doc.setFont('helvetica', 'bold'); doc.text('Name:', leftX, infoY); doc.setFont('helvetica', 'normal'); doc.text(` ${pName}`, leftX + 38, infoY);
      doc.setFont('helvetica', 'bold'); doc.text('Age/Sex:', rightX, infoY); doc.setFont('helvetica', 'normal'); doc.text(` ${pAge} / ${pSex}`, rightX + 56, infoY);
      infoY += 16;
      doc.setFont('helvetica', 'bold'); doc.text('Phone:', leftX, infoY); doc.setFont('helvetica', 'normal'); doc.text(` ${pPhone}`, leftX + 44, infoY);
      doc.setFont('helvetica', 'bold'); doc.text('CNIC:', rightX, infoY); doc.setFont('helvetica', 'normal'); doc.text(` ${pCnic}`, rightX + 40, infoY);
      infoY += 16;
      doc.setFont('helvetica', 'bold'); doc.text('Guardian:', leftX, infoY); doc.setFont('helvetica', 'normal'); doc.text(` ${pGuardian}`, leftX + 62, infoY);
      infoY += 16;
      doc.setFont('helvetica', 'bold'); doc.text('Address:', leftX, infoY); doc.setFont('helvetica', 'normal');
      const addrLines = doc.splitTextToSize(` ${pAddr}`, 470);
      doc.text(addrLines, leftX + 52, infoY);
      infoY += 16 + (addrLines.length > 1 ? (addrLines.length - 1) * 12 : 0);
      // Registration line full width
      doc.setFont('helvetica', 'bold'); doc.text('Registration:', leftX, infoY); doc.setFont('helvetica', 'normal'); doc.text(` ${regDate}`, leftX + 72, infoY);

      cursorY += 110;

      // Tests Ordered section
      if (sampleData) {
        const testNames: string[] = (sampleData.tests || []).map((t: any) => (typeof t === 'string' ? '' : (t?.name || ''))).filter((n: string) => n);
        if (testNames.length) {
          doc.setFont('helvetica', 'bold');
          doc.text('Tests Ordered', marginLeft, cursorY);
          doc.setFont('helvetica', 'normal');
          cursorY += 14;
          const listText = testNames.join(', ');
          const splitTests = doc.splitTextToSize(listText, 515);
          doc.text(splitTests, marginLeft, cursorY);
          cursorY += 20 + (splitTests.length > 1 ? (splitTests.length - 1) * 12 : 0);
        }
      }

      // Build results table combining saved results + parameter metadata
      let tableRows: any[] = [];
      if (sampleData) {
        // Fetch all tests for parameter metadata
        const testIds: string[] = (sampleData.tests || []).map((t: any) => (typeof t === 'string' ? t : (t?._id || t?.id))).filter(Boolean);
        let paramMeta: Record<string, any> = {};
        const normKey = (p: any) => {
          const id = p?.id != null ? String(p.id) : '';
          const name = (p?.name || '').toString().trim();
          const unit = (p?.unit || '').toString().trim();
          const byPair = `${name}|${unit}`;
          return { id, byPair };
        };
        if (testIds.length) {
          try {
            const detailsArrays = await Promise.all(testIds.map(async (tid: string) => {
              const { data: d } = await api.get(`/labtech/tests/${tid}`);
              return (d.parameters || []).map((p: any, idx: number) => ({
                id: p?.id || ((p?.name || p?.unit) ? `${p?.name || ''}|${p?.unit || ''}` : `p_${idx}`),
                name: p.name, unit: p.unit,
                normalRange: p.normalRange || { min: undefined, max: undefined },
                normalRangeMale: p.normalRangeMale || p.normalRange_male || null,
                normalRangeFemale: p.normalRangeFemale || p.normalRange_female || null,
                normalRangePediatric: p.normalRangePediatric || p.normalRange_pediatric || null,
              }));
            }));
            detailsArrays.flat().forEach((p: any) => {
              const keys = normKey(p);
              if (keys.id) paramMeta[keys.id] = p;
              if (keys.byPair) paramMeta[keys.byPair] = p;
              if (!keys.id && !keys.byPair) paramMeta[`p_${p.name}`] = p;
            });
          } catch {}
        }

        const ageNum = sampleData?.age ? parseFloat(sampleData.age) : NaN;
        const isPediatric = !isNaN(ageNum) && ageNum < 13;
        const sex = (sampleData?.gender || '').toLowerCase();
        const group = isPediatric ? 'pediatric' : (sex.startsWith('f') ? 'female' : (sex.startsWith('m') ? 'male' : '')); 

        const resultsForTable = (sampleData.results || []);

        tableRows = resultsForTable.map((r: any) => {
          // Parse label like "Sodium|mmol/L" if present
          let parsedName = r.label || r.parameter || r.name || '';
          let parsedUnit = r.unit || '';
          if (parsedName && typeof parsedName === 'string' && parsedName.includes('|')) {
            const parts = parsedName.split('|');
            parsedName = (parts[0] || '').trim();
            parsedUnit = parsedUnit || (parts[1] || '').trim();
          }
          const firstPassKey = r.parameterId != null ? String(r.parameterId) : '';
          const secondPassKey = `${(parsedName || '').toString().trim()}|${(parsedUnit || '').toString().trim()}`;
          const meta = paramMeta[firstPassKey] || paramMeta[secondPassKey] || paramMeta[`p_${parsedName}`] || {};
          const name = parsedName || meta.name || r.parameter || r.name || r.parameterId || '-';
          const unit = parsedUnit || meta.unit || '-';
          let normalText = r.normalText || '-';
          const toRangeText = (rng: any): string => {
            if (!rng) return '-';
            if (typeof rng === 'string') return rng;
            if (typeof rng === 'object' && (typeof rng.min !== 'undefined' || typeof rng.max !== 'undefined')) {
              const min = typeof rng.min === 'number' ? `${rng.min}` : '';
              const max = typeof rng.max === 'number' ? `${rng.max}` : '';
              const parts = [min, max].filter(Boolean);
              return parts.length ? parts.join(' - ') : '-';
            }
            return '-';
          };
          if (!r.normalText) {
            if (group === 'male' && meta.normalRangeMale) normalText = toRangeText(meta.normalRangeMale);
            else if (group === 'female' && meta.normalRangeFemale) normalText = toRangeText(meta.normalRangeFemale);
            else if (group === 'pediatric' && meta.normalRangePediatric) normalText = toRangeText(meta.normalRangePediatric);
            else if (meta.normalRange) normalText = toRangeText(meta.normalRange);
          }
          const value = (typeof r.value === 'number' || typeof r.value === 'string') ? `${r.value}` : '-';
          // Derive status for this row
          const pickRange = () => {
            if (group === 'male' && meta.normalRangeMale) return meta.normalRangeMale;
            if (group === 'female' && meta.normalRangeFemale) return meta.normalRangeFemale;
            if (group === 'pediatric' && meta.normalRangePediatric) return meta.normalRangePediatric;
            return meta.normalRange || null;
          };
          const rng = pickRange();
          let derivedAbnormal = false;
          const vNum = parseFloat(value as string);
          if (!isNaN(vNum) && rng && typeof rng === 'object') {
            const hasMin = typeof rng.min === 'number';
            const hasMax = typeof rng.max === 'number';
            if (hasMin && vNum < rng.min) derivedAbnormal = true;
            if (hasMax && vNum > rng.max) derivedAbnormal = true;
          }
          const status = r.isCritical ? 'Critical' : ((r.isAbnormal || derivedAbnormal) ? 'Abnormal' : (value !== '-' ? 'Normal' : '-'));
          // Match ResultEntry columns: Test Parameter, Normal range, Unit, Result, Status
          return [name, normalText, unit, value, status];
        });
      }

      if (!tableRows.length) tableRows = [[report.testsDisplay || '-', '-', '-', '-', '-']];

      (autoTable as any)(doc, {
        head: [['Test Parameter', 'Normal range', 'Unit', 'Result', 'Status']],
        body: tableRows,
        startY: cursorY,
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [255, 255, 255], fontStyle: 'bold', fontSize: 13, textColor: [0, 0, 0] },
        margin: { left: marginLeft, right: marginLeft },
      });

      // Start post-table sections (heading removed as requested)
      let afterTableY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 20 : cursorY + 20;

      // Render Clinical Interpretation (label + content bold)
      if (sampleData?.interpretation) {
        doc.setFont('helvetica', 'bold');
        doc.text('Clinical Interpretation:', marginLeft, afterTableY);
        afterTableY += 12;
        const splitInterp = doc.splitTextToSize(String(sampleData.interpretation), 515);
        // keep bold for the interpretation content as requested
        doc.setFont('helvetica', 'bold');
        doc.text(splitInterp, marginLeft, afterTableY);
        afterTableY += (splitInterp.length * 12);
      }

      // PDF download uses jsPDF but same data/rows as the View template
      doc.save(`report-${report.id}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Failed to generate report');
    }
  };

  function escapeHtml(s: any){
    return String(s ?? '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }

  const sendReport = (reportId: string) => {
    console.log(`Sending report ${reportId}`);
    // This would trigger email/portal delivery
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Report Generator</h1>
          <p className="text-gray-600">Generate and manage test reports</p>
        </div>
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchReports}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Custom Report Modal removed */}

      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex space-x-2">
          {["all", "approved"].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <div className="overflow-auto">
        <table className="min-w-full border rounded-md overflow-hidden text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-600">
              <th className="px-3 py-2 border-b">Sample ID</th>
              <th className="px-3 py-2 border-b">Patient Name</th>
              <th className="px-3 py-2 border-b">Test</th>
              <th className="px-3 py-2 border-b">CNIC</th>
              <th className="px-3 py-2 border-b">Phone</th>
              <th className="px-3 py-2 border-b">Status</th>
              <th className="px-3 py-2 border-b text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredReports.map((report) => (
              <tr key={report.id} data-report-id={report.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 border-b font-mono">{report.sampleDisplayId}</td>
                <td className="px-3 py-2 border-b">{report.patientName}</td>
                <td className="px-3 py-2 border-b">
                  {(() => {
                    const list = splitCommaOutsideParens(String(report.testsDisplay || '')).filter(Boolean);
                    const uniq = Array.from(new Set(list.map((n) => n.toLowerCase())))
                      .map((lower) => list.find((n) => n.toLowerCase() === lower) || lower);
                    if (uniq.length === 0) return <span>-</span>;
                    return (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 px-2">
                            {uniq.length} {uniq.length === 1 ? 'test' : 'tests'}
                            <ChevronDown className="ml-2 h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="max-h-64 overflow-auto">
                          {uniq.map((n, idx) => (
                            <DropdownMenuItem key={`${n}-${idx}`} onSelect={(e) => e.preventDefault()}>
                              {n}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    );
                  })()}
                </td>
                <td className="px-3 py-2 border-b whitespace-nowrap">{report.cnic}</td>
                <td className="px-3 py-2 border-b whitespace-nowrap">{report.phone}</td>
                <td className="px-3 py-2 border-b">
                  <Badge className={getStatusColor(report.status)}>{report.status}</Badge>
                </td>
                <td className="px-3 py-2 border-b text-right">
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => handleViewHtmlReport(report)}>
                      <Eye className="w-4 h-4 mr-1" /> View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={viewOnly ? 'opacity-50 cursor-not-allowed' : undefined}
                      onClick={() => {
                        if (viewOnly) {
                          toast({ title: 'Not allowed', description: 'You only have view permission for Report Generator.', variant: 'destructive' });
                          return;
                        }
                        generatePDF(report.id, 'print');
                      }}
                    >
                      <Printer className="w-4 h-4 mr-1" /> Print
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredReports.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Search className="w-10 h-10 text-gray-300" />
                    <p>No test reports available yet</p>
                    <p className="text-xs text-gray-400">Completed samples with results will appear here automatically. You can also adjust search or filters above.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      
    </div>
  );
};


export default ReportGenerator;
