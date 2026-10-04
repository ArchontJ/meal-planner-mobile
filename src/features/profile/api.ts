import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { TablesUpdate } from "@/types/database";

const profileKey = (userId: string | undefined) => ["profile", userId] as const;

export const profileOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: profileKey(userId),
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId!).single();
      if (error) throw error;
      return data;
    },
  });

export function useProfile() {
  const userId = useAuth((s) => s.session?.user.id);
  return useQuery(profileOptions(userId));
}

/** The phone only writes language and theme; everything else is edited on the desktop. */
export function useUpdateProfile() {
  const userId = useAuth((s) => s.session?.user.id);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: Pick<TablesUpdate<"profiles">, "language" | "theme">) => {
      const { data, error } = await supabase.from("profiles").update(patch).eq("id", userId!).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => queryClient.setQueryData(profileKey(userId), data),
  });
}
