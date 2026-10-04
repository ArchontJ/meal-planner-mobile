import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Text, TouchableRipple } from "react-native-paper";
import type { PlanItem, PlanMeal } from "@/features/plan/model";
import { formatGramsLabel, formatNumber } from "@/lib/format";
import { formatKcal } from "@/lib/nutrition";
import { useAppTheme } from "@/theme/theme";

/** One meal slot of the day: its items in one line and kcal; empty slots are dashed. */
export function MealCard({ label, meal, onPress }: { label: string; meal: PlanMeal | undefined; onPress: () => void }) {
  const { t, i18n } = useTranslation();
  const theme = useAppTheme();
  const filled = meal && meal.items.length > 0;

  const itemText = (item: PlanItem) =>
    item.kind === "recipe"
      ? `${item.name} · ${t("plan.portionsCount", { count: item.portions, value: formatNumber(item.portions, i18n.language, 2) })}`
      : `${item.name} ${formatGramsLabel(item.grams, i18n.language)}`;

  if (!filled) {
    return (
      <View
        style={{ borderRadius: 16, borderWidth: 1, borderStyle: "dashed", borderColor: theme.colors.outlineVariant, padding: 12 }}
      >
        <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {label}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {t("home.nothingPlanned")}
        </Text>
      </View>
    );
  }

  return (
    <TouchableRipple
      onPress={onPress}
      accessibilityRole="button"
      borderless
      style={{ borderRadius: 16, backgroundColor: theme.colors.surfaceContainerLow }}
    >
      <View style={{ padding: 12, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text variant="titleSmall" style={{ flex: 1 }}>
            {label}
          </Text>
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {formatKcal(meal.macros.kcal)} kcal
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.onSurfaceVariant} />
        </View>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={2}>
          {meal.items.map(itemText).join(", ")}
        </Text>
      </View>
    </TouchableRipple>
  );
}
