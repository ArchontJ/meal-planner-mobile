// Turns a parsed import and the user's choices in the wizard into a recipe to save.
import type { ImportedIngredient, RecipeImport } from "@/features/recipes/import/format";
import { gramsFromUnit } from "@/features/recipes/import/units";

/** Same limits as the recipe editor and the normalize_recipe trigger. */
export const MAX_TAGS = 20;
export const MAX_TAG_LENGTH = 40;
export const MAX_PORTION_GRAMS = 5000;

export type LineChoice<P> =
  | { kind: "open" } // not decided yet
  | { kind: "product"; product: P }
  | { kind: "skip" }; // saved as "Do uzupełnienia"

export type ImportLine<P> = {
  key: string;
  source: ImportedIngredient;
  /** No amount at all ("sól do smaku"): goes into the instructions, not the ingredients. */
  toTaste: boolean;
  /** Grams for the whole recipe from the JSON or the unit table; null = unknown. */
  totalGrams: number | null;
  /** Grams per portion typed by the user; null = computed from totalGrams. */
  portionGrams: number | null;
  choice: LineChoice<P>;
  /** Best guess for an open line, confirmed with one click. */
  suggestion: P | null;
};

export type PendingIngredient = { original: string; name: string; grams: number | null };

export function initialLines<P>(recipe: RecipeImport, makeKey: () => string): ImportLine<P>[] {
  return recipe.ingredients.map((source) => {
    const totalGrams = source.grams ?? gramsFromUnit(source.amount, source.unit, source.name);
    return {
      key: makeKey(),
      source,
      toTaste: totalGrams === null && source.amount === null,
      totalGrams,
      portionGrams: null,
      choice: { kind: "open" },
      suggestion: null,
    };
  });
}

/**
 * Grams per portion, rounded to 0.1 g like the database; null when unknown. A
 * computed amount never rounds down to 0 (a pinch of a big total); a typed one may.
 */
export function linePortionGrams(line: ImportLine<unknown>, servings: number): number | null {
  if (line.portionGrams !== null) return Math.round(line.portionGrams * 10) / 10;
  if (line.totalGrams === null || !Number.isFinite(line.totalGrams)) return null;
  return Math.max(0.1, Math.round((line.totalGrams / servings) * 10) / 10);
}

export const portionGramsValid = (grams: number | null) => grams !== null && grams > 0 && grams <= MAX_PORTION_GRAMS;

/** What still stops saving: undecided lines, and chosen products without valid grams. */
export function lineProblems(lines: ImportLine<unknown>[], servings: number) {
  const active = lines.filter((l) => !l.toTaste);
  return {
    open: active.filter((l) => l.choice.kind === "open").length,
    badGrams: active.filter((l) => l.choice.kind === "product" && !portionGramsValid(linePortionGrams(l, servings))).length,
  };
}

/** Trimmed, lowercase, unique tags within the limits; `dropped` = how many were left out. */
export function normalizeTags(tags: string[]): { tags: string[]; dropped: number } {
  const unique = [...new Set(tags.map((t) => t.trim().toLocaleLowerCase("pl")).filter(Boolean))];
  const fitting = unique.filter((t) => t.length <= MAX_TAG_LENGTH);
  const kept = fitting.slice(0, MAX_TAGS);
  return { tags: kept, dropped: unique.length - kept.length };
}

/** Meal keys → the user's meal slot ids; `unknown` = keys with no matching slot. */
export function mapMeals(keys: string[], slots: { id: string; default_key: string | null }[]) {
  const slotIds: string[] = [];
  const unknown: string[] = [];
  for (const key of new Set(keys)) {
    const slot = slots.find((s) => s.default_key === key);
    if (slot) slotIds.push(slot.id);
    else unknown.push(key);
  }
  return { slotIds, unknown };
}

/** Instructions as Markdown: a "to taste" line, then the numbered steps. */
export function buildInstructions(steps: string[], toTaste: string[], toTasteLabel: string): string {
  const parts: string[] = [];
  if (toTaste.length > 0) parts.push(`${toTasteLabel}: ${toTaste.join(", ")}.`);
  parts.push(steps.map((s, i) => `${i + 1}. ${s.replace(/\s*\n\s*/g, " ")}`).join("\n"));
  return parts.join("\n\n");
}

/**
 * Ingredients and pending lines to save. Two lines with the same product are
 * merged (their grams add up), in the order the product first appears.
 */
export function buildIngredients<P extends { id: string }>(lines: ImportLine<P>[], servings: number) {
  const ingredients: { product: P; grams: number }[] = [];
  const pending: PendingIngredient[] = [];
  for (const line of lines) {
    if (line.toTaste) continue;
    const grams = linePortionGrams(line, servings);
    if (line.choice.kind === "product") {
      const product = line.choice.product;
      const existing = ingredients.find((i) => i.product.id === product.id);
      if (existing) existing.grams = Math.round((existing.grams + (grams ?? 0)) * 10) / 10;
      else ingredients.push({ product, grams: grams ?? 0 });
    } else if (line.choice.kind === "skip") {
      pending.push({ original: line.source.original, name: line.source.name, grams });
    }
  }
  return { ingredients, pending };
}
