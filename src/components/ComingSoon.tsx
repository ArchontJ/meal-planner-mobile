import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Text } from "react-native-paper";
import { useAppTheme } from "@/theme/theme";

/** Placeholder for screens that are not built yet. */
export function ComingSoon() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
        {t("mobile.comingSoon")}
      </Text>
    </View>
  );
}
