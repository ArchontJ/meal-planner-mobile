import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { orderCategories } from "@/features/products/categoryOrder";
import { useProfile } from "@/features/profile/api";
import type { CategoryInfo, SourceMeal } from "@/features/shopping/aggregate";
import { useAuth } from "@/lib/auth";
import type { ISODate } from "@/lib/dates";
import { productCategoryLabel } from "@/lib/labels";
import { supabase } from "@/lib/supabase";

// Same queries as the desktop's shopping api, so lists add up to the same amounts.

type Row = {
  id: string;
  date: string;
  slot_id: string;
  meal_items: {
    position: number;
    grams: number | null;
    portions: number | null;
    product: { id: string; name: string; producer: string | null; category_id: string } | null;
    recipe: {
      name: string;
      recipe_ingredients: {
        grams: number;
        product: { id: string; name: string; producer: string | null; category_id: string };
      }[];
    } | null;
  }[];
};

export type ShoppingSourceMeal = SourceMeal & { itemNames: string[] };

/** Meals in [from, to] with the product data needed for a shopping list. */
export function useShoppingSource(from: ISODate, to: ISODate, enabled = true) {
  const userId = useAuth((s) => s.session?.user.id);
  return useQuery({
    queryKey: ["meals", userId, "shopping", from, to],
    enabled: Boolean(userId) && enabled && from <= to,
    queryFn: async (): Promise<ShoppingSourceMeal[]> => {
      const { data, error } = await supabase
        .from("meals")
        .select(
          `id, date, slot_id,
           meal_items(
             position, grams, portions,
             product:products(id, name, producer, category_id),
             recipe:recipes(name, recipe_ingredients(grams, product:products(id, name, producer, category_id)))
           )`,
        )
        .gte("date", from)
        .lte("date", to)
        .order("date");
      if (error) throw error;

      return (data as unknown as Row[])
        .map((m) => {
          const items = [...m.meal_items].sort((a, b) => a.position - b.position);
          return {
            id: m.id,
            date: m.date,
            slotId: m.slot_id,
            itemNames: items.map((i) => i.product?.name ?? i.recipe?.name ?? "?"),
            items: items.map((i) => ({
              grams: i.grams,
              portions: i.portions,
              product: i.product,
              recipe: i.recipe ? { ingredients: i.recipe.recipe_ingredients } : null,
            })),
          };
        })
        .filter((m) => m.items.length > 0);
    },
  });
}

/** Category names and the user's shop order (profile.category_order), as on the desktop. */
export function useCategoryInfo(): ReadonlyMap<string, CategoryInfo> {
  const { i18n } = useTranslation();
  const userId = useAuth((s) => s.session?.user.id);
  const { data: profile } = useProfile();
  const { data: categories = [] } = useQuery({
    queryKey: ["product_categories", userId],
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .order("user_id", { nullsFirst: true })
        .order("position")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
  return useMemo(() => {
    const ordered = orderCategories(categories, profile?.category_order ?? []);
    return new Map(ordered.map((c, index) => [c.id, { id: c.id, name: productCategoryLabel(c, i18n.language), order: index }]));
  }, [categories, profile?.category_order, i18n.language]);
}
