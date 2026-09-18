import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SubscriptionPlan = "free" | "pro";
export type Subscription = { plan: SubscriptionPlan; status: string; cases_limit: number };

export function useSubscription() {
  return useQuery({
    queryKey: ["subscription"],
    queryFn: async (): Promise<Subscription> => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return { plan: "free", status: "active", cases_limit: 5 };
      const { data, error } = await supabase
        .from("subscriptions")
        .select("plan, status, cases_limit")
        .maybeSingle();
      if (error) throw error;
      if (data) return data as Subscription;
      const fallback: Subscription = { plan: "free", status: "active", cases_limit: 5 };
      const { error: insertError } = await supabase.from("subscriptions").insert({ user_id: userId } as never);
      if (insertError && insertError.code !== "23505") throw insertError;
      return fallback;
    },
    staleTime: 60_000,
  });
}
