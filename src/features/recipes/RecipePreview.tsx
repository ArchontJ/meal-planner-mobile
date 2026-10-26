import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { Avatar, Button, Text } from "react-native-paper";
import { MarkdownText } from "@/components/MarkdownText";
import { IngredientRow, MacroSummary, PendingLines } from "@/features/cooking/CookingView";
import type { PendingIngredient } from "@/features/plan/model";
import { formatGramsLabel } from "@/lib/format";
import type { Macros } from "@/lib/nutrition";
import { useAppTheme } from "@/theme/theme";

export type PreviewIngredient = { key: string; name: string; grams: number; badge?: string };

/**
 * Recipe preview (from the Przepisy tab): what the recipe is – meals, tags, macros and
 * ingredients per portion, instructions – on one page. Cooking happens in the cooking view.
 */
export function RecipePreview({
  name,
  mealNames,
  tags,
  macros,
  ingredients,
  ingredientsLoading,
  pending = [],
  source,
  serveWith,
  instructions,
  author,
  bookmark,
  onCook,
}: {
  name: string;
  mealNames: string[];
  tags: string[];
  macros: Macros;
  ingredients: PreviewIngredient[];
  ingredientsLoading?: boolean;
  /** "Do uzupełnienia" lines (grams per portion). */
  pending?: PendingIngredient[];
  source?: string | null;
  serveWith: string | null;
  instructions: string | null;
  author?: { name: string | null; avatarUrl: string | null };
  bookmark?: { saved: boolean; onToggle: () => void };
  onCook: () => void;
}) {
  const { t, i18n } = useTranslation();
  const theme = useAppTheme();

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 16, paddingBottom: 96 }}>
        <View style={{ gap: 10 }}>
          <Text variant="headlineSmall">{name}</Text>

          {author && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {author.avatarUrl ? (
                <Avatar.Image size={24} source={{ uri: author.avatarUrl }} />
              ) : (
                <Avatar.Text size={24} label={(author.name ?? "?").charAt(0).toUpperCase()} />
              )}
              <Text variant="bodyMedium" style={{ flex: 1, color: theme.colors.onSurfaceVariant }}>
                {author.name}
              </Text>
              {bookmark && (
                <Button
                  mode={bookmark.saved ? "contained-tonal" : "outlined"}
                  icon={bookmark.saved ? "bookmark" : "bookmark-outline"}
                  compact
                  onPress={bookmark.onToggle}
                  accessibilityLabel={bookmark.saved ? t("recipes.bookmark.remove") : t("recipes.bookmark.add")}
                >
                  {bookmark.saved ? t("mobile.recipes.saved") : t("mobile.recipes.save")}
                </Button>
              )}
            </View>
          )}

          {mealNames.length > 0 && (
            <Labeled label={t("recipes.categories")}>
              {mealNames.map((m) => (
                <Pill key={m} text={m} filled />
              ))}
            </Labeled>
          )}
          {source ? (
            <Labeled label={t("mobile.recipes.source")}>
              <Text variant="bodyMedium" style={{ flex: 1, color: theme.colors.onSurfaceVariant }}>
                {source}
              </Text>
            </Labeled>
          ) : null}
          {tags.length > 0 && (
            <Labeled label={t("recipes.tags")}>
              {tags.map((tag) => (
                <Pill key={tag} text={tag} />
              ))}
            </Labeled>
          )}
        </View>

        <View style={{ gap: 6 }}>
          <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            {t("recipes.portionMacros")}
          </Text>
          <MacroSummary macros={macros} />
        </View>

        <View style={{ gap: 2 }}>
          <Text variant="titleMedium">{t("recipes.ingredientsPerPortion")}</Text>
          {ingredientsLoading && <Text style={{ color: theme.colors.onSurfaceVariant }}>…</Text>}
          {ingredients.map((ing) => (
            <IngredientRow key={ing.key} name={ing.name} amount={formatGramsLabel(ing.grams, i18n.language)} badge={ing.badge} />
          ))}
          <PendingLines pending={pending} portions={1} />
          {serveWith ? (
            <View style={{ backgroundColor: theme.colors.surfaceContainerLow, borderRadius: 12, padding: 12, marginTop: 10 }}>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {t("recipes.serveWith")}
              </Text>
              <Text variant="bodyLarge">{serveWith}</Text>
            </View>
          ) : null}
        </View>

        <View style={{ gap: 8 }}>
          <Text variant="titleMedium">{t("recipes.instructions")}</Text>
          {instructions?.trim() ? (
            <MarkdownText text={instructions} />
          ) : (
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              {t("home.noInstructions")}
            </Text>
          )}
        </View>
      </ScrollView>

      <Button
        mode="contained"
        icon="chef-hat"
        onPress={onCook}
        style={{ position: "absolute", right: 16, bottom: 24, borderRadius: 16 }}
        contentStyle={{ height: 52, paddingHorizontal: 8 }}
      >
        {t("mobile.recipes.cook")}
      </Button>
    </View>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  const theme = useAppTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
      <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, minWidth: 64 }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function Pill({ text, filled }: { text: string; filled?: boolean }) {
  const theme = useAppTheme();
  return (
    <View
      style={{
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 3,
        backgroundColor: filled ? theme.colors.secondaryContainer : "transparent",
        borderWidth: filled ? 0 : 1,
        borderColor: theme.colors.outlineVariant,
      }}
    >
      <Text variant="labelMedium" style={{ color: filled ? theme.colors.onSecondaryContainer : theme.colors.onSurfaceVariant }}>
        {text}
      </Text>
    </View>
  );
}
