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
  BookOpen,
  FileText,
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
      { name: "twitter:card", content: "summary_large_image" },
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
      <section className="mx-auto max-w-7xl px-4 pb-8 pt-7 sm:px-8 sm:pt-12">
        <div className="mb-6 flex items-center gap-4">
          <img src="/brand-logo.png" alt="شعار الذات" className="brand-mark-well size-14 shrink-0 rounded-lg object-contain" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted-foreground">{profile?.school_name || "نظام الإرشاد المدرسي"}</p>
            <h1 className="text-2xl font-black text-primary sm:text-3xl">الذات</h1>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex min-h-56 flex-col justify-between rounded-lg bg-primary p-6 text-primary-foreground sm:col-span-2 lg:row-span-2 lg:min-h-80 lg:p-8">
            <div>
              <p className="text-sm font-semibold text-primary-foreground/75">التوجيه الطلابي</p>
              <h2 className="mt-4 max-w-xl text-2xl font-black leading-snug sm:text-3xl">مساحة آمنة لكل طالب، وخطوة أقرب إلى الدعم الذي يحتاجه.</h2>
            </div>
            <Button asChild variant="secondary" className="mt-8 h-11 w-fit gap-2 px-5 font-bold">
              <Link to="/forms/consultation">طلب استشارة فردية <ArrowLeft className="size-4" /></Link>
            </Button>
          </div>
          <Link to="/services" className="group flex min-h-36 flex-col justify-between rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/40 sm:min-h-40">
            <BookOpen className="size-6 text-primary" />
            <span className="flex items-center justify-between gap-2 font-bold">الخدمات الإرشادية <ArrowLeft className="size-4 text-muted-foreground" /></span>
          </Link>
          <Link to="/forms" className="group flex min-h-36 flex-col justify-between rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/40 sm:min-h-40">
            <FileText className="size-6 text-accent" />
            <span className="flex items-center justify-between gap-2 font-bold">الاستمارات <ArrowLeft className="size-4 text-muted-foreground" /></span>
          </Link>
          <div className="flex min-h-36 flex-col justify-between rounded-lg border border-border bg-card p-5 sm:min-h-40">
            <Megaphone className="size-6 text-accent" />
            <div><h3 className="font-bold">تنبيهات وإعلانات</h3><p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs leading-6 text-muted-foreground">{profile?.announcement || "لا توجد إعلانات جديدة حالياً."}</p></div>
          </div>
          <div className="flex min-h-36 flex-col justify-between rounded-lg bg-secondary p-5 sm:min-h-40">
            <Sparkles className="size-6 text-primary" />
            <div><h3 className="font-bold">أوقات المقابلات</h3><p className="mt-1 line-clamp-2 text-xs leading-6 text-muted-foreground">{profile?.office_hours || "تواصل مع الموجه الطلابي لترتيب الموعد."}</p></div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        <div className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-bold text-primary">رؤيتنا</h2>
            <p className="mt-3 text-sm leading-8 text-muted-foreground">
              {profile?.vision || DEFAULT_VISION}
            </p>
          </article>
          <article className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-bold text-primary">رسالتنا</h2>
            <p className="mt-3 text-sm leading-8 text-muted-foreground">
              {profile?.mission || DEFAULT_MISSION}
            </p>
          </article>
        </div>
      </section>

      <section className="border-y border-border/60 bg-secondary/30 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <h2 className="text-3xl font-black tracking-tight">الخدمات الإرشادية</h2>
          <p className="mt-3 max-w-2xl text-sm leading-8 text-muted-foreground">
            أربعة مجالات إرشادية متكاملة تغطي احتياجات الطالب داخل المدرسة.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {GUIDANCE_SERVICES.map((service) => {
              const Icon = SERVICE_ICONS[service.slug] ?? GraduationCap;
              return (
                <Link
                  key={service.slug}
                  to="/services"
                  hash={service.slug}
                  className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50 sm:p-6"
                >
                  <span className="mb-5 inline-flex rounded-md bg-secondary p-3 text-primary">
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

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-8">
        <h2 className="text-3xl font-black tracking-tight">الاستمارات التفاعلية</h2>
        <p className="mt-3 max-w-2xl text-sm leading-8 text-muted-foreground">
          كل استمارة تصل مباشرة إلى صندوق الطلبات في لوحة تحكم الموجه الطلابي.
        </p>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {PUBLIC_FORMS.map((form) => (
            <Link
              key={form.to}
              to={form.to}
              className="group rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/50"
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
        <div className="relative overflow-hidden rounded-lg bg-primary px-6 py-12 text-center text-primary-foreground sm:px-12 sm:py-16">
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
              <Link to="/auth" search={{ next: "/dashboard" }}>
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
