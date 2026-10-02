import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BarChart3,
  CalendarRange,
  ClipboardList,
  HeartHandshake,
  Leaf,
  ShieldCheck,
  Target,
  UsersRound,
} from "lucide-react";

import { PublicLayout } from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "الذات — نظام التوجيه الطلابي" },
      {
        name: "description",
        content: "منصة التوجيه الطلابي لإدارة أعمال الموجه الطلابي وخدمة الطالب والأسرة والمدرسة.",
      },
      { property: "og:title", content: "الذات — نظام التوجيه الطلابي" },
      {
        property: "og:description",
        content: "مساندة الطالب نحو مستقبل أكثر إشراقًا عبر متابعة تربوية ونفسية وسلوكية متكاملة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: "https://athat.app/" },
      { rel: "icon", type: "image/png", href: "/athat-logo-final.png?v=20261002-brand" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png?v=20261002-brand" },
    ],
  }),
  component: Landing,
});

const values = [
  { title: "بيئة آمنة", subtitle: "وسهلة الاستخدام", icon: ShieldCheck },
  { title: "متابعة شاملة", subtitle: "ومتكاملة", icon: Target },
  { title: "دعم مهني", subtitle: "للمرشدين", icon: UsersRound },
  { title: "نمو وتمكين", subtitle: "للطالب", icon: Leaf },
] as const;

const workAreas = [
  {
    title: "البرامج والأنشطة",
    description: "خطط وبرامج مع مؤشرات التنفيذ وتفاصيل البرنامج.",
    icon: CalendarRange,
  },
  {
    title: "الحالات الطلابية",
    description: "قائمة الحالات الحالية وخطط التدخل والمتابعة.",
    icon: ClipboardList,
  },
  {
    title: "المقابلات والاستشارات",
    description: "إدارة المواعيد وتسجيل المقابلات والاستشارات.",
    icon: UsersRound,
  },
  {
    title: "التقارير والإحصاءات",
    description: "مؤشرات ورسوم وإمكانية التصدير والطباعة.",
    icon: BarChart3,
  },
] as const;

function Landing() {
  return (
    <PublicLayout>
      <div className="relative min-h-screen overflow-hidden bg-[#FBF7F1] text-[#264938]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_10%,rgba(137,170,116,.20),transparent_22rem),radial-gradient(circle_at_92%_5%,rgba(217,192,163,.22),transparent_21rem)]"
        />
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 top-20 size-72 rounded-full border-[44px] border-[#89AA74]/[0.05]" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-20 top-[28rem] size-72 rounded-full border-[46px] border-[#D9C0A3]/[0.06]" />

        <main className="relative mx-auto w-full max-w-3xl px-4 pb-10 pt-[calc(1rem+env(safe-area-inset-top))] sm:px-6 xl:max-w-5xl xl:px-8 xl:pt-7">
          <header className="mb-5 flex items-center justify-center gap-3 sm:mb-7 xl:absolute xl:right-8 xl:top-7 xl:z-20 xl:mb-0 xl:justify-start">
            <div className="grid size-20 shrink-0 place-items-center rounded-[1.4rem] border border-[#D9C0A3]/35 bg-white/90 p-2 shadow-[0_14px_34px_-22px_rgba(18,55,72,.5)] backdrop-blur sm:size-24 xl:size-20">
              <img
                src="/athat-logo-final.png?v=20261002-brand"
                alt="شعار الذات"
                className="size-full object-contain"
              />
            </div>
            <div className="text-right">
              <p className="text-xl font-black leading-none text-[#264938] sm:text-2xl">الذات | ATHAT</p>
              <p className="mt-1.5 text-[11px] font-bold text-[#766C68] sm:text-xs">منصة التوجيه الطلابي</p>
              <p className="mt-1 text-[9px] font-semibold tracking-wide text-[#9A6C78] sm:text-[10px]">
                دعم · توجيه · نمو · لمستقبل أفضل
              </p>
            </div>
          </header>

          <section className="mx-auto max-w-3xl xl:pt-28">
            <div className="text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#D9C0A3]/35 bg-white/80 px-3 py-1.5 text-[11px] font-black text-[#264938] shadow-sm">
                <HeartHandshake className="size-3.5" />
                منصة يومية للموجه الطلابي
              </span>
              <h1 className="mt-4 text-3xl font-black leading-[1.45] text-[#264938] sm:text-4xl lg:text-5xl">
                مساندتهم ..
                <br className="hidden sm:block" />
                نحو مستقبل أكثر إشراقًا
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#766C68] sm:text-base xl:mx-0">
                منصة ذات لإدارة التوجيه الطلابي، تجمع التقنية والخبرة الإنسانية لدعم الطالب ومتابعة رحلته التعليمية والنفسية والسلوكية في تجربة واحدة واضحة.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2.5 xl:grid-cols-4">
                {values.map(({ title, subtitle, icon: Icon }, index) => (
                  <div key={title} className="rounded-2xl border border-[#264938]/10 bg-white/78 px-2.5 py-3 text-center shadow-sm backdrop-blur">
                    <span
                      className={
                        "mx-auto grid size-10 place-items-center rounded-full " +
                        (index === 1
                          ? "bg-[#EFE1D7] text-[#4A141F]"
                          : index === 2
                            ? "bg-[#E4ECDF] text-[#264938]"
                            : index === 3
                              ? "bg-[#EEE0E4] text-[#9A6C78]"
                              : "bg-[#E4ECDF] text-[#264938]")
                      }
                    >
                      <Icon className="size-4.5" />
                    </span>
                    <p className="mt-2 text-[11px] font-black text-[#264938]">{title}</p>
                    <p className="mt-0.5 text-[9px] font-semibold text-[#766C68]">{subtitle}</p>
                  </div>
                ))}
              </div>

              <Button
                asChild
                className="mt-6 h-12 min-w-[220px] rounded-2xl bg-[#4A141F] px-7 text-sm font-black text-white shadow-lg shadow-[#4A141F]/15 hover:bg-[#264938]"
              >
                <Link to="/auth" search={{ next: "/dashboard", mode: "signin" }}>
                  دخول الموجه الطلابي
                  <ArrowLeft className="size-4" />
                </Link>
              </Button>
            </div>
          </section>

          <section className="mt-8 rounded-[2rem] border border-[#D9C0A3]/35 bg-white/70 p-3 shadow-[0_20px_50px_-40px_rgba(18,55,72,.45)] backdrop-blur sm:p-4 xl:mt-10">
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <div>
                <p className="text-[10px] font-black text-[#264938]">أهم مساحات العمل</p>
                <h2 className="mt-0.5 text-lg font-black text-[#264938] sm:text-xl">كل أدوات التوجيه في واجهة واحدة</h2>
              </div>
              <span className="hidden rounded-full bg-[#E4ECDF] px-3 py-1 text-[10px] font-bold text-[#264938] sm:inline-flex">Mobile-first</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
              {workAreas.map(({ title, description, icon: Icon }, index) => (
                <article key={title} className="rounded-2xl border border-[#D9C0A3]/35 bg-white p-3.5 shadow-sm">
                  <span
                    className={
                      "grid size-10 place-items-center rounded-xl " +
                      (index === 1
                        ? "bg-[#EFE1D7] text-[#4A141F]"
                        : index === 2
                          ? "bg-[#EEE0E4] text-[#9A6C78]"
                          : index === 3
                            ? "bg-[#EEE0E4] text-[#9A6C78]"
                            : "bg-[#E4ECDF] text-[#264938]")
                    }
                  >
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-3 text-xs font-black text-[#264938] sm:text-sm">{title}</h3>
                  <p className="mt-1 text-[10px] leading-5 text-[#766C68] sm:text-[11px]">{description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-4 grid gap-3 xl:grid-cols-3">
            {[
              { title: "رحلة مترابطة", text: "من الحالة والمقابلة إلى خطة التدخل والمتابعة والتقرير." },
              { title: "تصميم هادئ وواضح", text: "ألوان وهوية مستوحاة من الإرشاد النفسي والنمو الشخصي." },
              { title: "جاهز للجوال والتابلت", text: "نفس التجربة المصغرة تبقى واضحة قبل الانتقال لواجهة سطح المكتب." },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-[#D9C0A3]/35 bg-white/76 p-4 shadow-sm">
                <p className="text-xs font-black text-[#264938]">{item.title}</p>
                <p className="mt-1 text-[11px] leading-6 text-[#766C68]">{item.text}</p>
              </div>
            ))}
          </section>
        </main>
      </div>
    </PublicLayout>
  );
}
