import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Appbar, TouchableRipple } from "react-native-paper";
import { UserAvatar } from "@/features/profile/UserAvatar";
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
        <UserAvatar />
      </TouchableRipple>
    </Appbar.Header>
  );
}
