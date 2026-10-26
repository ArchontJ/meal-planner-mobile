// Suggests a product for an imported ingredient name ("twaróg półtłusty").
import { normalizeSearch } from "@/lib/search";

/** Words without Polish endings, so "twarogu" and "twaróg" both give "twar". */
function stem(word: string): string {
  return word.length > 5 ? word.slice(0, word.length - 2) : word.length > 3 ? word.slice(0, word.length - 1) : word;
}

const words = (s: string) => normalizeSearch(s).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1);

/**
 * How well a product name fits the ingredient name: the share of ingredient words
 * found (by stem) in the product name, with the first word required. 0 = no fit.
 */
export function matchScore(ingredientName: string, productName: string): number {
  const wanted = words(ingredientName);
  const have = words(productName);
  if (wanted.length === 0 || have.length === 0) return 0;

  const found = (w: string) => have.some((h) => h.startsWith(stem(w)) || w.startsWith(stem(h)));
  if (!found(wanted[0]!)) return 0;
  const share = wanted.filter(found).length / wanted.length;
  // Prefer names without many extra words ("Mleko" over "Mleko kokosowe w proszku").
  const extra = Math.max(0, have.length - wanted.length);
  return share - extra * 0.01;
}

/** The best product for the name, or null when none fits (all words must match for a suggestion). */
export function suggestProduct<T extends { name: string }>(ingredientName: string, products: T[]): T | null {
  let best: T | null = null;
  let bestScore = 0;
  for (const p of products) {
    const score = matchScore(ingredientName, p.name);
    if (score > bestScore) {
      best = p;
      bestScore = score;
    }
  }
  return bestScore >= 0.9 ? best : null;
}

/**
 * Stems for a catalog query (the first word of each name), e.g. ["twar", "rzodkiew"].
 * They keep Polish letters: the database search (ilike) does not ignore them.
 */
export function searchStems(names: string[]): string[] {
  const out = new Set<string>();
  for (const name of names) {
    const first = name.toLocaleLowerCase("pl").split(/[^\p{L}\p{N}]+/u).find((w) => w.length > 1);
    if (first) out.add(stem(first));
  }
  return [...out];
}
