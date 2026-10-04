import { useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";

/**
 * When a screen comes back into focus (switching tabs, returning from a detail screen),
 * refetch the stale queries currently in use, e.g. a plan changed on the desktop.
 */
export function useRefreshOnFocus() {
  const queryClient = useQueryClient();
  const first = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false; // the screen's own first load already fetched
        return;
      }
      void queryClient.refetchQueries({ type: "active", stale: true });
    }, [queryClient]),
  );
}
