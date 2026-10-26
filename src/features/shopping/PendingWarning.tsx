import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Text } from "react-native-paper";
import type { ShoppingSourceMeal } from "@/features/shopping/api";
import { useAppTheme } from "@/theme/theme";

/**
 * Recipes with "Do uzupełnienia" lines among the included meals: those ingredients have no
 * product yet, so they can't be on the shopping list. Hidden when there are none.
 */
export function PendingWarning({ meals, excluded }: { meals: ShoppingSourceMeal[]; excluded: ReadonlySet<string> }) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const names = [...new Set(meals.filter((m) => !excluded.has(m.id)).flatMap((m) => m.pendingRecipes ?? []))];
  if (names.length === 0) return null;

  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: "row",
        gap: 8,
        backgroundColor: theme.colors.tertiaryContainer,
        borderRadius: 12,
        padding: 12,
      }}
    >
      <MaterialCommunityIcons name="alert-circle-outline" size={18} color={theme.colors.onTertiaryContainer} />
      <Text variant="bodySmall" style={{ flex: 1, color: theme.colors.onTertiaryContainer }}>
        {t("mobile.shopping.pendingWarning", { count: names.length, names: names.join(", ") })}
      </Text>
    </View>
  );
}
