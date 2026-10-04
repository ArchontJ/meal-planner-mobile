import { focusManager, QueryClient } from "@tanstack/react-query";
import { AppState, Platform } from "react-native";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data older than this is refetched when the app or a screen comes back into view,
      // so changes made on the desktop show up without restarting the app.
      staleTime: 15_000,
      retry: 1,
    },
  },
});

// React Native has no window focus: tell TanStack Query when the app returns to the foreground.
AppState.addEventListener("change", (state) => {
  if (Platform.OS !== "web") focusManager.setFocused(state === "active");
});
