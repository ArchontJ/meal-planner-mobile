// Shared with the mobile app – keep free of React, DOM and Tauri imports.
// Shopping list maths (docs/PLAN.md 4.5): expand recipes into ingredients
// (× portions), sum grams per product, group by product category.

export type SourceProduct = { id: string; name: string; producer: string | null; category_id: string };

export type SourceItem = {
  grams: number | null;
  portions: number | null;
  product: SourceProduct | null;
  recipe: { ingredients: { grams: number; product: SourceProduct }[] } | null;
};

export type SourceMeal = { id: string; date: string; slotId: string; items: SourceItem[] };

export type ShoppingItem = {
  productId: string;
  name: string;
  producer: string | null;
  categoryId: string;
  /** Category name at generation time, so a saved list still reads well offline. */
  categoryName: string;
  grams: number;
  bought: boolean;
};

export type CategoryInfo = { id: string; name: string; order: number };

/**
 * @param persons people sharing the plan (profile.household_size); every amount is
 *   multiplied by it. The plan itself is per person.
 */
export function aggregateShopping(
  meals: SourceMeal[],
  excludedMealIds: ReadonlySet<string>,
  categories: ReadonlyMap<string, CategoryInfo>,
  persons = 1,
): ShoppingItem[] {
  const byProduct = new Map<string, ShoppingItem>();

  const add = (product: SourceProduct, perPerson: number) => {
    const grams = perPerson * persons;
    if (!(grams > 0)) return;
    const existing = byProduct.get(product.id);
    if (existing) {
      existing.grams += grams;
      return;
    }
    byProduct.set(product.id, {
      productId: product.id,
      name: product.name,
      producer: product.producer,
      categoryId: product.category_id,
      categoryName: categories.get(product.category_id)?.name ?? "",
      grams,
      bought: false,
    });
  };

  for (const meal of meals) {
    if (excludedMealIds.has(meal.id)) continue;
    for (const item of meal.items) {
      if (item.product && item.grams !== null) add(item.product, item.grams);
      if (item.recipe && item.portions !== null) {
        for (const ing of item.recipe.ingredients) add(ing.product, ing.grams * item.portions);
      }
    }
  }

  return sortShoppingItems([...byProduct.values()], categories);
}

/** Category order (fixed categories first, as in Settings), then name. */
export function sortShoppingItems(items: ShoppingItem[], categories: ReadonlyMap<string, CategoryInfo>): ShoppingItem[] {
  const order = (id: string) => categories.get(id)?.order ?? Number.MAX_SAFE_INTEGER;
  return items.sort(
    (a, b) =>
      order(a.categoryId) - order(b.categoryId) ||
      a.categoryName.localeCompare(b.categoryName, "pl") ||
      a.name.localeCompare(b.name, "pl"),
  );
}

/** Recompute items but keep the "bought" ticks of products that are still on the list. */
export function refreshItems(previous: ShoppingItem[], next: ShoppingItem[]): ShoppingItem[] {
  const bought = new Set(previous.filter((i) => i.bought).map((i) => i.productId));
  return next.map((i) => ({ ...i, bought: bought.has(i.productId) }));
}

/** Plain-text version for the clipboard, grouped by category. */
export function shoppingListText(items: ShoppingItem[], formatAmount: (grams: number) => string): string {
  const lines: string[] = [];
  let category: string | null = null;
  for (const item of items) {
    if (item.categoryName !== category) {
      if (category !== null) lines.push("");
      category = item.categoryName;
      lines.push(`${category}:`);
    }
    const producer = item.producer ? ` (${item.producer})` : "";
    lines.push(`${item.bought ? "[x]" : "[ ]"} ${item.name}${producer} – ${formatAmount(item.grams)}`);
  }
  return lines.join("\n");
}

/**
 * For pasting into a Google Keep checklist: Keep turns every line into a list
 * item, so this is one product per line, no headings (they would become items),
 * only products not yet bought, in the given (shop) order.
 */
export function googleKeepText(items: ShoppingItem[], formatAmount: (grams: number) => string): string {
  return items
    .filter((i) => !i.bought)
    .map((i) => `${i.name}${i.producer ? ` (${i.producer})` : ""} – ${formatAmount(i.grams)}`)
    .join("\n");
}

/** 850 → "850 g", 1250 → "1,25 kg" (Polish) / "1.25 kg". */
export function formatAmount(grams: number, language: string): string {
  const locale = language === "pl" ? "pl-PL" : "en-GB";
  if (grams >= 1000) {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(grams / 1000)} kg`;
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.ceil(grams))} g`;
}
