
import React, { useState } from 'react';
import { FileText, Printer, Calculator, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/utils/hospitalUtils';

interface ProcedureEstimate {
  patientName: string;
  mrNumber: string;
  procedureType: string;
  estimatedCost: number;
  roomCharges: number;
  medicineCharges: number;
  doctorFee: number;
  otherCharges: number;
  totalEstimate: number;
  notes: string;
}

const ProcedureEstimate = () => {
  const [estimate, setEstimate] = useState<ProcedureEstimate>({
    patientName: '',
    mrNumber: '',
    procedureType: '',
    estimatedCost: 0,
    roomCharges: 0,
    medicineCharges: 0,
    doctorFee: 0,
    otherCharges: 0,
    totalEstimate: 0,
    notes: ''
  });

  const [generatedEstimate, setGeneratedEstimate] = useState<ProcedureEstimate | null>(null);

  const procedureTypes = [
    'C Section',
    'Normal Delivery',
    'Appendectomy',
    'Gallbladder Surgery',
    'Hernia Repair',
    'Cataract Surgery',
    'Tonsillectomy',
    'Other'
  ];

  const handleInputChange = (field: string, value: string | number) => {
    setEstimate(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate total when cost components change
      if (['estimatedCost', 'roomCharges', 'medicineCharges', 'doctorFee', 'otherCharges'].includes(field)) {
        updated.totalEstimate = 
          updated.estimatedCost + 
          updated.roomCharges + 
          updated.medicineCharges + 
          updated.doctorFee + 
          updated.otherCharges;
      }
      
      return updated;
    });
  };

  const generateEstimate = () => {
    if (!estimate.patientName || !estimate.procedureType) {
      alert('Please fill in patient name and procedure type');
      return;
    }
    
    setGeneratedEstimate({ ...estimate });
  };

  const printEstimate = () => {
    if (!generatedEstimate) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const hospitalLogo = localStorage.getItem('hospitalLogo') || '';
      const hospitalName = localStorage.getItem('hospitalName') || 'SALIMA ALI FAMILY HOSPITAL';
      const hospitalPhone = localStorage.getItem('hospitalPhone') || '+92-XXX-XXXXXXX';
      const hospitalAddress = localStorage.getItem('hospitalAddress') || 'Hospital Address, City, Country';
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Procedure Cost Estimate</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
              
              * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
              }
              
              @page {
                size: A4;
                margin: 20mm;
              }
              
              body { 
                font-family: 'Poppins', sans-serif; 
                font-size: 12px;
                line-height: 1.4;
                color: #333;
                background: white;
              }
              
              .estimate-container {
                width: 100%;
                max-width: 180mm;
                margin: 0 auto;
                background: white;
              }
              
              .header {
                text-align: center;
                border-bottom: 3px solid #2563eb;
                padding: 15px 0;
                margin-bottom: 20px;
                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                border-radius: 8px;
              }
              
              .logo {
                max-height: 50px;
                margin-bottom: 8px;
              }
              
              .hospital-name {
                font-size: 22px;
                font-weight: 700;
                color: #1e40af;
                margin: 8px 0 4px 0;
                letter-spacing: 0.5px;
              }
              
              .contact-info {
                color: #64748b;
                font-size: 11px;
                font-weight: 500;
                margin: 3px 0;
              }
              
              .estimate-title {
                margin-top: 10px;
                font-weight: 700;
                color: #1e40af;
                font-size: 16px;
                text-transform: uppercase;
                letter-spacing: 1px;
              }
              
              .patient-info {
                background: #f8fafc;
                padding: 15px;
                border-radius: 8px;
                border-left: 4px solid #3b82f6;
                margin-bottom: 20px;
              }
              
              .info-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
              }
              
              .info-label {
                font-weight: 600;
                color: #374151;
                width: 150px;
              }
              
              .info-value {
                color: #1f2937;
                font-weight: 500;
                flex: 1;
              }
              
              .cost-breakdown {
                border: 2px solid #e2e8f0;
                border-radius: 8px;
                overflow: hidden;
                margin-bottom: 20px;
              }
              
              .breakdown-header {
                background: #2563eb;
                color: white;
                padding: 12px;
                font-weight: 600;
                font-size: 14px;
                text-align: center;
              }
              
              .breakdown-row {
                display: flex;
                justify-content: space-between;
                padding: 12px 15px;
                border-bottom: 1px solid #e2e8f0;
              }
              
              .breakdown-row:nth-child(even) {
                background: #f8fafc;
              }
              
              .breakdown-row:last-child {
                border-bottom: none;
                background: #f0f9ff;
                font-weight: 600;
                font-size: 14px;
                color: #1e40af;
              }
              
              .cost-label {
                font-weight: 500;
                color: #374151;
              }
              
              .cost-value {
                font-weight: 600;
                color: #1f2937;
              }
              
              .notes-section {
                background: #fef3c7;
                padding: 15px;
                border-radius: 8px;
                border-left: 4px solid #f59e0b;
                margin-bottom: 20px;
              }
              
              .notes-title {
                font-weight: 600;
                color: #92400e;
                margin-bottom: 8px;
              }
              
              .notes-text {
                color: #78350f;
                line-height: 1.5;
              }
              
              .disclaimer {
                background: #fef2f2;
                border: 1px solid #fecaca;
                border-radius: 8px;
                padding: 15px;
                margin: 20px 0;
                text-align: center;
              }
              
              .disclaimer-title {
                font-weight: 600;
                color: #dc2626;
                margin-bottom: 8px;
                font-size: 14px;
              }
              
              .disclaimer-text {
                color: #991b1b;
                font-size: 11px;
                line-height: 1.4;
              }
              
              .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 2px solid #e2e8f0;
              }
              
              .date-time {
                color: #6b7280;
                font-size: 11px;
                margin-bottom: 10px;
              }
              
              @media print {
                body { 
                  font-size: 11px; 
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .estimate-container { 
                  max-width: 100%; 
                }
              }
            </style>
          </head>
          <body>
            <div class="estimate-container">
              <div class="header">
                ${hospitalLogo ? `<img src="${hospitalLogo}" alt="Hospital Logo" class="logo">` : ''}
                <div class="hospital-name">${hospitalName}</div>
                <div class="contact-info">📞 ${hospitalPhone}</div>
                <div class="contact-info">📍 ${hospitalAddress}</div>
                <div class="estimate-title">Procedure Cost Estimate</div>
              </div>
              
              <div class="patient-info">
                <div class="info-row">
                  <span class="info-label">Patient Name:</span>
                  <span class="info-value">${generatedEstimate.patientName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">MR Number:</span>
                  <span class="info-value">${generatedEstimate.mrNumber}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Procedure Type:</span>
                  <span class="info-value">${generatedEstimate.procedureType}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Estimate Date:</span>
                  <span class="info-value">${new Date().toLocaleDateString()}</span>
                </div>
              </div>
              
              <div class="cost-breakdown">
                <div class="breakdown-header">COST BREAKDOWN</div>
                <div class="breakdown-row">
                  <span class="cost-label">Procedure Cost:</span>
                  <span class="cost-value">Rs. ${generatedEstimate.estimatedCost.toLocaleString()}</span>
                </div>
                <div class="breakdown-row">
                  <span class="cost-label">Room Charges:</span>
                  <span class="cost-value">Rs. ${generatedEstimate.roomCharges.toLocaleString()}</span>
                </div>
                <div class="breakdown-row">
                  <span class="cost-label">Medicine Charges:</span>
                  <span class="cost-value">Rs. ${generatedEstimate.medicineCharges.toLocaleString()}</span>
                </div>
                <div class="breakdown-row">
                  <span class="cost-label">Doctor Fee:</span>
                  <span class="cost-value">Rs. ${generatedEstimate.doctorFee.toLocaleString()}</span>
                </div>
                <div class="breakdown-row">
                  <span class="cost-label">Other Charges:</span>
                  <span class="cost-value">Rs. ${generatedEstimate.otherCharges.toLocaleString()}</span>
                </div>
                <div class="breakdown-row">
                  <span class="cost-label">TOTAL ESTIMATE:</span>
                  <span class="cost-value">Rs. ${generatedEstimate.totalEstimate.toLocaleString()}</span>
                </div>
              </div>
              
              ${generatedEstimate.notes ? `
                <div class="notes-section">
                  <div class="notes-title">Additional Notes:</div>
                  <div class="notes-text">${generatedEstimate.notes}</div>
                </div>
              ` : ''}
              
              <div class="disclaimer">
                <div class="disclaimer-title">⚠️ IMPORTANT DISCLAIMER ⚠️</div>
                <div class="disclaimer-text">
                  This is an estimated cost and actual charges may vary based on complications, 
                  additional procedures required, length of stay, and other factors. 
                  Final billing will be provided after the procedure is completed.
                  Please consult with your doctor for more accurate estimates.
                </div>
              </div>
              
              <div class="footer">
                <div class="date-time">
                  Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
                </div>
                <div style="font-weight: 600; color: #374151;">
                  ${hospitalName}
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
      <Card className="border-t-4 border-t-green-600 shadow-xl bg-gradient-to-br from-green-50 to-emerald-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-green-800">
            <Calculator className="h-6 w-6 text-green-600" />
            <span className="font-poppins font-semibold">Procedure Cost Estimate</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="patientName" className="font-poppins font-medium text-gray-700">Patient Name</Label>
              <Input
                id="patientName"
                value={estimate.patientName}
                onChange={(e) => handleInputChange('patientName', e.target.value)}
                placeholder="Enter patient name"
                className="border-gray-300 focus:border-green-500 font-poppins"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="mrNumber" className="font-poppins font-medium text-gray-700">MR Number</Label>
              <Input
                id="mrNumber"
                value={estimate.mrNumber}
                onChange={(e) => handleInputChange('mrNumber', e.target.value)}
                placeholder="Enter MR number"
                className="border-gray-300 focus:border-green-500 font-poppins"
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="procedureType" className="font-poppins font-medium text-gray-700">Procedure Type</Label>
              <Select value={estimate.procedureType} onValueChange={(value) => handleInputChange('procedureType', value)}>
                <SelectTrigger className="border-gray-300 focus:border-green-500 font-poppins">
                  <SelectValue placeholder="Select procedure type" />
                </SelectTrigger>
                <SelectContent className="bg-white border shadow-lg font-poppins">
                  {procedureTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimatedCost" className="flex items-center space-x-2 text-gray-700 font-poppins font-medium">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span>Procedure Cost (Rs.)</span>
              </Label>
              <Input
                id="estimatedCost"
                type="number"
                value={estimate.estimatedCost}
                onChange={(e) => handleInputChange('estimatedCost', parseInt(e.target.value) || 0)}
                placeholder="0"
                className="border-gray-300 focus:border-green-500 font-poppins"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="roomCharges" className="font-poppins font-medium text-gray-700">Room Charges (Rs.)</Label>
              <Input
                id="roomCharges"
                type="number"
                value={estimate.roomCharges}
                onChange={(e) => handleInputChange('roomCharges', parseInt(e.target.value) || 0)}
                placeholder="0"
                className="border-gray-300 focus:border-green-500 font-poppins"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="medicineCharges" className="font-poppins font-medium text-gray-700">Medicine Charges (Rs.)</Label>
              <Input
                id="medicineCharges"
                type="number"
                value={estimate.medicineCharges}
                onChange={(e) => handleInputChange('medicineCharges', parseInt(e.target.value) || 0)}
                placeholder="0"
                className="border-gray-300 focus:border-green-500 font-poppins"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="doctorFee" className="font-poppins font-medium text-gray-700">Doctor Fee (Rs.)</Label>
              <Input
                id="doctorFee"
                type="number"
                value={estimate.doctorFee}
                onChange={(e) => handleInputChange('doctorFee', parseInt(e.target.value) || 0)}
                placeholder="0"
                className="border-gray-300 focus:border-green-500 font-poppins"
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="otherCharges" className="font-poppins font-medium text-gray-700">Other Charges (Rs.)</Label>
              <Input
                id="otherCharges"
                type="number"
                value={estimate.otherCharges}
                onChange={(e) => handleInputChange('otherCharges', parseInt(e.target.value) || 0)}
                placeholder="0"
                className="border-gray-300 focus:border-green-500 font-poppins"
              />
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center">
              <span className="font-bold text-blue-800 text-lg">Total Estimate:</span>
              <span className="font-bold text-blue-900 text-2xl">{formatCurrency(estimate.totalEstimate)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="font-poppins font-medium text-gray-700">Additional Notes</Label>
            <textarea
              id="notes"
              value={estimate.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Enter any additional notes or special instructions..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-green-500 focus:outline-none font-poppins min-h-20"
            />
          </div>
          
          <Button 
            onClick={generateEstimate} 
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-lg py-3 font-poppins font-semibold shadow-lg"
            disabled={!estimate.patientName || !estimate.procedureType}
          >
            Generate Estimate
          </Button>
        </CardContent>
      </Card>

      {generatedEstimate && (
        <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 shadow-xl">
          <CardHeader>
            <CardTitle className="text-green-800 font-poppins font-semibold">Estimate Generated Successfully</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white p-6 rounded-lg border-2 border-green-200 space-y-4">
              <div className="text-center border-b-2 border-green-600 pb-4 mb-4">
                <h3 className="font-bold text-2xl text-green-800 font-poppins">Procedure Cost Estimate</h3>
                <p className="text-sm text-gray-600 font-poppins">Generated on {new Date().toLocaleDateString()}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm font-poppins">
                <div><strong>Patient:</strong> {generatedEstimate.patientName}</div>
                <div><strong>MR Number:</strong> {generatedEstimate.mrNumber}</div>
                <div className="col-span-2"><strong>Procedure:</strong> {generatedEstimate.procedureType}</div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-bold mb-3 font-poppins">Cost Breakdown:</h4>
                <div className="space-y-2 text-sm font-poppins">
                  <div className="flex justify-between">
                    <span>Procedure Cost:</span>
                    <span>{formatCurrency(generatedEstimate.estimatedCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Room Charges:</span>
                    <span>{formatCurrency(generatedEstimate.roomCharges)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Medicine Charges:</span>
                    <span>{formatCurrency(generatedEstimate.medicineCharges)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Doctor Fee:</span>
                    <span>{formatCurrency(generatedEstimate.doctorFee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Other Charges:</span>
                    <span>{formatCurrency(generatedEstimate.otherCharges)}</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total Estimate:</span>
                    <span>{formatCurrency(generatedEstimate.totalEstimate)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={printEstimate} 
              className="w-full mt-4 bg-green-600 hover:bg-green-700 font-poppins font-semibold"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Estimate
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProcedureEstimate;
