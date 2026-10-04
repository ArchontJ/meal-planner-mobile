import { useColorScheme } from "react-native";
import { MD3DarkTheme, MD3LightTheme, useTheme, type MD3Theme } from "react-native-paper";
import { DarkTheme as NavDarkTheme, DefaultTheme as NavLightTheme, type Theme as NavTheme } from "expo-router";
import { usePreferences } from "@/lib/preferences";
import { darkColors, lightColors, type AppColors } from "@/theme/palette";

export type AppTheme = MD3Theme & { colors: AppColors };

const lightTheme: AppTheme = { ...MD3LightTheme, roundness: 4, colors: lightColors };
const darkTheme: AppTheme = { ...MD3DarkTheme, roundness: 4, colors: darkColors };

function navTheme(theme: AppTheme, base: NavTheme): NavTheme {
  return {
    ...base,
    dark: theme.dark,
    colors: {
      ...base.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.onSurface,
      border: theme.colors.outlineVariant,
      notification: theme.colors.error,
    },
  };
}

const lightNav = navTheme(lightTheme, NavLightTheme);
const darkNav = navTheme(darkTheme, NavDarkTheme);

/** The theme chosen in settings ("system" follows the phone). */
export function useResolvedTheme(): { theme: AppTheme; navigation: NavTheme } {
  const preference = usePreferences((s) => s.theme);
  const system = useColorScheme();
  const dark = preference === "dark" || (preference === "system" && system === "dark");
  return dark ? { theme: darkTheme, navigation: darkNav } : { theme: lightTheme, navigation: lightNav };
}

export const useAppTheme = () => useTheme<AppTheme>();
