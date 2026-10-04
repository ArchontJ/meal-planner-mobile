import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Text } from "react-native-paper";
import { StatusBadge } from "@/features/plan/StatusBadge";
import { formatGramsLabel, formatNumber } from "@/lib/format";
import { energyPct, evaluateDay, goalsFromProfile, KCAL_PER_GRAM } from "@/lib/goals";
import { formatKcal, type Macros } from "@/lib/nutrition";
import type { Tables } from "@/types/database";
import { useAppTheme } from "@/theme/theme";

/** Day totals against the profile goals: kcal, a bar of where the calories come from, protein and fat checks. */
export function DayGoals({ macros, profile }: { macros: Macros; profile: Tables<"profiles"> }) {
  const { t, i18n } = useTranslation();
  const theme = useAppTheme();
  const day = evaluateDay(macros, goalsFromProfile(profile));
  const empty = macros.kcal <= 0;
  const lang = i18n.language;

  const shares = [
    { key: "protein", pct: energyPct(macros.protein, KCAL_PER_GRAM.protein, macros.kcal), color: theme.colors.macroProtein },
    { key: "fat", pct: energyPct(macros.fat, KCAL_PER_GRAM.fat, macros.kcal), color: theme.colors.macroFat },
    { key: "carbs", pct: energyPct(macros.carbs, KCAL_PER_GRAM.carbs, macros.kcal), color: theme.colors.macroCarbs },
  ];
  const shareTotal = shares.reduce((s, x) => s + x.pct, 0);

  return (
    <View style={{ backgroundColor: theme.colors.surfaceContainerHigh, borderRadius: 16, padding: 14, gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
        <Text variant="headlineSmall">{formatKcal(day.kcal.value)}</Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
          / {formatKcal(day.kcal.target)} kcal
        </Text>
        {!empty && <StatusBadge status={day.kcal.status} label={t(`home.kcalStatus.${day.kcal.status}`)} />}
      </View>

      {empty ? (
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {t("home.nothingPlanned")}
        </Text>
      ) : (
        <>
          <View
            style={{ flexDirection: "row", height: 8, borderRadius: 4, overflow: "hidden", gap: 2 }}
            accessibilityLabel={t("home.donutLabel")}
          >
            {shares.map((s) => (
              <View key={s.key} style={{ flex: shareTotal > 0 ? s.pct : 1, backgroundColor: s.color }} />
            ))}
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Legend color={theme.colors.macroProtein} text={`${t("macros.proteinShort")} ${formatGramsLabel(macros.protein, lang)}`} />
            <Legend color={theme.colors.macroFat} text={`${t("macros.fatShort")} ${formatGramsLabel(macros.fat, lang)}`} />
            <Legend color={theme.colors.macroCarbs} text={`${t("macros.carbsShort")} ${formatGramsLabel(macros.carbs, lang)}`} />
          </View>

          <GoalRow
            label={t("macros.protein")}
            value={formatGramsLabel(day.protein.value, lang)}
            detail={t("home.proteinTarget", { min: formatNumber(day.protein.min, lang) })}
            badge={
              <StatusBadge
                status={day.protein.status}
                label={
                  day.protein.status === "under"
                    ? t("home.proteinMissing", { grams: formatNumber(day.protein.min - day.protein.value, lang) })
                    : t(`home.proteinStatus.${day.protein.status}`)
                }
              />
            }
          />
          <GoalRow
            label={t("macros.fat")}
            value={`${Math.round(day.fat.pct)}%`}
            detail={t("home.fatTarget", { min: day.fat.minPct, max: day.fat.maxPct })}
            badge={<StatusBadge status={day.fat.status} label={t(`home.fatStatus.${day.fat.status}`)} />}
          />
        </>
      )}
    </View>
  );
}

function Legend({ color, text }: { color: string; text: string }) {
  const theme = useAppTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        {text}
      </Text>
    </View>
  );
}

function GoalRow({ label, value, detail, badge }: { label: string; value: string; detail: string; badge: React.ReactNode }) {
  const theme = useAppTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium">
          {label} <Text style={{ fontWeight: "600" }}>{value}</Text>
        </Text>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {detail}
        </Text>
      </View>
      {badge}
    </View>
  );
}
