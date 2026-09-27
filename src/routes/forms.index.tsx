import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { PublicLayout } from "@/components/PublicLayout";
import { PUBLIC_FORMS } from "@/lib/guidance";

export const Route = createFileRoute("/forms/")({
  head: () => ({
    meta: [
      { title: "الاستمارات التفاعلية | الذات" },
      {
        name: "description",
        content: "استمارات التوجيه الطلابي: طلب استشارة فردية، إحالة طالب، والإبلاغ السري.",
      },
      { property: "og:title", content: "الاستمارات التفاعلية | الذات" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: FormsIndexPage,
});

function FormsIndexPage() {
  return (
    <PublicLayout
      title="الاستمارات التفاعلية"
      subtitle="اختر الاستمارة المناسبة؛ يصل الطلب مباشرة إلى صندوق الطلبات لدى الموجه الطلابي."
    >
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-8">
        <div className="grid gap-5 lg:grid-cols-3">
          {PUBLIC_FORMS.map((form) => (
            <Link
              key={form.to}
              to={form.to}
              className="group rounded-2xl border border-border/70 bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg"
            >
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                {form.audience}
              </span>
              <h2 className="mt-4 text-lg font-bold">{form.title}</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{form.description}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary">
                فتح الاستمارة
                <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
