import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  CheckSquare,
  FileDown,
  FileText,
  Image as ImageIcon,
  Printer,
  Share2,
  Sparkles,
  Table2,
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
import { AiDraftAssistant } from "@/components/AiDraftAssistant";

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
      {
        title: "التقارير والإحصاءات | منصة الذات",
      },
      {
        name: "description",
        content:
          "إعداد تقارير تفصيلية رسمية لأعمال التوجيه الطلابي مع الإحصاءات والتحليل والذكاء الاصطناعي والطباعة بصيغة A4.",
      },
      {
        property: "og:title",
        content: "التقارير والإحصاءات | منصة الذات",
      },
      {
        property: "og:description",
        content:
          "إنشاء تقارير ختامية ودورية ومخصصة لأعمال الموجه الطلابي.",
      },
      {
        property: "og:type",
        content: "website",
      },
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

type Row = Record<string, unknown>;

type ReportSections = {
  executive: boolean;
  statistics: boolean;
  kpis: boolean;
  details: boolean;
  evidence: boolean;
  analysis: boolean;
  recommendations: boolean;
  signatures: boolean;
};

const DEFAULT_SECTIONS: ReportSections = {
  executive: true,
  statistics: true,
  kpis: true,
  details: true,
  evidence: true,
  analysis: true,
  recommendations: true,
  signatures: true,
};

// ===== إعدادات DeepSeek =====
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL = "deepseek-chat";

const DEEPSEEK_SYSTEM_PROMPT = `
أنت مساعد متخصص في إعداد التقارير التربوية والإرشادية الرسمية في المدارس السعودية.

اكتب تقريراً رسمياً باللغة العربية الفصحى.

التزم بالبيانات المرسلة فقط.
لا تخترع أرقاماً أو أسماء أو نتائج غير موجودة.
إذا كانت معلومة غير متوفرة، استخدم عبارة "غير متوفر في البيانات".

أعد الإجابة بصيغة JSON فقط، بدون أي نص إضافي، وبدون علامات markdown أو backticks، بالشكل التالي حرفياً:
{
  "summary": "نص الملخص التنفيذي",
  "analysis": "نص التحليل المهني وتحليل الإحصاءات",
  "recommendations": "نص أبرز النتائج والتوصيات والإجراء المقترح للفترة القادمة"
}
`.trim();

type DeepSeekReportResult = {
  summary: string;
  analysis: string;
  recommendations: string;
};

async function callDeepSeek(payload: Record<string, unknown>): Promise<DeepSeekReportResult> {
  const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY as string | undefined;

  if (!apiKey) {
    throw new Error("مفتاح DeepSeek غير موجود. تأكد من ضبط VITE_DEEPSEEK_API_KEY.");
  }

  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: DEEPSEEK_SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(payload) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`DeepSeek error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const rawContent: string = data?.choices?.[0]?.message?.content ?? "{}";
  const cleaned = rawContent.replace(/```json|```/g, "").trim();

  let parsed: Partial<DeepSeekReportResult>;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("تعذر تحليل استجابة DeepSeek (JSON غير صالح).");
  }

  return {
    summary: parsed.summary ?? "",
    analysis: parsed.analysis ?? "",
    recommendations: parsed.recommendations ?? "",
  };
}

function useSectionRows(keys: string[], from: string, to: string) {
  return useQuery({
    queryKey: ["reports-detailed", keys.join(","), from, to],
    queryFn: async () => {
      const output: Record<string, Row[]> = {};

      for (const key of keys) {
        const config = recordByKey(key);
        const dateField = DATE_FIELD[key];

        let query = supabase
          .from(config.table as never)
          .select("*");

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

        let rows = (data ?? []) as unknown as Row[];

        if (key === "evidences") {
          const paths = rows
            .map((row) => String(row["file_path"] ?? ""))
            .filter(Boolean);

          if (paths.length) {
            const signedResult = await supabase.storage
              .from("evidences")
              .createSignedUrls(paths, 3600);

            const signed = signedResult.data ?? [];

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
        }

        output[key] = rows;
      }

      return output;
    },
  });
}

function useKpiData() {
  return useQuery({
    queryKey: ["report-kpis-detailed"],
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

function countByField(
  rows: Row[],
  fieldNames: string[],
): Record<string, number> {
  const result: Record<string, number> = {};

  for (const row of rows) {
    let value = "";

    for (const field of fieldNames) {
      const candidate = String(row[field] ?? "").trim();

      if (candidate) {
        value = candidate;
        break;
      }
    }

    if (!value) {
      value = "غير محدد";
    }

    result[value] = (result[value] ?? 0) + 1;
  }

  return result;
}

function formatCounts(values: Record<string, number>) {
  return Object.entries(values)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `${name}: ${count}`)
    .join("، ");
}

function ReportsPage() {
  const { data: school } = useSchool();

  const printRef = useRef<HTMLDivElement>(null);

  const [selected, setSelected] = useState<string[]>([
    "programs",
  ]);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [reportType, setReportType] = useState(
    "التقرير الختامي لأعمال التوجيه الطلابي",
  );

  const [reportTitle, setReportTitle] = useState(
    "التقرير الختامي لأعمال التوجيه الطلابي",
  );

  const [periodLabel, setPeriodLabel] = useState("");

  const [sections, setSections] =
    useState<ReportSections>(DEFAULT_SECTIONS);

  const [summary, setSummary] = useState("");

  const [analysis, setAnalysis] = useState("");

  const [recommendations, setRecommendations] = useState("");

  const [customIntro, setCustomIntro] = useState("");

  const [aiBusy, setAiBusy] = useState(false);

  const [exportingPdf, setExportingPdf] = useState(false);

  const [shareOpen, setShareOpen] = useState(false);

  const [sharePhone, setSharePhone] = useState("");

  const [showReportBuilder, setShowReportBuilder] =
    useState(false);

  const { data: rowsBySection, isLoading } = useSectionRows(
    selected,
    from,
    to,
  );

  const { data: kpis = [] } = useKpiData();

  const merged = selected.length > 1;

  const period =
    periodLabel.trim() ||
    (from || to
      ? `${from || "بداية الفترة"} إلى ${to || "نهاية الفترة"}`
      : "كامل العام الدراسي");

  const fileName = reportTitle
    .trim()
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_");

  const allRows = useMemo(() => {
    return Object.values(rowsBySection ?? {}).flat();
  }, [rowsBySection]);

  const totalRecords = allRows.length;

  const programsRows = rowsBySection?.programs ?? [];

  const beneficiaries = useMemo(() => {
    return programsRows.reduce((total, row) => {
      const number = Number(row["beneficiaries"] ?? 0);

      return total + (Number.isFinite(number) ? number : 0);
    }, 0);
  }, [programsRows]);

  const programStatus = useMemo(
    () =>
      countByField(programsRows, [
        "exec_status",
        "status",
      ]),
    [programsRows],
  );

  const domains = useMemo(
    () =>
      countByField(programsRows, [
        "domain",
        "field",
        "category",
      ]),
    [programsRows],
  );

  const targetGroups = useMemo(
    () =>
      countByField(programsRows, [
        "target_group",
        "target",
        "beneficiary_group",
      ]),
    [programsRows],
  );

  const evidenceRows = rowsBySection?.evidences ?? [];

  const imageEvidence = evidenceRows.filter((row) =>
    String(row["mime_type"] ?? "").startsWith("image/"),
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

  function toggleSection(key: keyof ReportSections) {
    setSections((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function selectAllSections() {
    setSections({
      executive: true,
      statistics: true,
      kpis: true,
      details: true,
      evidence: true,
      analysis: true,
      recommendations: true,
      signatures: true,
    });
  }

  function clearOptionalSections() {
    setSections({
      executive: true,
      statistics: true,
      kpis: false,
      details: true,
      evidence: false,
      analysis: false,
      recommendations: false,
      signatures: true,
    });
  }

  function getRowsForAi() {
    const compact: Record<string, unknown> = {};

    for (const key of selected) {
      const rows = rowsBySection?.[key] ?? [];

      compact[key] = rows.slice(0, 100).map((row) => {
        const result: Record<string, unknown> = {};

        const config = recordByKey(key);

        for (const field of config.fields.slice(0, 12)) {
          result[field.name] = row[field.name];
        }

        return result;
      });
    }

    return compact;
  }

  async function generateAiReport() {
    if (!selected.length) {
      toast.error("اختر سجلاً واحدًا على الأقل.");
      return;
    }

    setAiBusy(true);

    try {
      const data = getRowsForAi();

      const result = await callDeepSeek({
        reportType,
        title: reportTitle,
        period,
        school,
        customIntro,
        statistics: {
          totalRecords,
          programs: programsRows.length,
          beneficiaries,
          programStatus,
          domains,
          targetGroups,
        },
        records: data,
      });

      setSummary(result.summary);
      setAnalysis(result.analysis);
      setRecommendations(result.recommendations);

      toast.success("تم إنشاء التقرير بالذكاء الاصطناعي (DeepSeek)");
    } catch (error) {
      console.error(error);

      toast.error(
        "تعذر إنشاء التقرير بالذكاء الاصطناعي. يمكنك إدخال النص يدويًا أو استخدام مساعد الذكاء الاصطناعي الموجود في المشروع.",
      );
    } finally {
      setAiBusy(false);
    }
  }

  async function sharePdf() {
    if (!printRef.current) {
      return;
    }

    try {
      const file = await elementToPdfFile(
        printRef.current,
        fileName || "تقرير_التوجيه_الطلابي",
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

      await elementToPdf(
        printRef.current,
        fileName || "تقرير_التوجيه_الطلابي",
      );

      const link = whatsappLink(
        sharePhone,
        `${message}\nتم تنزيل ملف PDF على جهازك؛ يرجى إرفاقه في المحادثة.`,
      );

      if (!link) {
        toast.error(
          "أدخل رقم جوال سعودي صحيحاً.",
        );

        return;
      }

      window.open(
        link,
        "_blank",
        "noopener,noreferrer",
      );

      toast.info(
        "تم تنزيل التقرير وفتح واتساب. أرفق ملف PDF في المحادثة.",
      );

      setShareOpen(false);
    } catch (error) {
      if (
        (error as Error).name !==
        "AbortError"
      ) {
        toast.error(
          "تعذرت مشاركة التقرير.",
        );
      }
    }
  }

  async function exportPdf() {
    if (
      !printRef.current ||
      exportingPdf
    ) {
      return;
    }

    setExportingPdf(true);

    try {
      await elementToPdf(
        printRef.current,
        fileName ||
          "تقرير_التوجيه_الطلابي",
      );

      toast.success(
        "تم تجهيز ملف PDF بنجاح.",
      );
    } catch (error) {
      console.error(error);

      toast.error(
        "تعذر تصدير التقرير إلى PDF.",
      );
    } finally {
      setExportingPdf(false);
    }
  }

  const reportStats = [
    {
      label: "إجمالي السجلات",
      value: totalRecords,
    },
    {
      label: "البرامج",
      value: programsRows.length,
    },
    {
      label: "المستفيدون",
      value: beneficiaries,
    },
    {
      label: "الشواهد",
      value: evidenceRows.length,
    },
  ];

  return (
    <div
      dir="rtl"
      className="space-y-5"
    >
      <div className="no-print">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold">
              التقارير والإحصاءات
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              إعداد تقارير رسمية تفصيلية لأعمال
              التوجيه الطلابي بصيغة A4 جاهزة
              للطباعة والتصدير PDF.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setShowReportBuilder(
                  (value) => !value,
                )
              }
            >
              <CheckSquare className="size-4" />
              تخصيص التقرير
            </Button>

            <Button
              onClick={generateAiReport}
              disabled={aiBusy}
            >
              <Sparkles className="size-4" />

              {aiBusy
                ? "جارٍ إنشاء التقرير..."
                : "إنشاء بالذكاء الاصطناعي"}
            </Button>
          </div>
        </div>
      </div>

      <div className="no-print rounded-2xl border bg-card p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <Label className="mb-2 block">
              نوع التقرير
            </Label>

            <select
              value={reportType}
              onChange={(event) => {
                setReportType(
                  event.target.value,
                );

                setReportTitle(
                  event.target.value,
                );
              }}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option>
                التقرير الختامي لأعمال التوجيه الطلابي
              </option>

              <option>
                التقرير الفصلي لأعمال التوجيه الطلابي
              </option>

              <option>
                التقرير الشهري لأعمال التوجيه الطلابي
              </option>

              <option>
                تقرير البرامج والأنشطة
              </option>

              <option>
                تقرير الإحصاءات التفصيلي
              </option>

              <option>
                تقرير البرامج المنفذة
              </option>

              <option>
                تقرير الحالات والإرشاد الفردي
              </option>

              <option>
                تقرير الشواهد والإنجازات
              </option>

              <option>
                تقرير مخصص
              </option>
            </select>
          </div>

          <div>
            <Label className="mb-2 block">
              عنوان التقرير
            </Label>

            <Input
              value={reportTitle}
              onChange={(event) =>
                setReportTitle(
                  event.target.value,
                )
              }
              placeholder="اكتب عنوان التقرير"
            />
          </div>

          <div>
            <Label className="mb-2 block">
              وصف إضافي للتقرير
            </Label>

            <Input
              value={customIntro}
              onChange={(event) =>
                setCustomIntro(
                  event.target.value,
                )
              }
              placeholder="مثال: التقرير المقدم لإدارة التعليم"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <Label className="mb-2 block">
              من تاريخ
            </Label>

            <Input
              type="date"
              value={from}
              onChange={(event) =>
                setFrom(event.target.value)
              }
            />
          </div>

          <div>
            <Label className="mb-2 block">
              إلى تاريخ
            </Label>

            <Input
              type="date"
              value={to}
              onChange={(event) =>
                setTo(event.target.value)
              }
            />
          </div>

          <div>
            <Label className="mb-2 block">
              وصف الفترة
            </Label>

            <Input
              value={periodLabel}
              onChange={(event) =>
                setPeriodLabel(
                  event.target.value,
                )
              }
              placeholder="مثال: الفصل الدراسي الأول 1448هـ"
            />
          </div>
        </div>
      </div>

      <div className="no-print rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-extrabold">
              السجلات الداخلة في التقرير
            </h2>

            <p className="text-xs text-muted-foreground">
              اختر نوعًا واحدًا أو عدة أنواع لإعداد
              تقرير شامل.
            </p>
          </div>

          <FileText className="size-5 text-primary" />
        </div>

        <div className="flex flex-wrap gap-2">
          {RECORDS.map((record) => (
            <Button
              key={record.key}
              type="button"
              size="sm"
              variant={
                selected.includes(
                  record.key,
                )
                  ? "default"
                  : "outline"
              }
              className="rounded-full"
              onClick={() =>
                toggleRecord(
                  record.key,
                )
              }
            >
              {record.title}
            </Button>
          ))}
        </div>
      </div>

      {showReportBuilder && (
        <div className="no-print rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-extrabold">
                تخصيص محتوى التقرير
              </h2>

              <p className="text-xs text-muted-foreground">
                حدد الأقسام التي تريد ظهورها في
                التقرير النهائي.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={
                  selectAllSections
                }
              >
                تحديد الكل
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={
                  clearOptionalSections
                }
              >
                التقرير المختصر
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                [
                  "executive",
                  "الملخص التنفيذي",
                ],
                [
                  "statistics",
                  "الإحصاءات التفصيلية",
                ],
                [
                  "kpis",
                  "مؤشرات الأداء",
                ],
                [
                  "details",
                  "الجداول التفصيلية",
                ],
                [
                  "evidence",
                  "الصور والشواهد",
                ],
                [
                  "analysis",
                  "التحليل المهني",
                ],
                [
                  "recommendations",
                  "التوصيات",
                ],
                [
                  "signatures",
                  "التوقيعات",
                ],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-3 rounded-xl border p-3"
              >
                <input
                  type="checkbox"
                  checked={
                    sections[key]
                  }
                  onChange={() =>
                    toggleSection(key)
                  }
                  className="size-4"
                />

                <span className="text-sm font-semibold">
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="no-print grid grid-cols-2 gap-3 md:grid-cols-4">
        {reportStats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border bg-card p-4 text-center shadow-sm"
          >
            <p className="text-xs text-muted-foreground">
              {stat.label}
            </p>

            <p className="mt-1 text-2xl font-extrabold text-primary">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="no-print rounded-2xl border bg-card p-4 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Button
            onClick={() =>
              setShowReportBuilder(true)
            }
            variant="outline"
          >
            <Table2 className="size-4" />
            تخصيص الأقسام
          </Button>

          <Button
            onClick={() =>
              window.print()
            }
            variant="outline"
          >
            <Printer className="size-4" />
            طباعة A4
          </Button>

          <Button
            onClick={exportPdf}
            disabled={exportingPdf}
          >
            <FileDown className="size-4" />

            {exportingPdf
              ? "جارٍ تجهيز PDF..."
              : "تصدير PDF"}
          </Button>

          <Button
            variant="outline"
            onClick={() =>
              setShareOpen(true)
            }
          >
            <Share2 className="size-4" />
            مشاركة التقرير
          </Button>
        </div>
      </div>

      <div
        ref={printRef}
        className="print-area mx-auto max-w-[210mm] overflow-hidden rounded-xl border border-paper-border bg-paper p-[12mm] text-paper-foreground shadow-sm print:max-w-none print:rounded-none print:border-0 print:p-[12mm] print:shadow-none"
      >
        <OfficialHeader
          school={school}
          title={reportTitle}
          reportType={
            merged
              ? "تقرير مجمّع"
              : "تقرير رسمي"
          }
          period={period}
        />

        {sections.executive && (
          <section className="mt-6 break-inside-avoid">
            <div className="border-r-4 border-primary bg-paper-muted p-4">
              <h2 className="mb-2 text-base font-extrabold">
                أولاً: الملخص التنفيذي
              </h2>

              <p className="whitespace-pre-wrap text-sm leading-8">
                {summary.trim() ||
                  `يتضمن هذا التقرير عرضاً لأعمال التوجيه الطلابي المسجلة في منصة ذات خلال ${period}، ويشمل البيانات المتاحة للبرامج والأنشطة والسجلات المختارة والإحصاءات والشواهد المرتبطة بها.`}
              </p>
            </div>
          </section>
        )}

        {sections.statistics && (
          <section className="mt-7 break-inside-avoid">
            <div className="mb-3 flex items-center gap-2">
              <BarChart3 className="size-5" />

              <h2 className="text-base font-extrabold">
                ثانياً: الإحصاءات التفصيلية
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {reportStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg border p-3 text-center"
                >
                  <p className="text-xs text-paper-muted-foreground">
                    {stat.label}
                  </p>

                  <p className="mt-1 text-2xl font-extrabold text-primary">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            {programsRows.length > 0 && (
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <h3 className="mb-2 text-xs font-extrabold">
                    حالة تنفيذ البرامج
                  </h3>

                  <p className="text-xs leading-7">
                    {formatCounts(
                      programStatus,
                    ) || "لا توجد بيانات"}
                  </p>
                </div>

                <div className="rounded-lg border p-3">
                  <h3 className="mb-2 text-xs font-extrabold">
                    المجالات
                  </h3>

                  <p className="text-xs leading-7">
                    {formatCounts(
                      domains,
                    ) || "لا توجد بيانات"}
                  </p>
                </div>

                <div className="rounded-lg border p-3">
                  <h3 className="mb-2 text-xs font-extrabold">
                    الفئات المستهدفة
                  </h3>

                  <p className="text-xs leading-7">
                    {formatCounts(
                      targetGroups,
                    ) || "لا توجد بيانات"}
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        {sections.kpis &&
          kpis.length > 0 && (
            <section className="mt-7 break-inside-avoid">
              <h2 className="mb-3 text-base font-extrabold">
                ثالثاً: مؤشرات الأداء
              </h2>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {kpis.map((kpi) => (
                  <div
                    key={kpi.key}
                    className="rounded-lg border p-3 text-center"
                  >
                    <p className="text-[11px] text-paper-muted-foreground">
                      {kpi.label}
                    </p>

                    <p className="mt-1 text-xl font-extrabold text-primary">
                      {kpi.value}
                      {isPercentKpi(
                        kpi.key,
                      )
                        ? "%"
                        : ""}
                    </p>

                    <p className="mt-1 text-[9px] text-paper-muted-foreground">
                      {kpi.hint}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

        {sections.analysis && (
          <section className="mt-7 break-inside-avoid">
            <h2 className="mb-3 text-base font-extrabold">
              رابعاً: التحليل المهني
            </h2>

            <div className="rounded-lg border bg-paper-muted p-4">
              <p className="whitespace-pre-wrap text-sm leading-8">
                {analysis.trim() ||
                  `تشير البيانات المسجلة إلى تنفيذ مجموعة من أعمال التوجيه الطلابي خلال ${period}. ويظهر من الإحصاءات المسجلة توزيع الأعمال على عدد من المجالات والفئات المستهدفة، مع إمكانية الاستفادة من البيانات في تحديد الأولويات وتطوير خطط العمل المستقبلية.`}
              </p>
            </div>
          </section>
        )}

        {sections.details && (
          <section className="mt-7">
            <h2 className="mb-4 text-base font-extrabold">
              خامساً: تفاصيل الأعمال والسجلات
            </h2>

            {selected.map((key) => {
              const config =
                recordByKey(key);

              const rows =
                rowsBySection?.[
                  key
                ] ?? [];

              const columns =
                config.fields
                  .filter(
                    (field) =>
                      field.list,
                  )
                  .slice(0, 8);

              return (
                <section
                  key={key}
                  className="mb-7 break-inside-avoid"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-extrabold">
                      {config.title}
                    </h3>

                    <span className="text-[10px] text-paper-muted-foreground">
                      عدد السجلات:{" "}
                      {rows.length}
                    </span>
                  </div>

                  <div className="overflow-hidden rounded-lg border">
                    <table className="w-full border-collapse text-right text-[10px]">
                      <thead>
                        <tr className="bg-paper-muted">
                          {columns.map(
                            (field) => (
                              <th
                                key={
                                  field.name
                                }
                                className="border p-2 font-extrabold"
                              >
                                {
                                  field.label
                                }
                              </th>
                            ),
                          )}
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
                              className="border p-4 text-center"
                            >
                              جارٍ تحميل البيانات...
                            </td>
                          </tr>
                        )}

                        {!isLoading &&
                          rows.length ===
                            0 && (
                            <tr>
                              <td
                                colSpan={
                                  Math.max(
                                    columns.length,
                                    1,
                                  )
                                }
                                className="border p-4 text-center text-muted-foreground"
                              >
                                لا توجد سجلات
                                ضمن الفترة
                                المحددة.
                              </td>
                            </tr>
                          )}

                        {rows.map(
                          (
                            row,
                            index,
                          ) => (
                            <tr
                              key={String(
                                row[
                                  "id"
                                ] ??
                                  index,
                              )}
                            >
                              {columns.map(
                                (
                                  field,
                                ) => (
                                  <td
                                    key={
                                      field.name
                                    }
                                    className="border p-2 align-top leading-5"
                                  >
                                    {displayRecordValue(
                                      row[
                                        field
                                          .name
                                      ],
                                    )}
                                  </td>
                                ),
                              )}
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}
          </section>
        )}

        {sections.evidence &&
          imageEvidence.length >
            0 && (
            <section className="mt-7">
              <div className="mb-3 flex items-center gap-2">
                <ImageIcon className="size-5" />

                <h2 className="text-base font-extrabold">
                  سادساً: الشواهد والصور
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {imageEvidence.map(
                  (row, index) => (
                    <figure
                      key={String(
                        row["id"] ??
                          index,
                      )}
                      className="break-inside-avoid overflow-hidden rounded-lg border p-2"
                    >
                      <img
                        src={String(
                          row[
                            "preview_url"
                          ] ?? "",
                        )}
                        alt={String(
                          row[
                            "name"
                          ] ??
                            "شاهد",
                        )}
                        className="aspect-video w-full rounded object-cover"
                      />

                      <figcaption className="mt-2 text-center text-[10px] leading-5">
                        {String(
                          row[
                            "name"
                          ] ??
                            "شاهد من تنفيذ البرنامج",
                        )}
                      </figcaption>
                    </figure>
                  ),
                )}
              </div>
            </section>
          )}

        {sections.recommendations && (
          <section className="mt-7 break-inside-avoid">
            <h2 className="mb-3 text-base font-extrabold">
              سابعاً: النتائج والتوصيات
            </h2>

            <div className="rounded-lg border p-4">
              <p className="whitespace-pre-wrap text-sm leading-8">
                {recommendations.trim() ||
                  "تستند التوصيات إلى البيانات المتاحة في سجلات المنصة، ويُوصى باستمرار توثيق البرامج والأنشطة والشواهد وقياس أثرها على المستفيدين، مع الاستفادة من نتائج التقارير الدورية في تطوير الخطط المستقبلية."}
              </p>
            </div>
          </section>
        )}

        {sections.signatures && (
          <section className="mt-10 break-inside-avoid">
            <div className="grid grid-cols-2 gap-12 text-center text-xs">
              <div>
                <p className="font-extrabold">
                  الموجه الطلابي
                </p>

                <div className="mx-auto mt-8 h-12 max-w-[180px] border-b" />

                <p className="mt-2">
                  الاسم والتوقيع
                </p>
              </div>

              <div>
                <p className="font-extrabold">
                  مدير المدرسة
                </p>

                <div className="mx-auto mt-8 h-12 max-w-[180px] border-b" />

                <p className="mt-2">
                  الاسم والتوقيع
                </p>
              </div>
            </div>
          </section>
        )}

        <OfficialFooter
          school={school}
        />
      </div>

      <div className="no-print rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />

          <div>
            <h2 className="font-extrabold">
              مراجعة وتعديل النصوص
            </h2>

            <p className="text-xs text-muted-foreground">
              يمكنك تعديل النص قبل طباعة التقرير.
            </p>
          </div>
        </div>

        <div className="grid gap-5">
          <div>
            <Label className="mb-2 block">
              الملخص التنفيذي
            </Label>

            <Textarea
              value={summary}
              onChange={(event) =>
                setSummary(
                  event.target.value,
                )
              }
              rows={6}
              placeholder="اكتب أو عدل الملخص التنفيذي..."
            />
          </div>

          <div>
            <Label className="mb-2 block">
              التحليل المهني
            </Label>

            <Textarea
              value={analysis}
              onChange={(event) =>
                setAnalysis(
                  event.target.value,
                )
              }
              rows={8}
              placeholder="اكتب أو عدل التحليل..."
            />
          </div>

          <div>
            <Label className="mb-2 block">
              التوصيات
            </Label>

            <Textarea
              value={recommendations}
              onChange={(event) =>
                setRecommendations(
                  event.target.value,
                )
              }
              rows={6}
              placeholder="اكتب أو عدل التوصيات..."
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={
                generateAiReport
              }
              disabled={aiBusy}
            >
              <Sparkles className="size-4" />

              {aiBusy
                ? "جارٍ إنشاء المحتوى..."
                : "إعادة إنشاء التقرير بالذكاء الاصطناعي"}
            </Button>

            <Button
              variant="outline"
              onClick={() =>
                window.print()
              }
            >
              <Printer className="size-4" />
              طباعة
            </Button>

            <Button
              variant="outline"
              onClick={
                exportPdf
              }
              disabled={
                exportingPdf
              }
            >
              <FileDown className="size-4" />
              PDF
            </Button>
          </div>
        </div>
      </div>

      <Dialog
        open={shareOpen}
        onOpenChange={
          setShareOpen
        }
      >
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>
              مشاركة التقرير
            </DialogTitle>

            <DialogDescription>
              سيتم إنشاء نسخة PDF من التقرير
              ومشاركتها من جهازك إذا كان الجهاز
              يدعم المشاركة المباشرة.
            </DialogDescription>
          </DialogHeader>

          <div>
            <Label className="mb-2 block">
              رقم الجوال السعودي
            </Label>

            <Input
              value={sharePhone}
              onChange={(event) =>
                setSharePhone(
                  event.target.value,
                )
              }
              inputMode="tel"
              placeholder="05xxxxxxxx"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setShareOpen(false)
              }
            >
              إلغاء
            </Button>

            <Button
              onClick={sharePdf}
            >
              <Share2 className="size-4" />
              إنشاء ومشاركة PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }

          html,
          body {
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          .print-area {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
            background: white !important;
          }

          .break-inside-avoid {
            break-inside: avoid;
          }

          table {
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          img {
            break-inside: avoid;
          }
        }

        .print-area {
          min-height: 297mm;
        }
      `}</style>
    </div>
  );
}