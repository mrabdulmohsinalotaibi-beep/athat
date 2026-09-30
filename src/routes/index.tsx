import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  FileText,
  HeartHandshake,
  ShieldCheck,
} from "lucide-react";

import { PublicLayout } from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "الذات — نظام الإرشاد المدرسي" },
      {
        name: "description",
        content:
          "بوابة التوجيه الطلابي للوصول إلى الخدمات والاستمارات والتواصل مع الموجه الطلابي.",
      },
      { property: "og:title", content: "الذات — نظام الإرشاد المدرسي" },
      {
        property: "og:description",
        content: "خدمات التوجيه الطلابي في مكان واحد، للطالب والأسرة والمدرسة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: "https://athat.app/" },
      { rel: "icon", type: "image/svg+xml", href: "/brand-icon.svg?v=20261001a" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png?v=20261001a" },
    ],
  }),
  component: Landing,
});

const quickLinks = [
  {
    to: "/services" as const,
    title: "الخدمات الإرشادية",
    description: "استشارة، دعم ومتابعة",
    icon: HeartHandshake,
  },
  {
    to: "/forms" as const,
    title: "الاستمارات",
    description: "إحالة وطلبات إلكترونية",
    icon: FileText,
  },
  {
    to: "/contact" as const,
    title: "تواصل مع الموجه",
    description: "قنوات تواصل مباشرة",
    icon: ShieldCheck,
  },
];

function Landing() {
  return (
    <PublicLayout>
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-7 sm:px-8 sm:py-12">
        <div className="overflow-hidden rounded-[1.75rem] border border-primary/10 bg-card shadow-sm">
          <div className="grid lg:grid-cols-[1.35fr_.65fr]">
            <div className="relative overflow-hidden bg-primary px-6 py-8 text-primary-foreground sm:px-9 sm:py-10 lg:min-h-[330px]">
              <div
                aria-hidden="true"
                className="absolute -left-16 -top-20 size-64 rounded-full border-[44px] border-white/[0.04]"
              />
              <div
                aria-hidden="true"
                className="absolute -bottom-24 right-1/3 size-56 rounded-full bg-white/[0.035]"
              />

              <div className="relative flex h-full max-w-2xl flex-col justify-center">
                <span className="mb-4 w-fit rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold text-white/80">
                  التوجيه الطلابي
                </span>
                <h1 className="text-3xl font-black leading-[1.35] sm:text-4xl">
                  دعم الطالب يبدأ
                  <br />
                  بخطوة بسيطة.
                </h1>
                <p className="mt-3 max-w-lg text-sm leading-7 text-white/75 sm:text-base">
                  خدمات التوجيه والاستمارات والتواصل في مكان واحد، بخصوصية وسهولة.
                </p>

                <div className="mt-6 flex flex-wrap gap-2.5">
                  <Button
                    asChild
                    variant="secondary"
                    className="h-11 gap-2 rounded-xl px-5 font-black text-primary"
                  >
                    <Link to="/auth" search={{ next: "/dashboard", mode: "signin" }}>
                      دخول الموجه
                      <ArrowLeft className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    className="h-11 rounded-xl border border-white/20 bg-white/5 px-5 font-bold text-white hover:bg-white/15 hover:text-white"
                  >
                    <Link to="/services">الخدمات الإرشادية</Link>
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center gap-2.5 bg-secondary/20 p-4 sm:p-5">
              <p className="px-1 pb-1 text-[11px] font-black text-muted-foreground">
                وصول سريع
              </p>
              {quickLinks.map(({ to, title, description, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="group flex items-center gap-3 rounded-2xl border border-border/80 bg-background/90 p-3.5 transition hover:border-primary/25 hover:shadow-sm"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-sm font-black">{title}</strong>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                      {description}
                    </span>
                  </span>
                  <ArrowLeft className="size-4 shrink-0 text-muted-foreground transition group-hover:-translate-x-0.5 group-hover:text-primary" />
                </Link>
              ))}

              <div className="mt-1 flex items-center gap-2 rounded-xl px-2 py-2 text-[10px] leading-5 text-muted-foreground">
                <ShieldCheck className="size-4 shrink-0 text-primary" />
                <span>الطلبات تصل إلى الموجه الطلابي المختص وتُتابع من داخل النظام.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] font-semibold text-muted-foreground sm:text-xs">
          <span>خصوصية الطالب</span>
          <span className="size-1 rounded-full bg-primary/30" />
          <span>خدمات إلكترونية</span>
          <span className="size-1 rounded-full bg-primary/30" />
          <span>متابعة منظمة</span>
        </div>
      </section>
    </PublicLayout>
  );
}
