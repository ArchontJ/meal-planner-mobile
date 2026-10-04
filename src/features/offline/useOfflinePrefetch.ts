import { onlineManager, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { mealSlotsOptions, mealsRangeOptions } from "@/features/plan/api";
import { profileOptions } from "@/features/profile/api";
import {
  fetchAllRecipeDetails,
  myRecipesOptions,
  recipeDetailKey,
  savedIdsOptions,
  sharedIngredientsOptions,
  sharedRecipesOptions,
} from "@/features/recipes/api";
import { productCategoriesOptions } from "@/features/shopping/api";
import { useAuth } from "@/lib/auth";
import { addDays, startOfWeek, today } from "@/lib/dates";

const MIN_INTERVAL = 10 * 60 * 1000;

/**
 * While online, quietly loads what is needed in the kitchen and the shop without signal:
 * this week and next week of the plan (today + 7 days, in the Plan screen's weekly queries),
 * settings, all own recipes with ingredients, and the bookmarked inspirations.
 * Runs on start, when the connection comes back and when the app returns to the foreground
 * (at most every 10 minutes); the query cache is saved on the phone.
 */
export function useOfflinePrefetch() {
  const userId = useAuth((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const lastRun = useRef(0);

  useEffect(() => {
    if (!userId) return;

    const run = async () => {
      if (!onlineManager.isOnline() || Date.now() - lastRun.current < MIN_INTERVAL) return;
      lastRun.current = Date.now();

      const monday = startOfWeek(today());
      const weeks = [monday, addDays(monday, 7)];
      await Promise.allSettled([
        ...weeks.map((from) => queryClient.prefetchQuery(mealsRangeOptions(userId, from, addDays(from, 6)))),
        queryClient.prefetchQuery(mealSlotsOptions(userId)),
        queryClient.prefetchQuery(profileOptions(userId)),
        queryClient.prefetchQuery(productCategoriesOptions(userId)),
        queryClient.prefetchQuery(myRecipesOptions(userId)),
        queryClient.prefetchQuery(sharedRecipesOptions(userId)),
        fetchAllRecipeDetails().then((recipes) => {
          for (const r of recipes) queryClient.setQueryData(recipeDetailKey(userId, r.id), r);
        }),
        queryClient.fetchQuery(savedIdsOptions(userId)).then((ids) =>
          Promise.allSettled(ids.map((id) => queryClient.prefetchQuery(sharedIngredientsOptions(id)))),
        ),
      ]);
    };

    void run();
    const offOnline = onlineManager.subscribe((online) => online && void run());
    const appState = AppState.addEventListener("change", (s) => s === "active" && void run());
    return () => {
      offOnline();
      appState.remove();
    };
  }, [userId, queryClient]);
}
