// Shared with the mobile app – keep free of React, DOM and Tauri imports.
/**
 * Applies the user's preferred category order (profile.category_order).
 * Categories listed there come first, in that order; the rest follow in the
 * default order (fixed categories by position, then private ones by name).
 */
export function orderCategories<T extends { id: string }>(categories: T[], preferred: readonly string[]): T[] {
  const rank = new Map(preferred.map((id, i) => [id, i]));
  return categories
    .map((c, defaultIndex) => ({ c, defaultIndex }))
    .sort((a, b) => {
      const ra = rank.get(a.c.id);
      const rb = rank.get(b.c.id);
      if (ra !== undefined && rb !== undefined) return ra - rb;
      if (ra !== undefined) return -1;
      if (rb !== undefined) return 1;
      return a.defaultIndex - b.defaultIndex;
    })
    .map(({ c }) => c);
}

/** New order after moving one category up (-1) or down (+1). */
export function moveCategory(orderedIds: readonly string[], index: number, direction: -1 | 1): string[] {
  const target = index + direction;
  if (target < 0 || target >= orderedIds.length) return [...orderedIds];
  const next = [...orderedIds];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}
