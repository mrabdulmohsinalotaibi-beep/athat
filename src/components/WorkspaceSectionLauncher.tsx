import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { WORKSPACE_SECTIONS } from "@/lib/workspace-sections";

export function WorkspaceSectionLauncher() {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const primarySections = WORKSPACE_SECTIONS.filter((section) => section.visibility === "primary");
  const moreSection = WORKSPACE_SECTIONS.find((section) => section.visibility === "more");
  const isMoreOpen = moreSection ? openSection === moreSection.id : false;
  const morePanelId = moreSection ? "workspace-links-" + moreSection.id : undefined;

  return (
    <section
      id="workspace-sections"
      dir="rtl"
      aria-labelledby="workspace-sections-title"
      className="dashboard-panel rounded-3xl border border-primary/15 bg-card p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-[11px] font-black tracking-wide text-primary">الأساسيات أولًا</span>
          <h2 id="workspace-sections-title" className="mt-1 text-xl font-black">
            مسارات عمل الموجه
          </h2>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            افتح كل مسار للوصول إلى سجلاته وأدواته المرتبطة.
          </p>
        </div>
        <span className="rounded-full bg-primary/5 px-3 py-1 text-[11px] font-bold text-primary">
          {primarySections.length} مسارات
        </span>
      </div>
      <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {primarySections.map((section) => {
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
      {moreSection && (
        <div className="mt-3 overflow-hidden rounded-2xl border border-border/70 bg-muted/25">
          <button
            type="button"
            aria-expanded={isMoreOpen}
            aria-controls={isMoreOpen ? morePanelId : undefined}
            onClick={() => setOpenSection(isMoreOpen ? null : moreSection.id)}
            className="flex w-full items-center gap-3 px-3 py-3 text-right transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-background text-muted-foreground">
              <moreSection.icon className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">المزيد</span>
              <span className="block text-[11px] text-muted-foreground">
                {moreSection.items.length} روابط مساندة والحساب
              </span>
            </span>
            <ChevronDown
              className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isMoreOpen && "rotate-180")}
              aria-hidden="true"
            />
          </button>
          {isMoreOpen && moreSection && morePanelId && (
            <div id={morePanelId} className="border-t border-border/60 px-4 pb-4 pt-3">
              <p className="mb-3 text-[11px] leading-5 text-muted-foreground">
                {moreSection.description}
              </p>
              <div className="grid min-w-0 gap-2 sm:grid-cols-2">
                {moreSection.items.map((item) => {
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
        </div>
      )}
    </section>
  );
}
