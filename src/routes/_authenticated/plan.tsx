import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardCheck, FileText, FolderCheck, Sparkles } from "lucide-react";

import { RecordPage } from "@/components/RecordPage";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { recordByKey } from "@/lib/records";

export const Route = createFileRoute("/_authenticated/plan")({
  head: () => ({
    meta: [
      { title: "الخطة التشغيلية | الذات" },
      { name: "description", content: "متابعة أهداف ومهام الخطة التشغيلية وبرامجها وشواهدها." },
    ],
  }),
  component: PlanPage,
});

function PlanPage() {
  const { data, refetch } = useQuery({
    queryKey: ["plan-execution-summary"],
    queryFn: async () => {
      const [tasks, programs, evidences] = await Promise.all([
        supabase.from("plan_tasks").select("id,task,seq,exec_status,doc_status,due_date"),
        supabase.from("programs").select("id,name,plan_task_id,exec_status"),
        supabase.from("evidences").select("id,linked_ref,linked_type"),
      ]);
      const failedSources = [
        tasks.error ? "الخطة" : null,
        programs.error ? "البرامج" : null,
        evidences.error ? "الشواهد" : null,
      ].filter(Boolean) as string[];

      return {
        tasks: tasks.error ? [] : tasks.data ?? [],
        programs: programs.error ? [] : programs.data ?? [],
        evidences: evidences.error ? [] : evidences.data ?? [],
        failedSources,
      };
    },
    staleTime: 30_000,
  });

  const tasks = data?.tasks ?? [];
  const programs = data?.programs ?? [];
  const evidences = data?.evidences ?? [];
  const day = new Date().toISOString().slice(0, 10);
  const done = tasks.filter((task) => task.exec_status === "مكتمل").length;
  const late = tasks.filter((task) => task.due_date && String(task.due_date) < day && task.exec_status !== "مكتمل").length;
  const documented = tasks.filter((task) => task.doc_status === "معتمد").length;
  const linkedPrograms = new Set(programs.filter((program) => program.plan_task_id).map((program) => String(program.plan_task_id))).size;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <div dir="rtl" className="space-y-4">
      <section className="rounded-2xl border border-primary/15 bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="text-[11px] font-black text-primary">1. الخطة التشغيلية</span>
            <h1 className="mt-1 text-xl font-black">من المهمة إلى التقرير</h1>
            <p className="mt-1 max-w-2xl text-xs leading-6 text-muted-foreground">
              تابع تنفيذ المهمة وربطها بالبرنامج والشاهد، ثم أخرج التقرير الرسمي من نفس دورة العمل.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm"><Link to="/execution"><ClipboardCheck className="size-4" /> مسار التنفيذ <ArrowLeft className="size-3.5" /></Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/programs"><Sparkles className="size-4" /> 2. البرامج <ArrowLeft className="size-3.5" /></Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/evidences"><FolderCheck className="size-4" /> 3. الشواهد</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/reports"><FileText className="size-4" /> 4. التقارير</Link></Button>
          </div>
        </div>
      </section>

      {(data?.failedSources?.length ?? 0) > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
          <span className="text-amber-800">
            تعذّر تحميل جزء من ملخص الخطة ({data?.failedSources.join("، ")}). السجل الأساسي ما زال متاحًا.
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={() => void refetch()}>
            إعادة المحاولة
          </Button>
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Summary title="إنجاز الخطة" value={`${progress}%`} hint={`${done} من ${tasks.length} مهمة مكتملة`} icon={<CheckCircle2 className="size-4" />} />
        <Summary title="مهام متأخرة" value={String(late)} hint="تجاوزت تاريخ الاستحقاق" icon={<AlertTriangle className="size-4" />} />
        <Summary title="مرتبطة ببرنامج" value={String(linkedPrograms)} hint="مهمة لها برنامج تنفيذي" icon={<Sparkles className="size-4" />} />
        <Summary title="موثقة" value={String(documented)} hint={`${evidences.length} شاهد محفوظ إجمالًا`} icon={<FolderCheck className="size-4" />} />
      </section>

      <div className="flex items-center gap-2 rounded-xl bg-primary/5 px-3 py-2 text-[11px] text-muted-foreground">
        <ClipboardCheck className="size-4 shrink-0 text-primary" />
        حالة التنفيذ والتوثيق تُقرأ من سجلاتك الحالية، وربط البرنامج يتم من حقل «مهمة الخطة المرتبطة».
      </div>

      <RecordPage config={recordByKey("plan")} hideImport />
    </div>
  );
}

function Summary({ title, value, hint, icon }: { title: string; value: string; hint: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="rounded-xl bg-primary/10 p-2 text-primary">{icon}</span>
        <strong className="text-2xl">{value}</strong>
      </div>
      <p className="mt-3 text-sm font-black">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
