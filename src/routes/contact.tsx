import { createFileRoute } from "@tanstack/react-router";
import { Clock, Mail, MapPin, Phone } from "lucide-react";

import { PublicLayout } from "@/components/PublicLayout";
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
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-sm">
          <h2 className="text-lg font-bold">الخدمات الإلكترونية عبر مدونة الموجه</h2>
          <p className="mt-3 text-sm leading-8 text-muted-foreground">
            أُوقفت الاستمارات العامة غير المرتبطة بمدرسة محددة. لإرسال استشارة أو إحالة أو بلاغ،
            استخدم رابط <strong className="text-foreground">مدونة الموجه الطلابي</strong> الذي
            تشاركه المدرسة؛ وسيصل الطلب مباشرة إلى صندوق الموجه وسجلاته.
          </p>
          <div className="mt-5 rounded-xl border bg-card p-4 text-xs leading-6 text-muted-foreground">
            هذا يمنع وصول الطلب إلى مدرسة أو موجه غير مقصود ويحافظ على ارتباطه بالسجل الصحيح.
          </div>
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

        </div>
      </section>
    </PublicLayout>
  );
}
