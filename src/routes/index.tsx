import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardList, FileCheck2, LineChart, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import platformLogo from "@/assets/thaat-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ذات | منصة الموجه الطلابي الشاملة" },
      {
        name: "description",
        content:
          "منصة ذات لإدارة سجلات التوجيه الطلابي: الحالات الإرشادية، الخطة التشغيلية، المقابلات، المواظبة والسلوك، الشواهد والتقارير الرسمية.",
      },
      { property: "og:title", content: "ذات | منصة الموجه الطلابي الشاملة" },
      {
        property: "og:description",
        content: "سجلات الموجه الطلابي إلكترونياً مع تقارير جاهزة للطباعة الرسمية.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: ClipboardList, title: "سجلات شاملة", text: "الطلاب والحالات والخطة التشغيلية والبرامج والمقابلات في مكان واحد." },
  { icon: LineChart, title: "مؤشرات ولوحة تحكم", text: "إحصائيات فورية وتنبيهات للمتابعات والمواعيد القادمة." },
  { icon: FileCheck2, title: "تقارير رسمية", text: "طباعة وتصدير PDF بترويسة رسمية وتوقيع الموجه ومدير المدرسة." },
  { icon: ShieldCheck, title: "خصوصية تامة", text: "بيانات كل موجه محفوظة في حسابه ولا يطّلع عليها أحد سواه." },
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
  const ctaLabel = signedIn ? "الذهاب للوحة التحكم" : "ابدأ الآن";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
           <div className="flex items-center gap-2">
             <img src={platformLogo.url} alt="شعار منصة ذات" className="size-12 object-contain" />
             <div><p className="text-2xl font-extrabold text-primary">ذات</p><p className="text-xs text-muted-foreground">منصة الموجه الطلابي</p></div>
          </div>
          <Button asChild>
            <Link to={ctaTo}>{signedIn ? "لوحة التحكم" : "تسجيل الدخول"}</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-16">
        <section className="text-center">
          <h1 className="text-3xl font-extrabold leading-relaxed sm:text-4xl">
            كل أعمال الموجه الطلابي في منصة واحدة
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            نظّم سجلاتك الإرشادية اليومية، وتابع الحالات والمواظبة والسلوك، وجهّز تقاريرك وشواهدك
            للطباعة الرسمية بضغطة واحدة.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg">
              <Link to={ctaTo}>{ctaLabel}</Link>
            </Button>
          </div>
        </section>

        <section className="mt-16 grid gap-4 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-xl border bg-card p-5 shadow-sm">
              <Icon className="size-6 text-primary" />
              <h2 className="mt-3 font-bold">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
