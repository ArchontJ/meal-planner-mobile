import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addToMyProducts, useInvalidateMyProducts } from "@/features/products/api";
import { searchStems } from "@/features/recipes/import/match";
import type { PendingIngredient } from "@/features/recipes/import/build";
import { spellings } from "@/features/recipeImport/layout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

/** A product an imported line can point at (macros per 100 g). */
export type PickProduct = {
  id: string;
  name: string;
  producer: string | null;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  /** A catalog product not yet in the user's list; it joins the list when the recipe is saved. */
  isCatalog: boolean;
};

type ProductRow = { id: string; name: string; producer: string | null; kcal: number; protein: number; fat: number; carbs: number };

export const toPick = (p: ProductRow, isCatalog: boolean): PickProduct => ({
  id: p.id,
  name: p.name,
  producer: p.producer,
  kcal: p.kcal,
  protein: p.protein,
  fat: p.fat,
  carbs: p.carbs,
  isCatalog,
});

const CATALOG_COLUMNS = "id, name, producer, kcal, protein, fat, carbs";

// PostgREST "or" filter: drop characters that have meaning in its syntax.
const safeTerm = (s: string) => s.replace(/[,()*%\\.:"]/g, " ").trim();


/**
 * Catalog products whose names contain the first word of any of the names, in one query
 * (same as the desktop wizard); the review then picks the best one per line.
 */
export function useCatalogCandidates(names: string[]) {
  const stems = searchStems(names.flatMap(spellings))
    .map(safeTerm)
    .filter((s) => s.length >= 2)
    .sort();
  return useQuery({
    queryKey: ["catalog_candidates", stems],
    enabled: stems.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(CATALOG_COLUMNS)
        .is("owner_id", null)
        .is("archived_at", null)
        .or(stems.map((s) => `name.ilike.*${s}*`).join(","))
        .limit(500);
      if (error) throw error;
      return data.map((p) => toPick(p, true));
    },
  });
}

/** Catalog products matching a name or producer (the ingredient sheet's search). */
export function useCatalogSearch(term: string) {
  const terms = spellings(safeTerm(term)).filter((s) => s.length >= 2);
  return useQuery({
    queryKey: ["catalog_search", terms],
    enabled: terms.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(CATALOG_COLUMNS)
        .is("owner_id", null)
        .is("archived_at", null)
        .or(terms.flatMap((s) => [`name.ilike.*${s}*`, `producer.ilike.*${s}*`]).join(","))
        .order("name")
        .limit(30);
      if (error) throw error;
      return data.map((p) => toPick(p, true));
    },
  });
}

export type NewProductInput = {
  name: string;
  producer: string | null;
  category_id: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
};

/** Creates a private product (no EAN – that stays on the desktop) and refreshes "my products". */
export function useCreatePrivateProduct() {
  const invalidate = useInvalidateMyProducts();
  return async (input: NewProductInput): Promise<PickProduct> => {
    const { data, error } = await supabase
      .from("products")
      .insert({ ...input, source: "manual" })
      .select(CATALOG_COLUMNS)
      .single();
    if (error) throw error;
    void invalidate();
    return toPick(data, false);
  };
}

export type ImportedRecipeInput = {
  name: string;
  instructions: string;
  tags: string[];
  slotIds: string[];
  source: string | null;
  ingredients: { product: PickProduct; grams: number }[];
  pending: PendingIngredient[];
};

/** Saves the recipe like the desktop import: catalog products picked here join the user's list first. */
export function useSaveImportedRecipe() {
  const userId = useAuth((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const invalidateProducts = useInvalidateMyProducts();
  return async (input: ImportedRecipeInput): Promise<string> => {
    const catalogIds = new Set(input.ingredients.filter((i) => i.product.isCatalog).map((i) => i.product.id));
    for (const id of catalogIds) await addToMyProducts(id);
    const { data, error } = await supabase.rpc("save_recipe", {
      // The function takes null for a new recipe and for empty texts; the generated types say string.
      p_id: null as unknown as string,
      p_name: input.name,
      p_instructions: input.instructions,
      p_serve_with: null as unknown as string,
      p_tags: input.tags,
      p_is_shared: false,
      p_slot_ids: input.slotIds,
      p_ingredients: input.ingredients.map((i) => ({ product_id: i.product.id, grams: i.grams })),
      p_source: input.source as string,
      p_pending_ingredients: input.pending,
    });
    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey: ["recipes", "list", userId] });
    if (catalogIds.size > 0) void invalidateProducts();
    return data;
  };
}
