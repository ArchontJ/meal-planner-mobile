// Shared with the mobile app – keep free of React, DOM and Tauri imports.
// Pure macro calculations. Product values are per 100 g, recipe ingredients are
// grams for ONE portion, recipe items in meals are portion multipliers.
// Values stay unrounded; round only for display (see formatKcal / formatGrams).

export type Macros = {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
};

export type ProductNutrition = Macros; // per 100 g

export type RecipeForMacros = {
  ingredients: { product: ProductNutrition; grams: number }[];
};

export type MealItemForMacros =
  | { product: ProductNutrition; grams: number }
  | { recipe: RecipeForMacros; portions: number };

export const ZERO_MACROS: Macros = { kcal: 0, protein: 0, fat: 0, carbs: 0 };

export function addMacros(a: Macros, b: Macros): Macros {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    fat: a.fat + b.fat,
    carbs: a.carbs + b.carbs,
  };
}

export function scaleMacros(m: Macros, factor: number): Macros {
  return {
    kcal: m.kcal * factor,
    protein: m.protein * factor,
    fat: m.fat * factor,
    carbs: m.carbs * factor,
  };
}

export function sumMacros(list: Macros[]): Macros {
  return list.reduce(addMacros, ZERO_MACROS);
}

export function productMacros(product: ProductNutrition, grams: number): Macros {
  return scaleMacros(product, grams / 100);
}

export function recipePortionMacros(recipe: RecipeForMacros): Macros {
  return sumMacros(recipe.ingredients.map((i) => productMacros(i.product, i.grams)));
}

export function recipePortionGrams(recipe: RecipeForMacros): number {
  return recipe.ingredients.reduce((sum, i) => sum + i.grams, 0);
}

export function mealItemMacros(item: MealItemForMacros): Macros {
  if ("product" in item) return productMacros(item.product, item.grams);
  return scaleMacros(recipePortionMacros(item.recipe), item.portions);
}

export function mealMacros(items: MealItemForMacros[]): Macros {
  return sumMacros(items.map(mealItemMacros));
}

/** kcal implied by macros (Atwater factors 4 / 9 / 4). */
export function kcalFromMacros(m: Pick<Macros, "protein" | "fat" | "carbs">): number {
  return m.protein * 4 + m.fat * 9 + m.carbs * 4;
}

export function formatKcal(value: number): string {
  return Math.round(value).toString();
}

export function formatGrams(value: number): string {
  return (Math.round(value * 10) / 10).toString();
}
