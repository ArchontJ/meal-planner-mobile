import { onlineManager } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { router, Stack, useNavigation } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Image, ScrollView, View } from "react-native";
import { Button, HelperText, IconButton, ProgressBar, Text } from "react-native-paper";
import { useMealSlots } from "@/features/plan/api";
import { useMyProducts } from "@/features/products/api";
import { toPick, useCatalogCandidates, useSaveImportedRecipe } from "@/features/recipeImport/api";
import { applySuggestions, buildRecipe, draftProblems, initialDraft, type Draft } from "@/features/recipeImport/draft";
import { ReadError, readRecipePhotos, type ReadProgress } from "@/features/recipeImport/read";
import { ReviewForm } from "@/features/recipeImport/ReviewForm";
import { useMyRecipes } from "@/features/recipes/api";
import { MAX_PORTION_GRAMS } from "@/features/recipes/import/build";
import type { RecipeImport } from "@/features/recipes/import/format";
import { normalizeSearch } from "@/lib/search";
import { useAppTheme } from "@/theme/theme";

/**
 * Recipe from a photo (M9): photos of the pages → read on the phone (OCR + Gemini Nano)
 * → review and match products → save like the desktop import. Photos are never stored.
 */
export default function RecipeFromPhoto() {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Draft | null>(null);
  const { data: slots = [] } = useMealSlots();
  const { data: myRows } = useMyProducts();
  const myProducts = useMemo(() => (myRows ?? []).map((p) => toPick(p, false)), [myRows]);
  const { data: myRecipes = [] } = useMyRecipes();
  const save = useSaveImportedRecipe();
  const [saving, setSaving] = useState(false);
  const leaving = useRef(false);

  // Suggestions: the user's own products first, then catalog products for the lines still open.
  // Applied while rendering whenever a product list arrives (React's "adjust state on prop change").
  const openNames = draft?.lines.filter((l) => !l.toTaste && l.choice.kind === "open").map((l) => l.source.name) ?? [];
  const { data: candidates } = useCatalogCandidates(openNames);
  const [suggestedFrom, setSuggestedFrom] = useState<{ mine: unknown; catalog: unknown }>({ mine: null, catalog: null });
  if (draft && (suggestedFrom.mine !== myProducts || suggestedFrom.catalog !== candidates)) {
    setSuggestedFrom({ mine: myProducts, catalog: candidates });
    setDraft({ ...draft, lines: applySuggestions(applySuggestions(draft.lines, myProducts), candidates ?? []) });
  }

  // Ask before throwing away a recipe that was read but not saved.
  const navigation = useNavigation();
  const hasDraft = draft !== null;
  useEffect(() => {
    if (!hasDraft) return;
    return navigation.addListener("beforeRemove", (e) => {
      if (leaving.current) return;
      e.preventDefault();
      Alert.alert(t("mobile.recipePhoto.leaveTitle"), t("mobile.recipePhoto.leaveMessage"), [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("mobile.recipePhoto.discard"),
          style: "destructive",
          onPress: () => {
            leaving.current = true;
            navigation.dispatch(e.data.action);
          },
        },
      ]);
    });
  }, [navigation, hasDraft, t]);

  async function saveAs(name: string) {
    if (!draft) return;
    setSaving(true);
    try {
      const id = await save({ ...buildRecipe(draft, t("recipes.import.toTaste")), name });
      leaving.current = true;
      router.replace({ pathname: "/recipe/[id]", params: { id } });
    } catch (e) {
      Alert.alert(t("mobile.recipePhoto.saveFailed", { message: e instanceof Error ? e.message : String(e) }));
    } finally {
      setSaving(false);
    }
  }

  function onSave() {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) return Alert.alert(t("mobile.recipePhoto.nameRequired"));
    const { open, badGrams } = draftProblems(draft);
    if (badGrams.length > 0) {
      return Alert.alert(
        t("mobile.recipePhoto.badGramsTitle"),
        t("mobile.recipePhoto.badGramsMessage", {
          max: MAX_PORTION_GRAMS,
          names: badGrams.map((l) => (l.choice.kind === "product" ? l.choice.product.name : l.source.name)).join(", "),
        }),
      );
    }
    if (!onlineManager.isOnline()) return Alert.alert(t("mobile.recipePhoto.offlineSave"));

    const withName = () => {
      const isDuplicate = (n: string) => myRecipes.some((r) => normalizeSearch(r.name) === normalizeSearch(n));
      if (!isDuplicate(name)) return void saveAs(name);
      let n = 2;
      while (isDuplicate(`${name} (${n})`)) n++;
      const renamed = `${name} (${n})`;
      Alert.alert(t("recipes.import.duplicateTitle"), t("recipes.import.duplicateDescription", { name, renamed }), [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("recipes.import.saveAs", { name: renamed }), onPress: () => void saveAs(renamed) },
      ]);
    };
    if (open.length === 0) return withName();
    Alert.alert(t("mobile.recipePhoto.openTitle"), t("mobile.recipePhoto.openMessage", { count: open.length }), [
      { text: t("mobile.recipePhoto.back"), style: "cancel" },
      { text: t("mobile.recipePhoto.save"), onPress: withName },
    ]);
  }

  return (
    <>
      <Stack.Screen options={{ title: draft ? t("mobile.recipePhoto.reviewTitle") : t("mobile.recipePhoto.title") }} />
      {draft ? (
        <ReviewForm
          draft={draft}
          setDraft={(change) => setDraft((d) => d && (typeof change === "function" ? change(d) : change))}
          slots={slots}
          myProducts={myProducts}
          saving={saving}
          onSave={onSave}
        />
      ) : (
        <PhotosStep
          onRead={(recipe) => setDraft(initialDraft(recipe, slots))}
        />
      )}
    </>
  );
}

function PhotosStep({ onRead }: { onRead: (recipe: RecipeImport) => void }) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const [photos, setPhotos] = useState<string[]>([]);
  const [progress, setProgress] = useState<ReadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reading = progress !== null;

  async function addFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return setError(t("mobile.recipePhoto.cameraDenied"));
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.9 });
    if (!res.canceled) setPhotos((p) => [...p, ...res.assets.map((a) => a.uri)]);
  }
  async function addFromGallery() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, quality: 0.9 });
    if (!res.canceled) setPhotos((p) => [...p, ...res.assets.map((a) => a.uri)]);
  }

  async function read() {
    setError(null);
    setProgress({ phase: "ocr", page: 1, pages: photos.length });
    try {
      onRead(await readRecipePhotos(photos, t("mobile.recipePhoto.untitled"), setProgress));
    } catch (e) {
      setError(
        e instanceof ReadError
          ? t(`mobile.recipePhoto.errors.${e.code}`)
          : t("mobile.recipePhoto.errors.generic", { message: e instanceof Error ? e.message : String(e) }),
      );
    } finally {
      setProgress(null);
    }
  }

  const progressText = !progress
    ? null
    : progress.phase === "download"
      ? t("mobile.recipePhoto.downloading")
      : progress.phase === "ocr"
        ? t("mobile.recipePhoto.ocr", { page: progress.page, pages: progress.pages })
        : t("mobile.recipePhoto.model", { done: Math.min(progress.done + 1, progress.total), total: progress.total });
  const progressValue = progress?.phase === "model" ? progress.done / Math.max(1, progress.total) : undefined;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        {t("mobile.recipePhoto.photosHint")}
      </Text>
      <ScrollView horizontal contentContainerStyle={{ gap: 10, paddingTop: 6 }}>
        {photos.map((uri, i) => (
          <View key={uri}>
            <Image source={{ uri }} style={{ width: 96, height: 128, borderRadius: 12 }} />
            {!reading && (
              <IconButton
                icon="close"
                size={16}
                mode="contained"
                style={{ position: "absolute", top: -10, right: -10 }}
                onPress={() => setPhotos((ps) => ps.filter((_, j) => j !== i))}
                accessibilityLabel={t("mobile.recipePhoto.removePhoto", { n: i + 1 })}
              />
            )}
            <Text variant="labelSmall" style={{ textAlign: "center", marginTop: 2 }}>
              {t("mobile.recipePhoto.page", { n: i + 1 })}
            </Text>
          </View>
        ))}
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button mode="outlined" icon="camera" onPress={() => void addFromCamera()} disabled={reading} style={{ flex: 1 }}>
          {t("mobile.recipePhoto.addPhoto")}
        </Button>
        <Button mode="outlined" icon="image-multiple" onPress={() => void addFromGallery()} disabled={reading} style={{ flex: 1 }}>
          {t("mobile.recipePhoto.gallery")}
        </Button>
      </View>
      {photos.length > 0 && (
        <Button mode="contained" icon="text-recognition" onPress={() => void read()} loading={reading} disabled={reading}>
          {t("mobile.recipePhoto.read", { count: photos.length })}
        </Button>
      )}
      {progressText ? (
        <View style={{ gap: 6, backgroundColor: theme.colors.surfaceContainerLow, borderRadius: 12, padding: 12 }}>
          <ProgressBar progress={progressValue} indeterminate={progressValue === undefined} />
          <Text variant="bodyMedium">{progressText}</Text>
          {progress?.phase === "download" && progress.bytes !== null && (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {t("mobile.recipePhoto.downloadedMb", { mb: Math.round(progress.bytes / 1024 / 1024) })}
            </Text>
          )}
        </View>
      ) : (
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {t("mobile.recipePhoto.offlineNote")}
        </Text>
      )}
      {error && <HelperText type="error">{error}</HelperText>}
    </ScrollView>
  );
}
