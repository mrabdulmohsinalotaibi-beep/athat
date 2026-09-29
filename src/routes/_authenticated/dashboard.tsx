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
  Clock3,
  FileCheck2,
  FolderCheck,
  HeartHandshake,
  Inbox,
  MessageSquareText,
  Sparkles,
  Users,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/lib/school";
import { formatHijriDate } from "@/lib/date";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم | الذات" },
      { name: "description", content: "لوحة قيادة مصغرة وتفاعلية لأعمال الموجه الطلابي." },
    ],
  }),
  component: Dashboard,
});

const today = () => new Date().toISOString().slice(0, 10);

function useDashboard() {
  return useQuery({
    queryKey: ["dashboard-live-v2"],
    queryFn: async () => {
      const [
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
      ] = await Promise.all([
        supabase.from("students").select("id"),
        supabase
          .from("counseling_cases")
          .select("id,case_status,followup_at,student_name,student_id,student_no,next_action"),
        supabase.from("programs").select("id,name,exec_status"),
        supabase.from("calendar_events").select("id,edate,etime,title,etype,status"),
        supabase.from("plan_tasks").select("id,task,exec_status,due_date,doc_status"),
        supabase.from("interviews").select("id,student_name,topic,followup_at"),
        supabase.from("evidences").select("id,linked_ref,linked_type"),
        supabase.from("public_requests").select("id,status,kind,created_at"),
        supabase
          .from("feedback_messages")
          .select("id,status,category,created_at")
          .in("category", ["استشارة فردية", "إحالة طالب", "إبلاغ سري"]),
        supabase.from("posts").select("id,is_public,kind"),
      ]);

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
      };

      const failedSources = Object.entries(sources)
        .filter(([, result]) => Boolean(result.error))
        .map(([name, result]) => {
          console.warn(`[dashboard] تعذّر تحميل ${name}:`, result.error?.message);
          return name;
        });

      return {
        students: students.error ? [] : students.data ?? [],
        cases: cases.error ? [] : cases.data ?? [],
        programs: programs.error ? [] : programs.data ?? [],
        calendar: calendar.error ? [] : calendar.data ?? [],
        planTasks: planTasks.error ? [] : planTasks.data ?? [],
        interviews: interviews.error ? [] : interviews.data ?? [],
        evidences: evidences.error ? [] : evidences.data ?? [],
        publicRequests: publicRequests.error ? [] : publicRequests.data ?? [],
        feedback: feedback.error ? [] : feedback.data ?? [],
        posts: posts.error ? [] : posts.data ?? [],
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

  const primaryOpenRequests = (data?.publicRequests ?? []).filter(
    (item) => item.status !== "مغلق",
  );
  const feedbackOpenRequests = (data?.feedback ?? []).filter(
    (item) => !["تم الرد", "محفوظ"].includes(String(item.status ?? "")),
  );
  const openRequests = primaryOpenRequests.length + feedbackOpenRequests.length;

  const publishedPosts = (data?.posts ?? []).filter((item) => item.is_public).length;

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

  const attentionCount =
    overdueCases.length +
    latePlan.length +
    programsMissingEvidence.length +
    openRequests;

  const stats = [
    {
      label: "الطلاب",
      value: data?.students.length ?? 0,
      note: "المسجلون فعليًا",
      to: "/students" as const,
      icon: Users,
    },
    {
      label: "الحالات",
      value: activeCases.length,
      note: overdueCases.length ? `${overdueCases.length} متابعة مستحقة` : "لا توجد متابعة متأخرة",
      to: "/cases" as const,
      icon: HeartHandshake,
    },
    {
      label: "إنجاز الخطة",
      value: `${planPercent}%`,
      note: `${planDone} من ${planTasks.length}`,
      to: "/plan" as const,
      icon: ClipboardList,
    },
    {
      label: "طلبات واردة",
      value: openRequests,
      note: "استشارة / بلاغ / إحالة",
      to: "/posts" as const,
      icon: Inbox,
    },
  ];

  const shortcuts = [
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
      meta: programsMissingEvidence.length ? `${programsMissingEvidence.length} برنامج بلا شاهد` : "التوثيق سليم",
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
      value: planDone + donePrograms.length,
      meta: "عناصر مكتملة قابلة للتقرير",
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
  ];

  const actions = [
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
  ].slice(0, 5);

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
      <section className="rounded-2xl border border-primary/20 bg-primary px-4 py-3 text-primary-foreground shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <img src="/brand-icon.svg?v=20260929d" alt="" className="size-9 rounded-xl bg-white/10 p-0.5" />
              <div className="min-w-0">
                <h1 className="truncate text-lg font-black sm:text-xl">
                  {school?.counselor_name
                    ? `مرحبًا، ${school.counselor_name}`
                    : "لوحة الموجه الطلابي"}
                </h1>
                <p className="truncate text-[11px] text-primary-foreground/75">
                  {school?.school_name || "منصة الذات للتوجيه الطلابي"}
                  {" · "}
                  {formatHijriDate(new Date())}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {attentionCount > 0 && (
              <Link
                to="/posts"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-black hover:bg-white/20"
              >
                <BellRing className="size-4" />
                {attentionCount} تحتاج إجراء
              </Link>
            )}
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-[11px] font-bold hover:bg-white/20 disabled:opacity-60"
            >
              {isFetching ? "تحديث…" : "تحديث"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        {stats.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              to={card.to}
              className="group rounded-2xl border bg-card p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="rounded-xl bg-primary/10 p-2 text-primary">
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

      <section className="rounded-2xl border bg-card p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black">اختصارات العمل</h2>
            <p className="text-[10px] text-muted-foreground">كل رقم من بيانات حسابك الحالية.</p>
          </div>
          <span className="text-[10px] font-bold text-primary">اضغط للفتح</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {shortcuts.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.to}
                className="flex min-h-20 items-center gap-2 rounded-xl border bg-background/70 p-2.5 transition hover:border-primary/35 hover:bg-primary/[0.04]"
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

      {(actions.length > 0 || openRequests > 0 || missingDocumentation.length > 0) && (
        <section className="rounded-2xl border border-primary/15 bg-card p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black">ما يحتاج إجراء الآن</h2>
              <p className="text-[10px] text-muted-foreground">
                عناصر مستخرجة من الحالات والخطة والبرامج والطلبات الواردة.
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black text-primary">
              {attentionCount}
            </span>
          </div>

          <div className="mt-2 grid gap-2 lg:grid-cols-2">
            {openRequests > 0 && (
              <Link
                to="/posts"
                className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-2.5"
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-primary">طلبات المدونة والخدمات</p>
                  <p className="truncate text-xs font-black">
                    لديك {openRequests} طلب غير مغلق
                  </p>
                </div>
                <ArrowLeft className="size-4 shrink-0 text-primary" />
              </Link>
            )}

            {missingDocumentation.length > 0 && (
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
          </div>
        </section>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
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
              <p className="text-[10px] text-muted-foreground">من سجل الجلسات الإرشادية</p>
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
                      {item.topic || "متابعة إرشادية"}
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
