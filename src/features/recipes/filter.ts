// Shared with the mobile app – keep free of React, DOM and Tauri imports.
import type { Macros } from "@/lib/nutrition";
import { matchesSearch } from "@/lib/search";

export type RecipeSortKey = "name" | "newest" | "kcal" | "protein" | "fat" | "carbs";

type Filterable = { name: string; tags: string[]; macros: Macros };

export function filterAndSortRecipes<T extends Filterable>(
  recipes: T[],
  options: {
    search: string;
    /** Every selected tag must be present. */
    tags: Set<string>;
    /** Extra predicate, e.g. recipe category filter. */
    matches?: (recipe: T) => boolean;
    sort: RecipeSortKey;
    /** Timestamp used by the "newest" sort. */
    date: (recipe: T) => string;
  },
): T[] {
  const filtered = recipes.filter(
    (r) =>
      matchesSearch(r.name, options.search) &&
      [...options.tags].every((t) => r.tags.includes(t)) &&
      (options.matches?.(r) ?? true),
  );

  const byName = (a: T, b: T) => a.name.localeCompare(b.name, "pl", { sensitivity: "base" });
  const { sort } = options;

  return filtered.sort((a, b) => {
    if (sort === "name") return byName(a, b);
    if (sort === "newest") return options.date(b).localeCompare(options.date(a)) || byName(a, b);
    // Macro sorts: highest first.
    return b.macros[sort] - a.macros[sort] || byName(a, b);
  });
}

/**
 * Inspiracje sections: bookmarked recipes ("Zapisane") and the rest ("Wszystkie").
 * Each recipe lands in exactly one section; the input order (already filtered
 * and sorted) is kept in both. Bookmark ids without a matching recipe are ignored.
 */
export function splitSaved<T extends { id: string }>(recipes: T[], savedIds: ReadonlySet<string>): { saved: T[]; others: T[] } {
  const saved: T[] = [];
  const others: T[] = [];
  for (const r of recipes) (savedIds.has(r.id) ? saved : others).push(r);
  return { saved, others };
}

/** Lowercased, trimmed tag as stored by the database trigger. */
export function normalizeTag(tag: string): string {
  return tag.trim().toLocaleLowerCase("pl");
}
