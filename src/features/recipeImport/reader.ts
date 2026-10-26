// Reads a recipe from OCR text with Gemini Nano in several short requests: the Prompt API
// version usable with Expo SDK 57 (beta2) caps one answer at 256 tokens, which a whole
// recipe never fits. Each request has a small, simple job; the phone assembles the result
// in the desktop's import format ("mealplanner-recipe", version 1).

const MAX_TOKENS = 256;
const INGREDIENT_BATCH = 6; // lines per request
const STEP_CHUNK_WORDS = 100; // words of method text per request

export type ReaderIngredient = {
  name: string;
  amount: number | null;
  unit: string | null;
  grams: number | null;
  original: string;
  note: null;
};

export type ReadRecipe = {
  format: "mealplanner-recipe";
  version: 1;
  name: string;
  servings: number | null;
  source: string | null;
  serveWith: null;
  tags: string[];
  meals: string[];
  ingredients: ReaderIngredient[];
  instructions: string[];
};

export type ReaderCall = { kind: "overview" | "ingredients" | "steps"; ms: number; output: string };
export type Generate = (prompt: string, opts: { temperature: number; maxOutputTokens: number }) => Promise<string>;

const MEAL_KEYS = ["breakfast", "second_breakfast", "lunch", "dessert", "supper"];

/** "1-4, 7, 9-12" → [1,2,3,4,7,9,10,11,12] (1-based, clamped to the text). */
function parseRanges(value: string, max: number): number[] {
  const out: number[] = [];
  for (const part of value.split(/[,;]/)) {
    const m = /(\d+)\s*(?:[-–]\s*(\d+))?/.exec(part);
    if (!m) continue;
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    for (let i = Math.max(1, Math.min(a, b)); i <= Math.min(max, Math.max(a, b)); i++) if (!out.includes(i)) out.push(i);
  }
  return out;
}

const num = (s: string | undefined): number | null => {
  if (!s) return null;
  const n = Number(s.replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const clean = (s: string | undefined) => {
  const v = (s ?? "").trim();
  return !v || /^(brak|null|-|—|nie)$/i.test(v) ? null : v;
};
const field = (text: string, label: string) => new RegExp(`^\\s*${label}\\s*:\\s*(.*)$`, "im").exec(text)?.[1]?.trim();

function overviewPrompt(numbered: string): string {
  return `Poniżej jest przepis odczytany ze zdjęć (OCR), z numerami linii. Odpowiedz TYLKO tymi 7 liniami, po polsku:
NAZWA: nazwa potrawy
PORCJE: liczba porcji (oszacuj, jeśli jej brak)
ŹRÓDŁO: tytuł książki lub strony albo brak
POSIŁKI: pasujące z breakfast, second_breakfast, lunch, dessert, supper (po przecinku) albo brak
TAGI: 0–3 krótkie tagi małymi literami albo brak
SKŁADNIKI: numery linii ze składnikami, np. 4-15
KROKI: numery linii z opisem przygotowania, np. 17-30

Tekst:
${numbered}`;
}

function ingredientsPrompt(lines: string[]): string {
  return `Zamień każdą linię składnika na jedną linię w formacie:
nazwa | ilość | jednostka | gramy
- nazwa: sam produkt po polsku w mianowniku (np. masło, mąka pszenna, jajko)
- ilość: liczba albo -
- jednostka: g, kg, dag, ml, l, łyżka, łyżeczka, szklanka, szt., szczypta, opakowanie albo -
- gramy: szacunkowa waga w gramach albo -
Jeśli linia nie jest składnikiem, pomiń ją. Odpowiedz tylko liniami w tym formacie.

Linie:
${lines.join("\n")}`;
}

function stepsPrompt(text: string): string {
  return `Przepisz poniższy opis przygotowania jako kolejne kroki po polsku (przetłumacz, jeśli trzeba). Każdy krok w osobnej linii zaczynającej się od "- ". Popraw oczywiste błędy odczytu, nic nie dodawaj.

Opis:
${text}`;
}

/** Joins wrapped OCR lines and splits the method into chunks of about STEP_CHUNK_WORDS words. */
function stepChunks(lines: string[]): string[] {
  const words = lines.join(" ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const chunks: string[] = [];
  let current: string[] = [];
  for (const w of words) {
    current.push(w);
    // Prefer to cut after a sentence once the chunk is long enough.
    if (current.length >= STEP_CHUNK_WORDS && /[.!?]$/.test(w)) {
      chunks.push(current.join(" "));
      current = [];
    } else if (current.length >= STEP_CHUNK_WORDS * 1.4) {
      chunks.push(current.join(" "));
      current = [];
    }
  }
  if (current.length) chunks.push(current.join(" "));
  return chunks;
}

export async function readRecipe(
  ocrText: string,
  generate: Generate,
  onProgress?: (done: number, total: number) => void,
): Promise<{ recipe: ReadRecipe; calls: ReaderCall[] }> {
  const calls: ReaderCall[] = [];
  const run = async (kind: ReaderCall["kind"], prompt: string) => {
    const t = Date.now();
    const output = await generate(prompt, { temperature: 0.1, maxOutputTokens: MAX_TOKENS });
    calls.push({ kind, ms: Date.now() - t, output });
    return output;
  };

  const lines = ocrText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const numbered = lines.map((l, i) => `${i + 1}: ${l}`).join("\n");

  // 1. Overview: metadata and where the ingredients and the method are.
  onProgress?.(0, 1);
  const overview = await run("overview", overviewPrompt(numbered));
  const ingredientLines = parseRanges(field(overview, "SKŁADNIKI") ?? "", lines.length).map((n) => lines[n - 1]!);
  const stepLines = parseRanges(field(overview, "KROKI") ?? "", lines.length).map((n) => lines[n - 1]!);

  const ingredientBatches: string[][] = [];
  for (let i = 0; i < ingredientLines.length; i += INGREDIENT_BATCH) ingredientBatches.push(ingredientLines.slice(i, i + INGREDIENT_BATCH));
  const chunks = stepChunks(stepLines);
  const total = 1 + ingredientBatches.length + chunks.length;
  let done = 1;
  onProgress?.(done, total);

  // 2. Ingredients in small batches.
  const ingredients: ReaderIngredient[] = [];
  for (const batch of ingredientBatches) {
    const out = await run("ingredients", ingredientsPrompt(batch));
    const rows = out
      .split("\n")
      .map((l) => l.replace(/^[-*•\d.)\s]+/, "").trim())
      .filter((l) => l.includes("|"));
    rows.forEach((row, i) => {
      const [name, amount, unit, grams] = row.split("|").map((p) => p.trim());
      if (!clean(name)) return;
      ingredients.push({
        name: clean(name)!,
        amount: num(amount),
        unit: clean(unit),
        grams: num(grams),
        // The batch line it most likely came from (rows follow the input order).
        original: batch[Math.min(i, batch.length - 1)] ?? name!,
        note: null,
      });
    });
    onProgress?.(++done, total);
  }

  // 3. Method in chunks.
  const instructions: string[] = [];
  for (const chunk of chunks) {
    const out = await run("steps", stepsPrompt(chunk));
    for (const line of out.split("\n")) {
      const step = line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim();
      if (step) instructions.push(step);
    }
    onProgress?.(++done, total);
  }

  const meals = (field(overview, "POSIŁKI") ?? "")
    .split(/[,;\s]+/)
    .map((m) => m.trim().toLowerCase())
    .filter((m) => MEAL_KEYS.includes(m));
  const tags = (clean(field(overview, "TAGI")) ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 3);

  return {
    calls,
    recipe: {
      format: "mealplanner-recipe",
      version: 1,
      name: clean(field(overview, "NAZWA")) ?? "",
      servings: num(field(overview, "PORCJE")),
      source: clean(field(overview, "ŹRÓDŁO") ?? field(overview, "ZRODLO")),
      serveWith: null,
      tags,
      meals,
      ingredients,
      instructions,
    },
  };
}
