import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Circle,
  FileText,
  FolderCheck,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { EvidenceUploadDialog } from "@/components/EvidenceUpload";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/execution")({
  head: () => ({
    meta: [
      { title: "مسار التنفيذ | الذات" },
      { name: "description", content: "ربط الخطة التشغيلية بالبرامج والشواهد والتقرير في مسار عمل واحد." },
    ],
  }),
  component: ExecutionFlowPage,
});

type PlanTask = {
  id: string;
  seq?: string | null;
  task?: string | null;
  domain?: string | null;
  target_group?: string | null;
  term?: string | null;
  exec_status?: string | null;
  doc_status?: string | null;
  required_evidence?: string | null;
  due_date?: string | null;
};

type Program = {
  id: string;
  program_no?: string | null;
  name?: string | null;
  plan_task_id?: string | null;
  exec_status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  beneficiaries?: number | null;
  required_evidence?: string | null;
};

type Evidence = {
  id: string;
  name?: string | null;
  linked_type?: string | null;
  linked_ref?: string | null;
  doc_status?: string | null;
  edate?: string | null;
  file_path?: string | null;
};

function doneStatus(value: unknown) {
  return ["مكتمل", "منفذ", "معتمد"].includes(String(value ?? ""));
}

function taskExecutionPercent(task: PlanTask, taskPrograms: Program[]) {
  const taskDone = doneStatus(task.exec_status);
  const programsDone =
    taskPrograms.length > 0 && taskPrograms.every((program) => doneStatus(program.exec_status));
  return (taskDone ? 50 : 0) + (programsDone ? 50 : 0);
}

function programExecutionPercent(program: Program) {
  return (program.plan_task_id ? 20 : 0) + (doneStatus(program.exec_status) ? 80 : 0);
}

function ExecutionFlowPage() {
  const queryClient = useQueryClient();
  const [evidenceTarget, setEvidenceTarget] = useState<{ type: string; ref: string; label: string } | null>(null);
  const [linkSelections, setLinkSelections] = useState<Record<string, string>>({});

  const linkProgram = useMutation({
    mutationFn: async ({ programId, planTaskId }: { programId: string; planTaskId: string }) => {
      if (!planTaskId) throw new Error("اختر مهمة الخطة أولًا.");
      const { error } = await supabase
        .from("programs")
        .update({ plan_task_id: planTaskId })
        .eq("id", programId);
      if (error) throw error;
    },
    onSuccess: async (_, variables) => {
      setLinkSelections((current) => {
        const next = { ...current };
        delete next[variables.programId];
        return next;
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["execution-flow"] }),
        queryClient.invalidateQueries({ queryKey: ["programs"] }),
      ]);
      toast.success("تم ربط البرنامج بمهمة الخطة.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر ربط البرنامج بالخطة.");
    },
  });

  const approveProgram = useMutation({
    mutationFn: async ({ programId }: { programId: string }) => {
      const { error } = await supabase
        .from("programs")
        .update({ exec_status: "منفذ" })
        .eq("id", programId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["execution-flow"] }),
        queryClient.invalidateQueries({ queryKey: ["programs"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-live-v2"] }),
      ]);
      toast.success("تم اعتماد تنفيذ البرنامج يدويًا.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر اعتماد تنفيذ البرنامج.");
    },
  });

  const approveTask = useMutation({
    mutationFn: async ({ taskId, currentDocStatus }: { taskId: string; currentDocStatus?: string | null }) => {
      const patch: { exec_status: string; doc_status?: string } = { exec_status: "مكتمل" };
      if (!currentDocStatus || currentDocStatus === "ناقص") {
        patch.doc_status = "قيد المراجعة";
      }

      const { error } = await supabase
        .from("plan_tasks")
        .update(patch)
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["execution-flow"] }),
        queryClient.invalidateQueries({ queryKey: ["plan-execution-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-live-v2"] }),
      ]);
      toast.success("تم اعتماد تنفيذ المهمة. التوثيق بقي للمراجعة ولم يُعتمد تلقائيًا.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر اعتماد تنفيذ المهمة.");
    },
  });

  const approveDocumentation = useMutation({
    mutationFn: async ({ taskId }: { taskId: string }) => {
      const { error } = await supabase
        .from("plan_tasks")
        .update({ doc_status: "معتمد" })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["execution-flow"] }),
        queryClient.invalidateQueries({ queryKey: ["plan-execution-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-live-v2"] }),
      ]);
      toast.success("تم اعتماد التوثيق. أصبحت المهمة مكتملة ومعتمدة وجاهزة للتقرير الرسمي.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر اعتماد التوثيق.");
    },
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["execution-flow"],
    queryFn: async () => {
      const [tasks, programs, evidences] = await Promise.all([
        supabase
          .from("plan_tasks")
          .select("id,seq,task,domain,target_group,term,exec_status,doc_status,required_evidence,due_date")
          .order("due_date", { ascending: true }),
        supabase
          .from("programs")
          .select("id,program_no,name,plan_task_id,exec_status,start_date,end_date,beneficiaries,required_evidence")
          .order("created_at", { ascending: false }),
        supabase
          .from("evidences")
          .select("id,name,linked_type,linked_ref,doc_status,edate,file_path")
          .order("created_at", { ascending: false }),
      ]);

      const failures = [
        tasks.error ? "الخطة" : null,
        programs.error ? "البرامج" : null,
        evidences.error ? "الشواهد" : null,
      ].filter(Boolean) as string[];

      if (tasks.error && programs.error && evidences.error) throw tasks.error;

      return {
        tasks: (tasks.error ? [] : tasks.data ?? []) as PlanTask[],
        programs: (programs.error ? [] : programs.data ?? []) as Program[],
        evidences: (evidences.error ? [] : evidences.data ?? []) as Evidence[],
        failures,
      };
    },
    staleTime: 20_000,
    refetchOnWindowFocus: true,
  });

  const tasks = data?.tasks ?? [];
  const programs = data?.programs ?? [];
  const evidences = data?.evidences ?? [];

  const programsByTask = useMemo(() => {
    const map = new Map<string, Program[]>();
    programs.forEach((program) => {
      const key = String(program.plan_task_id ?? "");
      if (!key) return;
      map.set(key, [...(map.get(key) ?? []), program]);
    });
    return map;
  }, [programs]);

  const evidenceForProgram = (program: Program) =>
    evidences.filter(
      (evidence) =>
        evidence.linked_type === "برنامج" &&
        (String(evidence.linked_ref ?? "") === program.id ||
          (!!program.name && String(evidence.linked_ref ?? "") === String(program.name))),
    );

  const evidenceForTask = (task: PlanTask, taskPrograms: Program[]) => {
    const programIds = new Set(
      taskPrograms.flatMap((program) => [program.id, String(program.name ?? "")]).filter(Boolean),
    );
    return evidences.filter((evidence) => {
      const ref = String(evidence.linked_ref ?? "");
      return (
        (evidence.linked_type === "مهمة" && ref === task.id) ||
        (evidence.linked_type === "برنامج" && programIds.has(ref))
      );
    });
  };

  const linkedPrograms = programs.filter((program) => program.plan_task_id);
  const unlinkedPrograms = programs.filter((program) => !program.plan_task_id);
  const documentedTasks = tasks.filter(
    (task) => evidenceForTask(task, programsByTask.get(task.id) ?? []).length > 0,
  );
  const approvalReadyTasks = tasks.filter((task) => {
    const taskPrograms = programsByTask.get(task.id) ?? [];
    return (
      !doneStatus(task.exec_status) &&
      taskPrograms.length > 0 &&
      taskPrograms.every((program) => doneStatus(program.exec_status)) &&
      evidenceForTask(task, taskPrograms).length > 0
    );
  });
  const reportReadyTasks = tasks.filter((task) => {
    const taskPrograms = programsByTask.get(task.id) ?? [];
    const taskEvidences = evidenceForTask(task, taskPrograms);
    return (
      doneStatus(task.exec_status) &&
      taskPrograms.length > 0 &&
      taskPrograms.every((program) => doneStatus(program.exec_status)) &&
      taskEvidences.some((evidence) => evidence.doc_status === "معتمد") &&
      task.doc_status !== "معتمد"
    );
  });
  const fullyApprovedTasks = tasks.filter((task) => {
    const taskPrograms = programsByTask.get(task.id) ?? [];
    const taskEvidences = evidenceForTask(task, taskPrograms);
    return (
      doneStatus(task.exec_status) &&
      taskPrograms.length > 0 &&
      taskPrograms.every((program) => doneStatus(program.exec_status)) &&
      taskEvidences.some((evidence) => evidence.doc_status === "معتمد") &&
      task.doc_status === "معتمد"
    );
  });

  if (isError) {
    return (
      <div dir="rtl" className="mx-auto max-w-xl rounded-2xl border border-[#D9C0A3]/35 bg-[#FFFDF9] p-6 text-center">
        <AlertTriangle className="mx-auto size-7 text-destructive" />
        <p className="mt-2 font-black">تعذر تحميل مسار التنفيذ.</p>
        <Button className="mt-3" variant="outline" onClick={() => void refetch()}>
          <RefreshCw className="size-4" /> إعادة المحاولة
        </Button>
      </div>
    );
  }

  return (
    <div dir="rtl" className="reference-screen space-y-4">
      <section className="reference-hero relative overflow-hidden rounded-[1.75rem] border border-[#D9C0A3]/35 bg-[#FFFDF9] p-4 shadow-[var(--shadow-soft)] sm:p-5">
        <div aria-hidden="true" className="pointer-events-none absolute -left-12 -top-12 size-40 rounded-full bg-primary/8 blur-2xl" />
        <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <span className="text-[11px] font-black text-primary">مسار عمل مترابط</span>
            <h1 className="mt-1 text-xl font-black">الخطة ← البرنامج ← التنفيذ ← الشاهد ← التقرير</h1>
            <p className="mt-1 max-w-3xl text-xs leading-6 text-muted-foreground">
              تقرأ هذه الصفحة سجلاتك الحالية كما هي، وتجمعها في دورة تنفيذ واحدة دون نسخ البيانات أو إنشاء سجلات مكررة.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm"><Link to="/plan"><Plus className="size-4" /> مهمة خطة</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/programs"><Sparkles className="size-4" /> البرامج</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/reports"><FileText className="size-4" /> التقارير</Link></Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat title="مهام الخطة" value={tasks.length} hint="المصدر: الخطة التشغيلية" />
        <Stat title="برامج مرتبطة" value={linkedPrograms.length} hint={String(unlinkedPrograms.length) + " برنامج يحتاج ربطًا"} />
        <Stat title="مهام موثقة" value={documentedTasks.length} hint={String(evidences.length) + " شاهد محفوظ إجمالًا"} />
        <Stat
          title="جاهزة لاعتماد التنفيذ"
          value={approvalReadyTasks.length}
          hint={String(reportReadyTasks.length) + " جاهزة لاعتماد التقرير · " + String(fullyApprovedTasks.length) + " معتمدة بالكامل"}
        />
      </section>

      <section className="rounded-3xl border border-[#D9C0A3]/35 bg-[#FFFDF9] p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-black">مؤشر المسار الحالي</h2>
            <p className="mt-1 text-[10px] text-muted-foreground">
              نسبة الربط والتوثيق محسوبة من السجلات الحالية فقط، ولا تغيّر حالة أي سجل.
            </p>
          </div>
          <div className="grid min-w-64 grid-cols-2 gap-2 text-center">
            <ProgressMetric
              label="ربط البرامج"
              value={programs.length ? Math.round((linkedPrograms.length / programs.length) * 100) : 0}
            />
            <ProgressMetric
              label="توثيق المهام"
              value={tasks.length ? Math.round((documentedTasks.length / tasks.length) * 100) : 0}
            />
          </div>
        </div>
      </section>

      {(data?.failures.length ?? 0) > 0 && (
        <div className="rounded-xl border border-[#D9C0A3]/55 bg-[#F4ECE3]/80 p-3 text-xs text-[#4A141F]">
          تعذر تحميل جزء من المسار: {data?.failures.join("، ")}. لم يتم تعديل أي بيانات.
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-48 items-center justify-center rounded-2xl border border-[#D9C0A3]/35 bg-[#FFFDF9]">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-8 text-center">
          <p className="font-black">ابدأ بإضافة مهمة في الخطة التشغيلية.</p>
          <Button asChild className="mt-3"><Link to={"/plan?new=1" as never}>إضافة أول مهمة</Link></Button>
        </div>
      ) : (
        <section className="space-y-3">
          {tasks.map((task) => {
            const taskPrograms = programsByTask.get(task.id) ?? [];
            const taskEvidences = evidenceForTask(task, taskPrograms);
            const programDone = taskPrograms.length > 0 && taskPrograms.every((program) => doneStatus(program.exec_status));
            const taskDone = doneStatus(task.exec_status);
            const documented = taskEvidences.length > 0;
            const approvedEvidenceCount = taskEvidences.filter(
              (evidence) => evidence.doc_status === "معتمد",
            ).length;
            const evidenceApproved = approvedEvidenceCount > 0;
            const documentationApproved = task.doc_status === "معتمد";
            const readyForApproval = !taskDone && programDone && documented;
            const readyForReportApproval =
              taskDone && programDone && evidenceApproved && !documentationApproved;
            const reportReady =
              taskDone && programDone && evidenceApproved && documentationApproved;
            const executionPercent = taskExecutionPercent(task, taskPrograms);
            const documentationPercent = !documented
              ? 0
              : !evidenceApproved
                ? 50
                : documentationApproved
                  ? 100
                  : 75;
            const reportUrl = "/reports?workflow=1&planTaskId=" + encodeURIComponent(task.id);
            const newProgramUrl = "/programs?new=1&planTaskId=" + encodeURIComponent(task.id);
            const primaryProgram = taskPrograms[0];
            return (
              <article key={task.id} className="overflow-hidden rounded-3xl border border-[#D9C0A3]/35 bg-[#FFFDF9] shadow-[var(--shadow-card)]">
                <div className="flex flex-col gap-3 border-b bg-muted/20 p-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#E4ECDF] px-2 py-1 text-[9px] font-black text-primary">
                        {task.seq ? "#" + task.seq : "مهمة خطة"}
                      </span>
                      {task.domain && <span className="text-[10px] text-muted-foreground">{task.domain}</span>}
                      {task.due_date && <span className="text-[10px] text-muted-foreground">استحقاق {task.due_date}</span>}
                    </div>
                    <h2 className="mt-2 text-sm font-black">{task.task || "مهمة بدون عنوان"}</h2>
                    <div className="mt-3 grid max-w-xl grid-cols-2 gap-2">
                      <MiniProgress label="التنفيذ" value={executionPercent} />
                      <MiniProgress label="التوثيق" value={documentationPercent} />
                    </div>
                  </div>
                  <Button asChild variant={reportReady ? "default" : "outline"} size="sm">
                    <Link to={reportUrl as never}>
                      <FileText className="size-4" /> {reportReady ? "إنشاء التقرير" : "معاينة التقرير"}
                    </Link>
                  </Button>
                </div>

                {readyForApproval && (
                  <div className="flex flex-col gap-3 border-b border-primary/20 bg-primary/[0.05] p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-black text-primary">جاهز لاعتماد التنفيذ</p>
                      <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
                        اكتملت البرامج المرتبطة ويوجد شاهد محفوظ. لن يغيّر ذات حالة المهمة إلا بعد موافقتك.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={approveTask.isPending}
                      onClick={() => {
                        const approved = window.confirm(
                          "هل تعتمد تنفيذ هذه المهمة؟ سيتم تغيير حالة التنفيذ إلى «مكتمل»، وسيبقى التوثيق «قيد المراجعة» حتى اعتماده بشكل مستقل.",
                        );
                        if (approved) {
                          approveTask.mutate({ taskId: task.id, currentDocStatus: task.doc_status ?? null });
                        }
                      }}
                    >
                      {approveTask.isPending && approveTask.variables?.taskId === task.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-4" />
                      )}
                      اعتماد التنفيذ
                    </Button>
                  </div>
                )}

                {taskDone && documented && !evidenceApproved && (
                  <div className="flex flex-col gap-3 border-b border-amber-500/25 bg-amber-500/[0.06] p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-black text-[#4A141F]">الشاهد ينتظر المراجعة</p>
                      <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
                        التنفيذ معتمد، لكن لا يمكن اعتماد التوثيق قبل مراجعة شاهد واحد على الأقل واعتماده.
                      </p>
                    </div>
                    <Button asChild type="button" size="sm" variant="outline">
                      <Link to="/evidences">مراجعة الشواهد</Link>
                    </Button>
                  </div>
                )}

                {readyForReportApproval && (
                  <div className="flex flex-col gap-3 border-b border-emerald-500/25 bg-emerald-500/[0.06] p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-black text-emerald-700">جاهز لاعتماد التوثيق والتقرير</p>
                      <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
                        التنفيذ مكتمل ويوجد شاهد معتمد. لن يعتمد ذات التقرير إلا بعد موافقتك الآن.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={approveDocumentation.isPending}
                      onClick={() => {
                        const approved = window.confirm(
                          "هل تعتمد التوثيق لهذه المهمة؟ بعد الموافقة ستصبح «مكتملة ومعتمدة» وجاهزة للتقرير الرسمي.",
                        );
                        if (approved) approveDocumentation.mutate({ taskId: task.id });
                      }}
                    >
                      {approveDocumentation.isPending &&
                      approveDocumentation.variables?.taskId === task.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <FolderCheck className="size-4" />
                      )}
                      اعتماد التوثيق والتقرير
                    </Button>
                  </div>
                )}

                <div className="grid gap-0 xl:grid-cols-4">
                  <Step
                    number="1"
                    title="الخطة"
                    done={taskDone}
                    detail={readyForApproval ? "جاهز لاعتماد التنفيذ" : task.exec_status || "لم يبدأ"}
                    action={
                      readyForApproval ? (
                        <span className="text-[9px] font-bold text-primary">بانتظار موافقتك فقط</span>
                      ) : (
                        <Button asChild size="sm" variant="ghost"><Link to="/plan">فتح الخطة</Link></Button>
                      )
                    }
                  />
                  <Step
                    number="2"
                    title="البرنامج والتنفيذ"
                    done={programDone}
                    detail={taskPrograms.length ? String(taskPrograms.length) + " برنامج مرتبط" : "لا يوجد برنامج مرتبط"}
                    action={<Button asChild size="sm" variant="ghost"><Link to={newProgramUrl as never}>{taskPrograms.length ? "إضافة برنامج" : "إنشاء برنامج"}</Link></Button>}
                  />
                  <Step
                    number="3"
                    title="الشاهد"
                    done={evidenceApproved}
                    detail={
                      taskEvidences.length
                        ? String(taskEvidences.length) + " شاهد · " + String(approvedEvidenceCount) + " معتمد"
                        : "ينقصه شاهد"
                    }
                    action={
                      primaryProgram ? (
                        <Button type="button" size="sm" variant="ghost" onClick={() => setEvidenceTarget({ type: "برنامج", ref: primaryProgram.id, label: primaryProgram.name || "برنامج" })}>
                          رفع شاهد
                        </Button>
                      ) : (
                        <Button type="button" size="sm" variant="ghost" onClick={() => setEvidenceTarget({ type: "مهمة", ref: task.id, label: task.task || "مهمة" })}>
                          رفع شاهد للمهمة
                        </Button>
                      )
                    }
                  />
                  <Step
                    number="4"
                    title="التقرير"
                    done={reportReady}
                    detail={
                      reportReady
                        ? "مكتمل ومعتمد"
                        : readyForReportApproval
                          ? "جاهز لاعتمادك"
                          : taskDone && documented && !evidenceApproved
                            ? "بانتظار اعتماد الشاهد"
                            : "مسودة من السجلات الحالية"
                    }
                    action={<Button asChild size="sm" variant="ghost"><Link to={reportUrl as never}>فتح التقرير</Link></Button>}
                  />
                </div>

                {taskPrograms.length > 0 && (
                  <div className="border-t p-3">
                    <p className="mb-2 text-[10px] font-black text-muted-foreground">البرامج المرتبطة بهذه المهمة</p>
                    <div className="grid gap-2 xl:grid-cols-2">
                      {taskPrograms.map((program) => {
                        const programEvidences = evidenceForProgram(program);
                        const programDoneNow = doneStatus(program.exec_status);
                        const programReadyForApproval = !programDoneNow && programEvidences.length > 0;
                        const programUrl = "/programs?programId=" + encodeURIComponent(program.id);
                        return (
                          <div key={program.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-background/60 p-3">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-black">{program.name || "برنامج"}</p>
                              <p className="mt-1 text-[10px] text-muted-foreground">
                                {program.exec_status || "لم يبدأ"} · {programEvidences.length} شاهد
                                {program.beneficiaries != null ? " · " + program.beneficiaries + " مستفيد" : ""}
                              </p>
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                <MiniProgress label="التنفيذ" value={programExecutionPercent(program)} />
                                <MiniProgress label="التوثيق" value={programEvidences.length ? 100 : 0} />
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              <Button asChild size="sm" variant="outline"><Link to={programUrl as never}>فتح</Link></Button>
                              <Button type="button" size="sm" variant="outline" onClick={() => setEvidenceTarget({ type: "برنامج", ref: program.id, label: program.name || "برنامج" })}>
                                <FolderCheck className="size-3.5" /> شاهد
                              </Button>
                              {programReadyForApproval && (
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={approveProgram.isPending}
                                  onClick={() => {
                                    const approved = window.confirm(
                                      "يوجد شاهد محفوظ لهذا البرنامج. هل تعتمد تنفيذه الآن؟ لن تتغير الحالة تلقائيًا دون موافقتك.",
                                    );
                                    if (approved) approveProgram.mutate({ programId: program.id });
                                  }}
                                >
                                  {approveProgram.isPending && approveProgram.variables?.programId === program.id ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="size-3.5" />
                                  )}
                                  جاهز لاعتماد التنفيذ
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}

      {unlinkedPrograms.length > 0 && (
        <section className="rounded-2xl border border-[#D9C0A3]/55 bg-[#FFFDF9] p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Link2 className="size-4 text-amber-700" />
            <div>
              <h2 className="text-sm font-black">برامج تحتاج ربطًا بالخطة</h2>
              <p className="text-[10px] text-muted-foreground">هذه البرامج موجودة ولم تُربط بعد بمهمة من الخطة. لن نحذفها أو نكررها.</p>
            </div>
          </div>
          <div className="mt-3 grid gap-3 xl:grid-cols-2">
            {unlinkedPrograms.map((program) => {
              const programUrl = "/programs?programId=" + encodeURIComponent(program.id);
              const selectedTaskId = linkSelections[program.id] ?? "";
              return (
                <div key={program.id} className="rounded-xl border bg-background/60 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black">{program.name || "برنامج"}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        اختر المهمة الصحيحة ثم اضغط ربط. لن يختار النظام عنك.
                      </p>
                    </div>
                    <Button asChild size="sm" variant="ghost">
                      <Link to={programUrl as never}>فتح <ArrowLeft className="size-3.5" /></Link>
                    </Button>
                  </div>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Select
                      value={selectedTaskId}
                      onValueChange={(value) =>
                        setLinkSelections((current) => ({ ...current, [program.id]: value }))
                      }
                    >
                      <SelectTrigger className="min-w-0 flex-1 text-xs">
                        <SelectValue placeholder="اختر مهمة الخطة" />
                      </SelectTrigger>
                      <SelectContent>
                        {tasks.map((task) => (
                          <SelectItem key={task.id} value={task.id}>
                            {task.seq ? "#" + task.seq + " · " : ""}{task.task || "مهمة بدون عنوان"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!selectedTaskId || linkProgram.isPending}
                      onClick={() => linkProgram.mutate({ programId: program.id, planTaskId: selectedTaskId })}
                    >
                      {linkProgram.isPending && linkProgram.variables?.programId === program.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Link2 className="size-4" />
                      )}
                      ربط
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {evidenceTarget && (
        <EvidenceUploadDialog
          key={evidenceTarget.type + "-" + evidenceTarget.ref}
          open
          onOpenChange={(open) => {
            if (!open) {
              setEvidenceTarget(null);
              void refetch();
            }
          }}
          defaultLinkedType={evidenceTarget.type}
          defaultLinkedRef={evidenceTarget.ref}
        />
      )}
    </div>
  );
}

function ProgressMetric({ label, value }: { label: string; value: number }) {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <div className="rounded-xl border bg-[#FBF7F1] p-2">
      <strong className="text-lg">{safeValue}%</strong>
      <p className="text-[9px] font-bold text-muted-foreground">{label}</p>
    </div>
  );
}

function MiniProgress({ label, value }: { label: string; value: number }) {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[9px]">
        <span className="font-bold text-muted-foreground">{label}</span>
        <span className="font-black">{safeValue}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: safeValue + "%" }} />
      </div>
    </div>
  );
}

function Stat({ title, value, hint }: { title: string; value: number; hint: string }) {
  return (
    <div className="rounded-3xl border border-[#D9C0A3]/35 bg-[#FFFDF9] p-4 shadow-[var(--shadow-card)]">
      <strong className="text-2xl">{value}</strong>
      <p className="mt-2 text-sm font-black">{title}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function Step({
  number,
  title,
  done,
  detail,
  action,
}: {
  number: string;
  title: string;
  done: boolean;
  detail: string;
  action: React.ReactNode;
}) {
  return (
    <div className="border-b p-3 last:border-b-0 md:border-b-0 md:border-l md:last:border-l-0">
      <div className="flex items-center gap-2">
        <span className={"flex size-6 items-center justify-center rounded-full text-[10px] font-black " + (done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
          {done ? <CheckCircle2 className="size-3.5" /> : number}
        </span>
        <p className="text-xs font-black">{title}</p>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        {done ? <CheckCircle2 className="size-3.5 text-primary" /> : <Circle className="size-3.5" />}
        <span>{detail}</span>
      </div>
      <div className="mt-2">{action}</div>
    </div>
  );
}
