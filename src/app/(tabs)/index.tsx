import { router } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshControl, ScrollView, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { ActivityIndicator, Button, HelperText } from "react-native-paper";
import { AppHeader } from "@/components/AppHeader";
import { useMealsRange, useMealSlots } from "@/features/plan/api";
import { DayGoals } from "@/features/plan/DayGoals";
import { MealCard } from "@/features/plan/MealCard";
import { dayMacros } from "@/features/plan/model";
import { WeekStrip } from "@/features/plan/WeekStrip";
import { useProfile } from "@/features/profile/api";
import { addDays, formatDate, today, weekDays, type ISODate } from "@/lib/dates";
import { mealSlotLabel } from "@/lib/labels";
import { useRefreshOnFocus } from "@/lib/useRefreshOnFocus";

const SWIPE_DISTANCE = 60;

/** One day of the plan (opens on today); swipe or tap the week strip to change the day. */
export default function PlanScreen() {
  const { t, i18n } = useTranslation();
  const [date, setDate] = useState<ISODate>(today);
  const todayDate = today();

  const week = useMemo(() => weekDays(date), [date]);
  const meals = useMealsRange(week[0]!, week[6]!);
  const slots = useMealSlots();
  const { data: profile } = useProfile();
  useRefreshOnFocus();

  const dayMeals = (meals.data ?? []).filter((m) => m.date === date);
  // Active slots, plus hidden ones that have food on this day.
  const rows = (slots.data ?? [])
    .map((slot) => ({ slot, meal: dayMeals.find((m) => m.slotId === slot.id) }))
    .filter(({ slot, meal }) => slot.is_active || (meal?.items.length ?? 0) > 0);

  const swipe = Gesture.Pan()
    .activeOffsetX([-24, 24])
    .failOffsetY([-16, 16])
    .runOnJS(true)
    .onEnd((e) => {
      if (e.translationX <= -SWIPE_DISTANCE) setDate((d) => addDays(d, 1));
      else if (e.translationX >= SWIPE_DISTANCE) setDate((d) => addDays(d, -1));
    });

  const title =
    date === todayDate
      ? t("home.todayTitle")
      : date === addDays(todayDate, 1)
        ? t("home.tomorrow")
        : date === addDays(todayDate, -1)
          ? t("mobile.plan.yesterday")
          : capitalize(formatDate(date, i18n.language, { weekday: "long" }));

  return (
    <View style={{ flex: 1 }}>
      <AppHeader
        title={title}
        overline={formatDate(date, i18n.language, { weekday: "long", day: "numeric", month: "long" })}
        actions={
          date !== todayDate ? (
            <Button compact mode="text" onPress={() => setDate(todayDate)}>
              {t("plan.today")}
            </Button>
          ) : null
        }
      />
      <GestureDetector gesture={swipe}>
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 10 }}
          refreshControl={
            <RefreshControl refreshing={meals.isRefetching} onRefresh={() => void meals.refetch()} />
          }
        >
          <WeekStrip selected={date} onSelect={setDate} />

          {meals.isLoading || slots.isLoading || !profile ? (
            <ActivityIndicator style={{ marginTop: 32 }} />
          ) : (
            <>
              <DayGoals macros={dayMacros(dayMeals)} profile={profile} />
              {rows.map(({ slot, meal }) => {
                const label = mealSlotLabel(slot, t);
                return (
                  <MealCard
                    key={slot.id}
                    label={label}
                    meal={meal}
                    onPress={() => meal && router.push({ pathname: "/meal/[id]", params: { id: meal.id, label, date } })}
                  />
                );
              })}
            </>
          )}
          {(meals.isError || slots.isError) && (
            <HelperText type="error" visible>
              {t("errors.loadFailed")}
            </HelperText>
          )}
        </ScrollView>
      </GestureDetector>
    </View>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
