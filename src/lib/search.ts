// Shared with the mobile app – keep free of React, DOM and Tauri imports.
/** Case- and diacritic-insensitive form for searching ("zoltko" finds "żółtko"). */
export function normalizeSearch(s: string): string {
  return s
    .toLocaleLowerCase("pl")
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/** True when every whitespace-separated term of `query` occurs in `text`. */
export function matchesSearch(text: string, query: string): boolean {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = normalizeSearch(text);
  return terms.every((term) => haystack.includes(term));
}
