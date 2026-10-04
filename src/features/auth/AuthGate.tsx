import { useQueryClient } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { View } from "react-native";
import { ActivityIndicator } from "react-native-paper";
import { SignInScreen } from "@/features/auth/SignInScreen";
import { ProfilePreferencesSync } from "@/features/profile/ProfilePreferencesSync";
import { initAuth, useAuth } from "@/lib/auth";
import { useAppTheme } from "@/theme/theme";

/** Shows the app only to a signed-in user; otherwise the sign-in screen. */
export function AuthGate({ children }: { children: ReactNode }) {
  const status = useAuth((s) => s.status);
  const userId = useAuth((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const theme = useAppTheme();

  useEffect(() => {
    void initAuth();
  }, []);

  // Never show one user's cached data to another account.
  useEffect(() => {
    if (!userId) queryClient.clear();
  }, [userId, queryClient]);

  if (status === "loading") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.background }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (status === "signedOut") return <SignInScreen />;
  return (
    <>
      <ProfilePreferencesSync />
      {children}
    </>
  );
}
