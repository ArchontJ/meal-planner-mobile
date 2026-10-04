import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { FAB, ProgressBar, Text, TouchableRipple } from "react-native-paper";
import { rangeLabel, useMyLists } from "@/features/shopping/helpers";
import type { ShoppingList } from "@/features/shopping/store";
import { useAppTheme } from "@/theme/theme";

/** Lists on this phone: the active one (newest not fully bought) on top, then the rest. */
export default function ShoppingScreen() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const lists = useMyLists();
  const active = lists.find((l) => l.items.some((i) => !i.bought));
  const others = lists.filter((l) => l !== active);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 10, paddingBottom: 100 }}>
        {lists.length === 0 ? (
          <View style={{ alignItems: "center", gap: 8, marginTop: 48, paddingHorizontal: 24 }}>
            <Text variant="titleMedium">{t("mobile.shopping.emptyTitle")}</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center" }}>
              {t("mobile.shopping.emptyBody")}
            </Text>
          </View>
        ) : (
          <>
            {active && <ListCard list={active} highlighted />}
            {others.map((l) => (
              <ListCard key={l.id} list={l} />
            ))}
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 8 }}>
              {t("mobile.shopping.localNote")}
            </Text>
          </>
        )}
      </ScrollView>
      <FAB
        icon="plus"
        label={t("shopping.newList")}
        onPress={() => router.push("/shopping/new")}
        style={{ position: "absolute", right: 16, bottom: 16 }}
      />
    </View>
  );
}

function ListCard({ list, highlighted }: { list: ShoppingList; highlighted?: boolean }) {
  const { t, i18n } = useTranslation();
  const theme = useAppTheme();
  const bought = list.items.filter((i) => i.bought).length;
  const total = list.items.length;
  const done = total > 0 && bought === total;
  const fg = highlighted ? theme.colors.onPrimaryContainer : theme.colors.onSurface;
  const muted = highlighted ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant;

  return (
    <TouchableRipple
      onPress={() => router.push({ pathname: "/shopping/[id]", params: { id: list.id } })}
      borderless
      accessibilityRole="button"
      style={{ borderRadius: 16, backgroundColor: highlighted ? theme.colors.primaryContainer : theme.colors.surfaceContainerLow }}
    >
      <View style={{ padding: 14, gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline" }}>
          <Text variant="titleMedium" style={{ flex: 1, color: done ? theme.colors.onSurfaceVariant : fg }}>
            {rangeLabel(list, i18n.language)}
          </Text>
          <Text variant="labelMedium" style={{ color: muted }}>
            {t("shopping.forPersons", { count: list.persons })}
          </Text>
        </View>
        <Text variant="bodySmall" style={{ color: muted }}>
          {done ? t("mobile.shopping.allBought") : t("mobile.shopping.boughtOf", { bought, total })}
        </Text>
        {!done && total > 0 && <ProgressBar progress={bought / total} color={theme.colors.primary} style={{ borderRadius: 2 }} />}
      </View>
    </TouchableRipple>
  );
}
