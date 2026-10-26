import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Avatar, IconButton, Text, TouchableRipple } from "react-native-paper";
import { formatNumber } from "@/lib/format";
import { formatKcal, type Macros } from "@/lib/nutrition";
import { useAppTheme } from "@/theme/theme";

/** List card: name, macros per portion, tags; shared recipes also show the author and a bookmark. */
export function RecipeCard({
  name,
  macros,
  tags,
  author,
  pendingCount = 0,
  saved,
  onToggleSaved,
  onPress,
}: {
  name: string;
  macros: Macros;
  tags: string[];
  author?: { name: string | null; avatarUrl: string | null };
  /** "Do uzupełnienia" lines; shown as a badge. */
  pendingCount?: number;
  saved?: boolean;
  onToggleSaved?: () => void;
  onPress: () => void;
}) {
  const { t, i18n } = useTranslation();
  const theme = useAppTheme();
  const g = (v: number) => `${formatNumber(v, i18n.language, 0)} g`;

  return (
    <TouchableRipple
      onPress={onPress}
      accessibilityRole="button"
      borderless
      style={{ borderRadius: 16, backgroundColor: theme.colors.surfaceContainerLow }}
    >
      <View style={{ padding: 12, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
          <Text variant="titleSmall" style={{ flex: 1, paddingTop: onToggleSaved ? 6 : 0 }}>
            {name}
          </Text>
          {onToggleSaved && (
            <IconButton
              icon={saved ? "bookmark" : "bookmark-outline"}
              iconColor={saved ? theme.colors.primary : theme.colors.onSurfaceVariant}
              size={20}
              style={{ margin: -4 }}
              onPress={onToggleSaved}
              accessibilityLabel={saved ? t("recipes.bookmark.remove") : t("recipes.bookmark.add")}
              accessibilityState={{ selected: saved }}
            />
          )}
        </View>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {formatKcal(macros.kcal)} kcal · {t("macros.proteinShort")} {g(macros.protein)} · {t("macros.fatShort")}{" "}
          {g(macros.fat)} · {t("macros.carbsShort")} {g(macros.carbs)}
        </Text>
        {pendingCount > 0 && (
          <View
            style={{
              alignSelf: "flex-start",
              backgroundColor: theme.colors.tertiaryContainer,
              borderRadius: 6,
              paddingHorizontal: 6,
              marginTop: 2,
            }}
          >
            <Text variant="labelSmall" style={{ color: theme.colors.onTertiaryContainer }}>
              {t("recipes.pending.badgeCount", { count: pendingCount })}
            </Text>
          </View>
        )}
        {(tags.length > 0 || author) && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 4 }}>
            {author && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginRight: 4 }}>
                {author.avatarUrl ? (
                  <Avatar.Image size={20} source={{ uri: author.avatarUrl }} />
                ) : (
                  <Avatar.Text size={20} label={(author.name ?? "?").charAt(0).toUpperCase()} />
                )}
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {author.name}
                </Text>
              </View>
            )}
            {tags.map((tag) => (
              <View
                key={tag}
                style={{ borderRadius: 8, borderWidth: 1, borderColor: theme.colors.outlineVariant, paddingHorizontal: 8, paddingVertical: 1 }}
              >
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableRipple>
  );
}
