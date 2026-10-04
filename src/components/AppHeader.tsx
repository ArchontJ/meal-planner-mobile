import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Appbar, Avatar, TouchableRipple } from "react-native-paper";
import { useAppTheme } from "@/theme/theme";

/** Tab screen header: title on the left, the user's avatar (profile and settings) on the right. */
export function AppHeader({ title }: { title: string }) {
  const { t } = useTranslation();
  const theme = useAppTheme();

  return (
    <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
      <Appbar.Content title={title} />
      <TouchableRipple
        onPress={() => router.push("/settings")}
        accessibilityRole="button"
        accessibilityLabel={t("mobile.openProfile")}
        borderless
        style={{ borderRadius: 20, marginRight: 12 }}
      >
        <Avatar.Icon
          size={36}
          icon="account"
          color={theme.colors.onPrimaryContainer}
          style={{ backgroundColor: theme.colors.primaryContainer }}
        />
      </TouchableRipple>
    </Appbar.Header>
  );
}
