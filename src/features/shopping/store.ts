import "expo-sqlite/localStorage/install";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ShoppingItem } from "@/features/shopping/aggregate";
import type { ISODate } from "@/lib/dates";

/** Shopping lists live only on this phone (agreed: option B), per signed-in user. */
export type ShoppingList = {
  id: string;
  from: ISODate;
  to: ISODate;
  /** Meals the user unticked; meals added to the plan later are included on refresh. */
  excludedMealIds: string[];
  /** People the amounts were multiplied for. */
  persons: number;
  items: ShoppingItem[];
  createdAt: string;
  updatedAt: string;
};

type State = {
  byUser: Record<string, ShoppingList[]>;
  save: (userId: string, list: ShoppingList) => void;
  remove: (userId: string, id: string) => void;
  setBought: (userId: string, listId: string, productId: string, bought: boolean) => void;
};

export const useShoppingStore = create<State>()(
  persist(
    (set) => ({
      byUser: {},
      save: (userId, list) =>
        set((s) => {
          const others = (s.byUser[userId] ?? []).filter((l) => l.id !== list.id);
          return { byUser: { ...s.byUser, [userId]: [{ ...list, updatedAt: new Date().toISOString() }, ...others] } };
        }),
      remove: (userId, id) =>
        set((s) => ({ byUser: { ...s.byUser, [userId]: (s.byUser[userId] ?? []).filter((l) => l.id !== id) } })),
      setBought: (userId, listId, productId, bought) =>
        set((s) => ({
          byUser: {
            ...s.byUser,
            [userId]: (s.byUser[userId] ?? []).map((l) =>
              l.id === listId
                ? { ...l, items: l.items.map((i) => (i.productId === productId ? { ...i, bought } : i)) }
                : l,
            ),
          },
        })),
    }),
    { name: "mealplanner-shopping-lists", storage: createJSONStorage(() => localStorage) },
  ),
);

export const newListId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Newest first, as saved. */
export function sortLists(lists: ShoppingList[]): ShoppingList[] {
  return [...lists].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
