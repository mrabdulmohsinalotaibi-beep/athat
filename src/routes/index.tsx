import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowUpLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  FileCheck2,
  FileText,
  FolderKanban,
  HeartHandshake,
  LineChart,
  LockKeyhole,
  Mail,
  Menu,
  MessageSquareText,
  NotebookPen,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import { Copyright } from "@/components/Copyright";
import { PublicPostsFeed } from "@/components/PublicPostsFeed";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "الذات — مساحتك المهنية للإنجاز الإرشادي" },
      {
        name: "description",
        content:
          "الذات مساحة مهنية للمرشدين والمرشدات لتنظيم العمل الإرشادي، متابعة الحالات، وبناء أثر واضح في كل يوم.",
      },
      { property: "og:title", content: "الذات — مساحتك المهنية للإنجاز الإرشادي" },
      {
        property: "og:description",
        content: "اجمع تفاصيل عملك الإرشادي في صورة أوضح وأكثر إنسانية.",
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

const services = [
  { icon: Users, title: "ملفات الطلاب", text: "صورة متكاملة لكل طالب تحفظ السياق وتمنحك بداية واضحة في كل مرة." },
  { icon: FolderKanban, title: "مركز الحالات", text: "تابع الحالات المفتوحة والقرارات والإحالات ضمن مسار مهني مفهوم." },
  { icon: NotebookPen, title: "سجل العمل اليومي", text: "دوّن ما حدث اليوم كي لا يضيع أثر العمل المهم بين المواعيد." },
  { icon: MessageSquareText, title: "الرسائل", text: "مكان واحد لمحادثاتك المهنية مع الفريق والأسرة والطالب." },
  { icon: FileText, title: "الخطط والتقارير", text: "حوّل الملاحظات المتفرقة إلى خطط وتقارير يمكن مشاركتها بثقة." },
  { icon: BookOpen, title: "الأدلة والمراجع", text: "مكتبة عملية تقرّب الدليل المناسب عندما تحتاجه في لحظته." },
];

const steps = [
  { number: "٠١", title: "أنشئ مساحتك", text: "ابدأ بحسابك المهني ومساحة آمنة تخصك وتخص مدرستك." },
  { number: "٠٢", title: "رتّب التفاصيل", text: "اجمع السجلات والملاحظات والخطط في مكان واحد واضح." },
  { number: "٠٣", title: "اصنع أثرًا أوضح", text: "ارجع للمعلومة في وقتها واستخرج ما تحتاجه بثقة." },
];

function Landing() {
  const [signedIn, setSignedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSignedIn(Boolean(data.session));
      })
      .catch(() => {
        if (active) setSignedIn(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setSignedIn(Boolean(session));
    });
    unsubscribe = () => data.subscription.unsubscribe();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const ctaTo = signedIn ? "/dashboard" : "/auth";
  const ctaLabel = signedIn ? "مساحتي المهنية" : "ابدأ مساحتك";

  return (
    <div dir="rtl" className="min-h-screen overflow-x-hidden bg-background text-foreground selection:bg-primary/20">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8">
          <Link to="/" className="flex items-center gap-3" aria-label="العودة إلى الرئيسية">
            <img src="/brand-logo.png" alt="شعار الذات" className="brand-mark-well size-11 rounded-xl object-contain transition-transform hover:scale-105" />
            <div>
              <p className="text-xl font-black tracking-tight text-primary sm:text-2xl">الذات</p>
              <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">مساحتك المهنية</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-muted-foreground lg:flex" aria-label="التنقل الرئيسي">
            <a href="#home" className="transition-colors hover:text-primary">الرئيسية</a>
            <a href="#services" className="transition-colors hover:text-primary">الخدمات</a>
            <a href="#journal" className="transition-colors hover:text-primary">المجلة</a>
            <a href="#about" className="transition-colors hover:text-primary">عن الذات</a>
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            <Button asChild variant="ghost" className="font-semibold">
              <Link to="/auth" search={{ next: "" }}>دخول الموجه الطلابي</Link>
            </Button>
            <Button asChild className="gap-2 font-bold shadow-md shadow-primary/15">
              <Link to={ctaTo}>{ctaLabel}<ArrowLeft className="size-4" /></Link>
            </Button>
          </div>

          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-card text-foreground sm:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-border/50 bg-background px-4 py-4 sm:hidden">
            <nav className="flex flex-col gap-1 text-sm font-semibold" aria-label="قائمة الجوال">
              <a href="#home" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 hover:bg-primary/10">الرئيسية</a>
              <a href="#services" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 hover:bg-primary/10">الخدمات</a>
              <a href="#journal" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 hover:bg-primary/10">المجلة</a>
              <a href="#about" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 hover:bg-primary/10">عن الذات</a>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/50 pt-3">
                <Button asChild variant="outline"><Link to="/auth" search={{ next: "" }}>دخول الموجه الطلابي</Link></Button>
                <Button asChild><Link to={ctaTo}>{ctaLabel}</Link></Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main id="home">
        <section className="relative overflow-hidden border-b border-border/50">
          <div className="absolute -right-32 -top-28 -z-10 size-[30rem] rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-40 left-0 -z-10 size-[24rem] rounded-full bg-accent/10 blur-3xl" />
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20 lg:py-28">
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-bold text-primary">
                <Sparkles className="size-3.5" /> مساحة مهنية للمرشدين والمرشدات
              </div>
              <h1 className="max-w-2xl text-4xl font-black leading-[1.18] tracking-tight sm:text-6xl">
                رتّب عملك،
                <span className="block text-primary">واجعل أثره أوضح.</span>
              </h1>
              <p className="mt-7 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
                الذات هي المساحة التي تجمع تفاصيل عملك الإرشادي في صورة واحدة: طالب تعرف قصته، حالة تعرف خطوتها، ويوم تعرف قيمته.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 gap-2 px-7 text-base font-bold shadow-lg shadow-primary/20">
                  <Link to={ctaTo}>{ctaLabel}<ArrowLeft className="size-5" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 px-7 text-base font-semibold">
                  <a href="#services">تعرّف على الخدمات</a>
                </Button>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-muted-foreground">
                <span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-primary" />خصوصية العمل أولًا</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-primary" />مصممة للممارسة اليومية</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl lg:justify-self-end">
              <div className="absolute -inset-6 rounded-[2.5rem] border border-primary/10 rotate-3" />
              <div className="absolute -inset-4 rounded-[2.5rem] border border-accent/20 -rotate-2" />
              <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-4 shadow-2xl sm:p-6">
                <div className="flex items-center justify-between border-b border-border/70 pb-4 text-xs text-muted-foreground">
                  <span className="font-mono tracking-wider">ALDHAT / 04</span>
                  <span>الثلاثاء، ٢١ مايو</span>
                </div>
                <div className="py-9 text-right">
                  <p className="text-xs font-bold text-accent">ملاحظة اليوم</p>
                  <h2 className="mt-4 text-2xl font-black leading-tight sm:text-3xl">ما الذي يحتاجه هذا الطالب اليوم؟</h2>
                  <div className="mt-6 h-2 rounded-full bg-primary/70" />
                  <div className="mt-3 h-2 w-4/5 rounded-full bg-muted" />
                  <div className="mt-3 h-2 w-3/5 rounded-full bg-muted" />
                </div>
                <div className="flex flex-wrap gap-2 border-t border-border/70 pt-4 text-xs font-semibold">
                  <span className="rounded-full bg-primary/10 px-3 py-2 text-primary">ملاحظة جديدة</span>
                  <span className="rounded-full bg-accent/10 px-3 py-2 text-accent-foreground">جلسة مكتملة</span>
                </div>
              </div>
              <div className="absolute -bottom-7 -left-4 rounded-2xl border border-accent/30 bg-background px-4 py-3 text-xs font-bold text-accent shadow-lg sm:-left-8">
                عمل واضح، أثر أعمق
              </div>
            </div>
          </div>
        </section>

        <section id="journal" className="scroll-mt-20">
          <PublicPostsFeed
            limit={6}
            title="منشورات تستحق وقتك"
            subtitle="مقالات وأخبار وتجارب يشاركها الموجهون والموجهات مع المجتمع المهني.
            "
          />
        </section>

        <section id="services" className="scroll-mt-20 border-y border-border/50 bg-muted/20 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-bold text-accent">مساحتك الخاصة بعد الدخول</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">كل التفاصيل اليومية، في مكان واحد.</h2>
              <p className="mt-5 text-base leading-8 text-muted-foreground">الخدمات المهنية تبقى داخل حسابك ومساحتك الخاصة. لا يرى الزائر إلا ما تختار نشره للعامة.</p>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.map(({ icon: Icon, title, text }) => (
                <div key={title} className="group rounded-2xl border border-border/70 bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg">
                  <div className="mb-5 inline-flex rounded-xl bg-primary/10 p-3 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground"><Icon className="size-5" /></div>
                  <h3 className="text-lg font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex items-start gap-3 rounded-2xl border border-accent/20 bg-accent/5 p-5 text-sm leading-7 text-muted-foreground">
              <LockKeyhole className="mt-1 size-5 shrink-0 text-accent" />
              <p><strong className="text-foreground">بياناتك الخاصة تبقى خاصة.</strong> السجلات والحالات والمراسلات لا تظهر في الصفحة العامة، ولا تُشارك إلا من خلال حسابك وصلاحياتك.</p>
            </div>
          </div>
        </section>

        <section id="about" className="scroll-mt-20 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-8">
            <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
              <div>
                <p className="text-sm font-bold text-accent">كيف تبدأ؟</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">من أول ملاحظة إلى أثر واضح.</h2>
                <p className="mt-5 text-base leading-8 text-muted-foreground">لا تحتاج إلى تغيير طريقتك في العمل؛ فقط امنح تفاصيلها مكانًا يساعدك على رؤيتها.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {steps.map((step) => (
                  <div key={step.number} className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
                    <span className="font-mono text-sm font-bold text-accent">{step.number}</span>
                    <h3 className="mt-6 font-bold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">{step.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-8 sm:pb-24">
          <div className="relative overflow-hidden rounded-[2rem] bg-primary px-6 py-12 text-center text-primary-foreground shadow-2xl sm:px-12 sm:py-16">
            <div className="absolute -bottom-24 -left-16 size-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -right-20 -top-24 size-72 rounded-full bg-accent/20 blur-3xl" />
            <div className="relative">
              <p className="text-sm font-semibold text-primary-foreground/80">مساحة عملك تبدأ من هنا</p>
              <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-black leading-tight sm:text-5xl">اجعل العمل الإرشادي أكثر وضوحًا، يومًا بعد يوم.</h2>
              <Button asChild size="lg" variant="secondary" className="mt-8 h-12 gap-2 px-8 font-bold text-primary shadow-lg">
                <Link to={ctaTo}>{ctaLabel}<ChevronLeft className="size-5" /></Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 text-center text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:text-right">
          <Copyright />
          <div className="flex justify-center gap-5 sm:justify-start">
            <a href="#home" className="transition-colors hover:text-primary">الرئيسية</a>
            <a href="#journal" className="transition-colors hover:text-primary">المجلة</a>
            <Link to="/auth" search={{ next: "" }} className="transition-colors hover:text-primary">دخول الموجه الطلابي</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
