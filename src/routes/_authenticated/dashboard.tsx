import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  CalendarCheck,
  CalendarDays,
  HeartHandshake,
  ShieldAlert,
  Users,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/lib/school";
import { computeKpis, isPercentKpi } from "@/lib/kpi";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم | منصة الذات" },
      { name: "description", content: "مؤشرات وإحصائيات أعمال الموجه الطلابي والتنبيهات العاجلة." },
      { property: "og:title", content: "لوحة التحكم | منصة الذات" },
      { property: "og:description", content: "إحصائيات الحالات والمواظبة والسلوك والبرامج الإرشادية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const today = () => new Date().toISOString().slice(0, 10);

function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [students, cases, attendance, behavior, programs, calendar, planTasks, interviews] = await Promise.all([
        supabase.from("students").select("id, stage"),
        supabase
          .from("counseling_cases")
          .select("id, domain, case_status, priority, followup_at, last_followup, student_name"),
        supabase.from("attendance").select("id, adate, case_type, count_days"),
        supabase.from("behavior").select("id, bdate"),
        supabase.from("programs").select("id, exec_status"),
        supabase.from("calendar_events").select("id, edate, title, etype, status, priority"),
        supabase.from("plan_tasks").select("id, exec_status"),
        supabase.from("interviews").select("id, itype"),
      ]);
      return {
        students: students.data ?? [],
        cases: cases.data ?? [],
        attendance: attendance.data ?? [],
        behavior: behavior.data ?? [],
        programs: programs.data ?? [],
        calendar: calendar.data ?? [],
        planTasks: planTasks.data ?? [],
        interviews: interviews.data ?? [],
      };
    },
  });
}


const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function Dashboard() {
  const { data: school } = useSchool();
  const { data, isLoading } = useDashboard();

  const day = today();
  const students = data?.students ?? [];
  const cases = data?.cases ?? [];
  const attendance = data?.attendance ?? [];
  const behavior = data?.behavior ?? [];
  const programs = data?.programs ?? [];
  const calendar = data?.calendar ?? [];

  const activeCases = cases.filter((c) => c.case_status !== "مغلقة");
  const todayAbsence = attendance.filter((a) => a.adate === day);
  const upcoming = calendar
    .filter((e) => (e.edate ?? "") >= day && e.status !== "منفذ")
    .sort((a, b) => String(a.edate).localeCompare(String(b.edate)))
    .slice(0, 6);
  const overdue = activeCases.filter((c) => c.followup_at && String(c.followup_at) <= day);
  const donePrograms = programs.filter((p) => p.exec_status === "مكتمل");

  const stats = [
    { label: "إجمالي الطلاب", value: students.length, icon: Users, to: "/students" as const },
    { label: "الحالات الإرشادية النشطة", value: activeCases.length, icon: HeartHandshake, to: "/cases" as const },
    { label: "غياب وتأخر اليوم", value: todayAbsence.length, icon: CalendarCheck, to: "/attendance" as const },
    { label: "المواعيد المجدولة", value: upcoming.length, icon: CalendarDays, to: "/calendar" as const },
    { label: "المخالفات السلوكية", value: behavior.length, icon: ShieldAlert, to: "/behavior" as const },
    { label: "البرامج المنفذة", value: donePrograms.length, icon: CalendarDays, to: "/programs" as const },
  ];

  const domainData = Object.entries(
    cases.reduce<Record<string, number>>((acc, c) => {
      const key = (c.domain as string) || "غير محدد";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  const attendanceData = Object.entries(
    attendance.reduce<Record<string, number>>((acc, a) => {
      const key = (a.case_type as string) || "غير محدد";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  const kpis = computeKpis({
    planTasks: data?.planTasks ?? [],
    cases,
    attendance,
    interviews: data?.interviews ?? [],
    students,
  });

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-bold text-primary"><Sparkles className="size-4" />مساحة عملك اليومية</p>
            <h1 className="mt-2 text-3xl font-extrabold">أهلاً {school?.counselor_name || "بالموجه الطلابي"}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{school?.school_name || "أكمل بيانات مدرستك"} · {school?.semester || "الفصل الدراسي"}</p>
          </div>
          <Link to="/cases" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">متابعة الحالات <ArrowLeft className="size-4" /></Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, to }) => (
          <Link key={label} to={to} className="rounded-xl border bg-card p-5 shadow-sm transition-colors hover:border-primary">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{label}</p>
              <Icon className="size-5 text-primary" />
            </div>
            <p className="mt-3 text-3xl font-extrabold">{isLoading ? "—" : value}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 font-bold">مؤشرات قياس أداء التوجيه الطلابي</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {kpis.map((k) => (
            <div key={k.key} className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="mt-2 text-2xl font-extrabold text-primary">
                {k.value}
                {isPercentKpi(k.key) ? "%" : ""}
              </p>
              {isPercentKpi(k.key) && (
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(k.value, 100)}%` }} />
                </div>
              )}
              <p className="mt-2 text-[11px] text-muted-foreground">{k.hint}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-4 font-bold">توزيع الحالات حسب المجال</h2>
          {domainData.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">لا توجد بيانات بعد.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260} minWidth={0}>
              <PieChart>
                <Pie data={domainData} dataKey="value" nameKey="name" outerRadius={90} label>
                  {domainData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length] ?? "var(--chart-1)"} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-4 font-bold">مؤشر المواظبة</h2>
          {attendanceData.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">لا توجد بيانات بعد.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260} minWidth={0}>
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 font-bold">
            <AlertTriangle className="size-4 text-destructive" /> متابعات عاجلة
          </h2>
          {overdue.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">لا توجد متابعات متأخرة.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {overdue.slice(0, 6).map((c) => (
                <li key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-lg bg-secondary/60 px-3 py-2">
                  <span className="min-w-0 break-words">{c.student_name || "حالة إرشادية"}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{String(c.followup_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 font-bold">
            <CalendarDays className="size-4 text-primary" /> المواعيد القادمة
          </h2>
          {upcoming.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">لا توجد مواعيد مجدولة.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {upcoming.map((e) => (
                <li key={e.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-lg bg-secondary/60 px-3 py-2">
                  <span className="min-w-0 break-words">{e.title || e.etype}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{String(e.edate)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
