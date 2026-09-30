import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export function useAuthUser() {
  return useQuery({
    queryKey: ["auth-user"],
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();

      try {
        const { data, error } = await supabase.auth.getUser();
        if (!error && data.user) return data.user;
      } catch {
        // Fall back to the locally persisted session during a transient network issue.
      }

      if (sessionData.session?.user) return sessionData.session.user;
      throw new Error("لم يتم العثور على جلسة دخول.");
    },
  });
}
