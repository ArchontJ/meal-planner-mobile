import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { productMacros, sumMacros, type Macros } from "@/lib/nutrition";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database";

// Read-only subset of the desktop's recipes api, plus bookmarks on shared recipes.

export type RecipeListItem = {
  id: string;
  name: string;
  tags: string[];
  slotIds: string[];
  macros: Macros;
  updated_at: string;
};

export type RecipeDetail = {
  id: string;
  name: string;
  instructions: string | null;
  serve_with: string | null;
  tags: string[];
  slotIds: string[];
  ingredients: { name: string; grams: number; archived: boolean }[];
  /** Per 1 portion. */
  macros: Macros;
};

export type SharedRecipe = {
  id: string;
  author_id: string;
  author_name: string | null;
  author_avatar_url: string | null;
  name: string;
  instructions: string | null;
  serve_with: string | null;
  tags: string[];
  shared_at: string;
  /** Default keys of the meal slots the author assigned (custom slots are not exposed). */
  slot_keys: string[];
  macros: Macros;
};

export type SharedIngredient = {
  id: string;
  name: string;
  producer: string | null;
  grams: number;
  is_catalog: boolean;
};

const useUserId = () => useAuth((s) => s.session?.user.id);

export function useMyRecipes() {
  const userId = useUserId();
  return useQuery(myRecipesOptions(userId));
}

export const myRecipesOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["recipes", "list", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<RecipeListItem[]> => {
      const [recipes, macros] = await Promise.all([
        supabase
          .from("recipes")
          .select("id, name, tags, updated_at, recipe_meal_slots(slot_id)")
          .is("archived_at", null)
          .order("name"),
        supabase.from("recipe_macros").select("*"),
      ]);
      if (recipes.error) throw recipes.error;
      if (macros.error) throw macros.error;

      const macrosById = new Map(macros.data.map((m) => [m.recipe_id, m]));
      return recipes.data.map((r) => {
        const m = macrosById.get(r.id);
        return {
          id: r.id,
          name: r.name,
          tags: r.tags,
          updated_at: r.updated_at,
          slotIds: r.recipe_meal_slots.map((l) => l.slot_id),
          macros: { kcal: m?.kcal ?? 0, protein: m?.protein ?? 0, fat: m?.fat ?? 0, carbs: m?.carbs ?? 0 },
        };
      });
    },
  });

const RECIPE_DETAIL_SELECT = `id, name, instructions, serve_with, tags, recipe_meal_slots(slot_id),
  recipe_ingredients(grams, position, product:products(name, kcal, protein, fat, carbs, archived_at))`;

type RecipeDetailRow = {
  id: string;
  name: string;
  instructions: string | null;
  serve_with: string | null;
  tags: string[];
  recipe_meal_slots: { slot_id: string }[];
  recipe_ingredients: {
    grams: number;
    position: number;
    product: { name: string; kcal: number; protein: number; fat: number; carbs: number; archived_at: string | null };
  }[];
};

function toRecipeDetail(data: RecipeDetailRow): RecipeDetail {
  const ingredients = [...data.recipe_ingredients].sort((a, b) => a.position - b.position);
  return {
    id: data.id,
    name: data.name,
    instructions: data.instructions,
    serve_with: data.serve_with,
    tags: data.tags,
    slotIds: data.recipe_meal_slots.map((l) => l.slot_id),
    ingredients: ingredients.map((i) => ({ name: i.product.name, grams: i.grams, archived: i.product.archived_at !== null })),
    macros: sumMacros(ingredients.map((i) => productMacros(i.product, i.grams))),
  };
}

export const recipeDetailKey = (userId: string | undefined, id: string) => ["recipes", "detail", userId, id] as const;

export function useRecipe(id: string) {
  const userId = useUserId();
  return useQuery({
    queryKey: recipeDetailKey(userId, id),
    enabled: Boolean(userId),
    queryFn: async (): Promise<RecipeDetail> => {
      const { data, error } = await supabase.from("recipes").select(RECIPE_DETAIL_SELECT).eq("id", id).single();
      if (error) throw error;
      return toRecipeDetail(data as unknown as RecipeDetailRow);
    },
  });
}

/** All the user's recipes with ingredients in one request – used to make them available offline. */
export async function fetchAllRecipeDetails(): Promise<RecipeDetail[]> {
  const { data, error } = await supabase.from("recipes").select(RECIPE_DETAIL_SELECT).is("archived_at", null);
  if (error) throw error;
  return (data as unknown as RecipeDetailRow[]).map(toRecipeDetail);
}

function toSharedRecipe(r: Tables<"shared_recipes">): SharedRecipe {
  return {
    id: r.id!,
    author_id: r.author_id!,
    author_name: r.author_name,
    author_avatar_url: r.author_avatar_url,
    name: r.name!,
    instructions: r.instructions,
    serve_with: r.serve_with,
    tags: r.tags ?? [],
    shared_at: r.shared_at!,
    slot_keys: r.slot_keys ?? [],
    macros: { kcal: r.kcal ?? 0, protein: r.protein ?? 0, fat: r.fat ?? 0, carbs: r.carbs ?? 0 },
  };
}

/** Recipes other people share (the user's own shared recipes are left out). */
export const sharedRecipesOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["shared_recipes", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.from("shared_recipes").select("*").order("shared_at", { ascending: false });
      if (error) throw error;
      return data.map(toSharedRecipe).filter((r) => r.author_id !== userId);
    },
  });

export function useSharedRecipes() {
  const userId = useUserId();
  return useQuery(sharedRecipesOptions(userId));
}

export function useSharedRecipeIngredients(recipeId: string) {
  return useQuery(sharedIngredientsOptions(recipeId));
}

export const sharedIngredientsOptions = (recipeId: string) =>
  queryOptions({
    queryKey: ["shared_recipes", "ingredients", recipeId],
    queryFn: async (): Promise<SharedIngredient[]> => {
      const { data, error } = await supabase
        .from("shared_recipe_ingredients")
        .select("*")
        .eq("recipe_id", recipeId)
        .order("position");
      if (error) throw error;
      return data.map((i) => ({
        id: i.id!,
        name: i.name!,
        producer: i.producer,
        grams: i.grams!,
        is_catalog: i.is_catalog!,
      }));
    },
  });

// Bookmarks ("Zapisane"), shared with the desktop (table saved_shared_recipes).
const savedKey = (userId: string | undefined) => ["shared_recipes", "saved", userId] as const;

// Stored as an array: the query cache is saved on the phone as JSON, which has no Set.
async function fetchSavedIds(): Promise<string[]> {
  const { data, error } = await supabase.from("saved_shared_recipes").select("recipe_id");
  if (error) throw error;
  return data.map((r) => r.recipe_id);
}

const toSet = (ids: string[]) => new Set(ids);

export const savedIdsOptions = (userId: string | undefined) =>
  queryOptions({ queryKey: savedKey(userId), enabled: Boolean(userId), queryFn: fetchSavedIds });

export function useSavedSharedRecipeIds() {
  const userId = useUserId();
  return useQuery({ ...savedIdsOptions(userId), select: toSet });
}

/** Adds or removes a bookmark; the set updates at once and rolls back if the save fails. */
export function useToggleSavedSharedRecipe() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const key = savedKey(userId);

  return useMutation({
    mutationFn: async ({ recipeId, saved }: { recipeId: string; saved: boolean }) => {
      const { error } = saved
        ? await supabase
            .from("saved_shared_recipes")
            .upsert({ recipe_id: recipeId }, { onConflict: "user_id,recipe_id", ignoreDuplicates: true })
        : await supabase.from("saved_shared_recipes").delete().eq("recipe_id", recipeId);
      if (error) throw error;
    },
    onMutate: async ({ recipeId, saved }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<string[]>(key);
      const others = (previous ?? []).filter((id) => id !== recipeId);
      queryClient.setQueryData(key, saved ? [...others, recipeId] : others);
      return { previous };
    },
    onError: (_error, _vars, context) => queryClient.setQueryData(key, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}
