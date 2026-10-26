import "@/i18n";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import Constants from "expo-constants";
import { Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { LogBox, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider } from "react-native-paper";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useAuthBootstrap } from "@/features/auth/useAuthBootstrap";
import { useOfflinePrefetch } from "@/features/offline/useOfflinePrefetch";
import { ProfilePreferencesSync } from "@/features/profile/ProfilePreferencesSync";
import { OFFLINE_MAX_AGE, queryClient, queryPersister } from "@/lib/queryClient";
import { useResolvedTheme, type AppTheme } from "@/theme/theme";

// Development builds only: Expo Router updates navigation state while resolving the
// dev-client launch link before its container has mounted, which React reports as an error.
// It cannot happen in a release build (no dev-client link) and changes nothing for the app.
if (__DEV__) LogBox.ignoreLogs(["Can't perform a React state update on a component that hasn't mounted yet"]);

// Keep the splash screen until the saved session is restored, so the sign-in screen never flashes.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { theme, navigation } = useResolvedTheme();

  // The window behind the app (seen while it loads or between screens) follows the app theme.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.colors.background);
  }, [theme.colors.background]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: queryPersister,
          maxAge: OFFLINE_MAX_AGE,
          // A new app version starts with a fresh cache, so changed data shapes never load.
          buster: Constants.expoConfig?.version ?? "",
        }}
      >
        <PaperProvider theme={theme}>
          <ThemeProvider value={navigation}>
            <StatusBar style={theme.dark ? "light" : "dark"} />
            <RootStack theme={theme} />
          </ThemeProvider>
        </PaperProvider>
      </PersistQueryClientProvider>
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
  useOfflinePrefetch();

  useEffect(() => {
    if (status !== "loading") void SplashScreen.hideAsync();
  }, [status]);

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
        // Offline banner under the header of stacked screens; the tabs show it in their own header.
        screenLayout={({ route, children }) =>
          route.name === "(tabs)" || route.name === "sign-in" || route.name === "scan" ? (
            children
          ) : (
            <View style={{ flex: 1 }}>
              <OfflineBanner />
              {children}
            </View>
          )
        }
      >
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ title: t("mobile.settings.title") }} />
          <Stack.Screen name="meal/[id]" />
          <Stack.Screen name="recipe/[id]" />
          <Stack.Screen name="shared/[id]" />
          <Stack.Screen name="cook/[id]" />
          <Stack.Screen name="shopping/new" />
          <Stack.Screen name="shopping/[id]" />
          <Stack.Screen name="scan" options={{ headerShown: false }} />
          <Stack.Screen name="recipe-photo" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
