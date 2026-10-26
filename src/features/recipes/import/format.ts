// The recipe import format ("mealplanner-recipe", version 1), usually written by
// an AI chat from the instructions in prompt.ts and pasted into the import wizard.
import { z } from "zod";

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);
const positive = (max: number) => z.number().positive().max(max).nullish().transform((v) => v ?? null);

const ingredientSchema = z.object({
  /** Basic form (nominative), used to look the product up. */
  name: text(200),
  amount: positive(100_000),
  unit: optionalText(40),
  /** Estimated grams for the WHOLE recipe (before dividing by servings). */
  grams: positive(100_000),
  /** The line as written in the source. */
  original: text(300),
  note: optionalText(300),
});

export const recipeImportSchema = z.object({
  format: z.literal("mealplanner-recipe"),
  version: z.literal(1),
  name: text(200),
  servings: positive(100),
  source: optionalText(2000),
  serveWith: optionalText(500),
  tags: z.array(z.string()).max(100).nullish().transform((v) => v ?? []),
  meals: z.array(z.string()).max(20).nullish().transform((v) => v ?? []),
  ingredients: z.array(ingredientSchema).min(1).max(100),
  instructions: z.array(text(5000)).min(1).max(100),
});

export type RecipeImport = z.output<typeof recipeImportSchema>;
export type ImportedIngredient = RecipeImport["ingredients"][number];

/** Where a problem is: the path in the JSON, e.g. ["ingredients", 2, "original"]. */
export type ImportProblem =
  | { kind: "json"; message: string }
  | { kind: "field"; path: (string | number)[]; missing: boolean };

export type ParseResult = { ok: true; recipe: RecipeImport } | { ok: false; problems: ImportProblem[] };

/** AI chats often wrap JSON in a ```json … ``` block or add a sentence around it. */
export function extractJson(input: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(input);
  const body = fenced ? fenced[1]! : input;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  return start >= 0 && end > start ? body.slice(start, end + 1) : body.trim();
}

export function parseRecipeImport(input: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(extractJson(input));
  } catch (e) {
    return { ok: false, problems: [{ kind: "json", message: e instanceof Error ? e.message : String(e) }] };
  }
  const result = recipeImportSchema.safeParse(data, { reportInput: true });
  if (result.success) return { ok: true, recipe: result.data };
  return {
    ok: false,
    problems: result.error.issues.slice(0, 10).map((issue) => ({
      kind: "field",
      path: issue.path.filter((p): p is string | number => typeof p !== "symbol"),
      missing: issue.code === "invalid_type" && issue.input === undefined,
    })),
  };
}

export const MEAL_KEYS = ["breakfast", "second_breakfast", "lunch", "dessert", "supper"] as const;
