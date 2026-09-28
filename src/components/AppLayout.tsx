import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import {
  CalendarDays,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  UserRound,
  Users,
} from "lucide-react";
import { WORKSPACE_SECTIONS } from "@/lib/workspace-sections";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/lib/school";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Copyright } from "@/components/Copyright";
import { GlobalSearch } from "@/components/GlobalSearch";

function isPathActive(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(route + "/");
}



const bottomNavigation = [
  { to: "/dashboard", label: "الرئيسية", icon: LayoutDashboard, activeRoutes: ["/dashboard"] },
  { to: "/students", label: "الطلاب", icon: Users, activeRoutes: ["/students", "/cases", "/attendance", "/behavior", "/referrals", "/requests"] },
  { to: "/interviews", label: "الجلسات", icon: CalendarDays, activeRoutes: ["/interviews", "/calendar", "/messages"] },
  { to: "/programs", label: "البرامج والخطط", icon: ClipboardList, activeRoutes: ["/plan", "/programs", "/committees", "/evidences", "/weekly-poster", "/posts"] },
  { to: "/settings", label: "الإعدادات", icon: Settings, activeRoutes: ["/settings", "/reports", "/toolkit", "/integrations", "/profile", "/subscription"] },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const { data: school } = useSchool();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const currentSection = WORKSPACE_SECTIONS.find((section) =>
    section.items.some((item) => !item.disabled && isPathActive(pathname, item.to)),
  );

  useEffect(() => {
    setOpen(false);
    const activeSection = WORKSPACE_SECTIONS.find((section) =>
      section.items.some((item) => !item.disabled && isPathActive(pathname, item.to)),
    );
    setExpandedSection(activeSection?.id ?? null);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { next: "" }, replace: true });
  }

  return (
    <div className="app-shell app-screen flex min-h-screen bg-background">
      {/* القائمة الجانبية */}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-40 flex w-72 shrink-0 flex-col overflow-hidden border-l border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:shadow-none",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="border-b border-sidebar-border px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="brand-mark-well flex size-14 shrink-0 items-center justify-center rounded-lg p-1 ring-2 ring-sidebar-primary/30">
              <img src="/brand-logo.png" alt="شعار الذات" className="size-full object-contain" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-sidebar-primary">الذات</p>
              <p className="mt-1 text-xs text-sidebar-foreground/70">منصة الموجه الطلابي</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 min-h-0 space-y-1 overflow-y-auto p-3" aria-label="التنقل الرئيسي">
          <Link
            to="/dashboard"
            onClick={() => setOpen(false)}
            aria-current={pathname === "/dashboard" ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg border-r-2 border-transparent px-3 py-2.5 text-sm hover:bg-sidebar-accent",
              pathname === "/dashboard" &&
                "border-sidebar-primary bg-sidebar-accent font-semibold text-sidebar-primary",
            )}
          >
            <LayoutDashboard className="size-4 shrink-0" aria-hidden="true" />
            <span>الرئيسية</span>
          </Link>
          <p className="px-3 pb-1 pt-4 text-[10px] font-bold tracking-wide text-sidebar-foreground/55">
            الأقسام الأساسية
          </p>
          <div className="space-y-1">
            {WORKSPACE_SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = section.items.some((item) => isPathActive(pathname, item.to));
              const isExpanded = expandedSection === section.id;
              const panelId = "sidebar-section-" + section.id;

              return (
                <div key={section.id}>
                  {section.visibility === "more" && (
                    <p className="px-3 pb-1 pt-4 text-[10px] font-bold tracking-wide text-sidebar-foreground/55">
                      أدوات مساندة والحساب
                    </p>
                  )}
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border-r-2 border-transparent px-3 py-2.5 text-right text-sm hover:bg-sidebar-accent",
                      isActive &&
                        "border-sidebar-primary bg-sidebar-accent font-semibold text-sidebar-primary",
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{section.title}</span>
                    <ChevronDown
                      className={cn("size-4 shrink-0 transition-transform", isExpanded && "rotate-180")}
                      aria-hidden="true"
                    />
                  </button>
                  <div
                    id={panelId}
                    hidden={!isExpanded}
                    className="mr-3 mt-1 space-y-1 border-r border-sidebar-border pr-3"
                  >
                    {section.items.map((item, index) => {
                      const ItemIcon = item.icon;
                      const isItemActive = !item.disabled && isPathActive(pathname, item.to);

                      if (item.disabled) {
                        return (
                          <span
                            key={item.label + index}
                            aria-disabled="true"
                            className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-2.5 py-2 text-xs text-sidebar-foreground/45"
                            title="هذه الخدمة ستتوفر قريبًا"
                          >
                            <ItemIcon className="size-3.5 shrink-0" aria-hidden="true" />
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                          </span>
                        );
                      }

                      return (
                        <Link
                          key={item.to + index}
                          to={item.to}
                          onClick={() => setOpen(false)}
                          aria-current={isItemActive ? "page" : undefined}
                          className={cn(
                            "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs text-sidebar-foreground/80 transition hover:bg-sidebar-accent hover:text-sidebar-foreground",
                            isItemActive && "bg-sidebar-accent font-semibold text-sidebar-primary",
                          )}
                        >
                          <ItemIcon className="size-3.5 shrink-0" aria-hidden="true" />
                          <span className="min-w-0 truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </nav>
        <div className="mt-auto border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            onClick={signOut}
            className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="size-4 shrink-0" />
            <span>تسجيل الخروج</span>
          </Button>
          <Copyright className="mt-3 px-2 text-sidebar-foreground/55" />
        </div>
      </aside>

      {/* طبقة التعتيم للخلفية عند فتح القائمة في الشاشات الصغيرة */}
      {open && (
        <Button
          type="button"
          variant="ghost"
          aria-label="إغلاق القائمة"
          className="fixed inset-0 z-30 h-auto w-auto rounded-none bg-foreground/40 p-0 backdrop-blur-[1px] hover:bg-foreground/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* محتوى الصفحة الرئيسي */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b-2 border-primary/20 bg-card/95 shadow-sm backdrop-blur-xl">
          <div className="grid min-h-18 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                aria-label="فتح القائمة الجانبية"
                onClick={() => setOpen(true)}
                className="lg:hidden"
              >
                <Menu className="size-5" />
              </Button>
              <img
                src="/brand-logo.png"
                alt="شعار الذات"
                className="brand-mark-well hidden size-14 rounded-xl p-0.5 object-contain sm:block"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{school?.school_name || "اسم المدرسة غير محدد"}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {school?.education_dept || "أكمل بيانات المدرسة من صفحة الإعدادات"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <GlobalSearch />
              <div className="hidden text-xs text-muted-foreground sm:block">
                <p>الموجه الطلابي: {school?.counselor_name || "—"}</p>
                <p>
                  {school?.academic_year || "العام الدراسي"} · {school?.semester || "الفصل الدراسي"}
                </p>
              </div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="gap-2 border-primary/25 bg-secondary/40"
              >
                <Link to="/profile" title="حسابي الشخصي">
                  <UserRound className="size-4 shrink-0" />
                  <span className="hidden sm:inline">حسابي</span>
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 pb-24 lg:p-8">
          {currentSection && (
            <nav
              className="mb-4 -mx-4 -mt-4 border-b bg-card/70 px-4 py-2 lg:hidden"
              aria-label={"روابط " + currentSection.title}
            >
              <div className="flex min-w-0 gap-2 overflow-x-auto">
                {currentSection.items.filter((item) => !item.disabled).map((item) => {
                  const ItemIcon = item.icon;
                  const isActive = isPathActive(pathname, item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        isActive ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:bg-accent",
                      )}
                    >
                      <ItemIcon className="size-3.5" aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>
          )}
          {children}
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-lg backdrop-blur-xl lg:hidden"
          aria-label="التنقل الرئيسي"
        >
          {bottomNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = item.activeRoutes.some((route) => isPathActive(pathname, route));
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 px-0.5 text-center text-[10px] font-semibold leading-3 transition",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
                <span className="max-w-full whitespace-normal">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <footer className="border-t px-4 py-4">
          <Copyright />
        </footer>
      </div>
    </div>
  );
}
