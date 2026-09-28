import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, CalendarDays, Clock, HeartHandshake, Sparkles, Users } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/lib/school";
import { formatHijriDate } from "@/lib/date";
import { WorkspaceSectionLauncher } from "@/components/WorkspaceSectionLauncher";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم | الذات" },
      { name: "description", content: "ملخص أعمال الموجه الطلابي والمتابعات اليومية." },
    ],
  }),
  component: Dashboard,
});

const today = () => new Date().toISOString().slice(0, 10);

function useDashboard() {
  return useQuery({
    queryKey: ["dashboard-core"],
    queryFn: async () => {
      const [students, cases, programs, calendar, planTasks, interviews, evidences] = await Promise.all([
        supabase.from("students").select("id"),
        supabase.from("counseling_cases").select("id, case_status, followup_at, student_name"),
        supabase.from("programs").select("id, name, exec_status"),
        supabase.from("calendar_events").select("id, edate, etime, title, etype, status"),
        supabase.from("plan_tasks").select("id, exec_status, due_date, doc_status"),
        supabase.from("interviews").select("id, student_name, topic, followup_at"),
        supabase.from("evidences").select("id, linked_ref, linked_type"),
      ]);
      const failed = [students, cases, programs, calendar, planTasks, interviews, evidences].find((result) => result.error);
      if (failed?.error) throw failed.error;
      return {
        students: students.data ?? [],
        cases: cases.data ?? [],
        programs: programs.data ?? [],
        calendar: calendar.data ?? [],
        planTasks: planTasks.data ?? [],
        interviews: interviews.data ?? [],
        evidences: evidences.data ?? [],
      };
    },
    staleTime: 30_000,
  });
}

function Dashboard() {
  const { data: school } = useSchool();
  const { data, isLoading, isError, refetch } = useDashboard();
  const day = today();

  const activeCases = (data?.cases ?? []).filter((item) => item.case_status !== "مغلقة");
  const overdueCases = activeCases.filter((item) => item.followup_at && String(item.followup_at) <= day);
  const planTasks = data?.planTasks ?? [];
  const planDone = planTasks.filter((item) => item.exec_status === "مكتمل").length;
  const latePlan = planTasks.filter((item) => item.due_date && String(item.due_date) < day && item.exec_status !== "مكتمل");
  const missingEvidence = planTasks.filter((item) => item.doc_status === "ناقص");
  const programs = data?.programs ?? [];
  const donePrograms = programs.filter((item) => item.exec_status === "مكتمل").length;
  const programEvidenceRefs = new Set(
    (data?.evidences ?? [])
      .filter((item) => item.linked_type === "برنامج")
      .map((item) => String(item.linked_ref ?? "")),
  );
  const programsMissingEvidence = programs.filter(
    (program) =>
      program.exec_status === "مكتمل" &&
      !programEvidenceRefs.has(String(program.id)) &&
      !programEvidenceRefs.has(String(program.name ?? "")),
  );
  const upcomingFollowups = (data?.interviews ?? [])
    .filter((item) => String(item.followup_at ?? "").slice(0, 10) > day)
    .sort((a, b) => String(a.followup_at).localeCompare(String(b.followup_at)))
    .slice(0, 4);
  const todayAgenda = (data?.calendar ?? [])
    .filter((item) => item.edate === day && item.status !== "منفذ" && item.status !== "ملغي")
    .sort((a, b) => String(a.etime ?? "").localeCompare(String(b.etime ?? "")));

  const cards = [
    { label: "الطلاب", value: data?.students.length ?? 0, hint: "السجل الأساسي", to: "/students" as const, icon: Users },
    { label: "الحالات النشطة", value: activeCases.length, hint: `${overdueCases.length} متابعة مستحقة`, to: "/cases" as const, icon: HeartHandshake },
    { label: "إنجاز الخطة", value: planTasks.length ? `${Math.round((planDone / planTasks.length) * 100)}%` : "0%", hint: `${latePlan.length} مهمة متأخرة`, to: "/plan" as const, icon: Clock },
    { label: "البرامج المنفذة", value: donePrograms, hint: `${programs.length} برنامج إجمالًا`, to: "/programs" as const, icon: Sparkles },
  ];

  if (isError) {
    return (
      <div dir="rtl" className="mx-auto max-w-xl rounded-3xl border bg-card p-8 text-center shadow-sm">
        <AlertTriangle className="mx-auto size-8 text-destructive" />
        <h1 className="mt-3 text-xl font-black">تعذر تحميل لوحة العمل</h1>
        <p className="mt-2 text-sm text-muted-foreground">أعد المحاولة؛ السجلات المحفوظة لن تتأثر.</p>
        <button type="button" onClick={() => void refetch()} className="mt-5 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">إعادة المحاولة</button>
      </div>
    );
  }

  return (
    <div dir="rtl" className="dashboard-shell space-y-4">
      <section className="rounded-3xl bg-primary p-5 text-primary-foreground shadow-lg sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold text-primary-foreground/75">مساحة العمل اليومية</p>
            <h1 className="mt-1 text-2xl font-black">أهلًا {school?.counselor_name || "بالموجه الطلابي"}</h1>
            <p className="mt-1 text-xs text-primary-foreground/75">{school?.school_name || "أكمل بيانات المدرسة من الإعدادات"}</p>
          </div>
          <Link to="/cases" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-primary">
            متابعة الحالات <ArrowLeft className="size-4" />
          </Link>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} to={card.to} className="rounded-2xl border bg-card p-4 shadow-sm transition hover:border-primary/30">
              <div className="flex items-center justify-between">
                <span className="rounded-xl bg-primary/10 p-2 text-primary"><Icon className="size-4" /></span>
                <strong className="text-2xl">{isLoading ? "—" : card.value}</strong>
              </div>
              <p className="mt-3 text-sm font-black">{card.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
            </Link>
          );
        })}
      </div>

      <WorkspaceSectionLauncher />

      {(latePlan.length > 0 || missingEvidence.length > 0 || overdueCases.length > 0 || programsMissingEvidence.length > 0) && (
        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <h2 className="font-black">يحتاج انتباهك</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
            {overdueCases.length > 0 && <Link to="/cases" className="rounded-full bg-card px-3 py-2">{overdueCases.length} متابعة حالة مستحقة</Link>}
            {latePlan.length > 0 && <Link to="/plan" className="rounded-full bg-card px-3 py-2">{latePlan.length} مهمة خطة متأخرة</Link>}
            {missingEvidence.length > 0 && <Link to="/evidences" className="rounded-full bg-card px-3 py-2">{missingEvidence.length} مهمة توثيقها ناقص</Link>}
            {programsMissingEvidence.length > 0 && <Link to="/programs" className="rounded-full bg-card px-3 py-2">{programsMissingEvidence.length} برنامج مكتمل بلا شاهد</Link>}
          </div>
        </section>
      )}

      {upcomingFollowups.length > 0 && (
        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-black">المتابعات القادمة</h2>
              <p className="text-xs text-muted-foreground">أقرب مواعيد متابعة الجلسات الإرشادية.</p>
            </div>
            <Link to="/interviews" className="text-xs font-bold text-primary">فتح الجلسات</Link>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {upcomingFollowups.map((item) => (
              <div key={item.id} className="rounded-xl border bg-background p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <strong className="truncate">{item.student_name || "طالب غير محدد"}</strong>
                  <span className="font-bold text-primary">{String(item.followup_at)}</span>
                </div>
                <p className="mt-1 truncate text-muted-foreground">{item.topic || "متابعة إرشادية"}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-black">مواعيد اليوم</h2>
            <p className="text-xs text-muted-foreground">{formatHijriDate(new Date())}</p>
          </div>
          <Link to="/calendar" className="text-xs font-bold text-primary">فتح التقويم</Link>
        </div>
        {todayAgenda.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">لا توجد مواعيد مسجلة اليوم.</p>
        ) : (
          <div className="mt-3 grid gap-2">
            {todayAgenda.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-xl border bg-background p-3 text-xs">
                <span className="font-bold">{item.title || item.etype || "موعد"}</span>
                <span className="flex items-center gap-1 text-muted-foreground"><CalendarDays className="size-3.5" /> {item.etime || "غير محدد"}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
