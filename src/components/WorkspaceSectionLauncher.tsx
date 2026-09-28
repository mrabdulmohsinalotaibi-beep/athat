import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { WORKSPACE_SECTIONS } from "@/lib/workspace-sections";

export function WorkspaceSectionLauncher() {
  const [openSection, setOpenSection] = useState<string | null>(null);

  return (
    <section
      id="workspace-sections"
      dir="rtl"
      aria-labelledby="workspace-sections-title"
      className="dashboard-panel rounded-3xl border border-primary/15 bg-card p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-[11px] font-black tracking-wide text-primary">مركز الأقسام</span>
          <h2 id="workspace-sections-title" className="mt-1 text-xl font-black">
            اختر مجال العمل
          </h2>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            افتح قسمًا لعرض صفحاته؛ بياناتك وسجلاتك تبقى كما هي.
          </p>
        </div>
        <span className="rounded-full bg-primary/5 px-3 py-1 text-[11px] font-bold text-primary">
          {WORKSPACE_SECTIONS.length} أقسام
        </span>
      </div>
      <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {WORKSPACE_SECTIONS.map((section) => {
          const Icon = section.icon;
          const isOpen = openSection === section.id;
          const panelId = "workspace-links-" + section.id;

          return (
            <article
              key={section.id}
              className={cn(
                "min-w-0 overflow-hidden rounded-2xl border bg-gradient-to-br p-2.5 transition sm:p-3",
                section.tone,
                isOpen && "border-primary/30 shadow-sm",
              )}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={isOpen ? panelId : undefined}
                onClick={() => setOpenSection(isOpen ? null : section.id)}
                className="flex w-full min-w-0 items-center gap-3 rounded-xl p-2 text-right transition hover:bg-background/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-background/80 text-primary shadow-sm">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black">{section.title}</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {section.items.length} صفحات
                  </span>
                </span>
                <ChevronDown
                  className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")}
                  aria-hidden="true"
                />
              </button>
              {isOpen && (
                <div id={panelId} className="mt-2 border-t border-border/60 px-2 pb-1 pt-3">
                  <p className="mb-3 text-[11px] leading-5 text-muted-foreground">
                    {section.description}
                  </p>
                  <div className="grid min-w-0 gap-2 sm:grid-cols-2">
                    {section.items.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          className="flex min-h-10 min-w-0 items-center gap-2 rounded-xl border border-border/70 bg-background/80 px-2.5 py-2 text-[11px] font-bold transition hover:border-primary/40 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <ItemIcon className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                          <span className="min-w-0 break-words leading-5">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
