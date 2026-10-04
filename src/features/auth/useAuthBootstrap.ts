import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { initAuth, useAuth } from "@/lib/auth";

/** Restores the session on start and never shows one user's cached data to another account. */
export function useAuthBootstrap() {
  const status = useAuth((s) => s.status);
  const userId = useAuth((s) => s.session?.user.id);
  const queryClient = useQueryClient();

  useEffect(() => {
    void initAuth();
  }, []);

  useEffect(() => {
    if (!userId) queryClient.clear();
  }, [userId, queryClient]);

  return status;
}
