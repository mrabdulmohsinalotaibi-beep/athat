import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

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
        content: "التوجيه الطلابي في مكان واحد، بخصوصية وسهولة.",
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

function Landing() {
  return (
    <PublicLayout>
      <section className="mx-auto flex w-full max-w-5xl flex-1 items-center px-4 py-7 sm:px-8 sm:py-12">
        <div className="relative w-full overflow-hidden rounded-[1.75rem] bg-primary px-6 py-10 text-primary-foreground shadow-[var(--shadow-soft)] sm:px-10 sm:py-14">
          <div
            aria-hidden="true"
            className="absolute -left-16 -top-20 size-64 rounded-full border-[44px] border-white/[0.04]"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-28 right-1/4 size-72 rounded-full bg-white/[0.035]"
          />

          <div className="relative mx-auto max-w-2xl text-center">
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold text-white/80">
              نظام التوجيه الطلابي
            </span>
            <h1 className="mt-5 text-3xl font-black leading-[1.35] sm:text-5xl">
              أعمال الموجه الطلابي
              <br />
              في مكان واحد.
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-white/75 sm:text-base">
              إدارة الحالات والبرامج والشواهد والتقارير بواجهة عملية تحفظ الوقت والخصوصية.
            </p>

            <Button
              asChild
              variant="secondary"
              className="mt-7 h-12 gap-2 rounded-xl px-7 font-black text-primary shadow-lg"
            >
              <Link to="/auth" search={{ next: "/dashboard", mode: "signin" }}>
                دخول الموجه الطلابي
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
