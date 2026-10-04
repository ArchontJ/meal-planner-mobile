import "@/i18n";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useTranslation } from "react-i18next";
import { PaperProvider } from "react-native-paper";
import { queryClient } from "@/lib/queryClient";
import { useResolvedTheme } from "@/theme/theme";

export default function RootLayout() {
  const { theme, navigation } = useResolvedTheme();
  const { t } = useTranslation();

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <ThemeProvider value={navigation}>
          <StatusBar style={theme.dark ? "light" : "dark"} />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: theme.colors.surface },
              headerTintColor: theme.colors.onSurface,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: theme.colors.background },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="settings" options={{ title: t("mobile.settings.title") }} />
          </Stack>
        </ThemeProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}
