import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { Text } from "react-native-paper";
import { formatDate, today, weekDays, type ISODate } from "@/lib/dates";
import { useAppTheme } from "@/theme/theme";

/** Monday–Sunday of the selected day's week; the selected day is filled, today is bold. */
export function WeekStrip({ selected, onSelect }: { selected: ISODate; onSelect: (d: ISODate) => void }) {
  const { i18n } = useTranslation();
  const theme = useAppTheme();
  const todayDate = today();

  return (
    <View style={{ flexDirection: "row", gap: 4 }}>
      {weekDays(selected).map((d) => {
        const active = d === selected;
        const color = active ? theme.colors.onPrimary : theme.colors.onSurfaceVariant;
        return (
          <Pressable
            key={d}
            onPress={() => onSelect(d)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={formatDate(d, i18n.language, { weekday: "long", day: "numeric", month: "long" })}
            style={{
              flex: 1,
              alignItems: "center",
              paddingVertical: 6,
              borderRadius: 14,
              backgroundColor: active ? theme.colors.primary : "transparent",
            }}
          >
            <Text variant="labelSmall" style={{ color }}>
              {formatDate(d, i18n.language, { weekday: "short" }).replace(".", "")}
            </Text>
            <Text
              variant="titleSmall"
              style={{ color: active ? color : theme.colors.onSurface, fontWeight: d === todayDate ? "700" : "400" }}
            >
              {formatDate(d, i18n.language, { day: "numeric" })}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
