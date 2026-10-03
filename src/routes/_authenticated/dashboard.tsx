import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  BellRing,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  FolderCheck,
  HeartHandshake,
  Inbox,
  MessageSquareText,
  Sparkles,
  Users,
  PlusCircle,
  UploadCloud,
  Bot,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/lib/school";
import { formatHijriDate } from "@/lib/date";
import { QuickActionLauncher } from "@/components/QuickActionLauncher";
import { Button } from "@/components/ui/button";
import { AiCounselorAssistant } from "@/components/AiCounselorAssistant";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم | الذات" },
      { name: "description", content: "لوحة قيادة مصغرة وتفاعلية لأعمال الموجه الطلابي." },
      { property: "og:title", content: "لوحة العمل اليومية | الذات" },
      { property: "og:description", content: "مساحة الموجه الطلابي اليومية للحالات والمهام والمقابلات والبرامج." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const today = () => new Date().toISOString().slice(0, 10);

async function withDashboardTimeout<T>(request: PromiseLike<T>, label: string): Promise<T> {
  return await Promise.race([
    Promise.resolve(request),
    new Promise<never>((_, reject) =>
      window.setTimeout(
        () => reject(new Error(`تأخر تحميل ${label} من قاعدة البيانات`)),
        9_000,
      ),
    ),
  ]);
}

function useDashboard() {
  return useQuery({
    queryKey: ["dashboard-live-v2"],
    queryFn: async () => {
      let schoolContext: any = null;
      try {
        const contextResult: any = await withDashboardTimeout((supabase as any).rpc("get_my_school_context"), "schoolContext");
        if (contextResult.error) {
          console.warn("[dashboard] تعذّر تحميل schoolContext:", contextResult.error.message);
        } else {
          schoolContext = contextResult.data;
        }
      } catch (error) {
        console.warn("[dashboard] تعذّر تحميل schoolContext:", error);
      }

      const requests = [
        ["students", supabase.from("students").select("id", { count: "exact", head: true })],
        ["cases", supabase
          .from("counseling_cases")
          .select("id,case_status,followup_at,student_name,student_id,student_no,next_action")],
        ["programs", supabase.from("programs").select("id,name,exec_status,plan_task_id")],
        ["calendar", supabase.from("calendar_events").select("id,edate,etime,title,etype,status")],
        ["planTasks", supabase.from("plan_tasks").select("id,task,exec_status,due_date,doc_status")],
        ["interviews", supabase.from("interviews").select("id,student_name,topic,followup_at")],
        ["evidences", supabase.from("evidences").select("id,name,linked_ref,linked_type,doc_status")],
        ["publicRequests", supabase.from("public_requests").select("id,status,kind,created_at")],
        ["feedback", supabase
          .from("feedback_messages")
          .select("id,status,category,created_at")
          .in("category", ["استشارة فردية", "إحالة طالب", "إبلاغ سري"])],
        ["posts", supabase.from("posts").select("id,is_public,kind")],
        ["schoolTasks", (supabase as any).from("school_tasks").select("id,title,status,due_date,priority,creator_member_id,assignee_member_id")],
        ["schoolHandoffs", (supabase as any).from("school_report_handoffs").select("id,status,recipient_member_id,sender_member_id,title,sent_at")],
        ["auditLog", (supabase as any).from("audit_log").select("id,action,table_name,record_id,new_data,old_data,changed_at").order("changed_at", { ascending: false }).limit(8)],
      ] as const;

      const settled = await Promise.all(
        requests.map(async ([label, request]) => {
          try {
            const result = await withDashboardTimeout(request, label);
            return [label, result] as const;
          } catch (error) {
            return [
              label,
              {
                data: null,
                error: error instanceof Error ? error : new Error(String(error)),
              },
            ] as const;
          }
        }),
      );

      type DashboardResult = {
        data: any[] | null;
        count?: number | null;
        error: { message?: string } | Error | null;
      };
      const resultMap = Object.fromEntries(settled) as Record<string, DashboardResult>;
      const missing = (name: string): DashboardResult => ({
        data: null,
        count: 0,
        error: new Error(`لم تصل نتيجة ${name}`),
      });
      const pick = (name: string) => resultMap[name] ?? missing(name);

      const students = pick("students");
      const cases = pick("cases");
      const programs = pick("programs");
      const calendar = pick("calendar");
      const planTasks = pick("planTasks");
      const interviews = pick("interviews");
      const evidences = pick("evidences");
      const publicRequests = pick("publicRequests");
      const feedback = pick("feedback");
      const posts = pick("posts");
      const schoolTasks = pick("schoolTasks");
      const schoolHandoffs = pick("schoolHandoffs");
      const auditLog = pick("auditLog");

      const sources = {
        students,
        cases,
        programs,
        calendar,
        planTasks,
        interviews,
        evidences,
        publicRequests,
        feedback,
        posts,
        schoolTasks,
        schoolHandoffs,
        auditLog,
      };

      const failedSources = Object.entries(sources)
        .filter(([, result]) => Boolean(result.error))
        .map(([name, result]) => {
          console.warn(`[dashboard] تعذّر تحميل ${name}:`, result.error?.message);
          return name;
        });

      return {
        studentsCount: students.error ? 0 : students.count ?? 0,
        cases: cases.error ? [] : cases.data ?? [],
        programs: programs.error ? [] : programs.data ?? [],
        calendar: calendar.error ? [] : calendar.data ?? [],
        planTasks: planTasks.error ? [] : planTasks.data ?? [],
        interviews: interviews.error ? [] : interviews.data ?? [],
        evidences: evidences.error ? [] : evidences.data ?? [],
        publicRequests: publicRequests.error ? [] : publicRequests.data ?? [],
        feedback: feedback.error ? [] : feedback.data ?? [],
        posts: posts.error ? [] : posts.data ?? [],
        schoolTasks: schoolTasks.error ? [] : schoolTasks.data ?? [],
        schoolHandoffs: schoolHandoffs.error ? [] : schoolHandoffs.data ?? [],
        auditLog: auditLog.error ? [] : auditLog.data ?? [],
        schoolContext,
        failedSources,
      };
    },
    staleTime: 20_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

function Dashboard() {
  const { data: school } = useSchool();
  const { data, isLoading, isError, refetch, isFetching } = useDashboard();
  const day = today();

  const activeCases = (data?.cases ?? []).filter((item) => item.case_status !== "مغلقة");
  const overdueCases = activeCases.filter(
    (item) => item.followup_at && String(item.followup_at).slice(0, 10) <= day,
  );

  const planTasks = data?.planTasks ?? [];
  const planDone = planTasks.filter((item) => item.exec_status === "مكتمل").length;
  const planPercent = planTasks.length ? Math.round((planDone / planTasks.length) * 100) : 0;
  const latePlan = planTasks.filter(
    (item) =>
      item.due_date &&
      String(item.due_date).slice(0, 10) < day &&
      item.exec_status !== "مكتمل",
  );
  const missingDocumentation = planTasks.filter((item) => item.doc_status === "ناقص");

  const programs = data?.programs ?? [];
  const isProgramDone = (status: unknown) => ["منفذ", "مكتمل"].includes(String(status ?? ""));
  const donePrograms = programs.filter((item) => isProgramDone(item.exec_status));
  const evidenceRefs = new Set(
    (data?.evidences ?? [])
      .filter((item) => item.linked_type === "برنامج")
      .flatMap((item) => [String(item.linked_ref ?? "")]),
  );
  const programsMissingEvidence = donePrograms.filter(
    (program) =>
      !evidenceRefs.has(String(program.id)) &&
      !evidenceRefs.has(String(program.name ?? "")),
  );

  const programsByPlanTask = new Map<string, typeof programs>();
  programs.forEach((program) => {
    const taskId = String(program.plan_task_id ?? "");
    if (!taskId) return;
    programsByPlanTask.set(taskId, [...(programsByPlanTask.get(taskId) ?? []), program]);
  });
  const approvalReadyPlanTasks = planTasks.filter((task) => {
    if (task.exec_status === "مكتمل") return false;
    const taskPrograms = programsByPlanTask.get(String(task.id)) ?? [];
    if (!taskPrograms.length || !taskPrograms.every((program) => isProgramDone(program.exec_status))) {
      return false;
    }
    const programRefs = new Set(
      taskPrograms.flatMap((program) => [String(program.id), String(program.name ?? "")]).filter(Boolean),
    );
    return (data?.evidences ?? []).some((evidence) => {
      const ref = String(evidence.linked_ref ?? "");
      return (
        (evidence.linked_type === "مهمة" && ref === String(task.id)) ||
        (evidence.linked_type === "برنامج" && programRefs.has(ref))
      );
    });
  });

  const pendingEvidenceReviews = (data?.evidences ?? []).filter(
    (evidence) => !["معتمد", "ناقص"].includes(String(evidence.doc_status ?? "")),
  );
  const reportApprovalReadyPlanTasks = planTasks.filter((task) => {
    if (task.exec_status !== "مكتمل" || task.doc_status === "معتمد") return false;
    const taskPrograms = programsByPlanTask.get(String(task.id)) ?? [];
    if (!taskPrograms.length || !taskPrograms.every((program) => isProgramDone(program.exec_status))) {
      return false;
    }
    const programRefs = new Set(
      taskPrograms.flatMap((program) => [String(program.id), String(program.name ?? "")]).filter(Boolean),
    );
    return (data?.evidences ?? []).some((evidence) => {
      if (evidence.doc_status !== "معتمد") return false;
      const ref = String(evidence.linked_ref ?? "");
      return (
        (evidence.linked_type === "مهمة" && ref === String(task.id)) ||
        (evidence.linked_type === "برنامج" && programRefs.has(ref))
      );
    });
  });

  const primaryOpenRequests = (data?.publicRequests ?? []).filter(
    (item) => item.status !== "مغلق",
  );
  const feedbackOpenRequests = (data?.feedback ?? []).filter(
    (item) => !["تم الرد", "محفوظ"].includes(String(item.status ?? "")),
  );
  const openRequests = primaryOpenRequests.length + feedbackOpenRequests.length;

  const publishedPosts = (data?.posts ?? []).filter((item) => item.is_public).length;

  const schoolTasks = data?.schoolTasks ?? [];
  const schoolMembership = data?.schoolContext?.membership;
  const schoolMemberId = String(schoolMembership?.id ?? "");
  const schoolRole = String(schoolMembership?.role ?? "counselor");
  const isSchoolAdmin = Boolean(schoolMembership?.is_admin);
  const schoolRoleLabel =
    ({
      principal: "مدير المدرسة",
      vice_principal: "وكيل المدرسة",
      counselor: "الموجه الطلابي",
      teacher: "المعلم",
      admin_staff: "الموظف الإداري",
      guard: "حارس المدرسة",
      observer: "اطلاع فقط",
      student: "طالب",
      parent: "ولي أمر",
      custom: "دور مخصص",
    } as Record<string, string>)[schoolRole] ?? "عضو المدرسة";
  const isCounselorDashboard = schoolRole === "counselor";
  const isPrincipalDashboard = schoolRole === "principal";
  const isManagementDashboard = schoolRole === "principal" || schoolRole === "vice_principal";
  const isTeacherDashboard = schoolRole === "teacher";
  const isStudentDashboard = schoolRole === "student";
  const isParentDashboard = schoolRole === "parent";
  const isPersonalDashboard = isStudentDashboard || isParentDashboard;
  const activeSchoolMembers = (data?.schoolContext?.members ?? []).filter(
    (member: any) => member.member_status === "active",
  );
  const mySchoolTasks = schoolTasks.filter((item) => item.assignee_member_id === schoolMemberId);
  const openSchoolTasks = mySchoolTasks.filter((item) => !["مكتملة", "معتمدة", "ملغاة"].includes(String(item.status ?? "")));
  const dueSchoolTasks = openSchoolTasks.filter(
    (item) => item.due_date && String(item.due_date).slice(0, 10) <= day,
  );
  const pendingTaskApprovals = schoolTasks.filter(
    (item) =>
      item.status === "مكتملة" &&
      (item.creator_member_id === schoolMemberId || isSchoolAdmin),
  );
  const unreadAdministrativeReports = (data?.schoolHandoffs ?? []).filter(
    (item) =>
      (item.recipient_member_id === schoolMemberId && item.status === "sent") ||
      (item.sender_member_id === schoolMemberId && item.status === "returned"),
  );
  const pendingTeamMembers = isSchoolAdmin
    ? (data?.schoolContext?.members ?? []).filter((member: any) => member.member_status === "pending")
    : [];
  const completedMySchoolTasks = mySchoolTasks.filter((item) =>
    ["مكتملة", "معتمدة"].includes(String(item.status ?? "")),
  );
  const visibleManagementTasks = isPrincipalDashboard
    ? schoolTasks
    : schoolTasks.filter(
        (item) =>
          item.creator_member_id === schoolMemberId ||
          item.assignee_member_id === schoolMemberId,
      );
  const openManagementTasks = visibleManagementTasks.filter(
    (item) => !["معتمدة", "ملغاة"].includes(String(item.status ?? "")),
  );
  const dueManagementTasks = openManagementTasks.filter(
    (item) => item.due_date && String(item.due_date).slice(0, 10) <= day,
  );
  const roleDueSchoolTasks = isManagementDashboard ? dueManagementTasks : dueSchoolTasks;

  const recentWork = (data?.auditLog ?? [])
    .map((item: any) => {
      const payload = (item.new_data ?? item.old_data ?? {}) as Record<string, unknown>;
      const config = ({
        students: { label: "طالب", to: "/students" },
        counseling_cases: { label: "حالة طلابية", to: "/cases" },
        interviews: { label: "جلسة", to: "/interviews" },
        attendance: { label: "مواظبة", to: "/attendance" },
        behavior: { label: "سلوك", to: "/behavior" },
        referrals: { label: "إحالة", to: "/referrals" },
        plan_tasks: { label: "مهمة خطة", to: "/plan" },
        programs: { label: "برنامج", to: "/programs" },
        evidences: { label: "شاهد", to: "/evidences" },
        calendar_events: { label: "موعد", to: "/calendar" },
        reports: { label: "تقرير", to: "/reports" },
        posts: { label: "منشور", to: "/posts" },
      } as Record<string, { label: string; to: string }>)[String(item.table_name ?? "")];
      if (!config) return null;
      const title =
        payload["full_name"] ??
        payload["student_name"] ??
        payload["name"] ??
        payload["task"] ??
        payload["title"] ??
        payload["topic"] ??
        payload["summary"] ??
        config.label;
      return {
        id: String(item.id),
        label: config.label,
        to: config.to,
        title: String(title || config.label),
        action: String(item.action ?? ""),
        changedAt: String(item.changed_at ?? ""),
      };
    })
    .filter(Boolean)
    .slice(0, 5) as Array<{ id: string; label: string; to: string; title: string; action: string; changedAt: string }>;

  const todayAgenda = (data?.calendar ?? [])
    .filter(
      (item) =>
        String(item.edate ?? "").slice(0, 10) === day &&
        !["منفذ", "ملغي"].includes(String(item.status ?? "")),
    )
    .sort((a, b) => String(a.etime ?? "").localeCompare(String(b.etime ?? "")));

  const upcomingFollowups = (data?.interviews ?? [])
    .filter((item) => String(item.followup_at ?? "").slice(0, 10) >= day)
    .sort((a, b) => String(a.followup_at ?? "").localeCompare(String(b.followup_at ?? "")))
    .slice(0, 4);

  const roleSchoolAttentionCount =
    roleDueSchoolTasks.length +
    pendingTaskApprovals.length +
    unreadAdministrativeReports.length +
    pendingTeamMembers.length;
  const counselorAttentionCount =
    overdueCases.length +
    approvalReadyPlanTasks.length +
    pendingEvidenceReviews.length +
    reportApprovalReadyPlanTasks.length +
    latePlan.length +
    programsMissingEvidence.length +
    openRequests +
    roleSchoolAttentionCount;
  const attentionCount = isCounselorDashboard ? counselorAttentionCount : roleSchoolAttentionCount;

  const counselorStats = [
    {
      label: "الحالات",
      value: activeCases.length,
      note: overdueCases.length ? `${overdueCases.length} متابعة مستحقة` : "لا توجد متابعة متأخرة",
      to: "/cases" as const,
      icon: HeartHandshake,
    },
    {
      label: "البرامج والأنشطة", value: programs.length, note: `${donePrograms.length} منفذ`, to: "/programs" as const, icon: Sparkles,
    },
    {
      label: "المقابلات", value: data?.interviews.length ?? 0, note: `${upcomingFollowups.length} متابعة قريبة`, to: "/interviews" as const, icon: MessageSquareText,
    },
    {
      label: "المهام", value: planTasks.filter((item) => item.exec_status !== "مكتمل").length + openSchoolTasks.length, note: `${latePlan.length + dueSchoolTasks.length} مستحقة`, to: "/plan" as const, icon: ClipboardList,
    },
  ];

  const managementStats = [
    {
      label: "فريق المدرسة",
      value: activeSchoolMembers.length,
      note: pendingTeamMembers.length ? `${pendingTeamMembers.length} طلب انضمام` : "الأعضاء النشطون",
      to: "/school-team" as const,
      icon: Users,
    },
    {
      label: "المهام المفتوحة",
      value: openManagementTasks.length,
      note: isPrincipalDashboard ? "على مستوى المدرسة" : "ضمن نطاق عملك",
      to: "/school-tasks" as const,
      icon: ClipboardList,
    },
    {
      label: "تنتظر الاعتماد",
      value: pendingTaskApprovals.length,
      note: "إنجازات تحتاج مراجعة",
      to: "/school-tasks" as const,
      icon: CheckCircle2,
    },
    {
      label: "تقارير واردة",
      value: unreadAdministrativeReports.length,
      note: "وارد أو معاد بملاحظة",
      to: "/school-inbox" as const,
      icon: Inbox,
    },
  ];

  const staffStats = [
    {
      label: "مهامي المفتوحة",
      value: openSchoolTasks.length,
      note: dueSchoolTasks.length ? `${dueSchoolTasks.length} مستحقة الآن` : "لا توجد مهام مستحقة",
      to: "/school-tasks" as const,
      icon: ClipboardCheck,
    },
    {
      label: "المكتملة",
      value: completedMySchoolTasks.length,
      note: "مهام أنجزتها",
      to: "/school-tasks" as const,
      icon: CheckCircle2,
    },
    {
      label: "تقارير واردة",
      value: unreadAdministrativeReports.length,
      note: "وارد أو معاد بملاحظة",
      to: "/school-inbox" as const,
      icon: Inbox,
    },
    {
      label: "فريق المدرسة",
      value: activeSchoolMembers.length,
      note: schoolRoleLabel,
      to: "/school-team" as const,
      icon: Users,
    },
  ];

  const teacherStats = [
    {
      label: "طلابي",
      value: data?.studentsCount ?? 0,
      note: "حسب الصفوف والطلاب المسندين لك",
      to: "/students" as const,
      icon: Users,
    },
    {
      label: "مهامي المفتوحة",
      value: openSchoolTasks.length,
      note: dueSchoolTasks.length ? `${dueSchoolTasks.length} مستحقة الآن` : "لا توجد مهام مستحقة",
      to: "/school-tasks" as const,
      icon: ClipboardCheck,
    },
    {
      label: "الإحالات",
      value: "فتح",
      note: "إحالة طالب أو متابعة إحالة",
      to: "/referrals" as const,
      icon: HeartHandshake,
    },
    {
      label: "المراسلات",
      value: unreadAdministrativeReports.length,
      note: "تقارير ورسائل مرتبطة بدورك",
      to: "/school-inbox" as const,
      icon: Inbox,
    },
  ];

  const personalStats = [
    {
      label: isStudentDashboard ? "ملفي الطلابي" : "أبنائي",
      value: data?.studentsCount ?? 0,
      note: isStudentDashboard ? "الملف المرتبط بحسابك فقط" : "الملفات المرتبطة بحساب ولي الأمر",
      to: "/students" as const,
      icon: Users,
    },
    {
      label: "الرسائل",
      value: "متاح",
      note: "التواصل والخدمات المسموح بها",
      to: "/messages" as const,
      icon: MessageSquareText,
    },
    {
      label: "المستندات",
      value: "متاح",
      note: isStudentDashboard ? "مستنداتك المرتبطة بملفك" : "المستندات المرتبطة بالأبناء",
      to: "/free-documents" as const,
      icon: FileCheck2,
    },
    {
      label: "الحساب",
      value: "آمن",
      note: "لا تظهر لك إلا البيانات المسموح بها",
      to: "/profile" as const,
      icon: CheckCircle2,
    },
  ];

  const stats = isManagementDashboard
    ? managementStats
    : isCounselorDashboard
      ? counselorStats
      : isTeacherDashboard
        ? teacherStats
        : isPersonalDashboard
          ? personalStats
          : staffStats;

  const counselorShortcuts = [
    {
      label: "مسار التنفيذ",
      value: approvalReadyPlanTasks.length + reportApprovalReadyPlanTasks.length,
      meta:
        approvalReadyPlanTasks.length || reportApprovalReadyPlanTasks.length
          ? `${approvalReadyPlanTasks.length} تنفيذ · ${reportApprovalReadyPlanTasks.length} تقرير`
          : "لا توجد مهام تنتظر الاعتماد",
      to: "/execution" as const,
      icon: CheckCircle2,
    },
    {
      label: "البرامج",
      value: programs.length,
      meta: `${donePrograms.length} منفذ`,
      to: "/programs" as const,
      icon: Sparkles,
    },
    {
      label: "الشواهد",
      value: data?.evidences.length ?? 0,
      meta: pendingEvidenceReviews.length
        ? `${pendingEvidenceReviews.length} شاهد ينتظر المراجعة`
        : programsMissingEvidence.length
          ? `${programsMissingEvidence.length} برنامج بلا شاهد`
          : "التوثيق سليم",
      to: "/evidences" as const,
      icon: FolderCheck,
    },
    {
      label: "الجلسات",
      value: data?.interviews.length ?? 0,
      meta: `${upcomingFollowups.length} متابعة قريبة`,
      to: "/interviews" as const,
      icon: MessageSquareText,
    },
    {
      label: "المواعيد",
      value: todayAgenda.length,
      meta: "اليوم",
      to: "/calendar" as const,
      icon: CalendarDays,
    },
    {
      label: "التقارير",
      value: planTasks.filter((item) => item.doc_status === "معتمد").length,
      meta: reportApprovalReadyPlanTasks.length
        ? `${reportApprovalReadyPlanTasks.length} جاهزة لاعتماد التقرير`
        : "المهام المعتمدة للتقرير",
      to: "/reports" as const,
      icon: FileCheck2,
    },
    {
      label: "المدونة",
      value: publishedPosts,
      meta: "منشور للعامة",
      to: "/posts" as const,
      icon: BookOpen,
    },
    {
      label: "مهام المدرسة",
      value: openSchoolTasks.length,
      meta: dueSchoolTasks.length ? `${dueSchoolTasks.length} مستحقة` : "لا توجد مهام مستحقة",
      to: "/school-tasks" as const,
      icon: ClipboardCheck,
    },
    {
      label: "اعتماد الإنجاز",
      value: pendingTaskApprovals.length,
      meta: "مهام مكتملة تنتظر المراجعة",
      to: "/school-tasks" as const,
      icon: CheckCircle2,
    },
    {
      label: "المراسلات",
      value: unreadAdministrativeReports.length,
      meta: "تقارير إدارية غير مقروءة",
      to: "/school-inbox" as const,
      icon: Inbox,
    },
  ];

  const managementShortcuts = [
    {
      label: "فريق المدرسة",
      value: activeSchoolMembers.length,
      meta: pendingTeamMembers.length ? `${pendingTeamMembers.length} ينتظر الاعتماد` : "الفريق مرتبط",
      to: "/school-team" as const,
      icon: Users,
    },
    {
      label: "مهام المدرسة",
      value: openManagementTasks.length,
      meta: "إسناد ومتابعة التنفيذ",
      to: "/school-tasks" as const,
      icon: ClipboardCheck,
    },
    {
      label: "اعتماد الإنجاز",
      value: pendingTaskApprovals.length,
      meta: "مهام مكتملة تنتظر المراجعة",
      to: "/school-tasks" as const,
      icon: CheckCircle2,
    },
    {
      label: "المراسلات",
      value: unreadAdministrativeReports.length,
      meta: "تقارير إدارية غير مقروءة",
      to: "/school-inbox" as const,
      icon: Inbox,
    },
  ];

  const staffShortcuts = [
    {
      label: "مهام المدرسة",
      value: openSchoolTasks.length,
      meta: dueSchoolTasks.length ? `${dueSchoolTasks.length} مستحقة` : "ابدأ من أعمالك الحالية",
      to: "/school-tasks" as const,
      icon: ClipboardCheck,
    },
    {
      label: "المراسلات",
      value: unreadAdministrativeReports.length,
      meta: "تقارير واردة للقراءة",
      to: "/school-inbox" as const,
      icon: Inbox,
    },
  ];

  const teacherShortcuts = [
    {
      label: "طلابي",
      value: data?.studentsCount ?? 0,
      meta: "ضمن نطاق الصلاحية",
      to: "/students" as const,
      icon: Users,
    },
    {
      label: "إحالات الطلاب",
      value: "فتح",
      meta: "إنشاء أو متابعة إحالة",
      to: "/referrals" as const,
      icon: HeartHandshake,
    },
    {
      label: "مهام المدرسة",
      value: openSchoolTasks.length,
      meta: dueSchoolTasks.length ? `${dueSchoolTasks.length} مستحقة` : "لا توجد مهام مستحقة",
      to: "/school-tasks" as const,
      icon: ClipboardCheck,
    },
    {
      label: "الرسائل",
      value: "فتح",
      meta: "التواصل المرتبط بدورك",
      to: "/messages" as const,
      icon: MessageSquareText,
    },
  ];

  const personalShortcuts = [
    {
      label: isStudentDashboard ? "فتح ملفي" : "عرض الأبناء",
      value: data?.studentsCount ?? 0,
      meta: isStudentDashboard ? "بياناتك فقط" : "الأبناء المرتبطون بالحساب",
      to: "/students" as const,
      icon: Users,
    },
    {
      label: "الرسائل والخدمات",
      value: "فتح",
      meta: "تواصل ضمن الصلاحيات",
      to: "/messages" as const,
      icon: MessageSquareText,
    },
    {
      label: "المستندات",
      value: "فتح",
      meta: isStudentDashboard ? "مستنداتي" : "مستندات الأبناء",
      to: "/free-documents" as const,
      icon: FileCheck2,
    },
  ];

  const shortcuts = isManagementDashboard
    ? managementShortcuts
    : isCounselorDashboard
      ? counselorShortcuts
      : isTeacherDashboard
        ? teacherShortcuts
        : isPersonalDashboard
          ? personalShortcuts
          : staffShortcuts;

  const counselorQuickActions = [
    { label: "إضافة حالة", to: "/cases?new=1", icon: HeartHandshake },
    { label: "تسجيل مقابلة", to: "/interviews?new=1", icon: MessageSquareText },
    { label: "رفع شاهد", to: "/evidences?new=1", icon: UploadCloud },
    { label: "إضافة برنامج", to: "/programs?new=1", icon: Sparkles },
    { label: "مسار التنفيذ", to: "/execution", icon: CheckCircle2 },
    { label: "إنشاء تقرير", to: "/reports", icon: FileCheck2 },
    { label: "مهام المدرسة", to: "/school-tasks" as const, icon: ClipboardCheck },
  ];
  const managementQuickActions = [
    { label: "إسناد مهمة", to: "/school-tasks" as const, icon: ClipboardCheck },
    { label: "فريق المدرسة", to: "/school-team", icon: Users },
    { label: "اعتماد الإنجاز", to: "/school-tasks" as const, icon: CheckCircle2 },
    { label: "المراسلات الإدارية", to: "/school-inbox", icon: Inbox },
    { label: "بيانات المدرسة", to: "/settings", icon: FileCheck2 },
  ];
  const staffQuickActions = [
    { label: "مهامي اليوم", to: "/school-tasks" as const, icon: ClipboardCheck },
    { label: "رفع تقرير إنجاز", to: "/school-tasks" as const, icon: FileCheck2 },
    { label: "المراسلات الإدارية", to: "/school-inbox", icon: Inbox },
  ];
  const teacherQuickActions = [
    { label: "فتح طلابي", to: "/students" as const, icon: Users },
    { label: "إحالة طالب", to: "/referrals?new=1" as const, icon: HeartHandshake },
    { label: "مهامي اليوم", to: "/school-tasks" as const, icon: ClipboardCheck },
    { label: "الرسائل", to: "/messages" as const, icon: MessageSquareText },
  ];
  const personalQuickActions = [
    { label: isStudentDashboard ? "فتح ملفي" : "عرض الأبناء", to: "/students" as const, icon: Users },
    { label: "الرسائل والخدمات", to: "/messages" as const, icon: MessageSquareText },
    { label: "المستندات", to: "/free-documents" as const, icon: FileCheck2 },
  ];
  const quickActions = isManagementDashboard
    ? managementQuickActions
    : isCounselorDashboard
      ? counselorQuickActions
      : isTeacherDashboard
        ? teacherQuickActions
        : isPersonalDashboard
          ? personalQuickActions
          : staffQuickActions;

  const counselorActions = [
    ...pendingEvidenceReviews.slice(0, 2).map((item) => ({
      key: `evidence-review-${item.id}`,
      tone: "شاهد ينتظر المراجعة",
      title: item.name || "شاهد جديد",
      detail: "راجع الملف ثم اعتمده أو أعده للتعديل مع ملاحظة.",
      to: "/evidences" as const,
    })),
    ...reportApprovalReadyPlanTasks.slice(0, 2).map((item) => ({
      key: `report-approval-${item.id}`,
      tone: "جاهز لاعتماد التقرير",
      title: item.task || "مهمة مكتملة",
      detail: "التنفيذ والشاهد معتمدان. بقي اعتمادك النهائي للتوثيق.",
      to: "/execution" as const,
    })),
    ...approvalReadyPlanTasks.slice(0, 2).map((item) => ({
      key: `approval-ready-${item.id}`,
      tone: "جاهز لاعتماد التنفيذ",
      title: item.task || "مهمة في الخطة",
      detail: "اكتملت البرامج ويوجد شاهد. راجعها ثم اعتمد التنفيذ بنفسك.",
      to: "/execution" as const,
    })),
    ...overdueCases.slice(0, 2).map((item) => ({
      key: `case-${item.id}`,
      tone: "متابعة مستحقة",
      title: item.student_name || "طالب غير محدد",
      detail: item.next_action || "فتح الحالة واتخاذ الإجراء التالي",
      to: "/cases" as const,
    })),
    ...latePlan.slice(0, 2).map((item) => ({
      key: `plan-${item.id}`,
      tone: "مهمة متأخرة",
      title: item.task || "مهمة في الخطة",
      detail: item.due_date ? `الاستحقاق ${String(item.due_date).slice(0, 10)}` : "فتح الخطة",
      to: "/plan" as const,
    })),
    ...programsMissingEvidence.slice(0, 2).map((item) => ({
      key: `program-${item.id}`,
      tone: "توثيق ناقص",
      title: item.name || "برنامج",
      detail: "البرنامج منفذ ولا يوجد شاهد مرتبط ظاهر في البيانات",
      to: "/programs" as const,
    })),
    ...dueSchoolTasks.slice(0, 2).map((item) => ({
      key: `school-task-${item.id}`,
      tone: "مهمة مدرسية مستحقة",
      title: item.title || "مهمة مدرسية",
      detail: item.due_date ? `الاستحقاق ${String(item.due_date).slice(0, 10)}` : "فتح المهام المدرسية",
      to: "/school-tasks" as const,
    })),
    ...pendingTaskApprovals.slice(0, 2).map((item) => ({
      key: `approval-${item.id}`,
      tone: "ينتظر اعتمادك",
      title: item.title || "مهمة مدرسية مكتملة",
      detail: "راجع إثبات التنفيذ ثم اعتمد الإنجاز أو أعد المهمة.",
      to: "/school-tasks" as const,
    })),
    ...unreadAdministrativeReports.slice(0, 2).map((item) => ({
      key: `handoff-${item.id}`,
      tone: "تقرير إداري جديد",
      title: item.title || "مراسلة إدارية",
      detail: "وصلت نسخة تقرير للقراءة والاطلاع.",
      to: "/school-inbox" as const,
    })),
    ...pendingTeamMembers.slice(0, 1).map((item: any) => ({
      key: `member-${item.id}`,
      tone: "طلب انضمام",
      title: item.display_name || "عضو جديد",
      detail: "ينتظر تحديد الدور واعتماد العضوية.",
      to: "/school-team" as const,
    })),
  ];

  const schoolActions = [
    ...roleDueSchoolTasks.slice(0, 3).map((item) => ({
      key: `school-role-task-${item.id}`,
      tone: "مهمة مدرسية مستحقة",
      title: item.title || "مهمة مدرسية",
      detail: item.due_date ? `الاستحقاق ${String(item.due_date).slice(0, 10)}` : "فتح المهام المدرسية",
      to: "/school-tasks" as const,
    })),
    ...pendingTaskApprovals.slice(0, 3).map((item) => ({
      key: `role-approval-${item.id}`,
      tone: "ينتظر اعتمادك",
      title: item.title || "مهمة مكتملة",
      detail: "راجع إثبات التنفيذ ثم اعتمد الإنجاز أو أعد المهمة.",
      to: "/school-tasks" as const,
    })),
    ...unreadAdministrativeReports.slice(0, 2).map((item) => ({
      key: `role-handoff-${item.id}`,
      tone: "تقرير إداري جديد",
      title: item.title || "مراسلة إدارية",
      detail: "وصلت نسخة تقرير للقراءة والاطلاع.",
      to: "/school-inbox" as const,
    })),
    ...pendingTeamMembers.slice(0, 2).map((item: any) => ({
      key: `role-member-${item.id}`,
      tone: "طلب انضمام",
      title: item.display_name || "عضو جديد",
      detail: "ينتظر تحديد الدور واعتماد العضوية.",
      to: "/school-team" as const,
    })),
  ];

  const actions = (isPersonalDashboard ? [] : isCounselorDashboard ? counselorActions : schoolActions).slice(0, 6);

  const roleTaskPool = (isManagementDashboard ? visibleManagementTasks : mySchoolTasks).filter(
    (item) => String(item.status ?? "") !== "ملغاة",
  );
  const roleTaskCompleted = roleTaskPool.filter((item) =>
    ["مكتملة", "معتمدة"].includes(String(item.status ?? "")),
  ).length;
  const roleTaskPercent = roleTaskPool.length
    ? Math.round((roleTaskCompleted / roleTaskPool.length) * 100)
    : 0;
  const dashboardProgress = isPersonalDashboard
    ? (data?.studentsCount ?? 0) > 0 ? 100 : 0
    : isCounselorDashboard
      ? planPercent
      : roleTaskPercent;
  const dashboardProgressLabel = isPersonalDashboard
    ? "اكتمال الربط"
    : isCounselorDashboard
      ? "إنجاز الخطة"
      : "إنجاز المهام";
  const dashboardDueCount = isPersonalDashboard
    ? 0
    : isCounselorDashboard
      ? overdueCases.length + latePlan.length + dueSchoolTasks.length
      : roleDueSchoolTasks.length;
  const dashboardApprovalCount = isPersonalDashboard
    ? 0
    : isCounselorDashboard
      ? approvalReadyPlanTasks.length +
        pendingEvidenceReviews.length +
        reportApprovalReadyPlanTasks.length +
        pendingTaskApprovals.length
      : pendingTaskApprovals.length + pendingTeamMembers.length;

  const dashboardTitle = isManagementDashboard
    ? `لوحة ${schoolRoleLabel}`
    : isCounselorDashboard
      ? "لوحة الموجه الطلابي"
      : isStudentDashboard
        ? "مساحتي الطلابية"
        : isParentDashboard
          ? "بوابة ولي الأمر"
          : isTeacherDashboard
            ? "مساحة المعلم"
            : `مساحة عمل ${schoolRoleLabel}`;
  const dashboardSubtitle = isManagementDashboard
    ? "متابعة الفريق والمهام والاعتمادات والمراسلات من مكان واحد."
    : isCounselorDashboard
      ? "الحالات والمتابعات والخطة والبرامج وما يحتاج إجراء اليوم."
      : isStudentDashboard
        ? "ملفك وخدماتك ومستنداتك فقط، دون الوصول إلى بيانات أي طالب آخر."
        : isParentDashboard
          ? "الأبناء المرتبطون بحسابك والخدمات والمستندات المسموح بها فقط."
          : isTeacherDashboard
            ? "طلابك وإحالاتك ومهامك ضمن النطاق الذي حددته إدارة المدرسة."
            : "مهامك الحالية والاستحقاقات والتقارير المرتبطة بدورك فقط.";

  if (isError) {
    return (
      <div
        dir="rtl"
        className="mx-auto max-w-xl rounded-3xl border bg-card p-7 text-center shadow-sm"
      >
        <AlertTriangle className="mx-auto size-8 text-destructive" />
        <h1 className="mt-3 text-xl font-black">تعذر تحميل لوحة العمل</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          أعد المحاولة؛ السجلات المحفوظة لن تتأثر.
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-5 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div dir="rtl" className="dashboard-shell space-y-3">
      <section className="dashboard-hero border-b border-border py-4 sm:py-5">
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-primary">{formatHijriDate(new Date())}</p>
                 <h1 className="text-xl font-black text-navy sm:text-2xl">
                  {schoolMembership?.display_name
                    ? `مرحبًا، ${schoolMembership.display_name}`
                    : school?.counselor_name
                      ? `مرحبًا، ${school.counselor_name}`
                      : dashboardTitle}
                </h1>
                 <p className="text-xs text-muted-foreground">
                   {dashboardTitle}{(data?.schoolContext?.school?.name || school?.school_name) ? ` · ${data?.schoolContext?.school?.name || school?.school_name}` : ""}
                </p>
              </div>
            </div>

            <div className="dashboard-today-strip mt-4 grid grid-cols-3 gap-2">
              <a href="#today-work" className="rounded-xl border border-border bg-card px-2.5 py-2 text-center shadow-[var(--shadow-card)]">
                <strong className="block text-base font-black">{attentionCount}</strong>
                <span className="block truncate text-[9px] text-muted-foreground">تحتاج إجراء</span>
              </a>
              <Link to={isPersonalDashboard ? "/messages" : "/calendar"} className="rounded-xl border border-border bg-card px-2.5 py-2 text-center shadow-[var(--shadow-card)]">
                <strong className="block text-base font-black">{isPersonalDashboard ? "فتح" : todayAgenda.length}</strong>
                <span className="block truncate text-[9px] text-muted-foreground">{isPersonalDashboard ? "الرسائل والخدمات" : "مواعيد اليوم"}</span>
              </Link>
              <Link
                to={isPersonalDashboard ? "/free-documents" : isCounselorDashboard ? "/execution" : "/school-tasks"}
                className="rounded-xl border border-border bg-card px-2.5 py-2 text-center shadow-[var(--shadow-card)]"
              >
                <strong className="block text-base font-black">{dashboardApprovalCount}</strong>
                <span className="block truncate text-[9px] text-muted-foreground">{isPersonalDashboard ? "المستندات" : "بانتظار الاعتماد"}</span>
              </Link>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-center gap-2">
            <div
              className="dashboard-progress-ring grid size-[76px] place-items-center rounded-full border-[6px] border-primary/40 bg-card"
              aria-label={`${dashboardProgressLabel} ${dashboardProgress}%`}
            >
              <div className="grid size-full place-items-center rounded-full bg-card text-center">
                <span>
                  <strong className="block text-lg font-black leading-none text-navy">{dashboardProgress}%</strong>
                  <span className="mt-1 block text-[8px] font-bold text-muted-foreground">{dashboardProgressLabel}</span>
                </span>
              </div>
            </div>
            <Button variant="outline" size="sm"
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="h-8 rounded-full text-[9px]"
            >
              {isFetching ? "تحديث…" : "تحديث البيانات"}
            </Button>
          </div>
        </div>

        {dashboardDueCount > 0 && (
          <a
            href="#today-work"
            className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary px-3 py-2 text-[10px] font-bold text-secondary-foreground"
          >
            <span className="inline-flex min-w-0 items-center gap-1.5">
               <BellRing className="size-3.5 shrink-0 text-primary" />
              <span className="truncate">{dashboardDueCount} عنصر مستحق يحتاج متابعتك</span>
            </span>
            <ArrowLeft className="size-3.5 shrink-0" />
          </a>
        )}
      </section>

      <section className="dashboard-actions-panel rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-black">إجراءات سريعة</h2>
            <p className="text-[10px] text-muted-foreground">{dashboardSubtitle}</p>
          </div>
          <QuickActionLauncher guidanceAllowed={isCounselorDashboard} />
        </div>
        <div className="dashboard-quick-actions mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-5">
          {quickActions.slice(0, 4).map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.label}
                href={item.to}
                className="flex min-h-16 items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-black text-foreground transition hover:border-primary/40 hover:bg-secondary"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                  <Icon className="size-4" />
                </span>
                <span>{item.label}</span>
              </a>
            );
          })}
        </div>
      </section>

      {isCounselorDashboard && (
        <section className="rounded-[1.75rem] border border-[#D9C0A3]/35 bg-[#FFFDF9] p-4 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black text-[#9A6C78]">الخطة الأسبوعية</p>
              <h2 className="mt-0.5 text-sm font-black">تقدم أعمال التوجيه</h2>
              <p className="mt-1 text-[10px] text-muted-foreground">{planDone} مكتملة من أصل {planTasks.length} مهمة</p>
            </div>
            <div className="flex items-center gap-2">
              <strong className="text-2xl font-black text-[#4A141F]">{planPercent}%</strong>
              <Link to="/plan" className="rounded-xl border px-3 py-2 text-[10px] font-black">فتح الخطة</Link>
              <Link to="/reports" className="rounded-xl bg-[#4A141F] px-3 py-2 text-[10px] font-black text-white">تقرير الأسبوع</Link>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-[#89AA74] transition-all" style={{ width: `${planPercent}%` }} />
          </div>
        </section>
      )}

      <section className="dashboard-stat-grid grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="ملخص العمل">
        {stats.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              to={card.to}
              className="group rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)] transition hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="rounded-lg bg-secondary p-2 text-primary">
                  <Icon className="size-4" />
                </span>
                <strong className="text-xl font-black sm:text-2xl">
                  {isLoading ? "—" : card.value}
                </strong>
              </div>
              <p className="mt-2 text-xs font-black sm:text-sm">{card.label}</p>
              <p className="mt-0.5 truncate text-[10px] text-muted-foreground sm:text-[11px]">
                {card.note}
              </p>
            </Link>
          );
        })}
      </section>

      <section className="dashboard-shortcuts-panel rounded-[1.75rem] border border-[#D9C0A3]/35 bg-[#FFFDF9] p-3.5 shadow-[var(--shadow-card)] sm:p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black">اختصارات العمل</h2>
            <p className="text-[10px] text-muted-foreground">كل رقم من بيانات حسابك الحالية.</p>
          </div>
          <span className="text-[10px] font-bold text-primary">اضغط للفتح</span>
        </div>
        <div className="dashboard-shortcuts grid grid-cols-2 gap-2 xl:grid-cols-6">
          {shortcuts.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.to}
                className="flex min-h-20 items-center gap-2 rounded-2xl border border-[#D9C0A3]/35 bg-[#FBF7F1] p-2.5 transition hover:border-[#89AA74] hover:bg-[#E4ECDF]"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <strong className="text-lg leading-none">{isLoading ? "—" : item.value}</strong>
                    <span className="text-[11px] font-black">{item.label}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[9px] leading-4 text-muted-foreground">
                    {item.meta}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section id="today-work" className="scroll-mt-28 border-t border-border pt-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black">مهامي اليوم</h2>
              <p className="text-[10px] text-muted-foreground">
                {isCounselorDashboard
                  ? "عناصر مستخرجة من الحالات والخطة والبرامج والطلبات الواردة."
                  : "المهام والاعتمادات والتقارير التي تحتاج إجراء حسب دورك."}
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black text-primary">
              {attentionCount}
            </span>
          </div>

          <div className="mt-2 grid gap-2 xl:grid-cols-2">
            {isCounselorDashboard && openRequests > 0 && (
              <Link
                to="/inbox"
                className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-2.5"
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-primary">الوارد الموحد للتوجيه</p>
                  <p className="truncate text-xs font-black">
                    لديك {openRequests} طلب غير مغلق
                  </p>
                </div>
                <ArrowLeft className="size-4 shrink-0 text-primary" />
              </Link>
            )}

            {isCounselorDashboard && missingDocumentation.length > 0 && (
              <Link
                to="/evidences"
                className="flex items-center justify-between gap-3 rounded-xl border p-2.5"
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-primary">توثيق الخطة</p>
                  <p className="truncate text-xs font-black">
                    {missingDocumentation.length} مهمة توثيقها ناقص
                  </p>
                </div>
                <ArrowLeft className="size-4 shrink-0 text-primary" />
              </Link>
            )}

            {actions.map((item) => (
              <Link
                key={item.key}
                to={item.to}
                className="flex items-center justify-between gap-3 rounded-xl border p-2.5 transition hover:border-primary/35"
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-primary">{item.tone}</p>
                  <p className="truncate text-xs font-black">{item.title}</p>
                  <p className="truncate text-[9px] text-muted-foreground">{item.detail}</p>
                </div>
                <ArrowLeft className="size-4 shrink-0 text-primary" />
              </Link>
            ))}
            {actions.length === 0 && openRequests === 0 && missingDocumentation.length === 0 && (
              <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">لا توجد مهام تحتاج متابعة الآن.</p>
            )}
          </div>
        </section>
      </section>

      <div className="grid gap-3 xl:grid-cols-2">
        <section className="rounded-2xl border bg-card p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black">مواعيد اليوم</h2>
              <p className="text-[10px] text-muted-foreground">
                {todayAgenda.length} موعد غير منفذ
              </p>
            </div>
            <Link to="/calendar" className="text-[10px] font-black text-primary">
              التقويم
            </Link>
          </div>

          {todayAgenda.length === 0 ? (
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-muted/40 p-3 text-[11px] text-muted-foreground">
              <CheckCircle2 className="size-4 text-primary" />
              لا توجد مواعيد مفتوحة اليوم.
            </div>
          ) : (
            <div className="mt-2 space-y-1.5">
              {todayAgenda.slice(0, 4).map((item) => (
                <Link
                  key={item.id}
                  to="/calendar"
                  className="flex items-center justify-between gap-3 rounded-xl border bg-background/60 px-3 py-2"
                >
                  <span className="truncate text-[11px] font-bold">
                    {item.title || item.etype || "موعد"}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock3 className="size-3" />
                    {item.etime || "—"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border bg-card p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black">أقرب المتابعات</h2>
              <p className="text-[10px] text-muted-foreground">من سجل المقابلات الطلابية</p>
            </div>
            <Link to="/interviews" className="text-[10px] font-black text-primary">
              الجلسات
            </Link>
          </div>

          {upcomingFollowups.length === 0 ? (
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-muted/40 p-3 text-[11px] text-muted-foreground">
              <CheckCircle2 className="size-4 text-primary" />
              لا توجد متابعات قادمة مسجلة.
            </div>
          ) : (
            <div className="mt-2 space-y-1.5">
              {upcomingFollowups.map((item) => (
                <Link
                  key={item.id}
                  to="/interviews"
                  className="flex items-center justify-between gap-3 rounded-xl border bg-background/60 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-black">
                      {item.student_name || "طالب غير محدد"}
                    </p>
                    <p className="truncate text-[9px] text-muted-foreground">
                      {item.topic || "متابعة التوجيه الطلابي"}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold text-primary">
                    {String(item.followup_at ?? "").slice(0, 10)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {isCounselorDashboard && (
        <section className="rounded-2xl border bg-card p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black">آخر الأنشطة</h2>
              <p className="text-[10px] text-muted-foreground">آخر أعمالك المحفوظة في ذات.</p>
            </div>
            <Clock3 className="size-4 text-primary" />
          </div>
          {recentWork.length === 0 ? (
            <div className="mt-2 rounded-xl bg-muted/40 p-3 text-[11px] text-muted-foreground">
              ستظهر هنا آخر السجلات التي أضفتها أو عدلتها.
            </div>
          ) : (
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {recentWork.map((item) => (
                <a
                  key={item.id}
                  href={item.to}
                  className="min-w-0 rounded-xl border bg-background/60 p-2.5 transition hover:border-primary/35"
                >
                  <p className="text-[9px] font-black text-primary">{item.label}</p>
                  <p className="mt-1 truncate text-[11px] font-black">{item.title}</p>
                  <p className="mt-1 text-[9px] text-muted-foreground">
                    {item.action === "INSERT" ? "أضيف" : item.action === "UPDATE" ? "عُدّل" : item.action === "RESTORE" ? "استُعيد" : "آخر نشاط"}
                    {item.changedAt ? ` · ${new Date(item.changedAt).toLocaleString("ar-SA")}` : ""}
                  </p>
                </a>
              ))}
            </div>
          )}
        </section>
      )}

      {isCounselorDashboard && (
        <section className="rounded-2xl border border-primary/20 bg-gradient-to-bl from-primary/[0.07] via-card to-card p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <span className="rounded-xl bg-primary/10 p-2 text-primary"><Bot className="size-5" /></span>
            <div>
              <h2 className="text-sm font-black">مساعد ذات الذكي</h2>
              <p className="text-[10px] text-muted-foreground">اسأل عن أعمالك أو جهّز محتوى وتقريرًا من مكان واحد.</p>
            </div>
          </div>
          <AiCounselorAssistant />
        </section>
      )}

      {(data?.failedSources.length ?? 0) > 0 && (
        <section className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[10px]">
          <span>
            تعذر تحديث بعض المصادر ({data?.failedSources.length}). بقية الأرقام المعروضة من البيانات التي تم تحميلها بنجاح.
          </span>
          <button
            type="button"
            onClick={() => void refetch()}
            className="shrink-0 font-black text-primary"
          >
            إعادة المحاولة
          </button>
        </section>
      )}
    </div>
  );
}
