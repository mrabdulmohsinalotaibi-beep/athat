import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  PlayCircle,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";
import { HijriDatePicker } from "@/components/HijriDatePicker";
import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialDueDateForCadence, templatesForRole } from "@/lib/school-task-templates";

export const Route = createFileRoute("/_authenticated/school-tasks")({
  head: () => ({
    meta: [
      { title: "المهام المدرسية | الذات" },
      { name: "description", content: "إسناد المهام المدرسية ومتابعة تنفيذها حسب الصلاحيات." },
    ],
  }),
  component: SchoolTasksPage,
});

type Member = {
  id: string;
  display_name?: string | null;
  role: string;
  member_status: string;
  is_admin?: boolean;
};

type SchoolContext = {
  membership?: Member | null;
  members?: Member[];
};

type SchoolTask = {
  id: string;
  creator_member_id: string;
  assignee_member_id: string;
  title: string;
  description: string | null;
  category: string;
  priority: "منخفضة" | "متوسطة" | "عالية";
  cadence: "مرة واحدة" | "يومية" | "أسبوعية" | "شهرية" | "سنوية";
  due_date: string | null;
  status: "مسندة" | "قيد التنفيذ" | "مكتملة" | "معتمدة" | "معادة" | "ملغاة";
  completion_note: string | null;
  returned_note: string | null;
  completed_at: string | null;
  created_at: string;
  template_key?: string | null;
};

const roleRank = (role: string) =>
  ({ principal: 50, vice_principal: 40, counselor: 30, teacher: 20, admin_staff: 20, guard: 10, observer: 0 })[role] ?? 0;

const roleLabel = (role: string) =>
  ({
    principal: "مدير المدرسة",
    vice_principal: "وكيل المدرسة",
    counselor: "الموجه الطلابي",
    teacher: "معلم",
    admin_staff: "إداري",
    guard: "حارس",
    observer: "اطلاع فقط",
  })[role] ?? role;

const today = () => new Date().toISOString().slice(0, 10);

function SchoolTasksPage() {
  const queryClient = useQueryClient();
  const [assigneeId, setAssigneeId] = useState("");
  const [assignmentMode, setAssignmentMode] = useState<"member" | "group">("member");
  const [assigneeGroupId, setAssigneeGroupId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("عام");
  const [priority, setPriority] = useState<SchoolTask["priority"]>("متوسطة");
  const [cadence, setCadence] = useState<SchoolTask["cadence"]>("مرة واحدة");
  const [dueDate, setDueDate] = useState("");
  const [completionNotes, setCompletionNotes] = useState<Record<string, string>>({});
  const [returnNotes, setReturnNotes] = useState<Record<string, string>>({});
  const [taskView, setTaskView] = useState<"all" | "attention" | "closed">("attention");
  const [selectedReportTaskIds, setSelectedReportTaskIds] = useState<string[]>([]);
  const [reportRecipientId, setReportRecipientId] = useState("");
  const [reportRecipientMode, setReportRecipientMode] = useState<"member" | "group">("member");
  const [reportRecipientGroupId, setReportRecipientGroupId] = useState("");
  const [reportNote, setReportNote] = useState("");
  const [templateTargetId, setTemplateTargetId] = useState("");
  const [selectedTemplateKeys, setSelectedTemplateKeys] = useState<string[]>([]);
  const [groupTemplateGroupId, setGroupTemplateGroupId] = useState("");
  const [groupTemplateRole, setGroupTemplateRole] = useState("");
  const [groupTemplateKeys, setGroupTemplateKeys] = useState<string[]>([]);
  const [performanceGroupId, setPerformanceGroupId] = useState("");
  const [performanceDays, setPerformanceDays] = useState(30);
  const [performanceReportRecipientId, setPerformanceReportRecipientId] = useState("");
  const [performanceReportNote, setPerformanceReportNote] = useState("");

  const groupsQuery = useQuery({
    queryKey: ["school-permission-groups"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_school_permission_groups");
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        name: string;
        description: string | null;
        member_ids: string[];
      }>;
    },
    staleTime: 30_000,
  });

  const groupPerformanceQuery = useQuery({
    queryKey: ["school-group-task-performance", performanceGroupId, performanceDays],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_school_group_task_performance", {
        p_group_id: performanceGroupId,
        p_days: performanceDays,
      });
      if (error) throw error;
      return data as {
        group_id: string;
        group_name: string;
        days: number;
        generated_at: string;
        summary: {
          members: number;
          total_tasks: number;
          completed_tasks: number;
          approved_tasks: number;
          open_tasks: number;
          overdue_tasks: number;
          completion_rate: number;
        };
        members: Array<{
          member_id: string;
          display_name: string;
          role: string;
          total_tasks: number;
          completed_tasks: number;
          approved_tasks: number;
          open_tasks: number;
          overdue_tasks: number;
          completion_rate: number;
          last_completed_at: string | null;
        }>;
      };
    },
    enabled: Boolean(performanceGroupId),
    staleTime: 20_000,
  });

  const query = useQuery({
    queryKey: ["school-tasks"],
    queryFn: async () => {
      const { data: context, error: contextError } = await (supabase as any).rpc("get_my_school_context");
      if (contextError) throw contextError;
      const typedContext = context as SchoolContext;
      const memberId = String(typedContext?.membership?.id ?? "");
      if (!memberId) return { context: typedContext, tasks: [] as SchoolTask[] };

      const { data, error } = await (supabase as any)
        .from("school_tasks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return { context: typedContext, tasks: (data ?? []) as SchoolTask[] };
    },
    staleTime: 10_000,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["school-tasks"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard-live-v2"] });
    await queryClient.invalidateQueries({ queryKey: ["app-alert-summary"] });
  };

  const createTask = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("اكتب عنوان المهمة.");

      if (assignmentMode === "group") {
        if (!assigneeGroupId) throw new Error("اختر مجموعة لإسناد المهمة إليها.");
        const { data, error } = await (supabase as any).rpc("create_school_task_for_group", {
          p_group_id: assigneeGroupId,
          p_title: title.trim(),
          p_description: description.trim() || null,
          p_category: category.trim() || "عام",
          p_priority: priority,
          p_cadence: cadence,
          p_due_date: dueDate || null,
        });
        if (error) throw error;
        return { mode: "group" as const, data };
      }

      if (!assigneeId) throw new Error("اختر الموظف الذي ستسند إليه المهمة.");
      const { error } = await (supabase as any).rpc("create_school_task", {
        p_assignee_member_id: assigneeId,
        p_title: title.trim(),
        p_description: description.trim() || null,
        p_category: category.trim() || "عام",
        p_priority: priority,
        p_cadence: cadence,
        p_due_date: dueDate || null,
      });
      if (error) throw error;
      return { mode: "member" as const, data: null };
    },
    onSuccess: async (result) => {
      setTitle("");
      setDescription("");
      setDueDate("");
      await refresh();
      if (result.mode === "group") {
        const created = Number((result.data as any)?.created ?? 0);
        const skipped = Number((result.data as any)?.skipped ?? 0);
        toast.success(`تم إسناد المهمة إلى ${created} عضو${skipped ? `، وتم تجاوز ${skipped} عضو غير مؤهل حسب التسلسل الإداري` : ""}.`);
      } else {
        toast.success("تم إسناد المهمة للموظف.");
      }
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const activateTemplates = useMutation({
    mutationFn: async ({
      targetId,
      templateKeys,
    }: {
      targetId: string;
      templateKeys: string[];
    }) => {
      const target = members.find((member) => member.id === targetId);
      if (!target) throw new Error("تعذّر تحديد الموظف.");
      const templates = templatesForRole(target.role).filter((template) => templateKeys.includes(template.key));
      if (!templates.length) throw new Error("حدد قالب مهمة واحدًا على الأقل.");

      const results = await Promise.all(
        templates.map((template) =>
          (supabase as any).rpc("activate_school_task_template", {
            p_assignee_member_id: targetId,
            p_template_key: template.key,
            p_title: template.title,
            p_description: template.description,
            p_category: template.category,
            p_priority: template.priority,
            p_cadence: template.cadence,
            p_due_date: initialDueDateForCadence(template.cadence),
          }),
        ),
      );
      const failed = results.find((result: any) => result.error);
      if (failed?.error) throw failed.error;
      return templates.length;
    },
    onSuccess: async (count) => {
      setSelectedTemplateKeys([]);
      await refresh();
      toast.success(`تم تفعيل ${count} من قوالب المهام الدورية.`);
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const activateGroupTemplates = useMutation({
    mutationFn: async ({
      groupId,
      role,
      templateKeys,
    }: {
      groupId: string;
      role: string;
      templateKeys: string[];
    }) => {
      if (!groupId) throw new Error("اختر المجموعة.");
      if (!role) throw new Error("اختر الدور داخل المجموعة.");
      const templates = templatesForRole(role).filter((template) => templateKeys.includes(template.key));
      if (!templates.length) throw new Error("حدد قالب مهمة واحدًا على الأقل.");

      const results = await Promise.all(
        templates.map(async (template) => {
          const { data, error } = await (supabase as any).rpc("activate_school_task_template_for_group", {
            p_group_id: groupId,
            p_target_role: role,
            p_template_key: template.key,
            p_title: template.title,
            p_description: template.description,
            p_category: template.category,
            p_priority: template.priority,
            p_cadence: template.cadence,
            p_due_date: initialDueDateForCadence(template.cadence),
          });
          if (error) throw error;
          return data as { created?: number; existing?: number; skipped?: number; group_name?: string };
        }),
      );

      return results.reduce<{ created: number; existing: number; skipped: number; groupName: string }>(
        (acc, row) => ({
          created: acc.created + Number(row?.created ?? 0),
          existing: acc.existing + Number(row?.existing ?? 0),
          skipped: acc.skipped + Number(row?.skipped ?? 0),
          groupName: row?.group_name || acc.groupName,
        }),
        { created: 0, existing: 0, skipped: 0, groupName: "" },
      );
    },
    onSuccess: async (result) => {
      setGroupTemplateKeys([]);
      await refresh();
      toast.success(
        `تم تفعيل القوالب لـ ${result.created} مهمة جديدة${result.existing ? `، و${result.existing} كانت مفعلة مسبقًا` : ""}${result.skipped ? `، وتم تجاوز ${result.skipped} عضو غير مؤهل` : ""}.`,
      );
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const createPerformanceReport = useMutation({
    mutationFn: async () => {
      if (!performanceGroupId) throw new Error("اختر المجموعة أولًا.");
      if (!performanceReportRecipientId) throw new Error("اختر المسؤول الذي سيستلم التقرير.");

      const { data, error } = await (supabase as any).rpc("create_school_group_performance_report", {
        p_group_id: performanceGroupId,
        p_days: performanceDays,
        p_recipient_member_id: performanceReportRecipientId,
        p_note: performanceReportNote.trim() || null,
      });
      if (error) throw error;
      return String(data ?? "");
    },
    onSuccess: async () => {
      setPerformanceReportNote("");
      await queryClient.invalidateQueries({ queryKey: ["school-report-handoffs"] });
      await queryClient.invalidateQueries({ queryKey: ["app-alert-summary"] });
      toast.success("تم إنشاء تقرير أداء المجموعة ورفعه للمسؤول.");
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const updateMyTask = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "قيد التنفيذ" | "مكتملة" }) => {
      const { error } = await (supabase as any).rpc("update_my_school_task", {
        p_task_id: id,
        p_status: status,
        p_completion_note: status === "مكتملة" ? completionNotes[id]?.trim() || null : null,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await refresh();
      toast.success("تم تحديث حالة المهمة.");
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const reviewTask = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "اعتماد" | "إعادة" | "إلغاء" }) => {
      const { error } = await (supabase as any).rpc("review_school_task", {
        p_task_id: id,
        p_action: action,
        p_note: returnNotes[id]?.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await refresh();
      toast.success("تم تحديث المهمة.");
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const sendTaskReport = useMutation({
    mutationFn: async ({ rows, recipientId }: { rows: SchoolTask[]; recipientId?: string }) => {
      if (!rows.length) throw new Error("حدد مهمة واحدة على الأقل.");
      if (reportRecipientMode === "member" && !recipientId) throw new Error("اختر المستلم الإداري.");
      if (reportRecipientMode === "group" && !reportRecipientGroupId) throw new Error("اختر مجموعة إدارية.");

      const snapshot = {
        version: 1,
        report_title: "تقرير إنجاز المهام المدرسية",
        created_at: new Date().toISOString(),
        total_rows: rows.length,
        sections: [
          {
            key: "school_tasks",
            title: "المهام المدرسية",
            columns: [
              { key: "title", label: "المهمة" },
              { key: "category", label: "التصنيف" },
              { key: "priority", label: "الأولوية" },
              { key: "cadence", label: "التكرار" },
              { key: "due_date", label: "الاستحقاق" },
              { key: "status", label: "الحالة" },
              { key: "completion_note", label: "إثبات التنفيذ" },
              { key: "completed_at", label: "تاريخ الإنجاز" },
            ],
            rows: rows.map((task) => ({
              id: task.id,
              title: task.title,
              category: task.category,
              priority: task.priority,
              cadence: task.cadence,
              due_date: task.due_date,
              status: task.status,
              completion_note: task.completion_note,
              completed_at: task.completed_at,
            })),
          },
        ],
      };

      if (reportRecipientMode === "group") {
        const { data, error } = await (supabase as any).rpc("create_school_report_handoff_for_group", {
          p_group_id: reportRecipientGroupId,
          p_title: "تقرير إنجاز المهام المدرسية",
          p_note: reportNote.trim() || null,
          p_snapshot: snapshot,
        });
        if (error) throw error;
        return { mode: "group" as const, data };
      }

      const { error } = await (supabase as any).rpc("create_school_report_handoff", {
        p_recipient_member_id: recipientId,
        p_title: "تقرير إنجاز المهام المدرسية",
        p_note: reportNote.trim() || null,
        p_snapshot: snapshot,
      });
      if (error) throw error;
      return { mode: "member" as const, data: null };
    },
    onSuccess: async (result) => {
      setSelectedReportTaskIds([]);
      setReportNote("");
      await queryClient.invalidateQueries({ queryKey: ["school-report-handoffs"] });
      await queryClient.invalidateQueries({ queryKey: ["app-alert-summary"] });
      if (result.mode === "group") {
        const created = Number((result.data as any)?.created ?? 0);
        const skipped = Number((result.data as any)?.skipped ?? 0);
        toast.success(`تم رفع التقرير إلى ${created} عضو مؤهل في المجموعة${skipped ? `، وتم تجاوز ${skipped} عضو لا يطابق مسار الرفع الإداري` : ""}.`);
      } else {
        toast.success("تم رفع تقرير إنجاز المهام للإدارة.");
      }
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const context = query.data?.context;
  const membership = context?.membership;
  const members = context?.members ?? [];
  const tasks = query.data?.tasks ?? [];
  const permissionGroups = groupsQuery.data ?? [];
  const selectedTemplateGroup = permissionGroups.find((group) => group.id === groupTemplateGroupId) ?? null;
  const selectedTemplateGroupMembers = selectedTemplateGroup
    ? members.filter((member) => selectedTemplateGroup.member_ids?.includes(member.id) && member.member_status === "active")
    : [];
  const selectedTemplateGroupRoles = Array.from(new Set(selectedTemplateGroupMembers.map((member) => member.role)))
    .filter((role) => templatesForRole(role).length > 0);
  const groupRoleTemplates = templatesForRole(groupTemplateRole);
  const groupRoleMemberCount = selectedTemplateGroupMembers.filter((member) => member.role === groupTemplateRole).length;
  const groupActiveTemplateCounts = new Map(
    groupRoleTemplates.map((template) => [
      template.key,
      tasks.filter(
        (task) =>
          task.template_key === template.key &&
          !["معتمدة", "ملغاة"].includes(task.status) &&
          selectedTemplateGroupMembers.some((member) => member.id === task.assignee_member_id),
      ).length,
    ]),
  );
  const memberId = membership?.id ?? "";
  const memberMap = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);

  const lowerMembers = members.filter(
    (member) =>
      member.member_status === "active" &&
      member.id !== memberId &&
      roleRank(member.role) < roleRank(membership?.role ?? ""),
  );
  const higherMembers = members.filter(
    (member) =>
      member.member_status === "active" &&
      member.id !== memberId &&
      roleRank(member.role) > roleRank(membership?.role ?? ""),
  );
  const templateTargets = membership
    ? [membership, ...lowerMembers]
    : lowerMembers;
  const effectiveTemplateTargetId = templateTargetId || memberId;
  const templateTarget = templateTargets.find((member) => member.id === effectiveTemplateTargetId) ?? membership;
  const roleTemplates = templatesForRole(templateTarget?.role);
  const activeTemplateKeys = new Set(
    tasks
      .filter(
        (task) =>
          task.assignee_member_id === effectiveTemplateTargetId &&
          task.template_key &&
          !["معتمدة", "ملغاة"].includes(task.status),
      )
      .map((task) => String(task.template_key)),
  );
  const availableTemplateKeys = roleTemplates
    .filter((template) => !activeTemplateKeys.has(template.key))
    .map((template) => template.key);
  const selectedAvailableTemplateKeys = selectedTemplateKeys.filter((key) => availableTemplateKeys.includes(key));

  const assignedToMe = tasks.filter((task) => task.assignee_member_id === memberId && task.status !== "ملغاة");
  const assignedByMe = tasks.filter(
    (task) => task.creator_member_id === memberId && task.assignee_member_id !== memberId,
  );
  const due = assignedToMe.filter(
    (task) => !["مكتملة", "معتمدة", "ملغاة"].includes(task.status) && task.due_date && task.due_date <= today(),
  );
  const completed = assignedToMe.filter((task) => ["مكتملة", "معتمدة"].includes(task.status)).length;

  const priorityRank = (value: SchoolTask["priority"]) => ({ عالية: 3, متوسطة: 2, منخفضة: 1 })[value] ?? 0;
  const taskNeedsAttention = (task: SchoolTask) =>
    task.status === "مكتملة" ||
    task.status === "معادة" ||
    (!["معتمدة", "ملغاة"].includes(task.status) && Boolean(task.due_date && task.due_date <= today()));
  const filterAndSortTasks = (rows: SchoolTask[]) =>
    rows
      .filter((task) => {
        if (taskView === "closed") return ["معتمدة", "ملغاة"].includes(task.status);
        if (taskView === "attention") return taskNeedsAttention(task);
        return true;
      })
      .sort((a, b) => {
        const attentionDifference = Number(taskNeedsAttention(b)) - Number(taskNeedsAttention(a));
        if (attentionDifference) return attentionDifference;
        const priorityDifference = priorityRank(b.priority) - priorityRank(a.priority);
        if (priorityDifference) return priorityDifference;
        return String(a.due_date ?? "9999-12-31").localeCompare(String(b.due_date ?? "9999-12-31"));
      });
  const visibleAssignedToMe = filterAndSortTasks(assignedToMe);
  const visibleAssignedByMe = filterAndSortTasks(assignedByMe);
  const reportableTasks = assignedToMe.filter((task) => ["مكتملة", "معتمدة"].includes(task.status));
  const selectedReportTasks = reportableTasks.filter((task) => selectedReportTaskIds.includes(task.id));

  if (query.isLoading) {
    return <div dir="rtl" className="rounded-2xl border border-[#D9C0A3]/35 bg-[#FFFDF9] p-8 text-center text-sm text-muted-foreground">جارٍ تحميل المهام المدرسية...</div>;
  }

  if (query.isError) {
    return (
      <div dir="rtl" className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5">
        <p className="font-black text-destructive">تعذّر تحميل المهام المدرسية.</p>
        <Button className="mt-3" variant="outline" onClick={() => void query.refetch()}><RotateCcw className="size-4" /> إعادة المحاولة</Button>
      </div>
    );
  }

  if (!membership) {
    return (
      <div dir="rtl" className="rounded-2xl border border-[#D9C0A3]/35 bg-[#FFFDF9] p-6">
        <h1 className="text-xl font-black">اربط حسابك بفريق المدرسة أولًا</h1>
        <p className="mt-2 text-sm text-muted-foreground">بعد ربط الحساب بالمدرسة ستظهر مهامك وإمكانية الإسناد حسب دورك.</p>
        <a href="/school-team" className="mt-4 inline-block text-sm font-black text-primary hover:underline">فتح فريق المدرسة والصلاحيات</a>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-5">
      <section className="rounded-2xl border border-[#D9C0A3]/35 bg-[#FFFDF9] p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary"><ClipboardCheck className="size-5" /><span className="text-xs font-black">دورة تنفيذ واضحة</span></div>
            <h1 className="mt-2 text-2xl font-black">المهام المدرسية</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
              المسؤول الأعلى يسند المهمة، والموظف يبدأها ثم يثبت إكمالها بملاحظة تنفيذ. جميع الخطوات مرتبطة بعضوية المدرسة وصلاحية الدور.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="مسندة لي" value={assignedToMe.length} />
            <Stat label="مستحقة" value={due.length} />
            <Stat label="مكتملة" value={completed} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#D9C0A3]/35 bg-[#FFFDF9] p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black">تركيز العمل</p>
            <p className="mt-1 text-[11px] text-muted-foreground">ابدأ بما يحتاج إجراء، ثم ارجع للسجل الكامل عند الحاجة.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              ["attention", "تحتاج إجراء"],
              ["all", "كل المهام"],
              ["closed", "المغلقة"],
            ] as const).map(([value, label]) => (
              <Button
                key={value}
                size="sm"
                variant={taskView === value ? "default" : "outline"}
                onClick={() => setTaskView(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-primary/15 bg-primary/[0.025] p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="size-4" />
              <h2 className="font-black">قوالب المهام حسب الدور الوظيفي</h2>
            </div>
            <p className="mt-1 max-w-3xl text-xs leading-6 text-muted-foreground">
              اختر الموظف ثم فعّل المهام اليومية والأسبوعية والشهرية والسنوية المناسبة لدوره. بعد اعتماد كل مهمة متكررة ينشئ النظام الاستحقاق التالي تلقائيًا.
            </p>
          </div>
          <div className="min-w-[250px]">
            <Label>الدور المستهدف</Label>
            <select
              value={effectiveTemplateTargetId}
              onChange={(e) => {
                setTemplateTargetId(e.target.value);
                setSelectedTemplateKeys([]);
              }}
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              {templateTargets.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.id === memberId ? "مهامي أنا" : member.display_name || "عضو المدرسة"} · {roleLabel(member.role)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {roleTemplates.length ? (
          <>
            <div className="mt-4 grid gap-2 xl:grid-cols-2 xl:grid-cols-3">
              {roleTemplates.map((template) => {
                const active = activeTemplateKeys.has(template.key);
                const checked = selectedTemplateKeys.includes(template.key);
                return (
                  <label
                    key={template.key}
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${
                      active ? "border-emerald-500/20 bg-emerald-500/5" : checked ? "border-primary/40 bg-[#E4ECDF]/70" : "bg-card hover:border-primary/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 size-4"
                      disabled={active}
                      checked={active || checked}
                      onChange={() =>
                        setSelectedTemplateKeys((current) =>
                          checked ? current.filter((key) => key !== template.key) : [...current, template.key],
                        )
                      }
                    />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black">{template.title}</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-black">{template.cadence}</span>
                        {active && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black text-emerald-700">مفعلة</span>}
                      </span>
                      <span className="mt-1 block text-[11px] leading-5 text-muted-foreground">{template.description}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!availableTemplateKeys.length}
                onClick={() => setSelectedTemplateKeys(availableTemplateKeys)}
              >
                <ClipboardList className="size-4" /> تحديد المتاح
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={!selectedTemplateKeys.length}
                onClick={() => setSelectedTemplateKeys([])}
              >
                إلغاء التحديد
              </Button>
              <Button
                size="sm"
                disabled={!selectedAvailableTemplateKeys.length || activateTemplates.isPending}
                onClick={() =>
                  activateTemplates.mutate({
                    targetId: effectiveTemplateTargetId,
                    templateKeys: selectedAvailableTemplateKeys,
                  })
                }
              >
                <Sparkles className="size-4" />
                {activateTemplates.isPending ? "جارٍ التفعيل..." : `تفعيل المحدد (${selectedAvailableTemplateKeys.length})`}
              </Button>
            </div>
          </>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed p-5 text-xs text-muted-foreground">
            لا توجد قوالب تشغيلية لهذا الدور. دور الاطلاع لا يُسند إليه تنفيذ.
          </div>
        )}
        <p className="mt-3 text-[10px] leading-5 text-muted-foreground">
          هذه قوالب تشغيلية استرشادية قابلة للتعديل وليست بديلًا عن التكليف أو التعميم الرسمي الخاص بالمدرسة.
        </p>
      </section>

      {permissionGroups.length > 0 && (
        <section className="rounded-3xl border border-[#D9C0A3]/35 bg-[#FFFDF9] p-4 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <BarChart3 className="size-4" />
                <h2 className="font-black">أداء المجموعة</h2>
              </div>
              <p className="mt-1 max-w-3xl text-xs leading-6 text-muted-foreground">
                تابع إنجاز أعضاء المجموعة والمتأخرات والمهام المفتوحة. الأرقام للمتابعة التشغيلية ولا تمثل تقييمًا وظيفيًا نهائيًا.
              </p>
            </div>
            <div className="grid min-w-[280px] grid-cols-2 gap-2">
              <select
                value={performanceGroupId}
                onChange={(e) => {
                  setPerformanceGroupId(e.target.value);
                  setPerformanceReportRecipientId("");
                  setPerformanceReportNote("");
                }}
                className="h-10 rounded-md border bg-background px-3 text-xs"
              >
                <option value="">اختر المجموعة</option>
                {permissionGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              <select
                value={performanceDays}
                onChange={(e) => setPerformanceDays(Number(e.target.value))}
                className="h-10 rounded-md border bg-background px-3 text-xs"
              >
                <option value={7}>آخر 7 أيام</option>
                <option value={30}>آخر 30 يومًا</option>
                <option value={90}>آخر 90 يومًا</option>
                <option value={180}>آخر 180 يومًا</option>
                <option value={365}>آخر سنة</option>
              </select>
            </div>
          </div>

          {!performanceGroupId ? (
            <div className="mt-4 rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground">
              اختر مجموعة لعرض مؤشرات المتابعة.
            </div>
          ) : groupPerformanceQuery.isLoading ? (
            <div className="mt-4 rounded-xl border p-5 text-center text-xs text-muted-foreground">
              جارٍ حساب مؤشرات المجموعة...
            </div>
          ) : groupPerformanceQuery.isError ? (
            <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-xs text-destructive">
              تعذّر تحميل أداء المجموعة.
              <Button className="mr-2" size="sm" variant="outline" onClick={() => void groupPerformanceQuery.refetch()}>
                إعادة المحاولة
              </Button>
            </div>
          ) : groupPerformanceQuery.data ? (
            <>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
                <Stat label="الأعضاء" value={groupPerformanceQuery.data.summary.members} />
                <Stat label="كل المهام" value={groupPerformanceQuery.data.summary.total_tasks} />
                <Stat label="مكتملة" value={groupPerformanceQuery.data.summary.completed_tasks} />
                <Stat label="معتمدة" value={groupPerformanceQuery.data.summary.approved_tasks} />
                <Stat label="مفتوحة" value={groupPerformanceQuery.data.summary.open_tasks} />
                <Stat label="متأخرة" value={groupPerformanceQuery.data.summary.overdue_tasks} />
              </div>

              <div className="mt-4 rounded-2xl border bg-muted/10 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black">نسبة إكمال المهام</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      المهام المكتملة أو المعتمدة من إجمالي المهام خلال الفترة المحددة.
                    </p>
                  </div>
                  <strong className="text-xl font-black text-primary">
                    {Number(groupPerformanceQuery.data.summary.completion_rate ?? 0).toLocaleString("ar-SA")}%
                  </strong>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, Number(groupPerformanceQuery.data.summary.completion_rate ?? 0)))}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/[0.025] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black">إنشاء تقرير أداء المجموعة</p>
                    <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
                      يحول المؤشرات الحالية إلى نسخة ثابتة رسمية داخل المراسلات الإدارية، ثم تدخل في مسار الاطلاع والاعتماد المعتاد.
                    </p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black text-primary">
                    آخر {performanceDays} يومًا
                  </span>
                </div>

                {higherMembers.length ? (
                  <div className="mt-3 grid gap-3 xl:grid-cols-[260px_minmax(0,1fr)_auto]">
                    <div>
                      <Label>رفع التقرير إلى</Label>
                      <select
                        value={performanceReportRecipientId}
                        onChange={(e) => setPerformanceReportRecipientId(e.target.value)}
                        className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-xs"
                      >
                        <option value="">اختر المسؤول الأعلى</option>
                        {higherMembers.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.display_name || "عضو المدرسة"} · {roleLabel(member.role)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>ملاحظة مرافقة</Label>
                      <Input
                        className="mt-2"
                        value={performanceReportNote}
                        onChange={(e) => setPerformanceReportNote(e.target.value)}
                        placeholder="مثال: تقرير متابعة أداء المجموعة للفترة الحالية."
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        className="w-full xl:w-auto"
                        disabled={!performanceReportRecipientId || createPerformanceReport.isPending}
                        onClick={() => createPerformanceReport.mutate()}
                      >
                        <Send className="size-4" />
                        {createPerformanceReport.isPending ? "جارٍ إنشاء التقرير..." : "إنشاء ورفع التقرير"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 rounded-xl border border-dashed p-3 text-[10px] leading-5 text-muted-foreground">
                    لا يوجد حاليًا مسؤول أعلى مرتبط بالمدرسة لاستلام التقرير.
                  </p>
                )}
              </div>

              <div className="mt-4 grid gap-2 xl:grid-cols-2">
                {groupPerformanceQuery.data.members.map((member) => (
                  <article
                    key={member.member_id}
                    className={`rounded-2xl border p-3 ${member.overdue_tasks > 0 ? "border-amber-500/30 bg-amber-500/[0.035]" : "bg-card"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black">{member.display_name}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">{roleLabel(member.role)}</p>
                      </div>
                      <div className="text-left">
                        <p className="text-lg font-black text-primary">{Number(member.completion_rate ?? 0).toLocaleString("ar-SA")}%</p>
                        <p className="text-[9px] text-muted-foreground">إكمال</p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
                      <div className="rounded-xl bg-muted/60 px-2 py-2">
                        <strong className="block text-sm">{member.total_tasks}</strong>
                        <span className="text-[9px] text-muted-foreground">الكل</span>
                      </div>
                      <div className="rounded-xl bg-muted/60 px-2 py-2">
                        <strong className="block text-sm">{member.completed_tasks}</strong>
                        <span className="text-[9px] text-muted-foreground">مكتملة</span>
                      </div>
                      <div className="rounded-xl bg-muted/60 px-2 py-2">
                        <strong className="block text-sm">{member.open_tasks}</strong>
                        <span className="text-[9px] text-muted-foreground">مفتوحة</span>
                      </div>
                      <div className={`rounded-xl px-2 py-2 ${member.overdue_tasks > 0 ? "bg-amber-500/10 text-amber-800" : "bg-muted/60"}`}>
                        <strong className="block text-sm">{member.overdue_tasks}</strong>
                        <span className="text-[9px]">متأخرة</span>
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.max(0, Math.min(100, Number(member.completion_rate ?? 0)))}%` }}
                      />
                    </div>
                    <p className="mt-2 text-[9px] text-muted-foreground">
                      {member.last_completed_at
                        ? `آخر إنجاز: ${new Date(member.last_completed_at).toLocaleDateString("ar-SA")}`
                        : "لا يوجد إنجاز مسجل خلال الفترة."}
                    </p>
                  </article>
                ))}
              </div>

              {!groupPerformanceQuery.data.members.length && (
                <div className="mt-4 rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground">
                  لا يوجد أعضاء نشطون في هذه المجموعة.
                </div>
              )}
            </>
          ) : null}
        </section>
      )}

      {permissionGroups.length > 0 && (
        <section className="rounded-3xl border border-primary/15 bg-[#FFFDF9] p-4 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="size-4" />
                <h2 className="font-black">تفعيل قوالب المهام للمجموعة</h2>
              </div>
              <p className="mt-1 max-w-3xl text-xs leading-6 text-muted-foreground">
                اختر المجموعة ثم الدور داخلها، وفعّل مهامًا دورية لجميع أعضاء هذا الدور دفعة واحدة. يتابع كل عضو مهمته ويثبت إنجازه بشكل مستقل.
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black text-primary">
              {groupRoleMemberCount} عضو مستهدف
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <Label>المجموعة</Label>
              <select
                value={groupTemplateGroupId}
                onChange={(e) => {
                  setGroupTemplateGroupId(e.target.value);
                  setGroupTemplateRole("");
                  setGroupTemplateKeys([]);
                }}
                className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">اختر المجموعة</option>
                {permissionGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} · {group.member_ids?.length ?? 0} عضو
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>الدور داخل المجموعة</Label>
              <select
                value={groupTemplateRole}
                disabled={!groupTemplateGroupId}
                onChange={(e) => {
                  setGroupTemplateRole(e.target.value);
                  setGroupTemplateKeys([]);
                }}
                className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">اختر الدور</option>
                {selectedTemplateGroupRoles.map((role) => (
                  <option key={role} value={role}>
                    {roleLabel(role)} · {selectedTemplateGroupMembers.filter((member) => member.role === role).length} عضو
                  </option>
                ))}
              </select>
            </div>
          </div>

          {groupTemplateRole ? (
            groupRoleTemplates.length ? (
              <>
                <div className="mt-4 grid gap-2 xl:grid-cols-2 xl:grid-cols-3">
                  {groupRoleTemplates.map((template) => {
                    const checked = groupTemplateKeys.includes(template.key);
                    const activeCount = groupActiveTemplateCounts.get(template.key) ?? 0;
                    return (
                      <label
                        key={template.key}
                        className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${
                          checked ? "border-primary/40 bg-[#E4ECDF]/70" : "bg-card hover:border-primary/30"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 size-4"
                          checked={checked}
                          onChange={() =>
                            setGroupTemplateKeys((current) =>
                              checked ? current.filter((key) => key !== template.key) : [...current, template.key],
                            )
                          }
                        />
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-black">{template.title}</span>
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-black">{template.cadence}</span>
                            {activeCount > 0 && (
                              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black text-emerald-700">
                                مفعلة لدى {activeCount}
                              </span>
                            )}
                          </span>
                          <span className="mt-1 block text-[11px] leading-5 text-muted-foreground">{template.description}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setGroupTemplateKeys(groupRoleTemplates.map((template) => template.key))}
                  >
                    <ClipboardList className="size-4" /> تحديد الكل
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!groupTemplateKeys.length}
                    onClick={() => setGroupTemplateKeys([])}
                  >
                    إلغاء التحديد
                  </Button>
                  <Button
                    size="sm"
                    disabled={!groupTemplateKeys.length || activateGroupTemplates.isPending}
                    onClick={() =>
                      activateGroupTemplates.mutate({
                        groupId: groupTemplateGroupId,
                        role: groupTemplateRole,
                        templateKeys: groupTemplateKeys,
                      })
                    }
                  >
                    <Sparkles className="size-4" />
                    {activateGroupTemplates.isPending
                      ? "جارٍ التفعيل..."
                      : `تفعيل المحدد للمجموعة (${groupTemplateKeys.length})`}
                  </Button>
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
                لا توجد قوالب دورية لهذا الدور.
              </div>
            )
          ) : groupTemplateGroupId ? (
            <div className="mt-4 rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
              اختر الدور داخل المجموعة لعرض قوالب المهام المناسبة له.
            </div>
          ) : null}

          <p className="mt-3 text-[10px] leading-5 text-muted-foreground">
            لن يكرر النظام قالبًا نشطًا لنفس العضو. وبعد اعتماد كل استحقاق متكرر ينشأ الاستحقاق التالي تلقائيًا لذلك العضو وحده.
          </p>
        </section>
      )}

      <section className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-[#D9C0A3]/35 bg-[#FFFDF9] p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2"><Plus className="size-4 text-primary" /><h2 className="font-black">إسناد مهمة جديدة</h2></div>
          {lowerMembers.length ? (
            <div className="mt-4 space-y-3">
              <div>
                <Label>الإسناد إلى</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button type="button" size="sm" variant={assignmentMode === "member" ? "default" : "outline"} onClick={() => setAssignmentMode("member")}>
                    موظف
                  </Button>
                  <Button type="button" size="sm" variant={assignmentMode === "group" ? "default" : "outline"} onClick={() => setAssignmentMode("group")} disabled={!permissionGroups.length}>
                    مجموعة
                  </Button>
                </div>
                {assignmentMode === "member" ? (
                  <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
                    <option value="">اختر الموظف</option>
                    {lowerMembers.map((member) => <option key={member.id} value={member.id}>{member.display_name || "عضو المدرسة"} · {roleLabel(member.role)}</option>)}
                  </select>
                ) : (
                  <select value={assigneeGroupId} onChange={(e) => setAssigneeGroupId(e.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
                    <option value="">اختر المجموعة</option>
                    {permissionGroups.map((group) => <option key={group.id} value={group.id}>{group.name} · {group.member_ids?.length ?? 0} عضو</option>)}
                  </select>
                )}
              </div>
              <div><Label>عنوان المهمة</Label><Input className="mt-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: إعداد تقرير الغياب الأسبوعي" /></div>
              <div><Label>التفاصيل</Label><textarea className="mt-2 min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>التصنيف</Label><Input className="mt-2" value={category} onChange={(e) => setCategory(e.target.value)} /></div>
                <div><Label>الأولوية</Label><select className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm" value={priority} onChange={(e) => setPriority(e.target.value as SchoolTask["priority"])}><option>منخفضة</option><option>متوسطة</option><option>عالية</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>التكرار</Label><select className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm" value={cadence} onChange={(e) => setCadence(e.target.value as SchoolTask["cadence"])}><option>مرة واحدة</option><option>يومية</option><option>أسبوعية</option><option>شهرية</option><option>سنوية</option></select><p className="mt-1 text-[10px] text-muted-foreground">المهمة المتكررة تُنشئ الاستحقاق التالي تلقائيًا بعد اعتماد إنجازها من المسؤول.</p></div>
                <div><Label>الاستحقاق</Label><HijriDatePicker className="mt-2" value={dueDate} onChange={setDueDate} /></div>
              </div>
              <Button
                className="w-full"
                disabled={(assignmentMode === "member" ? !assigneeId : !assigneeGroupId) || !title.trim() || createTask.isPending}
                onClick={() => createTask.mutate()}
              >
                <UserRoundCheck className="size-4" />
                {createTask.isPending ? "جارٍ الإسناد..." : assignmentMode === "group" ? "إسناد المهمة للمجموعة" : "إسناد المهمة"}
              </Button>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed p-4 text-xs leading-6 text-muted-foreground">
              لا يوجد حاليًا عضو نشط أقل في التسلسل الإداري لإسناد مهمة إليه. أضف أعضاء الفريق وحدد أدوارهم من <a href="/school-team" className="font-black text-primary hover:underline">فريق المدرسة والصلاحيات</a>.
            </div>
          )}
        </aside>

        <div className="reference-screen space-y-4">
          <TaskGroup
            title="مهامي"
            empty="لا توجد مهام مسندة إليك."
            tasks={visibleAssignedToMe}
            memberMap={memberMap}
            memberId={memberId}
            completionNotes={completionNotes}
            setCompletionNotes={setCompletionNotes}
            returnNotes={returnNotes}
            setReturnNotes={setReturnNotes}
            updateMyTask={updateMyTask}
            reviewTask={reviewTask}
          />
          <TaskGroup
            title="المهام التي أسندتها"
            empty="لم تُسند مهامًا بعد."
            tasks={visibleAssignedByMe}
            memberMap={memberMap}
            memberId={memberId}
            completionNotes={completionNotes}
            setCompletionNotes={setCompletionNotes}
            returnNotes={returnNotes}
            setReturnNotes={setReturnNotes}
            updateMyTask={updateMyTask}
            reviewTask={reviewTask}
          />
        </div>
      </section>

      <section className="rounded-3xl border border-[#D9C0A3]/35 bg-[#FFFDF9] p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-black">رفع تقرير إنجاز المهام</h2>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              حدد المهام المكتملة أو المعتمدة ثم حوّلها إلى نسخة تقرير ثابتة تُرفع للمسؤول الأعلى للقراءة فقط.
            </p>
          </div>
          <span className="rounded-full bg-[#E4ECDF] px-3 py-1 text-xs font-black text-primary">{selectedReportTasks.length} محددة</span>
        </div>

        {higherMembers.length && reportableTasks.length ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-2">
              {reportableTasks.map((task) => {
                const checked = selectedReportTaskIds.includes(task.id);
                return (
                  <label key={task.id} className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 hover:border-primary/35">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelectedReportTaskIds((current) =>
                          checked ? current.filter((id) => id !== task.id) : [...current, task.id],
                        )
                      }
                      className="mt-1 size-4"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-black">{task.title}</span>
                      <span className="mt-1 block text-[11px] text-muted-foreground">
                        {task.status} · {task.category}{task.due_date ? ` · الاستحقاق ${task.due_date}` : ""}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="space-y-3 rounded-xl border bg-muted/20 p-3">
              <div>
                <Label>رفع التقرير إلى</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button type="button" size="sm" variant={reportRecipientMode === "member" ? "default" : "outline"} onClick={() => setReportRecipientMode("member")}>
                    مسؤول
                  </Button>
                  <Button type="button" size="sm" variant={reportRecipientMode === "group" ? "default" : "outline"} onClick={() => setReportRecipientMode("group")} disabled={!permissionGroups.length}>
                    مجموعة
                  </Button>
                </div>
                {reportRecipientMode === "member" ? (
                  <select
                    value={reportRecipientId}
                    onChange={(e) => setReportRecipientId(e.target.value)}
                    className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="">اختر المسؤول الأعلى</option>
                    {higherMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.display_name || "عضو المدرسة"} · {roleLabel(member.role)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={reportRecipientGroupId}
                    onChange={(e) => setReportRecipientGroupId(e.target.value)}
                    className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="">اختر المجموعة الإدارية</option>
                    {permissionGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} · {group.member_ids?.length ?? 0} عضو
                      </option>
                    ))}
                  </select>
                )}
                {reportRecipientMode === "group" && (
                  <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
                    سيرسل النظام التقرير فقط للأعضاء المؤهلين حسب التسلسل الإداري، ويتجاوز بقية أعضاء المجموعة تلقائيًا.
                  </p>
                )}
              </div>
              <div>
                <Label>ملاحظة مرافقة</Label>
                <textarea
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                  className="mt-2 min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="مثال: تقرير إنجاز مهام الأسبوع الحالي."
                />
              </div>
              <Button
                className="w-full"
                disabled={
                  !selectedReportTasks.length ||
                  (reportRecipientMode === "member" ? !reportRecipientId : !reportRecipientGroupId) ||
                  sendTaskReport.isPending
                }
                onClick={() => sendTaskReport.mutate({ rows: selectedReportTasks, recipientId: reportRecipientId })}
              >
                <ClipboardCheck className="size-4" /> {sendTaskReport.isPending ? "جارٍ الرفع..." : "تحويل المحدد إلى تقرير ورفعه"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed p-5 text-xs leading-6 text-muted-foreground">
            {!higherMembers.length
              ? "لا يوجد حاليًا مسؤول أعلى مرتبط بالمدرسة لاستلام التقرير."
              : "بعد إكمال المهام ستظهر هنا لتحديدها وتحويلها إلى تقرير إداري."}
          </div>
        )}
      </section>
    </div>
  );
}

function TaskGroup({
  title,
  empty,
  tasks,
  memberMap,
  memberId,
  completionNotes,
  setCompletionNotes,
  returnNotes,
  setReturnNotes,
  updateMyTask,
  reviewTask,
}: {
  title: string;
  empty: string;
  tasks: SchoolTask[];
  memberMap: Map<string, Member>;
  memberId: string;
  completionNotes: Record<string, string>;
  setCompletionNotes: Dispatch<SetStateAction<Record<string, string>>>;
  returnNotes: Record<string, string>;
  setReturnNotes: Dispatch<SetStateAction<Record<string, string>>>;
  updateMyTask: { mutate: (variables: { id: string; status: "قيد التنفيذ" | "مكتملة" }) => void };
  reviewTask: { mutate: (variables: { id: string; action: "اعتماد" | "إعادة" | "إلغاء" }) => void };
}) {
  return (
    <section className="rounded-3xl border border-[#D9C0A3]/35 bg-[#FFFDF9] p-4 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex items-center justify-between gap-3"><h2 className="font-black">{title}</h2><span className="text-xs text-muted-foreground">{tasks.length} مهمة</span></div>
      <div className="space-y-3">
        {tasks.map((task) => {
          const mine = task.assignee_member_id === memberId;
          const selfCreated = mine && task.creator_member_id === memberId;
          const creator = memberMap.get(task.creator_member_id);
          const assignee = memberMap.get(task.assignee_member_id);
          const late = task.status !== "مكتملة" && task.status !== "ملغاة" && task.due_date && task.due_date < today();
          return (
            <article key={task.id} className="rounded-2xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black">{task.title}</h3>
                    <StatusBadge status={task.status} />
                    {late && <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-1 text-[10px] font-black text-destructive"><AlertTriangle className="size-3" /> متأخرة</span>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {mine ? `من: ${creator?.display_name || "مسؤول المدرسة"}` : `إلى: ${assignee?.display_name || "عضو المدرسة"}`}
                    {" · "}{task.category}{" · "}{task.priority}{" · "}{task.cadence}
                  </p>
                  {task.description && <p className="mt-3 text-sm leading-7">{task.description}</p>}
                </div>
                <div className="text-left text-[11px] text-muted-foreground">
                  {task.due_date && <p className="inline-flex items-center gap-1"><CalendarClock className="size-3.5" /> {task.due_date}</p>}
                </div>
              </div>

              {task.returned_note && <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-6"><strong>ملاحظة الإعادة:</strong> {task.returned_note}</div>}
              {task.completion_note && <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs leading-6"><strong>إثبات التنفيذ:</strong> {task.completion_note}</div>}

              {mine && !["مكتملة", "معتمدة", "ملغاة"].includes(task.status) && (
                <div className="mt-4 border-t pt-3">
                  <textarea
                    value={completionNotes[task.id] ?? ""}
                    onChange={(e) => setCompletionNotes((current) => ({ ...current, [task.id]: e.target.value }))}
                    placeholder="عند الإكمال: اكتب باختصار ما تم تنفيذه أو نتيجة المهمة..."
                    className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-xs"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {task.status !== "قيد التنفيذ" && <Button size="sm" variant="outline" onClick={() => updateMyTask.mutate({ id: task.id, status: "قيد التنفيذ" })}><PlayCircle className="size-4" /> بدء التنفيذ</Button>}
                    <Button size="sm" disabled={!completionNotes[task.id]?.trim()} onClick={() => updateMyTask.mutate({ id: task.id, status: "مكتملة" })}><CheckCircle2 className="size-4" /> تم الإنجاز</Button>
                  </div>
                </div>
              )}

              {selfCreated && task.status === "مكتملة" && (
                <div className="mt-4 border-t pt-3">
                  <p className="mb-2 text-[11px] text-muted-foreground">
                    هذه مهمة دورية فعّلتها لنفسك. اعتماد الإنجاز يغلق هذا الاستحقاق وينشئ الاستحقاق التالي تلقائيًا إذا كانت متكررة.
                  </p>
                  <Button size="sm" onClick={() => reviewTask.mutate({ id: task.id, action: "اعتماد" })}>
                    <CheckCircle2 className="size-4" /> اعتماد الإنجاز
                  </Button>
                </div>
              )}

              {!mine && !["ملغاة"].includes(task.status) && (
                <div className="mt-4 border-t pt-3">
                  <Input
                    value={returnNotes[task.id] ?? ""}
                    onChange={(e) => setReturnNotes((current) => ({ ...current, [task.id]: e.target.value }))}
                    placeholder={task.status === "مكتملة" ? "ملاحظة عند الحاجة لإعادة المهمة..." : "سبب الإلغاء أو الإعادة..."}
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {task.status === "مكتملة" && <Button size="sm" onClick={() => reviewTask.mutate({ id: task.id, action: "اعتماد" })}><CheckCircle2 className="size-4" /> اعتماد الإنجاز</Button>}
                    {task.status === "مكتملة" && <Button size="sm" variant="outline" onClick={() => reviewTask.mutate({ id: task.id, action: "إعادة" })}><RotateCcw className="size-4" /> إعادة للموظف</Button>}
                    {!["مكتملة", "معتمدة"].includes(task.status) && <Button size="sm" variant="ghost" onClick={() => reviewTask.mutate({ id: task.id, action: "إلغاء" })}>إلغاء المهمة</Button>}
                  </div>
                </div>
              )}
            </article>
          );
        })}
        {!tasks.length && <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">{empty}</div>}
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: SchoolTask["status"] }) {
  const icon = ["مكتملة", "معتمدة"].includes(status) ? CheckCircle2 : status === "قيد التنفيذ" ? Clock3 : ClipboardCheck;
  const Icon = icon;
  return <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[10px] font-black"><Icon className="size-3" /> {status}</span>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="min-w-20 rounded-xl border bg-muted/30 px-3 py-2"><p className="text-lg font-black text-primary">{value}</p><p className="text-[10px] text-muted-foreground">{label}</p></div>;
}
