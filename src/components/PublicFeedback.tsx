import { useState } from "react";
import { CheckCircle2, MessageSquareText, Send, Star } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const PARTICIPANT_ROLES = ["طالب/ـة", "ولي أمر", "معلم/ـة", "إداري/ـة", "مستفيد آخر"];
const FEEDBACK_CATEGORIES = ["رأي", "مقترح", "استفسار", "طلب مساعدة", "شكر", "ملاحظة"];

export function PublicFeedback({ token }: { token: string }) {
  const [senderName, setSenderName] = useState("");
  const [senderContact, setSenderContact] = useState("");
  const [senderRole, setSenderRole] = useState("مستفيد آخر");
  const [category, setCategory] = useState("رأي");
  const [satisfaction, setSatisfaction] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (message.trim().length < 3) {
      toast.error("اكتب رسالتك بشكل أوضح قبل الإرسال.");
      return;
    }
    setBusy(true);
    const { error } = await (supabase as any).rpc("submit_public_feedback", {
      p_token: token,
      p_sender_name: senderName.trim() || "مستفيد",
      p_sender_contact: senderContact.trim(),
      p_sender_role: senderRole,
      p_category: category,
      p_satisfaction: satisfaction,
      p_message: message.trim(),
    });
    setBusy(false);

    if (error) {
      toast.error(error.message || "تعذّر إرسال المشاركة.");
      return;
    }
    setSent(true);
    setSenderName("");
    setSenderContact("");
    setSatisfaction(null);
    setMessage("");
  }

  if (sent) {
    return (
      <main
        className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-4 py-10"
        dir="rtl"
      >
        <section className="w-full rounded-[2rem] border border-primary/15 bg-card p-8 text-center shadow-xl shadow-primary/10">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="size-9" />
          </div>
          <h1 className="mt-5 text-2xl font-black text-foreground">شكرًا لمشاركتك</h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            تم استلام استبانتك بنجاح، وسيتم التعامل مع الملاحظات بسرية واهتمام.
          </p>
          <Button className="mt-6" onClick={() => setSent(false)}>
            إرسال مشاركة أخرى
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen bg-[radial-gradient(circle_at_top_right,_color-mix(in_oklab,_var(--accent)_70%,transparent),_transparent_32rem)] px-4 py-8 sm:py-14"
      dir="rtl"
    >
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <MessageSquareText className="size-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-primary">منصة الذات للتوجيه الطلابي</p>
            <h1 className="text-xl font-black text-foreground sm:text-2xl">
              استبانة الآراء والمقترحات
            </h1>
          </div>
        </header>

        <form
          onSubmit={submit}
          className="rounded-[2rem] border border-primary/12 bg-card p-5 shadow-xl shadow-primary/10 sm:p-8"
        >
          <div className="mb-6 rounded-2xl bg-accent/60 p-4 text-sm leading-7 text-accent-foreground">
            نرحب برأيك ومقترحاتك حول خدمات التوجيه الطلابي. جميع الحقول اختيارية عدا نص المشاركة،
            ولن يتم عرض ردك للزوار الآخرين.
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="feedback-name">الاسم (اختياري)</Label>
              <Input
                id="feedback-name"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="اكتب اسمك"
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedback-contact">وسيلة التواصل (اختياري)</Label>
              <Input
                id="feedback-contact"
                value={senderContact}
                onChange={(e) => setSenderContact(e.target.value)}
                placeholder="جوال أو بريد إلكتروني"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedback-role">صفة المشارك</Label>
              <select
                id="feedback-role"
                value={senderRole}
                onChange={(e) => setSenderRole(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {PARTICIPANT_ROLES.map((role) => (
                  <option key={role}>{role}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedback-category">نوع المشاركة</Label>
              <select
                id="feedback-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {FEEDBACK_CATEGORIES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>

          <fieldset className="mt-6">
            <legend className="text-sm font-medium leading-none">
              كيف تقيّم خدمات التوجيه الطلابي؟{" "}
              <span className="font-normal text-muted-foreground">(اختياري)</span>
            </legend>
            <div className="mt-3 flex gap-2" aria-label="تقييم الخدمة من 1 إلى 5">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSatisfaction(value)}
                  aria-label={`تقييم ${value} من 5`}
                  className="rounded-lg p-1.5 transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Star
                    className={`size-7 ${satisfaction && value <= satisfaction ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                  />
                </button>
              ))}
            </div>
          </fieldset>

          <div className="mt-6 space-y-2">
            <Label htmlFor="feedback-message">
              نص المشاركة <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="اكتب رأيك أو ملاحظتك أو مقترحك هنا..."
              rows={7}
              required
            />
          </div>

          <Button type="submit" className="mt-6 w-full sm:w-auto" disabled={busy}>
            <Send className="size-4" />
            {busy ? "جارٍ الإرسال..." : "إرسال الاستبانة"}
          </Button>
        </form>
        <p className="mt-5 text-center text-xs text-muted-foreground">
          منصة الذات — التوجيه الطلابي
        </p>
      </div>
    </main>
  );
}
