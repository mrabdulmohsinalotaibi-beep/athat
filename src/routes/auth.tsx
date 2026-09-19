import { useState } from "react";
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

function safeNext(value: unknown): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "";
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    next: safeNext(s["next"]),
    reset: s["reset"] === "1",
  }),
  beforeLoad: async ({ search }) => {
    // A password-recovery link creates a temporary session that must stay on this
    // page long enough for the user to choose a new password.
    if (search.reset) return;

    const { data } = await supabase.auth.getUser();
    if (data.user) {
      if (search.next) throw redirect({ href: search.next });
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "تسجيل الدخول | منصة الذات" },
      {
        name: "description",
        content: "تسجيل الدخول واستعادة كلمة المرور في منصة الذات للموجه الطلابي.",
      },
      { property: "og:title", content: "تسجيل الدخول | منصة الذات" },
      { property: "og:description", content: "الدخول إلى سجلات الموجه الطلابي في منصة الذات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { next, reset } = Route.useSearch();
  const [screen, setScreen] = useState<ScreenMode>(reset ? "reset" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<BusyState>("");
  const [recoverySent, setRecoverySent] = useState(false);

  const isAccountScreen = screen === "signin" || screen === "signup";

  function goToDashboard() {
    if (next) {
      window.location.replace(next);
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  function showScreen(nextScreen: ScreenMode) {
    setScreen(nextScreen);
    setError("");
    setPassword("");
    setConfirmation("");
    if (nextScreen !== "recover") setRecoverySent(false);
  }

  async function onEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy("email");

    try {
      if (screen === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
          },
        });
        if (signUpError) throw signUpError;

        if (data.session) {
          toast.success("تم إنشاء الحساب وتسجيل الدخول بنجاح");
          goToDashboard();
          return;
        }

        toast.success("تم إنشاء الحساب. تحقق من بريدك لتأكيده ثم سجّل الدخول.");
        showScreen("signin");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;

      toast.success("مرحباً بك في منصة الذات");
      goToDashboard();
    } catch (err) {
      const message = arabicAuthError((err as Error).message);
      setError(message);
      toast.error(message);
    } finally {
      setBusy("");
    }
  }

  async function sendRecoveryEmail(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy("recover");

    try {
      const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth?reset=1`,
      });
      if (recoveryError) throw recoveryError;

      // The neutral wording avoids revealing whether a particular email has an account.
      setRecoverySent(true);
      toast.success("تم إرسال تعليمات الاستعادة إذا كان البريد مسجلاً في المنصة.");
    } catch (err) {
      const message = arabicAuthError((err as Error).message);
      setError(message);
      toast.error(message);
    } finally {
      setBusy("");
    }
  }

  async function setNewPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      const message = "استخدم كلمة مرور من 8 أحرف على الأقل.";
      setError(message);
      toast.error(message);
      return;
    }
    if (password !== confirmation) {
      const message = "تأكيد كلمة المرور لا يطابق كلمة المرور الجديدة.";
      setError(message);
      toast.error(message);
      return;
    }

    setBusy("reset");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("recovery session missing");
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      toast.success("تم تحديث كلمة المرور بنجاح.");
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      const message = arabicAuthError((err as Error).message);
      setError(message);
      toast.error(message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary/40 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-sm sm:p-8">
        <div className="text-center">
          <img
            src="/IMG_3331.png"
            alt="شعار منصة الذات"
            className="mx-auto size-24 object-contain"
          />
          <p className="mt-2 text-3xl font-extrabold text-primary">الذات</p>
          <p className="mt-1 text-sm text-muted-foreground">منصة الموجه الطلابي</p>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        {isAccountScreen && (
          <>
            <div className="mt-6 grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1 text-sm">
              <button
                type="button"
                onClick={() => showScreen("signin")}
                className={`rounded-md py-2 font-medium transition-colors ${
                  screen === "signin" ? "bg-card shadow-sm" : "text-muted-foreground"
                }`}
              >
                تسجيل الدخول
              </button>
              <button
                type="button"
                onClick={() => showScreen("signup")}
                className={`rounded-md py-2 font-medium transition-colors ${
                  screen === "signup" ? "bg-card shadow-sm" : "text-muted-foreground"
                }`}
              >
                حساب جديد
              </button>
            </div>

            <form onSubmit={onEmailSubmit} className="mt-5 space-y-4">
              <div>
                <Label htmlFor="email" className="mb-1.5 block">
                  البريد الإلكتروني
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <Label htmlFor="password">كلمة المرور</Label>
                  {screen === "signin" && (
                    <button
                      type="button"
                      onClick={() => showScreen("recover")}
                      className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete={screen === "signin" ? "current-password" : "new-password"}
                  required
                  minLength={screen === "signup" ? 8 : 6}
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {screen === "signup" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    استخدم 8 أحرف على الأقل لحماية حسابك.
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={busy !== ""}>
                {busy === "email" && <Loader2 className="size-4 animate-spin" />}
                {screen === "signin" ? "دخول بالبريد الإلكتروني" : "إنشاء حساب بالبريد الإلكتروني"}
              </Button>
            </form>
          </>
        )}

        {screen === "recover" && (
          <>
            <div className="mt-6 rounded-xl border border-primary/15 bg-primary/5 p-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <KeyRound className="size-4 text-primary" /> استعادة كلمة المرور
              </div>
              <p className="mt-1">
                أدخل بريدك الإلكتروني وسنرسل رابطًا آمنًا لاختيار كلمة مرور جديدة.
              </p>
            </div>
            <form onSubmit={sendRecoveryEmail} className="mt-5 space-y-4">
              <div>
                <Label htmlFor="recovery-email" className="mb-1.5 block">
                  البريد الإلكتروني
                </Label>
                <Input
                  id="recovery-email"
                  type="email"
                  autoComplete="email"
                  required
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy !== "" || recoverySent}>
                {busy === "recover" && <Loader2 className="size-4 animate-spin" />}
                {recoverySent ? "تم إرسال الرابط" : "إرسال رابط الاستعادة"}
              </Button>
            </form>
            {recoverySent && (
              <p className="mt-3 rounded-lg bg-secondary px-3 py-2 text-center text-sm text-muted-foreground">
                تفقد البريد الوارد والبريد غير الهام، ثم افتح الرابط من نفس المتصفح.
              </p>
            )}
            <button
              type="button"
              onClick={() => showScreen("signin")}
              className="mt-5 flex w-full items-center justify-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              <ArrowRight className="size-4" /> العودة إلى تسجيل الدخول
            </button>
          </>
        )}

        {screen === "reset" && (
          <>
            <div className="mt-6 rounded-xl border border-primary/15 bg-primary/5 p-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <KeyRound className="size-4 text-primary" /> تعيين كلمة مرور جديدة
              </div>
              <p className="mt-1">اختر كلمة مرور جديدة لا تقل عن 8 أحرف، ثم أكمل الدخول.</p>
            </div>
            <form onSubmit={setNewPassword} className="mt-5 space-y-4">
              <div>
                <Label htmlFor="new-password" className="mb-1.5 block">
                  كلمة المرور الجديدة
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="password-confirmation" className="mb-1.5 block">
                  تأكيد كلمة المرور الجديدة
                </Label>
                <Input
                  id="password-confirmation"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  dir="ltr"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy !== ""}>
                {busy === "reset" && <Loader2 className="size-4 animate-spin" />}
                حفظ كلمة المرور والدخول
              </Button>
            </form>
            <button
              type="button"
              onClick={() => window.location.assign("/auth")}
              className="mt-5 flex w-full items-center justify-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              <ArrowRight className="size-4" /> طلب رابط استعادة جديد
            </button>
          </>
        )}

        <div className="mt-6 border-t pt-4 text-center text-xs text-muted-foreground">
          الدخول متاح بالبريد الإلكتروني وكلمة المرور فقط لضمان استقرار الخدمة.
        </div>
      </div>
      <Copyright className="mt-6" />
    </div>
  );
}
