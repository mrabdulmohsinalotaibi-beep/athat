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
  CheckCircle2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Copyright } from "@/components/Copyright";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "الذات | منصة الموجه الطلابي الشاملة" },
      {
        name: "description",
        content:
          "منصة الذات لإدارة سجلات التوجيه الطلابي: الحالات الإرشادية، الخطة التشغيلية، المقابلات، المواظبة والسلوك، الشواهد والتقارير الرسمية.",
      },
      { property: "og:title", content: "الذات | منصة الموجه الطلابي الشاملة" },
      {
        property: "og:description",
        content: "سجلات الموجه الطلابي إلكترونياً مع تقارير جاهزة للطباعة الرسمية.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "icon",
        type: "image/png",
        href: "/IMG_3331.png",
      },
      {
        rel: "apple-touch-icon",
        href: "/IMG_3331.png",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { 
    icon: ClipboardList, 
    title: "سجلات شاملة ومترابطة", 
    text: "الطلاب، الحالات الإرشادية، الخطة التشغيلية، البرامج والمقابلات متكاملة في شاشة واحدة." 
  },
  { 
    icon: LineChart, 
    title: "مؤشرات ولوحة تحكم ذكية", 
    text: "إحصائيات فورية ومؤشرات أداء تنبهك للمتابعات والمواعيد واللجان القادمة." 
  },
  { 
    icon: FileCheck2, 
    title: "تقارير وشواهد رسمية", 
    text: "طباعة وتصدير مستندات PDF بترويسة رسمية جاهزة للتوقيع والاعتماد بضغطة زر." 
  },
  { 
    icon: ShieldCheck, 
    title: "خصوصية وأمان تكتفي بك", 
    text: "بيانات موثقة ومحمية أعلى درجات الأمان، محفوظة في حسابك الخاص ولا يطّلع عليها غيرك." 
  },
];

function Landing() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setSignedIn(Boolean(session)),
    );
    return () => data.subscription.unsubscribe();
  }, []);

  const ctaTo = signedIn ? "/dashboard" : "/auth";
  const ctaLabel = signedIn ? "الذهاب للوحة التحكم" : "ابدأ استخدام المنصة";

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* الترويسة العلوية / Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <img 
              src="/IMG_3331.png" 
              alt="شعار منصة الذات" 
              className="size-11 object-contain transition-transform hover:scale-105" 
            />
            <div>
              <p className="text-xl font-black tracking-tight text-primary sm:text-2xl">الذات</p>
              <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">منصة الموجه الطلابي</p>
            </div>
          </div>
          <Button asChild size="sm" className="font-bold shadow-sm">
            <Link to={ctaTo}>{signedIn ? "لوحة التحكم" : "تسجيل الدخول"}</Link>
          </Button>
        </div>
      </header>

      <main className="relative overflow-hidden">
        {/* خلفية جمالية متدرجة */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>

        {/* قسم الترحيب / Hero Section */}
        <section className="mx-auto max-w-5xl px-4 pt-16 pb-12 text-center sm:pt-24 sm:pb-16">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary backdrop-blur-md">
            <Sparkles className="size-3.5" /> المنصة المتكاملة لإدارة العمل الإرشادي
          </div>

          <h1 className="text-3xl font-black tracking-tight leading-tight sm:text-5xl lg:text-6xl">
            كل أعمال الموجه الطلابي <br className="hidden sm:inline" />
            <span className="text-primary">في منصة واحدة ذكية</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            نظّم سجلاتك الإرشادية اليومية، وتابع الحالات والمواظبة والسلوك، وجهّز تقاريرك وشواهدك للطباعة الرسمية بسهولة واحترافية.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 px-8 font-bold shadow-lg shadow-primary/20 hover:shadow-xl transition-all">
              <Link to={ctaTo} className="flex items-center gap-2">
                <span>{ctaLabel}</span>
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
          </div>

          {/* مميزات سريعة تحت الزر */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-primary" /> تنظيم آلي للسجلات
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-primary" /> تقارير جاهزة للطباعة
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-primary" /> دعم متكامل للجوال والكمبيوتر
            </span>
          </div>
        </section>

        {/* شبكة المميزات / Feature Grid */}
        <section className="mx-auto max-w-5xl px-4 py-12 sm:pb-24">
          <div className="grid gap-6 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div 
                key={title} 
                className="group relative rounded-2xl border border-border/80 bg-card/60 p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
              >
                <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-6" />
                </div>
                <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* التذييل / Footer */}
      <footer className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
        <div className="mx-auto max-w-5xl px-4">
          <Copyright />
        </div>
      </footer>
    </div>
  );
}