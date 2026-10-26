import { router } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshControl, ScrollView, SectionList, View } from "react-native";
import { ActivityIndicator, Badge, HelperText, IconButton, Searchbar, SegmentedButtons, Text } from "react-native-paper";
import { useMealSlots } from "@/features/plan/api";
import {
  useMyRecipes,
  useSavedSharedRecipeIds,
  useSharedRecipes,
  useToggleSavedSharedRecipe,
  type RecipeListItem,
  type SharedRecipe,
} from "@/features/recipes/api";
import { SelectChip } from "@/components/SelectChip";
import { FilterSheet } from "@/features/recipes/FilterSheet";
import { filterAndSortRecipes, splitSaved, type RecipeSortKey } from "@/features/recipes/filter";
import { RecipeCard } from "@/features/recipes/RecipeCard";
import { mealSlotLabel } from "@/lib/labels";
import { useRefreshOnFocus } from "@/lib/useRefreshOnFocus";
import { useAppTheme } from "@/theme/theme";

type Mode = "mine" | "shared";
type Item = { kind: "mine"; recipe: RecipeListItem } | { kind: "shared"; recipe: SharedRecipe };

/** Moje przepisy and Inspiracje: search, meal chips, sort and tags; bookmarked inspirations on top. */
export default function RecipesScreen() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const [mode, setMode] = useState<Mode>("mine");
  const [search, setSearch] = useState("");
  const [meals, setMeals] = useState<Set<string>>(new Set());
  const [tags, setTags] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<RecipeSortKey>("name");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const mine = useMyRecipes();
  const shared = useSharedRecipes();
  const savedIds = useSavedSharedRecipeIds();
  const toggleSaved = useToggleSavedSharedRecipe();
  const slots = useMealSlots();
  useRefreshOnFocus();

  // Meal chips: own recipes use the user's slots; shared recipes only expose default slot keys.
  const mealChips = (slots.data ?? [])
    .filter((s) => s.is_active && (mode === "mine" || s.default_key))
    .map((s) => ({ key: mode === "mine" ? s.id : s.default_key!, label: mealSlotLabel(s, t) }));

  const availableTags = useMemo(() => {
    const source = mode === "mine" ? (mine.data ?? []) : (shared.data ?? []);
    const counts = new Map<string, number>();
    for (const r of source) for (const tag of r.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pl")).map(([tag]) => tag);
  }, [mode, mine.data, shared.data]);

  const sections = useMemo(() => {
    if (mode === "mine") {
      const list = filterAndSortRecipes(mine.data ?? [], {
        search,
        tags,
        sort,
        date: (r) => r.updated_at,
        matches: (r) => meals.size === 0 || r.slotIds.some((id) => meals.has(id)),
      });
      return [{ key: "all", title: null, data: list.map((recipe): Item => ({ kind: "mine", recipe })) }];
    }
    const list = filterAndSortRecipes(shared.data ?? [], {
      search,
      tags,
      sort,
      date: (r) => r.shared_at,
      matches: (r) => meals.size === 0 || r.slot_keys.some((k) => meals.has(k)),
    });
    const { saved, others } = splitSaved(list, savedIds.data ?? new Set());
    const toItems = (rs: SharedRecipe[]) => rs.map((recipe): Item => ({ kind: "shared", recipe }));
    return [
      ...(saved.length ? [{ key: "saved", title: t("recipes.bookmark.savedSection", { count: saved.length }), data: toItems(saved) }] : []),
      { key: "all", title: saved.length ? t("recipes.bookmark.allSection") : null, data: toItems(others) },
    ];
  }, [mode, mine.data, shared.data, savedIds.data, search, tags, sort, meals, t]);

  const total = sections.reduce((n, s) => n + s.data.length, 0);
  const query = mode === "mine" ? mine : shared;
  const toggleSet = (set: Set<string>, key: string) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  };
  const switchMode = (m: Mode) => {
    setMode(m);
    setMeals(new Set());
    setTags(new Set());
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 16, gap: 10, paddingBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <SegmentedButtons
            value={mode}
            onValueChange={(v) => switchMode(v as Mode)}
            buttons={[
              { value: "mine", label: t("mobile.recipes.mine") },
              { value: "shared", label: t("recipes.inspirations") },
            ]}
            style={{ flex: 1 }}
          />
          <IconButton
            icon="camera-plus-outline"
            mode="contained-tonal"
            accessibilityLabel={t("mobile.recipes.fromPhoto")}
            onPress={() => router.push("/recipe-photo")}
          />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Searchbar
            value={search}
            onChangeText={setSearch}
            placeholder={mode === "mine" ? t("mobile.recipes.searchMine") : t("mobile.recipes.searchShared")}
            style={{ flex: 1, backgroundColor: theme.colors.surfaceContainerHigh }}
          />
          <View>
            <IconButton
              icon="tune-variant"
              onPress={() => setFiltersOpen(true)}
              accessibilityLabel={t("mobile.recipes.filters")}
            />
            {tags.size > 0 && <Badge style={{ position: "absolute", top: 4, right: 4 }}>{tags.size}</Badge>}
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {mealChips.map((c) => (
            <SelectChip key={c.key} selected={meals.has(c.key)} onPress={() => setMeals((m) => toggleSet(m, c.key))}>
              {c.label}
            </SelectChip>
          ))}
        </ScrollView>
        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {t("mobile.recipes.count", { count: total })} · {t(`recipes.sort.${sort}`)}
        </Text>
      </View>

      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 32 }} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.recipe.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          stickySectionHeadersEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />}
          renderSectionHeader={({ section }) =>
            section.title ? (
              <Text variant="labelLarge" style={{ color: theme.colors.primary, marginTop: 12, marginBottom: 8 }}>
                {section.title}
              </Text>
            ) : null
          }
          renderItem={({ item }) =>
            item.kind === "mine" ? (
              <RecipeCard
                name={item.recipe.name}
                macros={item.recipe.macros}
                tags={item.recipe.tags}
                pendingCount={item.recipe.pendingCount}
                onPress={() => router.push({ pathname: "/recipe/[id]", params: { id: item.recipe.id } })}
              />
            ) : (
              <RecipeCard
                name={item.recipe.name}
                macros={item.recipe.macros}
                tags={item.recipe.tags}
                author={{ name: item.recipe.author_name, avatarUrl: item.recipe.author_avatar_url }}
                saved={savedIds.data?.has(item.recipe.id) ?? false}
                onToggleSaved={() =>
                  toggleSaved.mutate({ recipeId: item.recipe.id, saved: !(savedIds.data?.has(item.recipe.id) ?? false) })
                }
                onPress={() => router.push({ pathname: "/shared/[id]", params: { id: item.recipe.id } })}
              />
            )
          }
          ListEmptyComponent={
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 32 }}>
              {(query.data?.length ?? 0) === 0
                ? mode === "mine"
                  ? t("recipes.empty")
                  : t("recipes.noSharedYet")
                : t("mobile.recipes.noMatches")}
            </Text>
          }
          ListFooterComponent={
            query.isError ? (
              <HelperText type="error" visible>
                {t("errors.loadFailed")}
              </HelperText>
            ) : null
          }
        />
      )}

      <FilterSheet
        visible={filtersOpen}
        onDismiss={() => setFiltersOpen(false)}
        sort={sort}
        onSort={setSort}
        tags={availableTags}
        selectedTags={tags}
        onToggleTag={(tag) => setTags((s) => toggleSet(s, tag))}
        onClear={() => {
          setTags(new Set());
          setSort("name");
        }}
      />
    </View>
  );
}
