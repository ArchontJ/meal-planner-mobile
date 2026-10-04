import { Stack, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { ActivityIndicator, HelperText } from "react-native-paper";
import { HeaderTitle } from "@/components/HeaderTitle";
import { CookingView, type CookRecipe } from "@/features/cooking/CookingView";
import { useRecipe, useSharedRecipeIngredients, useSharedRecipes } from "@/features/recipes/api";

/** Cooking view of a single recipe (own or shared), starting at 1 portion. */
export default function CookRecipeScreen() {
  const { id, source } = useLocalSearchParams<{ id: string; source: "own" | "shared" }>();
  return source === "shared" ? <CookShared id={id} /> : <CookOwn id={id} />;
}

function CookOwn({ id }: { id: string }) {
  const recipe = useRecipe(id);
  const r = recipe.data;
  return (
    <Cook
      isError={recipe.isError}
      recipe={
        r && {
          key: r.id,
          name: r.name,
          portions: 1,
          ingredientsPerPortion: r.ingredients,
          macrosPerPortion: r.macros,
          serveWith: r.serve_with,
          instructions: r.instructions,
        }
      }
    />
  );
}

function CookShared({ id }: { id: string }) {
  const shared = useSharedRecipes();
  const ingredients = useSharedRecipeIngredients(id);
  const r = shared.data?.find((x) => x.id === id);
  return (
    <Cook
      isError={shared.isError || ingredients.isError || (!shared.isLoading && !r)}
      recipe={
        r &&
        ingredients.data && {
          key: r.id,
          name: r.name,
          portions: 1,
          ingredientsPerPortion: ingredients.data.map((i) => ({ name: i.name, grams: i.grams })),
          macrosPerPortion: r.macros,
          serveWith: r.serve_with,
          instructions: r.instructions,
        }
      }
    />
  );
}

function Cook({ recipe, isError }: { recipe: CookRecipe | undefined; isError: boolean }) {
  const { t } = useTranslation();
  const header = (
    <Stack.Screen options={{ title: recipe?.name ?? "", headerTitle: () => <HeaderTitle title={recipe?.name ?? ""} /> }} />
  );
  if (!recipe) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        {header}
        {isError ? (
          <HelperText type="error" visible>
            {t("recipes.notFound")}
          </HelperText>
        ) : (
          <ActivityIndicator />
        )}
      </View>
    );
  }
  return (
    <>
      {header}
      <CookingView key={recipe.key} recipes={[recipe]} showRecipeHeadings={false} />
    </>
  );
}
