import { requireOptionalNativeModule } from "expo";

type EventSubscription = { remove(): void };

export type ModelStatus = "available" | "downloadable" | "downloading" | "unavailable";

type Native = {
  recognizeText(uri: string): Promise<string>;
  modelStatus(): Promise<ModelStatus>;
  modelStatusRaw(): Promise<number>;
  downloadModel(): Promise<boolean>;
  generate(prompt: string, temperature: number, maxOutputTokens: number): Promise<string>;
  addListener(event: "onDownloadProgress", listener: (e: { bytes: number; status: string }) => void): EventSubscription;
};

// Android only; null where the native module is missing (e.g. an old build).
const native = requireOptionalNativeModule<Native>("RecipeReader");

export const isRecipeReaderAvailable = native !== null;

function get(): Native {
  if (!native) throw new Error("RecipeReader native module is not available in this build");
  return native;
}

/** On-device OCR (ML Kit, Latin script) of one photo. */
export const recognizeText = (uri: string) => get().recognizeText(uri);

/** Whether Gemini Nano can run on this phone, and whether it still has to be downloaded. */
export const modelStatus = () => get().modelStatus();

/** Raw AICore FeatureStatus number (diagnostics). */
export const modelStatusRaw = () => get().modelStatusRaw();

/** onProgress gets bytes (-1 for non-progress events) and AICore's status text. */
export function downloadModel(onProgress?: (bytes: number, status: string) => void): Promise<boolean> {
  const sub = onProgress ? get().addListener("onDownloadProgress", (e) => onProgress(e.bytes, e.status)) : null;
  return get()
    .downloadModel()
    .finally(() => sub?.remove());
}

/** One prompt to Gemini Nano on the device. */
export const generate = (prompt: string, opts: { temperature?: number; maxOutputTokens?: number } = {}) =>
  get().generate(prompt, opts.temperature ?? 0.1, opts.maxOutputTokens ?? 3000);
