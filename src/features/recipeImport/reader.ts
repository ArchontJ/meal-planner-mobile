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

const UNICODE_FRACTIONS: Record<string, number> = { "½": 0.5, "⅓": 1 / 3, "⅔": 2 / 3, "¼": 0.25, "¾": 0.75 };

/** "2", "1,5", "1/2", "1 1/2", "½", "1½" → number; anything else → null. */
export function num(s: string | undefined): number | null {
  if (!s) return null;
  let v = s.trim().replace(",", ".");
  const uni = /(\d*)\s*([½⅓⅔¼¾])/.exec(v);
  if (uni) return (uni[1] ? Number(uni[1]) : 0) + UNICODE_FRACTIONS[uni[2]!]!;
  const mixed = /^(\d+)\s+(\d+)\s*\/\s*(\d+)/.exec(v);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = /^(\d+)\s*\/\s*(\d+)/.exec(v);
  if (frac) return Number(frac[2]) > 0 ? Number(frac[1]) / Number(frac[2]) : null;
  v = v.replace(/[^\d.]/g, "");
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** "(60 g)", "(5 9)" (OCR reads g as 9), "(1,5 kg)" in the source line: the cookbook's own weight. */
export function gramsInLine(line: string): number | null {
  const m = /\((\d+(?:[.,]\d+)?)\s*(kg|dag|g|9)\s*\)/i.exec(line);
  if (!m) return null;
  const n = Number(m[1]!.replace(",", "."));
  const unit = m[2]!.toLowerCase();
  return unit === "kg" ? n * 1000 : unit === "dag" ? n * 10 : n;
}

/** OCR splits long ingredient lines; join a line onto the previous one when it clearly continues it. */
export function joinWrappedLines(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const prev = out.at(-1);
    const continues =
      prev !== undefined &&
      (/[-–,(]$/.test(prev) ||
        /^(i|lub|oraz|albo)\s/i.test(line) ||
        // "szalotka posiekana" + "1 łyżeczka (5 g)"; but not lists written amount-first ("2 jajka", "200 g mąki").
        (/^[\d½⅓¼¾(]/.test(line) && !/\d/.test(prev)));
    if (continues) out[out.length - 1] = `${prev} ${line}`;
    else out.push(line);
  }
  return out;
}

const words = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);

/** The source line an answer row belongs to: the one sharing most words with the product name. */
function sourceLine(name: string, batch: string[], fallback: number): string {
  const nameWords = words(name);
  let best = -1;
  let bestScore = 0;
  batch.forEach((line, i) => {
    const lw = words(line);
    const score = nameWords.filter((w) => lw.some((x) => x.startsWith(w.slice(0, 4)))).length;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return batch[best >= 0 ? best : Math.min(fallback, batch.length - 1)] ?? name;
}
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
- nazwa: sam produkt po polsku w mianowniku, bez opisu przygotowania (np. "cebula", nie "cebula posiekana"); popraw błędy odczytu (np. "tagodna" → "łagodna")
- ilość: liczba albo -
- jednostka: g, kg, dag, ml, l, łyżka, łyżeczka, szklanka, szt., szczypta, opakowanie albo -
- gramy: szacunkowa waga w gramach albo -
Jeśli linia nie jest składnikiem, pomiń ją. Odpowiedz tylko liniami w tym formacie.

Linie:
${lines.join("\n")}`;
}

function stepsPrompt(text: string): string {
  return `Przepisz poniższy opis przygotowania jako kolejne kroki po polsku (przetłumacz, jeśli trzeba). Każdy krok w osobnej linii zaczynającej się od "- ". Popraw błędy odczytu i literówki (np. "Mieszany" → "Mieszamy"), nic nie dodawaj.

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

const capitalize = (t: string) => t.charAt(0).toLocaleUpperCase("pl") + t.slice(1);

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
  const ingredientLines = joinWrappedLines(
    parseRanges(field(overview, "SKŁADNIKI") ?? "", lines.length).map((n) => lines[n - 1]!),
  );
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
      const original = sourceLine(name!, batch, i);
      ingredients.push({
        name: clean(name)!,
        amount: num(amount),
        unit: clean(unit),
        grams: gramsInLine(original) ?? num(grams),
        original,
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
      name: capitalize(clean(field(overview, "NAZWA")) ?? ""),
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
