import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { toPlanMeal, type MealRow, type PlanMeal } from "@/features/plan/model";
import { useAuth } from "@/lib/auth";
import type { ISODate } from "@/lib/dates";
import { supabase } from "@/lib/supabase";

// Same select as the desktop's plan api, so toPlanMeal (shared) builds the same meals.
const MEAL_SELECT = `
  id, date, slot_id,
  meal_items(
    id, position, grams, portions,
    product:products(id, name, producer, kcal, protein, fat, carbs, archived_at),
    recipe:recipes(
      id, name, archived_at, instructions, serve_with,
      recipe_ingredients(grams, position, product:products(name, kcal, protein, fat, carbs))
    )
  )`;

/** Meals in [from, to] (inclusive); the Plan screen asks for whole weeks (Monday–Sunday). */
export const mealsRangeOptions = (userId: string | undefined, from: ISODate, to: ISODate) =>
  queryOptions({
    queryKey: ["meals", userId, from, to],
    enabled: Boolean(userId),
    queryFn: async (): Promise<PlanMeal[]> => {
      const { data, error } = await supabase.from("meals").select(MEAL_SELECT).gte("date", from).lte("date", to);
      if (error) throw error;
      return (data as unknown as MealRow[]).map(toPlanMeal);
    },
  });

export function useMealsRange(from: ISODate, to: ISODate) {
  const userId = useAuth((s) => s.session?.user.id);
  return useQuery(mealsRangeOptions(userId, from, to));
}

/** Meal slots in plan order (hidden ones included). */
export const mealSlotsOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["meal_slots", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.from("meal_slots").select("*").order("position");
      if (error) throw error;
      return data;
    },
  });

export function useMealSlots() {
  const userId = useAuth((s) => s.session?.user.id);
  return useQuery(mealSlotsOptions(userId));
}

/** One planned meal (cooking view); starts from the plan already loaded, then refreshes. */
export function useMeal(id: string) {
  const userId = useAuth((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["meal", userId, id],
    enabled: Boolean(userId),
    initialData: () =>
      queryClient
        .getQueriesData<PlanMeal[]>({ queryKey: ["meals", userId] })
        .flatMap(([, meals]) => meals ?? [])
        .find((m) => m.id === id),
    initialDataUpdatedAt: 0,
    queryFn: async (): Promise<PlanMeal> => {
      const { data, error } = await supabase.from("meals").select(MEAL_SELECT).eq("id", id).single();
      if (error) throw error;
      return toPlanMeal(data as unknown as MealRow);
    },
  });
}
