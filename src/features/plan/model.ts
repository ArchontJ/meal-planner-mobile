// Shared with the mobile app – keep free of React, DOM and Tauri imports.
import {
  productMacros,
  recipePortionMacros,
  scaleMacros,
  sumMacros,
  type Macros,
  type ProductNutrition,
} from "@/lib/nutrition";

// Shape returned by the meals query (see api.ts) – kept loose so it can be built in tests.
export type MealRow = {
  id: string;
  date: string;
  slot_id: string;
  meal_items: {
    id: string;
    position: number;
    grams: number | null;
    portions: number | null;
    product: (ProductNutrition & { id: string; name: string; producer: string | null; archived_at: string | null }) | null;
    recipe: {
      id: string;
      name: string;
      archived_at: string | null;
      instructions: string | null;
      serve_with: string | null;
      source?: string | null;
      pending_ingredients?: unknown;
      recipe_ingredients: { grams: number; position: number; product: ProductNutrition & { name: string } }[];
    } | null;
  }[];
};

export type PlanItem =
  | {
      kind: "product";
      id: string;
      position: number;
      productId: string;
      name: string;
      producer: string | null;
      grams: number;
      archived: boolean;
      macros: Macros;
    }
  | {
      kind: "recipe";
      id: string;
      position: number;
      recipeId: string;
      name: string;
      portions: number;
      archived: boolean;
      /** Ingredient amounts already multiplied by the portions. */
      ingredients: { name: string; grams: number }[];
      instructions: string | null;
      serveWith: string | null;
      source: string | null;
      /** Lines skipped when importing ("Do uzupełnienia"): not in the macros. Grams × portions. */
      pending: PendingIngredient[];
      macros: Macros;
    };

/** An imported ingredient line without a product yet (recipes.pending_ingredients). Grams per portion. */
export type PendingIngredient = { original: string; name: string; grams: number | null };

/** Reads recipes.pending_ingredients (jsonb), skipping anything malformed. */
export function parsePending(value: unknown): PendingIngredient[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((x): PendingIngredient[] => {
    if (typeof x !== "object" || x === null) return [];
    const { original, name, grams } = x as Record<string, unknown>;
    if (typeof original !== "string") return [];
    return [{ original, name: typeof name === "string" ? name : original, grams: typeof grams === "number" ? grams : null }];
  });
}

export type PlanMeal = { id: string; date: string; slotId: string; items: PlanItem[]; macros: Macros };

export function toPlanMeal(row: MealRow): PlanMeal {
  const items: PlanItem[] = [...row.meal_items]
    .sort((a, b) => a.position - b.position)
    .flatMap((i): PlanItem[] => {
      if (i.product && i.grams !== null) {
        return [
          {
            kind: "product",
            id: i.id,
            position: i.position,
            productId: i.product.id,
            name: i.product.name,
            producer: i.product.producer,
            grams: i.grams,
            archived: i.product.archived_at !== null,
            macros: productMacros(i.product, i.grams),
          },
        ];
      }
      if (i.recipe && i.portions !== null) {
        const ingredients = [...i.recipe.recipe_ingredients].sort((a, b) => a.position - b.position);
        return [
          {
            kind: "recipe",
            id: i.id,
            position: i.position,
            recipeId: i.recipe.id,
            name: i.recipe.name,
            portions: i.portions,
            archived: i.recipe.archived_at !== null,
            ingredients: ingredients.map((ing) => ({ name: ing.product.name, grams: ing.grams * i.portions! })),
            instructions: i.recipe.instructions,
            serveWith: i.recipe.serve_with,
            source: i.recipe.source ?? null,
            pending: parsePending(i.recipe.pending_ingredients).map((p) => ({
              ...p,
              grams: p.grams === null ? null : p.grams * i.portions!,
            })),
            macros: scaleMacros(recipePortionMacros({ ingredients }), i.portions),
          },
        ];
      }
      return []; // a referenced row is not visible (should not happen with valid data)
    });

  return { id: row.id, date: row.date, slotId: row.slot_id, items, macros: sumMacros(items.map((i) => i.macros)) };
}

export function dayMacros(meals: PlanMeal[]): Macros {
  return sumMacros(meals.map((m) => m.macros));
}
