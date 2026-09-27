import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";

import { PublicLayout } from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useGuidanceProfile } from "@/lib/guidance";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "تواصل معنا | الذات" },
      {
        name: "description",
        content: "نموذج التواصل مع التوجيه الطلابي وأوقات المقابلات وبيانات الاتصال بالمدرسة.",
      },
      { property: "og:title", content: "تواصل معنا | الذات" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ContactPage,
});

const DEFAULT_OFFICE_HOURS = "من الأحد إلى الخميس، ٧:٣٠ص – ١٢:٣٠م (يفضّل الحجز المسبق).";

function ContactPage() {
  const { data: profile } = useGuidanceProfile();
  const [sent, setSent] = useState(false);

  const submit = useMutation({
    mutationFn: async (values: {
      name: string;
      contact: string;
      role: string;
      message: string;
    }) => {
      const { error } = await supabase.rpc("submit_public_request", {
        p_kind: "استشارة فردية",
        p_details: values.message,
        p_requester_name: values.name,
        p_requester_role: values.role,
        p_requester_contact: values.contact,
        p_topic: "رسالة عبر صفحة تواصل معنا",
        p_urgency: "عادي",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSent(true);
      toast.success("تم إرسال رسالتك إلى التوجيه الطلابي");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const contactCards = [
    {
      icon: Clock,
      title: "أوقات المقابلات",
      value: profile?.office_hours || DEFAULT_OFFICE_HOURS,
    },
    {
      icon: Phone,
      title: "الهاتف",
      value: profile?.contact_phone || "يُحدَّد من إعدادات المدرسة",
    },
    {
      icon: Mail,
      title: "البريد الإلكتروني",
      value: profile?.contact_email || "يُحدَّد من إعدادات المدرسة",
    },
    {
      icon: MapPin,
      title: "المدرسة",
      value: `${profile?.school_name || "اسم المدرسة"} · ${profile?.education_dept || "إدارة التعليم"}`,
    },
  ];

  return (
    <PublicLayout
      title="تواصل معنا"
      subtitle="راسل التوجيه الطلابي مباشرة، أو احجز موعد مقابلة خلال أوقات العمل الموضحة أدناه."
    >
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
          <h2 className="text-lg font-bold">نموذج الاتصال</h2>
          {sent ? (
            <div className="mt-5 rounded-xl border border-primary/25 bg-primary/5 p-5 text-sm leading-7">
              <p className="font-bold text-primary">تم استلام رسالتك.</p>
              <p className="mt-2 text-muted-foreground">
                سيصل الموجه الطلابي إلى رسالتك ضمن صندوق الطلبات، وسيتم التواصل معك عبر البيانات
                التي أدخلتها.
              </p>
              <Button className="mt-4" variant="outline" onClick={() => setSent(false)}>
                إرسال رسالة أخرى
              </Button>
            </div>
          ) : (
            <form
              className="mt-5 grid gap-4 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                const message = String(data.get("message") ?? "").trim();
                if (message.length < 10) {
                  toast.error("يرجى كتابة تفاصيل أوضح للرسالة");
                  return;
                }
                submit.mutate({
                  name: String(data.get("name") ?? "").trim(),
                  contact: String(data.get("contact") ?? "").trim(),
                  role: String(data.get("role") ?? "مستفيد"),
                  message,
                });
              }}
            >
              <div>
                <Label htmlFor="name" className="mb-1.5 block text-xs">
                  الاسم
                </Label>
                <Input id="name" name="name" required placeholder="الاسم الكامل" />
              </div>
              <div>
                <Label htmlFor="contact" className="mb-1.5 block text-xs">
                  وسيلة التواصل
                </Label>
                <Input id="contact" name="contact" required placeholder="جوال أو بريد إلكتروني" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="role" className="mb-1.5 block text-xs">
                  الصفة
                </Label>
                <select
                  id="role"
                  name="role"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue="طالب"
                >
                  <option value="طالب">طالب</option>
                  <option value="ولي أمر">ولي أمر</option>
                  <option value="معلم">معلم</option>
                  <option value="جهة خارجية">جهة خارجية</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="message" className="mb-1.5 block text-xs">
                  الرسالة
                </Label>
                <Textarea
                  id="message"
                  name="message"
                  required
                  rows={6}
                  placeholder="اكتب رسالتك هنا…"
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={submit.isPending} className="font-bold">
                  {submit.isPending ? "جارٍ الإرسال…" : "إرسال الرسالة"}
                </Button>
              </div>
            </form>
          )}
        </div>

        <div className="space-y-4">
          {contactCards.map((card) => (
            <div
              key={card.title}
              className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
            >
              <span className="inline-flex rounded-xl bg-primary/10 p-3 text-primary">
                <card.icon className="size-5" />
              </span>
              <div>
                <p className="text-sm font-bold">{card.title}</p>
                <p className="mt-1 text-sm leading-7 text-muted-foreground">{card.value}</p>
              </div>
            </div>
          ))}

          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm leading-7">
            <p className="font-bold">هل الموضوع عاجل أو يتعلق بسلامة طالب؟</p>
            <p className="mt-2 text-muted-foreground">
              استخدم استمارة الإبلاغ السري ليصل البلاغ مباشرة إلى الموجه الطلابي.
            </p>
            <Button asChild className="mt-4 font-bold">
              <Link to="/forms/report">استمارة الإبلاغ السري</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
