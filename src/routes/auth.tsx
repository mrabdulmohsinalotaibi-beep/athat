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
  if (typeof url !== "string" || url.length === 0) return "/";
  try {
    const parsed = new URL(url, origin);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "/";
    if (parsed.origin !== origin) return "/";
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return "/";
  }
}

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "http://localhost";
    return {
      next: safeNext(search.next, origin),
      mode: (search.mode as ScreenMode) || "signin",
    };
  },
  beforeLoad: async ({ search }) => {
    // Keep the sign-in route accessible even when Supabase is temporarily
    // unavailable (for example, in an unconfigured preview environment).
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        throw redirect({ to: search.next || "/dashboard" });
      }
    } catch (error) {
      // Do not let an auth-service/configuration error prevent the login page
      // from rendering; the form will surface the actionable auth error.
      if (error && typeof error === "object" && "isRedirect" in error) throw error;
    }
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { next, mode: initialMode } = Route.useSearch();

  const [mode, setMode] = useState<ScreenMode>(initialMode);
  const [busy, setBusy] = useState<BusyState>("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("email");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
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
    setBusy("email");
    try {
      const origin = window.location.origin;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${origin}${next || "/"}`,
        },
      });
      if (error) throw error;
      toast.success("تم إنشاء الحساب، تحقق من بريدك الإلكتروني");
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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
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
    setBusy("reset");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("تم تحديث كلمة المرور بنجاح");
      navigate({ to: next || "/" });
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
        <div className="space-y-2 text-center">
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
          className="space-y-4"
        >
          {mode !== "reset" && (
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
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
