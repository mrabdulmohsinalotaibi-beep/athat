import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  PlayCircle,
  Plus,
  RotateCcw,
  UserRoundCheck,
} from "lucide-react";
import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("عام");
  const [priority, setPriority] = useState<SchoolTask["priority"]>("متوسطة");
  const [cadence, setCadence] = useState<SchoolTask["cadence"]>("مرة واحدة");
  const [dueDate, setDueDate] = useState("");
  const [completionNotes, setCompletionNotes] = useState<Record<string, string>>({});
  const [returnNotes, setReturnNotes] = useState<Record<string, string>>({});

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
  };

  const createTask = useMutation({
    mutationFn: async () => {
      if (!assigneeId) throw new Error("اختر الموظف الذي ستسند إليه المهمة.");
      if (!title.trim()) throw new Error("اكتب عنوان المهمة.");
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
    },
    onSuccess: async () => {
      setTitle("");
      setDescription("");
      setDueDate("");
      await refresh();
      toast.success("تم إسناد المهمة للموظف.");
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

  const context = query.data?.context;
  const membership = context?.membership;
  const members = context?.members ?? [];
  const tasks = query.data?.tasks ?? [];
  const memberId = membership?.id ?? "";
  const memberMap = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);

  const lowerMembers = members.filter(
    (member) =>
      member.member_status === "active" &&
      member.id !== memberId &&
      roleRank(member.role) < roleRank(membership?.role ?? ""),
  );

  const assignedToMe = tasks.filter((task) => task.assignee_member_id === memberId && task.status !== "ملغاة");
  const assignedByMe = tasks.filter((task) => task.creator_member_id === memberId);
  const due = assignedToMe.filter(
    (task) => task.status !== "مكتملة" && task.due_date && task.due_date <= today(),
  );
  const completed = assignedToMe.filter((task) => ["مكتملة", "معتمدة"].includes(task.status)).length;

  if (query.isLoading) {
    return <div dir="rtl" className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">جارٍ تحميل المهام المدرسية...</div>;
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
      <div dir="rtl" className="rounded-2xl border bg-card p-6">
        <h1 className="text-xl font-black">اربط حسابك بفريق المدرسة أولًا</h1>
        <p className="mt-2 text-sm text-muted-foreground">بعد ربط الحساب بالمدرسة ستظهر مهامك وإمكانية الإسناد حسب دورك.</p>
        <a href="/school-team" className="mt-4 inline-block text-sm font-black text-primary hover:underline">فتح فريق المدرسة والصلاحيات</a>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-5">
      <section className="rounded-2xl border border-primary/15 bg-card p-5 shadow-sm">
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

      <section className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2"><Plus className="size-4 text-primary" /><h2 className="font-black">إسناد مهمة جديدة</h2></div>
          {lowerMembers.length ? (
            <div className="mt-4 space-y-3">
              <div>
                <Label>الموظف</Label>
                <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="">اختر الموظف</option>
                  {lowerMembers.map((member) => <option key={member.id} value={member.id}>{member.display_name || "عضو المدرسة"} · {roleLabel(member.role)}</option>)}
                </select>
              </div>
              <div><Label>عنوان المهمة</Label><Input className="mt-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: إعداد تقرير الغياب الأسبوعي" /></div>
              <div><Label>التفاصيل</Label><textarea className="mt-2 min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>التصنيف</Label><Input className="mt-2" value={category} onChange={(e) => setCategory(e.target.value)} /></div>
                <div><Label>الأولوية</Label><select className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm" value={priority} onChange={(e) => setPriority(e.target.value as SchoolTask["priority"])}><option>منخفضة</option><option>متوسطة</option><option>عالية</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>التكرار</Label><select className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm" value={cadence} onChange={(e) => setCadence(e.target.value as SchoolTask["cadence"])}><option>مرة واحدة</option><option>يومية</option><option>أسبوعية</option><option>شهرية</option><option>سنوية</option></select><p className="mt-1 text-[10px] text-muted-foreground">المهمة المتكررة تُنشئ الاستحقاق التالي تلقائيًا بعد اعتماد إنجازها من المسؤول.</p></div>
                <div><Label>الاستحقاق</Label><Input className="mt-2" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
              </div>
              <Button className="w-full" disabled={!assigneeId || !title.trim() || createTask.isPending} onClick={() => createTask.mutate()}>
                <UserRoundCheck className="size-4" /> {createTask.isPending ? "جارٍ الإسناد..." : "إسناد المهمة"}
              </Button>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed p-4 text-xs leading-6 text-muted-foreground">
              لا يوجد حاليًا عضو نشط أقل في التسلسل الإداري لإسناد مهمة إليه. أضف أعضاء الفريق وحدد أدوارهم من <a href="/school-team" className="font-black text-primary hover:underline">فريق المدرسة والصلاحيات</a>.
            </div>
          )}
        </aside>

        <div className="space-y-4">
          <TaskGroup
            title="مهامي"
            empty="لا توجد مهام مسندة إليك."
            tasks={assignedToMe}
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
            tasks={assignedByMe}
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
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3"><h2 className="font-black">{title}</h2><span className="text-xs text-muted-foreground">{tasks.length} مهمة</span></div>
      <div className="space-y-3">
        {tasks.map((task) => {
          const mine = task.assignee_member_id === memberId;
          const creator = memberMap.get(task.creator_member_id);
          const assignee = memberMap.get(task.assignee_member_id);
          const late = task.status !== "مكتملة" && task.status !== "ملغاة" && task.due_date && task.due_date < today();
          return (
            <article key={task.id} className="rounded-xl border p-4">
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
