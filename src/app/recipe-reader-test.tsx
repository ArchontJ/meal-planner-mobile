// PROTOTYPE (M9 step 3): checks how well on-device OCR + Gemini Nano read real recipe photos.
// Temporary screen with fixed Polish texts – replaced by the real import flow in step 4.
import * as ImagePicker from "expo-image-picker";
import { Stack } from "expo-router";
import { useState } from "react";
import { Image, ScrollView, View } from "react-native";
import { Button, IconButton, ProgressBar, Text } from "react-native-paper";
import { downloadModel, generate, isRecipeReaderAvailable, modelStatus, recognizeText } from "../../modules/recipe-reader";
import { estimateTokens, extractJson, recipePrompt } from "@/features/recipeImport/prompt";
import { useAppTheme } from "@/theme/theme";

type Parsed = {
  name?: string;
  servings?: number;
  source?: string | null;
  meals?: string[];
  tags?: string[];
  ingredients?: { name?: string; amount?: number | null; unit?: string | null; grams?: number | null; original?: string }[];
  instructions?: string[];
};

type Run = {
  ocrMs: number;
  llmMs: number;
  ocrText: string;
  output: string;
  parsed: Parsed | null;
  parseError: string | null;
};

export default function RecipeReaderTest() {
  const theme = useAppTheme();
  const [photos, setPhotos] = useState<string[]>([]);
  const [step, setStep] = useState<string | null>(null);
  const [download, setDownload] = useState<number | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [error, setError] = useState<string | null>(null);
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
      if (status === "unavailable") throw new Error("Gemini Nano jest niedostępny na tym telefonie.");
      if (status !== "available") {
        setStep("Pobieranie modelu…");
        setDownload(0);
        await downloadModel((bytes) => setDownload(bytes));
        setDownload(null);
        status = await modelStatus();
      }

      const t0 = Date.now();
      const texts: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        setStep(`Odczytuję tekst ze zdjęcia ${i + 1}/${photos.length}…`);
        texts.push(await recognizeText(photos[i]!));
      }
      const ocrText = texts.join("\n\n--- następna strona ---\n\n");
      const ocrMs = Date.now() - t0;

      setStep("Gemini Nano układa przepis…");
      const t1 = Date.now();
      const output = await generate(recipePrompt(ocrText), { temperature: 0.1, maxOutputTokens: 3000 });
      const llmMs = Date.now() - t1;

      let parsed: Parsed | null = null;
      let parseError: string | null = null;
      try {
        parsed = JSON.parse(extractJson(output)) as Parsed;
      } catch (e) {
        parseError = e instanceof Error ? e.message : String(e);
      }
      const result = { ocrMs, llmMs, ocrText, output, parsed, parseError };
      setRun(result);
      // Also to logcat (adb) so the results can be compared on the computer.
      console.log("[recipe-reader]", JSON.stringify({ photos: photos.length, ...result }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStep(null);
      setDownload(null);
    }
  };

  const p = run?.parsed;
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

      {run && (
        <View style={{ gap: 10 }}>
          <Text variant="titleMedium">
            Czas: OCR {(run.ocrMs / 1000).toFixed(1)} s · model {(run.llmMs / 1000).toFixed(1)} s · razem{" "}
            {((run.ocrMs + run.llmMs) / 1000).toFixed(1)} s
          </Text>
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Tekst OCR: {run.ocrText.length} znaków, ok. {estimateTokens(recipePrompt(run.ocrText))} tokenów wejścia (limit ~4000)
          </Text>

          {run.parseError ? (
            <Text style={{ color: theme.colors.error }}>JSON niepoprawny: {run.parseError}</Text>
          ) : (
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
                  • {ing.name} — {ing.amount ?? "?"} {ing.unit ?? ""} {ing.grams != null ? `(${ing.grams} g)` : ""}
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
            {showRaw ? "Ukryj" : "Pokaż"} surową odpowiedź modelu
          </Button>
          {showRaw && (
            <Text selectable variant="bodySmall" style={{ fontFamily: "monospace" }}>
              {run.output}
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}
