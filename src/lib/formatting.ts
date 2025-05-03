/**
 * Formats a number as currency based on the specified currency code.
 *
 * @param amount The numeric amount to format.
 * @param currencyCode The currency code ('INR' or 'USD').
 * @returns The formatted currency string.
 */
export function formatCurrency(amount: number, currencyCode: 'INR' | 'USD'): string {
  const locale = currencyCode === 'INR' ? 'en-IN' : 'en-US';
  const minimumFractionDigits = currencyCode === 'INR' ? 0 : 2; // INR often doesn't use decimals

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: minimumFractionDigits,
    maximumFractionDigits: 2,
  }).format(amount);
}
