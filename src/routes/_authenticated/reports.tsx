import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
  BarChart3,
  CalendarDays,
  CheckCircle2,
  FileDown,
  FileText,
  Image as ImageIcon,
  Printer,
  RefreshCw,
  Share2,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/lib/school";
import { RECORDS, recordByKey } from "@/lib/records";
import { elementToPdf, elementToPdfFile } from "@/lib/pdf";
import { whatsappLink } from "@/lib/whatsapp";
import { computeKpis, isPercentKpi } from "@/lib/kpi";
import { displayRecordValue } from "@/lib/display";
import { OfficialFooter, OfficialHeader } from "@/components/OfficialHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "التقارير والإحصائيات | منصة الذات" },
      {
        name: "description",
        content:
          "لوحة التقارير والإحصائيات لأعمال التوجيه الطلابي مع الطباعة والتصدير PDF.",
      },
      {
        property: "og:title",
        content: "التقارير والإحصائيات | منصة الذات",
      },
      {
        property: "og:description",
        content:
          "إنشاء تقارير تحليلية وإحصائية احترافية لأعمال الموجه الطلابي.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

const DATE_FIELD: Record<string, string> = {
  cases: "opened_at",
  plan: "due_date",
  programs: "start_date",
  interviews: "idate",
  attendance: "adate",
  behavior: "bdate",
  referrals: "referral_date",
  committees: "mdate",
  evidences: "edate",
  calendar: "edate",
  reports: "report_date",
};

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

type ReportSectionKey =
  | "summary"
  | "statistics"
  | "kpis"
  | "details"
  | "evidence"
  | "analysis"
  | "recommendations"
  | "signatures";

const DEFAULT_REPORT_SECTIONS: Record<ReportSectionKey, boolean> = {
  summary: true,
  statistics: true,
  kpis: true,
  details: true,
  evidence: true,
  analysis: true,
  recommendations: true,
  signatures: true,
};

function useSectionRows(keys: string[], from: string, to: string) {
  return useQuery({
    queryKey: ["report", keys.join(","), from, to],
    queryFn: async () => {
      const out: Record<string, Record<string, unknown>[]> = {};

      for (const key of keys) {
        const config = recordByKey(key);
        const dateField = DATE_FIELD[key];

        let query = supabase.from(config.table as never).select("*");

        if (dateField && from) {
          query = query.gte(dateField, from);
        }

        if (dateField && to) {
          query = query.lte(dateField, to);
        }

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        let rows = (data ?? []) as unknown as Record<string, unknown>[];

        if (key === "evidences") {
          const paths = rows
            .map((row) => String(row["file_path"] ?? ""))
            .filter(Boolean);

          const signed = paths.length
            ? (
                await supabase.storage
                  .from("evidences")
                  .createSignedUrls(paths, 3600)
              ).data ?? []
            : [];

          const urls = new Map(
            paths.map((path, index) => [
              path,
              signed[index]?.signedUrl ?? "",
            ]),
          );

          rows = rows.map((row) => ({
            ...row,
            preview_url:
              urls.get(String(row["file_path"] ?? "")) ?? "",
          }));
        }

        out[key] = rows;
      }

      return out;
    },
  });
}

function useKpiData() {
  return useQuery({
    queryKey: ["report-kpis"],
    queryFn: async () => {
      const [
        planTasks,
        cases,
        attendance,
        interviews,
        students,
      ] = await Promise.all([
        supabase.from("plan_tasks").select("exec_status"),
        supabase
          .from("counseling_cases")
          .select("case_status, last_followup, followup_at"),
        supabase
          .from("attendance")
          .select("case_type, count_days"),
        supabase.from("interviews").select("itype"),
        supabase.from("students").select("id"),
      ]);

      return computeKpis({
        planTasks: planTasks.data ?? [],
        cases: cases.data ?? [],
        attendance: attendance.data ?? [],
        interviews: interviews.data ?? [],
        students: students.data ?? [],
      });
    },
  });
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  className = "",
}: {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${className}`}
    >
      <div className="absolute -left-8 -top-8 size-24 rounded-full bg-primary/5 transition-transform duration-500 group-hover:scale-150" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            {title}
          </p>

          <p className="mt-2 text-3xl font-black tracking-tight">
            {value}
          </p>

          {description && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" />
      </div>

      <div>
        <h2 className="font-extrabold">{title}</h2>

        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

function ReportsPage() {
  const { data: school } = useSchool();

  const [selected, setSelected] = useState<string[]>(["cases"]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [reportTitle, setReportTitle] = useState(
    "التقرير الشامل لأعمال التوجيه الطلابي",
  );

  const [reportSummary, setReportSummary] = useState("");
  const [reportNarrative, setReportNarrative] = useState("");

  const [reportSections, setReportSections] = useState<
    Record<ReportSectionKey, boolean>
  >(DEFAULT_REPORT_SECTIONS);

  const [exportingPdf, setExportingPdf] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [sharePhone, setSharePhone] = useState("");

  const printRef = useRef<HTMLDivElement>(null);

  const {
    data: sections,
    isLoading,
    isFetching,
    refetch,
  } = useSectionRows(selected, from, to);

  const { data: kpis = [] } = useKpiData();

  const merged = selected.length > 1;

  const period =
    from || to
      ? `${from || "—"} إلى ${to || "—"}`
      : "كامل العام الدراسي";

  const fileName = reportTitle.trim() || "تقرير_التوجيه_الطلابي";

  const totalRecords = useMemo(() => {
    return selected.reduce(
      (total, key) => total + (sections?.[key]?.length ?? 0),
      0,
    );
  }, [selected, sections]);

  const totalEvidence = sections?.["evidences"]?.length ?? 0;

  const totalPrograms = sections?.["programs"]?.length ?? 0;

  const totalBeneficiaries = useMemo(() => {
    const programs = sections?.["programs"] ?? [];

    return programs.reduce((sum, row) => {
      const value = Number(row["beneficiaries"] ?? 0);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
  }, [sections]);

  const programStatusData = useMemo(() => {
    const rows = sections?.["programs"] ?? [];
    const map = new Map<string, number>();

    rows.forEach((row) => {
      const status = String(row["exec_status"] ?? "غير محدد").trim() || "غير محدد";
      map.set(status, (map.get(status) ?? 0) + 1);
    });

    return [...map.entries()].map(([name, value]) => ({
      name,
      value,
    }));
  }, [sections]);

  const programDomainData = useMemo(() => {
    const rows = sections?.["programs"] ?? [];
    const map = new Map<string, number>();

    rows.forEach((row) => {
      const domain = String(row["domain"] ?? "غير محدد").trim() || "غير محدد";
      map.set(domain, (map.get(domain) ?? 0) + 1);
    });

    return [...map.entries()]
      .map(([name, value]) => ({
        name,
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [sections]);

  const selectedTitles = selected.map(
    (key) => recordByKey(key).title,
  );

  function toggleRecord(key: string) {
    setSelected((current) => {
      if (current.includes(key)) {
        if (current.length === 1) {
          return current;
        }

        return current.filter((item) => item !== key);
      }

      return [...current, key];
    });
  }

  function toggleReportSection(key: ReportSectionKey) {
    setReportSections((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function resetReport() {
    setSelected(["cases"]);
    setFrom("");
    setTo("");
    setReportTitle("التقرير الشامل لأعمال التوجيه الطلابي");
    setReportSummary("");
    setReportNarrative("");
    setReportSections(DEFAULT_REPORT_SECTIONS);

    toast.success("تمت إعادة إعداد التقرير");
  }

  async function exportPdf() {
    if (!printRef.current || exportingPdf) {
      return;
    }

    setExportingPdf(true);

    try {
      await elementToPdf(printRef.current, fileName);
      toast.success("تم تجهيز ملف PDF بنجاح");
    } catch {
      toast.error("تعذّر تصدير التقرير إلى PDF");
    } finally {
      setExportingPdf(false);
    }
  }

  async function sharePdf() {
    if (!printRef.current) {
      return;
    }

    try {
      const file = await elementToPdfFile(
        printRef.current,
        fileName,
      );

      const message =
        `السلام عليكم، مرفق ${reportTitle} للفترة: ${period}.`;

      if (
        navigator.share &&
        navigator.canShare?.({
          files: [file],
        })
      ) {
        await navigator.share({
          title: reportTitle,
          text: message,
          files: [file],
        });

        setShareOpen(false);
        return;
      }

      await elementToPdf(printRef.current, fileName);

      const link = whatsappLink(
        sharePhone,
        `${message}\nتم تنزيل ملف PDF على جهازك؛ يرجى إرفاقه في المحادثة.`,
      );

      if (!link) {
        toast.error("أدخل رقم جوال سعودي صحيحاً");
        return;
      }

      window.open(link, "_blank", "noopener,noreferrer");

      toast.info(
        "تم تنزيل التقرير وفتح واتساب؛ أرفق ملف PDF في المحادثة.",
      );

      setShareOpen(false);
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        toast.error(
          "تعذّرت مشاركة التقرير. حاول تنزيله أولاً.",
        );
      }
    }
  }

  return (
    <div dir="rtl" className="space-y-6 pb-10">
      {/* =========================================================
          HEADER
      ========================================================= */}

      <div className="no-print relative overflow-hidden rounded-3xl border bg-card p-6 shadow-sm">
        <div className="absolute -left-16 -top-20 size-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-24 right-1/3 size-64 rounded-full bg-chart-2/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
              <BarChart3 className="size-7" />
            </div>

            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight">
                  التقارير والإحصائيات
                </h1>

              </div>

              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                أنشئ تقريرًا تحليليًا متكاملًا لأعمال التوجيه
                الطلابي، خصص الأقسام التي تريدها، ثم اطبع التقرير
                أو صدّره PDF.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
              className="rounded-xl"
            >
              <RefreshCw
                className={`size-4 ${isFetching ? "animate-spin" : ""}`}
              />
              تحديث البيانات
            </Button>

            <Button
              variant="outline"
              onClick={resetReport}
              className="rounded-xl"
            >
              إعادة ضبط
            </Button>
          </div>
        </div>
      </div>

      {/* =========================================================
          STATISTICS CARDS
      ========================================================= */}

      <div className="no-print grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="إجمالي السجلات"
          value={totalRecords}
          icon={FileText}
          description="حسب السجلات والفترة المحددة"
        />

        <StatCard
          title="البرامج والأنشطة"
          value={totalPrograms}
          icon={TrendingUp}
          description="البرامج الموجودة ضمن التقرير"
        />

        <StatCard
          title="المستفيدون"
          value={totalBeneficiaries}
          icon={Users}
          description="إجمالي المستفيدين المسجلين"
        />

        <StatCard
          title="الشواهد"
          value={totalEvidence}
          icon={ImageIcon}
          description="ملفات وصور الشواهد"
        />
      </div>

      {/* =========================================================
          CHARTS
      ========================================================= */}

      <div className="no-print grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <SectionTitle
            icon={BarChart3}
            title="حالة تنفيذ البرامج"
            description="توزيع البرامج حسب حالة التنفيذ"
          />

          {programStatusData.length > 0 ? (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={programStatusData}
                  margin={{
                    top: 10,
                    right: 10,
                    left: 0,
                    bottom: 10,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    opacity={0.25}
                  />

                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                  />

                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                  />

                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                      direction: "rtl",
                    }}
                  />

                  <Bar
                    dataKey="value"
                    name="عدد البرامج"
                    radius={[8, 8, 0, 0]}
                  >
                    {programStatusData.map((_, index) => (
                      <Cell
                        key={`status-${index}`}
                        fill={
                          CHART_COLORS[index % CHART_COLORS.length] ?? "#888888"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart />
          )}
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <SectionTitle
            icon={TrendingUp}
            title="مجالات البرامج"
            description="أكثر المجالات ظهورًا في البرامج المحددة"
          />

          {programDomainData.length > 0 ? (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={programDomainData}
                  layout="vertical"
                  margin={{
                    top: 5,
                    right: 15,
                    left: 10,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    opacity={0.25}
                  />

                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    fontSize={10}
                  />

                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tickLine={false}
                    axisLine={false}
                    fontSize={10}
                  />

                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                      direction: "rtl",
                    }}
                  />

                  <Bar
                    dataKey="value"
                    name="عدد البرامج"
                    radius={[0, 8, 8, 0]}
                  >
                    {programDomainData.map((_, index) => (
                      <Cell
                        key={`domain-${index}`}
                        fill={
                          CHART_COLORS[index % CHART_COLORS.length] ?? "#888888"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart />
          )}
        </div>
      </div>

      {/* =========================================================
          REPORT BUILDER
      ========================================================= */}

      <div className="no-print rounded-2xl border bg-card p-5 shadow-sm">
        <SectionTitle
          icon={FileText}
          title="إعداد التقرير"
          description="حدد محتوى التقرير قبل طباعته أو تصديره"
        />

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <div>
              <Label className="mb-2 block text-xs font-bold">
                عنوان التقرير
              </Label>

              <Input
                value={reportTitle}
                onChange={(event) =>
                  setReportTitle(event.target.value)
                }
                className="h-11 rounded-xl"
                placeholder="اكتب عنوان التقرير"
              />
            </div>

            <div>
              <Label className="mb-2 block text-xs font-bold">
                السجلات المضمنة في التقرير
              </Label>

              <div className="flex flex-wrap gap-2">
                {RECORDS.map((record) => {
                  const active = selected.includes(record.key);

                  return (
                    <Button
                      key={record.key}
                      type="button"
                      size="sm"
                      variant={active ? "default" : "outline"}
                      onClick={() =>
                        toggleRecord(record.key)
                      }
                      className="rounded-xl"
                    >
                      {active && (
                        <CheckCircle2 className="size-3.5" />
                      )}
                      {record.title}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block text-xs font-bold">
                  من تاريخ
                </Label>

                <div className="relative">
                  <CalendarDays className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                  <Input
                    type="date"
                    value={from}
                    onChange={(event) =>
                      setFrom(event.target.value)
                    }
                    className="h-11 rounded-xl pr-10"
                  />
                </div>
              </div>

              <div>
                <Label className="mb-2 block text-xs font-bold">
                  إلى تاريخ
                </Label>

                <div className="relative">
                  <CalendarDays className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                  <Input
                    type="date"
                    value={to}
                    onChange={(event) =>
                      setTo(event.target.value)
                    }
                    className="h-11 rounded-xl pr-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Report sections */}

          <div className="rounded-2xl border bg-muted/30 p-4">
            <h3 className="mb-3 font-bold">
              أقسام التقرير
            </h3>

            <p className="mb-4 text-xs leading-5 text-muted-foreground">
              اختر الأقسام التي تريد ظهورها في النسخة النهائية
              المطبوعة.
            </p>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {(
                [
                  ["summary", "الملخص التنفيذي"],
                  ["statistics", "الإحصائيات والتحليل الرقمي"],
                  ["kpis", "مؤشرات الأداء"],
                  ["details", "تفاصيل السجلات"],
                  ["evidence", "الشواهد والصور"],
                  ["analysis", "التحليل المهني"],
                  ["recommendations", "التوصيات"],
                  ["signatures", "التوقيعات والاعتماد"],
                ] as [ReportSectionKey, string][]
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border bg-background px-3 py-2.5 text-xs transition-colors hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={reportSections[key]}
                    onChange={() =>
                      toggleReportSection(key)
                    }
                    className="size-4 accent-primary"
                  />

                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="no-print overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="font-extrabold">محتوى التقرير</h2>
          <p className="text-xs text-muted-foreground">اكتب الملخص والتحليل والتوصيات التي ستظهر في التقرير.</p>
        </div>
        <div className="p-5">
          <div className="mt-5">
            <Label
              htmlFor="report-summary"
              className="mb-2 block text-xs font-bold"
            >
              الملخص التنفيذي
            </Label>

            <Textarea
              id="report-summary"
              value={reportSummary}
              onChange={(event) =>
                setReportSummary(event.target.value)
              }
              rows={5}
              className="rounded-xl"
              placeholder="اكتب الملخص التنفيذي للتقرير."
            />
          </div>

          <div className="mt-5">
              <Label
                htmlFor="report-narrative"
                className="mb-2 block text-xs font-bold"
              >
                التحليل والتوصيات
              </Label>

              <Textarea
                id="report-narrative"
                value={reportNarrative}
                onChange={(event) =>
                  setReportNarrative(event.target.value)
                }
                rows={15}
                className="rounded-xl leading-7"
              />
          </div>
        </div>
      </div>

      {/* =========================================================
          ACTION BAR
      ========================================================= */}

      <div className="no-print sticky bottom-3 z-20 rounded-2xl border bg-background/95 p-3 shadow-xl backdrop-blur">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="px-2 text-xs text-muted-foreground">
            <span className="font-bold text-foreground">
              {selectedTitles.join("، ")}
            </span>
            <span className="mx-1">•</span>
            {period}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="rounded-xl"
            >
              <Printer className="size-4" />
              طباعة
            </Button>

            <Button
              onClick={exportPdf}
              disabled={exportingPdf}
              className="rounded-xl"
            >
              <FileDown className="size-4" />
              {exportingPdf
                ? "جارٍ تجهيز PDF..."
                : "تصدير PDF"}
            </Button>

            <Button
              variant="outline"
              onClick={() => setShareOpen(true)}
              className="rounded-xl"
            >
              <Share2 className="size-4" />
              مشاركة
            </Button>
          </div>
        </div>
      </div>

      {/* =========================================================
          PRINTABLE REPORT
      ========================================================= */}

      <div
        ref={printRef}
        className="print-area overflow-hidden rounded-3xl border border-paper-border bg-paper text-paper-foreground shadow-sm"
      >
        <div className="p-6 sm:p-8">
          <OfficialHeader
            school={school}
            title={reportTitle}
            reportType={
              merged
                ? "تقرير مجمّع"
                : "تقرير تفصيلي"
            }
            period={period}
          />

          {/* Executive summary */}

          {reportSections.summary && (
            <section className="mt-6 break-inside-avoid rounded-xl border border-paper-border bg-paper-muted p-5">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="size-4" />
                </div>

                <h2 className="font-black">
                  الملخص التنفيذي
                </h2>
              </div>

              <p className="whitespace-pre-wrap text-sm leading-8">
                {reportSummary.trim() ||
                  "لم تتم إضافة ملخص تنفيذي لهذا التقرير."}
              </p>
            </section>
          )}

          {/* Statistics */}

          {reportSections.statistics && (
            <section className="mt-7 break-inside-avoid">
              <h2 className="mb-3 border-r-4 border-primary pr-3 text-base font-black">
                الملخص الإحصائي
              </h2>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <PrintStat
                  label="إجمالي السجلات"
                  value={totalRecords}
                />

                <PrintStat
                  label="البرامج والأنشطة"
                  value={totalPrograms}
                />

                <PrintStat
                  label="المستفيدون"
                  value={totalBeneficiaries}
                />

                <PrintStat
                  label="الشواهد"
                  value={totalEvidence}
                />
              </div>

              {programStatusData.length > 0 && (
                <div className="mt-5">
                  <h3 className="mb-2 text-sm font-bold">
                    توزيع البرامج حسب حالة التنفيذ
                  </h3>

                  <table className="w-full border-collapse text-right text-xs">
                    <thead>
                      <tr className="bg-paper-muted">
                        <th className="border p-2">
                          الحالة
                        </th>

                        <th className="border p-2">
                          العدد
                        </th>

                        <th className="border p-2">
                          النسبة
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {programStatusData.map((item) => (
                        <tr key={item.name}>
                          <td className="border p-2">
                            {item.name}
                          </td>

                          <td className="border p-2 font-bold">
                            {item.value}
                          </td>

                          <td className="border p-2">
                            {totalPrograms
                              ? `${Math.round(
                                  (item.value /
                                    totalPrograms) *
                                    100,
                                )}%`
                              : "0%"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* KPIs */}

          {reportSections.kpis &&
            kpis.length > 0 && (
              <section className="mt-7 break-inside-avoid">
                <h2 className="mb-3 border-r-4 border-primary pr-3 text-base font-black">
                  مؤشرات أداء التوجيه الطلابي
                </h2>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {kpis.map((kpi) => (
                    <div
                      key={kpi.key}
                      className="rounded-xl border border-paper-border p-3 text-center"
                    >
                      <p className="text-[10px] text-paper-muted-foreground">
                        {kpi.label}
                      </p>

                      <p className="mt-1 text-2xl font-black text-primary">
                        {kpi.value}
                        {isPercentKpi(kpi.key)
                          ? "%"
                          : ""}
                      </p>

                      <p className="mt-1 text-[9px] leading-4 text-paper-muted-foreground">
                        {kpi.hint}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

          {reportSections.analysis &&
            reportNarrative && (
              <section className="mt-7 break-inside-avoid">
                <h2 className="mb-3 border-r-4 border-primary pr-3 text-base font-black">
                  التحليل والصياغة المهنية
                </h2>

                <div className="rounded-xl border border-paper-border p-5">
                  <p className="whitespace-pre-wrap text-sm leading-8">
                    {reportNarrative}
                  </p>
                </div>
              </section>
            )}

          {/* Details */}

          {reportSections.details &&
            selected.map((key) => {
              const config = recordByKey(key);
              const rows = sections?.[key] ?? [];

              const columns =
                config.fields
                  .filter((field) => field.list)
                  .slice(0, 7);

              return (
                <section
                  key={key}
                  className="mt-7 break-inside-avoid"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="border-r-4 border-primary pr-3 text-base font-black">
                      {config.title}
                    </h2>

                    <span className="rounded-full bg-paper-muted px-3 py-1 text-[10px]">
                      {rows.length} سجل
                    </span>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-paper-border">
                    <table className="w-full border-collapse text-right text-[10px]">
                      <thead>
                        <tr className="bg-paper-muted">
                          {columns.map((field) => (
                            <th
                              key={field.name}
                              className="border-b border-paper-border p-2 font-black"
                            >
                              {field.label}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {isLoading && (
                          <tr>
                            <td
                              colSpan={
                                Math.max(
                                  columns.length,
                                  1,
                                )
                              }
                              className="p-5 text-center"
                            >
                              جارٍ تحميل البيانات...
                            </td>
                          </tr>
                        )}

                        {!isLoading &&
                          rows.length === 0 && (
                            <tr>
                              <td
                                colSpan={
                                  Math.max(
                                    columns.length,
                                    1,
                                  )
                                }
                                className="p-5 text-center text-paper-muted-foreground"
                              >
                                لا توجد سجلات ضمن الفترة
                                المحددة.
                              </td>
                            </tr>
                          )}

                        {rows.map((row, index) => (
                          <tr
                            key={String(
                              row["id"] ?? index,
                            )}
                          >
                            {columns.map((field) => (
                              <td
                                key={field.name}
                                className="border-t border-paper-border p-2 align-top"
                              >
                                {displayRecordValue(
                                  row[field.name],
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}

          {/* Evidence */}

          {reportSections.evidence &&
            sections?.["evidences"] &&
            sections["evidences"].length > 0 && (
              <section className="mt-7 break-inside-avoid">
                <h2 className="mb-3 border-r-4 border-primary pr-3 text-base font-black">
                  الشواهد والمرفقات
                </h2>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {sections["evidences"]
                    .filter(
                      (row) =>
                        String(
                          row["mime_type"] ?? "",
                        ).startsWith("image/") &&
                        row["preview_url"],
                    )
                    .slice(0, 12)
                    .map((row, index) => (
                      <figure
                        key={String(
                          row["id"] ?? index,
                        )}
                        className="break-inside-avoid overflow-hidden rounded-xl border border-paper-border p-2"
                      >
                        <img
                          src={String(
                            row["preview_url"],
                          )}
                          alt={String(
                            row["name"] ??
                              "شاهد مصور",
                          )}
                          className="aspect-video w-full rounded-lg object-cover"
                        />

                        <figcaption className="mt-1 text-center text-[9px]">
                          {String(
                            row["name"] ?? "شاهد",
                          )}
                        </figcaption>
                      </figure>
                    ))}
                </div>

                <p className="mt-3 text-[10px] text-paper-muted-foreground">
                  إجمالي الشواهد المسجلة:{" "}
                  {sections["evidences"].length}
                </p>
              </section>
            )}

          {/* Recommendations */}

          {reportSections.recommendations &&
            reportNarrative && (
              <section className="mt-7 break-inside-avoid">
                <h2 className="mb-3 border-r-4 border-primary pr-3 text-base font-black">
                  التوصيات والإجراءات القادمة
                </h2>

                <div className="rounded-xl border border-paper-border bg-paper-muted p-5">
                  <p className="whitespace-pre-wrap text-sm leading-8">
                    {extractRecommendations(
                      reportNarrative,
                    )}
                  </p>
                </div>
              </section>
            )}

          {/* Signatures */}

          {reportSections.signatures && (
            <section className="mt-12 break-inside-avoid">
              <div className="grid grid-cols-2 gap-10 text-center">
                <div>
                  <p className="mb-10 text-sm font-bold">
                    الموجه الطلابي
                  </p>

                  <div className="mx-auto max-w-[180px] border-t border-black pt-2 text-xs">
                    {school?.counselor_name ||
                      "اسم الموجه الطلابي"}
                  </div>
                </div>

                <div>
                  <p className="mb-10 text-sm font-bold">
                    قائد المدرسة
                  </p>

                  <div className="mx-auto max-w-[180px] border-t border-black pt-2 text-xs">
                    {school?.principal_name ||
                      "اسم قائد المدرسة"}
                  </div>
                </div>
              </div>
            </section>
          )}

          <OfficialFooter school={school} />
        </div>
      </div>

      {/* =========================================================
          SHARE DIALOG
      ========================================================= */}

      <Dialog
        open={shareOpen}
        onOpenChange={setShareOpen}
      >
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>
              مشاركة التقرير
            </DialogTitle>

            <DialogDescription>
              إذا كان جهازك يدعم مشاركة الملفات فسيتم
              مشاركة PDF مباشرة، وإلا سيتم تنزيله وفتح
              واتساب.
            </DialogDescription>
          </DialogHeader>

          <div>
            <Label className="mb-2 block text-xs">
              رقم الجوال السعودي
            </Label>

            <Input
              value={sharePhone}
              onChange={(event) =>
                setSharePhone(event.target.value)
              }
              inputMode="tel"
              placeholder="05xxxxxxxx"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShareOpen(false)}
            >
              إلغاء
            </Button>

            <Button onClick={sharePdf}>
              <Share2 className="size-4" />
              إنشاء ومشاركة PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================
          PRINT CSS
      ========================================================= */}

      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }

          html,
          body {
            background: white !important;
          }

          body {
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }

          .no-print {
            display: none !important;
          }

          .print-area {
            display: block !important;
            width: 190mm !important;
            max-width: 190mm !important;
            min-height: 273mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            overflow: visible !important;
            background: white !important;
          }

          .print-area > div {
            padding: 0 !important;
          }

          table {
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          section {
            page-break-inside: avoid;
          }

          img {
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
        }

        @media screen {
          .print-area {
            min-height: 297mm;
          }
        }
      `}</style>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-xl border border-dashed text-center">
      <div>
        <BarChart3 className="mx-auto size-8 text-muted-foreground/40" />

        <p className="mt-2 text-sm font-bold text-muted-foreground">
          لا توجد بيانات كافية لعرض الرسم
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          أضف البرامج أو غيّر الفترة المحددة.
        </p>
      </div>
    </div>
  );
}

function PrintStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-paper-border p-4 text-center">
      <p className="text-[10px] text-paper-muted-foreground">
        {label}
      </p>

      <p className="mt-1 text-2xl font-black text-primary">
        {value}
      </p>
    </div>
  );
}

function extractRecommendations(text: string) {
  const recommendationIndex = text.indexOf("التوصيات:");

  if (recommendationIndex >= 0) {
    const nextIndex = text.indexOf(
      "الإجراء القادم:",
      recommendationIndex,
    );

    if (nextIndex >= 0) {
      return text
        .slice(
          recommendationIndex + "التوصيات:".length,
          nextIndex,
        )
        .trim();
    }

    return text
      .slice(
        recommendationIndex + "التوصيات:".length,
      )
      .trim();
  }

  return text.trim();
}
