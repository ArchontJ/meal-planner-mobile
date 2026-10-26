// Photos → recipe in the desktop's import format, entirely on the phone:
// ML Kit OCR per page, then Gemini Nano in several short requests (reader.ts).
import { downloadModel, generate, isRecipeReaderAvailable, modelStatus, recognizeBlocks } from "../../../modules/recipe-reader";
import { pageText } from "@/features/recipeImport/layout";
import { readRecipe, type ReadRecipe } from "@/features/recipeImport/reader";
import { recipeImportSchema, type RecipeImport } from "@/features/recipes/import/format";

export type ReadProgress =
  | { phase: "download"; bytes: number | null }
  | { phase: "ocr"; page: number; pages: number }
  | { phase: "model"; done: number; total: number };

/** Why reading failed; the screen shows a matching message. */
export class ReadError extends Error {
  constructor(readonly code: "unsupported" | "downloadFailed" | "noText" | "nothingFound") {
    super(code);
  }
}

export const PAGE_SEPARATOR = "\n\n--- następna strona ---\n\n";

/** Fits the reader's output to the import format's limits and checks it like a pasted JSON. */
function toImport(read: ReadRecipe, untitled: string): RecipeImport | null {
  const cut = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
  const result = recipeImportSchema.safeParse({
    ...read,
    name: cut(read.name.trim() || untitled, 200),
    ingredients: read.ingredients
      .filter((i) => i.name.trim())
      .slice(0, 100)
      .map((i) => ({ ...i, name: cut(i.name, 200), unit: i.unit && cut(i.unit, 40), original: cut(i.original, 300) })),
    instructions: read.instructions.slice(0, 100).map((s) => cut(s, 5000)),
  });
  return result.success ? result.data : null;
}

/** `untitled` names the recipe when the photos show no title. */
export async function readRecipePhotos(
  photos: string[],
  untitled: string,
  onProgress: (p: ReadProgress) => void,
): Promise<RecipeImport> {
  if (!isRecipeReaderAvailable) throw new ReadError("unsupported");
  const status = await modelStatus();
  if (status === "unavailable") throw new ReadError("unsupported");
  if (status !== "available") {
    onProgress({ phase: "download", bytes: null });
    try {
      await downloadModel((bytes) => onProgress({ phase: "download", bytes: bytes >= 0 ? bytes : null }));
    } catch {
      throw new ReadError("downloadFailed");
    }
  }

  const pages: string[] = [];
  for (let i = 0; i < photos.length; i++) {
    onProgress({ phase: "ocr", page: i + 1, pages: photos.length });
    pages.push(pageText(await recognizeBlocks(photos[i]!)));
  }
  const ocrText = pages.join(PAGE_SEPARATOR);
  if (ocrText.replace(/\s/g, "").length < 20) throw new ReadError("noText");

  onProgress({ phase: "model", done: 0, total: 1 });
  const { recipe } = await readRecipe(ocrText, generate, (done, total) => onProgress({ phase: "model", done, total }));
  const parsed = toImport(recipe, untitled);
  if (!parsed) throw new ReadError("nothingFound");
  return parsed;
}
