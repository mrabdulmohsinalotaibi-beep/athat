import { createFileRoute, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";

function isInvalidSessionError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message ?? "").toLowerCase()
      : String(error ?? "").toLowerCase();

  return (
    message.includes("auth session missing") ||
    message.includes("invalid jwt") ||
    message.includes("jwt expired") ||
    message.includes("session expired") ||
    message.includes("refresh token") ||
    message.includes("user not found")
  );
}

function ProtectedAreaError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const authProblem = isInvalidSessionError(error);

  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-3xl border bg-card p-7 text-center shadow-sm">
        <h1 className="text-xl font-black">
          {authProblem ? "تحتاج إلى تسجيل الدخول من جديد" : "تعذّر فتح هذه الصفحة"}
        </h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          {authProblem
            ? "انتهت جلسة الدخول أو تعذّر التحقق منها."
            : "لم يتم تحميل الصفحة بشكل كامل. أعد المحاولة، ولن تتأثر بقية أقسام المنصة."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {!authProblem && (
            <button
              type="button"
              onClick={() => {
                router.invalidate();
                reset();
              }}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
            >
              إعادة المحاولة
            </button>
          )}
          <button
            type="button"
            onClick={() => window.location.assign(authProblem ? "/auth?next=%2Fdashboard" : "/dashboard")}
            className="rounded-xl border px-4 py-2 text-sm font-bold"
          >
            {authProblem ? "تسجيل الدخول" : "العودة للوحة التحكم"}
          </button>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const next = location.pathname + location.searchStr + location.hash;

    let sessionUser = null;
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error && isInvalidSessionError(error)) {
        await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
        throw redirect({ to: "/auth", search: { next } });
      }
      sessionUser = data.session?.user ?? null;
    } catch (error) {
      // Router redirects must continue to the router.
      if (error && typeof error === "object" && "isRedirect" in error) throw error;
      // A temporary network failure should not crash protected routing, but
      // without any local session we must return to sign-in.
      if (!sessionUser) throw redirect({ to: "/auth", search: { next } });
    }

    if (!sessionUser) {
      throw redirect({ to: "/auth", search: { next } });
    }

    try {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data.user) return { user: data.user };

      if (error && isInvalidSessionError(error)) {
        await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
        throw redirect({ to: "/auth", search: { next } });
      }
    } catch (error) {
      if (error && typeof error === "object" && "isRedirect" in error) throw error;
      if (isInvalidSessionError(error)) {
        await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
        throw redirect({ to: "/auth", search: { next } });
      }
      // Keep the locally persisted session during a transient connectivity error.
    }

    return { user: sessionUser };
  },
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
  errorComponent: ProtectedAreaError,
});
