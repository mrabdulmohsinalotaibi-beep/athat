import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Brain,
  Briefcase,
  Check,
  GraduationCap,
  HeartPulse,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { PublicLayout } from "@/components/PublicLayout";
import { GUIDANCE_SERVICES } from "@/lib/guidance";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "خدمات التوجيه الطلابي | الذات" },
      {
        name: "description",
        content: "خدمات التوجيه الطلابي الأكاديمية والسلوكية والمهنية والنفسية المقدمة لطلاب المدرسة.",
      },
      { property: "og:title", content: "خدمات التوجيه الطلابي | الذات" },
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

const THEMES: Record<string, string> = {
  academic: "bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300",
  behavioral: "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300",
  career: "bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-300",
  psychological: "bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-300",
};

const CATEGORIES: Record<string, string> = {
  academic: "التحصيل والتعلّم",
  behavioral: "السلوك والمواظبة",
  career: "الميول والمسار المهني",
  psychological: "الصحة النفسية والدعم",
};

function ServicesPage() {
  return (
    <PublicLayout
      title="خدمات التوجيه الطلابي"
      subtitle="أربعة مجالات للتوجيه الطلابي تغطي احتياجات الطالب داخل المدرسة، ويمكن طلب أي منها عبر استمارة الاستشارة الفردية."
    >
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-8 sm:py-14">
        <div className="rounded-3xl border border-border/70 bg-muted/30 p-5 sm:p-7">
          <div className="mb-4">
            <p className="text-sm font-bold text-primary">ابدأ من احتياجك</p>
            <h2 className="mt-1 text-xl font-black">اختر مجال التوجيه المناسب</h2>
          </div>
          <nav aria-label="التنقل بين خدمات التوجيه الطلابي" className="flex flex-wrap gap-2">
            {GUIDANCE_SERVICES.map((service) => (
              <Link
                key={service.slug}
                to="/services"
                hash={service.slug}
                className="inline-flex min-h-10 items-center rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {service.title}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {GUIDANCE_SERVICES.map((service, index) => {
            const Icon = ICONS[service.slug] ?? GraduationCap;
            const theme = THEMES[service.slug] ?? "bg-primary/10 text-primary ring-primary/20";
            return (
              <article
                key={service.slug}
                id={service.slug}
                aria-labelledby={service.slug + "-title"}
                className="relative scroll-mt-28 overflow-hidden rounded-3xl border border-border/70 bg-card p-6 shadow-sm transition-shadow hover:shadow-md sm:p-8"
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-primary/80 via-primary/30 to-transparent"
                />
                <div className="flex items-start gap-4">
                  <span className={"inline-flex size-12 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset " + theme}>
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-xs font-bold text-muted-foreground">{CATEGORIES[service.slug] ?? "خدمة توجيه طلابي"}</p>
                    <h2 id={service.slug + "-title"} className="mt-1 text-lg font-black sm:text-xl">
                      {service.title}
                    </h2>
                  </div>
                  <span aria-label={"الخدمة " + (index + 1)} className="text-sm font-bold tabular-nums text-muted-foreground/70">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <p className="mt-5 text-sm leading-7 text-muted-foreground">{service.summary}</p>

                <ul className="mt-5 space-y-3 border-t border-border/60 pt-5 text-sm leading-6">
                  {service.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Check className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>


              </article>
            );
          })}
        </div>

        <div className="mt-10 grid gap-6 rounded-3xl border border-primary/20 bg-primary/5 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex items-start gap-4">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-black">تحتاج إلى مساعدة؟</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
                أرسل طلبك عبر الاستمارة المناسبة، وسيتواصل معك الموجه الطلابي. تُراعى خصوصية الطلبات وفق الضوابط المعتمدة.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-primary/20 bg-card px-4 py-3 text-sm leading-7 text-muted-foreground">
            <p className="font-bold text-foreground">التقديم من مدونة الموجه</p>
            <p className="mt-1">
              استخدم رابط مدونة الموجه الطلابي الذي تشاركه المدرسة لطلب الاستشارة أو الإحالة أو الإبلاغ؛
              بذلك يرتبط الطلب مباشرة بسجل الموجه والمدرسة الصحيحة.
            </p>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
