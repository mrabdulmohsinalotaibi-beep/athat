import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  FileText,
  ShieldCheck,
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
import { useAdminStatus, useGlobalAppSettings } from "@/lib/admin";

function isPathActive(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(route + "/");
}


const bottomNavigation = [
  { to: "/dashboard", label: "الرئيسية", icon: LayoutDashboard, activeRoutes: ["/dashboard"] },
  { to: "/students", label: "الطلاب", icon: Users, activeRoutes: ["/students", "/cases"] },
  { to: "/programs", label: "البرامج", icon: ClipboardList, activeRoutes: ["/plan", "/programs", "/evidences"] },
  { to: "/reports", label: "التقارير", icon: FileText, activeRoutes: ["/reports"] },
  { to: "/settings", label: "المزيد", icon: Settings, activeRoutes: ["/settings", "/integrations", "/profile", "/interviews", "/calendar", "/attendance", "/behavior", "/referrals", "/committees", "/toolkit", "/messages", "/weekly-poster", "/posts"] },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const { data: school } = useSchool();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: globalSettings } = useGlobalAppSettings();
  const { data: adminStatus } = useAdminStatus();

  // The main counselor workspace must stay available even if global admin
  // settings are temporarily unavailable or their database migration is pending.
  const visibleSections = WORKSPACE_SECTIONS;
  const visibleBottomNavigation = bottomNavigation;
  const { data: alertCount = 0 } = useQuery({
    queryKey: ["app-alert-count"],
    queryFn: async () => {
      const day = new Date().toISOString().slice(0, 10);
      const [cases, tasks] = await Promise.all([
        supabase.from("counseling_cases").select("id,case_status,followup_at"),
        supabase.from("plan_tasks").select("id,exec_status,due_date,doc_status"),
      ]);
      // Alerts are supplementary UI. A missing/temporarily unavailable table
      // must never prevent the rest of the application from opening.
      if (cases.error) console.warn("[alerts] counseling_cases:", cases.error.message);
      if (tasks.error) console.warn("[alerts] plan_tasks:", tasks.error.message);
      const dueCases = (cases.error ? [] : cases.data ?? []).filter((item) => item.case_status !== "مغلقة" && item.followup_at && String(item.followup_at).slice(0, 10) <= day).length;
      const attentionTasks = (tasks.error ? [] : tasks.data ?? []).filter((item) => (item.due_date && String(item.due_date).slice(0, 10) < day && item.exec_status !== "مكتمل") || item.doc_status === "ناقص").length;
      return dueCases + attentionTasks;
    },
    staleTime: 60_000,
  });
  const currentSection = visibleSections.find((section) =>
    section.items.some((item) => isPathActive(pathname, item.to)),
  );

  useEffect(() => {
    setOpen(false);
    const activeSection = visibleSections.find((section) =>
      section.items.some((item) => isPathActive(pathname, item.to)),
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
    <div className="app-shell app-screen athat-premium-shell flex min-h-screen bg-background">
      {/* القائمة الجانبية */}
      <aside
        className={cn(
          "athat-sidebar fixed inset-y-0 right-0 z-40 flex w-72 shrink-0 flex-col overflow-hidden border-l border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:shadow-none",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="border-b border-sidebar-border px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="brand-mark-well flex size-16 shrink-0 items-center justify-center rounded-xl p-0.5 ring-2 ring-sidebar-primary/40">
              <img src="/brand-icon.svg?v=20260929f" alt="شعار الذات" className="size-full object-contain" />
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
            {visibleSections.map((section) => {
              const Icon = section.icon;
              const isActive = section.items.some((item) => isPathActive(pathname, item.to));
              const isExpanded = expandedSection === section.id;
              const panelId = "sidebar-section-" + section.id;

              return (
                <div key={section.id}>
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
                      const isItemActive = isPathActive(pathname, item.to);

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
          {adminStatus?.isAdmin && (
            <Button
              asChild
              variant="ghost"
              className="mb-1 w-full justify-start text-sidebar-primary hover:bg-sidebar-accent hover:text-sidebar-primary"
            >
              <Link to="/admin" onClick={() => setOpen(false)}>
                <ShieldCheck className="size-4 shrink-0" />
                <span>{adminStatus.role === "owner" ? "إدارة المنصة" : "لوحة المشرف"}</span>
              </Link>
            </Button>
          )}
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
      <div className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0">
        <header className="athat-topbar sticky top-0 z-20 border-b border-[#555555] bg-[#3C3C3C] text-[#F1E9DD] shadow-sm">
          <div className="mx-auto flex min-h-[88px] w-full items-center justify-between gap-3 px-3 py-3 sm:px-5 lg:px-8">
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
              <Button
                variant="ghost"
                size="icon"
                aria-label="فتح القائمة الجانبية"
                onClick={() => setOpen(true)}
                className="shrink-0 text-[#F1E9DD] hover:bg-white/10 hover:text-white lg:hidden"
              >
                <Menu className="size-5" />
              </Button>

              <div className="athat-topbar-logo relative shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-[#3C3C3C] shadow-[0_10px_30px_-18px_rgba(0,0,0,.9)]">
                <img
                  src="/brand-icon.svg?v=20260929f"
                  alt="شعار الذات"
                  className="size-[68px] object-cover sm:size-[76px]"
                />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="truncate text-base font-black tracking-tight text-[#F1E9DD] sm:text-lg">
                    {school?.school_name || "اسم المدرسة غير محدد"}
                  </p>
                  <span className="hidden rounded-full border border-white/15 bg-white/8 px-2.5 py-1 text-[10px] font-bold text-[#E6DED2] sm:inline-flex">
                    منصة الذات
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[11px] font-medium text-[#D8D0C4] sm:text-xs">
                  {school?.education_dept || "أكمل بيانات المدرسة من صفحة الإعدادات"}
                </p>
                <div className="mt-1.5 hidden flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#CEC6BB] sm:flex">
                  <span>الموجه الطلابي: <b className="font-bold text-[#F1E9DD]">{school?.counselor_name || "—"}</b></span>
                  <span className="text-white/25">•</span>
                  <span>{school?.academic_year || "العام الدراسي"}</span>
                  <span className="text-white/25">•</span>
                  <span>{school?.semester || "الفصل الدراسي"}</span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <div className="hidden md:block"><GlobalSearch /></div>
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="التنبيهات"
                  onClick={() => setAlertsOpen((value) => !value)}
                  className="relative text-[#F1E9DD] hover:bg-white/10 hover:text-white"
                >
                  <Bell className="size-5" />
                  {alertCount > 0 && (
                    <span className="absolute -left-1 -top-1 min-w-5 rounded-full bg-destructive px-1 text-center text-[10px] font-black leading-5 text-destructive-foreground">
                      {alertCount > 99 ? "99+" : alertCount}
                    </span>
                  )}
                </Button>
                {alertsOpen && (
                  <div className="absolute left-0 top-12 z-50 w-72 rounded-xl border border-border bg-card p-3 text-card-foreground shadow-xl">
                    <p className="text-sm font-black">تنبيهات العمل</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {alertCount ? `لديك ${alertCount} عنصرًا يحتاج متابعة أو توثيقًا.` : "لا توجد تنبيهات مستحقة حاليًا."}
                    </p>
                    <Button asChild size="sm" className="mt-3 w-full" onClick={() => setAlertsOpen(false)}>
                      <Link to="/dashboard">فتح مركز مهام اليوم</Link>
                    </Button>
                  </div>
                )}
              </div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-10 gap-2 border-white/20 bg-white/8 text-[#F1E9DD] hover:bg-white/14 hover:text-white"
              >
                <Link to="/profile" title="حسابي الشخصي">
                  <UserRound className="size-4 shrink-0" />
                  <span className="hidden sm:inline">حسابي</span>
                </Link>
              </Button>
            </div>
          </div>
        </header>
        {globalSettings?.announcement && (
          <div className="border-b border-amber-300/25 bg-amber-50 px-4 py-2 text-center text-xs font-bold text-amber-900">
            {globalSettings.announcement}
          </div>
        )}
        <main className="min-w-0 flex-1 p-4 pb-24 lg:p-8">
          {currentSection && (
            <nav
              className="mb-4 -mx-4 -mt-4 border-b bg-card/70 px-4 py-2 lg:hidden"
              aria-label={"روابط " + currentSection.title}
            >
              <div className="flex min-w-0 gap-2 overflow-x-auto">
                {currentSection.items.map((item) => {
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
          {visibleBottomNavigation.map((item) => {
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
