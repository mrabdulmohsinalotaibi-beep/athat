import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, FolderCheck, Gauge, Scale } from "lucide-react";

import { GuidanceTemplates } from "@/components/GuidanceTemplates";
import { MEASUREMENT_TOOLS, REGULATION_ARCHIVE } from "@/lib/guidance";

export const Route = createFileRoute("/_authenticated/toolkit")({
  head: () => ({
    meta: [
      { title: "أدوات القياس والأرشيف | الذات" },
      {
        name: "description",
        content: "روابط المقاييس والاختبارات النفسية وأرشيف التعاميم وقواعد السلوك والمواظبة.",
      },
      { property: "og:title", content: "أدوات القياس والأرشيف | الذات" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ToolkitPage,
});

function LinkList({
  title,
  hint,
  icon: Icon,
  items,
}: {
  title: string;
  hint: string;
  icon: typeof Gauge;
  items: readonly { title: string; description: string; href: string }[];
}) {
  return (
    <section className="rounded-3xl border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
      <div className="flex items-center gap-2">
        <Icon className="size-5 text-primary" />
        <h2 className="font-bold">{title}</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      <ul className="mt-4 grid gap-3 xl:grid-cols-2">
        {items.map((item) => (
          <li key={item.title}>
            <a
              href={item.href}
              target="_blank"
              rel="noreferrer noopener"
              className="flex h-full flex-col rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/[0.03] hover:shadow-sm"
            >
              <span className="flex items-center justify-between gap-2 font-semibold">
                {item.title}
                <ExternalLink className="size-4 text-muted-foreground" />
              </span>
              <span className="mt-1 text-xs leading-6 text-muted-foreground">
                {item.description}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ToolkitPage() {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-primary/15 bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
        <div aria-hidden="true" className="pointer-events-none absolute -left-12 -top-12 size-40 rounded-full bg-primary/8 blur-2xl" />
        <div className="relative">
        <h1 className="text-2xl font-black text-navy">أدوات القياس والأرشيف</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          المقاييس والاختبارات المعتمدة، والأنظمة والتعاميم المرجعية، ونماذج العمل الجاهزة.
        </p>
        </div>
      </section>

      <LinkList
        title="المقاييس والاختبارات"
        hint="روابط الاختبارات النفسية والتربوية والمقاييس المستخدمة في دراسة الحالة."
        icon={Gauge}
        items={MEASUREMENT_TOOLS}
      />

      <LinkList
        title="الأنظمة والتعاميم"
        hint="قواعد السلوك والمواظبة والأنظمة المرجعية في إجراءات التوجيه الطلابي."
        icon={Scale}
        items={REGULATION_ARCHIVE}
      />

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <FolderCheck className="size-5 text-primary" />
          <h2 className="font-bold">أرشيف الشواهد والوثائق</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          ارفع التعاميم والمحاضر والشواهد واحفظها ضمن ملفات العمل في{" "}
          <Link to="/evidences" className="font-semibold text-primary">
            الشواهد والوثائق
          </Link>
          .
        </p>
      </div>

      <GuidanceTemplates />
    </div>
  );
}
