// Grams for kitchen units, used only when the imported line has no grams estimate.
// Rough values for an average ingredient; the wizard shows them for checking.
import { normalizeSearch } from "@/lib/search";

/** Unit stems (normalized, no diacritics) → grams per unit. Longer stems first. */
const UNIT_GRAMS: [stem: string, grams: number][] = [
  ["lyzeczk", 5],
  ["lyzecz", 5],
  ["lyzk", 15],
  ["lyz", 15],
  ["szklan", 250],
  ["kubek", 250],
  ["kubk", 250],
  ["filizank", 200],
  ["garsc", 30],
  ["plaster", 15],
  ["zabek", 5],
  ["zabk", 5],
  ["zab", 5],
  ["litr", 1000],
  ["gram", 1],
  ["dkg", 10],
  ["dag", 10],
  ["kg", 1000],
  ["ml", 1],
  ["l", 1000],
  ["g", 1],
];

/** Units that mean "the item itself", resolved by the ingredient name. */
const PIECE_UNITS = ["szt", "sztuk", "sztuka", "sztuki", "pc", "pcs", "piece", "pieces", ""];

const PIECE_GRAMS: [stem: string, grams: number][] = [
  ["jajk", 55],
  ["jaj", 55],
  ["cebul", 110],
  ["marchew", 80],
  ["marchw", 80],
  ["ziemniak", 120],
  ["pomidor", 150],
  ["ogorek", 120],
  ["ogork", 120],
  ["papryk", 150],
  ["jablk", 180],
  ["banan", 120],
  ["cytryn", 100],
  ["awokado", 200],
  ["czosn", 5],
];

const normalizeUnit = (unit: string) => normalizeSearch(unit).replace(/[.\s]/g, "");

/** Grams for `amount` × `unit` of `name`, or null when the unit is unknown. */
export function gramsFromUnit(amount: number | null, unit: string | null, name: string): number | null {
  if (amount === null || amount <= 0) return null;
  const u = normalizeUnit(unit ?? "");

  if (PIECE_UNITS.includes(u)) {
    const n = normalizeSearch(name);
    const piece = PIECE_GRAMS.find(([stem]) => n.startsWith(stem) || n.includes(` ${stem}`));
    return piece ? amount * piece[1] : null;
  }
  // Exact match for short units ("g", "l", "kg", "ml"), stem match for words.
  const hit = UNIT_GRAMS.find(([stem]) => (stem.length <= 3 ? u === stem : u.startsWith(stem)));
  return hit ? amount * hit[1] : null;
}
