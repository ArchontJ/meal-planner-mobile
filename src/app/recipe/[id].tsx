import { router, Stack, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { ActivityIndicator, HelperText } from "react-native-paper";
import { useMealSlots } from "@/features/plan/api";
import { useRecipe } from "@/features/recipes/api";
import { RecipePreview } from "@/features/recipes/RecipePreview";
import { mealSlotLabel } from "@/lib/labels";

/** Preview of one of the user's recipes; "Gotuj" opens the cooking view. */
export default function RecipeScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipe = useRecipe(id);
  const slots = useMealSlots();
  // The full name is shown on the page; the header stays short.
  const header = <Stack.Screen options={{ title: "" }} />;

  if (!recipe.data) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        {header}
        {recipe.isError ? (
          <HelperText type="error" visible>
            {t("recipes.notFound")}
          </HelperText>
        ) : (
          <ActivityIndicator />
        )}
      </View>
    );
  }

  const r = recipe.data;
  const mealNames = (slots.data ?? []).filter((s) => r.slotIds.includes(s.id)).map((s) => mealSlotLabel(s, t));

  return (
    <>
      {header}
      <RecipePreview
        name={r.name}
        mealNames={mealNames}
        tags={r.tags}
        macros={r.macros}
        ingredients={r.ingredients.map((ing, i) => ({
          key: String(i),
          name: ing.name,
          grams: ing.grams,
          badge: ing.archived ? t("recipes.archivedProduct") : undefined,
        }))}
        serveWith={r.serve_with}
        instructions={r.instructions}
        onCook={() => router.push({ pathname: "/cook/[id]", params: { id: r.id, source: "own" } })}
      />
    </>
  );
}
