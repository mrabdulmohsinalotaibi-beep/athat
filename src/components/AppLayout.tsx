import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Bell,
  Check,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Plus,
  Palette,
  BarChart3,
  Users,
  FileText,
  UserRound,
} from "lucide-react";
import { WORKSPACE_SECTIONS } from "@/lib/workspace-sections";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/lib/school";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Copyright } from "@/components/Copyright";
import { GlobalSearch } from "@/components/GlobalSearch";
import { QuickActionLauncher } from "@/components/QuickActionLauncher";
import { BrandLogo } from "@/components/BrandLogo";
import { canOpenWorkspacePath, filterWorkspaceSections, isGuidanceWorkspaceMember } from "@/lib/school-access";

function isPathActive(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(route + "/");
}

function AlertLink({
  to,
  label,
  count,
  close,
}: {
  to: string;
  label: string;
  count: number;
  close: () => void;
}) {
  return (
    <a
      href={to}
      onClick={close}
      className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2 transition hover:border-primary/35 hover:bg-primary/[0.04]"
    >
      <span className="font-bold">{label}</span>
      <span className="min-w-6 rounded-full bg-primary/10 px-1.5 py-0.5 text-center text-[10px] font-black text-primary">{count}</span>
    </a>
  );
}


const bottomNavigation = [
  { to: "/dashboard" as const, label: "الرئيسية", icon: LayoutDashboard, activeRoutes: ["/dashboard"] },
  { to: "/students" as const, label: "السجلات", icon: Users, activeRoutes: ["/students", "/cases", "/interviews", "/referrals", "/attendance", "/behavior"] },
  { to: "/messages" as const, label: "الرسائل", icon: MessageSquareText, activeRoutes: ["/messages", "/outgoing-messages", "/inbox", "/school-inbox"] },
  { to: "/reports", label: "التقارير", icon: BarChart3, activeRoutes: ["/reports", "/free-documents"] },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const { data: school } = useSchool();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [uiTheme, setUiTheme] = useState("green");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: accessContext } = useQuery({
    queryKey: ["school-access-context"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_my_school_context");
      if (error) throw error;
      return data ?? { membership: null, school: null, members: [] };
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
  const accessMembership = accessContext?.membership ?? null;
  const accessRole = String(accessMembership?.role ?? "");
  const guidanceNavigationAllowed = !accessMembership || isGuidanceWorkspaceMember(accessMembership);
  const baseVisibleSections = filterWorkspaceSections(WORKSPACE_SECTIONS, accessMembership);
  useEffect(() => {
    if (!accessMembership) return;
    if (canOpenWorkspacePath(pathname, accessMembership)) return;

    // UI navigation is filtered already, but this also blocks direct URL entry
    // for school members whose role/permissions do not allow the page.
    toast.error("ليس لديك صلاحية لفتح هذه الصفحة.");
    void navigate({ to: "/dashboard", replace: true });
  }, [
    pathname,
    accessMembership?.id,
    accessMembership?.member_status,
    accessMembership?.access_expired,
    accessMembership?.role,
    accessMembership?.permissions,
    accessMembership?.group_permissions,
  ]);

  const visibleSections = baseVisibleSections.map((section) => {
    if (section.id === "students") {
      const title = accessRole === "student" ? "ملفي" : accessRole === "parent" ? "أبنائي" : accessRole === "teacher" ? "طلابي" : section.title;
      const description =
        accessRole === "student"
          ? "بياناتك الطلابية والمستندات المرتبطة بملفك فقط."
          : accessRole === "parent"
            ? "ملفات الأبناء المرتبطين بحساب ولي الأمر فقط."
            : accessRole === "teacher"
              ? "الطلاب المسندون لك حسب نطاق الصلاحية."
              : section.description;
      return {
        ...section,
        title,
        description,
        items: section.items.map((item) =>
          item.to === "/students"
            ? {
                ...item,
                label:
                  accessRole === "student"
                    ? "ملفي الطلابي"
                    : accessRole === "parent"
                      ? "ملفات أبنائي"
                      : accessRole === "teacher"
                        ? "طلابي"
                        : item.label,
              }
            : item,
        ),
      };
    }
    if (section.id === "guidance" && accessRole === "teacher") {
      return {
        ...section,
        title: "الإحالات والمتابعة",
        description: "الإحالات التي يسمح لك دورك بإنشائها أو متابعتها.",
        items: section.items.map((item) =>
          item.to === "/referrals" ? { ...item, label: "إحالات طلابي" } : item,
        ),
      };
    }
    return section;
  });
  const guidanceHubNavigation = { to: "/guidance-work" as const, label: "أعمال التوجيه", icon: ClipboardList, activeRoutes: ["/guidance-work"] };
  const restrictedBottomNavigation = [
    { to: "/dashboard" as const, label: "اليوم", icon: LayoutDashboard, activeRoutes: ["/dashboard"] },
    { to: "/school-tasks" as const, label: "مهامي", icon: ClipboardList, activeRoutes: ["/school-tasks"] },
    { to: "/inbox", label: "الوارد", icon: FileText, activeRoutes: ["/inbox", "/school-inbox"] },
    { to: "/profile" as const, label: "المزيد", icon: UserRound, activeRoutes: ["/profile", "/school-team", "/settings", "/health"] },
  ] as const;
  const roleBottomNavigation =
    accessRole === "student"
      ? [
          { to: "/dashboard" as const, label: "الرئيسية", icon: LayoutDashboard, activeRoutes: ["/dashboard"] },
          { to: "/students" as const, label: "ملفي", icon: UserRound, activeRoutes: ["/students"] },
          { to: "/messages" as const, label: "الرسائل", icon: MessageSquareText, activeRoutes: ["/messages", "/inbox"] },
          { to: "/free-documents" as const, label: "مستنداتي", icon: FileText, activeRoutes: ["/free-documents"] },
          { to: "/profile" as const, label: "حسابي", icon: UserRound, activeRoutes: ["/profile"] },
        ]
      : accessRole === "parent"
        ? [
            { to: "/dashboard" as const, label: "الرئيسية", icon: LayoutDashboard, activeRoutes: ["/dashboard"] },
            { to: "/students" as const, label: "أبنائي", icon: Users, activeRoutes: ["/students"] },
            { to: "/messages" as const, label: "الرسائل", icon: MessageSquareText, activeRoutes: ["/messages", "/inbox"] },
            { to: "/free-documents" as const, label: "المستندات", icon: FileText, activeRoutes: ["/free-documents"] },
            { to: "/profile" as const, label: "حسابي", icon: UserRound, activeRoutes: ["/profile"] },
          ]
        : accessRole === "teacher"
          ? [
              { to: "/dashboard" as const, label: "الرئيسية", icon: LayoutDashboard, activeRoutes: ["/dashboard"] },
              { to: "/students" as const, label: "طلابي", icon: Users, activeRoutes: ["/students"] },
              { to: "/referrals" as const, label: "الإحالات", icon: ClipboardList, activeRoutes: ["/referrals"] },
              { to: "/school-tasks" as const, label: "مهامي", icon: ClipboardList, activeRoutes: ["/school-tasks"] },
              { to: "/profile" as const, label: "حسابي", icon: UserRound, activeRoutes: ["/profile"] },
            ]
          : null;

  const visibleBottomNavigation = roleBottomNavigation
    ? roleBottomNavigation.filter((item) =>
        item.activeRoutes.some((route) => canOpenWorkspacePath(route, accessMembership)),
      )
    : guidanceNavigationAllowed
      ? bottomNavigation
      : bottomNavigation.filter((item) =>
          item.activeRoutes.some((route) => canOpenWorkspacePath(route, accessMembership)),
        ).length >= 3
        ? bottomNavigation.filter((item) =>
            item.activeRoutes.some((route) => canOpenWorkspacePath(route, accessMembership)),
          )
        : restrictedBottomNavigation;
  const workspaceSchool = accessContext?.school ?? null;
  const currentWorkspaceMember = (accessContext?.members ?? []).find(
    (member: any) => member.id === accessMembership?.id,
  );
  const roleLabel =
    ({
      principal: "مدير المدرسة",
      student_affairs_vice: "وكيل شؤون الطلاب",
      academic_vice: "وكيل الشؤون التعليمية",
      vice_principal: "وكيل المدرسة",
      counselor: "الموجه الطلابي",
      teacher: "المعلم",
      activity_leader: "رائد النشاط",
      health_guide: "الموجه الصحي",
      registrar: "الإداري / مسجل المعلومات",
      admin_staff: "الموظف الإداري",
      guard: "حارس المدرسة",
      observer: "اطلاع فقط",
      student: "طالب",
      parent: "ولي أمر",
      custom: "دور مخصص",
    } as Record<string, string>)[String(accessMembership?.role ?? "")] ?? "عضو المدرسة";

  const { data: alertSummary } = useQuery({
    queryKey: ["app-alert-summary"],
    queryFn: async () => {
      const day = new Date().toISOString().slice(0, 10);
      const { data: context, error: contextError } = await (supabase as any).rpc("get_my_school_context");
      if (contextError) console.warn("[alerts] school context:", contextError.message);

      const memberId = String(context?.membership?.id ?? "");
      const isSchoolAdmin = Boolean(context?.membership?.is_admin);
      const pendingMembers = isSchoolAdmin
        ? (context?.members ?? []).filter((member: any) => member.member_status === "pending").length
        : 0;

      const guidanceAlertsAllowed = !context?.membership || isGuidanceWorkspaceMember(context.membership);
      const [cases, tasks, schoolTasks, handoffs, publicRequests, feedback, interviews, behavior, attendance, guidanceRequests, guidanceNotifications] = await Promise.all([
        supabase.from("counseling_cases").select("id,case_status,followup_at"),
        supabase.from("plan_tasks").select("id,exec_status,due_date,doc_status"),
        (supabase as any).from("school_tasks").select("id,status,due_date,creator_member_id,assignee_member_id"),
        (supabase as any).from("school_report_handoffs").select("id,status,recipient_member_id,sender_member_id"),
        guidanceAlertsAllowed
          ? supabase.from("public_requests").select("id,status,kind")
          : Promise.resolve({ data: [], error: null }),
        guidanceAlertsAllowed
          ? supabase.from("feedback_messages").select("id,status,category").in("category", ["استشارة فردية", "إحالة طالب", "إبلاغ سري"])
          : Promise.resolve({ data: [], error: null }),
        guidanceAlertsAllowed ? supabase.from("interviews").select("id,followup_at") : Promise.resolve({ data: [], error: null }),
        guidanceAlertsAllowed ? supabase.from("behavior").select("id,result,followup_at") : Promise.resolve({ data: [], error: null }),
        guidanceAlertsAllowed ? supabase.from("attendance").select("id,student_id,student_no,student_name,case_type,count_days") : Promise.resolve({ data: [], error: null }),
        (supabase as any).from("guidance_requests").select("id,status,submitted_by,updated_at"),
        (supabase as any).rpc("get_my_guidance_notifications", { p_limit: 100 }),
      ]);

      // Alerts are supplementary UI. A missing/temporarily unavailable table
      // must never prevent the rest of the application from opening.
      if (cases.error) console.warn("[alerts] counseling_cases:", cases.error.message);
      if (tasks.error) console.warn("[alerts] plan_tasks:", tasks.error.message);
      if (schoolTasks.error) console.warn("[alerts] school_tasks:", schoolTasks.error.message);
      if (handoffs.error) console.warn("[alerts] school_report_handoffs:", handoffs.error.message);
      if (publicRequests.error) console.warn("[alerts] public_requests:", publicRequests.error.message);
      if (feedback.error) console.warn("[alerts] feedback_messages:", feedback.error.message);
      if (interviews.error) console.warn("[alerts] interviews:", interviews.error.message);
      if (behavior.error) console.warn("[alerts] behavior:", behavior.error.message);
      if (attendance.error) console.warn("[alerts] attendance:", attendance.error.message);
      if (guidanceRequests.error) console.warn("[alerts] guidance_requests:", guidanceRequests.error.message);

      const dueCases = (cases.error ? [] : cases.data ?? []).filter(
        (item) => item.case_status !== "مغلقة" && item.followup_at && String(item.followup_at).slice(0, 10) <= day,
      ).length;
      const attentionPlan = (tasks.error ? [] : tasks.data ?? []).filter(
        (item) =>
          (item.due_date && String(item.due_date).slice(0, 10) < day && item.exec_status !== "مكتمل") ||
          item.doc_status === "ناقص",
      ).length;
      const visibleSchoolTasks = schoolTasks.error ? [] : schoolTasks.data ?? [];
      const dueSchoolTasks = visibleSchoolTasks.filter(
        (item: any) =>
          item.assignee_member_id === memberId &&
          item.due_date &&
          String(item.due_date).slice(0, 10) <= day &&
          !["مكتملة", "معتمدة", "ملغاة"].includes(String(item.status ?? "")),
      ).length;
      const approvals = visibleSchoolTasks.filter(
        (item: any) =>
          item.status === "مكتملة" &&
          (item.creator_member_id === memberId || isSchoolAdmin),
      ).length;
      const unreadReports = (handoffs.error ? [] : handoffs.data ?? []).filter(
        (item: any) =>
          (item.recipient_member_id === memberId && item.status === "sent") ||
          (item.sender_member_id === memberId && item.status === "returned"),
      ).length;

      const inboundRequests = (publicRequests.error ? [] : publicRequests.data ?? []).filter(
        (item: any) => !["مغلق"].includes(String(item.status ?? "")),
      ).length;
      const inboundFeedback = (feedback.error ? [] : feedback.data ?? []).filter(
        (item: any) => !["تم الرد", "محفوظ"].includes(String(item.status ?? "")),
      ).length;
      const guidanceRows = guidanceRequests.error ? [] : guidanceRequests.data ?? [];
      const memberGuidanceRequests = guidanceRows.filter((item: any) => item.submitted_by === context?.membership?.user_id && ["reviewed","in_progress","completed","rejected"].includes(String(item.status ?? ""))).length;
      const staffGuidanceInbox = guidanceAlertsAllowed ? guidanceRows.filter((item: any) => ["submitted","reviewed","in_progress"].includes(String(item.status ?? ""))).length : 0;
      const unreadApprovalNotifications = (guidanceNotifications?.data ?? []).filter((item: any) => !item.is_read).length;
      const guidanceInbox = inboundRequests + inboundFeedback + staffGuidanceInbox + memberGuidanceRequests;
      const dueInterviews = (interviews.error ? [] : interviews.data ?? []).filter(
        (item: any) => item.followup_at && String(item.followup_at).slice(0, 10) <= day,
      ).length;
      const dueBehavior = (behavior.error ? [] : behavior.data ?? []).filter(
        (item: any) =>
          ["تحتاج متابعة", "تحسن جزئي"].includes(String(item.result ?? "")) &&
          item.followup_at &&
          String(item.followup_at).slice(0, 10) <= day,
      ).length;
      const attendanceGrouped = new Map<string, number>();
      (attendance.error ? [] : attendance.data ?? []).forEach((item: any) => {
        if (!["غياب", "تأخر", "هروب"].includes(String(item.case_type ?? ""))) return;
        const key = String(item.student_id || item.student_no || item.student_name || "").trim();
        if (!key) return;
        attendanceGrouped.set(key, (attendanceGrouped.get(key) ?? 0) + Math.max(1, Number(item.count_days) || 1));
      });
      const repeatedAttendance = Array.from(attendanceGrouped.values()).filter((count) => count >= 3).length;

      const total = dueCases + dueInterviews + dueBehavior + repeatedAttendance + attentionPlan + dueSchoolTasks + approvals + unreadReports + pendingMembers + guidanceInbox + unreadApprovalNotifications;
      return { total, dueCases, dueInterviews, dueBehavior, repeatedAttendance, attentionPlan, dueSchoolTasks, approvals, unreadReports, pendingMembers, guidanceInbox, unreadApprovalNotifications };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const alertCount = alertSummary?.total ?? 0;

  useEffect(() => {
    if (!guidanceNavigationAllowed) return;
    const channel = supabase
      .channel("athat-live-alerts")
      .on("postgres_changes", { event: "*", schema: "public", table: "public_requests" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["app-alert-summary"] });
        void queryClient.invalidateQueries({ queryKey: ["dashboard-live-v2"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "feedback_messages" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["app-alert-summary"] });
        void queryClient.invalidateQueries({ queryKey: ["dashboard-live-v2"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "counseling_cases" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["app-alert-summary"] });
        void queryClient.invalidateQueries({ queryKey: ["dashboard-live-v2"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "interviews" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["app-alert-summary"] });
        void queryClient.invalidateQueries({ queryKey: ["dashboard-live-v2"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "behavior" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["app-alert-summary"] });
        void queryClient.invalidateQueries({ queryKey: ["dashboard-live-v2"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "guidance_requests" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["app-alert-summary"] });
        void queryClient.invalidateQueries({ queryKey: ["guidance-requests"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["app-alert-summary"] });
        void queryClient.invalidateQueries({ queryKey: ["dashboard-live-v2"] });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [guidanceNavigationAllowed, queryClient]);

  useEffect(() => {
    const channel = supabase
      .channel("athat-live-school-alerts")
      .on("postgres_changes", { event: "*", schema: "public", table: "school_tasks" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["app-alert-summary"] });
        void queryClient.invalidateQueries({ queryKey: ["dashboard-live-v2"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "school_report_handoffs" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["app-alert-summary"] });
        void queryClient.invalidateQueries({ queryKey: ["dashboard-live-v2"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "plan_tasks" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["app-alert-summary"] });
        void queryClient.invalidateQueries({ queryKey: ["dashboard-live-v2"] });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const currentSection = visibleSections.find((section) =>
    section.items.some((item) => isPathActive(pathname, item.to)),
  );
  const pageTitle =
    pathname === "/dashboard"
      ? "الرئيسية"
      : pathname.startsWith("/profile")
        ? "حسابي"
        : currentSection?.items.find((item) => isPathActive(pathname, item.to))?.label ?? "الذات";

  useEffect(() => {
    const allowed = new Set(["green", "gold", "blue", "burgundy"]);
    const apply = (value?: string | null) => {
      const next = value && allowed.has(value) ? value : "green";
      document.documentElement.dataset['theme'] = next;
      localStorage.setItem("athat-ui-theme", next);
      setUiTheme(next);
    };
    apply(localStorage.getItem("athat-ui-theme"));
    void supabase.auth.getUser().then(({ data }) => apply(String(data.user?.user_metadata?.['ui_theme'] ?? localStorage.getItem("athat-ui-theme") ?? "green")));
    const onTheme = (event: Event) => apply((event as CustomEvent<string>).detail);
    window.addEventListener("athat-theme-change", onTheme);
    return () => window.removeEventListener("athat-theme-change", onTheme);
  }, []);

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

  async function selectUiTheme(next: "green" | "gold" | "blue" | "burgundy") {
    document.documentElement.dataset['theme'] = next;
    localStorage.setItem("athat-ui-theme", next);
    setUiTheme(next);
    window.dispatchEvent(new CustomEvent("athat-theme-change", { detail: next }));
    const { error } = await supabase.auth.updateUser({ data: { ui_theme: next } });
    if (error) console.warn("[theme] could not sync account theme:", error.message);
  }

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
          "athat-sidebar fixed inset-y-0 right-0 z-40 flex w-[18.5rem] shrink-0 flex-col overflow-hidden border-l border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl transition-transform duration-300 xl:sticky xl:top-0 xl:h-screen xl:translate-x-0 xl:shadow-none",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="border-b border-sidebar-border/70 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
              <BrandLogo className="size-full" />
            </div>
            <div>
              <p className="text-sm font-black text-sidebar-foreground">الذات</p><p className="mt-0.5 text-[10px] font-bold text-[#D9C0A3]">منصة التوجيه الطلابي</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 min-h-0 space-y-1 overflow-y-auto p-3" aria-label="التنقل الرئيسي">
          <Link
            to="/dashboard"
            onClick={() => setOpen(false)}
            aria-current={pathname === "/dashboard" ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-2xl border-r-2 border-transparent px-3 py-2.5 text-sm transition hover:bg-sidebar-accent",
              pathname === "/dashboard" &&
                "border-sidebar-primary bg-sidebar-accent font-semibold text-sidebar-primary",
            )}
          >
            <LayoutDashboard className="size-4 shrink-0" aria-hidden="true" />
            <span>اليوم</span>
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
                      "flex w-full items-center gap-3 rounded-2xl border-r-2 border-transparent px-3 py-2.5 text-right text-sm transition hover:bg-sidebar-accent",
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
                            "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs text-sidebar-foreground/80 transition hover:bg-sidebar-accent hover:text-sidebar-foreground",
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
          <div className="mb-2">
            <button type="button" onClick={() => setThemeOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-sm font-bold text-sidebar-foreground/90 transition hover:bg-sidebar-accent"
              aria-expanded={themeOpen}>
              <span className="flex items-center gap-2"><Palette className="size-4" /> لون الواجهة</span>
              <span className="flex gap-1.5" aria-hidden="true">
                {[
                  ["green","#89AA74"],["gold","#E5BD4E"],["blue","#6FA6C9"],["burgundy","#B87582"]
                ].map(([id,color]) => <span key={id} className={cn("size-3 rounded-full ring-2 ring-offset-1 ring-offset-sidebar", uiTheme === id ? "ring-sidebar-primary" : "ring-transparent")} style={{backgroundColor:color}} />)}
              </span>
            </button>
            {themeOpen && (
              <div className="mt-2 grid grid-cols-4 gap-2 rounded-2xl border border-sidebar-border bg-sidebar-accent/45 p-2.5">
                {[
                  ["green","أخضر","#89AA74"],
                  ["gold","ذهبي","#E5BD4E"],
                  ["blue","أزرق","#6FA6C9"],
                  ["burgundy","عنابي","#B87582"],
                ].map(([id,label,color]) => (
                  <button key={id} type="button" title={label}
                    onClick={() => void selectUiTheme(id as "green" | "gold" | "blue" | "burgundy")}
                    className={cn("flex flex-col items-center gap-1.5 rounded-xl p-1.5 text-[9px] font-bold transition hover:bg-sidebar-accent", uiTheme === id && "bg-sidebar-accent text-sidebar-primary")}>
                    <span className={cn("grid size-8 place-items-center rounded-full border-2 shadow-sm", uiTheme === id ? "border-sidebar-primary" : "border-white/70")} style={{backgroundColor:color}}>
                      {uiTheme === id && <Check className="size-4 text-white drop-shadow" />}
                    </span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
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
      <div className="flex min-w-0 flex-1 flex-col pb-20 xl:pb-0">
        <header className="athat-topbar sticky top-0 z-20 border-b bg-card/95 text-foreground backdrop-blur-xl">
          <div className="mx-auto flex min-h-[4.35rem] w-full max-w-3xl xl:max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:px-5 xl:px-8">
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
              <Button
                variant="ghost"
                size="icon"
                aria-label="فتح القائمة الجانبية"
                onClick={() => setOpen(true)}
                className="shrink-0 rounded-xl text-foreground hover:bg-muted xl:hidden"
              >
                <Menu className="size-5" />
              </Button>

              <Link to="/dashboard" aria-label="الرئيسية" className="athat-topbar-logo relative shrink-0 overflow-hidden rounded-xl border border-border bg-background xl:hidden">
                <BrandLogo className="size-10" />
              </Link>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h1 className="truncate text-base font-black tracking-tight text-navy sm:text-lg">
                    {pageTitle}
                  </h1>
                  
                </div>
                <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground sm:text-xs">
                  {workspaceSchool?.name || school?.school_name || "اسم المدرسة غير محدد"}
                </p>
                <div className="mt-1.5 hidden flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground xl:flex">
                  <span>{guidanceNavigationAllowed ? "الموجه الطلابي" : roleLabel}: <b className="font-bold text-foreground">{currentWorkspaceMember?.display_name || school?.counselor_name || "—"}</b></span>
                  <span className="text-border">•</span>
                  <span>{school?.academic_year || "العام الدراسي"}</span>
                  <span className="text-border">•</span>
                  <span>{school?.semester || "الفصل الدراسي"}</span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <QuickActionLauncher
                guidanceAllowed={guidanceNavigationAllowed}
                className="hidden rounded-xl xl:inline-flex"
              />
              {guidanceNavigationAllowed && <div className="hidden xl:block"><GlobalSearch /></div>}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="التنبيهات"
                  onClick={() => setAlertsOpen((value) => !value)}
                  className="relative rounded-xl text-foreground hover:bg-muted"
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
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-black">مركز التنبيهات</p>
                      {alertCount > 0 && <span className="rounded-full bg-destructive/10 px-2 py-1 text-[10px] font-black text-destructive">{alertCount} إجراء</span>}
                    </div>
                    {alertCount ? (
                      <div className="mt-3 space-y-1.5 text-xs">
                        {(alertSummary?.dueCases ?? 0) > 0 && <AlertLink to="/cases" label="متابعات حالات مستحقة" count={alertSummary?.dueCases ?? 0} close={() => setAlertsOpen(false)} />}
                        {(alertSummary?.dueInterviews ?? 0) > 0 && <AlertLink to="/interviews" label="متابعات مقابلات مستحقة" count={alertSummary?.dueInterviews ?? 0} close={() => setAlertsOpen(false)} />}
                        {(alertSummary?.dueBehavior ?? 0) > 0 && <AlertLink to="/behavior" label="متابعات سلوكية مستحقة" count={alertSummary?.dueBehavior ?? 0} close={() => setAlertsOpen(false)} />}
                        {(alertSummary?.repeatedAttendance ?? 0) > 0 && <AlertLink to="/attendance" label="طلاب يحتاجون متابعة مواظبة" count={alertSummary?.repeatedAttendance ?? 0} close={() => setAlertsOpen(false)} />}
                        {(alertSummary?.attentionPlan ?? 0) > 0 && <AlertLink to="/plan" label="مهام خطة تحتاج إجراء" count={alertSummary?.attentionPlan ?? 0} close={() => setAlertsOpen(false)} />}
                        {(alertSummary?.dueSchoolTasks ?? 0) > 0 && <AlertLink to="/school-tasks" label="مهام مدرسية مسندة لك" count={alertSummary?.dueSchoolTasks ?? 0} close={() => setAlertsOpen(false)} />}
                        {(alertSummary?.approvals ?? 0) > 0 && <AlertLink to="/school-tasks" label="إنجازات تنتظر اعتمادك" count={alertSummary?.approvals ?? 0} close={() => setAlertsOpen(false)} />}
                        {(alertSummary?.unreadApprovalNotifications ?? 0) > 0 && <AlertLink to="/guidance-approvals" label="تحديثات واعتمادات أعمال التوجيه" count={alertSummary?.unreadApprovalNotifications ?? 0} close={() => setAlertsOpen(false)} />}
                        {(alertSummary?.guidanceInbox ?? 0) > 0 && <AlertLink to="/guidance-requests" label="طلبات وتحديثات التوجيه الطلابي" count={alertSummary?.guidanceInbox ?? 0} close={() => setAlertsOpen(false)} />}
                        {(alertSummary?.unreadReports ?? 0) > 0 && <AlertLink to="/school-inbox" label="تقارير إدارية غير مقروءة" count={alertSummary?.unreadReports ?? 0} close={() => setAlertsOpen(false)} />}
                        {(alertSummary?.pendingMembers ?? 0) > 0 && <AlertLink to="/school-team" label="طلبات انضمام للفريق" count={alertSummary?.pendingMembers ?? 0} close={() => setAlertsOpen(false)} />}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">لا توجد عناصر تحتاج إجراء حاليًا.</p>
                    )}
                    <Button asChild size="sm" variant="outline" className="mt-3 w-full" onClick={() => setAlertsOpen(false)}>
                      <Link to="/dashboard">فتح لوحة العمل</Link>
                    </Button>
                  </div>
                )}
              </div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-10 gap-2 rounded-xl"
              >
                <Link to="/profile" title="حسابي الشخصي">
                  <UserRound className="size-4 shrink-0" />
                  <span className="hidden sm:inline">حسابي</span>
                </Link>
              </Button>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full min-w-0 max-w-3xl xl:max-w-7xl flex-1 px-3 pb-28 pt-3 sm:px-5 sm:pb-28 sm:pt-5 xl:p-8">
          {currentSection && pathname !== "/dashboard" && (
            <nav
              className="sticky top-16 z-10 mb-4 -mx-3 -mt-3 border-b bg-card/90 px-3 py-2 backdrop-blur-xl xl:hidden"
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
                        "flex min-h-10 shrink-0 items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-[11px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        isActive ? "border-primary/30 bg-secondary text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted",
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
          className="athat-mobile-nav fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 items-center border-t border-border bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl xl:hidden"
          aria-label="التنقل الرئيسي"
        >
          {visibleBottomNavigation.slice(0, 5).map((item, index) => {
            const Icon = item.icon;
            const isActive = item.activeRoutes.some((route) => isPathActive(pathname, route));
            return [
              index === 2 && (
                <div key="new" className="flex min-w-0 items-center justify-center">
                  {guidanceNavigationAllowed ? (
                    <QuickActionLauncher guidanceAllowed mobile className="w-full" />
                  ) : (
                    <Button asChild variant="ghost" className="flex h-auto min-h-[4.15rem] w-full flex-col gap-1 p-0 text-[10px] text-primary">
                      <Link to="/school-tasks"><Plus className="size-5" />جديد</Link>
                    </Button>
                  )}
                </div>
              ),
              <Link
                key={item.to}
                to={item.to}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "athat-bottom-item flex min-h-[4.15rem] min-w-0 flex-col items-center justify-center gap-1 px-0.5 text-center text-[10px] font-bold leading-3 transition",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className={cn("grid size-8 place-items-center rounded-xl transition", isActive && "bg-secondary text-primary")}>
                  <Icon className="size-4.5" aria-hidden="true" />
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            ];
          })}
        </nav>

        <footer className="hidden border-t px-4 py-4 xl:block">
          <Copyright />
        </footer>
      </div>
    </div>
  );
}
