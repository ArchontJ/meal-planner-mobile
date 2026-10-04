import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { View } from "react-native";
import { Text } from "react-native-paper";
import type { Status } from "@/lib/goals";
import { useAppTheme, type AppTheme } from "@/theme/theme";

// Status always comes with an icon and a word, never colour alone.
const ICON: Record<Status, keyof typeof MaterialCommunityIcons.glyphMap> = {
  ok: "check-circle-outline",
  under: "alert-circle-outline",
  over: "alert-outline",
  none: "circle-outline",
};

export function statusColor(status: Status, theme: AppTheme): string {
  if (status === "ok") return theme.colors.statusOk;
  if (status === "under") return theme.colors.statusWarn;
  if (status === "over") return theme.colors.statusOver;
  return theme.colors.onSurfaceVariant;
}

export function StatusBadge({ status, label }: { status: Status; label: string }) {
  const theme = useAppTheme();
  const color = statusColor(status, theme);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <MaterialCommunityIcons name={ICON[status]} size={16} color={color} />
      <Text variant="labelMedium" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}
