// PROTOTYPE (M9 step 3): checks how well on-device OCR + Gemini Nano read real recipe photos.
// Temporary screen with fixed Polish texts – replaced by the real import flow in step 4.
import * as ImagePicker from "expo-image-picker";
import { Stack } from "expo-router";
import { useState } from "react";
import { Image, ScrollView, View } from "react-native";
import { Button, IconButton, ProgressBar, Text } from "react-native-paper";
import { downloadModel, generate, isRecipeReaderAvailable, modelStatus, modelStatusRaw, recognizeBlocks, type TextBlock } from "../../modules/recipe-reader";
import { pageText } from "@/features/recipeImport/layout";
import { estimateTokens } from "@/features/recipeImport/prompt";
import { readRecipe, type ReadRecipe, type ReaderCall } from "@/features/recipeImport/reader";
import { useAppTheme } from "@/theme/theme";

type Run = {
  ocrMs: number;
  llmMs: number;
  ocrText: string;
  calls: ReaderCall[];
  recipe: ReadRecipe;
};

const formatAmount = (n: number) => n.toLocaleString("pl-PL", { maximumFractionDigits: 2 });

export default function RecipeReaderTest() {
  const theme = useAppTheme();
  const [photos, setPhotos] = useState<string[]>([]);
  const [step, setStep] = useState<string | null>(null);
  const [download, setDownload] = useState<number | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diag, setDiag] = useState<string[]>([]);
  const log = (line: string) => {
    const stamped = `${new Date().toLocaleTimeString()} ${line}`;
    console.log("[recipe-reader-diag]", stamped);
    setDiag((d) => [...d.slice(-30), stamped]);
  };
  const [showOcr, setShowOcr] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const addFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.9 });
    if (!res.canceled) setPhotos((p) => [...p, ...res.assets.map((a) => a.uri)]);
  };
  const addFromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, quality: 0.9 });
    if (!res.canceled) setPhotos((p) => [...p, ...res.assets.map((a) => a.uri)]);
  };

  const read = async () => {
    setError(null);
    setRun(null);
    try {
      setStep("Sprawdzam model…");
      let status = await modelStatus();
      log(`status: ${status} (raw ${await modelStatusRaw()})`);
      if (status === "unavailable") throw new Error("Gemini Nano jest niedostępny na tym telefonie.");
      if (status !== "available") {
        setStep("Pobieranie modelu…");
        setDownload(0);
        log("download() start");
        await downloadModel((bytes, s) => {
          if (bytes >= 0) setDownload(bytes);
          log(`download event: ${s}`);
        });
        log("download() finished");
        setDownload(null);
        status = await modelStatus();
        log(`status after download: ${status}`);
      }

      const t0 = Date.now();
      const texts: string[] = [];
      const pages: TextBlock[][] = [];
      for (let i = 0; i < photos.length; i++) {
        setStep(`Odczytuję tekst ze zdjęcia ${i + 1}/${photos.length}…`);
        const blocks = await recognizeBlocks(photos[i]!);
        pages.push(blocks);
        texts.push(pageText(blocks));
      }
      const ocrText = texts.join("\n\n--- następna strona ---\n\n");
      const ocrMs = Date.now() - t0;

      setStep("Gemini Nano: przegląd przepisu…");
      const t1 = Date.now();
      const { recipe, calls } = await readRecipe(ocrText, generate, (done, total) =>
        setStep(`Gemini Nano: zapytanie ${Math.min(done + 1, total)}/${total}…`),
      );
      const llmMs = Date.now() - t1;
      const result = { ocrMs, llmMs, ocrText, calls, recipe };
      setRun(result);
      // Also to logcat (adb) so the results can be compared on the computer.
      // Logcat keeps at most ~4 KB per line: split the JSON into numbered parts.
      const json = JSON.stringify({ photos: photos.length, ...result, pages });
      const parts = Math.ceil(json.length / 3000);
      for (let i = 0; i < parts; i++) console.log(`[recipe-reader] ${i + 1}/${parts} ${json.slice(i * 3000, (i + 1) * 3000)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      log(`error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setStep(null);
      setDownload(null);
    }
  };

  const p = run?.recipe;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}>
      <Stack.Screen options={{ title: "Prototyp: przepis ze zdjęcia" }} />
      {!isRecipeReaderAvailable && <Text style={{ color: theme.colors.error }}>Brak modułu natywnego w tej wersji aplikacji.</Text>}

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button mode="outlined" icon="camera" onPress={() => void addFromCamera()} style={{ flex: 1 }}>
          Zdjęcie
        </Button>
        <Button mode="outlined" icon="image-multiple" onPress={() => void addFromGallery()} style={{ flex: 1 }}>
          Z galerii
        </Button>
      </View>

      {photos.length > 0 && (
        <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
          {photos.map((uri, i) => (
            <View key={uri}>
              <Image source={{ uri }} style={{ width: 90, height: 120, borderRadius: 8 }} />
              <IconButton
                icon="close"
                size={16}
                mode="contained"
                style={{ position: "absolute", top: -4, right: -4 }}
                onPress={() => setPhotos((ps) => ps.filter((_, j) => j !== i))}
              />
              <Text variant="labelSmall" style={{ textAlign: "center" }}>
                {i + 1}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      <Button mode="contained" icon="text-recognition" disabled={photos.length === 0 || step !== null} onPress={() => void read()}>
        Odczytaj przepis ({photos.length} {photos.length === 1 ? "zdjęcie" : "zdjęć"})
      </Button>

      {step && <Text>{step}</Text>}
      {download !== null && (
        <>
          <ProgressBar indeterminate />
          <Text variant="labelSmall">{(download / 1024 / 1024).toFixed(0)} MB</Text>
        </>
      )}
      {error && <Text style={{ color: theme.colors.error }}>{error}</Text>}
      {diag.length > 0 && (
        <View style={{ backgroundColor: theme.colors.surfaceContainerLow, borderRadius: 8, padding: 8 }}>
          <Text variant="labelMedium">Diagnostyka modelu</Text>
          {diag.map((line, i) => (
            <Text key={i} selectable variant="labelSmall" style={{ fontFamily: "monospace" }}>
              {line}
            </Text>
          ))}
        </View>
      )}

      {run && (
        <View style={{ gap: 10 }}>
          <Text variant="titleMedium">
            Czas: OCR {(run.ocrMs / 1000).toFixed(1)} s · model {(run.llmMs / 1000).toFixed(1)} s · razem{" "}
            {((run.ocrMs + run.llmMs) / 1000).toFixed(1)} s
          </Text>
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Tekst OCR: {run.ocrText.length} znaków, ok. {estimateTokens(run.ocrText)} tokenów · zapytań do modelu: {run.calls.length}
          </Text>

          {(
            <View style={{ gap: 6, backgroundColor: theme.colors.surfaceContainerLow, borderRadius: 12, padding: 12 }}>
              <Text variant="titleLarge">{p?.name ?? "(brak nazwy)"}</Text>
              <Text variant="bodyMedium">
                Porcje: {p?.servings ?? "?"} · posiłki: {(p?.meals ?? []).join(", ") || "–"} · tagi: {(p?.tags ?? []).join(", ") || "–"}
              </Text>
              {p?.source ? <Text variant="bodyMedium">Źródło: {p.source}</Text> : null}
              <Text variant="titleSmall" style={{ marginTop: 6 }}>
                Składniki ({p?.ingredients?.length ?? 0})
              </Text>
              {(p?.ingredients ?? []).map((ing, i) => (
                <Text key={i} variant="bodyMedium">
                  • {ing.name} — {ing.amount != null ? formatAmount(ing.amount) : "?"} {ing.unit ?? ""} {ing.grams != null ? `(${ing.grams} g)` : ""}
                  {"\n"}
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {ing.original}
                  </Text>
                </Text>
              ))}
              <Text variant="titleSmall" style={{ marginTop: 6 }}>
                Kroki ({p?.instructions?.length ?? 0})
              </Text>
              {(p?.instructions ?? []).map((s, i) => (
                <Text key={i} variant="bodyMedium">
                  {i + 1}. {s}
                </Text>
              ))}
            </View>
          )}

          <Button mode="text" onPress={() => setShowOcr((v) => !v)}>
            {showOcr ? "Ukryj" : "Pokaż"} tekst z OCR
          </Button>
          {showOcr && (
            <Text selectable variant="bodySmall" style={{ fontFamily: "monospace" }}>
              {run.ocrText}
            </Text>
          )}
          <Button mode="text" onPress={() => setShowRaw((v) => !v)}>
            {showRaw ? "Ukryj" : "Pokaż"} odpowiedzi modelu ({run.calls.length})
          </Button>
          {showRaw &&
            run.calls.map((c, i) => (
              <View key={i} style={{ gap: 2 }}>
                <Text variant="labelMedium">
                  {i + 1}. {c.kind} · {(c.ms / 1000).toFixed(1)} s
                </Text>
                <Text selectable variant="bodySmall" style={{ fontFamily: "monospace" }}>
                  {c.output}
                </Text>
              </View>
            ))}
        </View>
      )}
    </ScrollView>
  );
}
