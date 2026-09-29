import { useEffect, useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowRight, KeyRound, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import { Copyright } from "@/components/Copyright";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { arabicAuthError } from "@/lib/auth-errors";

type ScreenMode = "signin" | "signup" | "recover" | "reset";
type BusyState = "" | "email" | "recover" | "reset";

/**
 * تحقق صارم من عنوان URL للتوجيه الداخلي فقط.
 * يمنع Open Redirect عبر: //evil.com، https:evil.com، /\evil.com، %0d، إلخ.
 */
function safeNext(url: unknown, origin: string): string {
  if (typeof url !== "string" || url.length === 0) return "";
  try {
    const parsed = new URL(url, origin);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    if (parsed.origin !== origin) return "";
    const destination = parsed.pathname + parsed.search + parsed.hash;
    // Never redirect back to the auth screens after a successful sign-in.
    if (parsed.pathname === "/auth" || parsed.pathname === "/login") return "";
    return destination;
  } catch {
    return "";
  }
}

export const Route = createFileRoute("/auth")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { next?: string; mode?: ScreenMode } => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const rawMode = search["mode"];
    const mode: ScreenMode =
      rawMode === "signup" || rawMode === "recover" || rawMode === "reset"
        ? rawMode
        : "signin";
    return {
      next: safeNext(search["next"], origin),
      mode,
    };
  },
  beforeLoad: async ({ search }) => {
    // Recovery links create a temporary authenticated session. Never redirect
    // away from the reset screen before the user has chosen a new password.
    if (search["mode"] === "reset") return;

    // Read auth first, then redirect outside the try/catch. This avoids
    // accidentally swallowing TanStack Router's redirect object.
    let hasSession = false;
    try {
      const { data } = await supabase.auth.getSession();
      hasSession = Boolean(data.session?.user);
    } catch {
      // Keep the sign-in page available during temporary auth/network errors.
      return;
    }

    if (hasSession) {
      throw redirect({ to: search["next"] || "/dashboard" });
    }
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const next = search["next"] ?? "";
  const initialMode: ScreenMode = search["mode"] ?? "signin";

  const [mode, setMode] = useState<ScreenMode>(initialMode);
  const [busy, setBusy] = useState<BusyState>("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset");
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("email");
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (error) throw error;
      toast.success("تم تسجيل الدخول بنجاح");
      navigate({ to: next || "/dashboard" });
    } catch (err) {
      toast.error(arabicAuthError(err));
    } finally {
      setBusy("");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }
    if (password.length < 8) {
      toast.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    setBusy("email");
    try {
      const origin = window.location.origin;
      const normalizedEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          // Always return through the auth route so Supabase can finish the
          // confirmation exchange before entering protected pages.
          emailRedirectTo: `${origin}/auth?next=${encodeURIComponent(next || "/dashboard")}`,
        },
      });
      if (error) throw error;

      if (data.session) {
        toast.success("تم إنشاء الحساب وتسجيل الدخول بنجاح");
        navigate({ to: next || "/dashboard" });
        return;
      }

      toast.success("تم إنشاء الحساب. افتح رسالة التأكيد في بريدك ثم سجّل الدخول.");
      setMode("signin");
    } catch (err) {
      toast.error(arabicAuthError(err));
    } finally {
      setBusy("");
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("recover");
    try {
      const origin = window.location.origin;
      const normalizedEmail = email.trim().toLowerCase();
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${origin}/auth?mode=reset`,
      });
      if (error) throw error;
      toast.success("تم إرسال رابط استعادة كلمة المرور");
      setMode("signin");
    } catch (err) {
      toast.error(arabicAuthError(err));
    } finally {
      setBusy("");
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }
    if (password.length < 8) {
      toast.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    setBusy("reset");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("تم تحديث كلمة المرور بنجاح");
      navigate({ to: next || "/dashboard" });
    } catch (err) {
      toast.error(arabicAuthError(err));
    } finally {
      setBusy("");
    }
  };

  const isLoading = busy !== "";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <img
            src="/brand-logo.svg"
            alt="الذات ATHAT"
            className="mx-auto h-auto w-56 max-w-full"
          />
          <p className="mt-2 text-xs font-bold tracking-wide text-primary">
            علم النفس · التوجيه الطلابي · النمو
          </p>
        </div>
        <div className="space-y-2 rounded-3xl border bg-card p-6 text-center shadow-[var(--shadow-soft)]">
          <h1 className="text-3xl font-bold tracking-tight">
            {mode === "signin" && "تسجيل الدخول"}
            {mode === "signup" && "إنشاء حساب"}
            {mode === "recover" && "استعادة كلمة المرور"}
            {mode === "reset" && "تعيين كلمة مرور جديدة"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "signin" && "أدخل بياناتك للمتابعة"}
            {mode === "signup" && "أنشئ حسابك الجديد"}
            {mode === "recover" && "سنرسل لك رابطاً لاستعادة كلمة المرور"}
            {mode === "reset" && "أدخل كلمة المرور الجديدة"}
          </p>
        </div>

        </div>

        <form
          onSubmit={
            mode === "signin"
              ? handleSignIn
              : mode === "signup"
                ? handleSignUp
                : mode === "recover"
                  ? handleRecover
                  : handleReset
          }
          className="space-y-4 rounded-3xl border bg-card p-6 shadow-[var(--shadow-card)]"
        >
          {mode !== "reset" && (
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  dir="ltr"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="pr-10"
                />
              </div>
            </div>
          )}

          {mode !== "recover" && (
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <div className="relative">
                <KeyRound className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  minLength={8}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  dir="ltr"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="pr-10"
                />
              </div>
            </div>
          )}

          {(mode === "signup" || mode === "reset") && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
              <div className="relative">
                <KeyRound className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  dir="ltr"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className="pr-10"
                />
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                جاري المعالجة...
              </>
            ) : (
              <>
                {mode === "signin" && "تسجيل الدخول"}
                {mode === "signup" && "إنشاء الحساب"}
                {mode === "recover" && "إرسال الرابط"}
                {mode === "reset" && "تحديث كلمة المرور"}
                <ArrowRight className="mr-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <div className="space-y-2 text-center text-sm">
          {mode === "signin" && (
            <>
              <button
                type="button"
                onClick={() => setMode("recover")}
                className="block w-full text-primary hover:underline"
              >
                نسيت كلمة المرور؟
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="block w-full text-muted-foreground hover:text-primary hover:underline"
              >
                ليس لديك حساب؟ أنشئ حساباً جديداً
              </button>
            </>
          )}
          {mode === "signup" && (
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="text-muted-foreground hover:text-primary hover:underline"
            >
              لديك حساب بالفعل؟ سجّل الدخول
            </button>
          )}
          {(mode === "recover" || mode === "reset") && (
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="text-muted-foreground hover:text-primary hover:underline"
            >
              العودة لتسجيل الدخول
            </button>
          )}
        </div>

        <Copyright />
      </div>
    </div>
  );
}
