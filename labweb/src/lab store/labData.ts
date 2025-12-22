
import { TestType, Sample, SampleResult } from "@/types/sample";
import { ResultEntry } from "@/types/result";

export interface Patient {
  id: string;
  name: string;
  phone: string;
  email: string;
  age: string;
  gender: string;
  address: string;
  createdAt: Date;
}

export interface StoredSample extends Omit<Sample, 'results'> {
  results?: ResultEntry[];
  notes?: string;
  updatedAt: Date;
}

// Mock database simulation
class LabDataStore {
  private tests: TestType[] = [
    {
      id: "T001",
      name: "Complete Blood Count",
      category: "Hematology",
      description: "Comprehensive blood analysis",
      duration: 45,
      price: 2500.00,
      requiresSpecialPrep: false,
      sampleType: "blood"
    },
    {
      id: "T002",
      name: "Lipid Panel",
      category: "Chemistry",
      description: "Cholesterol analysis",
      duration: 60,
      price: 3500.00,
      requiresSpecialPrep: true,
      sampleType: "blood"
    },
    {
      id: "T003",
      name: "Urinalysis",
      category: "Urinalysis",
      description: "Complete urine examination",
      duration: 30,
      price: 1500.00,
      requiresSpecialPrep: false,
      sampleType: "urine"
    }
  ];

  private patients: Patient[] = [];
  private samples: StoredSample[] = [];

  // Test operations
  getTests(): TestType[] {
    return [...this.tests];
  }

  addTest(test: Omit<TestType, "id">): TestType {
    const newTest: TestType = {
      ...test,
      id: `T${String(this.tests.length + 1).padStart(3, '0')}`
    };
    this.tests.push(newTest);
    return newTest;
  }

  updateTest(id: string, updates: Partial<TestType>): TestType | null {
    const index = this.tests.findIndex(t => t.id === id);
    if (index === -1) return null;
    
    this.tests[index] = { ...this.tests[index], ...updates };
    return this.tests[index];
  }

  deleteTest(id: string): boolean {
    const index = this.tests.findIndex(t => t.id === id);
    if (index === -1) return false;
    
    this.tests.splice(index, 1);
    return true;
  }

  // Patient operations
  getPatients(): Patient[] {
    return [...this.patients];
  }

  addPatient(patient: Omit<Patient, "id" | "createdAt">): Patient {
    const newPatient: Patient = {
      ...patient,
      id: `P${String(this.patients.length + 1).padStart(3, '0')}`,
      createdAt: new Date()
    };
    this.patients.push(newPatient);
    return newPatient;
  }

  // Sample operations
  getSamples(): StoredSample[] {
    return [...this.samples];
  }

  addSample(sample: Omit<StoredSample, "id" | "barcode" | "receivedAt" | "updatedAt">): StoredSample {
    const newSample: StoredSample = {
      ...sample,
      id: `SAM${Date.now().toString().slice(-8)}`,
      barcode: `SAM${Date.now().toString().slice(-8)}`,
      receivedAt: new Date(),
      updatedAt: new Date()
    };
    this.samples.push(newSample);
    return newSample;
  }

  updateSample(id: string, updates: Partial<StoredSample>): StoredSample | null {
    const index = this.samples.findIndex(s => s.id === id);
    if (index === -1) return null;
    
    this.samples[index] = { 
      ...this.samples[index], 
      ...updates,
      updatedAt: new Date()
    };
    return this.samples[index];
  }

  getSampleById(id: string): StoredSample | null {
    return this.samples.find(s => s.id === id) || null;
  }
}

export const labDataStore = new LabDataStore();
