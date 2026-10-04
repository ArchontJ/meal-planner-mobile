import { getMaterial3Theme, isDynamicThemeSupported, type Material3Scheme } from "@pchmn/expo-material3-theme";
import { useMemo } from "react";
import { useColorScheme } from "react-native";
import { MD3DarkTheme, MD3LightTheme, useTheme, type MD3Theme } from "react-native-paper";
import { DarkTheme as NavDarkTheme, DefaultTheme as NavLightTheme, type Theme as NavTheme } from "expo-router";
import { usePreferences } from "@/lib/preferences";
import { darkColors, lightColors, type AppColors } from "@/theme/palette";

export type AppTheme = MD3Theme & { colors: AppColors };

/** "Kolory z tapety" is offered only where Android provides wallpaper colours (12+). */
export const supportsWallpaperColors = isDynamicThemeSupported;

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

/**
 * Wallpaper (Material You) roles over the sage palette. Macro colours and goal
 * warnings keep their fixed, colour-blind-safe values; "ok" follows the primary.
 */
function wallpaperTheme(base: AppTheme, scheme: Material3Scheme): AppTheme {
  const { surfaceContainerLowest, surfaceContainerHighest, surfaceBright, surfaceDim, surfaceTint, ...roles } = scheme;
  return { ...base, colors: { ...base.colors, ...roles, statusOk: scheme.primary } };
}

/** The theme chosen in settings ("system" follows the phone), optionally with wallpaper colours. */
export function useResolvedTheme(): { theme: AppTheme; navigation: NavTheme } {
  const preference = usePreferences((s) => s.theme);
  const wallpaper = usePreferences((s) => s.dynamicColor) && supportsWallpaperColors;
  const system = useColorScheme();
  const dark = preference === "dark" || (preference === "system" && system === "dark");

  return useMemo(() => {
    const base = dark ? darkTheme : lightTheme;
    const theme = wallpaper ? wallpaperTheme(base, getMaterial3Theme(lightColors.primary)[dark ? "dark" : "light"]) : base;
    return { theme, navigation: navTheme(theme, dark ? NavDarkTheme : NavLightTheme) };
  }, [dark, wallpaper]);
}

export const useAppTheme = () => useTheme<AppTheme>();
