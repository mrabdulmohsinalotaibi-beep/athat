import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Loader2, Mail, MessageSquareText, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Copyright } from "@/components/Copyright";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { arabicAuthError } from "@/lib/auth-errors";
import { normalizeSaudiPhone } from "@/lib/whatsapp";

const DEMO_EMAIL = "demo@thaat.sa";
const DEMO_PASSWORD = "Thaat-Demo-2026";

type Channel = "email" | "phone";
type EmailMode = "signin" | "signup";
type PhoneStep = "phone" | "verify";
type BusyState = "" | "email" | "phone" | "verify" | "demo";

function safeNext(value: unknown): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "";
}

function toSaudiE164(value: string): string {
  const normalized = normalizeSaudiPhone(value);
  return /^9665\d{8}$/.test(normalized) ? `+${normalized}` : "";
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
        content: "سجّل الدخول إلى منصة الذات للموجه الطلابي بالبريد الإلكتروني أو رمز الجوال.",
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
  const [channel, setChannel] = useState<Channel>("email");
  const [emailMode, setEmailMode] = useState<EmailMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("phone");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<BusyState>("");

  function goToDashboard() {
    if (next) {
      window.location.replace(next);
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  function selectChannel(nextChannel: Channel) {
    setChannel(nextChannel);
    setError("");
    if (nextChannel === "phone") {
      setPhoneStep("phone");
      setOtp("");
    }
  }

  async function signInWithEmail(mail: string, pass: string) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: mail.trim(),
      password: pass,
    });
    return signInError;
  }

  async function onEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy("email");
    try {
      if (emailMode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo:
              window.location.origin + "/auth" + (next ? `?next=${encodeURIComponent(next)}` : ""),
          },
        });
        if (signUpError) throw signUpError;

        if (data.session) {
          toast.success("تم إنشاء الحساب وتسجيل الدخول بنجاح");
          goToDashboard();
          return;
        }

        toast.info("تم إنشاء الحساب. فعّله عبر الرابط المرسل إلى بريدك ثم سجّل الدخول.");
        setEmailMode("signin");
        return;
      }

      const signInError = await signInWithEmail(email, password);
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

  async function sendPhoneCode() {
    setError("");
    const e164 = toSaudiE164(phone);
    if (!e164) {
      const message = "أدخل رقم جوال سعودي صحيحًا، مثل 05XXXXXXXX أو +9665XXXXXXXX.";
      setError(message);
      toast.error(message);
      return;
    }

    setBusy("phone");
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({ phone: e164 });
      if (otpError) throw otpError;
      setVerifiedPhone(e164);
      setPhoneStep("verify");
      toast.success("تم إرسال رمز التحقق برسالة نصية إلى جوالك.");
    } catch (err) {
      const message = arabicAuthError((err as Error).message);
      setError(message);
      toast.error(message);
    } finally {
      setBusy("");
    }
  }

  async function requestPhoneCode(e: React.FormEvent) {
    e.preventDefault();
    await sendPhoneCode();
  }

  async function verifyPhoneCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const token = otp.replace(/\D/g, "");
    if (token.length < 6) {
      const message = "أدخل رمز التحقق المكوّن من 6 أرقام.";
      setError(message);
      toast.error(message);
      return;
    }

    setBusy("verify");
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: verifiedPhone,
        token,
        type: "sms",
      });
      if (verifyError) throw verifyError;
      toast.success("تم التحقق من رقم الجوال وتسجيل الدخول.");
      goToDashboard();
    } catch (err) {
      const message = arabicAuthError((err as Error).message);
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
      let signInError = await signInWithEmail(DEMO_EMAIL, DEMO_PASSWORD);
      if (signInError) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
        });
        if (signUpError && !signUpError.message.toLowerCase().includes("already")) {
          throw signUpError;
        }
        if (!data?.session) {
          signInError = await signInWithEmail(DEMO_EMAIL, DEMO_PASSWORD);
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
            onClick={() => selectChannel("email")}
            className={`flex items-center justify-center gap-1.5 rounded-md py-2 font-medium transition-colors ${
              channel === "email" ? "bg-card shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Mail className="size-4" /> البريد الإلكتروني
          </button>
          <button
            type="button"
            onClick={() => selectChannel("phone")}
            className={`flex items-center justify-center gap-1.5 rounded-md py-2 font-medium transition-colors ${
              channel === "phone" ? "bg-card shadow-sm" : "text-muted-foreground"
            }`}
          >
            <MessageSquareText className="size-4" /> رقم الجوال
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

        {channel === "email" ? (
          <>
            <div className="mt-5 grid grid-cols-2 gap-1 rounded-lg bg-secondary/70 p-1 text-sm">
              <button
                type="button"
                onClick={() => {
                  setEmailMode("signin");
                  setError("");
                }}
                className={`rounded-md py-2 font-medium transition-colors ${
                  emailMode === "signin" ? "bg-card shadow-sm" : "text-muted-foreground"
                }`}
              >
                تسجيل الدخول
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmailMode("signup");
                  setError("");
                }}
                className={`rounded-md py-2 font-medium transition-colors ${
                  emailMode === "signup" ? "bg-card shadow-sm" : "text-muted-foreground"
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
                <Label htmlFor="password" className="mb-1.5 block">
                  كلمة المرور
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={emailMode === "signin" ? "current-password" : "new-password"}
                  required
                  minLength={6}
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {emailMode === "signup" && (
                  <p className="mt-1 text-xs text-muted-foreground">6 أحرف على الأقل.</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={busy !== ""}>
                {busy === "email" && <Loader2 className="size-4 animate-spin" />}
                {emailMode === "signin"
                  ? "دخول بالبريد الإلكتروني"
                  : "إنشاء حساب بالبريد الإلكتروني"}
              </Button>
            </form>
          </>
        ) : phoneStep === "phone" ? (
          <form onSubmit={requestPhoneCode} className="mt-5 space-y-4">
            <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <ShieldCheck className="size-4 text-primary" /> دخول آمن برمز التحقق
              </div>
              <p className="mt-1">
                سنرسل رمزًا من 6 أرقام إلى رقم الجوال للتحقق والدخول أو إنشاء حساب جديد.
              </p>
            </div>
            <div>
              <Label htmlFor="phone" className="mb-1.5 block">
                رقم الجوال السعودي
              </Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                dir="ltr"
                placeholder="05XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                اكتب الرقم بصيغة 05XXXXXXXX أو +9665XXXXXXXX.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={busy !== ""}>
              {busy === "phone" && <Loader2 className="size-4 animate-spin" />}
              إرسال رمز التحقق
            </Button>
          </form>
        ) : (
          <form onSubmit={verifyPhoneCode} className="mt-5 space-y-4">
            <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-sm text-muted-foreground">
              تم إرسال رمز تحقق إلى{" "}
              <span dir="ltr" className="font-semibold text-foreground">
                {verifiedPhone}
              </span>
            </div>
            <div>
              <Label htmlFor="otp" className="mb-1.5 block">
                رمز التحقق
              </Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                dir="ltr"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy !== ""}>
              {busy === "verify" && <Loader2 className="size-4 animate-spin" />}
              تحقق وتسجيل الدخول
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPhoneStep("phone");
                  setOtp("");
                  setError("");
                }}
                disabled={busy !== ""}
              >
                <ArrowRight className="size-4" /> تعديل الرقم
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={sendPhoneCode}
                disabled={busy !== ""}
              >
                إعادة الإرسال
              </Button>
            </div>
          </form>
        )}

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> أو <span className="h-px flex-1 bg-border" />
        </div>

        <Button variant="ghost" className="w-full" onClick={demoSignIn} disabled={busy !== ""}>
          {busy === "demo" && <Loader2 className="size-4 animate-spin" />}
          دخول تجريبي بدون تسجيل
        </Button>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          الدخول التجريبي يفتح حساباً مشتركاً للتجربة فقط، لا تُدخل فيه بيانات طلاب حقيقية.
        </p>
      </div>
      <Copyright className="mt-6" />
    </div>
  );
}
