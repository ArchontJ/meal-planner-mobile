// Locale-aware numbers for display: Polish uses a decimal comma (1,5).
const locale = (language: string) => (language === "pl" ? "pl-PL" : "en-GB");

export function formatNumber(value: number, language: string, maxFractionDigits = 1): string {
  return new Intl.NumberFormat(locale(language), { maximumFractionDigits: maxFractionDigits }).format(value);
}

/** Grams rounded to 1 decimal, e.g. "150 g", "12,5 g". */
export function formatGramsLabel(value: number, language: string): string {
  return `${formatNumber(value, language, 1)} g`;
}

/** "12,5" or "12.5" → 12.5; empty or not a number → NaN. */
export function parseDecimal(text: string): number {
  const v = text.trim().replace(",", ".");
  return v === "" || !/^\d*\.?\d+$|^\d+\.$/.test(v) ? NaN : Number(v);
}
