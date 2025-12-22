// Lightweight demo/mock data layer to link UI and functionality without a backend
// - Enable via VITE_DEMO_MODE=true or localStorage.setItem('demoMode','true')
// - Provides mock fetch for /api/* endpoints used by useApi hooks
// - Seeds and exposes mock data for lab dashboard endpoints consumed via axios in LabTechnicianDashboard

/* eslint-disable @typescript-eslint/no-explicit-any */

const DEMO_FLAG_KEY = 'demoMode';
const TOKENS_KEY = 'tokens';
const BARCODE_SAMPLES_KEY = 'barcodesSamples';
const SAMPLES_PAGE_KEY = 'samplesPageSamples';
const INVENTORY_KEY = 'inventoryItems';

export function isDemoMode(): boolean {
  try {
    // Prefer explicit env flag; else fall back to localStorage flag
    const envFlag = (import.meta as any)?.env?.VITE_DEMO_MODE;
    if (String(envFlag).toLowerCase() === 'true') return true;
    const ls = typeof window !== 'undefined' ? window.localStorage.getItem(DEMO_FLAG_KEY) : null;
    return String(ls).toLowerCase() === 'true';
  } catch {
    return false;
  }
}

export function installDemoMocks(): void {
  if (!isDemoMode()) return;
  try {
    // Persist flag so page reloads stay in demo
    localStorage.setItem(DEMO_FLAG_KEY, 'true');
  } catch {}
  seedAll();
}

function seedAll() {
  seedTokens();
  seedSamples();
  seedInventory();
}

// ------------------------- Token mocks -------------------------
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function choice<T>(arr: T[]): T { return arr[randInt(0, arr.length - 1)]; }
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

function todayISODate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function seedTokens() {
  try {
    const existing = JSON.parse(localStorage.getItem(TOKENS_KEY) || '[]');
    if (Array.isArray(existing) && existing.length > 0) return;
  } catch {}

  const names = ['Ali', 'Ayesha', 'Hassan', 'Fatima', 'Umar', 'Sara', 'Bilal', 'Zainab'];
  const depts = ['Hematology', 'Biochemistry', 'Immunology', 'Microbiology'];
  const doctors = ['Dr. Khan', 'Dr. Ahmed', 'Dr. Fatima', 'Dr. Ali'];
  const genders = ['Male', 'Female'];

  const items: any[] = [];
  const baseDate = new Date();
  for (let i = 0; i < 24; i++) {
    const dt = new Date(baseDate.getTime() - randInt(0, 8) * 60 * 60 * 1000 - randInt(0, 59) * 60000);
    const id = uid();
    const tokenNumber = `T-${baseDate.getFullYear()}${String(baseDate.getMonth()+1).padStart(2,'0')}${String(baseDate.getDate()).padStart(2,'0')}-${String(1000 + i)}`;
    const isReturned = Math.random() < 0.08; // ~8% returns
    const fee = randInt(800, 3500);
    items.push({
      _id: id,
      id,
      tokenNumber,
      dateTime: dt.toISOString(),
      patientName: choice(names) + ' ' + String.fromCharCode(65 + randInt(0, 25)) + '.',
      age: randInt(20, 65),
      gender: choice(genders),
      phone: `03${randInt(10, 99)}-${randInt(10000000, 99999999)}`,
      address: 'City Center',
      doctor: choice(doctors),
      department: choice(depts),
      finalFee: fee,
      mrNumber: `MR-${randInt(10000,99999)}`,
      status: isReturned ? 'returned' : 'paid',
      refundAmount: isReturned ? fee : 0,
    });
  }
  try { localStorage.setItem(TOKENS_KEY, JSON.stringify(items)); } catch {}
}

// ------------------------- Sample mocks -------------------------
function seedSamples() {
  try {
    const a = JSON.parse(localStorage.getItem(BARCODE_SAMPLES_KEY) || '[]');
    const b = JSON.parse(localStorage.getItem(SAMPLES_PAGE_KEY) || '[]');
    if ((Array.isArray(a) && a.length) || (Array.isArray(b) && b.length)) return;
  } catch {}

  const analyzers = ['Sysmex XN-1000', 'Cobas c311', 'Architect i1000', 'Mindray BC-20'];
  const testsCatalog = [
    { name: 'CBC', price: 900 },
    { name: 'LFT', price: 1400 },
    { name: 'RFT', price: 1300 },
    { name: 'Glucose', price: 500 },
    { name: 'CRP', price: 1000 },
  ];

  const samples: any[] = [];
  const now = new Date();
  for (let i = 0; i < 28; i++) {
    const createdAt = new Date(now.getTime() - randInt(0, 6) * 3600000 - randInt(0, 59) * 60000);
    const statusPool = ['received', 'processing', 'in-progress', 'completed'];
    const status = choice(statusPool);
    const urgent = Math.random() < 0.12;
    const tests = [choice(testsCatalog), ...(Math.random() < 0.35 ? [choice(testsCatalog)] : [])];
    const priceSum = tests.reduce((s, t) => s + (t.price || 0), 0);
    const sample = {
      barcode: `SMP-${String(100000 + i)}`,
      patientName: `Patient ${String.fromCharCode(65 + (i % 26))}`,
      tests,
      status,
      priority: urgent ? 'urgent' : 'normal',
      assignedAnalyzer: choice(analyzers),
      createdAt: createdAt.toISOString(),
      expectedCompletion: new Date(createdAt.getTime() + randInt(40, 180) * 60000).toISOString(),
      processedBy: 'You',
      totalPrice: priceSum,
      results: status === 'completed' ? [{ isCritical: Math.random() < 0.08 }] : [],
      collectionTime: createdAt.toISOString(),
    };
    samples.push(sample);
  }
  // split across the two local keys to simulate existing flows
  const mid = Math.floor(samples.length / 2);
  try {
    localStorage.setItem(BARCODE_SAMPLES_KEY, JSON.stringify(samples.slice(0, mid)));
    localStorage.setItem(SAMPLES_PAGE_KEY, JSON.stringify(samples.slice(mid)));
  } catch {}
}

function seedInventory() {
  try { const ex = JSON.parse(localStorage.getItem(INVENTORY_KEY) || '[]'); if (Array.isArray(ex) && ex.length) return; } catch {}
  const items = [
    { name: 'EDTA Tubes', currentStock: 420, minThreshold: 200, expiryDate: futureDays(180), costPerUnit: 15 },
    { name: 'Serum Separator Tubes', currentStock: 120, minThreshold: 150, expiryDate: futureDays(45), costPerUnit: 28 },
    { name: 'Glucose Reagent', currentStock: 6, minThreshold: 10, expiryDate: futureDays(20), salePricePerUnit: 1200 },
    { name: 'CRP Reagent', currentStock: 14, minThreshold: 10, expiryDate: futureDays(75), salePricePerUnit: 1600 },
  ];
  try { localStorage.setItem(INVENTORY_KEY, JSON.stringify(items)); } catch {}
}

function futureDays(n: number) {
  const d = new Date(Date.now() + n * 24 * 3600000);
  return d.toISOString();
}

// ------------------------- Mock fetch for useApi.ts -------------------------
export async function mockFetch(url: string, options: RequestInit = {}): Promise<any> {
  // Normalize to absolute URL for parsing
  const abs = new URL(url, window.location.origin);
  const method = (options.method || 'GET').toUpperCase();
  const path = abs.pathname; // includes leading '/'

  const bodyText = (options as any).body;
  let body: any = undefined;
  if (bodyText && typeof bodyText === 'string') {
    try { body = JSON.parse(bodyText); } catch { body = undefined; }
  }

  // Tokens endpoints
  if (path.startsWith('/api/tokens')) {
    const tokens = safeRead(TOKENS_KEY, [] as any[]);

    // DELETE /api/tokens/:id
    if (method === 'DELETE') {
      const id = path.split('/').pop();
      const next = tokens.filter((t: any) => (t._id || t.id) !== id);
      safeWrite(TOKENS_KEY, next);
      return { ok: true };
    }
    // PUT /api/tokens/:id
    if (method === 'PUT') {
      const id = path.split('/').pop();
      const next = tokens.map((t: any) => (t._id === id || t.id === id) ? { ...t, ...body } : t);
      safeWrite(TOKENS_KEY, next);
      try { if (body?.status === 'returned') window.dispatchEvent(new Event('revenueChanged')); } catch {}
      return next.find((t: any) => (t._id === id || t.id === id)) || null;
    }
    // POST /api/tokens
    if (method === 'POST') {
      const id = uid();
      const now = new Date();
      const item = {
        _id: id,
        id,
        tokenNumber: body?.tokenNumber || `T-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${randInt(1000, 9999)}`,
        dateTime: body?.dateTime || now.toISOString(),
        patientName: body?.patientName || 'Walk-in Patient',
        age: body?.age ?? randInt(18, 70),
        gender: body?.gender || 'Male',
        phone: body?.phone || '',
        address: body?.address || '',
        doctor: body?.doctor || 'Dr. Khan',
        department: body?.department || 'Hematology',
        finalFee: Number(body?.finalFee ?? randInt(800, 3500)),
        mrNumber: body?.mrNumber || `MR-${randInt(10000, 99999)}`,
        status: 'paid',
      };
      const next = [item, ...tokens];
      safeWrite(TOKENS_KEY, next);
      try { window.dispatchEvent(new Event('tokenGenerated')); } catch {}
      return item;
    }
    // GET /api/tokens?date=YYYY-MM-DD&page=&limit=
    const date = abs.searchParams.get('date') || todayISODate();
    const page = Number(abs.searchParams.get('page') || '1');
    const limit = Number(abs.searchParams.get('limit') || '50');
    const filtered = tokens.filter((t: any) => String(t.dateTime || '').slice(0, 10) === date);
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);
    return { items, total: filtered.length };
  }

  // Doctors / Departments / Patients basic mocks
  if (path === '/api/doctors' && method === 'GET') {
    return [
      { id: 'd1', name: 'Dr. Khan', specialization: 'Internal Medicine', phone: '0300-0000001', consultationFee: 1500 },
      { id: 'd2', name: 'Dr. Ahmed', specialization: 'Pathology', phone: '0300-0000002', consultationFee: 1200 },
    ];
  }
  if (path === '/api/departments' && method === 'GET') {
    return [
      { id: 'dep1', name: 'Hematology' },
      { id: 'dep2', name: 'Biochemistry' },
      { id: 'dep3', name: 'Immunology' },
      { id: 'dep4', name: 'Microbiology' },
    ];
  }
  if (path === '/api/patients' && method === 'GET') {
    const tokens = safeRead(TOKENS_KEY, [] as any[]);
    return tokens.map((t: any, idx: number) => ({ id: t._id || String(idx), name: t.patientName, mrNumber: t.mrNumber, phone: t.phone, doctor: t.doctor, department: t.department }));
  }

  // Monthly overview
  if (path === '/api/overview/monthly' && method === 'GET') {
    const tokens = safeRead(TOKENS_KEY, [] as any[]);
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const inMonth = tokens.filter((t: any) => {
      const d = new Date(t.dateTime);
      return d.getMonth() === month && d.getFullYear() === year;
    });
    const totalTokens = inMonth.length;
    const totalPatients = new Set(inMonth.map((t: any) => t.mrNumber)).size;
    const totalRevenue = inMonth.reduce((s: number, t: any) => s + (String(t.status).toLowerCase() === 'returned' ? 0 : Number(t.finalFee || 0)), 0);
    const start = new Date(year, month, 1).toISOString();
    const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    return { start, end, totalTokens, totalPatients, totalRevenue };
  }

  // Fallback for unknown endpoints
  return [];
}

// ------------------------- Direct mocks for lab dashboard (axios users) -------------------------
export function getMockRecentSamplesMapped(): any[] {
  const samples = mergeSamples();
  // Map to the same shape LabTechnicianDashboard expects after server mapping
  const mapped = samples
    .sort((a: any, b: any) => new Date(b.createdAt || b.collectionTime).getTime() - new Date(a.createdAt || a.collectionTime).getTime())
    .map((s: any) => ({
      id: s.barcode,
      patient: s.patientName || 'Unknown',
      test: Array.isArray(s.tests) && s.tests.length ? (typeof s.tests[0] === 'string' ? s.tests[0] : (s.tests[0].name || 'Test')) : 'Test',
      status: s.status || 'received',
      priority: s.priority || 'normal',
      receivedTime: new Date(s.createdAt || s.collectionTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      expectedTime: s.expectedCompletion ? new Date(s.expectedCompletion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
      technician: s.processedBy || 'You',
      createdAt: new Date(s.createdAt || s.collectionTime),
      totalPrice: (Array.isArray(s.tests) ? s.tests : []).reduce((sum: number, t: any) => sum + (typeof t === 'object' && typeof t.price === 'number' ? t.price : 0), 0)
    }));
  return mapped;
}

export function getMockInventory(): any[] {
  return safeRead(INVENTORY_KEY, [] as any[]);
}

export function getMockLabKpis(): { pending: number; inProgress: number; completedToday: number; urgent: number } {
  const s = mergeSamples();
  const now = new Date();
  const isToday = (d: any) => {
    const dd = new Date(d);
    return dd.getDate() === now.getDate() && dd.getMonth() === now.getMonth() && dd.getFullYear() === now.getFullYear();
  };
  const today = s.filter((x: any) => isToday(x.createdAt || x.collectionTime));
  const pending = s.filter((x: any) => ['pending', 'received'].includes(String(x.status))).length;
  const inProgress = s.filter((x: any) => ['in-progress', 'processing', 'received'].includes(String(x.status))).length;
  const completedToday = today.filter((x: any) => String(x.status).toLowerCase().includes('completed')).length;
  const urgent = today.filter((x: any) => String(x.priority).toLowerCase() === 'urgent' || (Array.isArray(x.results) && x.results.some((r: any) => r?.isCritical))).length;
  return { pending, inProgress, completedToday, urgent };
}

function mergeSamples(): any[] {
  const a = safeRead(BARCODE_SAMPLES_KEY, [] as any[]);
  const b = safeRead(SAMPLES_PAGE_KEY, [] as any[]);
  const byCode: Record<string, any> = {};
  [...a, ...b].forEach((s: any) => { if (s?.barcode) byCode[s.barcode] = s; });
  return Object.values(byCode);
}

// ------------------------- utils -------------------------
function safeRead<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
}
function safeWrite<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
