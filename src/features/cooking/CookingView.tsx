import { useKeepAwake } from "expo-keep-awake";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { IconButton, SegmentedButtons, Text } from "react-native-paper";
import { MarkdownText } from "@/components/MarkdownText";
import type { PendingIngredient } from "@/features/plan/model";
import { formatGramsLabel, formatNumber } from "@/lib/format";
import { formatKcal, scaleMacros, sumMacros, type Macros } from "@/lib/nutrition";
import { usePreferences } from "@/lib/preferences";
import { useAppTheme } from "@/theme/theme";

export type CookRecipe = {
  key: string;
  name: string;
  /** Portions to start with: the planned amount, or 1 for a recipe opened from the list. */
  portions: number;
  ingredientsPerPortion: { name: string; grams: number }[];
  /** Imported lines without a product yet ("Do uzupełnienia"): listed, but not in the macros. */
  pendingPerPortion?: PendingIngredient[];
  macrosPerPortion: Macros;
  serveWith: string | null;
  instructions: string | null;
};

export type CookProduct = { key: string; name: string; producer: string | null; grams: number; macros: Macros };

export const PORTION_STEP = 0.5;
const MAX_PORTIONS = 20;

/**
 * Cooking view: Składniki (ingredients × portions, "Podawać z", extra products) and
 * Przygotowanie (instructions). Portions only change what is shown, never the plan.
 */
export function CookingView({
  recipes,
  products = [],
  showRecipeHeadings = true,
}: {
  recipes: CookRecipe[];
  /** Name above each recipe's instructions: useful in a meal, redundant for a single recipe. */
  showRecipeHeadings?: boolean;
  products?: CookProduct[];
}) {
  const { t, i18n } = useTranslation();
  const theme = useAppTheme();
  const keepAwake = usePreferences((s) => s.keepAwakeWhileCooking);
  const [tab, setTab] = useState<"ingredients" | "instructions">("ingredients");
  const [portions, setPortions] = useState<Record<string, number>>(() =>
    Object.fromEntries(recipes.map((r) => [r.key, r.portions])),
  );
  const lang = i18n.language;
  const portionsOf = (r: CookRecipe) => portions[r.key] ?? r.portions;

  const macros = sumMacros([
    ...recipes.map((r) => scaleMacros(r.macrosPerPortion, portionsOf(r))),
    ...products.map((p) => p.macros),
  ]);

  return (
    <View style={{ flex: 1 }}>
      {keepAwake && <KeepAwake />}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8, gap: 10 }}>
        <MacroSummary macros={macros} />
        <SegmentedButtons
          value={tab}
          onValueChange={(v) => setTab(v as typeof tab)}
          buttons={[
            { value: "ingredients", label: t("mobile.cooking.ingredients") },
            { value: "instructions", label: t("recipes.instructions") },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 8, gap: 20 }}>
        {tab === "ingredients" ? (
          <>
            {recipes.map((r) => {
              const n = portionsOf(r);
              return (
                <View key={r.key} style={{ gap: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text variant="titleMedium" style={{ flex: 1 }}>
                      {r.name}
                    </Text>
                    <PortionStepper
                      value={n}
                      onChange={(v) => setPortions((p) => ({ ...p, [r.key]: v }))}
                    />
                  </View>
                  {r.ingredientsPerPortion.map((ing, i) => (
                    <IngredientRow key={i} name={ing.name} amount={formatGramsLabel(ing.grams * n, lang)} />
                  ))}
                  <PendingLines pending={r.pendingPerPortion ?? []} portions={n} />
                  {r.serveWith ? (
                    <View style={{ backgroundColor: theme.colors.surfaceContainerLow, borderRadius: 12, padding: 12, marginTop: 6 }}>
                      <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                        {t("recipes.serveWith")}
                      </Text>
                      <Text variant="bodyLarge">{r.serveWith}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
            {products.length > 0 && (
              <View style={{ gap: 6 }}>
                <Text variant="titleMedium">{t("home.additionalProducts")}</Text>
                {products.map((p) => (
                  <IngredientRow
                    key={p.key}
                    name={p.producer ? `${p.name} (${p.producer})` : p.name}
                    amount={formatGramsLabel(p.grams, lang)}
                  />
                ))}
              </View>
            )}
          </>
        ) : (
          recipes.map((r) => (
            <View key={r.key} style={{ gap: 8 }}>
              {showRecipeHeadings && (
                <View style={{ borderLeftWidth: 3, borderLeftColor: theme.colors.primary, paddingLeft: 10 }}>
                  <Text variant="titleMedium">{r.name}</Text>
                  <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    {t("plan.portionsCount", { count: portionsOf(r), value: formatNumber(portionsOf(r), lang, 2) })}
                  </Text>
                </View>
              )}
              {r.instructions?.trim() ? (
                <MarkdownText text={r.instructions} />
              ) : (
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                  {t("home.noInstructions")}
                </Text>
              )}
            </View>
          ))
        )}
        {tab === "instructions" && recipes.length === 0 && (
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            {t("home.noInstructions")}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

export function IngredientRow({ name, amount, badge }: { name: string; amount: string; badge?: string }) {
  const theme = useAppTheme();
  if (badge) {
    return (
      <View style={{ paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 12 }}>
          <Text variant="bodyLarge" style={{ flex: 1 }}>
            {name}
          </Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, fontVariant: ["tabular-nums"] }}>
            {amount}
          </Text>
        </View>
        <View style={{ alignSelf: "flex-start", backgroundColor: theme.colors.tertiaryContainer, borderRadius: 6, paddingHorizontal: 6 }}>
          <Text variant="labelSmall" style={{ color: theme.colors.onTertiaryContainer }}>
            {badge}
          </Text>
        </View>
      </View>
    );
  }
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "baseline",
        paddingVertical: 9,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.outlineVariant,
        gap: 12,
      }}
    >
      <Text variant="bodyLarge" style={{ flex: 1 }}>
        {name}
      </Text>
      <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, fontVariant: ["tabular-nums"] }}>
        {amount}
      </Text>
    </View>
  );
}

/**
 * "Do uzupełnienia": imported ingredient lines without a product yet, with a note that the
 * macros leave them out (as on the desktop). Grams per portion × portions, "—" when unknown.
 */
export function PendingLines({ pending, portions }: { pending: PendingIngredient[]; portions: number }) {
  const { t, i18n } = useTranslation();
  const theme = useAppTheme();
  if (pending.length === 0) return null;
  return (
    <View style={{ gap: 2 }}>
      {pending.map((p, i) => (
        <IngredientRow
          key={`pending-${i}`}
          name={p.name}
          amount={p.grams === null ? "—" : formatGramsLabel(p.grams * portions, i18n.language)}
          badge={t("recipes.pending.badge")}
        />
      ))}
      <Text variant="labelMedium" style={{ color: theme.colors.statusWarn, marginTop: 4 }}>
        {t("recipes.pending.macrosWarning", { count: pending.length })}
      </Text>
    </View>
  );
}

/** kcal and macros in one bar, macros in their chart colours. */
export function MacroSummary({ macros }: { macros: Macros }) {
  const { t, i18n } = useTranslation();
  const theme = useAppTheme();
  const lang = i18n.language;
  return (
    <View style={{ flexDirection: "row", backgroundColor: theme.colors.surfaceContainerLow, borderRadius: 16, paddingVertical: 10 }}>
      <MacroStat value={formatKcal(macros.kcal)} label="kcal" />
      <MacroStat value={formatGramsLabel(macros.protein, lang)} label={t("macros.protein")} color={theme.colors.macroProtein} />
      <MacroStat value={formatGramsLabel(macros.fat, lang)} label={t("macros.fat")} color={theme.colors.macroFat} />
      <MacroStat value={formatGramsLabel(macros.carbs, lang)} label={t("macros.carbs")} color={theme.colors.macroCarbs} />
    </View>
  );
}

/** One macro in the summary bar: value on top, name below with its chart colour. */
function MacroStat({ value, label, color }: { value: string; label: string; color?: string }) {
  const theme = useAppTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
      <Text variant="titleMedium" style={{ fontWeight: "600", color: color ?? theme.colors.onSurface }}>
        {value}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        {color && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />}
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {label}
        </Text>
      </View>
    </View>
  );
}

/**
 * Compact − 1,5 + pill; the unit word is read out, not shown, to save space.
 * Portions by default (steps of ½, up to 20); pass step/min for whole numbers such as people.
 */
export function PortionStepper({
  value,
  onChange,
  step = PORTION_STEP,
  min = step,
  max = MAX_PORTIONS,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  const { t, i18n } = useTranslation();
  const theme = useAppTheme();
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", borderRadius: 999, borderWidth: 1, borderColor: theme.colors.outlineVariant }}
      accessibilityLabel={formatNumber(value, i18n.language, 2)}
    >
      <IconButton
        icon="minus"
        size={16}
        style={{ margin: 0 }}
        disabled={value <= min}
        onPress={() => onChange(Math.max(min, value - step))}
        accessibilityLabel={t("mobile.cooking.decrease")}
      />
      <Text variant="labelLarge" style={{ minWidth: 28, textAlign: "center" }}>
        {formatNumber(value, i18n.language, 2)}
      </Text>
      <IconButton
        icon="plus"
        size={16}
        style={{ margin: 0 }}
        disabled={value >= max}
        onPress={() => onChange(Math.min(max, value + step))}
        accessibilityLabel={t("mobile.cooking.increase")}
      />
    </View>
  );
}

/** Keeps the screen on while mounted (setting: "Ekran nie gaśnie podczas gotowania"). */
function KeepAwake() {
  useKeepAwake();
  return null;
}
