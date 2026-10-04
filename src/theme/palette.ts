// "Szałwia" (sage): Material 3 roles from the app icon green #1D9E75 with low
// chroma, so the app stays calm. Agreed palette – change it only together with
// the design notes.
import type { MD3Theme } from "react-native-paper";

export type AppColors = MD3Theme["colors"] & {
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  // Macro chart colours are the desktop's (validated for colour-blind readers).
  macroProtein: string;
  macroFat: string;
  macroCarbs: string;
  // Goal status text: always shown with an icon and a word, never colour alone.
  statusOk: string;
  statusWarn: string;
  statusOver: string;
};

export const lightColors: AppColors = {
  primary: "#3B6B58",
  onPrimary: "#FFFFFF",
  primaryContainer: "#D3E8DC",
  onPrimaryContainer: "#0F2A1F",
  secondary: "#56615B",
  onSecondary: "#FFFFFF",
  secondaryContainer: "#DDE5DF",
  onSecondaryContainer: "#1A211D",
  tertiary: "#4D6273",
  onTertiary: "#FFFFFF",
  tertiaryContainer: "#D2E4F6",
  onTertiaryContainer: "#071E2C",
  error: "#BA1A1A",
  onError: "#FFFFFF",
  errorContainer: "#FFDAD6",
  onErrorContainer: "#410002",
  background: "#F7F9F7",
  onBackground: "#191C1A",
  surface: "#F7F9F7",
  onSurface: "#191C1A",
  surfaceVariant: "#DEE4DF",
  onSurfaceVariant: "#434845",
  outline: "#737975",
  outlineVariant: "#C3C8C4",
  shadow: "#000000",
  scrim: "#000000",
  inverseSurface: "#2E312F",
  inverseOnSurface: "#EFF1EE",
  inversePrimary: "#A3CFBA",
  elevation: {
    level0: "transparent",
    level1: "#F0F3F0",
    level2: "#EAEDEA",
    level3: "#E5E8E5",
    level4: "#E2E5E2",
    level5: "#DFE2DF",
  },
  surfaceDisabled: "rgba(25, 28, 26, 0.12)",
  onSurfaceDisabled: "rgba(25, 28, 26, 0.38)",
  backdrop: "rgba(45, 49, 46, 0.4)",
  surfaceContainerLow: "#F0F3F0",
  surfaceContainer: "#EAEDEA",
  surfaceContainerHigh: "#E5E8E5",
  macroProtein: "#2a78d6",
  macroFat: "#eb6834",
  macroCarbs: "#1baf7a",
  statusOk: "#3B6B58",
  statusWarn: "#8A5100",
  statusOver: "#BA1A1A",
};

export const darkColors: AppColors = {
  primary: "#A3CFBA",
  onPrimary: "#0B3526",
  primaryContainer: "#2A4A3D",
  onPrimaryContainer: "#C9E7D7",
  secondary: "#BEC9C2",
  onSecondary: "#29332D",
  secondaryContainer: "#39443E",
  onSecondaryContainer: "#D9E3DC",
  tertiary: "#B5C9DB",
  onTertiary: "#1F3342",
  tertiaryContainer: "#364A59",
  onTertiaryContainer: "#D2E4F6",
  error: "#FFB4AB",
  onError: "#690005",
  errorContainer: "#93000A",
  onErrorContainer: "#FFDAD6",
  background: "#111412",
  onBackground: "#E1E3E0",
  surface: "#111412",
  onSurface: "#E1E3E0",
  surfaceVariant: "#434845",
  onSurfaceVariant: "#C3C8C4",
  outline: "#8D928E",
  outlineVariant: "#434845",
  shadow: "#000000",
  scrim: "#000000",
  inverseSurface: "#E1E3E0",
  inverseOnSurface: "#2E312F",
  inversePrimary: "#3B6B58",
  elevation: {
    level0: "transparent",
    level1: "#191C1A",
    level2: "#1D201E",
    level3: "#272A28",
    level4: "#2B2E2C",
    level5: "#313432",
  },
  surfaceDisabled: "rgba(225, 227, 224, 0.12)",
  onSurfaceDisabled: "rgba(225, 227, 224, 0.38)",
  backdrop: "rgba(45, 49, 46, 0.4)",
  surfaceContainerLow: "#191C1A",
  surfaceContainer: "#1D201E",
  surfaceContainerHigh: "#272A28",
  macroProtein: "#3987e5",
  macroFat: "#d95926",
  macroCarbs: "#199e70",
  statusOk: "#A3CFBA",
  statusWarn: "#FFB95C",
  statusOver: "#FFB4AB",
};
