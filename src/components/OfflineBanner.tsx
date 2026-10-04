import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { onlineManager } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Text } from "react-native-paper";
import { useAppTheme } from "@/theme/theme";

/** True while the phone has a usable connection (as TanStack Query sees it). */
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
  );
}

/** Shown under the header while offline: saved data is used and refreshes when the connection is back. */
export function OfflineBanner() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  if (useIsOnline()) return null;
  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: theme.colors.tertiaryContainer,
        paddingHorizontal: 16,
        paddingVertical: 6,
      }}
    >
      <MaterialCommunityIcons name="wifi-off" size={16} color={theme.colors.onTertiaryContainer} />
      <Text variant="labelMedium" style={{ flex: 1, color: theme.colors.onTertiaryContainer }}>
        {t("mobile.offline")}
      </Text>
    </View>
  );
}
