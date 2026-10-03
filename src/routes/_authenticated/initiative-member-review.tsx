import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BarChart3, CalendarCheck, FileText, RefreshCw, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/initiative-member-review")({
  validateSearch: (search: Record<string, unknown>): { member?: string } =>
    typeof search["member"] === "string" ? { member: search["member"] } : {},
  head: () => ({
    meta: [
      { title: "مراجعة أعمال المعلم | الذات" },
      { name: "description", content: "مراجعة أعمال عضو المبادرة وطلابه ومتابعاته وشواهده." },
    ],
  }),
  component: InitiativeMemberReviewPage,
});

type Review = {
  initiative: { id: string; title: string; slogan?: string | null; status: string };
  school: { name?: string | null };
  member: {
    id: string;
    display_name: string;
    role_title: string;
    assigned_tasks: string[];
    status: string;
    joined_at?: string | null;
    public_access_active: boolean;
    public_access_expires_at?: string | null;
    public_access_last_used_at?: string | null;
  };
  students: Array<{
    id: string;
    full_name: string;
    student_no?: string | null;
    stage?: string | null;
    grade?: string | null;
    classroom?: string | null;
    last_followup?: {
      week_start?: string;
      attendance_status?: string | null;
      behavior_status?: string | null;
      homework_status?: string | null;
      academic_status?: string | null;
      next_action?: string | null;
    } | null;
  }>;
  followups: Array<{
    id: string;
    student_id: string;
    student_name: string;
    week_start: string;
    attendance_status?: string | null;
    punctuality_status?: string | null;
    behavior_status?: string | null;
    homework_status?: string | null;
    academic_status?: string | null;
    meeting_held: boolean;
    family_contacted: boolean;
    strengths?: string | null;
    concerns?: string | null;
    advice?: string | null;
    next_action?: string | null;
    notes?: string | null;
    updated_at: string;
  }>;
  entries: Array<{
    id: string;
    entry_type: string;
    title: string;
    details?: string | null;
    progress_percent?: number | null;
    student_name?: string | null;
    updated_at: string;
    files?: Array<{ id: string; file_name: string; mime_type: string; data_url: string; size_bytes: number }>;
  }>;
  stats: {
    students: number;
    followups: number;
    followed_students: number;
    entries: number;
    files: number;
    family_contacts: number;
    meetings: number;
    avg_progress: number;
  };
};

function InitiativeMemberReviewPage() {
  const { member = "" } = Route.useSearch();

  const query = useQuery({
    queryKey: ["initiative-member-review", member],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_initiative_member_review", {
        p_member_id: member,
      });
      if (error) throw error;
      return data as Review;
    },
    enabled: Boolean(member),
    staleTime: 10_000,
  });

  if (!member) return <div dir="rtl" className="rounded-3xl border bg-card p-8 text-center">لم يتم تحديد المعلم.</div>;
  if (query.isLoading) return <div dir="rtl" className="rounded-3xl border bg-card p-8 text-center">جارٍ تحميل أعمال المعلم...</div>;
  if (query.isError || !query.data) return <div dir="rtl" className="rounded-3xl border bg-card p-8 text-center text-destructive">تعذر تحميل أعمال هذا المعلم أو لا تملك صلاحية عرضها.</div>;

  const d = query.data;

  return (
    <div dir="rtl" className="space-y-5">
      <section className="rounded-3xl border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black text-primary">مراجعة أعمال عضو المبادرة</p>
            <h1 className="mt-1 text-2xl font-black">{d.member.display_name}</h1>
            <p className="mt-1 text-sm font-bold text-primary">{d.member.role_title}</p>
            <p className="mt-3 text-sm">{d.initiative.title}</p>
            {d.initiative.slogan && <p className="mt-1 text-xs text-muted-foreground">{d.initiative.slogan}</p>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => history.back()}><ArrowRight className="size-4" /> رجوع</Button>
            <Button variant="outline" onClick={() => void query.refetch()}><RefreshCw className="size-4" /> تحديث</Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <Metric icon={UsersRound} label="الطلاب" value={d.stats.students} />
        <Metric icon={CalendarCheck} label="المتابعات" value={d.stats.followups} />
        <Metric icon={UsersRound} label="تمت متابعتهم" value={d.stats.followed_students} />
        <Metric icon={FileText} label="السجلات" value={d.stats.entries} />
        <Metric icon={FileText} label="الشواهد" value={d.stats.files} />
        <Metric icon={CalendarCheck} label="التواصل الأسري" value={d.stats.family_contacts} />
        <Metric icon={CalendarCheck} label="اللقاءات" value={d.stats.meetings} />
        <Metric icon={BarChart3} label="متوسط الإنجاز" value={`${d.stats.avg_progress}%`} />
      </section>

      <div className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
        <div className="space-y-5">
          <section className="rounded-3xl border bg-card p-5">
            <h2 className="font-black">المهام المسندة للمعلم</h2>
            <div className="mt-3 space-y-2">
              {(d.member.assigned_tasks ?? []).map((task) => <div key={task} className="rounded-xl border px-3 py-2 text-xs">{task}</div>)}
            </div>
          </section>

          <section className="rounded-3xl border bg-card p-5">
            <h2 className="font-black">مجموعة الطلاب</h2>
            <div className="mt-3 space-y-2">
              {d.students.length === 0 ? <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">لا يوجد طلاب مسندون لهذا المعلم.</p> :
              d.students.map((s) => <article key={s.id} className="rounded-2xl border p-3">
                <p className="font-black">{s.full_name}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{[s.stage,s.grade,s.classroom].filter(Boolean).join(" · ")}{s.student_no ? ` · ${s.student_no}` : ""}</p>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  {s.last_followup?.week_start ? `آخر متابعة: ${new Date(s.last_followup.week_start).toLocaleDateString("ar-SA")}` : "لم تسجل متابعة بعد"}
                </p>
                {s.last_followup?.next_action && <p className="mt-2 text-xs"><strong>الإجراء القادم:</strong> {s.last_followup.next_action}</p>}
              </article>)}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-3xl border bg-card p-5">
            <h2 className="font-black">المتابعات الأسبوعية</h2>
            <div className="mt-3 max-h-[620px] space-y-2 overflow-y-auto">
              {d.followups.length === 0 ? <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">لا توجد متابعات بعد.</p> :
              d.followups.map((f) => <article key={f.id} className="rounded-2xl border p-3">
                <div className="flex flex-wrap justify-between gap-3">
                  <div><p className="font-black">{f.student_name}</p><p className="mt-1 text-[10px] text-muted-foreground">{new Date(f.week_start).toLocaleDateString("ar-SA")}</p></div>
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    {f.meeting_held && <span className="rounded-full bg-muted px-2 py-1">لقاء طالب</span>}
                    {f.family_contacted && <span className="rounded-full bg-muted px-2 py-1">تواصل أسري</span>}
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">{[f.attendance_status,f.punctuality_status,f.behavior_status,f.homework_status,f.academic_status].filter(Boolean).join(" · ")}</p>
                {f.strengths && <p className="mt-2 text-xs"><strong>نقاط القوة:</strong> {f.strengths}</p>}
                {f.concerns && <p className="mt-1 text-xs"><strong>يحتاج متابعة:</strong> {f.concerns}</p>}
                {f.next_action && <p className="mt-1 text-xs"><strong>الإجراء القادم:</strong> {f.next_action}</p>}
              </article>)}
            </div>
          </section>

          <section className="rounded-3xl border bg-card p-5">
            <h2 className="font-black">سجل الإنجاز والشواهد</h2>
            <div className="mt-3 space-y-2">
              {d.entries.length === 0 ? <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">لا توجد سجلات أو شواهد بعد.</p> :
              d.entries.map((e) => <article key={e.id} className="rounded-2xl border p-3">
                <div className="flex justify-between gap-3">
                  <div><p className="font-black">{e.title}</p><p className="mt-1 text-[10px] text-muted-foreground">{e.student_name || "عام"} · {new Date(e.updated_at).toLocaleString("ar-SA")}</p></div>
                  {typeof e.progress_percent === "number" && <span className="text-sm font-black text-primary">{e.progress_percent}%</span>}
                </div>
                {e.details && <p className="mt-2 text-xs leading-6 text-muted-foreground">{e.details}</p>}
                {(e.files ?? []).length > 0 && <div className="mt-3 flex flex-wrap gap-2">{(e.files ?? []).map((file) => <a key={file.id} href={file.data_url} target="_blank" rel="noreferrer" className="rounded-xl border px-3 py-2 text-xs font-bold">{file.file_name}</a>)}</div>}
              </article>)}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof UsersRound; label: string; value: string | number }) {
  return <div className="rounded-2xl border bg-card p-3 text-center"><Icon className="mx-auto size-4 text-primary" /><p className="mt-2 text-xl font-black text-primary">{value}</p><p className="mt-1 text-[9px] font-bold text-muted-foreground">{label}</p></div>;
}
