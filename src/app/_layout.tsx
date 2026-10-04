import "@/i18n";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useTranslation } from "react-i18next";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider } from "react-native-paper";
import { useAuthBootstrap } from "@/features/auth/useAuthBootstrap";
import { ProfilePreferencesSync } from "@/features/profile/ProfilePreferencesSync";
import { queryClient } from "@/lib/queryClient";
import { useResolvedTheme, type AppTheme } from "@/theme/theme";

export default function RootLayout() {
  const { theme, navigation } = useResolvedTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={theme}>
          <ThemeProvider value={navigation}>
            <StatusBar style={theme.dark ? "light" : "dark"} />
            <RootStack theme={theme} />
          </ThemeProvider>
        </PaperProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

/**
 * The navigator is always rendered (Expo Router needs it from the first render);
 * protected groups decide which screens exist for a signed-in or signed-out user.
 */
function RootStack({ theme }: { theme: AppTheme }) {
  const { t } = useTranslation();
  const status = useAuthBootstrap();
  const signedIn = status === "signedIn";

  return (
    <>
      {signedIn && <ProfilePreferencesSync />}
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.onSurface,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ title: t("mobile.settings.title") }} />
          <Stack.Screen name="meal/[id]" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
