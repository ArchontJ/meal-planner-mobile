// The review screen's state: the read recipe plus the user's choices, on top of the
// desktop import rules (build.ts). Suggestions are accepted by default here (the
// desktop asks for a click), so a matched line starts as a chosen product.
import type { PickProduct } from "@/features/recipeImport/api";
import { spellings } from "@/features/recipeImport/layout";
import {
  buildIngredients,
  buildInstructions,
  initialLines,
  linePortionGrams,
  mapMeals,
  normalizeTags,
  portionGramsValid,
  type ImportLine,
} from "@/features/recipes/import/build";
import type { RecipeImport } from "@/features/recipes/import/format";
import { suggestProduct } from "@/features/recipes/import/match";

export type Line = ImportLine<PickProduct>;

export type Draft = {
  name: string;
  servings: number;
  source: string;
  tags: string[];
  slotIds: string[];
  lines: Line[];
  steps: string[];
};

export const MAX_SERVINGS = 100;

let nextKey = 0;
const makeKey = () => `line-${++nextKey}`;

export function initialDraft(recipe: RecipeImport, slots: { id: string; default_key: string | null }[]): Draft {
  return {
    name: recipe.name,
    servings: Math.min(MAX_SERVINGS, Math.max(1, Math.round(recipe.servings ?? 1))),
    source: recipe.source ?? "",
    tags: normalizeTags(recipe.tags).tags,
    slotIds: mapMeals(recipe.meals, slots).slotIds,
    lines: initialLines<PickProduct>(recipe, makeKey),
    steps: recipe.instructions,
  };
}

/** Best product for the name, also trying the OCR "t" → "ł" spelling ("masto" → "masło"). */
function bestMatch(name: string, products: PickProduct[]): PickProduct | null {
  for (const spelling of spellings(name)) {
    const hit = suggestProduct(spelling, products);
    if (hit) return hit;
  }
  return null;
}

/** Fills still-open lines with a matching product, marked as a suggestion. */
export function applySuggestions(lines: Line[], products: PickProduct[]): Line[] {
  let changed = false;
  const next = lines.map((l) => {
    if (l.toTaste || l.choice.kind !== "open") return l;
    const hit = bestMatch(l.source.name, products);
    if (!hit) return l;
    changed = true;
    return { ...l, choice: { kind: "product" as const, product: hit }, suggestion: hit };
  });
  return changed ? next : lines;
}

export type LineStatus = "chosen" | "suggested" | "open" | "pending" | "noGrams";

export function lineStatus(line: Line, servings: number): LineStatus {
  if (line.choice.kind === "skip") return "pending";
  if (line.choice.kind === "open") return "open";
  // A product without valid grams stops saving (desktop rule), so it says so.
  if (!portionGramsValid(linePortionGrams(line, servings))) return "noGrams";
  return line.suggestion?.id === line.choice.product.id ? "suggested" : "chosen";
}

export const choose = (line: Line, product: PickProduct): Line => ({ ...line, choice: { kind: "product", product }, suggestion: null });
export const skip = (line: Line): Line => ({ ...line, choice: { kind: "skip" }, suggestion: null });

export function draftProblems(draft: Draft) {
  const active = draft.lines.filter((l) => !l.toTaste);
  return {
    open: active.filter((l) => l.choice.kind === "open"),
    badGrams: active.filter((l) => l.choice.kind === "product" && !portionGramsValid(linePortionGrams(l, draft.servings))),
  };
}

/**
 * What gets saved. Open lines become "Do uzupełnienia" (the user confirmed that), lines
 * without an amount go into the instructions as "Do smaku", products are per 1 portion.
 */
export function buildRecipe(draft: Draft, toTasteLabel: string) {
  const lines = draft.lines.map((l) => (!l.toTaste && l.choice.kind === "open" ? skip(l) : l));
  const { ingredients, pending } = buildIngredients(lines, draft.servings);
  const toTaste = draft.lines.filter((l) => l.toTaste).map((l) => l.source.name);
  return {
    name: draft.name.trim(),
    instructions: buildInstructions(
      draft.steps.map((s) => s.trim()).filter(Boolean),
      toTaste,
      toTasteLabel,
    ),
    tags: normalizeTags(draft.tags).tags,
    slotIds: draft.slotIds,
    source: draft.source.trim() || null,
    ingredients,
    pending: pending.map((p) => ({ ...p, grams: p.grams !== null && Number.isFinite(p.grams) && p.grams > 0 ? p.grams : null })),
  };
}
