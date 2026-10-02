import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RecordPage } from "@/components/RecordPage";
import { recordByKey } from "@/lib/records";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ClipboardCheck,
  HeartHandshake,
  ShieldCheck,
  Siren,
  FileText,
  ArrowLeft,
  Stethoscope,
  UsersRound,
  Workflow,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/cases")({
  head: () => ({
    meta: [
      { title: "الحالات الخاصة | الذات" },
      {
        name: "description",
        content: "مساحة عمل الموجه الطلابي لإدارة الحالات الخاصة والرصد والمتابعة والإحالة بسرية.",
      },
      { property: "og:title", content: "الحالات الخاصة | الذات" },
      { property: "og:description", content: "إدارة ومتابعة الحالات الخاصة بسرية." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: SpecialCasesPage,
});

const workflow = [
  {
    n: "01",
    title: "الرصد والاستقبال",
    text: "سجّل الملاحظة أو مصدر الإحالة بعبارات موضوعية، وحدد مستوى الأولوية دون تشخيص أو أحكام.",
    icon: ClipboardCheck,
  },
  {
    n: "02",
    title: "التقدير الأولي",
    text: "تحقق من الاحتياج والعوامل المؤثرة، واستمع للطالب في بيئة آمنة واحفظ الحد الأدنى اللازم من البيانات.",
    icon: Stethoscope,
  },
  {
    n: "03",
    title: "خطة المساندة",
    text: "حدد هدفًا قابلًا للمتابعة، وإجراءً واضحًا، ومسؤول التنفيذ وموعد المتابعة القادم.",
    icon: HeartHandshake,
  },
  {
    n: "04",
    title: "التنسيق والإحالة",
    text: "نسّق مع ولي الأمر والجهات المدرسية المختصة وفق الصلاحيات والضوابط المعتمدة.",
    icon: UsersRound,
  },
];

function SpecialCasesPage() {
  const {
    data: cases = [],
    isError: followupError,
    refetch: refetchFollowup,
  } = useQuery({
    queryKey: ["cases-followup-center"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("counseling_cases")
        .select("id,case_no,student_id,student_no,student_name,case_status,priority,followup_at,last_followup,next_action");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
  const today = new Date().toISOString().slice(0, 10);
  const active = cases.filter((row) => row.case_status !== "مغلقة");
  const overdue = active.filter((row) => row.followup_at && String(row.followup_at).slice(0, 10) <= today);
  const urgent = active.filter((row) => ["عالية", "عاجلة", "عاجل", "مرتفعة"].includes(String(row.priority ?? "")));
  const withNextAction = active.filter((row) => String(row.next_action ?? "").trim());

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-primary/15 bg-card p-5 text-foreground shadow-[var(--shadow-soft)] sm:p-6">
        <div className="absolute -left-12 -top-16 size-48 rounded-full bg-primary/8 blur-2xl" />
        <div className="absolute -bottom-24 right-1/3 size-64 rounded-full bg-amber-200/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge className="mb-3 border border-primary/15 bg-primary/5 text-primary hover:bg-primary/10">
              مساحة عمل سرية
            </Badge>
            <h1 className="text-2xl font-black tracking-tight text-navy sm:text-3xl">الحالات الطلابية</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
              سجل موحد للموجه الطلابي لرصد الحالات الخاصة، إعداد خطة المساندة، متابعة التدخلات،
              وتوثيق الإغلاق أو الإحالة.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="/cases?new=1"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground"
            >
              إضافة حالة
            </a>
            <Link
              to="/reports"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border bg-white px-4 text-sm font-bold text-primary transition hover:border-primary/30"
            >
              <FileText className="size-4" /> تقرير رسمي <ArrowLeft className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {followupError && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
          <span className="text-amber-800">تعذّر تحميل ملخص المتابعة، لكن سجل الحالات ما زال متاحًا.</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => void refetchFollowup()}>
            إعادة المحاولة
          </Button>
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <FollowupStat title="الحالات النشطة" value={active.length} hint="مفتوحة أو قيد المتابعة" />
        <FollowupStat title="متابعة مستحقة" value={overdue.length} hint="موعدها اليوم أو قبله" />
        <FollowupStat title="أولوية مرتفعة" value={urgent.length} hint="ضمن الحالات النشطة" />
        <FollowupStat title="لها إجراء قادم" value={withNextAction.length} hint="إجراء متابعة موثق" />
      </section>

      {overdue.length > 0 && (
        <section className="rounded-2xl border border-amber-300/60 bg-amber-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-amber-950">متابعات تحتاج انتباهك</h2>
              <p className="text-xs text-amber-800">أقرب الحالات التي حان موعد متابعتها.</p>
            </div>
            <Link to="/interviews" className="text-xs font-bold text-primary">فتح الجلسات ←</Link>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {overdue.slice(0, 6).map((row) => (
              <div key={row.id} className="rounded-xl border border-amber-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <strong className="truncate text-sm">{row["student_name"] || "طالب غير محدد"}</strong>
                  <Badge variant="outline">{row.case_status || "—"}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">موعد المتابعة: {String(row.followup_at ?? "—")}</p>
                {row.next_action && <p className="mt-2 text-xs">الإجراء القادم: {String(row.next_action)}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={`/interviews?new=student&studentId=${encodeURIComponent(String(row.student_id ?? ""))}&studentNo=${encodeURIComponent(String(row.student_no ?? ""))}&studentName=${encodeURIComponent(String(row.student_name ?? ""))}&caseId=${encodeURIComponent(String(row.id))}&caseNo=${encodeURIComponent(String(row.case_no ?? ""))}`}
                    className="rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-black text-primary-foreground"
                  >
                    تسجيل متابعة
                  </a>
                  <a
                    href={`/referrals?new=student&studentId=${encodeURIComponent(String(row.student_id ?? ""))}&studentNo=${encodeURIComponent(String(row.student_no ?? ""))}&studentName=${encodeURIComponent(String(row.student_name ?? ""))}&caseId=${encodeURIComponent(String(row.id))}&caseNo=${encodeURIComponent(String(row.case_no ?? ""))}`}
                    className="rounded-lg border px-2.5 py-1.5 text-[11px] font-black text-primary"
                  >
                    إنشاء إحالة
                  </a>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/students" className="text-xs font-bold text-primary">ملفات الطلاب</Link>
            <span className="text-muted-foreground">•</span>
            <Link to="/interviews" className="text-xs font-bold text-primary">المقابلات الطلابية</Link>
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          {
            title: "الرصد الأولي",
            text: "توثيق الوقائع ومصدر الملاحظة وتاريخها بلغة مهنية محايدة.",
            icon: ClipboardCheck,
            tone: "bg-primary/10 text-primary",
          },
          {
            title: "خطة المساندة",
            text: "احتياج واضح وهدف قابل للقياس وإجراء ومسؤول وموعد متابعة.",
            icon: HeartHandshake,
            tone: "bg-[#159b88]/10 text-[#087c6e]",
          },
          {
            title: "السرية والخصوصية",
            text: "قصر الاطلاع على أصحاب الصلاحية وعدم تداول التفاصيل الحساسة.",
            icon: ShieldCheck,
            tone: "bg-sky-500/10 text-sky-700",
          },
          {
            title: "الحالات العاجلة",
            text: "اتبع إجراءات الحماية والإبلاغ المعتمدة فورًا عند وجود خطر مباشر.",
            icon: Siren,
            tone: "bg-rose-500/10 text-rose-700",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.title}
              className="border-primary/10 bg-card/90 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                <span
                  className={`flex size-10 items-center justify-center rounded-xl ${item.tone}`}
                >
                  <Icon className="size-5" />
                </span>
                <CardTitle className="text-sm">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs leading-6 text-muted-foreground">
                {item.text}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="overflow-hidden rounded-3xl border-primary/10 shadow-[var(--shadow-card)]">
        <CardHeader className="border-b bg-secondary/35">
          <CardTitle className="text-base">مسار التعامل مع الحالة</CardTitle>
          <p className="text-xs text-muted-foreground">
            دليل مختصر يساعد الموجه على توحيد التوثيق والمتابعة في كل حالة.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4">
          {workflow.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.n}
                className="rounded-2xl border border-primary/10 bg-background/70 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-primary/45">{item.n}</span>
                  <Icon className="size-5 text-primary" />
                </div>
                <h3 className="mt-4 text-sm font-black">{item.title}</h3>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">{item.text}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <section className="rounded-3xl border border-primary/15 bg-primary/[0.04] p-4 text-sm leading-7 text-foreground sm:p-5">
        <strong>تنبيه مهني:</strong> هذه الصفحة أداة لتنظيم أعمال التوجيه والتوثيق المدرسي، ولا تُعد
        بديلًا عن التقييم المتخصص أو إجراءات الحماية والإبلاغ المعتمدة. عند وجود خطر مباشر على سلامة
        الطالب، بادر بالإجراء الرسمي فورًا.
      </section>

      <RecordPage
        config={recordByKey("cases")}
        rowAction={{
          icon: <Workflow className="size-4" />,
          title: "متابعة الحالة",
          onClick: (row) => {
            const studentId = encodeURIComponent(String(row["student_id"] ?? ""));
            const studentNo = encodeURIComponent(String(row["student_no"] ?? ""));
            const studentName = encodeURIComponent(String(row["student_name"] ?? ""));
            const caseId = encodeURIComponent(String(row["id"] ?? ""));
            const caseNo = encodeURIComponent(String(row["case_no"] ?? ""));
            window.location.href = `/interviews?new=student&studentId=${studentId}&studentNo=${studentNo}&studentName=${studentName}&caseId=${caseId}&caseNo=${caseNo}`;
          },
        }}
      />
    </div>
  );
}

function FollowupStat({ title, value, hint }: { title: string; value: number; hint: string }) {
  return (
    <Card className="rounded-2xl border-primary/10 shadow-[var(--shadow-card)]">
      <CardContent className="p-4">
        <p className="text-xs font-bold text-muted-foreground">{title}</p>
        <p className="mt-2 text-2xl font-black text-primary">{value}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
