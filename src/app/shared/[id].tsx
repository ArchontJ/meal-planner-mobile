import { router, Stack, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { ActivityIndicator, HelperText } from "react-native-paper";
import { useMealSlots } from "@/features/plan/api";
import {
  useSavedSharedRecipeIds,
  useSharedRecipeIngredients,
  useSharedRecipes,
  useToggleSavedSharedRecipe,
} from "@/features/recipes/api";
import { RecipePreview } from "@/features/recipes/RecipePreview";
import { mealSlotLabel } from "@/lib/labels";

/** Preview of a recipe someone shared; bookmark instead of copying, "Gotuj" opens the cooking view. */
export default function SharedRecipeScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const shared = useSharedRecipes();
  const ingredients = useSharedRecipeIngredients(id);
  const savedIds = useSavedSharedRecipeIds();
  const toggleSaved = useToggleSavedSharedRecipe();
  const slots = useMealSlots();

  const recipe = shared.data?.find((r) => r.id === id);
  const saved = savedIds.data?.has(id) ?? false;

  if (!recipe) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Stack.Screen options={{ title: "" }} />
        {shared.isLoading ? (
          <ActivityIndicator />
        ) : (
          <HelperText type="error" visible>
            {t("recipes.unshared")}
          </HelperText>
        )}
      </View>
    );
  }

  const mealNames = (slots.data ?? [])
    .filter((s) => s.default_key && recipe.slot_keys.includes(s.default_key))
    .map((s) => mealSlotLabel(s, t));

  return (
    <>
      <Stack.Screen options={{ title: "" }} />
      <RecipePreview
        name={recipe.name}
        mealNames={mealNames}
        tags={recipe.tags}
        macros={recipe.macros}
        ingredients={(ingredients.data ?? []).map((ing) => ({
          key: ing.id,
          name: ing.producer ? `${ing.name} (${ing.producer})` : ing.name,
          grams: ing.grams,
          badge: ing.is_catalog ? undefined : t("recipes.authorPrivate"),
        }))}
        ingredientsLoading={ingredients.isLoading}
        serveWith={recipe.serve_with}
        instructions={recipe.instructions}
        author={{ name: recipe.author_name, avatarUrl: recipe.author_avatar_url }}
        bookmark={{ saved, onToggle: () => toggleSaved.mutate({ recipeId: id, saved: !saved }) }}
        onCook={() => router.push({ pathname: "/cook/[id]", params: { id, source: "shared" } })}
      />
    </>
  );
}
