import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Settings as SettingsIcon, 
  Building, 
  DollarSign, 
  Globe, 
  Bell,
  Save,
  ArrowLeft,
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lab lib/api";
import { useSettings } from "@/contexts/SettingsContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
    return {
      view: !!found.view,
      edit: !!found.edit,
      delete: !!found.delete,
    };
  } catch {
    return { view: true, edit: true, delete: true };
  }
}

// Types for settings
type LabSettings = {
  labName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  license: string;
  currency: string;
  timezone: string;
  defaultLanguage: string;
  directorName?: string;
  accreditationBody?: string;
  consultants?: Array<{
    name: string;
    qualifications: string;
    category: string;
  }>;
};

type PricingSettings = {
  defaultCurrency: string;
  taxRate: number;
  bulkDiscountRate: number;
  urgentTestUpliftRate: number;
  homeSamplingChargesRate: number;
  homeSamplingChargesUrgentRate: number;
};

type NotificationSettings = {
  emailNotifications: boolean;
  smsNotifications: boolean;
  criticalAlerts: boolean;
  reportReady: boolean;
  appointmentReminders: boolean;
  systemMaintenance: boolean;
};

type BackupSettings = {
  enabled: boolean;
  time: string; // HH:MM 24h
};

// Default settings (neutral/empty values; real data will come from backend)
const DEFAULT_LAB_SETTINGS: LabSettings = {
  labName: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  license: "",
  currency: "",
  timezone: "",
  defaultLanguage: "",
  directorName: "",
  accreditationBody: "",
  consultants: [],
};

const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  defaultCurrency: "PKR",
  taxRate: 0,
  bulkDiscountRate: 0,
  urgentTestUpliftRate: 0,
  homeSamplingChargesRate: 0,
  homeSamplingChargesUrgentRate: 0,
};

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  emailNotifications: false,
  smsNotifications: false,
  criticalAlerts: false,
  reportReady: false,
  appointmentReminders: false,
  systemMaintenance: false,
};

const DEFAULT_BACKUP_SETTINGS: BackupSettings = {
  enabled: false,
  time: "02:00",
};

const Settings = () => {
  const { toast } = useToast();
  const { setSettings } = useSettings();
  const modulePerm = getModulePermission('Settings');

  const [labSettings, setLabSettings] = useState<LabSettings>(DEFAULT_LAB_SETTINGS);

  const [pricingSettings, setPricingSettings] = useState<PricingSettings>(DEFAULT_PRICING_SETTINGS);

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);

  const [backupSettings, setBackupSettings] = useState<BackupSettings>(DEFAULT_BACKUP_SETTINGS);

  const [isSaving, setIsSaving] = useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  const [consultantsOpen, setConsultantsOpen] = useState(false);
  const [newConsultantName, setNewConsultantName] = useState('');
  const [newConsultantQualifications, setNewConsultantQualifications] = useState('');
  const [newConsultantCategory, setNewConsultantCategory] = useState('');

  const addConsultant = () => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: 'You only have view permission for Settings.', variant: 'destructive' });
      return;
    }
    const name = newConsultantName.trim();
    const qualifications = newConsultantQualifications.trim();
    const category = newConsultantCategory.trim();
    if (!name) {
      toast({ title: 'Missing name', description: 'Please enter consultant name.', variant: 'destructive' });
      return;
    }
    const current = Array.isArray(labSettings.consultants) ? labSettings.consultants : [];
    setLabSettings({
      ...labSettings,
      consultants: [...current, { name, qualifications, category }],
    });
    setNewConsultantName('');
    setNewConsultantQualifications('');
    setNewConsultantCategory('');
  };

  const removeConsultant = (idx: number) => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: 'You only have view permission for Settings.', variant: 'destructive' });
      return;
    }
    const current = Array.isArray(labSettings.consultants) ? labSettings.consultants : [];
    setLabSettings({
      ...labSettings,
      consultants: current.filter((_, i) => i !== idx),
    });
  };

  // Lab Logo state (used in receipts)
  const [logoUrl, setLogoUrl] = useState<string>('');

  const [fromDate1, setFromDate1] = useState<string>("");
  const [fromDate2, setFromDate2] = useState<string>("");

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: 'You only have view permission for Settings.', variant: 'destructive' });
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLogoUrl(dataUrl);
      // Immediately reflect logo change in global settings
      const subtitleFromAcc = (labSettings.accreditationBody || '').trim();
      setSettings({
        hospitalName: labSettings.labName || 'Hospital Name',
        labLogoUrl: dataUrl,
        labSubtitle: subtitleFromAcc || null,
      });
      toast({ title: 'Logo updated', description: 'This logo will appear on receipts.' });
    };
    reader.readAsDataURL(file);
  };

  const handleSelectedDateBackup = async () => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: 'You only have view permission for Settings.', variant: 'destructive' });
      return;
    }
    const from = fromDate1?.trim();
    const to = fromDate2?.trim();
    const isDate = (d?: string) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));

    const both = isDate(from) && isDate(to);
    const single = isDate(from) || isDate(to);

    if (!both && !single) {
      toast({ title: 'Error', description: 'Please select at least one valid date', variant: 'destructive' });
      return;
    }
    try {
      let res: Response;
      if (both) {
        res = await fetch(`${API_BASE}/backup/by-range`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from, to })
        });
      } else {
        const date = isDate(from) ? from! : to!;
        res = await fetch(`${API_BASE}/backup/by-date`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date })
        });
      }
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      toast({ title: 'Backup created', description: both ? `Range: ${from} to ${to}. Downloading...` : `Date: ${(isDate(from)?from:to)}. Downloading...` });
      window.location.href = `${API_BASE}/backup/download/${data.fileName}`;
    } catch {
      toast({ title: 'Error', description: 'Backup failed', variant: 'destructive' });
    }
  };

  const handleRemoveLogo = () => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: 'You only have view permission for Settings.', variant: 'destructive' });
      return;
    }
    setLogoUrl('');
    if (logoInputRef.current) logoInputRef.current.value = '';
    toast({ title: 'Logo removed' });
  };

  const handleManualBackup = async () => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: 'You only have view permission for Settings.', variant: 'destructive' });
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/backup/manual`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      toast({ title: 'Backup created', description: 'Downloading...' });
      window.location.href = `${API_BASE}/backup/download/${data.fileName}`;
    } catch {
      toast({ title: 'Error', description: 'Backup failed', variant: 'destructive' });
    }
  };

  const handleDeleteAll = async () => {
    if (!modulePerm.delete) {
      toast({ title: 'Not allowed', description: "You don't have delete permission for Settings.", variant: 'destructive' });
      return;
    }
    if (!confirm('Are you sure? This will delete ALL data and cannot be undone.')) return;
    try {
      const res = await fetch(`${API_BASE}/backup/purge`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      toast({ title: 'Data deleted', description: 'All database data has been removed' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete data', variant: 'destructive' });
    }
  };

  const handleImportBackup: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: 'You only have view permission for Settings.', variant: 'destructive' });
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await fetch(`${API_BASE}/backup/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json)
      });
      if (!res.ok) throw new Error('Failed');
      await res.json().catch(() => ({}));
      toast({ title: 'Data restored', description: 'Backup imported successfully' });
      setTimeout(() => window.location.reload(), 400);
    } catch {
      toast({ title: 'Error', description: 'Failed to restore backup', variant: 'destructive' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const currencies = [
    { code: "PKR", name: "Pakistani Rupee", symbol: "₨" }
  ];

  const API_BASE = "/api/lab";

  // Load settings from backend on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/settings');
        const data = res.data || {};
        const lab = data.lab || {};
        const pricing = data.pricing || {};
        const notifications = data.notifications || {};
        const backup = data.backup || {};

        setLabSettings({
          ...DEFAULT_LAB_SETTINGS,
          ...lab,
        });
        setPricingSettings({
          ...DEFAULT_PRICING_SETTINGS,
          ...pricing,
        });
        setNotificationSettings({
          ...DEFAULT_NOTIFICATION_SETTINGS,
          ...notifications,
        });
        setBackupSettings({
          ...DEFAULT_BACKUP_SETTINGS,
          ...backup,
        });
        if (lab.logoUrl) {
          setLogoUrl(lab.logoUrl);
        }

        // Persist key lab settings locally so other components can read them immediately
        try {
          localStorage.setItem('labSettings', JSON.stringify(lab));
          if (lab.labName) localStorage.setItem('labName', lab.labName);
          if (lab.logoUrl) localStorage.setItem('labLogoUrl', lab.logoUrl);
          // Map accreditation body to a generic accreditation text used by report headers
          if (lab.accreditationBody) {
            const subtitle = String(lab.accreditationBody).trim();
            if (subtitle) {
              const existing = lab || {};
              const enhanced = { ...existing, accreditationText: subtitle };
              localStorage.setItem('labSettings', JSON.stringify(enhanced));
            }
          }
        } catch {
          // ignore storage errors
        }

        // Update global SettingsContext so any open pages react immediately
        setSettings({
          hospitalName: lab.labName || 'Hospital Name',
          labLogoUrl: lab.logoUrl || null,
          labSubtitle: (lab.accreditationBody && String(lab.accreditationBody).trim()) || null,
        });
      } catch (err) {
        console.error('Failed to load settings', err);
        toast({ title: 'Error', description: 'Failed to load settings from server', variant: 'destructive' });
      }
    };
    load();
  }, []);

  const handleSaveAll = async () => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: 'You only have view permission for Settings.', variant: 'destructive' });
      return;
    }
    try {
      const payload = {
        lab: { ...labSettings, logoUrl },
        pricing: { ...pricingSettings },
        notifications: { ...notificationSettings },
        backup: { ...backupSettings },
      };
      const res = await api.put('/settings', payload);
      const data = res.data || {};
      // Optional: refresh local state from response
      if (data.lab) setLabSettings({ ...DEFAULT_LAB_SETTINGS, ...data.lab });
      if (data.pricing) setPricingSettings({ ...DEFAULT_PRICING_SETTINGS, ...data.pricing });
      if (data.notifications) setNotificationSettings({ ...DEFAULT_NOTIFICATION_SETTINGS, ...data.notifications });
      if (data.backup) setBackupSettings({ ...DEFAULT_BACKUP_SETTINGS, ...data.backup });
      if (data.lab?.logoUrl) setLogoUrl(data.lab.logoUrl);

      // Immediately persist latest lab settings to localStorage for other components
      try {
        const labToStore = data.lab || { ...labSettings, logoUrl };
        localStorage.setItem('labSettings', JSON.stringify(labToStore));
        if (labToStore.labName) localStorage.setItem('labName', labToStore.labName);
        if (labToStore.logoUrl) localStorage.setItem('labLogoUrl', labToStore.logoUrl);
        if ((labToStore as any)?.accreditationBody) {
          const subtitle = String((labToStore as any).accreditationBody).trim();
          if (subtitle) {
            const enhanced = { ...labToStore, accreditationText: subtitle };
            localStorage.setItem('labSettings', JSON.stringify(enhanced));
          }
        }

        // Broadcast latest values through SettingsContext for live updates
        const labAny: any = labToStore;
        const subtitleText =
          (labAny?.accreditationBody && String(labAny.accreditationBody).trim()) ||
          (labAny?.accreditationText && String(labAny.accreditationText).trim()) ||
          null;
        setSettings({
          hospitalName: labToStore.labName || 'Hospital Name',
          labLogoUrl: labToStore.logoUrl || null,
          labSubtitle: subtitleText,
        });
      } catch {
        // ignore storage errors
      }

      toast({ title: 'Settings saved', description: 'All changes saved to server.' });
    } catch (err) {
      console.error('Failed to save settings', err);
      toast({ title: 'Error', description: 'Failed to save settings to server', variant: 'destructive' });
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const settings = {
        lab: labSettings,
        pricing: pricingSettings,
        notifications: notificationSettings,
        updatedAt: new Date()
      };
      
      console.log("Settings saved:", settings);
      
      toast({
        title: "Settings Saved",
        description: "All settings have been updated successfully.",
      });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your laboratory settings and preferences
          </p>
        </div>
      </div>

      <Tabs defaultValue="lab" className="w-full">
        <TabsList className="grid w-full grid-cols-3 gap-2 mb-4">
          <TabsTrigger value="lab" className="w-full data-[state=active]:bg-blue-800 data-[state=active]:text-white">
            <Building className="w-4 h-4 mr-2" />
            Lab
          </TabsTrigger>
          <TabsTrigger value="pricing" className="w-full data-[state=active]:bg-blue-800 data-[state=active]:text-white">
            <DollarSign className="w-4 h-4 mr-2" />
            Pricing
          </TabsTrigger>
          <TabsTrigger value="backend" className="w-full data-[state=active]:bg-blue-800 data-[state=active]:text-white">
            <Save className="w-4 h-4 mr-2" />
            Backend
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lab">
          <Card>
            <CardHeader>
              <CardTitle>Lab Information</CardTitle>
              <CardDescription>Update your laboratory's contact and identification details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="labName">Laboratory Name</Label>
                <Input
                  id="labName"
                  value={labSettings.labName}
                  onChange={(e) => {
                    const value = e.target.value;
                    const nextLab = { ...labSettings, labName: value };
                    setLabSettings(nextLab);
                    const subtitleFromAcc = (nextLab.accreditationBody || '').trim();
                    // Push live changes into SettingsContext so top header updates immediately
                    setSettings({
                      hospitalName: value || 'Hospital Name',
                      labLogoUrl: logoUrl || null,
                      labSubtitle: subtitleFromAcc || null,
                    });
                  }}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <textarea
                  id="address"
                  className="w-full p-3 border rounded-md resize-none"
                  rows={3}
                  value={labSettings.address}
                  onChange={(e) => setLabSettings({...labSettings, address: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={labSettings.phone}
                    onChange={(e) => setLabSettings({...labSettings, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={labSettings.email}
                    onChange={(e) => setLabSettings({...labSettings, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="license">License Number</Label>
                  <Input
                    id="license"
                    value={labSettings.license}
                    onChange={(e) => setLabSettings({ ...labSettings, license: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={labSettings.website}
                    onChange={(e) => setLabSettings({ ...labSettings, website: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="directorName">Director Name</Label>
                  <Input
                    id="directorName"
                    value={labSettings.directorName || ''}
                    onChange={(e) => setLabSettings({ ...labSettings, directorName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accreditationBody">Accreditation Body</Label>
                  <Input
                    id="accreditationBody"
                    value={labSettings.accreditationBody || ''}
                    onChange={(e) => setLabSettings({ ...labSettings, accreditationBody: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Consultants</Label>
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm text-muted-foreground">
                    {(Array.isArray(labSettings.consultants) ? labSettings.consultants.length : 0)} consultant(s)
                  </div>
                  <Button type="button" variant="outline" disabled={!modulePerm.edit} onClick={() => setConsultantsOpen(true)}>
                    Manage Consultants
                  </Button>
                </div>
              </div>

              {/* Lab Logo upload */}
              <div className="space-y-2">
                <Label htmlFor="labLogo">Lab Logo (for receipts)</Label>
                <div className="flex items-start gap-4 flex-wrap">
                  <input
                    id="labLogo"
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    disabled={!modulePerm.edit}
                    onChange={handleLogoChange}
                    className="block w-full max-w-sm text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50"
                  />
                  {logoUrl && (
                    <div className="flex items-center gap-3">
                      <img src={logoUrl} alt="Lab Logo Preview" className="h-16 w-16 object-contain border rounded" />
                      <Button variant="destructive" type="button" disabled={!modulePerm.edit} onClick={handleRemoveLogo}>Remove</Button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">PNG or JPG recommended. This logo will also be used on printed receipts/reports.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <Dialog open={consultantsOpen} onOpenChange={setConsultantsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Consultants</DialogTitle>
              <DialogDescription>Add multiple consultants for report sign-off (saved in database).</DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:items-end">
                <div className="space-y-1">
                  <Label htmlFor="consultantName">Name</Label>
                  <div className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Dr.&nbsp;</span>
                    <input
                      id="consultantName"
                      value={newConsultantName}
                      onChange={(e) => setNewConsultantName(e.target.value)}
                      disabled={!modulePerm.edit}
                      className="w-full bg-transparent outline-none"
                      placeholder="Full name"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="consultantQualifications">Qualifications</Label>
                  <Input
                    id="consultantQualifications"
                    value={newConsultantQualifications}
                    onChange={(e) => setNewConsultantQualifications(e.target.value)}
                    disabled={!modulePerm.edit}
                    placeholder="e.g. FCPS, MPhil"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="consultantCategory">Category</Label>
                  <Input
                    id="consultantCategory"
                    value={newConsultantCategory}
                    onChange={(e) => setNewConsultantCategory(e.target.value)}
                    disabled={!modulePerm.edit}
                    placeholder="e.g. Consultant Pathologist"
                  />
                </div>
                <div className="md:col-span-3 flex justify-end">
                  <Button type="button" onClick={addConsultant} disabled={!modulePerm.edit}>
                    Add
                  </Button>
                </div>
              </div>

              <div className="border rounded-md overflow-hidden">
                <div className="max-h-56 overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-gray-600">
                        <th className="px-3 py-2 border-b">Name</th>
                        <th className="px-3 py-2 border-b">Qualifications</th>
                        <th className="px-3 py-2 border-b">Category</th>
                        <th className="px-3 py-2 border-b text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Array.isArray(labSettings.consultants) ? labSettings.consultants : []).map((c, idx) => (
                        <tr key={`${c.name}-${idx}`} className="hover:bg-gray-50">
                          <td className="px-3 py-2 border-b">{c.name}</td>
                          <td className="px-3 py-2 border-b">{c.qualifications}</td>
                          <td className="px-3 py-2 border-b">{c.category}</td>
                          <td className="px-3 py-2 border-b text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeConsultant(idx)}
                              disabled={!modulePerm.edit}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {(Array.isArray(labSettings.consultants) ? labSettings.consultants.length : 0) === 0 && (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                            No consultants added yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConsultantsOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle>Pricing Configuration</CardTitle>
              <CardDescription>Currency and pricing settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="defaultCurrency">Default Currency</Label>
                <select
                  id="defaultCurrency"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={pricingSettings.defaultCurrency}
                  onChange={(e) => setPricingSettings({...pricingSettings, defaultCurrency: e.target.value})}
                >
                  {currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.symbol} {currency.name} ({currency.code})
                    </option>
                  ))}
                </select>
                <Badge className="bg-green-100 text-green-800">
                  Recommended: PKR for Pakistan
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Tax Rate (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    value={pricingSettings.taxRate}
                    onChange={(e) => setPricingSettings({...pricingSettings, taxRate: parseFloat(e.target.value) || 0})}
                    disabled={!modulePerm.edit}
                  />
                  <div className="pt-2">
                    <Label htmlFor="urgentTestUpliftRate">Urgent Test Uplift (%)</Label>
                    <Input
                      id="urgentTestUpliftRate"
                      type="number"
                      value={pricingSettings.urgentTestUpliftRate}
                      onChange={(e) => setPricingSettings({ ...pricingSettings, urgentTestUpliftRate: parseFloat(e.target.value) || 0 })}
                      disabled={!modulePerm.edit}
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      Applied on top of base test price when test type is marked Urgent.
                    </div>
                  </div>
                  <div className="pt-2">
                    <Label htmlFor="homeSamplingChargesRate">Home Sampling Charges (%)</Label>
                    <Input
                      id="homeSamplingChargesRate"
                      type="number"
                      value={pricingSettings.homeSamplingChargesRate}
                      onChange={(e) => setPricingSettings({ ...pricingSettings, homeSamplingChargesRate: parseFloat(e.target.value) || 0 })}
                      disabled={!modulePerm.edit}
                    />
                  </div>
                  <div className="pt-2">
                    <Label htmlFor="homeSamplingChargesUrgentRate">Home Sampling Charges (Urgent %)</Label>
                    <Input
                      id="homeSamplingChargesUrgentRate"
                      type="number"
                      value={pricingSettings.homeSamplingChargesUrgentRate}
                      onChange={(e) => setPricingSettings({ ...pricingSettings, homeSamplingChargesUrgentRate: parseFloat(e.target.value) || 0 })}
                      disabled={!modulePerm.edit}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bulkDiscountRate">Discount (%)</Label>
                  <Input
                    id="bulkDiscountRate"
                    type="number"
                    value={pricingSettings.bulkDiscountRate}
                    onChange={(e) => setPricingSettings({...pricingSettings, bulkDiscountRate: parseFloat(e.target.value) || 0})}
                    disabled={!modulePerm.edit}
                  />
                </div>
              </div>
              
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backend Tab */}
        <TabsContent value="backend">
          <Card>
            <CardHeader>
              <CardTitle>Backup Settings</CardTitle>
              <CardDescription>Configure and run backups</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <div className="space-y-2">
                  <Label htmlFor="fromDate1">From</Label>
                  <input
                    id="fromDate1"
                    type="date"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={fromDate1}
                    onChange={(e)=>setFromDate1(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromDate2">From</Label>
                  <input
                    id="fromDate2"
                    type="date"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={fromDate2}
                    onChange={(e)=>setFromDate2(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-4 flex-wrap">
                <Button variant="secondary" disabled={!modulePerm.edit} onClick={handleSelectedDateBackup}>Selected Date Backup</Button>
                <Button disabled={!modulePerm.edit} onClick={handleManualBackup}>Run Manual Backup</Button>
                <Button variant="destructive" disabled={!modulePerm.delete} onClick={handleDeleteAll}>Delete All Data</Button>
                <Button variant="secondary" disabled={!modulePerm.edit} onClick={() => {
                  if (!modulePerm.edit) {
                    toast({ title: 'Not allowed', description: 'You only have view permission for Settings.', variant: 'destructive' });
                    return;
                  }
                  fileRef.current?.click();
                }}>Import Backup</Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  disabled={!modulePerm.edit}
                  onChange={handleImportBackup}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button className="gap-2" disabled={!modulePerm.edit} onClick={handleSaveAll}>
          <Save className="w-4 h-4" />
          Save All Changes
        </Button>
      </div>
    </div>
  );
};

export default Settings;
