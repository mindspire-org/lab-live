import { printHtmlOverlay } from '@/utils/printOverlay';
export type SampleSlip = {
  sampleNumber?: number | string;
  dateTime?: string | Date;
  patientName?: string;
  guardianRelation?: string; // S/O, D/O, W/O
  guardianName?: string;
  cnic?: string;
  phone?: string;
  age?: string | number;
  gender?: string;
  address?: string;
  referringDoctor?: string;
  sampleCollectedBy?: string;
  collectedSample?: string;
  tests?: { name: string; price?: number }[];
  urgentRate?: number;
  urgentAmount?: number;
  discountRate?: number;
  discountAmount?: number;
  taxRate?: number;
  taxAmount?: number;
  totalAmount?: number;
};

export function printSampleSlip(sample: SampleSlip, opts?: { title?: string }) {
  // Prefer Lab settings if present; fallback to Hospital settings and aggregated hospitalInfo
  const labSettings = safeJson(localStorage.getItem('labSettings')) || {};
  const labLogo = localStorage.getItem('labLogoUrl') || '';
  const storedInfo = safeJson(localStorage.getItem('hospitalInfo')) || {};
  const hospitalInfo = {
    name: labSettings.labName || localStorage.getItem('hospitalName') || storedInfo.name || 'Hospital Lab',
    address: labSettings.address || localStorage.getItem('hospitalAddress') || storedInfo.address || '',
    phone: labSettings.phone || localStorage.getItem('hospitalPhone') || storedInfo.phone || '',
    email: labSettings.email || storedInfo.email || localStorage.getItem('hospitalEmail') || '',
    website: labSettings.website || storedInfo.website || localStorage.getItem('hospitalWebsite') || '',
    logoUrl: labLogo || localStorage.getItem('hospitalLogo') || storedInfo.logoUrl || '',
  } as Record<string, string>;

  const title = opts?.title || `Sample_${sample?.sampleNumber ?? ''}`;
  const dt = sample?.dateTime ? new Date(sample.dateTime) : new Date();
  const styles = `
    <style>
      *{ box-sizing: border-box; }
      html, body{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body{ font-family: Segoe UI, Arial, 'Helvetica Neue', system-ui, ui-sans-serif; margin: 10mm; color: #000; font-weight:400; -webkit-font-smoothing: none; text-rendering: optimizeSpeed; }
      .header{ display:block; text-align:center; border-bottom:1px dashed #000; padding-bottom:8px; margin-bottom:10px; }
      .h-left{ display:block; }
      .logo{ width:44px; height:44px; object-fit:contain; margin:0 auto 4px; }
      .title{ font-size:18px; font-weight:700; line-height:1.15; }
      .meta{ font-size:13px; color:#000; font-weight:600; }
      .meta-sm{ font-size:12px; color:#000; font-weight:600; }
      .dt{ font-weight:400 !important; }
      .row{ display:grid; grid-template-columns: 1fr 1fr; gap:8px; font-size:13px; }
      .label{ color:#000; font-weight:700 !important; }
      .value{ font-weight:400 !important; color:#000; }
      .phone-number{ font-weight:400 !important; }
      .big{ font-size:22px; font-weight:700; letter-spacing:0.5px; }
      .center{ text-align:center; }
      .footer{ border-top:1px dashed #000; margin-top:10px; padding-top:6px; font-size:12px; color:#000; font-weight:600; }
      .tests{ margin-top:8px; font-size:13px; }
      .tests .item{ display:flex; justify-content:space-between; padding:4px 0; font-weight:400 !important; }
      .tests .item span:first-child{ min-width: 0; padding-right:10px; overflow-wrap:anywhere; }
      .tests .item span:last-child{ white-space:nowrap; }
      .divider{ border-top:1px dashed #000; margin:6px 0; }
      .total{ display:flex; justify-content:space-between; font-weight:700; margin-top:6px; border-top:1px dashed #000; padding-top:6px; }
      @media screen {
        body{ margin: 10px; }
      }
      @media screen and (max-width: 520px) {
        body{ margin: 8px; }
        .row{ grid-template-columns: 1fr; }
        .big{ font-size:20px; }
      }
      @media print {
        @page{ size: 80mm auto; margin: 8mm; }
      }
    </style>`;

  const testsHtml = (sample.tests || [])
    .map(t => `<div class="item"><span>${escapeHtml(t.name)}</span><span>${formatCurrency(Number(t.price||0))}</span></div>`) 
    .join('');

  const urgentRate = Number(sample?.urgentRate || 0);
  const urgentAmount = Number(sample?.urgentAmount || 0);
  const discountRate = Number(sample?.discountRate || 0);
  const discountAmount = Number(sample?.discountAmount || 0);
  const taxRate = Number(sample?.taxRate || 0);
  const taxAmount = Number(sample?.taxAmount || 0);

  const chargesHtml = `
    ${urgentRate > 0 ? `<div class="item"><span>Urgent charges (${urgentRate.toFixed(0)}%)</span><span>+ ${formatCurrency(urgentAmount)}</span></div>` : ''}
    <div class="item"><span>Discount (${discountRate.toFixed(0)}%)</span><span>- ${formatCurrency(discountAmount)}</span></div>
    <div class="item"><span>Tax (${taxRate.toFixed(0)}%)</span><span>+ ${formatCurrency(taxAmount)}</span></div>
  `;

  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${title}</title>${styles}</head>
    <body>
      <div class="header">
        <div class="h-left">
          ${hospitalInfo.logoUrl ? `<img class="logo" src="${escapeHtml(hospitalInfo.logoUrl)}" alt="logo"/>` : ''}
          <div>
            <div class="title">${escapeHtml(hospitalInfo.name || 'Hospital Lab')}</div>
            ${hospitalInfo.address ? `<div class="meta">${escapeHtml(hospitalInfo.address)}</div>` : ''}
            ${hospitalInfo.phone ? `
              <div class="meta-sm">
                <span class="phone-number">Ph: ${escapeHtml(hospitalInfo.phone)}</span>
              </div>
            ` : ''}
          </div>
        </div>
        <div class="center">
          <div class="big">${escapeHtml(String(sample?.sampleNumber ?? ''))}</div>
          <div class="meta dt">${dt.toLocaleDateString()} ${dt.toLocaleTimeString()}</div>
        </div>
      </div>

      <div class="row">
        <div><span class="label">Patient:</span> <span class="value">${escapeHtml(sample?.patientName || '')}</span></div>
        <div><span class="label">CNIC:</span> <span class="value">${escapeHtml(sample?.cnic || '')}</span></div>
        ${(sample?.guardianRelation || sample?.guardianName) ? `<div><span class="label">Guardian:</span> <span class="value">${escapeHtml(String(sample?.guardianRelation || ''))} ${escapeHtml(String(sample?.guardianName || ''))}</span></div>` : ''}
        <div><span class="label">Age/Gender:</span> <span class="value">${escapeHtml(String(sample?.age ?? ''))} / ${escapeHtml(String(sample?.gender || ''))}</span></div>
        <div><span class="label">Phone:</span> <span class="value phone-number">${escapeHtml(sample?.phone || '')}</span></div>
        ${sample?.referringDoctor ? `<div><span class="label">Ref Doctor:</span> <span class="value">${escapeHtml(sample?.referringDoctor || '')}</span></div>` : ''}
        ${sample?.sampleCollectedBy ? `<div><span class="label">Collected By:</span> <span class="value">${escapeHtml(sample?.sampleCollectedBy || '')}</span></div>` : ''}
        ${sample?.collectedSample ? `<div><span class="label">Sample:</span> <span class="value">${escapeHtml(sample?.collectedSample || '')}</span></div>` : ''}
        <div style="grid-column: span 2"><span class="label">Address:</span> <span class="value">${escapeHtml(sample?.address || '')}</span></div>
      </div>

      <div class="tests">
        <div class="divider"></div>
        ${testsHtml}
        <div class="divider"></div>
        ${chargesHtml}
        <div class="total"><span>Total</span><span>${formatCurrency(Number(sample?.totalAmount||0))}</span></div>
      </div>

      <div class="footer center">
        Powered by MindSpire
      </div>
    </body></html>`;

  // Use unified overlay: Ctrl+P prints, Ctrl+D closes
  printHtmlOverlay(html, { title, width: 520, height: 740 });
}

function safeJson(s: string | null): any {
  try { return s ? JSON.parse(s) : null; } catch { return null; }
}

function escapeHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatCurrency(amount: number): string {
  return `Rs. ${Number(amount||0).toLocaleString()}`;
}
