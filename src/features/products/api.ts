import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import type { MappedProduct, SystemCategoryKey } from "../../../supabase/functions/_shared/off";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

/** A product as the phone shows it after a scan (macros per 100 g). */
export type ScannedProduct = {
  id: string | null;
  ean: string;
  name: string;
  producer: string | null;
  categoryId: string | null;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
};

type MyProductRow = {
  id: string;
  name: string;
  producer: string | null;
  category_id: string;
  ean: string | null;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
};

const myProductsKey = (userId: string | undefined) => ["my_products", userId] as const;

/** The user's products (private + added catalog ones); cached so a scan of a known product works offline. */
export const myProductsOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: myProductsKey(userId),
    enabled: Boolean(userId),
    queryFn: async (): Promise<MyProductRow[]> => {
      const { data, error } = await supabase
        .from("my_products")
        .select("id, name, producer, category_id, ean, kcal, protein, fat, carbs");
      if (error) throw error;
      return data as MyProductRow[];
    },
  });

export function useMyProducts() {
  const userId = useAuth((s) => s.session?.user.id);
  return useQuery(myProductsOptions(userId));
}

export const fromProductRow = (p: MyProductRow | Omit<MyProductRow, "ean"> & { ean?: string | null }, ean: string): ScannedProduct => ({
  id: p.id,
  ean: p.ean ?? ean,
  name: p.name,
  producer: p.producer,
  categoryId: p.category_id,
  kcal: p.kcal,
  protein: p.protein,
  fat: p.fat,
  carbs: p.carbs,
});

// --- Edge Function import-off-product (same contract as the desktop) ---

export type OffPreviewResult =
  | { status: "existing"; product: MyProductRow }
  | { status: "preview" | "partial"; product: MappedProduct; suggestedCategoryKey: SystemCategoryKey | null }
  | { status: "not_found" };

async function invokeImport<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("import-off-product", { body });
  if (error) {
    // Surface the function's own error message instead of the generic one.
    if (error instanceof FunctionsHttpError) {
      const response = error.context as Response;
      const payload = await response.json().catch(() => null);
      const detail = payload?.error ?? payload?.message;
      throw new Error(detail ? `${detail} (HTTP ${response.status})` : `HTTP ${response.status}`);
    }
    throw error;
  }
  return data as T;
}

export const offPreview = (ean: string) => invokeImport<OffPreviewResult>({ mode: "preview", ean });

/** Adds a catalog product to the user's list (no-op if it is already there). */
export async function addToMyProducts(productId: string) {
  const { error } = await supabase
    .from("user_products")
    .upsert({ product_id: productId }, { onConflict: "user_id,product_id", ignoreDuplicates: true });
  if (error) throw error;
}

/** Imports an Open Food Facts product into the catalog and the user's list (server re-fetches OFF). */
export const importFromOff = (ean: string, categoryKey: SystemCategoryKey, name?: string) =>
  invokeImport<{ status: "imported"; product: MyProductRow }>({ mode: "import", ean, categoryKey, name });

export function useInvalidateMyProducts() {
  const userId = useAuth((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: myProductsKey(userId) });
}
