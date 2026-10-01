import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  CalendarRange,
  ClipboardList,
  FileCheck2,
  ShieldCheck,
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
        content: "أعمال الموجه الطلابي في مكان واحد، بخصوصية وسهولة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: "https://athat.app/" },
      { rel: "icon", type: "image/webp", href: "/brand-final.webp?v=20261001-psychology" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png?v=20261001-final" },
    ],
  }),
  component: Landing,
});

const workAreas = [
  {
    title: "الخطط والبرامج",
    description: "إعداد الخطة ومتابعة التنفيذ",
    icon: CalendarRange,
  },
  {
    title: "الحالات الطلابية",
    description: "متابعة الحالة وخطة التدخل",
    icon: ClipboardList,
  },
  {
    title: "المقابلات الطلابية",
    description: "توثيق المقابلات والمتابعة",
    icon: UsersRound,
  },
  {
    title: "التقارير والشواهد",
    description: "توثيق الأثر ورفع الشواهد",
    icon: BarChart3,
  },
] as const;

function Landing() {
  return (
    <PublicLayout>
      <div className="landing-app relative min-h-screen overflow-hidden bg-[#F8F6F1] text-[#103847]">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_20%_0%,rgba(99,199,194,.28),transparent_42%),radial-gradient(circle_at_90%_18%,rgba(229,194,123,.20),transparent_34%)]" />
        <div aria-hidden="true" className="absolute -left-28 top-52 size-72 rounded-full border-[44px] border-[#1C8F92]/[0.06]" />
        <div aria-hidden="true" className="absolute -right-32 top-80 size-80 rounded-full border-[54px] border-[#C99548]/[0.07]" />

        <main className="relative mx-auto flex w-full max-w-6xl flex-col px-4 pb-8 pt-[calc(1.25rem+env(safe-area-inset-top))] sm:px-8 sm:pt-8">
          <section className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <div className="flex w-full max-w-xl justify-center p-6 sm:p-8">
              <img
                src="/brand-final.webp?v=20261001-psychology"
                alt="شعار الذات"
                className="h-auto w-full max-w-[22rem] rounded-2xl object-contain sm:max-w-[27rem]"
              />
            </div>

            <span className="mt-7 rounded-full border border-[#07566A]/10 bg-white/70 px-3 py-1 text-[11px] font-black text-[#07566A] shadow-sm backdrop-blur">
              نظام التوجيه الطلابي
            </span>
            <h1 className="mt-3 text-3xl font-black leading-[1.35] text-[#073B4C] sm:text-5xl">
              أعمال الموجه الطلابي
              <br className="sm:hidden" /> في مكان واحد
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#52717B] sm:text-base">
              منصة عملية لإدارة الخطط والبرامج والحالات والمقابلات والشواهد والتقارير،
              ومتابعة العمل اليومي بصورة منظمة.
            </p>

            <Button
              asChild
              className="mt-6 h-13 min-w-[250px] gap-2 rounded-2xl bg-[#07566A] px-7 text-sm font-black text-white shadow-lg shadow-[#07566A]/15 hover:bg-[#06495A]"
            >
              <Link to="/auth" search={{ next: "/dashboard", mode: "signin" }}>
                دخول الموجه الطلابي
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
          </section>

          <section className="mx-auto mt-8 grid w-full max-w-4xl grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
            {workAreas.map(({ title, description, icon: Icon }) => (
              <article
                key={title}
                className="rounded-2xl border border-[#07566A]/10 bg-white/85 p-3.5 text-center shadow-sm backdrop-blur sm:p-4"
              >
                <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-[#E8F3F1] text-[#07566A]">
                  <Icon className="size-5" />
                </span>
                <h2 className="mt-3 text-xs font-black text-[#073B4C] sm:text-sm">{title}</h2>
                <p className="mt-1 text-[10px] leading-5 text-[#6B7E84] sm:text-[11px]">{description}</p>
              </article>
            ))}
          </section>

          <section className="mx-auto mt-4 w-full max-w-4xl rounded-[1.5rem] border border-[#07566A]/10 bg-white/80 p-5 shadow-sm backdrop-blur sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#D9EFEC] text-[#07566A]">
                <BadgeCheck className="size-5" />
              </span>
              <div>
                <h2 className="text-base font-black text-[#073B4C]">ماذا يقدم الموجه الطلابي؟</h2>
                <p className="mt-2 text-xs leading-6 text-[#52717B] sm:text-sm sm:leading-7">
                  يتابع احتياجات الطلاب، ويخطط لبرامج التوجيه الطلابي، ويدرس الحالات ويجري المقابلات،
                  ويتعاون مع الأسرة والمعلمين وإدارة المدرسة، ثم يوثق الإجراءات والشواهد والتقارير
                  لدعم الطالب ومتابعة تقدمه.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-2 border-t border-[#07566A]/10 pt-4 sm:grid-cols-3">
              {[
                { icon: ShieldCheck, text: "خصوصية وتنظيم للبيانات" },
                { icon: FileCheck2, text: "توثيق الأعمال والشواهد" },
                { icon: UsersRound, text: "تكامل مع فريق المدرسة" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 rounded-xl bg-[#F3F8F6] px-3 py-2.5">
                  <Icon className="size-4 shrink-0 text-[#07566A]" />
                  <span className="text-[11px] font-bold text-[#355C68]">{text}</span>
                </div>
              ))}
            </div>
          </section>

          <footer className="mx-auto mt-5 w-full max-w-4xl border-t border-[#07566A]/10 pt-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <img src="/brand-final.webp?v=20261001-psychology" alt="" className="size-7 rounded-lg" />
            </div>
            <p className="mt-2 text-[10px] font-semibold text-[#6B7E84]">
              جميع الحقوق محفوظة لـ Abdulmo7sin
            </p>
          </footer>
        </main>
      </div>
    </PublicLayout>
  );
}
