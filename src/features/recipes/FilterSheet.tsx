import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { Button, Modal, Portal, RadioButton, Text } from "react-native-paper";
import { SelectChip } from "@/components/SelectChip";
import type { RecipeSortKey } from "@/features/recipes/filter";
import { useAppTheme } from "@/theme/theme";

const SORTS: RecipeSortKey[] = ["name", "newest", "kcal", "protein", "fat", "carbs"];

/** Sort order and required tags (all selected tags must be on a recipe), like the desktop toolbar. */
export function FilterSheet({
  visible,
  onDismiss,
  sort,
  onSort,
  tags,
  selectedTags,
  onToggleTag,
  onClear,
}: {
  visible: boolean;
  onDismiss: () => void;
  sort: RecipeSortKey;
  onSort: (s: RecipeSortKey) => void;
  tags: string[];
  selectedTags: ReadonlySet<string>;
  onToggleTag: (tag: string) => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  const theme = useAppTheme();

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={{
          backgroundColor: theme.colors.surfaceContainerHigh,
          margin: 16,
          borderRadius: 28,
          padding: 20,
          maxHeight: "85%",
        }}
      >
        <ScrollView contentContainerStyle={{ gap: 12 }}>
          <Text variant="titleLarge">{t("mobile.recipes.filters")}</Text>

          <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
            {t("mobile.recipes.sortBy")}
          </Text>
          <RadioButton.Group value={sort} onValueChange={(v) => onSort(v as RecipeSortKey)}>
            {SORTS.map((s) => (
              <RadioButton.Item key={s} value={s} label={t(`recipes.sort.${s}`)} style={{ paddingVertical: 2 }} />
            ))}
          </RadioButton.Group>

          {tags.length > 0 && (
            <>
              <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
                {t("recipes.filterByTags")}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {tags.map((tag) => (
                  <SelectChip key={tag} selected={selectedTags.has(tag)} onPress={() => onToggleTag(tag)}>
                    {tag}
                  </SelectChip>
                ))}
              </View>
            </>
          )}
        </ScrollView>
        <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <Button onPress={onClear}>{t("mobile.recipes.clearFilters")}</Button>
          <Button mode="contained" onPress={onDismiss}>
            {t("plan.done")}
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}
