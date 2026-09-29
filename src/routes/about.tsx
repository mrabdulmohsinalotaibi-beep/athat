import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, CheckCircle2, ShieldCheck } from "lucide-react";

import { PublicLayout } from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import {
  COUNSELOR_DUTIES,
  DEFAULT_MISSION,
  DEFAULT_VISION,
  STUDENT_GUIDE,
  useGuidanceProfile,
} from "@/lib/guidance";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "عن التوجيه الطلابي | الذات" },
      {
        name: "description",
        content: "مهام الموجه الطلابي ودليل الطالب ورؤية ورسالة قسم التوجيه الطلابي في المدرسة.",
      },
      { property: "og:title", content: "عن التوجيه الطلابي | الذات" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { data: profile } = useGuidanceProfile();

  return (
    <PublicLayout
      title="عن التوجيه الطلابي"
      subtitle="قسم التوجيه الطلابي هو الجهة المسؤولة عن رعاية الطالب نفسياً وسلوكياً وأكاديمياً ومهنياً داخل المدرسة."
    >
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-8">
        <div className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
            <h2 className="text-lg font-bold text-primary">الرؤية</h2>
            <p className="mt-3 text-sm leading-8 text-muted-foreground">
              {profile?.vision || DEFAULT_VISION}
            </p>
          </article>
          <article className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
            <h2 className="text-lg font-bold text-primary">الرسالة</h2>
            <p className="mt-3 text-sm leading-8 text-muted-foreground">
              {profile?.mission || DEFAULT_MISSION}
            </p>
          </article>
        </div>
      </section>

      <section className="border-y border-border/60 bg-muted/20 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-6 text-primary" />
            <h2 className="text-2xl font-black">مهام الموجه الطلابي</h2>
          </div>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {COUNSELOR_DUTIES.map((duty) => (
              <li
                key={duty}
                className="flex items-start gap-3 rounded-xl border border-border/70 bg-card p-4 text-sm leading-7"
              >
                <CheckCircle2 className="mt-1 size-4 shrink-0 text-primary" />
                <span>{duty}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-8">
        <div className="flex items-center gap-3">
          <BookOpen className="size-6 text-primary" />
          <h2 className="text-2xl font-black">دليل الطالب</h2>
        </div>
        <ol className="mt-6 space-y-3">
          {STUDENT_GUIDE.map((item, index) => (
            <li
              key={item}
              className="flex items-start gap-4 rounded-xl border border-border/70 bg-card p-4 text-sm leading-7"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {index + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>

        <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm leading-7 text-muted-foreground">
          <p className="font-bold text-foreground">طلب الخدمات الإلكترونية</p>
          <p className="mt-1">
            الاستشارات والإحالات والبلاغات تُرسل من مدونة الموجه الطلابي الخاصة بالمدرسة؛
            استخدم الرابط الذي تشاركه المدرسة لضمان وصول الطلب للموجه الصحيح.
          </p>
          <Button asChild variant="outline" className="mt-4 font-semibold">
            <Link to="/services">عرض الخدمات الإرشادية</Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
}
