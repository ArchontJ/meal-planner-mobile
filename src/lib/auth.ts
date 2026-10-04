import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from "@react-native-google-signin/google-signin";
import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";
import { supabase } from "@/lib/supabase";

type AuthState = {
  status: "loading" | "signedIn" | "signedOut";
  session: Session | null;
};

export const useAuth = create<AuthState>(() => ({ status: "loading", session: null }));

// The Web client ID of the Google provider in Supabase: the ID token is issued
// for it, so Supabase accepts the token. The Android client (package name +
// SHA-1) only has to exist in the same Google Cloud project.
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
export const isGoogleConfigured = Boolean(webClientId);

let initialized = false;

/** Restores the saved session and keeps useAuth in sync. Safe to call more than once. */
export async function initAuth() {
  if (initialized) return;
  initialized = true;

  GoogleSignin.configure({ webClientId });
  supabase.auth.onAuthStateChange((_event, session) => {
    useAuth.setState({ session, status: session ? "signedIn" : "signedOut" });
  });
  const { data } = await supabase.auth.getSession();
  useAuth.setState({ session: data.session, status: data.session ? "signedIn" : "signedOut" });
}

export class SignInCancelled extends Error {
  constructor() {
    super("Sign-in cancelled");
  }
}

/** Native Google sign-in (account picker), then a Supabase session from the ID token. */
export async function signInWithGoogle(): Promise<void> {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) throw new SignInCancelled();

    const token = response.data.idToken;
    if (!token) throw new Error("Google returned no ID token");
    const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token });
    if (error) throw error;
  } catch (e) {
    if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) throw new SignInCancelled();
    throw e;
  }
}

export async function signOut() {
  await supabase.auth.signOut();
  // Forget the chosen Google account so the next sign-in shows the picker again.
  await GoogleSignin.signOut().catch(() => {});
}
