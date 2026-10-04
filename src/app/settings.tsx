import Constants from "expo-constants";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { List, SegmentedButtons, Switch, Text } from "react-native-paper";
import { useProfile, useUpdateProfile } from "@/features/profile/api";
import { UserAvatar } from "@/features/profile/UserAvatar";
import { signOut, useAuth } from "@/lib/auth";
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
  const email = useAuth((s) => s.session?.user.email);
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  // Language and theme are shared with the desktop through the profile.
  const setLanguage = (language: Language) => {
    prefs.setLanguage(language);
    updateProfile.mutate({ language });
  };
  const setTheme = (value: Theme) => {
    prefs.setTheme(value);
    updateProfile.mutate({ theme: value });
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16, padding: 8 }}>
        <UserAvatar size={56} />
        <View style={{ flex: 1 }}>
          <Text variant="titleMedium">{profile?.display_name ?? ""}</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {email}
          </Text>
        </View>
      </View>

      <Section title={t("mobile.settings.app")}>
        <View style={{ padding: 16, gap: 8 }}>
          <Text variant="bodyLarge">{t("mobile.settings.language")}</Text>
          <SegmentedButtons
            value={prefs.language}
            onValueChange={(v) => setLanguage(v as Language)}
            buttons={LANGUAGES.map((l) => ({ value: l, label: l === "pl" ? "Polski" : "English" }))}
          />
        </View>
        <View style={{ padding: 16, gap: 8 }}>
          <Text variant="bodyLarge">{t("mobile.settings.theme")}</Text>
          <SegmentedButtons
            value={prefs.theme}
            onValueChange={(v) => setTheme(v as Theme)}
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

      {profile && (
        <Section title={t("mobile.settings.yourPlan")} note={t("mobile.settings.changeOnDesktop")}>
          <List.Item
            title={t("mobile.settings.goals")}
            description={t("mobile.settings.goalsValue", {
              kcal: profile.target_kcal,
              protein: profile.target_protein,
              fatMin: profile.fat_min_pct,
              fatMax: profile.fat_max_pct,
            })}
            left={(props) => <List.Icon {...props} icon="target" />}
          />
          <List.Item
            title={t("mobile.settings.householdSize")}
            description={String(profile.household_size)}
            left={(props) => <List.Icon {...props} icon="account-group-outline" />}
          />
        </Section>
      )}

      <Section>
        <List.Item
          title={t("auth.signOut")}
          titleStyle={{ color: theme.colors.error }}
          left={(props) => <List.Icon {...props} icon="logout" color={theme.colors.error} />}
          onPress={() => void signOut()}
        />
      </Section>

      <Text variant="bodySmall" style={{ textAlign: "center", color: theme.colors.onSurfaceVariant, marginTop: 16 }}>
        {t("mobile.settings.version", { version: Constants.expoConfig?.version ?? "" })}
      </Text>
    </ScrollView>
  );
}

function Section({ title, note, children }: { title?: string; note?: string; children: ReactNode }) {
  const theme = useAppTheme();
  return (
    <View style={{ gap: 4, marginTop: 8 }}>
      {title && (
        <Text variant="labelLarge" style={{ color: theme.colors.primary, marginHorizontal: 4 }}>
          {title}
          {note && <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>{` · ${note}`}</Text>}
        </Text>
      )}
      <View style={{ backgroundColor: theme.colors.surfaceContainerLow, borderRadius: 16, overflow: "hidden" }}>
        {children}
      </View>
    </View>
  );
}
