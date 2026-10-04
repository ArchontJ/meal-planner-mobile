import { useShoppingStore, sortLists, type ShoppingList } from "@/features/shopping/store";
import type { ShoppingItem } from "@/features/shopping/aggregate";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/dates";

const EMPTY: ShoppingList[] = [];

/** The signed-in user's lists on this phone, newest first. */
export function useMyLists(): ShoppingList[] {
  const userId = useAuth((s) => s.session?.user.id);
  const lists = useShoppingStore((s) => (userId ? s.byUser[userId] : undefined) ?? EMPTY);
  return sortLists(lists);
}

/** "4–6 października" style label for a list's date range. */
export function rangeLabel(list: Pick<ShoppingList, "from" | "to">, language: string): string {
  const fmt = (d: string) => formatDate(d, language, { day: "numeric", month: "short" });
  return list.from === list.to ? fmt(list.from) : `${fmt(list.from)} – ${fmt(list.to)}`;
}

/** Fingerprint of the amounts, to notice when the plan changed after the list was made (as on the desktop). */
export const fingerprint = (items: ShoppingItem[]) =>
  items
    .map((i) => `${i.productId}:${Math.round(i.grams)}`)
    .sort()
    .join("|");
