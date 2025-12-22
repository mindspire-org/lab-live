import { useEffect, useMemo, useState } from 'react';
import { useParams, NavLink, useSearchParams } from 'react-router-dom';
import { get as apiGet, post as apiPost } from '../lib/api';
import BrandedHeader from './corporate/BrandedHeader';

// Types
type LineItem = { sr: number; description: string; rate: number; qty: number; amount: number };

type Invoice = {
  refNo?: string;
  mrn?: string;
  patientName?: string;
  employeeName?: string;
  relationWithPatient?: string;
  bps?: string;
  designation?: string;
  employeeNo?: string;
  procedure?: string;
  dateOfAdmission?: string;
  dateOfDischarge?: string;
  daysOccupied?: number;
  lineItems: LineItem[];
  totalAmount: number;
  discount: number;
  totalPayable: number;
  currency?: string;
};

export default function InvoicePage({ patientId, embedded }: { patientId?: string; embedded?: boolean }){
  const { id: routeId = '' } = useParams(); // patient id via route
  const id = patientId || routeId; // effective id (prop takes precedence)
  const [search] = useSearchParams();
  const readOnly = (search.get('mode') === 'view') || (search.get('readonly') === '1');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inv, setInv] = useState<Invoice>({ lineItems: defaultRows(), totalAmount: 0, discount: 0, totalPayable: 0, currency: 'PKR' });
  const [patient, setPatient] = useState<{ name?: string; mrn?: string; admitDate?: string; exitDate?: string; phone?: string; address?: string }|null>(null);

  // Load patient and existing invoice
  useEffect(()=>{ if(!id) return; (async()=>{
    try {
      setLoading(true);
      const p = await apiGet<{ ok: boolean; item?: any; patient?: any }>(`/api/corporate/patients/${id}` as any).catch(()=>({} as any));
      if ((p as any)?.patient) {
        setPatient({ name: p.patient.name, mrn: p.patient.mrn || p.patient.mrNumber, admitDate: p.patient.admitDate, exitDate: p.patient.exitDate, phone: p.patient.phone, address: p.patient.address });
      }
    } finally {
      setLoading(false);
    }
  })(); },[id]);

  // If no invoice exists yet, prefill MRN from patient once loaded
  useEffect(()=>{
    if (!inv.mrn && patient?.mrn) {
      setInv(s => ({ ...s, mrn: patient.mrn! }));
    }
  }, [patient?.mrn]);

  useEffect(()=>{ if(!id) return; (async()=>{
    try {
      const res = await apiGet<{ ok: boolean; item: Invoice|null }>(`/api/corporate/patients/${id}/invoice`);
      if (res.item) setInv(fillRows(res.item));
    } catch {/* ignore */}
  })(); }, [id]);

  // When patient loads, prefill invoice fields if empty
  useEffect(()=>{
    if (!patient) return;
    setInv(v=>{
      const next = { ...v } as Invoice;
      if (!next.mrn && patient.mrn) next.mrn = patient.mrn;
      if (!next.patientName && patient.name) next.patientName = patient.name;
      if (!next.dateOfAdmission && patient.admitDate) next.dateOfAdmission = patient.admitDate as any;
      if (!next.dateOfDischarge && patient.exitDate) next.dateOfDischarge = patient.exitDate as any;
      // derive days occupied if dates present and field empty
      const d1 = next.dateOfAdmission ? new Date(next.dateOfAdmission) : null;
      const d2 = next.dateOfDischarge ? new Date(next.dateOfDischarge) : null;
      if (next.daysOccupied == null && d1 && d2 && !isNaN(d1 as any) && !isNaN(d2 as any)){
        const days = Math.max(0, Math.ceil((d2.getTime() - d1.getTime())/(1000*60*60*24)));
        next.daysOccupied = days;
      }
      return next;
    });
  }, [patient]);

  // Recalculate days occupied when admission/discharge dates change
  useEffect(()=>{
    const d1 = inv.dateOfAdmission ? new Date(inv.dateOfAdmission) : null;
    const d2 = inv.dateOfDischarge ? new Date(inv.dateOfDischarge) : null;
    if (!d1 || !d2 || isNaN(d1 as any) || isNaN(d2 as any)) return;
    const days = Math.max(0, Math.ceil((d2.getTime() - d1.getTime())/(1000*60*60*24)));
    if (inv.daysOccupied !== days){
      setInv(v=>({ ...v, daysOccupied: days }));
    }
  }, [inv.dateOfAdmission, inv.dateOfDischarge]);

  const totals = useMemo(()=>{
    const totalAmount = (inv.lineItems||[]).reduce((s, r)=> s + Number(r.amount||0), 0);
    const discount = Number(inv.discount||0);
    const totalPayable = Math.max(0, totalAmount - discount);
    return { totalAmount, discount, totalPayable };
  }, [inv.lineItems, inv.discount]);

  useEffect(()=>{
    setInv(v=>({ ...v, totalAmount: totals.totalAmount, totalPayable: totals.totalPayable }));
  }, [totals.totalAmount, totals.totalPayable]);

  function defaultRows(): LineItem[]{
    return Array.from({ length: 10 }).map((_,i)=>({ sr: i+1, description: '', rate: 0, qty: 0, amount: 0 }));
  }
  function fillRows(data: Invoice): Invoice{
    const rows = [...(data.lineItems||[])];
    while (rows.length < 10) rows.push({ sr: rows.length+1, description: '', rate: 0, qty: 0, amount: 0 });
    return { ...data, lineItems: rows };
  }

  function setRow(i: number, patch: Partial<LineItem>){
    setInv(v=>{
      const items = [...v.lineItems];
      const old = items[i];
      const next = { ...old, ...patch } as LineItem;
      // auto compute amount if rate/qty changed
      const rate = Number(next.rate||0); const qty = Number(next.qty||0);
      if (patch.rate != null || patch.qty != null) next.amount = rate * qty;
      items[i] = next;
      return { ...v, lineItems: items };
    });
  }

  async function save(){
    if (!id) return;
    setSaving(true);
    try {
      const payload = {
        ...inv,
        lineItems: inv.lineItems.filter(r=> r.description || r.rate || r.qty || r.amount),
        dateOfAdmission: inv.dateOfAdmission || patient?.admitDate,
        dateOfDischarge: inv.dateOfDischarge || patient?.exitDate,
        mrn: inv.mrn || patient?.mrn,
        patientName: inv.patientName || patient?.name,
      };
      const res = await apiPost(`/api/corporate/patients/${id}/invoice`, payload);
      if (res?.ok) {
        alert('Invoice saved');
        // refresh
        const r = await apiGet<{ ok: boolean; item: Invoice|null }>(`/api/corporate/patients/${id}/invoice`);
        if (r.item) setInv(fillRows(r.item));
      }
    } finally {
      setSaving(false);
    }
  }

  function printView(){
    const w = window.open('', '_blank');
    if (!w) return;
    // Always render a full sheet with 10 lines even if empty
    const rows = (inv.lineItems && inv.lineItems.length ? inv.lineItems : defaultRows());
    const currency = inv.currency || 'PKR';
    const logoAbs = new URL('/logo-cheema.png.png', window.location.origin).toString();
    const style = `
      <style>
        @page { size: A4; margin: 12mm; }
        *{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body{font-family:system-ui,Segoe UI,Arial,sans-serif;padding:18px;color:#111}
        .brand{display:flex;align-items:center;gap:12px}
        .brand .title{font-weight:700;font-size:18px;letter-spacing:.3px}
        .brand .addr{font-size:11px;color:#334}
        .brand{display:flex;gap:10px;align-items:center;justify-content:center;text-align:center;padding-bottom:8px;margin-bottom:10px;border-bottom:1px solid #bae6fd}
        .brand .logo{width:40px;height:40px;border:1px solid #bae6fd;border-radius:8px;display:grid;place-items:center}
        .brand .logoimg{width:56px;height:56px;object-fit:contain;border:1px solid #bae6fd;border-radius:8px;background:#fff;margin-right:8px}
        /* solid blue text to match screen reliably in print */
        .brand .title1{font-weight:900;text-transform:uppercase;letter-spacing:.3px;font-size:24px;line-height:1.1;color:#1d4ed8}
        .brand .title2{font-weight:900;text-transform:uppercase;font-size:18px;line-height:1.1;color:#1d4ed8;margin-top:4px}
        .brand .addr{color:#475569;font-size:12px;margin-top:2px}
        .box{border:2px solid #111;padding:10px}
        .title{text-align:center;font-weight:700;font-size:18px;margin-bottom:6px}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #111;padding:4px 6px;font-size:12px}
        th{background:#f5f5f5}
        .totals td{font-weight:700}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;margin-bottom:6px}
        .label{color:#444;width:150px;display:inline-block}
      </style>`;
    const brand = `
      <div class=\"brand\">
        <img class=\"logoimg\" src=\"${logoAbs}\" alt=\"Logo\" onerror=\"this.style.display='none'\" />
        <div>
          <div class=\"title1\">CHEEMA HEART COMPLEX</div>
          <div class=\"title2\">& GENERAL HOSPITAL</div>
          <div class=\"addr\">Mian Zia-ul-Haq Road, Near Lords Hotel, District Courts Gujranwala.</div>
          <div class=\"addr\">Tel: 055-325 59 59, 373 15 59. Mob. 0300-964 92 91</div>
          <div class=\"addr\">E-mail: cheemaheartcomplex@gmail.com</div>
        </div>
      </div>`;
    const header = `
      <div class="grid">
        <div><span class="label">MR #</span> ${inv.mrn||patient?.mrn||''}</div>
        <div><span class="label">Ref #</span> ${inv.refNo||''}</div>
        <div><span class="label">Pt. Name</span> ${inv.patientName||patient?.name||''}</div>
        <div><span class="label">Date Of Admission</span> ${fmtDate(inv.dateOfAdmission||patient?.admitDate)}</div>
        <div><span class="label">Phone</span> ${patient?.phone||''}</div>
        <div><span class="label">Address</span> ${escapeHtml(patient?.address||'')}</div>
        <div><span class="label">Employee Name</span> ${inv.employeeName||''}</div>
        <div><span class="label">Date Of Discharged</span> ${fmtDate(inv.dateOfDischarge||patient?.exitDate)}</div>
        <div><span class="label">Relation With Pt.</span> ${inv.relationWithPatient||''}</div>
        <div><span class="label">Designation</span> ${inv.designation||''}</div>
        <div><span class="label">BPS</span> ${inv.bps||''}</div>
        <div><span class="label">Employee #</span> ${inv.employeeNo||''}</div>
        <div><span class="label">Procedure</span> ${inv.procedure||''}</div>
        <div><span class="label">Days Occupied</span> ${inv.daysOccupied||''}</div>
      </div>`;
    const bodyRows = rows.map((r,i)=>`<tr>
      <td>${r.sr || (i+1)}</td>
      <td>${escapeHtml(r.description)}</td>
      <td>${fmtNum(r.rate)}</td>
      <td>${fmtNum(r.qty)}</td>
      <td>${fmtNum(r.amount)}</td>
    </tr>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8">${style}</head><body>
      ${brand}
      <div class="box">
        ${header}
        <table>
          <thead>
            <tr><th>SR#</th><th>Billing Detail</th><th>Rate</th><th>Qty</th><th>Amount</th></tr>
          </thead>
          <tbody>${bodyRows}</tbody>
          <tfoot>
            <tr class="totals"><td colspan="4">Total Amount</td><td>${currency} ${fmtNum(totals.totalAmount)}</td></tr>
            <tr class="totals"><td colspan="4">Discount</td><td>${currency} ${fmtNum(inv.discount||0)}</td></tr>
            <tr class="totals"><td colspan="4">Total Amount Payable</td><td>${currency} ${fmtNum(totals.totalPayable)}</td></tr>
          </tfoot>
        </table>
      </div>
    </body></html>`;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }

  function fmtNum(n: any){
    const v = Number(n||0);
    return v.toLocaleString();
  }
  function fmtDate(d?: string){
    if (!d) return '';
    const dd = new Date(d);
    return isNaN(dd as any) ? '' : dd.toLocaleDateString();
  }
  function escapeHtml(s: any){
    return String(s||'').replace(/[&<>"]+/g, (c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' } as any)[c]);
  }

  return (
    <div className="bg-white/90 border border-sky-100/70 rounded-xl p-3 md:p-4 shadow-sm">
      <BrandedHeader compact logoUrl="/logo-cheema.png.png" />
      <div className="mt-2 flex items-center justify-between">
        <h2 className="font-semibold text-lg tracking-tight flex items-center gap-2">
          <span className="inline-block w-1.5 h-5 rounded bg-gradient-to-b from-cyan-500 to-emerald-400" />
          Invoice
        </h2>
        <div className="text-xs text-slate-600 flex items-center gap-2">
          <span className="hidden md:inline px-2 py-0.5 rounded-full border border-sky-200 bg-sky-50 text-sky-700">{inv.currency || 'PKR'}</span>
          <span>Patient: {patient?.name||'—'} · MRN: {patient?.mrn||'—'}{patient?.phone? ` · Ph: ${patient?.phone}`:''}</span>
        </div>
      </div>

      {/* Header fields */}
      <div className="mt-3 grid md:grid-cols-2 gap-2.5 md:gap-3 text-sm">
        {renderInput('Ref #', inv.refNo, v=>setInv(s=>({ ...s, refNo: v })), readOnly)}
        {renderInput('MR #', inv.mrn ?? patient?.mrn ?? '', v=>setInv(s=>({ ...s, mrn: v })), readOnly)}
        {renderInput('Pt. Name', inv.patientName ?? patient?.name ?? '', v=>setInv(s=>({ ...s, patientName: v })), readOnly)}
        {renderInput('Employee Name', inv.employeeName ?? '', v=>setInv(s=>({ ...s, employeeName: v })), readOnly)}
        {renderInput('Relation With Pt.', inv.relationWithPatient ?? '', v=>setInv(s=>({ ...s, relationWithPatient: v })), readOnly)}
        {renderInput('Designation', inv.designation ?? '', v=>setInv(s=>({ ...s, designation: v })), readOnly)}
        {renderInput('BPS', inv.bps ?? '', v=>setInv(s=>({ ...s, bps: v })), readOnly)}
        {renderInput('Employee #', inv.employeeNo ?? '', v=>setInv(s=>({ ...s, employeeNo: v })), readOnly)}
        {renderInput('Procedure', inv.procedure ?? '', v=>setInv(s=>({ ...s, procedure: v })), readOnly)}
        {renderDate('Date Of Admission', inv.dateOfAdmission ?? patient?.admitDate ?? '', v=>setInv(s=>({ ...s, dateOfAdmission: v })), readOnly)}
        {renderDate('Date Of Discharged', inv.dateOfDischarge ?? patient?.exitDate ?? '', v=>setInv(s=>({ ...s, dateOfDischarge: v })), readOnly)}
        {renderNumber('Days Occupied', inv.daysOccupied ?? 0, v=>setInv(s=>({ ...s, daysOccupied: v })), readOnly)}
        {renderInput('Phone', patient?.phone ?? '', ()=>{}, true)}
        {renderInput('Address', patient?.address ?? '', ()=>{}, true)}
      </div>

      {/* Line items */}
      <div className="mt-4">
        <div className="text-sm font-semibold mb-1 flex items-center gap-2"><span className="inline-block w-1.5 h-4 rounded bg-sky-400" />Billing Details</div>
        <div className="overflow-auto border border-sky-100 rounded-lg">
          <table className="min-w-[800px] w-full text-sm">
            <thead className="bg-sky-50/60">
              <tr className="text-left text-slate-600">
                <th className="py-1 px-2 w-14">SR#</th>
                <th className="px-2">Billing Detail</th>
                <th className="px-2 w-32">Rate</th>
                <th className="px-2 w-24">Qty</th>
                <th className="px-2 w-32">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {inv.lineItems.map((r, idx)=> (
                <tr key={idx} className="border-t border-sky-100">
                  <td className="py-1 px-2 text-xs text-slate-600">{r.sr}</td>
                  <td className="px-2"><input value={r.description} onChange={e=>setRow(idx,{ description: e.target.value })} disabled={readOnly} className="w-full border border-sky-200 rounded px-2 py-1 disabled:bg-slate-50" placeholder="e.g., G-Ward Charges" /></td>
                  <td className="px-2"><input type="number" value={r.rate} onChange={e=>setRow(idx,{ rate: Number(e.target.value||0) })} disabled={readOnly} className="w-full border border-sky-200 rounded px-2 py-1 text-right disabled:bg-slate-50" /></td>
                  <td className="px-2"><input type="number" value={r.qty} onChange={e=>setRow(idx,{ qty: Number(e.target.value||0) })} disabled={readOnly} className="w-full border border-sky-200 rounded px-2 py-1 text-right disabled:bg-slate-50" /></td>
                  <td className="px-2"><input type="number" value={r.amount} onChange={e=>setRow(idx,{ amount: Number(e.target.value||0) })} disabled={readOnly} className="w-full border border-sky-200 rounded px-2 py-1 text-right disabled:bg-slate-50" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!readOnly && (
          <div className="mt-2 flex items-center gap-2 text-sm">
            <button onClick={()=> setInv(v=>({ ...v, lineItems: [...v.lineItems, { sr: v.lineItems.length+1, description: '', rate: 0, qty: 0, amount: 0 }] }))} className="text-xs px-2 py-1 rounded-lg border border-sky-200 text-sky-700 hover:bg-sky-50">Add Row</button>
            <button onClick={()=> setInv(v=>({ ...v, lineItems: v.lineItems.filter(r=> r.description || r.amount) }))} className="text-xs px-2 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">Remove Empty Rows</button>
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="mt-4 grid md:grid-cols-2 gap-3">
        <div></div>
        <div className="space-y-2 text-sm bg-sky-50/40 border border-sky-100 rounded-lg p-2.5">
          <div className="flex items-center justify-between"><div className="font-medium">Total Amount</div><div className="font-mono">{(inv.currency||'PKR')} {totals.totalAmount.toLocaleString()}</div></div>
          <div className="flex items-center justify-between"><div>Discount</div><div className="flex items-center gap-2"><input type="number" value={inv.discount||0} onChange={e=> setInv(v=>({ ...v, discount: Number(e.target.value||0) }))} disabled={readOnly} className="w-32 border border-sky-200 rounded px-2 py-1 text-right disabled:bg-slate-50" /><span className="font-mono">{(inv.currency||'PKR')} {(inv.discount||0).toLocaleString()}</span></div></div>
          <div className="flex items-center justify-between"><div className="font-semibold">Total Amount Payable</div><div className="font-mono font-semibold">{(inv.currency||'PKR')} {totals.totalPayable.toLocaleString()}</div></div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {!readOnly && (
          <button onClick={save} disabled={saving} className="text-xs px-3 py-2 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">{saving? 'Saving...' : 'Save Invoice'}</button>
        )}
        <button onClick={printView} className="text-xs px-3 py-2 rounded-lg border border-sky-200 text-sky-700 hover:bg-sky-50">Print</button>
        {!embedded && (
          <NavLink to="/corporate/records" className="ml-auto text-xs px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">Back to Records</NavLink>
        )}
      </div>
    </div>
  );
}

// Small field helpers
function renderInput(label: string, value: any, onChange: (v: string)=>void, disabled?: boolean){
  return (
    <label className="block">
      <span className="block text-xs text-slate-600">{label}</span>
      <input value={value||''} onChange={e=>onChange(e.target.value)} disabled={!!disabled} className="w-full border border-sky-200 rounded px-2 py-1 disabled:bg-slate-50" />
    </label>
  );
}
function renderNumber(label: string, value: any, onChange: (v: number)=>void, disabled?: boolean){
  return (
    <label className="block">
      <span className="block text-xs text-slate-600">{label}</span>
      <input type="number" value={value||0} onChange={e=>onChange(Number(e.target.value||0))} disabled={!!disabled} className="w-full border border-sky-200 rounded px-2 py-1 disabled:bg-slate-50" />
    </label>
  );
}
function renderDate(label: string, value: any, onChange: (v: string)=>void, disabled?: boolean){
  const v = value ? String(value).slice(0,10) : '';
  return (
    <label className="block">
      <span className="block text-xs text-slate-600">{label}</span>
      <input type="date" value={v} onChange={e=>onChange(e.target.value)} disabled={!!disabled} className="w-full border border-sky-200 rounded px-2 py-1 disabled:bg-slate-50" />
    </label>
  );
}
