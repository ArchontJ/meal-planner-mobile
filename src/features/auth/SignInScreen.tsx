import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Button, HelperText, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { isGoogleConfigured, signInWithGoogle, SignInCancelled } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useAppTheme } from "@/theme/theme";

export function SignInScreen() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const configured = isSupabaseConfigured && isGoogleConfigured;

  const signIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      if (!(e instanceof SignInCancelled)) setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ flex: 1, justifyContent: "center", padding: 32, gap: 16 }}>
        <View
          style={{
            alignSelf: "center",
            width: 88,
            height: 88,
            borderRadius: 28,
            backgroundColor: theme.colors.primaryContainer,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons name="calendar-heart" size={44} color={theme.colors.onPrimaryContainer} />
        </View>
        <Text variant="headlineMedium" style={{ textAlign: "center" }}>
          {t("app.name")}
        </Text>
        <Text variant="bodyLarge" style={{ textAlign: "center", color: theme.colors.onSurfaceVariant }}>
          {t("auth.subtitle")}
        </Text>

        <Button
          mode="contained"
          icon="google"
          onPress={signIn}
          loading={busy}
          disabled={busy || !configured}
          style={{ marginTop: 24 }}
          contentStyle={{ height: 52 }}
        >
          {t("auth.signInWithGoogle")}
        </Button>

        {!configured && (
          <HelperText type="error" visible style={{ textAlign: "center" }}>
            {t("mobile.auth.missingConfig")}
          </HelperText>
        )}
        {error && (
          <HelperText type="error" visible style={{ textAlign: "center" }}>
            {t("auth.error")}: {error}
          </HelperText>
        )}
      </View>
    </SafeAreaView>
  );
}
