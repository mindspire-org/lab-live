import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return 'PKR ' + new Intl.NumberFormat('en-PK', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Formats a patient's Medical Record (MR) number based on a template.
 * @param serial The patient's unique serial number.
 * @param admissionDate The date of admission.
 * @returns A formatted MR number string.
 */
export function formatMrNumber(
  serial: number | string,
  admissionDate: Date | string
): string {
  const format = localStorage.getItem('mrNumberFormat') || '{HOSP}/{DEPT}/{YEAR}/{MONTH}/{SERIAL}';
  const hospitalCode = localStorage.getItem('hospitalCode') || 'HOSP';

  const date = new Date(admissionDate);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');

  // Ensure serial is a string and padded
  const formattedSerial = String(serial).padStart(4, '0');

  return format
    .replace('{HOSP}', hospitalCode)
    .replace('{DEPT}', 'IPD') // Assuming IPD for this context
    .replace('{YEAR}', String(year))
    .replace('{MONTH}', month)
    .replace('{SERIAL}', formattedSerial);
}
