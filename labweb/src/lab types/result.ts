
export interface TestParameter {
  id: string;
  name: string;
  unit: string;
  normalRange: {
    min: number;
    max: number;
  };
  criticalRange?: {
    min: number;
    max: number;
  };
}

export interface ResultEntry {
  parameterId: string;
  value: number | string;
  isAbnormal: boolean;
  isCritical: boolean;
  comment?: string;
}

export interface TestResult {
  id: string;
  sampleId: string;
  testTypeId: string;
  parameters: ResultEntry[];
  interpretation?: string;
  technicianId: string;
  reviewedBy?: string;
  status: "draft" | "pending_review" | "approved" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportTemplate {
  id: string;
  testTypeId: string;
  name: string;
  sections: ReportSection[];
  isDefault: boolean;
}

export interface ReportSection {
  id: string;
  title: string;
  type: "parameters" | "interpretation" | "notes" | "recommendations";
  order: number;
  isRequired: boolean;
}
