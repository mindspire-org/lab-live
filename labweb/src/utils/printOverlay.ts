export function printHtmlOverlay(html: string, options?: {
  title?: string;
  width?: number; // px
  height?: number; // px
  autoPrint?: boolean; // if true, trigger print automatically after load
}) {
  const overlayId = 'token-print-overlay';
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

  const box = document.createElement('div');
  const w = options?.width ?? 520;
  const h = options?.height ?? 740;
  box.style.width = `${w}px`;
  box.style.maxWidth = '96vw';
  box.style.height = `${h}px`;
  box.style.maxHeight = '92vh';
  box.style.background = '#ffffff';
  box.style.border = '1px solid #cbd5e1';
  box.style.borderRadius = '10px';
  box.style.boxShadow = '0 20px 50px rgba(2,6,23,0.35)';
  box.style.display = 'grid';
  box.style.gridTemplateRows = 'auto 1fr';

  const bar = document.createElement('div');
  bar.style.display = 'flex';
  bar.style.alignItems = 'center';
  bar.style.justifyContent = 'space-between';
  bar.style.padding = '10px 12px';
  bar.style.borderBottom = '1px solid #e2e8f0';
  bar.style.background = '#ffffff';
  bar.innerHTML = `
    <div style="font-weight:700; font-size:13px; color:#0f172a;">Receipt Preview</div>
    <div style="display:flex; gap:8px;">
      <button id="tp-btn-print" type="button" style="padding:6px 10px; border:1px solid #cbd5e1; background:#ffffff; border-radius:8px; font-weight:700; font-size:12px; cursor:pointer;">Print</button>
      <button id="tp-btn-close" type="button" style="padding:6px 10px; border:1px solid #cbd5e1; background:#0f172a; color:#ffffff; border-radius:8px; font-weight:700; font-size:12px; cursor:pointer;">Close</button>
    </div>
  `;

  const frame = document.createElement('iframe');
  frame.style.width = '100%';
  frame.style.height = '100%';
  frame.style.border = '0';

  box.appendChild(bar);
  box.appendChild(frame);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  const writeFrame = () => {
    try {
      const doc = frame.contentDocument || frame.contentWindow?.document;
      if (!doc) return;
      doc.open();
      doc.write(html);
      doc.close();
      injectContrastStyles();
    } catch {}
  };
  if ((frame as any).srcdoc !== undefined) {
    try { (frame as any).srcdoc = html; injectContrastStyles(); } catch { writeFrame(); }
  } else {
    writeFrame();
  }
  frame.addEventListener('load', () => {
    try { injectContrastStyles(); frame.contentWindow?.focus(); } catch {}
    try {
      if (options?.autoPrint) {
        setTimeout(() => { onPrint(); }, 30);
      }
    } catch {}
  });

  const onPrint = (e?: Event) => { try { e?.preventDefault?.(); frame.contentWindow?.focus(); frame.contentWindow?.print(); } catch {} };
  const onClose = (e?: Event) => {
    try { e?.preventDefault?.(); } catch {}
    try { document.removeEventListener('keydown', onKey, true); } catch {}
    try { overlay.remove(); } catch {}
  };

  (bar.querySelector('#tp-btn-print') as HTMLButtonElement | null)?.addEventListener('click', onPrint);
  (bar.querySelector('#tp-btn-close') as HTMLButtonElement | null)?.addEventListener('click', onClose);
  const onKey = (e: KeyboardEvent) => {
    const k = (e.key || '').toLowerCase();
    if (e.ctrlKey && k === 'p') { e.preventDefault(); onPrint(e); }
    if (e.ctrlKey && k === 'd') { e.preventDefault(); onClose(e); }
  };
  document.addEventListener('keydown', onKey, true);
  // Allow closing by clicking on the dimmed background (but not inside the report box)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      onClose(e);
    }
  });

  function injectContrastStyles(){
    try {
      const doc = frame.contentDocument || frame.contentWindow?.document;
      if (!doc) return;
      const style = doc.createElement('style');
      style.textContent = `
        html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; height: 100%; }
        body, body * { color: #000 !important; font-weight: 700 !important; text-shadow: none !important; box-shadow: none !important; }
        @page { size: A4; margin: 8mm; }
      `;
      doc.head?.appendChild(style);
    } catch {}
  }
}
