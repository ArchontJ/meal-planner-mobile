import { useEffect, useRef } from "react";
import { useProfile } from "@/features/profile/api";
import { LANGUAGES, THEMES, usePreferences, type Language, type Theme } from "@/lib/preferences";

/**
 * After sign-in, the language and theme saved in the profile (shared with the
 * desktop) win over this phone's local values – applied once per signed-in user.
 */
export function ProfilePreferencesSync() {
  const { data: profile } = useProfile();
  const appliedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!profile || appliedFor.current === profile.id) return;
    appliedFor.current = profile.id;

    const { setLanguage, setTheme } = usePreferences.getState();
    if (LANGUAGES.includes(profile.language as Language)) setLanguage(profile.language as Language);
    if (THEMES.includes(profile.theme as Theme)) setTheme(profile.theme as Theme);
  }, [profile]);

  return null;
}
