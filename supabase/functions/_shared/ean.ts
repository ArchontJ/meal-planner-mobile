// Shared by the app (src/lib/ean.ts) and the import-off-product Edge Function.
// Keep this file free of imports so both Vite and Deno can load it.

/** EAN-8, UPC-A (12), EAN-13 or GTIN-14 with a valid GS1 check digit. */
export function isValidEan(code: string): boolean {
  if (!/^(\d{8}|\d{12,14})$/.test(code)) return false;
  const digits = code.split("").map(Number);
  const check = digits.pop()!;
  // Weights 3,1,3,1… from the rightmost data digit.
  const sum = digits.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

/** Removes spaces and dashes users often type or paste. */
export function normalizeEan(input: string): string {
  return input.replace(/[\s-]/g, "");
}
