import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, Briefcase, GraduationCap, HeartPulse, type LucideIcon } from "lucide-react";

import { PublicLayout } from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { GUIDANCE_SERVICES } from "@/lib/guidance";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "الخدمات الإرشادية | الذات" },
      {
        name: "description",
        content: "الخدمات الإرشادية الأكاديمية والسلوكية والمهنية والنفسية المقدمة لطلاب المدرسة.",
      },
      { property: "og:title", content: "الخدمات الإرشادية | الذات" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ServicesPage,
});

const ICONS: Record<string, LucideIcon> = {
  academic: GraduationCap,
  behavioral: Brain,
  career: Briefcase,
  psychological: HeartPulse,
};

function ServicesPage() {
  return (
    <PublicLayout
      title="الخدمات الإرشادية"
      subtitle="أربعة مجالات إرشادية متكاملة تغطي احتياجات الطالب داخل المدرسة، ويمكن طلب أي منها عبر استمارة الاستشارة الفردية."
    >
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-8">
        <div className="grid gap-5 lg:grid-cols-2">
          {GUIDANCE_SERVICES.map((service) => {
            const Icon = ICONS[service.slug] ?? GraduationCap;
            return (
              <article
                key={service.slug}
                id={service.slug}
                className="scroll-mt-24 rounded-2xl border border-border/70 bg-card p-6 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex rounded-xl bg-primary/10 p-3 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <h2 className="text-lg font-bold">{service.title}</h2>
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{service.summary}</p>
                <ul className="mt-4 space-y-2 text-sm leading-7">
                  {service.items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>

        <div className="mt-10 flex flex-wrap gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-6">
          <div className="flex-1">
            <h3 className="text-lg font-bold">تحتاج خدمة إرشادية؟</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              أرسل طلبك وسيتواصل معك الموجه الطلابي لتحديد الموعد المناسب.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild className="font-bold">
              <Link to="/forms/consultation">طلب استشارة فردية</Link>
            </Button>
            <Button asChild variant="outline" className="font-semibold">
              <Link to="/forms/referral">إحالة طالب (للمعلمين)</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
