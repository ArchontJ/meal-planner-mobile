// Open Food Facts → Meal Planner product mapping. Pure functions, no imports
// (loaded by Deno in the Edge Function and by Vitest in the app).

export const SYSTEM_CATEGORY_KEYS = [
  "sauces_spices",
  "grains",
  "canned",
  "fats",
  "dairy",
  "meat_fish",
  "fruit_veg",
  "sweets",
  "frozen",
  "other",
] as const;
export type SystemCategoryKey = (typeof SYSTEM_CATEGORY_KEYS)[number];

export type OffProduct = {
  product_name?: string;
  product_name_pl?: string;
  generic_name?: string;
  brands?: string;
  categories_tags?: string[];
  nutriments?: Record<string, number | string | undefined>;
};

export type MappedProduct = {
  ean: string;
  name: string | null;
  producer: string | null;
  kcal: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  off_categories: string[];
};

const KJ_PER_KCAL = 4.184;

function num(value: number | string | undefined): number | null {
  if (value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : null;
}

function text(value: string | undefined): string | null {
  const s = value?.trim();
  return s ? s : null;
}

export function mapOffProduct(ean: string, p: OffProduct): MappedProduct {
  const n = p.nutriments ?? {};
  const kcal = num(n["energy-kcal_100g"]) ?? (num(n["energy_100g"]) !== null ? num(Number(n["energy_100g"]) / KJ_PER_KCAL) : null);

  return {
    ean,
    name: text(p.product_name_pl) ?? text(p.product_name) ?? text(p.generic_name),
    producer: text(p.brands?.split(",")[0]),
    kcal,
    protein: num(n["proteins_100g"]),
    fat: num(n["fat_100g"]),
    carbs: num(n["carbohydrates_100g"]),
    off_categories: p.categories_tags ?? [],
  };
}

/** True when the product can go into the shared catalog without manual input. */
export function isComplete(m: MappedProduct): boolean {
  return m.name !== null && m.kcal !== null && m.protein !== null && m.fat !== null && m.carbs !== null;
}

// First matching rule wins: storage type (frozen, canned) before food group,
// and specific groups (fats, sweets, sauces) before broad ones (dairy, grains).
const CATEGORY_RULES: [SystemCategoryKey, string[]][] = [
  ["frozen", ["en:frozen-foods"]],
  ["canned", ["en:canned-foods"]],
  ["fats", ["en:fats", "en:vegetable-oils", "en:olive-oils", "en:butters", "en:margarines"]],
  ["sweets", ["en:sweet-snacks", "en:chocolates", "en:confectioneries", "en:candies", "en:biscuits-and-cakes", "en:sweet-spreads"]],
  ["sauces_spices", ["en:sauces", "en:condiments", "en:spices", "en:herbs", "en:salts", "en:ketchup", "en:mustards", "en:mayonnaises"]],
  ["dairy", ["en:dairies", "en:milks", "en:cheeses", "en:yogurts", "en:eggs"]],
  ["meat_fish", ["en:meats", "en:fishes", "en:seafood", "en:meat-alternatives", "en:poultries", "en:sausages", "en:tofu"]],
  ["grains", ["en:cereals-and-potatoes", "en:cereals-and-their-products", "en:breads", "en:pastas", "en:rices", "en:breakfast-cereals", "en:flours"]],
  ["fruit_veg", ["en:fruits", "en:vegetables", "en:fruits-and-vegetables-based-foods", "en:legumes", "en:nuts"]],
];

export function suggestCategoryKey(tags: string[]): SystemCategoryKey | null {
  const set = new Set(tags);
  for (const [key, ruleTags] of CATEGORY_RULES) {
    if (ruleTags.some((t) => set.has(t))) return key;
  }
  return null;
}
