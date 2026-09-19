import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { arabicAuthError } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copyright } from "@/components/Copyright";

const DEMO_EMAIL = "demo@thaat.sa";
const DEMO_PASSWORD = "Thaat-Demo-2026";

function safeNext(value: unknown): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "";
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ next: safeNext(s["next"]) }),
  beforeLoad: async ({ search }) => {
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
        content:
          "سجّل الدخول إلى منصة الذات للموجه الطلابي بالبريد الإلكتروني أو حساب Google أو جرّب الحساب التجريبي.",
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
  const { next } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"" | "form" | "google" | "demo">("");

  function goToDashboard() {
    if (next) {
      window.location.replace(next);
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  async function signInWith(mail: string, pass: string) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: mail,
      password: pass,
    });
    return signInError;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy("form");
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo:
              window.location.origin + "/auth" + (next ? `?next=${encodeURIComponent(next)}` : ""),
          },
        });
        if (signUpError) throw signUpError;

        if (data.session) {
          toast.success("تم إنشاء الحساب بنجاح");
          goToDashboard();
          return;
        }
        // No session returned: try signing in directly, otherwise ask for confirmation.
        const signInError = await signInWith(email, password);
        if (!signInError) {
          toast.success("تم إنشاء الحساب بنجاح");
          goToDashboard();
          return;
        }
        toast.info("تم إنشاء الحساب. فعّله عبر الرابط المرسل إلى بريدك ثم سجّل الدخول.");
        setMode("signin");
        return;
      }

      const signInError = await signInWith(email, password);
      if (signInError) throw signInError;
      toast.success("مرحباً بك");
      goToDashboard();
    } catch (err) {
      const message = arabicAuthError((err as Error).message);
      setError(message);
      toast.error(message);
    } finally {
      setBusy("");
    }
  }

  async function googleSignIn() {
    setError("");
    setBusy("google");
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: next
          ? window.location.origin + "/auth?next=" + encodeURIComponent(next)
          : window.location.origin,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      goToDashboard();
    } catch (err) {
      const message = arabicAuthError((err as Error).message ?? "");
      setError(message);
      toast.error(message);
    } finally {
      setBusy("");
    }
  }

  async function demoSignIn() {
    setError("");
    setBusy("demo");
    try {
      let signInError = await signInWith(DEMO_EMAIL, DEMO_PASSWORD);
      if (signInError) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
        });
        if (signUpError && !signUpError.message.toLowerCase().includes("already"))
          throw signUpError;
        if (!data?.session) {
          signInError = await signInWith(DEMO_EMAIL, DEMO_PASSWORD);
          if (signInError) throw signInError;
        }
      }
      toast.success("تم الدخول بالحساب التجريبي");
      goToDashboard();
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

        <div className="mt-6 grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1 text-sm">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError("");
            }}
            className={`rounded-md py-2 font-medium transition-colors ${mode === "signin" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
          >
            تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError("");
            }}
            className={`rounded-md py-2 font-medium transition-colors ${mode === "signup" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
          >
            حساب جديد
          </button>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
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
            <Label htmlFor="password" className="mb-1.5 block">
              كلمة المرور
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={6}
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {mode === "signup" && (
              <p className="mt-1 text-xs text-muted-foreground">6 أحرف على الأقل.</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={busy !== ""}>
            {busy === "form" && <Loader2 className="size-4 animate-spin" />}
            {mode === "signin" ? "دخول" : "إنشاء الحساب"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          أو
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={googleSignIn}
            disabled={busy !== ""}
          >
            {busy === "google" && <Loader2 className="size-4 animate-spin" />}
            المتابعة بحساب Google
          </Button>
          <Button variant="ghost" className="w-full" onClick={demoSignIn} disabled={busy !== ""}>
            {busy === "demo" && <Loader2 className="size-4 animate-spin" />}
            دخول تجريبي بدون تسجيل
          </Button>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          الدخول التجريبي يفتح حساباً مشتركاً للتجربة فقط، لا تُدخل فيه بيانات طلاب حقيقية.
        </p>
      </div>
      <Copyright className="mt-6" />
    </div>
  );
}
