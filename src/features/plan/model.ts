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
      macros: Macros;
    };

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
