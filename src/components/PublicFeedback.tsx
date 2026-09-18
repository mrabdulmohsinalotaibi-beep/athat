import { useState } from "react";
import { CheckCircle2, MessageSquareText, Send } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function PublicFeedback({ token }: { token: string }) {
  const [senderName, setSenderName] = useState("");
  const [senderContact, setSenderContact] = useState("");
  const [category, setCategory] = useState("رأي");
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
      p_category: category,
      p_message: message.trim(),
    });
    setBusy(false);
    if (error) {
      toast.error(error.message || "تعذّر إرسال الرسالة.");
      return;
    }
    setSent(true);
    setSenderName("");
    setSenderContact("");
    setMessage("");
  }

  if (sent) {
    return (
      <div
        className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center px-4 py-10"
        dir="rtl"
      >
        <div className="w-full rounded-[2rem] border border-primary/15 bg-card p-8 text-center shadow-xl shadow-primary/10">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="size-9" />
          </div>
          <h1 className="mt-5 text-2xl font-black text-foreground">تم استلام رسالتك</h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            شكرًا لمشاركتك. وصلت الرسالة إلى الموجه الطلابي بنجاح.
          </p>
          <Button className="mt-6" onClick={() => setSent(false)}>
            إرسال رسالة أخرى
          </Button>
        </div>
      </div>
    );
  }

  return (
    <main
      className="min-h-screen bg-[radial-gradient(circle_at_top_right,_color-mix(in_oklab,_var(--accent)_70%,transparent),_transparent_32rem)] px-4 py-8 sm:py-14"
      dir="rtl"
    >
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <MessageSquareText className="size-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-primary">منصة الذات</p>
            <h1 className="text-xl font-black text-foreground sm:text-2xl">
              شاركنا رأيك أو رسالتك
            </h1>
          </div>
        </div>
        <form
          onSubmit={submit}
          className="rounded-[2rem] border border-primary/12 bg-card p-5 shadow-xl shadow-primary/10 sm:p-8"
        >
          <p className="mb-6 rounded-2xl bg-accent/60 p-4 text-sm leading-7 text-accent-foreground">
            يسعدنا استقبال ملاحظاتك ومقترحاتك. اكتب رسالتك بوضوح، وسيتم التعامل معها بسرية واهتمام.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="feedback-name">الاسم (اختياري)</Label>
              <Input
                id="feedback-name"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="اكتب اسمك"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedback-contact">وسيلة التواصل (اختياري)</Label>
              <Input
                id="feedback-contact"
                value={senderContact}
                onChange={(e) => setSenderContact(e.target.value)}
                placeholder="جوال أو بريد إلكتروني"
              />
            </div>
          </div>
          <div className="mt-5 space-y-2">
            <Label htmlFor="feedback-category">نوع المشاركة</Label>
            <select
              id="feedback-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option>رأي</option>
              <option>مقترح</option>
              <option>استفسار</option>
              <option>طلب مساعدة</option>
              <option>شكر</option>
            </select>
          </div>
          <div className="mt-5 space-y-2">
            <Label htmlFor="feedback-message">الرسالة</Label>
            <Textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="اكتب رسالتك هنا..."
              rows={7}
              required
            />
          </div>
          <Button type="submit" className="mt-6 w-full sm:w-auto" disabled={busy}>
            <Send className="size-4" />
            {busy ? "جارٍ الإرسال..." : "إرسال الرسالة"}
          </Button>
        </form>
        <p className="mt-5 text-center text-xs text-muted-foreground">
          لن تظهر رسالتك للزوار الآخرين.
        </p>
      </div>
    </main>
  );
}
