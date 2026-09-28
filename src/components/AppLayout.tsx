import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
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
  Globe2,
  FolderCheck,
  FileText,
  Settings,
  LogOut,
  Menu,
  FolderKanban,
  UserRound,
  Newspaper,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/lib/school";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Copyright } from "@/components/Copyright";
import { GlobalSearch } from "@/components/GlobalSearch";

const NAV = [
  { to: "/dashboard", label: "الرئيسية ومركز الأقسام", icon: LayoutDashboard },
  { to: "/students", label: "السجلات الإرشادية", icon: Users },
  { to: "/plan", label: "الخطط والبرامج", icon: FolderKanban },
  { to: "/evidences", label: "التوثيق والتقارير", icon: FolderCheck },
  { to: "/posts", label: "المحتوى والخدمات", icon: Newspaper },
  { to: "/messages", label: "التواصل والحساب", icon: MessagesSquare },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const { data: school } = useSchool();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setOpen(false);
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
    <div className="app-shell flex min-h-screen bg-background">
      {/* القائمة الجانبية */}
      <aside
        className={cn(
          "no-print fixed inset-y-0 right-0 z-40 flex w-72 shrink-0 flex-col overflow-y-auto border-l border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="border-b border-sidebar-border px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="brand-mark-well flex size-16 shrink-0 items-center justify-center rounded-xl p-1 ring-2 ring-sidebar-primary/30">
              <img src="/brand-logo.png" alt="شعار الذات" className="size-full object-contain" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-sidebar-primary">الذات</p>
              <p className="mt-1 text-xs text-sidebar-foreground/70">منصة الموجه الطلابي</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.to === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border-r-2 border-transparent px-3 py-3 text-sm hover:bg-sidebar-accent",
                  isActive &&
                    "border-sidebar-primary bg-sidebar-accent font-semibold text-sidebar-primary",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
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
        <header className="no-print sticky top-0 z-20 border-b-2 border-primary/20 bg-card/95 shadow-sm backdrop-blur-xl">
          <div className="flex min-h-20 flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-8">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                aria-label="فتح القائمة الجانبية"
                onClick={() => setOpen(true)}
              >
                <Menu className="size-5" />
              </Button>
              <img
                src="/brand-logo.png"
                alt="شعار الذات"
                className="brand-mark-well hidden size-14 rounded-xl p-0.5 object-contain sm:block"
              />
              <div>
                <p className="text-sm font-bold">{school?.school_name || "اسم المدرسة غير محدد"}</p>
                <p className="text-xs text-muted-foreground">
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

        <main className="min-w-0 flex-1 p-4 lg:p-8">{children}</main>

        <footer className="no-print border-t px-4 py-4">
          <Copyright />
        </footer>
      </div>
    </div>
  );
}
