import type { TFunction } from "i18next";
import type { Tables } from "@/types/database";

/** Custom name if the user renamed it, otherwise the translated default. */
export function mealSlotLabel(slot: Pick<Tables<"meal_slots">, "name" | "default_key">, t: TFunction): string {
  return slot.name ?? t(`mealSlots.${slot.default_key}`);
}

export function productCategoryLabel(
  category: Pick<Tables<"product_categories">, "name" | "name_en">,
  language: string,
): string {
  return language === "en" && category.name_en ? category.name_en : category.name;
}
