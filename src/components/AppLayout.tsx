import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState, type ReactNode, type LucideIcon } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/lib/school";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Copyright } from "@/components/Copyright";
import { isAppTheme, useTheme } from "@/lib/theme";

// Types
type NavLeafItem = {
  id: string;
  to: string;
  label: string;
  icon: LucideIcon;
};

type NavGroupItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  children: NavLeafItem[];
};

type NavItem = NavLeafItem | NavGroupItem;

// Navigation configuration with stable IDs
const NAV: NavItem[] = [
  { id: "home", to: "/dashboard", label: "الرئيسية", icon: LayoutDashboard },
  {
    id: "students",
    label: "الطلاب والسجلات الإرشادية",
    icon: Users,
    children: [
      { id: "student-list", to: "/students", label: "سجل الطلاب", icon: Users },
      { id: "cases", to: "/cases", label: "الحالات الإرشادية", icon: HeartHandshake },
      { id: "interviews", to: "/interviews", label: "المقابلات والتواصل", icon: MessagesSquare },
      { id: "attendance", to: "/attendance", label: "الحضور والمواظبة", icon: CalendarCheck },
      { id: "behavior", to: "/behavior", label: "السلوك والمتابعة", icon: ShieldAlert },
      { id: "referrals", to: "/referrals", label: "الإحالات", icon: Send },
    ],
  },
  {
    id: "plans",
    label: "الخطط والبرامج",
    icon: FolderKanban,
    children: [
      { id: "plan", to: "/plan", label: "الخطة التشغيلية", icon: ClipboardList },
      { id: "programs", to: "/programs", label: "البرامج والأنشطة", icon: CalendarDays },
      { id: "calendar", to: "/calendar", label: "التقويم والمتابعة", icon: CalendarDays },
      { id: "committees", to: "/committees", label: "اللجان والاجتماعات", icon: Gavel },
    ],
  },
  { id: "evidences", to: "/evidences", label: "الشواهد والوثائق", icon: FolderCheck },
  { id: "reports", to: "/reports", label: "التقارير والإحصائيات", icon: Printer },
  { id: "subscription", to: "/subscription", label: "الاشتراك والترقية", icon: Crown },
  { id: "settings", to: "/settings", label: "الإعدادات", icon: Settings },
];

// Sidebar Header Component
function SidebarHeader() {
  return (
    <div className="border-b border-sidebar-border px-5 py-5">
      <div className="flex items-center gap-3">
        <div className="flex size-14 items-center justify-center p-0.5">
          <img
            src="/IMG_3331.png"
            alt="شعار منصة الذات"
            className="size-full object-contain"
          />
        </div>
        <div>
          <p className="text-2xl font-extrabold text-sidebar-primary">الذات</p>
          <p className="mt-1 text-xs text-sidebar-foreground/70">منصة الموجه الطلابي</p>
        </div>
      </div>
    </div>
  );
}

// Nav Item Components
interface NavItemLeafProps {
  item: NavLeafItem;
  isActive: boolean;
  onNavigate: () => void;
}

function NavItemLeaf({ item, isActive, onNavigate }: NavItemLeafProps) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-lg border-r-2 border-transparent px-3 py-2.5 text-sm transition-all hover:bg-sidebar-accent hover:text-sidebar-foreground",
        isActive
          ? "border-r-sidebar-primary bg-sidebar-accent text-sidebar-primary"
          : "text-sidebar-foreground"
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon className="size-4" />
      <span className="flex-1 text-right">{item.label}</span>
    </Link>
  );
}

interface NavItemGroupProps {
  item: NavGroupItem;
  isExpanded: boolean;
  isActive: boolean;
  onToggle: () => void;
  pathname: string;
  onNavigate: () => void;
}

function NavItemGroup({
  item,
  isExpanded,
  isActive,
  onToggle,
  pathname,
  onNavigate,
}: NavItemGroupProps) {
  const Icon = item.icon;
  return (
    <div>
      <Button
        type="button"
        variant="ghost"
        onClick={onToggle}
        className={cn(
          "w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
          isActive && "text-sidebar-primary"
        )}
        aria-expanded={isExpanded}
      >
        <Icon className="size-4" />
        <span className="flex-1 text-right">{item.label}</span>
        <ChevronDown
          className={cn("size-4 transition-transform", isExpanded && "rotate-180")}
          aria-hidden
        />
      </Button>
      {isExpanded && (
        <div className="mr-5 space-y-1 border-r border-sidebar-border pr-2">
          {item.children.map((child) => (
            <NavItemLeaf
              key={child.id}
              item={child}
              isActive={pathname === child.to}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Sidebar Navigation Component
interface SidebarNavProps {
  pathname: string;
  expandedItems: Set<string>;
  onToggleExpand: (id: string) => void;
  onNavigate: () => void;
}

function SidebarNav({ pathname, expandedItems, onToggleExpand, onNavigate }: SidebarNavProps) {
  return (
    <nav className="flex-1 space-y-1 p-3">
      {NAV.map((item) => {
        if ("children" in item) {
          const isExpanded = expandedItems.has(item.id);
          const isActive = item.children.some((child) => pathname === child.to);
          return (
            <NavItemGroup
              key={item.id}
              item={item}
              isExpanded={isExpanded}
              isActive={isActive}
              onToggle={() => onToggleExpand(item.id)}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          );
        }

        return (
          <NavItemLeaf
            key={item.id}
            item={item}
            isActive={pathname === item.to}
            onNavigate={onNavigate}
          />
        );
      })}
    </nav>
  );
}

// Sidebar Footer Component
interface SidebarFooterProps {
  onSignOut: () => void;
}

function SidebarFooter({ onSignOut }: SidebarFooterProps) {
  return (
    <div className="mt-auto border-t border-sidebar-border p-3">
      <Button
        variant="ghost"
        onClick={onSignOut}
        className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
      >
        <LogOut className="size-4" />
        تسجيل الخروج
      </Button>
      <Copyright className="mt-3 px-2 text-sidebar-foreground/55" />
    </div>
  );
}

// App Header Component
interface AppHeaderProps {
  school: any;
  onMenuOpen: () => void;
}

function AppHeader({ school, onMenuOpen }: AppHeaderProps) {
  return (
    <header className="no-print sticky top-0 z-20 border-b bg-card/90 shadow-sm backdrop-blur-xl">
      <div className="flex min-h-20 flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-8">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuOpen}
            aria-label="فتح القائمة"
          >
            <Menu className="size-5" />
          </Button>
          <img
            src="/IMG_3331.png"
            alt="شعار منصة الذات"
            className="hidden size-12 object-contain sm:block"
          />
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
  );
}

// Sidebar Overlay Component
interface SidebarOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

function SidebarOverlay({ isOpen, onClose }: SidebarOverlayProps) {
  if (!isOpen) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      aria-label="إغلاق القائمة"
      className="fixed inset-0 z-30 h-auto w-auto rounded-none bg-foreground/40 p-0 hover:bg-foreground/40 lg:hidden"
      onClick={onClose}
    />
  );
}

// Main Layout Component
export function AppLayout({ children }: { children: ReactNode }) {
  const { data: school } = useSchool();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(
    new Set(["students", "plans"])
  );
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { setTheme } = useTheme();

  // Apply theme from school settings
  useEffect(() => {
    if (school?.theme && isAppTheme(school.theme)) {
      setTheme(school.theme);
    }
  }, [school?.theme, setTheme]);

  // Manage body overflow when sidebar is open on mobile
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Toggle expanded nav item
  const toggleExpanded = useCallback((id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Close sidebar on navigation
  const handleNavigate = useCallback(() => {
    setOpen(false);
  }, []);

  // Sign out handler
  const handleSignOut = useCallback(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }, [queryClient, navigate]);

  const asideClassName = cn(
    "no-print fixed inset-y-0 right-0 z-40 flex w-72 shrink-0 flex-col overflow-y-auto border-l border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm transition-transform lg:static",
    open ? "translate-x-0" : "translate-x-full lg:translate-x-0"
  );

  return (
    <div className="app-shell flex min-h-screen bg-background">
      <aside className={asideClassName}>
        <SidebarHeader />
        <SidebarNav
          pathname={pathname}
          expandedItems={expandedItems}
          onToggleExpand={toggleExpanded}
          onNavigate={handleNavigate}
        />
        <SidebarFooter onSignOut={handleSignOut} />
      </aside>

      <SidebarOverlay isOpen={open} onClose={() => setOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader school={school} onMenuOpen={() => setOpen(true)} />
        <main className="min-w-0 flex-1 p-4 lg:p-8">{children}</main>
        <footer className="no-print border-t px-4 py-4">
          <Copyright />
        </footer>
      </div>
    </div>
  );
}
