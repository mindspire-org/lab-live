
export interface TestType {
  _id?: string;
  id?: string;
  name: string;
  category: string;
  description: string;
  duration: number; // in minutes
  price: number;
  requiresSpecialPrep: boolean;
  sampleType: "blood" | "urine" | "saliva" | "tissue" | "other";
}

export interface Sample {
  id: string;
  patientId: string;
  patientName: string;
  testType: TestType;
  status: "received" | "processing" | "completed" | "archived";
  priority: "normal" | "high" | "urgent";
  receivedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  notes?: string;
  barcode?: string;
  sampleCollectedBy?: string;
  collectedSample?: string;
  referringDoctor?: string;
  results?: SampleResult;
}

export interface SampleResult {
  id: string;
  sampleId: string;
  values: Record<string, any>;
  abnormalFlags: string[];
  interpretation?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
}

export interface TestCatalogItem extends TestType {
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
