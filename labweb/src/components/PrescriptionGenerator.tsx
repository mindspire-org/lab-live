
import React, { useState, useEffect } from 'react';
import { FileText, User, Calendar, Hash, Phone, MapPin, Activity, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useDoctors } from '@/hooks/useApi';

interface PrescriptionData {
  patientName: string;
  age: string;
  gender: string;
  phone: string;
  address: string;
  mrNumber: string;
  doctor: string;
  department: string;
  symptoms: string;
  tokenNumber: string;
  // Vital signs
  bp: string;
  pulse: string;
  temp: string;
  weight: string;
  // Investigation checklist
  investigations: {
    hb: boolean;
    cbc: boolean;
    bloodGroup: boolean;
    bsr: boolean;
    antiHcv: boolean;
    hbsag: boolean;
    ptAptt: boolean;
    lftRpt: boolean;
    urineComplete: boolean;
  };
}

const PrescriptionGenerator = ({ tokenData }: { tokenData?: any }) => {
  const [prescriptionData, setPrescriptionData] = useState<PrescriptionData>({
    patientName: '',
    age: '',
    gender: '',
    phone: '',
    address: '',
    mrNumber: '',
    doctor: '',
    department: '',
    symptoms: '',
    tokenNumber: '',
    bp: '',
    pulse: '',
    temp: '',
    weight: '',
    investigations: {
      hb: false,
      cbc: false,
      bloodGroup: false,
      bsr: false,
      antiHcv: false,
      hbsag: false,
      ptAptt: false,
      lftRpt: false,
      urineComplete: false
    }
  });

  const [generatedPrescription, setGeneratedPrescription] = useState<any>(null);
  const { data: doctors = [] } = useDoctors();

  useEffect(() => {
    if (tokenData) {
      setPrescriptionData(prev => ({
        ...prev,
        patientName: tokenData.patientName || '',
        age: tokenData.age || '',
        gender: tokenData.gender || '',
        phone: tokenData.phone || '',
        address: tokenData.address || '',
        mrNumber: tokenData.mrNumber || '',
        doctor: tokenData.doctor || '',
        department: tokenData.department || '',
        symptoms: tokenData.symptoms || '',
        tokenNumber: tokenData.tokenNumber || ''
      }));
    }
  }, [tokenData]);

  const handleInputChange = (field: string, value: string) => {
    setPrescriptionData(prev => ({ ...prev, [field]: value }));
  };

  const handleInvestigationChange = (field: string, checked: boolean) => {
    setPrescriptionData(prev => ({
      ...prev,
      investigations: {
        ...prev.investigations,
        [field]: checked
      }
    }));
  };

  const sendToPharmacy = async () => {
    try {
      const token = localStorage.getItem('integrationToken') || 'x-integration-123';
      const body = {
        patient: {
          name: prescriptionData.patientName,
          phone: prescriptionData.phone,
          gender: prescriptionData.gender,
          address: prescriptionData.address,
        },
        doctor: {
          name: prescriptionData.doctor || 'Unknown Doctor',
          specialization: prescriptionData.department || 'General',
        },
        date: new Date().toISOString(),
        medicines: [],
        instructions: prescriptionData.symptoms || '',
      };
      const res = await fetch('/api/integration/prescriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Integration-Token': token,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      alert('Prescription sent to Pharmacy');
    } catch (e: any) {
      alert(`Send to Pharmacy failed: ${e?.message || e}`);
    }
  };

  const referToLab = async () => {
    try {
      const token = localStorage.getItem('integrationToken') || 'x-integration-123';
      const body = {
        patient: {
          name: prescriptionData.patientName,
          phone: prescriptionData.phone,
          age: prescriptionData.age,
          gender: prescriptionData.gender,
          address: prescriptionData.address,
        },
        tests: [],
        preferredDate: new Date().toISOString(),
        doctorName: prescriptionData.doctor || 'Unknown Doctor',
        notes: prescriptionData.symptoms || '',
      };
      const res = await fetch('/integration/referrals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Integration-Token': token,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      alert('Referral sent to Lab');
    } catch (e: any) {
      alert(`Refer to Lab failed: ${e?.message || e}`);
    }
  };

  const generatePrescription = () => {
    const now = new Date();
    const prescription = {
      ...prescriptionData,
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString()
    };
    setGeneratedPrescription(prescription);
  };

  const printPrescription = () => {
    // If no prescription is generated, generate from current prescriptionData
    let prescriptionToPrint = generatedPrescription;
    if (!prescriptionToPrint) {
      // Check for required fields
      if (!prescriptionData.patientName || !prescriptionData.doctor) {
        alert('Please enter patient name and select doctor before printing.');
        return;
      }
      const now = new Date();
      prescriptionToPrint = {
        ...prescriptionData,
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString()
      };
      setGeneratedPrescription(prescriptionToPrint); // Also update state for UI consistency
    }
    const printWindow = window.open('', '_blank');
    if (printWindow && prescriptionToPrint) {
      const hospitalLogo = localStorage.getItem('hospitalLogo') || '';
      const hospitalName = localStorage.getItem('hospitalName') || 'SALIMA ALI FAMILY HOSPITAL';
      const hospitalPhone = localStorage.getItem('hospitalPhone') || '+92-XXX-XXXXXXX';
      const hospitalAddress = localStorage.getItem('hospitalAddress') || 'Hospital Address, City, Country';
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Medical Prescription</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
              
              * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
              }
              
              @page {
                size: A4;
                margin: 10mm 8mm 10mm 8mm;
              }
              
              body { 
                font-family: 'Poppins', sans-serif; 
                font-size: 11px;
                line-height: 1.3;
                color: #333;
                background: white;
              }
              
              .prescription-container {
                width: 100%;
                max-width: 185mm;
                margin: 0 auto;
                background: white;
                display: flex;
                flex-direction: column;
                min-height: 97vh;
                height: auto;
                justify-content: flex-start;
              }
              
              .header {
                text-align: center;
                border-bottom: 2px solid #2563eb;
                padding: 10px 0;
                margin-bottom: 12px;
                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                border-radius: 6px;
              }
              
              .logo {
                max-height: 45px;
                margin-bottom: 6px;
              }
              
              .hospital-name {
                font-size: 18px;
                font-weight: 700;
                color: #1e40af;
                margin: 6px 0 3px 0;
                letter-spacing: 0.3px;
              }
              
              .contact-info {
                color: #64748b;
                font-size: 10px;
                font-weight: 500;
                margin: 2px 0;
              }
              
              .prescription-title {
                margin-top: 6px;
                font-weight: 600;
                color: #1e40af;
                font-size: 12px;
              }
              
              .patient-info {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                margin-bottom: 12px;
                background: #f8fafc;
                padding: 12px;
                border-radius: 6px;
                border-left: 3px solid #3b82f6;
                font-size: 10px;
              }
              
              .info-item {
                margin-bottom: 4px;
              }
              
              .info-label {
                font-weight: 600;
                color: #374151;
                margin-right: 6px;
                min-width: 70px;
                display: inline-block;
              }
              
              .info-value {
                color: #1f2937;
                font-weight: 500;
              }
              
              .content-wrapper {
                display: flex;
                gap: 12px;
                flex: 1;
                margin-bottom: 12px;
              }
              
              .sidebar {
                flex: 0 0 85px;
                background: #f8fafc;
                padding: 10px;
                border-radius: 6px;
                border: 1px solid #e2e8f0;
                height: fit-content;
              }
              
              .main-content {
                flex: 1;
              }
              
              .symptoms-section {
                margin-bottom: 12px;
                background: #fef3c7;
                padding: 8px;
                border-radius: 4px;
                border-left: 3px solid #f59e0b;
                font-size: 10px;
              }
              
              .prescription-section {
                flex: 1;
                position: relative;
              }
              
              .prescription-box {
                border: 3px solid #2563eb;
                width: 160mm;
                height: 175mm;
                min-height: 175mm;
                max-height: 175mm;
                min-width: 160mm;
                max-width: 160mm;
                margin: 0 auto;
                padding: 22mm 14mm 24mm 14mm;
                border-radius: 14px;
                background: white;
                position: relative;
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
                box-shadow: 0 8px 36px 0 #dbeafe99;
              }
              
              .rx-symbol {
                font-size: 20px;
                font-weight: bold;
                color: #2563eb;
                margin-bottom: 10px;
                display: block;
              }
              
              .prescription-lines {
  /* lines removed: leave blank for writing */
  background: none !important;
  height: 100%;
}
                background-image: repeating-linear-gradient(
                  transparent,
                  transparent 18px,
                  #e5e7eb 18px,
                  #e5e7eb 19px
                );
                height: calc(100% - 30px);
              }
              .doctor-signature {
                margin-top: 36px;
                text-align: right;
                font-size: 13px;
                color: #374151;
                font-family: 'Poppins', sans-serif;
                font-weight: 500;
                letter-spacing: 0.5px;
              }
              .signature-line {
                display: inline-block;
                width: 180px;
                height: 2px;
                background-color: #6b7280;
                margin-top: 6px;
                margin-bottom: 2px;
                border-radius: 2px;
                vertical-align: middle;
              }
              
              .sidebar-section {
                margin-bottom: 12px;
              }
              
              .sidebar-title {
                font-weight: 600;
                color: #374151;
                margin-bottom: 6px;
                font-size: 9px;
                text-transform: uppercase;
                letter-spacing: 0.3px;
                border-bottom: 1px solid #d1d5db;
                padding-bottom: 3px;
              }
              
              .vital-signs {
                display: grid;
                grid-template-columns: 1fr;
                gap: 4px;
              }
              
              .vital-item {
                display: flex;
                justify-content: space-between;
                padding: 3px 6px;
                background: white;
                border-radius: 3px;
                border: 1px solid #d1d5db;
                font-size: 9px;
              }
              
              .vital-label {
                font-weight: 600;
                color: #6b7280;
              }
              
              .vital-value {
                color: #1f2937;
                font-weight: 500;
              }
              
              .investigation-list {
                display: grid;
                grid-template-columns: 1fr;
                gap: 3px;
              }
              
              .investigation-item {
                display: flex;
                align-items: center;
                padding: 2px 4px;
                background: white;
                border-radius: 3px;
                border: 1px solid #d1d5db;
                font-size: 8px;
              }
              
              .checkbox {
                width: 10px;
                height: 10px;
                margin-right: 6px;
                accent-color: #2563eb;
              }
              
              .not-valid {
                text-align: center;
                font-size: 10px;
                color: #dc2626;
                font-weight: 600;
                margin: 8px 0;
                padding: 6px;
                background: #fef2f2;
                border: 1px solid #fecaca;
                border-radius: 4px;
              }
              
              .hospital-contact {
                background: #f0f9ff;
                padding: 8px;
                border-radius: 4px;
                border: 1px solid #bae6fd;
                margin: 8px 0;
                text-align: center;
                font-size: 9px;
              }
              
              .hospital-contact h4 {
                color: #0369a1;
                font-weight: 600;
                margin-bottom: 4px;
                font-size: 11px;
              }
              
              .hospital-contact p {
                margin: 2px 0;
                color: #0f172a;
              }
              
              .cut-section {
                margin-top: 14px;
                padding-top: 4px;
                border-top: 1.5px dashed #6b7280;
                background: #f3f4f6;
                padding: 4px 4px 2px 4px;
                border-radius: 4px;
                font-size: 8px;
                max-width: 420px;
                margin-left: auto;
                margin-right: auto;
                opacity: 0.8;
              }
              
              .cut-header {
                text-align: center;
                font-weight: 600;
                color: #374151;
                margin-bottom: 8px;
                font-size: 11px;
              }
              
              .cut-info {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 6px;
              }
              
              .cut-item {
                text-align: center;
                padding: 4px;
                background: white;
                border-radius: 3px;
                border: 1px solid #d1d5db;
              }
              
              .cut-label {
                font-weight: 600;
                color: #6b7280;
                display: block;
                margin-bottom: 2px;
                font-size: 8px;
              }
              
              .cut-value {
                color: #1f2937;
                font-weight: 500;
                font-size: 9px;
              }
              
              @media print {
                body { 
                  font-size: 10px; 
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .prescription-container { 
                  max-width: 100%; 
                  height: auto;
                }
                .prescription-box { height: calc(50vh - 60px); }
  body { font-size: 10px; }
                }
              }
            </style>
          </head>
          <body>
            <div class="prescription-container">
              <div class="header">
                ${hospitalLogo ? `<img src="${hospitalLogo}" alt="Hospital Logo" class="logo">` : ''}
                <div class="hospital-name">${hospitalName}</div>
                <div class="prescription-title">Medical Prescription</div>
              </div>
              
              <div class="patient-info">
                <div>
                  <div class="info-item">
                    <span class="info-label">Patient Name:</span>
                    <span class="info-value">${generatedPrescription.patientName}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Age:</span>
                    <span class="info-value">${generatedPrescription.age} years</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Gender:</span>
                    <span class="info-value">${generatedPrescription.gender}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Phone:</span>
                    <span class="info-value">${generatedPrescription.phone}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Address:</span>
                    <span class="info-value">${prescriptionToPrint.address}</span>
                  </div>
                </div>
                <div>
                  <div class="info-item">
                    <span class="info-label">MR Number:</span>
                    <span class="info-value">${generatedPrescription.mrNumber}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Token #:</span>
                    <span class="info-value">${generatedPrescription.tokenNumber}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Date:</span>
                    <span class="info-value">${generatedPrescription.date}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Doctor:</span>
                    <span class="info-value">${generatedPrescription.doctor}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Department:</span>
                    <span class="info-value">${generatedPrescription.department}</span>
                  </div>
                </div>
              </div>
              
              ${generatedPrescription.symptoms ? `
                <div class="symptoms-section">
                  <div style="font-weight: 600; margin-bottom: 4px; font-size: 10px;">Chief Complaints / Symptoms:</div>
                  <div>${generatedPrescription.symptoms}</div>
                </div>
              ` : ''}
              
              <div class="content-wrapper">
                <div class="sidebar">
                  <div class="sidebar-section">
                    <div class="sidebar-title">Vital Signs</div>
                    <div class="vital-signs">
                      <div class="vital-item">
                        <span class="vital-label">BP:</span>
                        <span class="vital-value">${generatedPrescription.bp || '___'}</span>
                      </div>
                      <div class="vital-item">
                        <span class="vital-label">Pulse:</span>
                        <span class="vital-value">${generatedPrescription.pulse || '___'}</span>
                      </div>
                      <div class="vital-item">
                        <span class="vital-label">Temp:</span>
                        <span class="vital-value">${generatedPrescription.temp || '___'}</span>
                      </div>
                      <div class="vital-item">
                        <span class="vital-label">Wt:</span>
                        <span class="vital-value">${generatedPrescription.weight || '___'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div class="sidebar-section">
                    <div class="sidebar-title">Investigation</div>
                    <div class="investigation-list">
                      ${Object.entries({
                        hb: 'HB%',
                        cbc: 'CBC',
                        bloodGroup: 'Blood Group',
                        bsr: 'BSR',
                        antiHcv: 'ANTI HCV',
                        hbsag: 'HBSAG',
                        ptAptt: 'PT/APTT',
                        lftRpt: "LFT's/RFT's",
                        urineComplete: 'Urine Complete'
                      }).map(([key, label]) => `
                        <div class="investigation-item">
                          <input type="checkbox" class="checkbox" ${generatedPrescription.investigations[key] ? 'checked' : ''}>
                          <span>${label}</span>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                </div>
                
                <div class="main-content">
                  <div class="prescription-section">
                    <div class="prescription-box">
                      <span class="rx-symbol">℞</span>
                      <div class="prescription-lines"></div>
                    </div>
                     <div class="doctor-signature">
                        <div class="signature-line"></div>
                        <div>Doctor Signature</div>
                        <div style="font-weight: 600; margin-top: 2px;">${generatedPrescription.doctor}</div>
                      </div>
                  </div>
                </div>
              </div>
              
              <div class="not-valid">
                ⚠️ NOT VALID FOR COURT ⚠️
              </div>
              
              <div class="hospital-contact">
                <p>📞 Phone: ${hospitalPhone}</p>
  <p>📍 Address: ${hospitalAddress}</p>

              </div>
              
              <div class="cut-section">
                <div class="cut-header">✂️ HOSPITAL RECORD (Cut and keep for records)</div>
                <div class="cut-info">
                  <div class="cut-item">
                    <span class="cut-label">Patient Name</span>
                    <span class="cut-value">${generatedPrescription.patientName}</span>
                  </div>
                  <div class="cut-item">
                    <span class="cut-label">Age</span>
                    <span class="cut-value">${generatedPrescription.age} years</span>
                  </div>
                  <div class="cut-item">
                    <span class="cut-label">Gender</span>
                    <span class="cut-value">${generatedPrescription.gender}</span>
                  </div>
                  <div class="cut-item">
                    <span class="cut-label">MR Number</span>
                    <span class="cut-value">${generatedPrescription.mrNumber}</span>
                  </div>
                  <div class="cut-item">
                    <span class="cut-label">Phone</span>
                    <span class="cut-value">${generatedPrescription.phone}</span>
                  </div>
                  <div class="cut-item">
                    <span class="cut-label">Date</span>
                    <span class="cut-value">${generatedPrescription.date}</span>
                  </div>
                  <div class="cut-item">
                    <span class="cut-label">Token #</span>
                    <span class="cut-value">${generatedPrescription.tokenNumber}</span>
                  </div>
                  <div class="cut-item">
                    <span class="cut-label">Doctor</span>
                    <span class="cut-value">${generatedPrescription.doctor}</span>
                  </div>
                  <div class="cut-item">
                    <span class="cut-label">Department</span>
                    <span class="cut-value">${generatedPrescription.department}</span>
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-t-4 border-t-purple-600 shadow-xl bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-purple-800">
            <FileText className="h-6 w-6 text-purple-600" />
            <span className="font-poppins font-semibold">Generate Medical Prescription</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patientName" className="flex items-center space-x-2 text-gray-700 font-poppins font-medium">
                    <User className="h-4 w-4 text-purple-600" />
                    <span>Patient Name</span>
                  </Label>
                  <Input
                    id="patientName"
                    value={prescriptionData.patientName}
                    onChange={(e) => handleInputChange('patientName', e.target.value)}
                    placeholder="Enter patient name"
                    className="border-gray-300 focus:border-purple-500 font-poppins"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="age" className="font-poppins font-medium text-gray-700">Age</Label>
                  <Input
                    id="age"
                    value={prescriptionData.age}
                    onChange={(e) => handleInputChange('age', e.target.value)}
                    placeholder="Enter age"
                    type="number"
                    className="border-gray-300 focus:border-purple-500 font-poppins"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gender" className="font-poppins font-medium text-gray-700">Gender</Label>
                  <Select value={prescriptionData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                    <SelectTrigger className="border-gray-300 focus:border-purple-500 font-poppins">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border shadow-lg font-poppins">
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center space-x-2 text-gray-700 font-poppins font-medium">
                    <Phone className="h-4 w-4 text-green-600" />
                    <span>Phone Number</span>
                  </Label>
                  <Input
                    id="phone"
                    value={prescriptionData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="Enter phone number"
                    className="border-gray-300 focus:border-purple-500 font-poppins"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="flex items-center space-x-2 text-gray-700 font-poppins font-medium">
                    <MapPin className="h-4 w-4 text-red-600" />
                    <span>Address</span>
                  </Label>
                  <Input
                    id="address"
                    value={prescriptionData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Enter patient address"
                    className="border-gray-300 focus:border-purple-500 font-poppins"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="mrNumber" className="flex items-center space-x-2 text-gray-700 font-poppins font-medium">
                    <Hash className="h-4 w-4 text-blue-600" />
                    <span>MR Number</span>
                  </Label>
                  <Input
                    id="mrNumber"
                    value={prescriptionData.mrNumber}
                    onChange={(e) => handleInputChange('mrNumber', e.target.value)}
                    placeholder="Enter MR number"
                    className="border-gray-300 focus:border-purple-500 font-poppins"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tokenNumber" className="font-poppins font-medium text-gray-700">Token Number</Label>
                  <Input
                    id="tokenNumber"
                    value={prescriptionData.tokenNumber}
                    onChange={(e) => handleInputChange('tokenNumber', e.target.value)}
                    placeholder="Enter token number"
                    className="border-gray-300 focus:border-purple-500 font-poppins"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="doctor" className="font-poppins font-medium text-gray-700">Doctor</Label>
                  <Select value={prescriptionData.doctor} onValueChange={(value) => handleInputChange('doctor', value)}>
                    <SelectTrigger className="border-gray-300 focus:border-purple-500 font-poppins">
                      <SelectValue placeholder="Select doctor" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border shadow-lg font-poppins max-h-60 overflow-y-auto">
                      {doctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={`Dr. ${doctor.name} - ${doctor.specialization}`}>
                          Dr. {doctor.name} - {doctor.specialization}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="department" className="font-poppins font-medium text-gray-700">Department</Label>
                  <Select value={prescriptionData.department} onValueChange={(value) => handleInputChange('department', value)}>
                    <SelectTrigger className="border-gray-300 focus:border-purple-500 font-poppins">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border shadow-lg font-poppins">
                      <SelectItem value="OPD">OPD - Outpatient</SelectItem>
                      <SelectItem value="ER">Emergency</SelectItem>
                      <SelectItem value="LAB">Laboratory</SelectItem>
                      <SelectItem value="PROC">Procedure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="symptoms" className="flex items-center space-x-2 text-gray-700 font-poppins font-medium">
                  <Activity className="h-4 w-4 text-orange-600" />
                  <span>Chief Complaints / Symptoms</span>
                </Label>
                <textarea
                  id="symptoms"
                  value={prescriptionData.symptoms}
                  onChange={(e) => handleInputChange('symptoms', e.target.value)}
                  placeholder="Enter patient symptoms and complaints..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none font-poppins min-h-20"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <Button variant="default" onClick={sendToPharmacy}>Send to Pharmacy</Button>
                <Button variant="secondary" onClick={referToLab}>Refer to Lab</Button>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Vital Signs */}
              <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-blue-800 font-poppins text-lg">Vital Signs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="font-poppins text-sm font-medium">BP</Label>
                      <Input
                        value={prescriptionData.bp}
                        onChange={(e) => handleInputChange('bp', e.target.value)}
                        placeholder="120/80"
                        className="font-poppins"
                      />
                    </div>
                    <div>
                      <Label className="font-poppins text-sm font-medium">Pulse</Label>
                      <Input
                        value={prescriptionData.pulse}
                        onChange={(e) => handleInputChange('pulse', e.target.value)}
                        placeholder="72 bpm"
                        className="font-poppins"
                      />
                    </div>
                    <div>
                      <Label className="font-poppins text-sm font-medium">Temp</Label>
                      <Input
                        value={prescriptionData.temp}
                        onChange={(e) => handleInputChange('temp', e.target.value)}
                        placeholder="98.6°F"
                        className="font-poppins"
                      />
                    </div>
                    <div>
                      <Label className="font-poppins text-sm font-medium">Weight</Label>
                      <Input
                        value={prescriptionData.weight}
                        onChange={(e) => handleInputChange('weight', e.target.value)}
                        placeholder="70 kg"
                        className="font-poppins"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Investigation Checklist */}
              <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-green-800 font-poppins text-lg">Investigation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { key: 'hb', label: 'HB%' },
                    { key: 'cbc', label: 'CBC' },
                    { key: 'bloodGroup', label: 'Blood Group' },
                    { key: 'bsr', label: 'BSR' },
                    { key: 'antiHcv', label: 'ANTI HCV' },
                    { key: 'hbsag', label: 'HBSAG' },
                    { key: 'ptAptt', label: 'PT/APTT' },
                    { key: 'lftRpt', label: "LFT's/RPT's" },
                    { key: 'urineComplete', label: 'Urine Complete' }
                  ].map((item) => (
                    <div key={item.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={item.key}
                        checked={prescriptionData.investigations[item.key as keyof typeof prescriptionData.investigations]}
                        onCheckedChange={(checked) => handleInvestigationChange(item.key, checked as boolean)}
                      />
                      <Label htmlFor={item.key} className="font-poppins text-sm cursor-pointer">
                        {item.label}
                      </Label>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
          
          <Button 
            onClick={generatePrescription} 
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg py-3 font-poppins font-semibold shadow-lg"
            disabled={!prescriptionData.patientName || !prescriptionData.doctor}
          >
            Generate Prescription
          </Button>
        </CardContent>
      </Card>

      {generatedPrescription && (
        <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 shadow-xl">
          <CardHeader>
            <CardTitle className="text-green-800 font-poppins font-semibold">Prescription Generated Successfully</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white p-6 rounded-lg border-2 border-green-200 space-y-4">
              <div className="text-center border-b-2 border-purple-600 pb-4 mb-4">
                <h3 className="font-bold text-2xl text-purple-800 font-poppins">Medical Prescription</h3>
                <p className="text-sm text-gray-600 font-poppins">Generated on {generatedPrescription.date} at {generatedPrescription.time}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm font-poppins">
                <div><strong>Patient:</strong> {generatedPrescription.patientName}</div>
                <div><strong>Age:</strong> {generatedPrescription.age} years</div>
                <div><strong>Gender:</strong> {generatedPrescription.gender}</div>
                <div><strong>Phone:</strong> {generatedPrescription.phone}</div>
                <div className="col-span-2"><strong>Address:</strong> {generatedPrescription.address}</div>
                <div><strong>MR Number:</strong> {generatedPrescription.mrNumber}</div>
                <div><strong>Token #:</strong> {generatedPrescription.tokenNumber}</div>
                <div><strong>Doctor:</strong> {generatedPrescription.doctor}</div>
                <div><strong>Department:</strong> {generatedPrescription.department}</div>
              </div>
              
              {generatedPrescription.symptoms && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <strong className="font-poppins">Symptoms:</strong> 
                  <span className="font-poppins ml-2">{generatedPrescription.symptoms}</span>
                </div>
              )}
            </div>
            
            <Button 
              onClick={printPrescription} 
              className="w-full mt-4 bg-green-600 hover:bg-green-700 font-poppins font-semibold"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Prescription
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PrescriptionGenerator;
