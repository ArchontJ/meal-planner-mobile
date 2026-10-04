import { router } from "expo-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Appbar, Text, TouchableRipple } from "react-native-paper";
import { OfflineBanner } from "@/components/OfflineBanner";
import { UserAvatar } from "@/features/profile/UserAvatar";
import { useAppTheme } from "@/theme/theme";

/** Tab screen header: title (and optional line above it) on the left, actions, then the avatar (profile and settings). */
export function AppHeader({ title, overline, actions }: { title: string; overline?: string; actions?: ReactNode }) {
  const { t } = useTranslation();
  const theme = useAppTheme();

  return (
    <View>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <View style={{ flex: 1, marginLeft: 16 }}>
          {overline ? (
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {overline}
            </Text>
          ) : null}
          <Text variant="titleLarge" accessibilityRole="header">
            {title}
          </Text>
        </View>
        {actions}
        <TouchableRipple
          onPress={() => router.push("/settings")}
          accessibilityRole="button"
          accessibilityLabel={t("mobile.openProfile")}
          borderless
          style={{ borderRadius: 20, marginHorizontal: 12 }}
        >
          <UserAvatar />
        </TouchableRipple>
      </Appbar.Header>
      <OfflineBanner />
    </View>
  );
}
