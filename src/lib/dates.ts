// Shared with the mobile app – keep free of React, DOM and Tauri imports.
// Calendar dates as "YYYY-MM-DD" strings in local time (what Postgres `date` stores).
// Never go through toISOString(): it converts to UTC and can shift the day.

export type ISODate = string;

export function toISODate(d: Date): ISODate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromISODate(s: ISODate): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

export function isISODate(s: string | null | undefined): s is ISODate {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return toISODate(fromISODate(s)) === s;
}

export function today(): ISODate {
  return toISODate(new Date());
}

export function addDays(s: ISODate, days: number): ISODate {
  const d = fromISODate(s);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Monday of the week containing the date. */
export function startOfWeek(s: ISODate): ISODate {
  const d = fromISODate(s);
  const offset = (d.getDay() + 6) % 7; // Monday = 0
  return addDays(s, -offset);
}

export function weekDays(s: ISODate): ISODate[] {
  const monday = startOfWeek(s);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function formatDate(s: ISODate, language: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(language === "pl" ? "pl-PL" : "en-GB", options).format(fromISODate(s));
}
