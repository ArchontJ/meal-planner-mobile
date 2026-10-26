import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Share, View } from "react-native";
import { Button, Checkbox, Dialog, IconButton, Menu, Portal, ProgressBar, Text } from "react-native-paper";
import { HeaderTitle } from "@/components/HeaderTitle";
import {
  aggregateShopping,
  formatAmount,
  googleKeepText,
  refreshItems,
  shoppingListText,
  sortShoppingItems,
  type ShoppingItem,
} from "@/features/shopping/aggregate";
import { useCategoryInfo, useShoppingSource } from "@/features/shopping/api";
import { fingerprint, rangeLabel, useMyLists } from "@/features/shopping/helpers";
import { PendingWarning } from "@/features/shopping/PendingWarning";
import { useShoppingStore } from "@/features/shopping/store";
import { useAuth } from "@/lib/auth";
import { useAppTheme } from "@/theme/theme";

/** One list in the shop: to-buy grouped by category in shop order, bought items collapsed at the bottom. */
export default function ShoppingListScreen() {
  const { t, i18n } = useTranslation();
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuth((s) => s.session?.user.id)!;
  const list = useMyLists().find((l) => l.id === id);
  const { save, remove, setBought } = useShoppingStore();
  const categories = useCategoryInfo();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showBought, setShowBought] = useState(false);

  // Recompute from the current plan to notice changes made since (needs a connection).
  const source = useShoppingSource(list?.from ?? "", list?.to ?? "", Boolean(list));
  const current = useMemo(
    () =>
      list && source.data
        ? aggregateShopping(source.data, new Set(list.excludedMealIds), categories, list.persons)
        : null,
    [list, source.data, categories],
  );
  const outdated = list && current !== null && fingerprint(current) !== fingerprint(list.items);

  if (!list) {
    return <Stack.Screen options={{ title: "" }} />;
  }

  const lang = i18n.language;
  const amount = (g: number) => formatAmount(g, lang);
  // Re-sort with today's category order and names (they may have changed on the desktop).
  const items = sortShoppingItems(
    list.items.map((i) => ({ ...i, categoryName: categories.get(i.categoryId)?.name ?? i.categoryName })),
    categories,
  );
  const toBuy = items.filter((i) => !i.bought);
  const bought = items.filter((i) => i.bought);
  const groups = groupByCategory(toBuy);
  const progress = items.length ? bought.length / items.length : 0;

  const refresh = () => {
    if (!current) return;
    save(userId, { ...list, items: refreshItems(list.items, current) });
  };
  const share = (text: string) => void Share.share({ message: text });

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: rangeLabel(list, lang),
          headerTitle: () => (
            <HeaderTitle
              title={rangeLabel(list, lang)}
              subtitle={`${t("shopping.forPersons", { count: list.persons })} · ${t("mobile.shopping.boughtOf", { bought: bought.length, total: items.length })}`}
            />
          ),
          headerRight: () => (
            <View style={{ flexDirection: "row" }}>
              <IconButton
                icon="share-variant-outline"
                onPress={() => share(googleKeepText(items, amount))}
                accessibilityLabel={t("mobile.shopping.share")}
              />
              <Menu
                visible={menuOpen}
                onDismiss={() => setMenuOpen(false)}
                anchor={<IconButton icon="dots-vertical" onPress={() => setMenuOpen(true)} accessibilityLabel={t("mobile.shopping.more")} />}
              >
                <Menu.Item
                  leadingIcon="refresh"
                  title={t("shopping.refresh")}
                  disabled={!current}
                  onPress={() => {
                    setMenuOpen(false);
                    refresh();
                  }}
                />
                <Menu.Item
                  leadingIcon="calendar-edit"
                  title={t("shopping.editMeals")}
                  onPress={() => {
                    setMenuOpen(false);
                    router.push({ pathname: "/shopping/new", params: { edit: list.id } });
                  }}
                />
                <Menu.Item
                  leadingIcon="text-box-outline"
                  title={t("mobile.shopping.shareFull")}
                  onPress={() => {
                    setMenuOpen(false);
                    share(shoppingListText(items, amount));
                  }}
                />
                <Menu.Item
                  leadingIcon="delete-outline"
                  title={t("common.delete")}
                  onPress={() => {
                    setMenuOpen(false);
                    setConfirmDelete(true);
                  }}
                />
              </Menu>
            </View>
          ),
        }}
      />

      <ProgressBar progress={progress} color={theme.colors.primary} style={{ marginHorizontal: 16, borderRadius: 2 }} />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 4, paddingBottom: 32 }}>
        <PendingWarning meals={source.data ?? []} excluded={new Set(list.excludedMealIds)} />
        {outdated && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: theme.colors.tertiaryContainer,
              borderRadius: 12,
              paddingLeft: 12,
              marginBottom: 8,
            }}
          >
            <Text variant="bodyMedium" style={{ flex: 1, color: theme.colors.onTertiaryContainer }}>
              {t("shopping.outdated")}
            </Text>
            <Button onPress={refresh}>{t("mobile.shopping.refreshShort")}</Button>
          </View>
        )}

        {items.length === 0 && (
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 24 }}>
            {t("shopping.empty")}
          </Text>
        )}
        {items.length > 0 && toBuy.length === 0 && (
          <Text variant="titleMedium" style={{ textAlign: "center", marginVertical: 24 }}>
            {t("mobile.shopping.allBought")}
          </Text>
        )}

        {groups.map(([category, groupItems]) => (
          <View key={category} style={{ marginBottom: 8 }}>
            <Text variant="labelLarge" style={{ color: theme.colors.primary, marginTop: 8, marginBottom: 2 }}>
              {category}
            </Text>
            {groupItems.map((item) => (
              <ItemRow key={item.productId} item={item} amount={amount(item.grams)} onToggle={() => setBought(userId, list.id, item.productId, true)} />
            ))}
          </View>
        ))}

        {bought.length > 0 && (
          <>
            <Pressable
              onPress={() => setShowBought((v) => !v)}
              style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}
              accessibilityRole="button"
              accessibilityState={{ expanded: showBought }}
            >
              <Text variant="labelLarge" style={{ flex: 1, color: theme.colors.onSurfaceVariant }}>
                {t("mobile.shopping.boughtSection", { count: bought.length })}
              </Text>
              <IconButton icon={showBought ? "chevron-up" : "chevron-down"} size={20} />
            </Pressable>
            {showBought &&
              bought.map((item) => (
                <ItemRow key={item.productId} item={item} amount={amount(item.grams)} onToggle={() => setBought(userId, list.id, item.productId, false)} />
              ))}
          </>
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={confirmDelete} onDismiss={() => setConfirmDelete(false)}>
          <Dialog.Title>{t("shopping.deleteTitle", { range: rangeLabel(list, lang) })}</Dialog.Title>
          <Dialog.Actions>
            <Button onPress={() => setConfirmDelete(false)}>{t("common.cancel")}</Button>
            <Button
              textColor={theme.colors.error}
              onPress={() => {
                setConfirmDelete(false);
                router.back();
                remove(userId, list.id);
              }}
            >
              {t("common.delete")}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

function ItemRow({ item, amount, onToggle }: { item: ShoppingItem; amount: string; onToggle: () => void }) {
  const theme = useAppTheme();
  const muted = item.bought;
  return (
    <Pressable
      onPress={onToggle}
      style={{ flexDirection: "row", alignItems: "center", minHeight: 48 }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: item.bought }}
    >
      <Checkbox.Android status={item.bought ? "checked" : "unchecked"} onPress={onToggle} />
      <Text
        variant="bodyLarge"
        style={{
          flex: 1,
          color: muted ? theme.colors.onSurfaceVariant : theme.colors.onSurface,
          textDecorationLine: muted ? "line-through" : "none",
        }}
      >
        {item.name}
        {item.producer ? <Text style={{ color: theme.colors.onSurfaceVariant }}>{` (${item.producer})`}</Text> : null}
      </Text>
      <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, fontVariant: ["tabular-nums"] }}>
        {amount}
      </Text>
    </Pressable>
  );
}

function groupByCategory(items: ShoppingItem[]): [string, ShoppingItem[]][] {
  const groups: [string, ShoppingItem[]][] = [];
  for (const item of items) {
    const last = groups.at(-1);
    if (last && last[0] === item.categoryName) last[1].push(item);
    else groups.push([item.categoryName, [item]]);
  }
  return groups;
}
