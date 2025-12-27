import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Text, Table, StickyNote, User, Stethoscope, Activity } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { api } from '@/lab lib/api';
import { useToast } from '@/hooks/use-toast';

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
      // If permissions exist but module isn't listed, default to view-only for safety.
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

type ComponentType = 'patient-info' | 'doctor-info' | 'result-table' | 'logo' | 'header-text' | 'notes' | 'consultant-section' | 'signature' | 'analyte-summary';

interface LogoData {
  imageUrl: string;
  size: number;
  alignment: 'left' | 'center' | 'right';
}

interface ComponentItem {
  id: string;
  type: ComponentType;
  label: string;
  icon: React.ReactNode;
  data?: any;
  settings?: any;
}

function getLabContactFromStorage() {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem('labSettings') : null;
    if (!raw) return { phone: '', email: '', address: '' };
    const parsed = JSON.parse(raw) as { phone?: string; email?: string; address?: string };
    return {
      phone: parsed.phone || '',
      email: parsed.email || '',
      address: parsed.address || '',
    };
  } catch {
    return { phone: '', email: '', address: '' };
  }
}

const components: ComponentItem[] = [
  { id: '5', type: 'header-text', label: 'Header Text', icon: <Text className="h-4 w-4" /> },
  { id: '1', type: 'patient-info', label: 'Patient Info Block', icon: <User className="h-4 w-4" /> },
  { id: '8', type: 'analyte-summary', label: 'Analyte Summary', icon: <Activity className="h-4 w-4" /> },
  { id: '3', type: 'result-table', label: 'Result Table', icon: <Table className="h-4 w-4" /> },
  { id: '6', type: 'notes', label: 'Interpretation Section', icon: <StickyNote className="h-4 w-4" /> },
  { id: '7', type: 'consultant-section', label: 'Consultant Section', icon: <Stethoscope className="h-4 w-4" /> },
];

export function ReportDesigner() {
  const { settings } = useSettings();
  const { toast } = useToast();
  const modulePerm = getModulePermission('Report Designer');
  const readOnly = !modulePerm.edit;
  const derivedLabName = settings.hospitalName || 'Medical Laboratory Report';
  const derivedLabLogoUrl = settings.labLogoUrl || null;
  // Only the part after "Accredited by" is stored; we render the prefix in JSX
  const derivedLabSubtitle = settings.labSubtitle || 'ISO 15189:2012';
  const labContact = getLabContactFromStorage();

  const [activeTab, setActiveTab] = useState('style');
  const [fontSize, setFontSize] = useState(12);
  const [headerColor, setHeaderColor] = useState('#2D7FF9');
  const [borderStyle, setBorderStyle] = useState('solid');
  const [reportTitle, setReportTitle] = useState('Medical Laboratory Report');
  const [reportComponents, setReportComponents] = useState<ComponentItem[]>([
    {
      id: 'header-1',
      type: 'header-text',
      label: 'Header',
      icon: <Text className="h-4 w-4" />,
      data: {
        title: '',
        subtitle: '',
      }
    },
    {
      id: 'patient-1',
      type: 'patient-info',
      label: 'Patient Info',
      icon: <User className="h-4 w-4" />,
      data: {
        name: '',
        age: '',
        gender: '',
        patientId: '',
        address: '',
        phone: '',
        email: '',
        collectionDate: '',
        receivedDate: '',
        reportDate: '',
        sampleId: '',
        referringPhysician: '',
        referringDoctor: '',
        sampleCollectedBy: '',
        collectedSample: '',
        department: ''
      }
    },
    {
      id: 'analyte-1',
      type: 'analyte-summary',
      label: 'Analyte Summary',
      icon: <Activity className="h-4 w-4" />,
      data: {
        analyteName: 'Serum Total Cholesterol',
        analyteUnit: 'mg/dL',
        analyteValue: 212,
        analyteStatus: '',
        analyteNote: 'Cholesterol is essential substance for human body at normal levels.',
        rangeLowMax: 200,
        rangeNormalMax: 240,
        rangeHighMax: 300,
      },
    },
    {
      id: 'result-table-1',
      type: 'result-table',
      label: 'Results',
      icon: <Table className="h-4 w-4" />,
      data: {
        tests: []
      }
    },
  ]);
  const [selectedComponent, setSelectedComponent] = useState<ComponentItem | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragStart = (e: React.DragEvent, component: ComponentItem) => {
    if (readOnly) {
      e.preventDefault();
      toast({
        title: 'Not allowed',
        description: 'You only have view permission for Report Designer.',
        variant: 'destructive',
      });
      return;
    }
    e.dataTransfer.setData('component', JSON.stringify(component));
  };

  // On mount, hydrate from any saved report template so layout (including
  // Interpretation section) persists when navigating away and back.
  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const res = await api.get('/settings');
        const data = res.data || {};
        const template = data.reportTemplate;
        if (template && Array.isArray(template.components)) {
          setReportComponents(
            (template.components as Array<ComponentItem | null | undefined>).filter(
              (c): c is ComponentItem => !!c && c.type !== 'signature'
            )
          );
        }
        if (template?.styles) {
          if (typeof template.styles.fontSize === 'number') {
            setFontSize(template.styles.fontSize);
          }
          if (typeof template.styles.headerColor === 'string') {
            setHeaderColor(template.styles.headerColor);
          }
          if (typeof template.styles.borderStyle === 'string') {
            setBorderStyle(template.styles.borderStyle);
          }
        }
      } catch (err) {
        console.error('Failed to load report template from settings', err);
      }
    };

    loadTemplate();
  }, []);

  const addComponent = (component: ComponentItem) => {
    if (readOnly) {
      toast({
        title: 'Not allowed',
        description: 'You only have view permission for Report Designer.',
        variant: 'destructive',
      });
      return;
    }
    const newComponent = { 
      ...component, 
      id: `${component.id}-${Date.now()}`,
      data: component.type === 'logo' ? {
        imageUrl: '',
        size: 100,
        alignment: 'left'
      } : component.type === 'header-text' ? {
        title: 'MEDICAL LABORATORY REPORT',
        subtitle: 'Accredited by ISO 15189:2012'
      } : component.type === 'consultant-section' ? {} : null
    };
    setReportComponents([...reportComponents, newComponent]);
    setSelectedComponent(newComponent);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (readOnly) {
      toast({
        title: 'Not allowed',
        description: 'You only have view permission for Report Designer.',
        variant: 'destructive',
      });
      return;
    }
    const componentData = JSON.parse(e.dataTransfer.getData('component'));
    addComponent(componentData);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) {
      toast({
        title: 'Not allowed',
        description: 'You only have view permission for Report Designer.',
        variant: 'destructive',
      });
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (selectedComponent && selectedComponent.type === 'logo' && event.target?.result) {
        const updatedComponents = reportComponents.map(comp => {
          if (comp.id === selectedComponent.id) {
            return {
              ...comp,
              data: {
                ...comp.data,
                imageUrl: event.target?.result as string
              }
            };
          }
          return comp;
        });
        setReportComponents(updatedComponents);
        setSelectedComponent(updatedComponents.find(c => c.id === selectedComponent.id) || null);
      }
    };
    reader.readAsDataURL(file);
  };

  const updateLogoSetting = (field: string, value: any) => {
    if (readOnly) {
      toast({
        title: 'Not allowed',
        description: 'You only have view permission for Report Designer.',
        variant: 'destructive',
      });
      return;
    }
    if (!selectedComponent || selectedComponent.type !== 'logo') return;
    
    const updatedComponents = reportComponents.map(comp => {
      if (comp.id === selectedComponent.id) {
        return {
          ...comp,
          data: {
            ...comp.data,
            [field]: value
          }
        };
      }
      return comp;
    });
    setReportComponents(updatedComponents);
    setSelectedComponent(updatedComponents.find(c => c.id === selectedComponent.id) || null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (readOnly) return;
    e.preventDefault();
  };

  const handleSaveTemplate = async () => {
    if (readOnly) {
      toast({
        title: 'Not allowed',
        description: 'You only have view permission for Report Designer.',
        variant: 'destructive',
      });
      return;
    }
    // Strip non-serializable fields (like React icon nodes) before sending
    const serializableComponents = reportComponents.map((comp) => {
      const { icon, ...rest } = comp;
      return {
        ...rest,
      } as ComponentItem;
    }).filter((c) => c?.type !== 'signature');

    const template = {
      components: serializableComponents,
      styles: {
        fontSize,
        headerColor,
        borderStyle,
      },
    };

    try {
      await api.put('/settings/report-template', { reportTemplate: template });
      toast({
        title: 'Report template saved',
        description: 'This template will now be used for report generation.',
      });
    } catch (err) {
      console.error('Failed to save report template', err);
      toast({
        title: 'Failed to save report template',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const renderComponent = (component: ComponentItem) => {
    const componentFontSize: number | undefined = component.data?.fontSize;
    const isSelected = selectedComponent?.id === component.id;
    const componentClasses = `relative group ${isSelected ? 'ring-2 ring-blue-500 rounded' : ''} mb-4`;
    switch (component.type) {
      case 'patient-info':
        return (
          <div
            className="pb-2 mb-4"
            style={{
              borderStyle: borderStyle === 'none' ? 'none' : borderStyle,
              fontSize: componentFontSize ? `${componentFontSize}px` : undefined,
            }}
          >
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-1">
                <div>
                  <div className="text-[10px] font-normal text-gray-500">Patient:</div>
                  <div className="text-[12px] font-bold text-gray-900">{component.data?.patientName || component.data?.name || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-normal text-gray-500">Age/Sex:</div>
                  <div className="text-[12px] font-bold text-gray-900">
                    {(component.data?.age ?? 'N/A')}/{component.data?.gender || component.data?.sex || 'N/A'}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div>
                  <div className="text-[10px] font-normal text-gray-500">Phone:</div>
                  <div className="text-[12px] font-bold text-gray-900">{component.data?.phone || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-normal text-gray-500">CNIC:</div>
                  <div className="text-[12px] font-bold text-gray-900">{component.data?.cnic || 'N/A'}</div>
                </div>
              </div>

              <div className="space-y-1">
                <div>
                  <div className="text-[10px] font-normal text-gray-500">Collected by:</div>
                  <div className="text-[12px] font-bold text-gray-900">{component.data?.sampleCollectedBy || component.data?.collectedBy || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-normal text-gray-500">Collection DateTime:</div>
                  <div className="text-[12px] font-bold text-gray-900">
                    {component.data?.collectionDateTime || component.data?.collectionDate || component.data?.receivedAt || 'N/A'}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div>
                  <div className="text-[10px] font-normal text-gray-500">Patient Number:</div>
                  <div className="text-[12px] font-bold text-gray-900">
                    {component.data?.patientNumber || component.data?.patientId || component.data?.mrNumber || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-normal text-gray-500">Case Number:</div>
                  <div className="text-[12px] font-bold text-gray-900">{component.data?.caseNumber || component.data?.sampleId || 'N/A'}</div>
                </div>
              </div>
            </div>

            <div className="border-b border-gray-900" />

            <div className="py-2 flex items-center justify-between gap-4">
              <div className="text-[17px] font-bold text-black">Department of Chemical Pathology</div>
              <div className="text-right">
                <div className="text-[12px] text-gray-900">
                  <span className="font-bold">Collection DateTime:</span>{' '}
                  {component.data?.collectionDateTime || component.data?.collectionDate || component.data?.receivedAt || 'N/A'}
                </div>
                <div className="text-[12px] text-gray-900">
                  <span className="font-bold">Reporting DateTime:</span>{' '}
                  {component.data?.reportingDateTime || component.data?.reportDate || component.data?.completedAt || 'N/A'}
                </div>
              </div>
            </div>

            <div className="border-b border-gray-900" />
          </div>
        );
      case 'analyte-summary': {
        const analyteName = component.data?.analyteName || component.data?.parameterName || component.data?.currentTestName || 'Serum Total Cholesterol';
        const analyteUnit = component.data?.analyteUnit || component.data?.unit || 'mg/dL';
        const rawValue = component.data?.analyteValue ?? component.data?.value ?? 212;
        const analyteValueNum = Number(rawValue);

        const lowMax = Number(component.data?.rangeLowMax ?? 200);
        const normalMax = Number(component.data?.rangeNormalMax ?? 240);
        const highMax = Number(component.data?.rangeHighMax ?? 300);

        const statusText = component.data?.analyteStatus || (
          !isNaN(analyteValueNum)
            ? (analyteValueNum < lowMax ? 'Desirable' : (analyteValueNum <= normalMax ? 'Borderline High' : 'High'))
            : 'N/A'
        );

        const chartMin = Number(component.data?.chartMin ?? (lowMax - 20));
        const chartMax = Number(component.data?.chartMax ?? (normalMax + 20));
        const clampedY = !isNaN(analyteValueNum)
          ? Math.min(chartMax, Math.max(chartMin, analyteValueNum))
          : chartMin;
        const markerYPct = chartMax === chartMin
          ? 0
          : (1 - ((clampedY - chartMin) / (chartMax - chartMin))) * 100;

        const gridStep = Number(component.data?.chartGridStep ?? 10);
        const labelStep = Number(component.data?.chartLabelStep ?? 20);

        const gridTicks: number[] = [];
        for (let t = chartMax; t >= chartMin; t -= gridStep) {
          gridTicks.push(t);
        }
        if (!gridTicks.includes(lowMax) && lowMax <= chartMax && lowMax >= chartMin) gridTicks.push(lowMax);
        if (!gridTicks.includes(normalMax) && normalMax <= chartMax && normalMax >= chartMin) gridTicks.push(normalMax);
        gridTicks.sort((a, b) => b - a);

        const labelTicks: number[] = [];
        for (let t = chartMax; t >= chartMin; t -= labelStep) {
          labelTicks.push(t);
        }
        if (!labelTicks.includes(lowMax) && lowMax <= chartMax && lowMax >= chartMin) labelTicks.push(lowMax);
        if (!labelTicks.includes(normalMax) && normalMax <= chartMax && normalMax >= chartMin) labelTicks.push(normalMax);
        labelTicks.sort((a, b) => b - a);

        return (
          <div
            className="pt-4"
            style={{
              borderStyle: borderStyle === 'none' ? 'none' : borderStyle,
              fontSize: componentFontSize ? `${componentFontSize}px` : undefined,
            }}
          >
            <div className="grid grid-cols-12 gap-4 items-start">
              <div className="col-span-12 md:col-span-4">
                <div className="text-[14px] font-semibold text-gray-900">{analyteName}</div>
                <div className="text-[10px] text-gray-500 mt-1">
                  {component.data?.analyteNote || 'Cholesterol is essential substance for human body at normal levels.'}
                </div>
              </div>

              <div className="col-span-12 md:col-span-5">
                <div className="mt-2 flex items-start gap-3">
                  <div className="relative w-9 h-[90px] text-right text-[9px] text-gray-500 leading-none">
                    {labelTicks.map((t) => {
                      const topPct = chartMax === chartMin
                        ? 0
                        : (1 - ((t - chartMin) / (chartMax - chartMin))) * 100;
                      return (
                        <div
                          key={t}
                          className="absolute right-0"
                          style={{ top: `${topPct}%`, transform: 'translateY(-50%)' }}
                        >
                          {t}
                        </div>
                      );
                    })}
                  </div>

                  <div className="relative flex-1 h-[90px] border border-gray-400">
                    {gridTicks.map((t, idx) => {
                      const isLowBoundary = t === lowMax;
                      const isHighBoundary = t === normalMax;
                      const bandColor = t > normalMax ? '#dc2626' : t >= lowMax ? '#f59e0b' : '#2563eb';
                      const lineColor = isLowBoundary ? '#2563eb' : isHighBoundary ? '#dc2626' : bandColor;
                      const lineWidth = isLowBoundary || isHighBoundary ? 2 : 1;
                      const topPct = chartMax === chartMin
                        ? 0
                        : (1 - ((t - chartMin) / (chartMax - chartMin))) * 100;
                      return (
                        <div
                          key={`${t}-${idx}`}
                          className="absolute left-0 right-0"
                          style={{
                            top: `${topPct}%`,
                            borderTop: `${lineWidth}px solid ${lineColor}`,
                            opacity: isLowBoundary || isHighBoundary ? 1 : 0.35,
                          }}
                        />
                      );
                    })}

                    <div
                      className="absolute left-1/2 -translate-x-1/2"
                      style={{ top: `${markerYPct}%`, transform: 'translate(-50%, -50%)' }}
                    >
                      <div className="text-[9px] font-bold bg-orange-500 text-white px-1 py-[1px] leading-none">
                        {!isNaN(analyteValueNum) ? analyteValueNum : String(rawValue || 'N/A')}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-nowrap justify-center gap-4 mt-3 text-[10px] font-semibold whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3" style={{ backgroundColor: '#2563eb' }} />
                    <span className="text-gray-700">Desirable (&lt;{lowMax})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3" style={{ backgroundColor: '#f59e0b' }} />
                    <span className="text-gray-700">Borderline High ({lowMax} - {normalMax})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3" style={{ backgroundColor: '#dc2626' }} />
                    <span className="text-gray-700">High (&gt;{normalMax})</span>
                  </div>
                </div>
              </div>

              <div className="col-span-12 md:col-span-3 flex flex-col items-end">
                <div className="text-[42px] leading-none font-extrabold text-orange-500">
                  {!isNaN(analyteValueNum) ? analyteValueNum : String(rawValue || 'N/A')}
                </div>
                <div className="text-[12px] font-bold text-gray-700 mt-1">{analyteUnit}</div>
                <div className="text-[14px] font-semibold text-orange-600 mt-1">{statusText}</div>
              </div>
            </div>
          </div>
        );
      }
      case 'result-table':
        return (
          <div
            className="border border-gray-300 rounded overflow-hidden"
            style={{
              borderStyle: borderStyle === 'none' ? 'none' : borderStyle,
              fontSize: componentFontSize ? `${componentFontSize}px` : undefined,
            }}
          >
            <div className="px-3 py-2 font-semibold text-gray-700 border-b bg-gray-50">
              {component.data?.testName || 'Test Name'}
            </div>
            <table
              className="w-full"
              style={{ fontSize: componentFontSize ? `${componentFontSize}px` : undefined }}
            >
              <thead>
                <tr
                  className="bg-gray-100"
                  style={{ backgroundColor: headerColor || undefined }}
                >
                  <th className="p-2 text-left font-semibold border-r border-gray-300">Test Parametes</th>
                  <th className="p-2 text-center font-semibold border-r border-gray-300">Normal Range</th>
                  <th className="p-2 text-center font-semibold border-r border-gray-300">Units</th>
                  <th className="p-2 text-center font-semibold border-r border-gray-300">Result</th>
                  <th className="p-2 text-center font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {component.data?.tests?.map((test: any, index: number) => (
                  <tr key={index} className="border-t border-gray-200 hover:bg-gray-50">
                    <td className="p-2 border-r border-gray-200">{test.test}</td>
                    <td className="p-2 text-center border-r border-gray-200">{test.normalRange || test.range}</td>
                    <td className="p-2 text-center text-gray-600 border-r border-gray-200">{test.unit}</td>
                    <td className="p-2 text-center border-r border-gray-200">{test.result}</td>
                    <td className="p-2 text-center">{test.status}</td>
                  </tr>
                )) || (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-gray-500">No test results available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      case 'logo':
        const logoData = component.data || { imageUrl: '', size: 80, alignment: 'left' };
        const alignmentClass = {
          'left': 'justify-start',
          'center': 'justify-center',
          'right': 'justify-end'
        }[logoData.alignment || 'left'];
        
        return (
          <div className={`flex ${alignmentClass} p-2`}>
            <div 
              className={`bg-white p-1 rounded border ${isSelected ? 'ring-2 ring-blue-500' : 'border-gray-300'}`}
              style={{
                width: `${logoData.size}px`,
                height: 'auto',
                aspectRatio: '1/1'
              }}
            >
              {logoData.imageUrl ? (
                <img 
                  src={logoData.imageUrl} 
                  alt="Logo" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 text-xs text-center p-1">
                  <span>Click to upload logo</span>
                </div>
              )}
            </div>
          </div>
        );
      case 'header-text':
        return (
          <div
            className="w-full pl-0 pr-2 py-2"
            style={{
              borderStyle: borderStyle === 'none' ? 'none' : borderStyle,
              fontSize: componentFontSize ? `${componentFontSize}px` : undefined,
            }}
          >
            <div className="flex items-center gap-2">
              <div className="w-14 h-14 bg-white flex items-center justify-center rounded overflow-hidden">
                {derivedLabLogoUrl ? (
                  <img
                    src={derivedLabLogoUrl}
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 text-[10px] text-center p-1">
                    <span>Logo</span>
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="text-[18px] font-bold leading-tight text-gray-900">
                  {derivedLabName}
                </div>
                <div className="text-[12px] font-semibold leading-tight text-gray-700">
                  {derivedLabSubtitle}
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'notes':
        return (
          <div
            className="p-4 border rounded-lg bg-white"
            style={{ fontSize: componentFontSize ? `${componentFontSize}px` : undefined }}
          >
            <h3 className="font-semibold mb-2">Clinical Interpretation</h3>
            <p>Clinical interpretation of the above results will appear here.</p>
          </div>
        );
      case 'consultant-section':
        return (
          <div
            className="mt-6 flex justify-end"
            style={{ fontSize: componentFontSize ? `${componentFontSize}px` : undefined }}
          >
            <div
              className="min-w-[260px] max-w-[320px] text-right"
              style={{ borderStyle: borderStyle === 'none' ? 'none' : borderStyle }}
            >
              <div className="space-y-1">
                <div>
                  <div className="text-gray-900 font-normal">{component.data?.consultantPathologist || ''}</div>
                </div>
                <div>
                  <div className="text-gray-900 font-normal">{component.data?.qualification || component.data?.consultantQualification || ''}</div>
                </div>
                <div>
                  <span className="font-semibold">Consultant Pathologist</span>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <div className="flex flex-1">
        {/* Left Panel - Components + Global Styling */}
        <div className="w-64 bg-gray-50 border-r border-gray-300 overflow-y-auto flex flex-col">
          <div className="p-3 bg-gray-200 border-b border-gray-300">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Components</h2>
          </div>
          <div className="p-2 space-y-1 bg-white border-b border-gray-200">
            {components.map((component) => (
              <div
                key={component.id}
                draggable
                onDragStart={(e) => handleDragStart(e, component)}
                onClick={() => addComponent(component)}
                className="flex items-center p-2 text-sm text-gray-800 rounded cursor-pointer hover:bg-blue-100 transition-colors border border-transparent hover:border-blue-200"
              >
                <div className="mr-2">{component.icon}</div>
                <span>{component.label}</span>
              </div>
            ))}
          </div>
          {/* Global Styling Section */}
          <div className="border-t border-gray-200 bg-white p-3">
            <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Styling</h2>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-1 mb-2">
                <TabsTrigger value="style">Style</TabsTrigger>
              </TabsList>
              <TabsContent value="style" className="mt-2 space-y-4">
                <div>
                  <Label htmlFor="fontSize">
                    Font Size: {(selectedComponent?.data?.fontSize as number | undefined) ?? fontSize}px
                  </Label>
                  <Slider
                    id="fontSize"
                    min={8}
                    max={24}
                    step={1}
                    value={[(selectedComponent?.data?.fontSize as number | undefined) ?? fontSize]}
                    onValueChange={(value) => {
                      if (readOnly) {
                        toast({
                          title: 'Not allowed',
                          description: 'You only have view permission for Report Designer.',
                          variant: 'destructive',
                        });
                        return;
                      }
                      const newSize = value[0];
                      if (selectedComponent) {
                        setReportComponents(prev =>
                          prev.map(c =>
                            c.id === selectedComponent.id
                              ? { ...c, data: { ...(c.data || {}), fontSize: newSize } }
                              : c
                          )
                        );
                        setSelectedComponent(prev =>
                          prev ? { ...prev, data: { ...(prev.data || {}), fontSize: newSize } } : prev
                        );
                      } else {
                        setFontSize(newSize);
                      }
                    }}
                    disabled={readOnly}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="headerColor">Header Color</Label>
                  <div className="flex items-center mt-2">
                    <input
                      type="color"
                      id="headerColor"
                      value={headerColor}
                      onChange={(e) => {
                        if (readOnly) {
                          toast({
                            title: 'Not allowed',
                            description: 'You only have view permission for Report Designer.',
                            variant: 'destructive',
                          });
                          return;
                        }
                        setHeaderColor(e.target.value);
                      }}
                      disabled={readOnly}
                      className="w-10 h-10 p-1 bg-white border border-gray-200 rounded-md mr-2"
                    />
                    <Input
                      value={headerColor}
                      onChange={(e) => {
                        if (readOnly) {
                          toast({
                            title: 'Not allowed',
                            description: 'You only have view permission for Report Designer.',
                            variant: 'destructive',
                          });
                          return;
                        }
                        setHeaderColor(e.target.value);
                      }}
                      disabled={readOnly}
                      className="w-24"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="borderStyle">Border Style</Label>
                  <Select
                    value={borderStyle}
                    onValueChange={(v) => {
                      if (readOnly) {
                        toast({
                          title: 'Not allowed',
                          description: 'You only have view permission for Report Designer.',
                          variant: 'destructive',
                        });
                        return;
                      }
                      setBorderStyle(v);
                    }}
                  >
                    <SelectTrigger className="mt-2" disabled={readOnly}>
                      <SelectValue placeholder="Select border style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solid">Solid</SelectItem>
                      <SelectItem value="dashed">Dashed</SelectItem>
                      <SelectItem value="dotted">Dotted</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Center Panel - Live Preview */}
        <div 
          className="flex-1 overflow-auto bg-gray-100 p-6 flex flex-col items-center"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => {
            if (readOnly) return;
            setSelectedComponent(null);
          }}
        >
          <div className="w-full max-w-5xl flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Live Preview</h2>
            <Button size="sm" onClick={handleSaveTemplate} disabled={readOnly}>
              Save as Report Template
            </Button>
          </div>
          {/* A4-sized preview container (210mm x 297mm, scaled to pixels) */}
          <div
            className="bg-white p-8 border border-gray-200 shadow-sm"
            style={{
              width: '794px',   // ~210mm at 96 DPI
              height: '1123px', // ~297mm at 96 DPI
              maxWidth: '100%',
              fontSize: `${fontSize}px`,
            }}
          >
            {reportComponents.length === 0 ? (
              <div className="text-center text-gray-400 p-8 border-2 border-dashed rounded-lg">
                Drag components here to build your report
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="space-y-4">
                  {reportComponents
                    .filter((c) => c.type !== 'consultant-section')
                    .map((component) => (
                    <div 
                      key={component.id} 
                      className={`relative group transition-all duration-200 ${selectedComponent?.id === component.id ? 'ring-2 ring-blue-500 rounded-lg' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (readOnly) return;
                        setSelectedComponent(component === selectedComponent ? null : component);
                      }}
                    >
                      {renderComponent(component)}
                      <button 
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (readOnly) {
                            toast({
                              title: 'Not allowed',
                              description: 'You only have view permission for Report Designer.',
                              variant: 'destructive',
                            });
                            return;
                          }
                          setReportComponents(reportComponents.filter(c => c.id !== component.id));
                          if (selectedComponent?.id === component.id) {
                            setSelectedComponent(null);
                          }
                        }}
                        disabled={readOnly}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-auto pt-2 pb-2 flex items-end justify-end">
                  {reportComponents
                    .filter((c) => c.type === 'consultant-section')
                    .slice(-1)
                    .map((component) => (
                      <div
                        key={component.id}
                        className={`relative group transition-all duration-200 ${selectedComponent?.id === component.id ? 'ring-2 ring-blue-500 rounded-lg' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (readOnly) return;
                          setSelectedComponent(component === selectedComponent ? null : component);
                        }}
                      >
                        {renderComponent(component)}
                        <button
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (readOnly) {
                              toast({
                                title: 'Not allowed',
                                description: 'You only have view permission for Report Designer.',
                                variant: 'destructive',
                              });
                              return;
                            }
                            setReportComponents(reportComponents.filter((c) => c.id !== component.id));
                            if (selectedComponent?.id === component.id) {
                              setSelectedComponent(null);
                            }
                          }}
                          disabled={readOnly}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                </div>
                <div className="pt-2 border-t text-[12px] text-center text-black">
                  System Generated Report, No Signature Required. Approved By Consultant. Not Valid For Any Court Of Law.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportDesigner;
