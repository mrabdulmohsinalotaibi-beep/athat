import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Brain,
  Briefcase,
  ChevronLeft,
  GraduationCap,
  HeartPulse,
  Megaphone,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { PublicLayout } from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_MISSION,
  DEFAULT_VISION,
  GUIDANCE_SERVICES,
  PUBLIC_FORMS,
  useGuidanceProfile,
} from "@/lib/guidance";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "الذات — التوجيه الطلابي ونظام الإرشاد المدرسي" },
      {
        name: "description",
        content:
          "بوابة التوجيه الطلابي: تعريف بالخدمات الإرشادية، استمارات تفاعلية للطلاب والمعلمين، ولوحة عمل خاصة بالموجه الطلابي.",
      },
      { property: "og:title", content: "الذات — التوجيه الطلابي ونظام الإرشاد المدرسي" },
      {
        property: "og:description",
        content:
          "خدمات إرشادية أكاديمية وسلوكية ومهنية ونفسية، واستمارات تصل مباشرة للموجه الطلابي.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/brand-logo.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/brand-logo.png" },
    ],
    links: [
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  component: Landing,
});

const SERVICE_ICONS: Record<string, LucideIcon> = {
  academic: GraduationCap,
  behavioral: Brain,
  career: Briefcase,
  psychological: HeartPulse,
};

function Landing() {
  const { data: profile } = useGuidanceProfile();

  return (
    <PublicLayout>
      <section className="border-b border-border/60 bg-gradient-to-bl from-primary/10 via-background to-accent/10">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-card px-3.5 py-1 text-xs font-bold text-primary">
              <Sparkles className="size-3.5" />
              {profile?.school_name
                ? `التوجيه الطلابي · ${profile.school_name}`
                : "نظام الإرشاد المدرسي"}
            </span>
            <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
              التوجيه الطلابي: رعاية الطالب نفسياً وسلوكياً وأكاديمياً ومهنياً.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
              بوابة تعرّفك على خدمات التوجيه الطلابي في المدرسة، وتتيح لك طلب استشارة فردية أو إحالة
              طالب أو الإبلاغ السري عن مشكلة، لتصل مباشرة إلى الموجه الطلابي.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 gap-2 px-7 text-base font-bold shadow-lg shadow-primary/20"
              >
                <Link to="/forms/consultation">
                  طلب استشارة فردية
                  <ArrowLeft className="size-5" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 px-7 text-base font-semibold"
              >
                <Link to="/services">الخدمات الإرشادية</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-border/70 bg-card p-6 shadow-xl">
            <div className="flex items-center gap-3 border-b border-border/60 pb-4">
              <Megaphone className="size-5 text-primary" />
              <h2 className="font-bold">تنبيهات وإعلانات</h2>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-8 text-muted-foreground">
              {profile?.announcement ||
                "لا توجد إعلانات جديدة حالياً. تابع هذه المساحة لمعرفة مواعيد البرامج الإرشادية والتنبيهات المهمة."}
            </p>
            <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs leading-7">
              <p className="font-bold text-primary">أوقات المقابلات</p>
              <p className="mt-1 text-muted-foreground">
                {profile?.office_hours ||
                  "من الأحد إلى الخميس خلال الدوام المدرسي، ويفضّل الحجز المسبق."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
        <div className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
            <h2 className="text-lg font-bold text-primary">رؤيتنا</h2>
            <p className="mt-3 text-sm leading-8 text-muted-foreground">
              {profile?.vision || DEFAULT_VISION}
            </p>
          </article>
          <article className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
            <h2 className="text-lg font-bold text-primary">رسالتنا</h2>
            <p className="mt-3 text-sm leading-8 text-muted-foreground">
              {profile?.mission || DEFAULT_MISSION}
            </p>
          </article>
        </div>
      </section>

      <section className="border-y border-border/60 bg-muted/20 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <h2 className="text-3xl font-black tracking-tight">الخدمات الإرشادية</h2>
          <p className="mt-3 max-w-2xl text-sm leading-8 text-muted-foreground">
            أربعة مجالات إرشادية متكاملة تغطي احتياجات الطالب داخل المدرسة.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {GUIDANCE_SERVICES.map((service) => {
              const Icon = SERVICE_ICONS[service.slug] ?? GraduationCap;
              return (
                <Link
                  key={service.slug}
                  to="/services"
                  hash={service.slug}
                  className="group rounded-2xl border border-border/70 bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg"
                >
                  <span className="mb-5 inline-flex rounded-xl bg-primary/10 p-3 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="text-lg font-bold">{service.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{service.summary}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
        <h2 className="text-3xl font-black tracking-tight">الاستمارات التفاعلية</h2>
        <p className="mt-3 max-w-2xl text-sm leading-8 text-muted-foreground">
          كل استمارة تصل مباشرة إلى صندوق الطلبات في لوحة تحكم الموجه الطلابي.
        </p>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {PUBLIC_FORMS.map((form) => (
            <Link
              key={form.to}
              to={form.to}
              className="group rounded-2xl border border-border/70 bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg"
            >
              <span className="rounded-full bg-accent/20 px-2.5 py-1 text-[11px] font-bold text-accent-foreground">
                {form.audience}
              </span>
              <h3 className="mt-4 text-lg font-bold">{form.title}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{form.description}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary">
                فتح الاستمارة
                <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm leading-7 text-muted-foreground">
          <ShieldCheck className="mt-1 size-5 shrink-0 text-primary" />
          <p>
            <strong className="text-foreground">السرية مضمونة.</strong> سجلات الطلاب والجلسات
            والبلاغات محفوظة ضمن حساب الموجه الطلابي فقط، ولا تظهر في الصفحات العامة.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-primary px-6 py-12 text-center text-primary-foreground shadow-2xl sm:px-12 sm:py-16">
          <div className="absolute -bottom-24 -left-16 size-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -right-20 -top-24 size-72 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative">
            <p className="text-sm font-semibold text-primary-foreground/80">للموجه الطلابي</p>
            <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-black leading-tight sm:text-4xl">
              لوحة تحكم خاصة لإدارة الحالات والجلسات والتقارير الرسمية.
            </h2>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="mt-8 h-12 gap-2 px-8 font-bold text-primary shadow-lg"
            >
              <Link to="/auth" search={{ next: "" }}>
                دخول الموجه الطلابي
                <ChevronLeft className="size-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
