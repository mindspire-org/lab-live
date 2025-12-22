// Utility to format currency in PKR style
export function formatCurrencyPKR(amount: number): string {
  return '₨' + amount.toLocaleString('en-PK', { minimumFractionDigits: 0 });
}
