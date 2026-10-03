import { createFileRoute, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { canOpenWorkspacePath } from "@/lib/school-access";

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
      <div className="w-full max-w-md rounded-3xl border bg-card p-7 text-center shadow-[var(--shadow-soft)]">
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

    // Legacy team-invite links used the protected /school-team route. Redirect
    // them to the public invite landing page before any auth check so the
    // recipient never gets forced to sign in just to open the invitation.
    if (location.pathname === "/school-team") {
      const params = new URLSearchParams(location.searchStr || "");
      const invite = params.get("invite")?.trim();
      if (invite) {
        throw redirect({
          to: "/school-invite",
          search: { invite },
        });
      }
    }

    let sessionUser = null;
    let invalidSession = false;

    try {
      const { data, error } = await supabase.auth.getSession();
      sessionUser = data.session?.user ?? null;
      invalidSession = Boolean(error && isInvalidSessionError(error));
    } catch (error) {
      invalidSession = isInvalidSessionError(error);
    }

    if (invalidSession) {
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      throw redirect({ to: "/auth", search: { next } });
    }

    if (!sessionUser) {
      throw redirect({ to: "/auth", search: { next } });
    }

    // Enforce role navigation for school-workspace accounts. Database RLS is
    // still the final security boundary; this prevents direct-URL access from
    // rendering pages outside the member's assigned role.
    let roleDenied = false;
    try {
      const { data: schoolContext, error: schoolContextError } = await (supabase as any).rpc(
        "get_my_school_context",
      );
      if (!schoolContextError) {
        roleDenied = !canOpenWorkspacePath(location.pathname, schoolContext?.membership ?? null);
      }
    } catch (error) {
      console.warn("[access] تعذّر التحقق من صلاحية المسار:", error);
      // RLS remains restrictive if the access-context request is temporarily unavailable.
    }
    if (roleDenied) {
      throw redirect({ to: "/dashboard" });
    }

    // Do not block every page transition on a remote getUser() request.
    // Supabase RLS still validates the JWT on every protected data request,
    // while autoRefreshToken keeps the browser session current.
    return { user: sessionUser };
  },
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
  errorComponent: ProtectedAreaError,
});
