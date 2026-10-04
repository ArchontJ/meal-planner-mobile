import Constants from "expo-constants";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { List, SegmentedButtons, Switch, Text } from "react-native-paper";
import { LANGUAGES, THEMES, usePreferences, type Language, type Theme } from "@/lib/preferences";
import { useAppTheme } from "@/theme/theme";

const THEME_LABEL: Record<Theme, string> = {
  system: "mobile.settings.themeSystem",
  light: "mobile.settings.themeLight",
  dark: "mobile.settings.themeDark",
};

export default function SettingsScreen() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const prefs = usePreferences();

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
      <Section title={t("mobile.settings.app")}>
        <View style={{ padding: 16, gap: 8 }}>
          <Text variant="bodyLarge">{t("mobile.settings.language")}</Text>
          <SegmentedButtons
            value={prefs.language}
            onValueChange={(v) => prefs.setLanguage(v as Language)}
            buttons={LANGUAGES.map((l) => ({ value: l, label: l === "pl" ? "Polski" : "English" }))}
          />
        </View>
        <View style={{ padding: 16, gap: 8 }}>
          <Text variant="bodyLarge">{t("mobile.settings.theme")}</Text>
          <SegmentedButtons
            value={prefs.theme}
            onValueChange={(v) => prefs.setTheme(v as Theme)}
            buttons={THEMES.map((th) => ({ value: th, label: t(THEME_LABEL[th]) }))}
          />
        </View>
        <List.Item
          title={t("mobile.settings.keepAwake")}
          titleNumberOfLines={2}
          left={(props) => <List.Icon {...props} icon="cellphone-screenshot" />}
          right={() => (
            <Switch value={prefs.keepAwakeWhileCooking} onValueChange={prefs.setKeepAwakeWhileCooking} />
          )}
        />
      </Section>

      <Text variant="bodySmall" style={{ textAlign: "center", color: theme.colors.onSurfaceVariant, marginTop: 16 }}>
        {t("mobile.settings.version", { version: Constants.expoConfig?.version ?? "" })}
      </Text>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const theme = useAppTheme();
  return (
    <View style={{ gap: 4 }}>
      <Text variant="labelLarge" style={{ color: theme.colors.primary, marginHorizontal: 4, marginTop: 8 }}>
        {title}
      </Text>
      <View style={{ backgroundColor: theme.colors.surfaceContainerLow, borderRadius: 16, overflow: "hidden" }}>
        {children}
      </View>
    </View>
  );
}
