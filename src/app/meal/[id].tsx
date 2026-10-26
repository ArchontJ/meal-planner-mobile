import { Stack, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { ActivityIndicator, HelperText } from "react-native-paper";
import { HeaderTitle } from "@/components/HeaderTitle";
import { CookingView, type CookProduct, type CookRecipe } from "@/features/cooking/CookingView";
import { useMeal } from "@/features/plan/api";
import { formatDate, isISODate } from "@/lib/dates";
import { scaleMacros } from "@/lib/nutrition";

/** Cooking view of a planned meal: its recipes at the planned portions, plus its extra products. */
export default function MealScreen() {
  const { t, i18n } = useTranslation();
  const { id, label, date } = useLocalSearchParams<{ id: string; label?: string; date?: string }>();
  const meal = useMeal(id);

  const dateText =
    date && isISODate(date) ? formatDate(date, i18n.language, { weekday: "long", day: "numeric", month: "long" }) : "";
  const header = (
    <Stack.Screen
      options={{
        title: label ?? "",
        headerTitle: () => <HeaderTitle title={label ?? ""} subtitle={dateText} />,
      }}
    />
  );
  if (!meal.data) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        {header}
        {meal.isError ? (
          <HelperText type="error" visible>
            {t("errors.loadFailed")}
          </HelperText>
        ) : (
          <ActivityIndicator />
        )}
      </View>
    );
  }

  const recipes: CookRecipe[] = [];
  const products: CookProduct[] = [];
  for (const item of meal.data.items) {
    if (item.kind === "recipe") {
      recipes.push({
        key: item.id,
        name: item.name,
        portions: item.portions,
        // The plan stores ingredients already multiplied by the portions.
        ingredientsPerPortion: item.ingredients.map((ing) => ({ name: ing.name, grams: ing.grams / item.portions })),
        // Pending lines from the plan are already × portions; the view wants per portion.
        pendingPerPortion: item.pending.map((p) => ({ ...p, grams: p.grams === null ? null : p.grams / item.portions })),
        macrosPerPortion: scaleMacros(item.macros, 1 / item.portions),
        serveWith: item.serveWith,
        instructions: item.instructions,
      });
    } else {
      products.push({ key: item.id, name: item.name, producer: item.producer, grams: item.grams, macros: item.macros });
    }
  }

  return (
    <>
      {header}
      <CookingView
        key={meal.data.items.map((i) => `${i.id}:${i.kind === "recipe" ? i.portions : i.grams}`).join("|")}
        recipes={recipes}
        products={products}
      />
    </>
  );
}
