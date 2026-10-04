import "expo-sqlite/localStorage/install";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const LANGUAGES = ["pl", "en"] as const;
export type Language = (typeof LANGUAGES)[number];
export type Theme = "light" | "dark" | "system";
export const THEMES: Theme[] = ["system", "light", "dark"];

type PreferencesState = {
  // Synced with the profile (shared with the desktop) once signed in.
  language: Language;
  theme: Theme;
  // Phone only.
  dynamicColor: boolean;
  keepAwakeWhileCooking: boolean;
  setLanguage: (language: Language) => void;
  setTheme: (theme: Theme) => void;
  setDynamicColor: (on: boolean) => void;
  setKeepAwakeWhileCooking: (on: boolean) => void;
};

// Stored on the device so the app starts in the right language and theme
// before the profile has loaded.
export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      language: "pl",
      theme: "system",
      dynamicColor: false,
      keepAwakeWhileCooking: true,
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
      setDynamicColor: (dynamicColor) => set({ dynamicColor }),
      setKeepAwakeWhileCooking: (keepAwakeWhileCooking) => set({ keepAwakeWhileCooking }),
    }),
    { name: "mealplanner-preferences", storage: createJSONStorage(() => localStorage) },
  ),
);
