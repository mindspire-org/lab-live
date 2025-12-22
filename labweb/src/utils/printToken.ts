export type TokenLike = {
  tokenNumber?: string;
  dateTime?: string | Date;
  patientName?: string;
  age?: string | number;
  gender?: string;
  phone?: string;
  address?: string;
  doctor?: string;
  department?: string;
  finalFee?: number;
  mrNumber?: string;
  billingType?: string;
  corporateName?: string;
  guardianRelation?: 'S/O' | 'D/O' | string;
  guardianName?: string;
  cnic?: string;
};

/**
 * Print a token slip using a hidden iframe for reliable printing.
 * Pulls hospital details from localStorage.hospitalInfo if available.
 */
export function printTokenSlip(token: TokenLike, opts?: { title?: string }) {
  // Use Hospital settings only: aggregated hospitalInfo with per-field fallbacks
  const storedInfo = safeJson(localStorage.getItem('hospitalInfo')) || {};
  const hospitalInfo = {
    name: localStorage.getItem('hospitalName') || storedInfo.name || 'Hospital',
    address: localStorage.getItem('hospitalAddress') || storedInfo.address || '',
    phone: localStorage.getItem('hospitalPhone') || storedInfo.phone || '',
    email: storedInfo.email || localStorage.getItem('hospitalEmail') || '',
    website: storedInfo.website || localStorage.getItem('hospitalWebsite') || '',
    logoUrl: localStorage.getItem('hospitalLogo') || storedInfo.logoUrl || '',
  } as Record<string, string>;
  const title = opts?.title || `Token_${token?.tokenNumber || ''}`;
  const dt = token?.dateTime ? new Date(token.dateTime) : new Date();
  const styles = `
    <style>
      *{ box-sizing: border-box; }
      html, body{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body{ font-family: Segoe UI, Arial, 'Helvetica Neue', system-ui, ui-sans-serif; margin: 10mm; color: #000; font-weight:600; -webkit-font-smoothing: none; text-rendering: optimizeSpeed; }
      .header{ display:block; text-align:center; border-bottom:1px dashed #000; padding-bottom:8px; margin-bottom:10px; }
      .h-left{ display:block; }
      .logo{ width:34px; height:34px; object-fit:contain; margin:0 auto 4px; }
      .title{ font-size:18px; font-weight:700; line-height:1.2; }
      .meta{ font-size:13px; color:#000; font-weight:600; }
      .meta-sm{ font-size:12px; color:#000; font-weight:600; }
      .row{ display:grid; grid-template-columns: 1fr 1fr; gap:8px; font-size:13px; }
      .label{ color:#000; font-weight:600; }
      .value{ font-weight:700; color:#000; }
      .big{ font-size:22px; font-weight:700; letter-spacing:0.5px; }
      .center{ text-align:center; }
      .footer{ border-top:1px dashed #000; margin-top:10px; padding-top:6px; font-size:12px; color:#000; font-weight:600; }
      @page{ size: 80mm auto; margin: 8mm; }
    </style>`;

  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${title}</title>${styles}</head>
    <body>
      <div class="header">
        ${hospitalInfo.logoUrl ? `<img class="logo" src="${escapeHtml(hospitalInfo.logoUrl)}" alt="logo"/>` : ''}
        <div class="title">${escapeHtml(hospitalInfo.name || 'Hospital')}</div>
        ${hospitalInfo.address ? `<div class="meta">${escapeHtml(hospitalInfo.address)}</div>` : ''}
        ${hospitalInfo.phone ? `<div class="meta-sm">Ph: ${escapeHtml(hospitalInfo.phone)}</div>` : ''}
        <div class="big" style="margin-top:6px;">${escapeHtml(token?.tokenNumber || '')}</div>
        <div class="meta">${dt.toLocaleDateString()} ${dt.toLocaleTimeString()}</div>
      </div>

      <div class="row">
        <div><span class="label">MR:</span> <span class="value">${escapeHtml(token?.mrNumber || '')}</span></div>
        <div><span class="label">Dept:</span> <span class="value">${escapeHtml(token?.department || '')}</span></div>
        <div><span class="label">Patient:</span> <span class="value">${escapeHtml(token?.patientName || '')}</span></div>
        <div><span class="label">Doctor:</span> <span class="value">${escapeHtml((token?.doctor || '').split(' - ')[0] || '')}</span></div>
        ${(token?.guardianRelation || token?.guardianName) ? `<div><span class="label">Guardian:</span> <span class="value">${escapeHtml(String(token?.guardianRelation || ''))} ${escapeHtml(String(token?.guardianName || ''))}</span></div>` : ''}
        ${token?.cnic ? `<div><span class="label">CNIC:</span> <span class="value">${escapeHtml(String(token.cnic))}</span></div>` : ''}
        <div><span class="label">Age/Gender:</span> <span class="value">${escapeHtml(String(token?.age ?? ''))} / ${escapeHtml(String(token?.gender || ''))}</span></div>
        <div><span class="label">Phone:</span> <span class="value">${escapeHtml(token?.phone || '')}</span></div>
        <div class="value" style="grid-column: span 2">${escapeHtml(token?.address || '')}</div>
      </div>

      <div class="center" style="margin:10px 0;">
        <div class="label">Final Fee</div>
        <div class="big" style="color:#065f46; padding-right:1mm;">Rs. ${Number(token?.finalFee||0).toFixed(2)}</div>
      </div>

      ${(token?.billingType === 'credit' && token?.corporateName) ? `<div class="center" style="margin:6px 0;color:#1d4ed8;font-weight:600">Corporate: ${escapeHtml(token.corporateName)}</div>` : ''}

      <div class="footer center">
        Powered by Hospital MIS
      </div>

      
    </body></html>`;

  // Use an overlay with an iframe so it works reliably in Electron/Chromium without popup issues
  const overlayId = 'token-print-overlay';
  // Clean any existing overlay
  const existing = document.getElementById(overlayId);
  if (existing) { try { existing.remove(); } catch {} }

  const overlay = document.createElement('div');
  overlay.id = overlayId;
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.background = 'rgba(15,23,42,0.35)';
  overlay.style.zIndex = '2147483647';
  overlay.style.display = 'grid';
  overlay.style.placeItems = 'center';

  // container
  const box = document.createElement('div');
  box.style.width = '520px';
  box.style.maxWidth = '96vw';
  box.style.height = '740px';
  box.style.maxHeight = '92vh';
  box.style.background = '#ffffff';
  box.style.border = '1px solid #cbd5e1';
  box.style.borderRadius = '10px';
  box.style.boxShadow = '0 20px 50px rgba(2,6,23,0.35)';
  box.style.display = 'grid';
  box.style.gridTemplateRows = 'auto 1fr';

  // toolbar
  const bar = document.createElement('div');
  bar.style.display = 'flex';
  bar.style.alignItems = 'center';
  bar.style.justifyContent = 'space-between';
  bar.style.padding = '10px 12px';
  bar.style.borderBottom = '1px solid #e2e8f0';
  bar.style.background = '#f8fafc';
  bar.innerHTML = `<div style="font-weight:700;color:#0f172a">Token Slip Preview</div>
    <div>
      <button id="tp-btn-print" style="padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;cursor:pointer;">Print (Ctrl+P)</button>
      <button id="tp-btn-close" style="padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;cursor:pointer;margin-left:8px;">Close (Ctrl+D)</button>
    </div>`;

  // iframe
  const frame = document.createElement('iframe');
  frame.style.width = '100%';
  frame.style.height = '100%';
  frame.style.border = '0';

  box.appendChild(bar);
  box.appendChild(frame);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  // write content into iframe
  const writeFrame = () => {
    try {
      const doc = frame.contentDocument || frame.contentWindow?.document;
      if (!doc) return;
      doc.open();
      doc.write(html);
      doc.close();
    } catch {}
  };
  if ((frame as any).srcdoc !== undefined) {
    try { (frame as any).srcdoc = html; } catch { writeFrame(); }
  } else {
    writeFrame();
  }
  frame.addEventListener('load', () => { try { frame.contentWindow?.focus(); } catch {} });

  // handlers
  const onPrint = (e?: Event) => { try { e?.preventDefault?.(); frame.contentWindow?.focus(); frame.contentWindow?.print(); } catch {} };
  const onClose = (e?: Event) => {
    try { e?.preventDefault?.(); } catch {}
    try { document.removeEventListener('keydown', onKey, true); } catch {}
    try { overlay.remove(); } catch {}
  };
  const onKey = (e: KeyboardEvent) => {
    const k = (e.key || '').toLowerCase();
    if (e.ctrlKey && k === 'p') { e.preventDefault(); onPrint(e); }
    if (e.ctrlKey && k === 'd') { e.preventDefault(); onClose(e); }
  };
  document.addEventListener('keydown', onKey, true);
  (bar.querySelector('#tp-btn-print') as HTMLButtonElement)?.addEventListener('click', onPrint);
  (bar.querySelector('#tp-btn-close') as HTMLButtonElement)?.addEventListener('click', onClose);
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
