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
  FileText,
  Settings,
  LogOut,
  Menu,
  Printer,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/lib/school";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { to: "/students", label: "سجل الطلاب", icon: Users },
  { to: "/cases", label: "الحالات الإرشادية", icon: HeartHandshake },
  { to: "/plan", label: "الخطة التشغيلية", icon: ClipboardList },
  { to: "/programs", label: "البرامج والأنشطة", icon: CalendarDays },
  { to: "/interviews", label: "المقابلات والتواصل", icon: MessagesSquare },
  { to: "/attendance", label: "الحضور والمواظبة", icon: CalendarCheck },
  { to: "/behavior", label: "السلوك والمتابعة", icon: ShieldAlert },
  { to: "/referrals", label: "سجل الإحالات", icon: Send },
  { to: "/committees", label: "اللجان والاجتماعات", icon: Gavel },
  { to: "/evidences", label: "الشواهد والتوثيق", icon: FolderCheck },
  { to: "/calendar", label: "التقويم والمتابعة", icon: CalendarDays },
  { to: "/reports", label: "التقارير والطباعة", icon: Printer },
  { to: "/settings", label: "الإعدادات", icon: Settings },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const { data: school } = useSchool();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "no-print fixed inset-y-0 right-0 z-40 w-64 shrink-0 overflow-y-auto bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "translate-x-full lg:translate-x-0",
        )}
      >
        <div className="border-b border-sidebar-border px-5 py-5">
          <p className="text-2xl font-extrabold text-sidebar-primary">ذات</p>
          <p className="mt-1 text-xs text-sidebar-foreground/70">منصة الموجه الطلابي</p>
        </div>
        <nav className="space-y-1 p-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent",
                pathname === to && "bg-sidebar-accent font-semibold text-sidebar-primary",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-3">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent"
          >
            <LogOut className="size-4" />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {open && (
        <button
          aria-label="إغلاق القائمة"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}>
                <Menu className="size-5" />
              </Button>
              <div>
                <p className="text-sm font-bold">{school?.school_name || "اسم المدرسة غير محدد"}</p>
                <p className="text-xs text-muted-foreground">
                  {[school?.education_dept, school?.education_office].filter(Boolean).join(" — ") ||
                    "أكمل بيانات المدرسة من صفحة الإعدادات"}
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
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
