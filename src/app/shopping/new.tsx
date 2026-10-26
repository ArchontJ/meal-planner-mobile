import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, View } from "react-native";
import { ActivityIndicator, Button, Checkbox, IconButton, Text } from "react-native-paper";
import { SelectChip } from "@/components/SelectChip";
import { PortionStepper } from "@/features/cooking/CookingView";
import { useMealSlots } from "@/features/plan/api";
import { useProfile } from "@/features/profile/api";
import { aggregateShopping, refreshItems } from "@/features/shopping/aggregate";
import { useCategoryInfo, useShoppingSource, type ShoppingSourceMeal } from "@/features/shopping/api";
import { useMyLists } from "@/features/shopping/helpers";
import { PendingWarning } from "@/features/shopping/PendingWarning";
import { newListId, useShoppingStore, type ShoppingList } from "@/features/shopping/store";
import { useAuth } from "@/lib/auth";
import { addDays, formatDate, startOfWeek, today, type ISODate } from "@/lib/dates";
import { mealSlotLabel } from "@/lib/labels";
import { useAppTheme } from "@/theme/theme";

const MAX_DAYS = 31;

/** New list (or "Zmień posiłki" for ?edit=<id>): date range, people, and meals to leave out. */
export default function NewShoppingListScreen() {
  const { t, i18n } = useTranslation();
  const theme = useAppTheme();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const userId = useAuth((s) => s.session?.user.id)!;
  const editing = useMyLists().find((l) => l.id === edit);
  const save = useShoppingStore((s) => s.save);
  const { data: profile } = useProfile();
  const { data: slots = [] } = useMealSlots();
  const categories = useCategoryInfo();

  const [from, setFrom] = useState<ISODate>(editing?.from ?? today());
  const [to, setTo] = useState<ISODate>(editing?.to ?? addDays(today(), 2));
  const [persons, setPersons] = useState<number | null>(editing?.persons ?? null);
  const [excluded, setExcluded] = useState<Set<string>>(new Set(editing?.excludedMealIds ?? []));
  const people = persons ?? profile?.household_size ?? 1;

  const rangeValid = from <= to && to <= addDays(from, MAX_DAYS - 1);
  const { data: meals = [], isLoading } = useShoppingSource(from, to, rangeValid);

  const slotOrder = useMemo(() => new Map(slots.map((s, i) => [s.id, i])), [slots]);
  const days = useMemo(() => {
    const map = new Map<ISODate, ShoppingSourceMeal[]>();
    for (const m of meals) map.set(m.date, [...(map.get(m.date) ?? []), m]);
    for (const list of map.values()) list.sort((a, b) => (slotOrder.get(a.slotId) ?? 99) - (slotOrder.get(b.slotId) ?? 99));
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [meals, slotOrder]);

  const items = useMemo(() => aggregateShopping(meals, excluded, categories, people), [meals, excluded, categories, people]);
  const slotName = (id: string) => {
    const slot = slots.find((s) => s.id === id);
    return slot ? mealSlotLabel(slot, t) : "?";
  };

  const toggle = (ids: string[], include: boolean) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (include) next.delete(id);
        else next.add(id);
      }
      return next;
    });

  const monday = startOfWeek(today());
  const presets = [
    { key: "3", label: t("mobile.shopping.next3"), from: today(), to: addDays(today(), 2) },
    { key: "7", label: t("shopping.next7"), from: today(), to: addDays(today(), 6) },
    { key: "week", label: t("shopping.thisWeek"), from: monday, to: addDays(monday, 6) },
    { key: "next", label: t("shopping.nextWeek"), from: addDays(monday, 7), to: addDays(monday, 13) },
  ];

  const create = () => {
    // Only keep exclusions for meals inside the chosen range.
    const excludedIds = meals.filter((m) => excluded.has(m.id)).map((m) => m.id);
    const now = new Date().toISOString();
    const list: ShoppingList = {
      id: editing?.id ?? newListId(),
      from,
      to,
      excludedMealIds: excludedIds,
      persons: people,
      items: editing ? refreshItems(editing.items, items) : items,
      createdAt: editing?.createdAt ?? now,
      updatedAt: now,
    };
    save(userId, list);
    if (editing) router.back();
    else router.replace({ pathname: "/shopping/[id]", params: { id: list.id } });
  };

  const fmtDay = (d: ISODate) => formatDate(d, i18n.language, { weekday: "short", day: "numeric", month: "long" });

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: editing ? t("shopping.editMeals") : t("shopping.newList") }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {presets.map((p) => (
            <SelectChip
              key={p.key}
              selected={p.from === from && p.to === to}
              onPress={() => {
                setFrom(p.from);
                setTo(p.to);
              }}
            >
              {p.label}
            </SelectChip>
          ))}
        </ScrollView>

        <View style={{ backgroundColor: theme.colors.surfaceContainerLow, borderRadius: 16, paddingVertical: 4 }}>
          <DateRow label={t("shopping.from")} value={fmtDay(from)} onPrev={() => setFrom(addDays(from, -1))} onNext={() => setFrom(addDays(from, 1))} />
          <DateRow label={t("shopping.to")} value={fmtDay(to)} onPrev={() => setTo(addDays(to, -1))} onNext={() => setTo(addDays(to, 1))} />
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8 }}>
            <Text variant="bodyLarge" style={{ flex: 1 }}>
              {t("mobile.shopping.persons")}
            </Text>
            <PortionStepper value={people} onChange={(v) => setPersons(Math.max(1, Math.round(v)))} step={1} min={1} />
          </View>
        </View>
        {!rangeValid && <Text style={{ color: theme.colors.error }}>{t("shopping.rangeInvalid", { max: MAX_DAYS })}</Text>}
        <PendingWarning meals={meals} excluded={excluded} />

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 16 }} />
        ) : days.length === 0 ? (
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 16 }}>
            {t("shopping.noMeals")}
          </Text>
        ) : (
          <>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {t("shopping.selectHint")}
            </Text>
            {days.map(([date, dayMeals]) => {
              const ids = dayMeals.map((m) => m.id);
              const included = ids.filter((id) => !excluded.has(id)).length;
              return (
                <View key={date}>
                  <Pressable
                    onPress={() => toggle(ids, included < ids.length)}
                    style={{ flexDirection: "row", alignItems: "center" }}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: included === ids.length ? true : included === 0 ? false : "mixed" }}
                  >
                    <Checkbox.Android
                      status={included === ids.length ? "checked" : included === 0 ? "unchecked" : "indeterminate"}
                      onPress={() => toggle(ids, included < ids.length)}
                    />
                    <Text variant="titleSmall" style={{ textTransform: "capitalize" }}>
                      {formatDate(date, i18n.language, { weekday: "long", day: "numeric", month: "long" })}
                    </Text>
                  </Pressable>
                  {dayMeals.map((m) => {
                    const on = !excluded.has(m.id);
                    return (
                      <Pressable
                        key={m.id}
                        onPress={() => toggle([m.id], !on)}
                        style={{ flexDirection: "row", alignItems: "center", marginLeft: 24 }}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: on }}
                      >
                        <Checkbox.Android status={on ? "checked" : "unchecked"} onPress={() => toggle([m.id], !on)} />
                        <View style={{ flex: 1, paddingVertical: 4 }}>
                          <Text variant="bodyMedium" style={{ color: on ? theme.colors.onSurface : theme.colors.onSurfaceVariant }}>
                            {slotName(m.slotId)}
                          </Text>
                          <Text variant="bodySmall" numberOfLines={1} style={{ color: theme.colors.onSurfaceVariant }}>
                            {m.itemNames.join(", ")}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      <Button
        mode="contained"
        icon="cart-outline"
        onPress={create}
        disabled={!rangeValid || items.length === 0}
        style={{ position: "absolute", left: 16, right: 16, bottom: 24, borderRadius: 16 }}
        contentStyle={{ height: 52 }}
      >
        {editing ? t("shopping.updateList") : t("shopping.createList")} · {t("mobile.shopping.productsCount", { count: items.length })}
      </Button>
    </View>
  );
}

function DateRow({ label, value, onPrev, onNext }: { label: string; value: string; onPrev: () => void; onNext: () => void }) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: 16 }}>
      <Text variant="bodyLarge" style={{ width: 40, color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
      <IconButton icon="chevron-left" onPress={onPrev} accessibilityLabel={t("plan.previousDay")} />
      <Text variant="bodyLarge" style={{ flex: 1, textAlign: "center" }}>
        {value}
      </Text>
      <IconButton icon="chevron-right" onPress={onNext} accessibilityLabel={t("plan.nextDay")} />
    </View>
  );
}
