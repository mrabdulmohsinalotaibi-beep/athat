import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { 
  ClipboardList, 
  FileCheck2, 
  LineChart, 
  ShieldCheck, 
  ArrowLeft, 
  Sparkles, 
  CheckCircle2,
  Users,
  CalendarDays,
  HeartHandshake,
  ChevronLeft,
  Laptop
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Copyright } from "@/components/Copyright";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "الذات | المنصة الرقمية للموجه الطلابي" },
      {
        name: "description",
        content:
          "الذات منصة متكاملة لإدارة أعمال وسجلات الموجه الطلابي: متابعة الحالات الإرشادية، الخطة التشغيلية، المقابلات، المواظبة والسلوك، مع استخراج تقارير رسمية وشواهد منظمة.",
      },
      { property: "og:title", content: "الذات | المنصة الرقمية للموجه الطلابي" },
      {
        property: "og:description",
        content: "منصة إلكترونية ذكية لتسهيل أعمال الموجه الطلابي واستخراج التقارير الرسمية بنقرة زر.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/brand-logo.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/brand-logo.png" },
    ],
    links: [
      {
        rel: "icon",
        type: "image/png",
        href: "/brand-logo.png",
      },
      {
        rel: "apple-touch-icon",
        href: "/brand-logo.png",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { 
    icon: ClipboardList, 
    title: "سجلات إرشادية متكاملة", 
    text: "توثيق آلي للطلاب، الحالات الإرشادية، المقابلات اليومية، والمتابعة السلوكية في قاعدة بيانات واحدة." 
  },
  { 
    icon: LineChart, 
    title: "مؤشرات أداء وتحليلات", 
    text: "رسوم بيانية تفاعلية تلخص نسب الحضور، السلوك، والحالات الإرشادية مع تنبيهات للمتابعات القادمة." 
  },
  { 
    icon: FileCheck2, 
    title: "تقارير وشواهد معتمدة", 
    text: "تصدير وتجهيز التقارير والشواهد بنقرة واحدة، جاهزة للطباعة والتوقيع الرسمي مباشرة." 
  },
  { 
    icon: CalendarDays, 
    title: "إدارة الخطة والبرامج", 
    text: "متابعة الخطة التشغيلية والتقويم الزمني، تنظيم اللجان والاجتماعات المدرسية بفاعلية." 
  },
  { 
    icon: HeartHandshake, 
    title: "متابعة الحالات الخاصة", 
    text: "سجل مخصص للحالات الرعاية النفسية والاجتماعية والتأخر الدراسي لضمان السرية والاهتمام." 
  },
  { 
    icon: ShieldCheck, 
    title: "أمان وخصوصية عالية", 
    text: "تشفير كامل لبيانات السجلات والحالات لضمان سرية معلومات الطلاب وحساب الموجه." 
  },
];

const STEPS = [
  { step: "01", title: "إنشاء الحساب", desc: "سجّل حسابه خلال ثوانٍ معدودة وأدخل بيانات مدرستك." },
  { step: "02", title: "إدخال السجلات", desc: "أضف بيانات الطلاب والحالات والبرامج بكل مرونة." },
  { step: "03", title: "استخراج التقارير", desc: "اطبع تقاريرك وشواهدك الرسمية الجاهزة للاعتماد." },
];

function Landing() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    try {
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
    } catch {
      setSignedIn(false);
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const ctaTo = signedIn ? "/dashboard" : "/auth";
  const ctaLabel = signedIn ? "الذهاب للوحة التحكم" : "ابدأ تجربتك المجانية";

  return (
    <div className="min-h-screen bg-background text-foreground dir-rtl font-sans selection:bg-primary/20">
      
      {/* الترويسة العلوية / Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <img 
              src="/brand-logo.png"
              alt="شعار منصة الذات" 
              className="size-11 object-contain transition-transform hover:scale-105" 
            />
            <div>
              <p className="text-xl font-black tracking-tight text-primary sm:text-2xl">الذات</p>
              <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">منصة الموجه الطلابي</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" className="hidden sm:inline-flex text-sm font-semibold">
              <Link to="/auth" search={{ next: "" }}>تسجيل الدخول</Link>
            </Button>
            <Button asChild size="sm" className="font-bold shadow-md">
              <Link to={ctaTo}>{signedIn ? "لوحة التحكم" : "إنشاء حساب"}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative overflow-hidden">
        {/* خلفيات متدرجة جمالية */}
        <div className="absolute top-0 right-1/2 -z-10 h-[500px] w-[500px] translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute top-1/3 left-10 -z-10 h-[300px] w-[300px] rounded-full bg-primary/5 blur-[100px]" />

        {/* Hero Section / الترويسة الرئيسية */}
        <section className="mx-auto max-w-7xl px-4 pt-16 pb-20 text-center sm:px-8 sm:pt-24 sm:pb-28">
          
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary backdrop-blur-md shadow-sm">
            <Sparkles className="size-3.5" /> منصة إلكترونية صُممت خصيصاً للموجه الطلابي
          </div>

          <h1 className="mx-auto max-w-4xl text-3xl font-black tracking-tight leading-tight sm:text-5xl lg:text-6xl">
            إدارة أعمال الموجه الطلابي وسجلاته <br />
            <span className="text-primary bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              بسهولة، سرعة، واحترافية متكاملة
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            نظّم أعمالك اليومية، وتابع الحالات والمقابلات والمواظبة والسلوك، واستخرج تقاريرك وشواهدك الرسمية الجاهزة للطباعة بنقرة زر واحدة.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="h-13 px-8 text-base font-bold shadow-xl shadow-primary/25 transition-all hover:scale-[1.02]">
              <Link to={ctaTo} className="flex items-center gap-2">
                <span>{ctaLabel}</span>
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
          </div>

          {/* المميزات السريعة */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-muted-foreground sm:text-sm">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" /> تقارير وشواهد معتمدة
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" /> حماية وسرية تامة للبيانات
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" /> موافقة للأنظمة الإرشادية
            </span>
          </div>

          {/* محاكاة شاشة المنصة (App Preview Glass) */}
          <div className="relative mx-auto mt-16 max-w-5xl rounded-2xl border border-border/80 bg-card/50 p-3 shadow-2xl backdrop-blur-xl sm:p-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3 px-2">
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full bg-red-400/80" />
                <div className="size-3 rounded-full bg-amber-400/80" />
                <div className="size-3 rounded-full bg-emerald-400/80" />
              </div>
              <div className="text-xs text-muted-foreground font-mono">althaat.app / dashboard</div>
              <Laptop className="size-4 text-muted-foreground" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 text-right">
              <div className="rounded-xl border border-border/60 bg-background/80 p-4 shadow-sm">
                <p className="text-xs text-muted-foreground">إجمالي الحالات الإرشادية</p>
                <p className="mt-2 text-2xl font-black text-primary">24 حالة</p>
                <p className="mt-1 text-[11px] text-emerald-600 font-medium">متابعة مستمرة</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/80 p-4 shadow-sm">
                <p className="text-xs text-muted-foreground">المقابلات المنفذة</p>
                <p className="mt-2 text-2xl font-black text-foreground">142 مقابلة</p>
                <p className="mt-1 text-[11px] text-primary font-medium">خلال الفصل الحالي</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/80 p-4 shadow-sm">
                <p className="text-xs text-muted-foreground">الخطة التشغيلية</p>
                <p className="mt-2 text-2xl font-black text-foreground">85%</p>
                <p className="mt-1 text-[11px] text-muted-foreground">نسبة الإنجاز المكتملة</p>
              </div>
            </div>
          </div>
        </section>

        {/* شبكة المميزات الاحترافية / Features Section */}
        <section className="border-t border-border/40 bg-muted/20 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-2xl font-black tracking-tight sm:text-4xl">
                كل ما يحتاجه الموجه الطلابي في منصة واحدة
              </h2>
              <p className="mt-3 text-sm text-muted-foreground sm:text-base">
                أدوات ذكية متطورة تختصر عليك الوقت والجهد وتزيد من تنظيم وجودة السجلات الإرشادية.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <div 
                  key={title} 
                  className="group relative rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg"
                >
                  <div className="mb-5 inline-flex rounded-xl bg-primary/10 p-3 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="size-6" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* خطوات الاستخدام / How it Works */}
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-8">
            <div className="text-center max-w-xl mx-auto mb-16">
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
                ابدأ العمل خلال دقائق بسيطة
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">3 خطوات فقط لتنظيم كافة سجلاتك الإرشادية</p>
            </div>

            <div className="grid gap-8 sm:grid-cols-3">
              {STEPS.map(({ step, title, desc }) => (
                <div key={step} className="relative rounded-2xl border border-border/50 bg-card/40 p-6 text-center shadow-sm">
                  <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-lg font-black text-primary">
                    {step}
                  </div>
                  <h3 className="text-lg font-bold">{title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* قسم الانضمام الختامي / Final Call to Action */}
        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-12 text-center text-primary-foreground shadow-2xl sm:px-12 sm:py-16">
            <div className="absolute -left-10 -bottom-10 size-60 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -right-10 -top-10 size-60 rounded-full bg-white/10 blur-2xl" />

            <h2 className="relative text-2xl font-black tracking-tight sm:text-4xl">
              جاهز لتجربة عمل إرشادي أكثر تنظيمًا وسلاسة؟
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-sm text-primary-foreground/90 sm:text-base">
              انضم الآن واستفد من كافة أدوات وسجلات منصة "الذات" المخصصة للموجه الطلابي.
            </p>
            <div className="relative mt-8 flex justify-center">
              <Button asChild size="lg" variant="secondary" className="h-12 px-8 font-bold text-primary shadow-lg hover:bg-white/90">
                <Link to={ctaTo} className="flex items-center gap-2">
                  <span>ابدأ الآن مجاناً</span>
                  <ChevronLeft className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

      </main>

      {/* التذييل / Footer */}
      <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground bg-card/30">
        <div className="mx-auto max-w-7xl px-4">
          <Copyright />
        </div>
      </footer>

    </div>
  );
}