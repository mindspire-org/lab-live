require('dotenv').config();

const { connectDB } = require('../src/config/db');
const Test = require('../src/models/Test');

async function run() {
  await connectDB();

  const tests = [
    {
      name: 'Complete Blood Count (CBC)',
      category: 'Hematology',
      description: 'General health screening',
      price: 650,
      sampleType: 'blood',
      fastingRequired: false,
      parameters: [
        {
          id: '',
          name: 'Hemoglobin',
          unit: 'g/dL',
          normalRangeMale: '13.5–17.5',
          normalRangeFemale: '12.0–15.5',
          normalRangePediatric: 'Age-dependent',
          normalRange: { min: 12, max: 18 },
        },
      ],
    },
    {
      name: 'Blood Glucose (Random)',
      category: 'Biochemistry',
      description: 'Diabetes screening',
      price: 250,
      sampleType: 'blood',
      fastingRequired: false,
      parameters: [
        {
          id: '',
          name: 'Glucose (Random)',
          unit: 'mg/dL',
          normalRangeMale: '70–140',
          normalRangeFemale: '70–140',
          normalRangePediatric: '70–140',
          normalRange: { min: 70, max: 140 },
        },
      ],
    },
    {
      name: 'Blood Glucose (Fasting)',
      category: 'Biochemistry',
      description: 'Diabetes diagnosis (8–12 hr fasting)',
      price: 300,
      sampleType: 'blood',
      fastingRequired: true,
      parameters: [
        {
          id: '',
          name: 'Glucose (Fasting)',
          unit: 'mg/dL',
          normalRangeMale: '70–100',
          normalRangeFemale: '70–100',
          normalRangePediatric: '70–100',
          normalRange: { min: 70, max: 100 },
        },
      ],
    },
    {
      name: 'Liver Function Test (LFT) Panel',
      category: 'Biochemistry',
      description: 'Liver health (ALT, AST, Bilirubin)',
      price: 1600,
      sampleType: 'blood',
      fastingRequired: true,
      parameters: [
        {
          id: '',
          name: 'ALT (SGPT)',
          unit: 'U/L',
          normalRangeMale: '10–55',
          normalRangeFemale: '7–45',
          normalRangePediatric: 'Varies',
          normalRange: { min: 7, max: 55 },
        },
      ],
    },
    {
      name: 'Renal Function Test (RFT) / Kidney Profile',
      category: 'Biochemistry',
      description: 'Kidney profile (urea, creatinine)',
      price: 1600,
      sampleType: 'blood',
      fastingRequired: false,
      parameters: [
        {
          id: '',
          name: 'Creatinine',
          unit: 'mg/dL',
          normalRangeMale: '0.7–1.3',
          normalRangeFemale: '0.6–1.1',
          normalRangePediatric: '0.3–0.7',
          normalRange: { min: 0.3, max: 1.3 },
        },
      ],
    },
    {
      name: 'Lipid Profile',
      category: 'Biochemistry',
      description: 'Cholesterol evaluation',
      price: 1800,
      sampleType: 'blood',
      fastingRequired: true,
      parameters: [
        {
          id: '',
          name: 'Total Cholesterol',
          unit: 'mg/dL',
          normalRangeMale: '< 200',
          normalRangeFemale: '< 200',
          normalRangePediatric: '< 200',
          normalRange: { min: 0, max: 200 },
        },
      ],
    },
    {
      name: 'Thyroid Stimulating Hormone (TSH)',
      category: 'Endocrinology',
      description: 'Thyroid function',
      price: 1300,
      sampleType: 'blood',
      fastingRequired: false,
      parameters: [
        {
          id: '',
          name: 'TSH',
          unit: '\u00b5IU/mL',
          normalRangeMale: '0.4–4.5',
          normalRangeFemale: '0.4–4.5',
          normalRangePediatric: '0.4–4.5',
          normalRange: { min: 0.4, max: 4.5 },
        },
      ],
    },
    {
      name: 'Urine Routine Examination (R/E)',
      category: 'Urinalysis',
      description: 'General kidney / UTI check',
      price: 300,
      sampleType: 'urine',
      fastingRequired: false,
      parameters: [
        {
          id: '',
          name: 'Urine R/E (pH, protein, RBCs)',
          unit: 'Qualitative',
          normalRangeMale: 'Negative',
          normalRangeFemale: 'Negative',
          normalRangePediatric: 'Negative',
          normalRange: { min: 0, max: 0 },
        },
      ],
    },
    {
      name: 'ESR (Erythrocyte Sedimentation Rate)',
      category: 'Hematology',
      description: 'Inflammation marker',
      price: 250,
      sampleType: 'blood',
      fastingRequired: false,
      parameters: [
        {
          id: '',
          name: 'ESR',
          unit: 'mm/hr',
          normalRangeMale: '< 15',
          normalRangeFemale: '< 20',
          normalRangePediatric: '< 10',
          normalRange: { min: 0, max: 20 },
        },
      ],
    },
    {
      name: 'CRP (C-Reactive Protein)',
      category: 'Immunology',
      description: 'Acute inflammation',
      price: 1200,
      sampleType: 'blood',
      fastingRequired: false,
      parameters: [
        {
          id: '',
          name: 'CRP',
          unit: 'mg/L',
          normalRangeMale: '< 5',
          normalRangeFemale: '< 5',
          normalRangePediatric: '< 5',
          normalRange: { min: 0, max: 5 },
        },
      ],
    },
    {
      name: 'HbA1c (Glycated Hemoglobin)',
      category: 'Biochemistry',
      description: '3-month diabetes control',
      price: 1600,
      sampleType: 'blood',
      fastingRequired: false,
      parameters: [
        {
          id: '',
          name: 'HbA1c',
          unit: '%',
          normalRangeMale: '< 5.7',
          normalRangeFemale: '< 5.7',
          normalRangePediatric: '< 5.7',
          normalRange: { min: 0, max: 5.7 },
        },
      ],
    },
    {
      name: 'Serum Electrolytes (Na, K, Cl)',
      category: 'Biochemistry',
      description: 'Sodium, Potassium, Chloride',
      price: 800,
      sampleType: 'blood',
      fastingRequired: false,
      parameters: [
        {
          id: '',
          name: 'Sodium',
          unit: 'mEq/L',
          normalRangeMale: '135–145',
          normalRangeFemale: '135–145',
          normalRangePediatric: '135–145',
          normalRange: { min: 135, max: 145 },
        },
      ],
    },
    {
      name: 'Uric Acid',
      category: 'Biochemistry',
      description: 'Gout evaluation',
      price: 400,
      sampleType: 'blood',
      fastingRequired: false,
      parameters: [
        {
          id: '',
          name: 'Uric Acid',
          unit: 'mg/dL',
          normalRangeMale: '3.4–7.0',
          normalRangeFemale: '2.4–6.0',
          normalRangePediatric: 'Varies',
          normalRange: { min: 2.4, max: 7.0 },
        },
      ],
    },
    {
      name: 'Vitamin D (25-OH)',
      category: 'Immunology',
      description: 'Vitamin D status',
      price: 2600,
      sampleType: 'blood',
      fastingRequired: false,
      parameters: [
        {
          id: '',
          name: 'Vitamin D (25-OH)',
          unit: 'ng/mL',
          normalRangeMale: '30–100',
          normalRangeFemale: '30–100',
          normalRangePediatric: '30–100',
          normalRange: { min: 30, max: 100 },
        },
      ],
    },
    {
      name: 'Vitamin B12',
      category: 'Biochemistry',
      description: 'Vitamin B12 level',
      price: 2000,
      sampleType: 'blood',
      fastingRequired: false,
      parameters: [
        {
          id: '',
          name: 'Vitamin B12',
          unit: 'pg/mL',
          normalRangeMale: '200–900',
          normalRangeFemale: '200–900',
          normalRangePediatric: '200–900',
          normalRange: { min: 200, max: 900 },
        },
      ],
    },
    {
      name: 'HBsAg (Screening)',
      category: 'Serology',
      description: 'Hepatitis B screening',
      price: 700,
      sampleType: 'blood',
      fastingRequired: false,
      parameters: [
        {
          id: '',
          name: 'HBsAg',
          unit: 'Reactive/Non-reactive',
          normalRangeMale: 'Non-reactive',
          normalRangeFemale: 'Non-reactive',
          normalRangePediatric: 'Non-reactive',
          normalRange: { min: 0, max: 0 },
        },
      ],
    },
    {
      name: 'Anti-HCV',
      category: 'Serology',
      description: 'Hepatitis C screening',
      price: 800,
      sampleType: 'blood',
      fastingRequired: false,
      parameters: [
        {
          id: '',
          name: 'Anti-HCV',
          unit: 'Reactive/Non-reactive',
          normalRangeMale: 'Non-reactive',
          normalRangeFemale: 'Non-reactive',
          normalRangePediatric: 'Non-reactive',
          normalRange: { min: 0, max: 0 },
        },
      ],
    },
    {
      name: 'HIV (Screening)',
      category: 'Serology',
      description: 'HIV screening test',
      price: 1000,
      sampleType: 'blood',
      fastingRequired: false,
      parameters: [
        {
          id: '',
          name: 'HIV',
          unit: 'Reactive/Non-reactive',
          normalRangeMale: 'Non-reactive',
          normalRangeFemale: 'Non-reactive',
          normalRangePediatric: 'Non-reactive',
          normalRange: { min: 0, max: 0 },
        },
      ],
    },
    {
      name: 'Dengue NS1 Antigen',
      category: 'Serology',
      description: 'Dengue NS1 antigen',
      price: 1200,
      sampleType: 'blood',
      fastingRequired: false,
      parameters: [
        {
          id: '',
          name: 'Dengue NS1',
          unit: 'Positive/Negative',
          normalRangeMale: 'Negative',
          normalRangeFemale: 'Negative',
          normalRangePediatric: 'Negative',
          normalRange: { min: 0, max: 0 },
        },
      ],
    },
    {
      name: 'Stool Routine Examination',
      category: 'Parasitology',
      description: 'Ova, cysts, occult blood',
      price: 300,
      sampleType: 'other',
      fastingRequired: false,
      parameters: [
        {
          id: '',
          name: 'Stool R/E',
          unit: 'Microscopy',
          normalRangeMale: 'None seen',
          normalRangeFemale: 'None seen',
          normalRangePediatric: 'None seen',
          normalRange: { min: 0, max: 0 },
        },
      ],
    },
  ];

  try {
    await Test.insertMany(tests);
    console.log('Seeded default tests successfully');
  } catch (err) {
    console.error('Failed to seed tests', err);
  } finally {
    process.exit(0);
  }
}

run();
