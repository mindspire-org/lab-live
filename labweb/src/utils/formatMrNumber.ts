// Utility to format MR number using admin settings format string from localStorage
// Usage: formatMrNumber({ hospitalCode, deptCode, year, month, serial }, formatString)

export interface MrNumberParts {
  hospitalCode: string;
  deptCode: string;
  year: string;
  month: string;
  serial: string;
}

export function formatMrNumber(
  parts: MrNumberParts,
  formatString?: string
): string {
  const format =
    formatString ||
    localStorage.getItem('mrNumberFormat') ||
    '{HOSP}/{DEPT}/{YEAR}/{MONTH}/{SERIAL}';
  return format
    .replace('{HOSP}', parts.hospitalCode)
    .replace('{DEPT}', parts.deptCode)
    .replace('{YEAR}', parts.year)
    .replace('{MONTH}', parts.month)
    .replace('{SERIAL}', parts.serial);
}

// Parse an MR string like SAFH/IPD/25/08/00123
export function parseMrNumber(mr: string) {
  const parts = mr.split('/');
  if (parts.length < 5) return null;
  return {
    hospitalCode: parts[0],
    deptCode: parts[1],
    year: parts[2],
    month: parts[3],
    serial: parts[4],
  };
}
