import { onlineManager } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { ActivityIndicator, Divider, HelperText, List, Text, TextInput } from "react-native-paper";
import { BottomSheet } from "@/components/BottomSheet";
import { useCatalogSearch, type PickProduct } from "@/features/recipeImport/api";
import { spellings } from "@/features/recipeImport/layout";
import type { Line } from "@/features/recipeImport/draft";
import { linePortionGrams, MAX_PORTION_GRAMS } from "@/features/recipes/import/build";
import { formatNumber, parseDecimal } from "@/lib/format";
import { normalizeSearch } from "@/lib/search";
import { useAppTheme } from "@/theme/theme";

type Props = {
  line: Line | null;
  servings: number;
  myProducts: PickProduct[];
  onChoose: (product: PickProduct) => void;
  onGrams: (grams: number | null) => void;
  onNewProduct: () => void;
  onLeavePending: () => void;
  onRemove: () => void;
  onClose: () => void;
};

/**
 * One imported line: its grams per portion and which product it is.
 * The parent gives it key={line key}, so the search and grams start fresh for every line.
 */
export function IngredientSheet({ line, servings, myProducts, onChoose, onGrams, onNewProduct, onLeavePending, onRemove, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const theme = useAppTheme();
  const [query, setQuery] = useState(line?.source.name ?? "");
  const [gramsText, setGramsText] = useState(() => {
    const grams = line ? linePortionGrams(line, servings) : null;
    return grams === null ? "" : formatNumber(grams, i18n.language, 1).replace(/\s/g, "");
  });

  const catalog = useCatalogSearch(line ? query : "");
  const mine = useMemo(() => {
    const terms = spellings(normalizeSearch(query.trim())).map(normalizeSearch);
    if (!terms[0]) return [];
    return myProducts.filter((p) => terms.some((term) => normalizeSearch(`${p.name} ${p.producer ?? ""}`).includes(term))).slice(0, 20);
  }, [query, myProducts]);
  const mineIds = new Set(myProducts.map((p) => p.id));
  const fromCatalog = (catalog.data ?? []).filter((p) => !mineIds.has(p.id));

  const grams = parseDecimal(gramsText);
  const gramsError = gramsText.trim() !== "" && !(grams > 0 && grams <= MAX_PORTION_GRAMS);
  const commitGrams = () => {
    if (gramsText.trim() === "") onGrams(null);
    else if (!gramsError) onGrams(grams);
  };

  const row = (p: PickProduct, label: string) => (
    <List.Item
      key={p.id}
      title={p.name}
      description={[p.producer, label, t("mobile.recipePhoto.sheet.per100", { kcal: formatNumber(p.kcal, i18n.language, 0) })]
        .filter(Boolean)
        .join(" · ")}
      onPress={() => {
        commitGrams();
        onChoose(p);
      }}
      left={(props) =>
        line?.choice.kind === "product" && line.choice.product.id === p.id ? <List.Icon {...props} icon="check" color={theme.colors.primary} /> : null
      }
      style={{ paddingHorizontal: 0 }}
    />
  );

  return (
    <BottomSheet
      visible={line !== null}
      title={line?.source.name}
      onClose={() => {
        commitGrams();
        onClose();
      }}
    >
      {line && (
        <>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {t("mobile.recipePhoto.sheet.fromRecipe", { line: line.source.original })}
          </Text>
          <TextInput
            mode="outlined"
            label={t("mobile.recipePhoto.sheet.grams")}
            value={gramsText}
            onChangeText={setGramsText}
            onBlur={commitGrams}
            keyboardType="decimal-pad"
            right={<TextInput.Affix text="g" />}
            error={gramsError}
          />
          {gramsError && <HelperText type="error">{t("recipes.import.badGrams_one", { count: 1, max: MAX_PORTION_GRAMS })}</HelperText>}
          <TextInput
            mode="outlined"
            label={t("mobile.recipePhoto.sheet.search")}
            value={query}
            onChangeText={setQuery}
            left={<TextInput.Icon icon="magnify" />}
          />
          <View>
            {mine.map((p) => row(p, t("mobile.recipePhoto.mine")))}
            {fromCatalog.map((p) => row({ ...p, isCatalog: true }, t("mobile.recipePhoto.catalog")))}
            {catalog.isFetching && <ActivityIndicator style={{ marginVertical: 8 }} />}
            {!onlineManager.isOnline() && (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {t("mobile.recipePhoto.sheet.catalogOffline")}
              </Text>
            )}
            {!catalog.isFetching && mine.length === 0 && fromCatalog.length === 0 && query.trim().length >= 2 && (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginVertical: 8 }}>
                {t("mobile.recipePhoto.sheet.noResults")}
              </Text>
            )}
          </View>
          <Divider />
          <List.Item
            title={t("mobile.recipePhoto.sheet.newProduct")}
            left={(props) => <List.Icon {...props} icon="plus" />}
            onPress={() => {
              commitGrams();
              onNewProduct();
            }}
            style={{ paddingHorizontal: 0 }}
          />
          <List.Item
            title={t("mobile.recipePhoto.sheet.leavePending")}
            left={(props) => <List.Icon {...props} icon="clock-outline" />}
            onPress={() => {
              commitGrams();
              onLeavePending();
            }}
            style={{ paddingHorizontal: 0 }}
          />
          <List.Item
            title={t("mobile.recipePhoto.sheet.remove")}
            titleStyle={{ color: theme.colors.error }}
            left={(props) => <List.Icon {...props} icon="delete-outline" color={theme.colors.error} />}
            onPress={onRemove}
            style={{ paddingHorizontal: 0 }}
          />
        </>
      )}
    </BottomSheet>
  );
}
