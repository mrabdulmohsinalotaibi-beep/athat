import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  HeartHandshake,
  ClipboardList,
  CalendarDays,
  MessagesSquare,
  CalendarCheck,
  ShieldAlert,
  Send,
  Gavel,
  FolderCheck,
  Settings,
  LogOut,
  Menu,
  Printer,
  ChevronDown,
  FolderKanban,
  Crown,
} from "lucide-react";
import platformLogo from "@/assets/thaat-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/lib/school";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/dashboard", label: "الرئيسية", icon: LayoutDashboard },
  { label: "الطلاب والسجلات الإرشادية", icon: Users, children: [
    { to: "/students", label: "سجل الطلاب", icon: Users }, { to: "/cases", label: "الحالات الإرشادية", icon: HeartHandshake },
    { to: "/interviews", label: "المقابلات والتواصل", icon: MessagesSquare }, { to: "/attendance", label: "الحضور والمواظبة", icon: CalendarCheck },
    { to: "/behavior", label: "السلوك والمتابعة", icon: ShieldAlert }, { to: "/referrals", label: "الإحالات", icon: Send },
  ]},
  { label: "الخطط والبرامج", icon: FolderKanban, children: [
    { to: "/plan", label: "الخطة التشغيلية", icon: ClipboardList }, { to: "/programs", label: "البرامج والأنشطة", icon: CalendarDays },
    { to: "/calendar", label: "التقويم والمتابعة", icon: CalendarDays }, { to: "/committees", label: "اللجان والاجتماعات", icon: Gavel },
  ]},
  { to: "/evidences", label: "الشواهد والوثائق", icon: FolderCheck },
  { to: "/reports", label: "التقارير والإحصائيات", icon: Printer },
  { to: "/subscription", label: "الاشتراك والترقية", icon: Crown },
  { to: "/settings", label: "الإعدادات", icon: Settings },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const { data: school } = useSchool();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string[]>(["الطلاب والسجلات الإرشادية", "الخطط والبرامج"]);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="app-shell flex min-h-screen bg-background">
      <aside
        className={cn(
          "no-print fixed inset-y-0 right-0 z-40 w-72 shrink-0 overflow-y-auto bg-sidebar text-sidebar-foreground shadow-2xl transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "translate-x-full lg:translate-x-0",
        )}
      >
        <div className="border-b border-sidebar-border px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-14 items-center justify-center rounded-lg bg-sidebar-accent p-1">
              <img src={platformLogo.url} alt="شعار منصة ذات" className="size-full object-contain" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-sidebar-primary">ذات</p>
              <p className="mt-1 text-xs text-sidebar-foreground/70">منصة الموجه الطلابي</p>
            </div>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            if ("children" in item) {
              const isOpen = expanded.includes(item.label);
              const active = item.children.some((child) => pathname === child.to);
              return <div key={item.label}>
                <Button type="button" variant="ghost" onClick={() => setExpanded((v) => isOpen ? v.filter((x) => x !== item.label) : [...v, item.label])} className={cn("w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground", active && "text-sidebar-primary")}>
                  <Icon className="size-4" /><span className="flex-1 text-right">{item.label}</span><ChevronDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} />
                </Button>
                {isOpen && <div className="mr-5 space-y-1 border-r border-sidebar-border pr-2">{item.children.map((child) => { const ChildIcon=child.icon; return <Link key={child.to} to={child.to} onClick={() => setOpen(false)} className={cn("flex items-center gap-2 rounded-md px-3 py-2 text-xs hover:bg-sidebar-accent", pathname === child.to && "bg-sidebar-accent font-semibold text-sidebar-primary")}><ChildIcon className="size-3.5" />{child.label}</Link>; })}</div>}
              </div>;
            }
            return <Link key={item.to} to={item.to} onClick={() => setOpen(false)} className={cn("flex items-center gap-3 rounded-lg border-r-2 border-transparent px-3 py-2.5 text-sm hover:bg-sidebar-accent", pathname === item.to && "border-sidebar-primary bg-sidebar-accent font-semibold text-sidebar-primary")}><Icon className="size-4" />{item.label}</Link>;
          })}
        </nav>
        <div className="p-3">
          <Button
            variant="ghost"
            onClick={signOut}
            className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="size-4" />
            تسجيل الخروج
          </Button>
        </div>
      </aside>

      {open && (
        <Button
          type="button"
          variant="ghost"
          aria-label="إغلاق القائمة"
          className="fixed inset-0 z-30 h-auto w-auto rounded-none bg-foreground/40 p-0 hover:bg-foreground/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-20 border-b bg-card/90 shadow-sm backdrop-blur-xl">
          <div className="flex min-h-20 flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-8">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}>
                <Menu className="size-5" />
              </Button>
              <img src={platformLogo.url} alt="شعار منصة ذات" className="hidden size-12 object-contain sm:block" />
              <div>
                <p className="text-sm font-bold">{school?.school_name || "اسم المدرسة غير محدد"}</p>
                <p className="text-xs text-muted-foreground">
                  {school?.education_dept || "أكمل بيانات المدرسة من صفحة الإعدادات"}
                </p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              <p>الموجه الطلابي: {school?.counselor_name || "—"}</p>
              <p>
                {school?.academic_year || "العام الدراسي"} · {school?.semester || "الفصل الدراسي"}
              </p>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
