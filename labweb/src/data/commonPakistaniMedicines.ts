// Minimal common Pakistani medicines dataset used by generator
// Extend with your real master list when available
export interface CommonMedicineItem {
  name: string;
  genericName: string;
  manufacturer?: string;
  category?: string;
}

const commonPakistaniMedicines: CommonMedicineItem[] = [
  { name: 'Panadol 500mg', genericName: 'Paracetamol', manufacturer: 'GSK Pakistan', category: 'Analgesic' },
  { name: 'Augmentin 625mg', genericName: 'Amoxicillin + Clavulanic Acid', manufacturer: 'GSK Pakistan', category: 'Antibiotic' },
  { name: 'Flagyl 400mg', genericName: 'Metronidazole', manufacturer: 'Sanofi Aventis', category: 'Antibiotic' },
  { name: 'Brufen 400mg', genericName: 'Ibuprofen', manufacturer: 'Abbott', category: 'Analgesic' },
  { name: 'Cetirizine 10mg', genericName: 'Cetirizine', manufacturer: 'Getz Pharma', category: 'Antihistamine' },
  { name: 'Omep 20mg', genericName: 'Omeprazole', manufacturer: 'Sami Pharmaceuticals', category: 'Antacid' },
  { name: 'Amlo-Q 5mg', genericName: 'Amlodipine', manufacturer: 'PharmEvo', category: 'Antihypertensive' },
  { name: 'Azomax 500mg', genericName: 'Azithromycin', manufacturer: 'Getz Pharma', category: 'Antibiotic' },
  { name: 'Surbex-Z', genericName: 'Multivitamins + Zinc', manufacturer: 'Abbott', category: 'Vitamins' },
  { name: 'Glucophage 500mg', genericName: 'Metformin', manufacturer: 'Merck', category: 'Antidiabetic' },
];

export default commonPakistaniMedicines;
