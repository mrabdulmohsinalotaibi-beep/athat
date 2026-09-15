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
  PlusCircle,
  ClipboardList,
  UserCheck,
  FileText,
  Activity,
  CheckCircle2,
  Clock,
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
    { label: "إجمالي الطلاب", value: students.length, icon: Users, to: "/students" as const, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "الحالات الإرشادية النشطة", value: activeCases.length, icon: HeartHandshake, to: "/cases" as const, color: "text-rose-500", bg: "bg-rose-500/10" },
    { label: "غياب وتأخر اليوم", value: todayAbsence.length, icon: CalendarCheck, to: "/attendance" as const, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "المواعيد المجدولة", value: upcoming.length, icon: CalendarDays, to: "/calendar" as const, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "المخالفات السلوكية", value: behavior.length, icon: ShieldAlert, to: "/behavior" as const, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "البرامج المنفذة", value: donePrograms.length, icon: CheckCircle2, to: "/programs" as const, color: "text-teal-500", bg: "bg-teal-500/10" },
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

  const quickActions = [
    { label: "حالة إرشادية جديدة", to: "/cases" as const, icon: PlusCircle },
    { label: "تسجيل مقابلة", to: "/interviews" as const, icon: UserCheck },
    { label: "رصد مواظبة", to: "/attendance" as const, icon: ClipboardList },
    { label: "إحالة جديدة", to: "/referrals" as const, icon: HeartHandshake },
    { label: "تقرير رسمي", to: "/reports" as const, icon: FileText },
  ];

  return (
    <div className="space-y-6 dir-rtl">
      {/* الترويسة الرئيسية */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-background p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="size-3.5" /> مساحة عملك اليومية
            </div>
            <h1 className="text-2xl font-black text-foreground sm:text-3xl">
              أهلاً {school?.counselor_name || "بالموجه الطلابي"}
            </h1>
            <p className="text-xs font-medium text-muted-foreground sm:text-sm">
              {school?.school_name || "أكمل بيانات مدرستك"} · {school?.semester || "الفصل الدراسي"}
            </p>
          </div>
          <Link
            to="/cases"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 transition-transform hover:scale-[1.02]"
          >
            <span>متابعة الحالات</span>
            <ArrowLeft className="size-4" />
          </Link>
        </div>
      </div>

      {/* شريط الإجراءات السريعة */}
      <div className="flex flex-wrap gap-2.5">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              to={action.to}
              className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card px-3.5 py-2 text-xs font-bold text-foreground shadow-sm transition-all hover:border-primary hover:bg-primary/5 hover:text-primary"
            >
              <Icon className="size-4 text-primary" />
              <span>{action.label}</span>
            </Link>
          );
        })}
      </div>

      {/* شبكة الإحصائيات الرئيسية */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, to, color, bg }) => (
          <Link
            key={label}
            to={to}
            className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">{label}</span>
              <div className={`rounded-xl p-2.5 ${bg} ${color}`}>
                <Icon className="size-5" />
              </div>
            </div>
            <p className="mt-4 text-3xl font-black tracking-tight text-foreground">
              {isLoading ? "—" : value}
            </p>
          </Link>
        ))}
      </div>

      {/* مؤشرات الأداء (KPIs) */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2 border-b border-border/40 pb-4">
          <Activity className="size-5 text-primary" />
          <h2 className="text-base font-bold text-foreground">مؤشرات قياس أداء التوجيه الطلابي</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {kpis.map((k) => (
            <div key={k.key} className="rounded-xl border border-border/50 bg-background/50 p-4">
              <p className="text-xs font-semibold text-muted-foreground">{k.label}</p>
              <p className="mt-2 text-2xl font-black text-primary">
                {k.value}
                {isPercentKpi(k.key) ? "%" : ""}
              </p>
              {isPercentKpi(k.key) && (
                <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${Math.min(k.value, 100)}%` }}
                  />
                </div>
              )}
              <p className="mt-2 text-[11px] font-medium text-muted-foreground">{k.hint}</p>
            </div>
          ))}
        </div>
      </div>

      {/* الرسوم البيانية */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-foreground">توزيع الحالات حسب المجال</h2>
          {domainData.length === 0 ? (
            <p className="py-12 text-center text-xs text-muted-foreground">لا توجد بيانات بعد.</p>
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

        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-foreground">مؤشر المواظبة</h2>
          {attendanceData.length === 0 ? (
            <p className="py-12 text-center text-xs text-muted-foreground">لا توجد بيانات بعد.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260} minWidth={0}>
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* التنبيهات والمواعيد */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* متابعات عاجلة */}
        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
            <AlertTriangle className="size-4 text-destructive" />
            <span>متابعات عاجلة</span>
          </h2>
          {overdue.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">لا توجد متابعات متأخرة.</p>
          ) : (
            <ul className="space-y-2.5">
              {overdue.slice(0, 6).map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-xs"
                >
                  <span className="font-semibold text-foreground">{c.student_name || "حالة إرشادية"}</span>
                  <span className="flex items-center gap-1 font-mono text-destructive font-medium">
                    <Clock className="size-3" />
                    {String(c.followup_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* المواعيد القادمة */}
        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
            <CalendarDays className="size-4 text-primary" />
            <span>المواعيد القادمة</span>
          </h2>
          {upcoming.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">لا توجد مواعيد مجدولة.</p>
          ) : (
            <ul className="space-y-2.5">
              {upcoming.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-xs"
                >
                  <span className="font-semibold text-foreground">{e.title || e.etype}</span>
                  <span className="font-mono text-muted-foreground font-medium">{String(e.edate)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}