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
  Plus,
  UserCheck,
  ClipboardList,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2,
  Zap,
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

const COLORS = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ec4899"];

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
    { 
      label: "إجمالي الطلاب", 
      value: students.length, 
      icon: Users, 
      to: "/students" as const, 
      gradient: "from-blue-500/20 to-indigo-500/10",
      iconColor: "text-blue-500",
      badge: "طالب" 
    },
    { 
      label: "الحالات النشطة", 
      value: activeCases.length, 
      icon: HeartHandshake, 
      to: "/cases" as const, 
      gradient: "from-rose-500/20 to-pink-500/10",
      iconColor: "text-rose-500",
      badge: "متابعة" 
    },
    { 
      label: "غياب وتأخر اليوم", 
      value: todayAbsence.length, 
      icon: CalendarCheck, 
      to: "/attendance" as const, 
      gradient: "from-amber-500/20 to-orange-500/10",
      iconColor: "text-amber-500",
      badge: "اليوم" 
    },
    { 
      label: "المواعيد المجدولة", 
      value: upcoming.length, 
      icon: CalendarDays, 
      to: "/calendar" as const, 
      gradient: "from-emerald-500/20 to-teal-500/10",
      iconColor: "text-emerald-500",
      badge: "قريباً" 
    },
    { 
      label: "المخالفات السلوكية", 
      value: behavior.length, 
      icon: ShieldAlert, 
      to: "/behavior" as const, 
      gradient: "from-violet-500/20 to-purple-500/10",
      iconColor: "text-violet-500",
      badge: "سجل" 
    },
    { 
      label: "البرامج المنفذة", 
      value: donePrograms.length, 
      icon: CheckCircle2, 
      to: "/programs" as const, 
      gradient: "from-cyan-500/20 to-blue-500/10",
      iconColor: "text-cyan-500",
      badge: "مكتمل" 
    },
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
    { label: "حالة إرشادية جديدة", to: "/cases" as const, icon: Plus },
    { label: "تسجيل مقابلة", to: "/interviews" as const, icon: UserCheck },
    { label: "رصد مواظبة", to: "/attendance" as const, icon: ClipboardList },
    { label: "إحالة جديدة", to: "/referrals" as const, icon: Zap },
    { label: "تقرير رسمي", to: "/reports" as const, icon: FileText },
  ];

  return (
    <div className="space-y-6 dir-rtl">
      
      {/* 1. Hero Card - تصميم عصري شبابي بتدرج ناعم */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-6 text-primary-foreground shadow-xl shadow-primary/10 sm:p-8">
        <div className="absolute -left-12 -top-12 size-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -right-12 -bottom-12 size-48 rounded-full bg-black/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-xs font-medium backdrop-blur-md">
              <Sparkles className="size-3.5 text-amber-300" />
              <span>مساحة العمل اليومية</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-4xl">
              أهلاً {school?.counselor_name || "بالموجه الطلابي"} 👋
            </h1>
            <p className="text-xs font-medium text-primary-foreground/80 sm:text-sm">
              {school?.school_name || "أكمل بيانات مدرستك"} · {school?.semester || "الفصل الدراسي الحالي"}
            </p>
          </div>

          <Link
            to="/cases"
            className="inline-flex h-12 items-center justify-center gap-2.5 rounded-2xl bg-white px-6 text-sm font-extrabold text-primary shadow-lg transition-all hover:scale-105 active:scale-95"
          >
            <span>متابعة الحالات</span>
            <ArrowLeft className="size-4" />
          </Link>
        </div>
      </div>

      {/* 2. Quick Action Pills - أزرار سريعة شبابية */}
      <div className="flex flex-wrap items-center gap-2.5">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              to={action.to}
              className="group inline-flex items-center gap-2 rounded-2xl border border-border/60 bg-card px-4 py-2.5 text-xs font-bold text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:shadow-md"
            >
              <div className="rounded-lg bg-primary/10 p-1 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="size-3.5" />
              </div>
              <span>{action.label}</span>
            </Link>
          );
        })}
      </div>

      {/* 3. Stat Grid - بطاقات كروت حديثة لمراحل الإحصائيات */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, to, gradient, iconColor, badge }) => (
          <Link
            key={label}
            to={to}
            className={`group relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br ${gradient} p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-muted-foreground">{label}</span>
              <div className={`rounded-2xl bg-background/80 p-3 shadow-sm backdrop-blur-md ${iconColor}`}>
                <Icon className="size-5" />
              </div>
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <p className="text-3xl font-black tracking-tight text-foreground">
                {isLoading ? "—" : value}
              </p>
              <span className="rounded-full bg-background/60 px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground backdrop-blur-sm">
                {badge}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* 4. KPI Performance Meter - قسم المؤشرات بحلقات قياس برتقالية وعصرية */}
      <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between border-b border-border/40 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-foreground">مؤشرات الأداء والإنجاز</h2>
              <p className="text-[11px] font-medium text-muted-foreground">متابعة دقيقة لمستهدفات الفصل الدراسي</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {kpis.map((k) => (
            <div key={k.key} className="relative overflow-hidden rounded-2xl border border-border/50 bg-background/60 p-4 transition-all hover:border-primary/40">
              <p className="text-xs font-bold text-muted-foreground">{k.label}</p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-black text-primary">{k.value}</span>
                {isPercentKpi(k.key) && <span className="text-xs font-bold text-primary">%</span>}
              </div>

              {isPercentKpi(k.key) && (
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-700"
                    style={{ width: `${Math.min(k.value, 100)}%` }}
                  />
                </div>
              )}
              <p className="mt-2.5 text-[10px] font-semibold text-muted-foreground/80">{k.hint}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Visual Data Charts - رسوم بيانية عصرية */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-black text-foreground">توزيع الحالات حسب المجال</h2>
          {domainData.length === 0 ? (
            <div className="flex h-56 items-center justify-center text-xs font-bold text-muted-foreground">
              لا توجد بيانات مسجلة حالياً
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260} minWidth={0}>
              <PieChart>
                <Pie data={domainData} dataKey="value" nameKey="name" outerRadius={85} innerRadius={45} paddingAngle={4} label>
                  {domainData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-black text-foreground">مؤشر المواظبة والغياب</h2>
          {attendanceData.length === 0 ? (
            <div className="flex h-56 items-center justify-center text-xs font-bold text-muted-foreground">
              لا توجد بيانات مسجلة حالياً
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260} minWidth={0}>
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 6. Notifications & Agenda Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* المتابعات العاجلة */}
        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-rose-500/10 p-2 text-rose-500">
                <AlertTriangle className="size-4" />
              </div>
              <h2 className="text-sm font-black text-foreground">متابعات عاجلة</h2>
            </div>
            <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-bold text-rose-500">
              {overdue.length} متأخرة
            </span>
          </div>

          {overdue.length === 0 ? (
            <div className="py-10 text-center text-xs font-bold text-muted-foreground">
              لا توجد أي متابعات عاجلة اليوم 👌
            </div>
          ) : (
            <div className="space-y-2.5">
              {overdue.slice(0, 5).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3.5 text-xs transition-colors hover:bg-rose-500/10"
                >
                  <span className="font-extrabold text-foreground">{c.student_name || "حالة إرشادية"}</span>
                  <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-rose-500">
                    <Clock className="size-3.5" />
                    <span>{String(c.followup_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* المواعيد القادمة */}
        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-500">
                <CalendarDays className="size-4" />
              </div>
              <h2 className="text-sm font-black text-foreground">المواعيد القادمة</h2>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-500">
              جدول للأيام القادمة
            </span>
          </div>

          {upcoming.length === 0 ? (
            <div className="py-10 text-center text-xs font-bold text-muted-foreground">
              لا توجد مواعيد مجدولة قادمة
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcoming.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between rounded-2xl border border-border/50 bg-background/80 p-3.5 text-xs transition-colors hover:border-primary/30"
                >
                  <span className="font-extrabold text-foreground">{e.title || e.etype}</span>
                  <span className="font-mono text-[11px] font-bold text-muted-foreground">{String(e.edate)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}