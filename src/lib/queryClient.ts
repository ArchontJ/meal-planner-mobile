import "expo-sqlite/localStorage/install";
import NetInfo from "@react-native-community/netinfo";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { focusManager, onlineManager, QueryClient } from "@tanstack/react-query";
import { AppState, Platform } from "react-native";

/** How long loaded data stays usable offline (plan, recipes, settings). */
export const OFFLINE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data older than this is refetched when the app or a screen comes back into view,
      // so changes made on the desktop show up without restarting the app.
      staleTime: 15_000,
      // Keep data around (and in the saved cache) long enough to cook and shop without signal.
      gcTime: OFFLINE_MAX_AGE,
      retry: 1,
    },
  },
});

/** The query cache is saved on the phone, so the last loaded data opens without a connection. */
export const queryPersister = createAsyncStoragePersister({
  storage: localStorage,
  key: "mealplanner-query-cache",
  throttleTime: 2_000,
});

// React Native has no window focus: tell TanStack Query when the app returns to the foreground.
AppState.addEventListener("change", (state) => {
  if (Platform.OS !== "web") focusManager.setFocused(state === "active");
});

// Pause fetching while offline and refetch when the connection is back.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(state.isConnected !== false && state.isInternetReachable !== false)),
);
