// Prompt for Gemini Nano on the phone: OCR text of a recipe → the desktop's import format
// ("mealplanner-recipe", version 1, see the desktop's import/format.ts). Kept short, because
// the on-device model takes under ~4000 tokens of input in total.

const SCHEMA = `{"format":"mealplanner-recipe","version":1,"name":"...","servings":4,"source":null,"serveWith":null,"tags":["..."],"meals":["lunch"],"ingredients":[{"name":"...","amount":2,"unit":"łyżka","grams":30,"original":"...","note":null}],"instructions":["...","..."]}`;

export function recipePrompt(ocrText: string): string {
  return `Poniżej jest tekst przepisu odczytany ze zdjęć (OCR). Mogą być błędy odczytu, a kolumny strony mogą być pomieszane.
Zamień go na JSON dokładnie w tym formacie i zwróć TYLKO JSON, bez komentarzy:
${SCHEMA}

Zasady:
- Wszystko po polsku. Jeśli przepis jest w innym języku, przetłumacz nazwę, składniki i kroki.
- ingredients.name: sam produkt w mianowniku, bez ilości i opisów (np. "masło", "mąka pszenna", "jajko").
- ingredients.original: linia składnika po polsku, z ilością (np. "2 łyżki masła").
- amount: liczba lub null. unit: g, kg, dag, ml, l, łyżka, łyżeczka, szklanka, szt., szczypta, opakowanie albo null.
- grams: szacunkowe gramy na CAŁY przepis, jeśli da się ustalić, inaczej null. "sól do smaku": amount, unit i grams = null.
- servings: liczba porcji z przepisu; jeśli jej brak, oszacuj.
- instructions: kolejne kroki przygotowania, każdy jako osobny tekst.
- meals: pasujące z breakfast, second_breakfast, lunch, dessert, supper (może być pusta lista).
- source: tytuł książki lub strony, jeśli widać go w tekście, inaczej null.
- tags: 0–3 krótkie tagi małymi literami (np. "wege", "szybkie").

Tekst przepisu:
"""
${ocrText.trim()}
"""`;
}

/** Rough token estimate for Polish text (≈3.5 characters per token), to warn before the 4000 limit. */
export const estimateTokens = (text: string) => Math.ceil(text.length / 3.5);

/** The model may wrap the JSON in a ```json block or add a sentence; take the outermost {...}. */
export function extractJson(output: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(output);
  const body = fenced ? fenced[1]! : output;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  return start >= 0 && end > start ? body.slice(start, end + 1) : body.trim();
}
