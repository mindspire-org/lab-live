
import React, { useState, useEffect } from 'react';
import { Edit, Search, Save, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface Token {
  tokenNumber: string;
  patientName: string;
  age: string;
  gender?: string;
  phone: string;
  address?: string;
  doctor: string;
  department: string;
  fee: string;
  discount: string;
  dateTime: Date;
  mrNumber: string;
  finalFee: number;
}

const TokenEdit = () => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingToken, setEditingToken] = useState<Token | null>(null);
  const [filteredTokens, setFilteredTokens] = useState<Token[]>([]);
  const { toast } = useToast();

  const doctors = [
    'Dr. Ahmed Hassan - General Medicine',
    'Dr. Sarah Khan - Pediatrics',
    'Dr. Mohammad Ali - Cardiology',
    'Dr. Fatima Sheikh - Gynecology',
    'Dr. Ali Raza - Emergency Medicine'
  ];

  useEffect(() => {
    const savedTokens = JSON.parse(localStorage.getItem('tokens') || '[]');
    const parsedTokens = savedTokens.map((token: any) => ({
      ...token,
      dateTime: new Date(token.dateTime)
    }));
    setTokens(parsedTokens);
    setFilteredTokens(parsedTokens);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTokens(tokens);
      return;
    }

    const filtered = tokens.filter(token => 
      token.tokenNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.phone.includes(searchQuery) ||
      token.mrNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredTokens(filtered);
  }, [searchQuery, tokens]);

  const handleEdit = (token: Token) => {
    setEditingToken({ ...token });
  };

  const handleSave = () => {
    if (!editingToken) return;

    const updatedTokens = tokens.map(token => 
      token.tokenNumber === editingToken.tokenNumber ? {
        ...editingToken,
        finalFee: parseFloat(editingToken.fee) - parseFloat(editingToken.discount || '0')
      } : token
    );

    localStorage.setItem('tokens', JSON.stringify(updatedTokens));
    setTokens(updatedTokens);
    setEditingToken(null);
    
    toast({
      title: "Token Updated",
      description: "Token information has been updated successfully.",
    });
  };

  const handleDelete = (tokenNumber: string) => {
    if (!window.confirm('Are you sure you want to delete this token?')) return;
    const updatedTokens = tokens.filter(t => t.tokenNumber !== tokenNumber);
    localStorage.setItem('tokens', JSON.stringify(updatedTokens));
    setTokens(updatedTokens);
    setFilteredTokens(updatedTokens);
    toast({
      title: 'Token Deleted',
      description: 'Token has been deleted successfully.'
    });
  };

  const handleCancel = () => {
    setEditingToken(null);
  };

  const handleInputChange = (field: keyof Token, value: string) => {
    if (!editingToken) return;
    setEditingToken({ ...editingToken, [field]: value });
  };

  return (
    <div className="space-y-6">
      <Card className="border-t-4 border-t-purple-600 shadow-xl bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-purple-800">
            <Edit className="h-6 w-6 text-purple-600" />
            <span className="font-poppins font-semibold">Edit Tokens</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Label htmlFor="search" className="font-poppins font-medium">Search Tokens</Label>
            <div className="flex space-x-2 mt-2">
              <Input
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by token number, patient name, phone, or MR number..."
                className="flex-1 font-poppins"
              />
              <Button variant="outline" className="font-poppins">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {editingToken && (
            <Card className="mb-6 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
              <CardHeader>
                <CardTitle className="text-green-800 font-poppins">
                  Edit Token #{editingToken.tokenNumber}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="patientName" className="font-poppins font-medium">Patient Name</Label>
                    <Input
                      id="patientName"
                      value={editingToken.patientName}
                      onChange={(e) => handleInputChange('patientName', e.target.value)}
                      className="font-poppins"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="age" className="font-poppins font-medium">Age</Label>
                    <Input
                      id="age"
                      value={editingToken.age}
                      onChange={(e) => handleInputChange('age', e.target.value)}
                      placeholder="e.g. 32 or 32 years or 2 months"
                      className="font-poppins"
                    />
                  </div>
                  <div>
                    <Label htmlFor="gender" className="font-poppins font-medium">Gender</Label>
                    <select
                      id="gender"
                      value={editingToken.gender || ''}
                      onChange={e => handleInputChange('gender', e.target.value)}
                      className="font-poppins border border-gray-300 rounded px-3 py-2 w-full"
                    >
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label htmlFor="phone" className="font-poppins font-medium">Phone</Label>
                    <Input
                      id="phone"
                      value={editingToken.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="font-poppins"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="doctor" className="font-poppins font-medium">Doctor</Label>
                    <Select value={editingToken.doctor} onValueChange={(value) => handleInputChange('doctor', value)}>
                      <SelectTrigger className="font-poppins">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border shadow-lg font-poppins">
                        {doctors.map((doctor) => (
                          <SelectItem key={doctor} value={doctor}>{doctor}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="department" className="font-poppins font-medium">Department</Label>
                    <Select value={editingToken.department} onValueChange={(value) => handleInputChange('department', value)}>
                      <SelectTrigger className="font-poppins">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border shadow-lg font-poppins">
                        <SelectItem value="OPD">OPD - Outpatient</SelectItem>
                        <SelectItem value="ER">Emergency</SelectItem>
                        <SelectItem value="LAB">Laboratory</SelectItem>
                        <SelectItem value="PROC">Procedure</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="fee" className="font-poppins font-medium">Fee (Rs.)</Label>
                    <Input
                      id="fee"
                      value={editingToken.fee}
                      onChange={(e) => handleInputChange('fee', e.target.value)}
                      type="number"
                      className="font-poppins"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="discount" className="font-poppins font-medium">Discount (Rs.)</Label>
                    <Input
                      id="discount"
                      value={editingToken.discount}
                      onChange={(e) => handleInputChange('discount', e.target.value)}
                      type="number"
                      className="font-poppins"
                    />
                  </div>
                </div>
                
                {/* Symptoms field removed */}
                
                <div className="flex space-x-2 mt-6">
                  <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 font-poppins">
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button onClick={handleCancel} variant="outline" className="font-poppins">
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {filteredTokens.map((token) => (
              <Card key={token.tokenNumber} className="hover:shadow-lg transition-shadow bg-gradient-to-r from-white to-gray-50">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                      <div>
                        <p className="text-sm font-medium text-gray-600 font-poppins">Token #</p>
                        <p className="font-semibold text-purple-700 font-poppins">{token.tokenNumber}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 font-poppins">Patient</p>
                        <p className="font-semibold font-poppins">{token.patientName}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 font-poppins">Doctor</p>
                        <p className="text-sm font-poppins">{token.doctor}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 font-poppins">Final Fee</p>
                        <p className="font-semibold text-green-600 font-poppins">Rs. {token.finalFee}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => handleEdit(token)}
                        className="bg-purple-600 hover:bg-purple-700 font-poppins"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(token.tokenNumber)}
                        className="font-poppins"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredTokens.length === 0 && (
            <div className="text-center py-8">
              <Edit className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 font-poppins">
                {searchQuery ? 'No tokens found matching your search.' : 'No tokens available to edit.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TokenEdit;
