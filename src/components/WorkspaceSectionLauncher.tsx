import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { WORKSPACE_SECTIONS } from "@/lib/workspace-sections";

export function WorkspaceSectionLauncher() {
  return (
    <section
      id="workspace-sections"
      dir="rtl"
      aria-labelledby="workspace-sections-title"
      className="dashboard-panel rounded-3xl border border-primary/15 bg-card p-4 shadow-sm sm:p-5"
    >
      <div>
        <span className="text-[11px] font-black tracking-wide text-primary">الأساسيات أولًا</span>
        <h2 id="workspace-sections-title" className="mt-1 text-xl font-black">مسارات العمل</h2>
        <p className="mt-1 text-xs leading-6 text-muted-foreground">
          أربعة مسارات واضحة تغطي العمل اليومي دون قوائم متداخلة.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {WORKSPACE_SECTIONS.map((section) => {
          const Icon = section.icon;
          const primary = section.items[0];
          return (
            <article key={section.id} className="rounded-2xl border border-primary/10 bg-background/70 p-4">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-black">{section.title}</h3>
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{section.description}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {section.items.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="rounded-lg border border-border/70 bg-card px-2.5 py-1.5 text-[11px] font-bold transition hover:border-primary/35 hover:text-primary"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              {primary && (
                <Link to={primary.to} className="mt-4 inline-flex items-center gap-1 text-xs font-black text-primary hover:underline">
                  فتح المسار <ArrowLeft className="size-3.5" />
                </Link>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
