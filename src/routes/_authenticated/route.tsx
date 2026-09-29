import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Prefer the locally persisted session so temporary network/API failures do
    // not make every protected page look broken. getUser() still verifies the
    // identity when the auth service is reachable.
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) {
      throw redirect({ to: "/auth", search: { next: "" } });
    }
    try {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data.user) return { user: data.user };
    } catch {
      // Keep the valid persisted session during a transient connectivity error.
    }
    return { user: sessionData.session.user };
  },
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
});
