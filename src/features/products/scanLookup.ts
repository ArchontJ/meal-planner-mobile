import { onlineManager } from "@tanstack/react-query";
import type { SystemCategoryKey } from "../../../supabase/functions/_shared/off";
import { fromProductRow, offPreview, type ScannedProduct } from "@/features/products/api";

export type ScanResult =
  | { kind: "mine"; product: ScannedProduct; justAdded?: boolean }
  | { kind: "catalog"; product: ScannedProduct }
  | { kind: "off"; product: ScannedProduct; suggestedCategoryKey: SystemCategoryKey | null }
  | { kind: "notFound"; ean: string; incomplete: boolean }
  | { kind: "offline"; ean: string }
  | { kind: "error"; ean: string; message: string };

type Known = Parameters<typeof fromProductRow>[0] & { ean: string | null };

/**
 * Same order as the desktop's "By EAN": the user's own products (works offline),
 * then the shared catalog and Open Food Facts through the import-off-product function.
 * Incomplete OFF data counts as not found – such products are added on the desktop.
 */
export async function lookupEan(ean: string, myProducts: Known[]): Promise<ScanResult> {
  const own = myProducts.find((p) => p.ean === ean);
  if (own) return { kind: "mine", product: fromProductRow(own, ean) };
  if (!onlineManager.isOnline()) return { kind: "offline", ean };

  try {
    const res = await offPreview(ean);
    if (res.status === "existing") return { kind: "catalog", product: fromProductRow(res.product, ean) };
    if (res.status === "preview") {
      const p = res.product;
      return {
        kind: "off",
        suggestedCategoryKey: res.suggestedCategoryKey,
        product: {
          id: null,
          ean,
          name: p.name ?? "",
          producer: p.producer,
          categoryId: null,
          kcal: p.kcal ?? 0,
          protein: p.protein ?? 0,
          fat: p.fat ?? 0,
          carbs: p.carbs ?? 0,
        },
      };
    }
    return { kind: "notFound", ean, incomplete: res.status === "partial" };
  } catch (e) {
    return { kind: "error", ean, message: e instanceof Error ? e.message : String(e) };
  }
}
