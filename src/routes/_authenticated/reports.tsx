import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  CheckSquare,
  FileDown,
  FileText,
  Printer,
  RotateCcw,
  Share2,
  Square,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/lib/school";
import { computeKpis, isPercentKpi } from "@/lib/kpi";
import { RECORDS, type FieldDef } from "@/lib/records";
import { displayRecordValue } from "@/lib/display";
import { elementToPdf } from "@/lib/pdf";
import { shareOnWhatsApp } from "@/lib/whatsapp";
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
      { title: "التقارير | الذات" },
      {
        name: "description",
        content: "إعداد وتصدير تقارير التوجيه الطلابي الرسمية بصيغة PDF ومشاركتها عبر واتساب.",
      },
    ],
  }),
  component: ReportsPage,
});

/* =========================================================
   أقسام التقرير القابلة للتفعيل/الإخفاء
========================================================= */
type ReportSectionsState = {
  kpis: boolean;
  details: boolean;
  evidence: boolean;
  analysis: boolean;
  signatures: boolean;
};

const DEFAULT_SECTIONS: ReportSectionsState = {
  kpis: true,
  details: true,
  evidence: true,
  analysis: true,
  signatures: true,
};

const SECTION_TOGGLES: { key: keyof ReportSectionsState; label: string }[] = [
  { key: "kpis", label: "مؤشرات الأداء" },
  { key: "details", label: "تفاصيل السجلات" },
  { key: "evidence", label: "الشواهد والصور" },
  { key: "analysis", label: "التحليل والتوصيات" },
  { key: "signatures", label: "التوقيعات" },
];

// السجلات المُدرجة افتراضياً ضمن قسم "تفاصيل السجلات"
const DEFAULT_SELECTED = ["cases", "plan", "interviews", "attendance"];

/* =========================================================
   تحويل حقول السجل إلى أعمدة جدول التقرير
   (فقط الحقول المعلّمة بـ list: true تظهر في جدول التقرير)
========================================================= */
function reportColumns(fields: FieldDef[]) {
  return fields
    .filter((field) => field.list)
    .map((field) => ({ key: field.name, label: field.label, type: field.type }));
}

function recordByKey(key: string) {
  const config = RECORDS.find((record) => record.key === key);
  if (!config) throw new Error(`سجل غير معروف: ${key}`);
  return { ...config, columns: reportColumns(config.fields) };
}

/* =========================================================
   أدوات التاريخ وجلب البيانات
========================================================= */

function dateFieldForRecord(key: string) {
  const fields: Record<string, string> = {
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
  };
  return fields[key];
}

function filterRowsByDate(
  key: string,
  rows: Record<string, unknown>[],
  from: string,
  to: string,
) {
  if (!from && !to) return rows;
  const field = dateFieldForRecord(key);
  if (!field) return rows;

  return rows.filter((row) => {
    const raw = row[field];
    if (!raw) return false;
    const value = String(raw).slice(0, 10);
    if (from && value < from) return false;
    if (to && value > to) return false;
    return true;
  });
}


function useReportData(selected: string[]) {
  const queryKeys = Array.from(new Set([
    "students",
    "cases",
    "plan",
    "interviews",
    "attendance",
    "evidences",
    ...selected,
  ]));

  return useQuery({
    queryKey: ["reports-data", queryKeys],
    queryFn: async () => {
      const configs = queryKeys
        .map((key) => RECORDS.find((record) => record.key === key))
        .filter((record): record is (typeof RECORDS)[number] => Boolean(record));

      const results = await Promise.all(
        configs.map(async (record) => {
          const result = await supabase
            .from(record.table)
            .select("*")
            .order("created_at", { ascending: false });
          return { key: record.key, ...result };
        }),
      );

      const sections: Record<string, Record<string, unknown>[]> = {};
      const errors: string[] = [];

      results.forEach(({ key, data, error }) => {
        if (error) {
          errors.push(`${key}: ${error.message}`);
          sections[key] = [];
          return;
        }
        sections[key] = (data ?? []) as Record<string, unknown>[];
      });

      return { sections, errors };
    },
    staleTime: 30_000,
  });
}

function ReportsPage() {
  const { data: school } = useSchool();
  const printRef = useRef<HTMLDivElement>(null);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { data: reportData, isLoading, isError, refetch } = useReportData(selected);
  const rawSections = reportData?.sections ?? {};
  const sections = useMemo(() => {
    const filtered: Record<string, Record<string, unknown>[]> = {};
    Object.entries(rawSections).forEach(([key, rows]) => {
      filtered[key] = filterRowsByDate(key, rows, fromDate, toDate);
    });
    return filtered;
  }, [rawSections, fromDate, toDate]);

  const [selected, setSelected] = useState<string[]>(DEFAULT_SELECTED);
  const [reportSections, setReportSections] = useState<ReportSectionsState>(DEFAULT_SECTIONS);
  const [reportNarrative, setReportNarrative] = useState("");
  const [period, setPeriod] = useState("");

  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [sharePhone, setSharePhone] = useState("");

  /* ---------- حساب مؤشرات الأداء (KPIs) ---------- */
  const kpis = useMemo(() => {
    if (!sections) return [];

    const computed = computeKpis({
      planTasks: sections.plan ?? [],
      cases: sections.cases ?? [],
      attendance: sections.attendance ?? [],
      interviews: sections.interviews ?? [],
      students: sections.students ?? [],
    });

    return computed.map((kpi) => ({
      key: kpi.key,
      title: kpi.label,
      value: kpi.value,
      description: kpi.hint,
    }));
  }, [sections]);

  const totalEvidence = (sections?.["evidences"] ?? []).length;

  const chartData = useMemo(
    () => kpis.map((kpi) => ({ name: kpi.title, value: kpi.value })),
    [kpis],
  );

  function toggleSelected(key: string) {
    setSelected((current) =>
      current.includes(key) ? current.filter((value) => value !== key) : [...current, key],
    );
  }

  function toggleSection(key: keyof ReportSectionsState) {
    setReportSections((current) => ({ ...current, [key]: !current[key] }));
  }

  function resetForm() {
    setSelected(DEFAULT_SELECTED);
    setReportSections(DEFAULT_SECTIONS);
    setReportNarrative("");
    setPeriod("");
    setFromDate("");
    setToDate("");
    toast.success("تمت إعادة ضبط إعدادات التقرير.");
  }

  function printReport() {
    window.print();
  }

  /* ---------- تصدير PDF ---------- */
  async function exportPdf() {
    if (!printRef.current || exporting) return;

    setExporting(true);

    try {
      await elementToPdf(printRef.current, "تقرير التوجيه الطلابي");
      toast.success("تم حفظ التقرير بصيغة PDF");
    } catch {
      toast.error("تعذّر حفظ ملف PDF.");
    } finally {
      setExporting(false);
    }
  }

  /* ---------- مشاركة التقرير عبر واتساب ---------- */
  async function sharePdf() {
    if (!printRef.current || sharing) return;

    setSharing(true);

    try {
      await elementToPdf(printRef.current, "تقرير التوجيه الطلابي");

      shareOnWhatsApp(
        [
          "السلام عليكم ورحمة الله وبركاته",
          `من ${school?.school_name || "التوجيه الطلابي"}`,
          "تم تجهيز التقرير المطلوب بصيغة PDF وتنزيله على جهازك، يُرجى إرفاقه هنا قبل الإرسال.",
        ].join("\n"),
        sharePhone,
      );

      setShareOpen(false);
      toast.success("تم تنزيل التقرير، وفُتح واتساب لإرسال الرسالة. أرفق ملف الـ PDF يدوياً.");
    } catch {
      toast.error("تعذّر تجهيز التقرير للمشاركة.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="min-w-0 space-y-6" dir="rtl">
      {/* =========================================================
          الترويسة وأزرار الإجراءات
      ========================================================= */}
      <section className="no-print border-b border-border pb-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <FileText className="size-5" />
              <span className="text-xs font-bold">مركز التقارير</span>
            </div>

            <h1 className="mt-2 text-2xl font-black text-foreground sm:text-3xl">
              التقارير الرسمية
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
              اختر السجلات والأقسام المطلوبة، ثم اطبع التقرير أو صدّره PDF أو شاركه عبر واتساب.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button type="button" variant="outline" onClick={printReport}>
              <Printer className="size-4" />
              طباعة
            </Button>

            <Button type="button" variant="outline" onClick={() => void exportPdf()} disabled={exporting}>
              <FileDown className="size-4" />
              {exporting ? "جارٍ الحفظ..." : "حفظ PDF"}
            </Button>

            <Button type="button" onClick={() => setShareOpen(true)}>
              <Share2 className="size-4" />
              مشاركة واتساب
            </Button>

            <Button type="button" variant="ghost" onClick={resetForm}>
              <RotateCcw className="size-4" />
              إعادة ضبط
            </Button>
          </div>
        </div>
      </section>

      {/* =========================================================
          إعدادات التقرير: الفترة، التحليل، الأقسام، السجلات
      ========================================================= */}
      <section className="no-print border-b border-border pb-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <Label htmlFor="report-period" className="text-xs font-semibold text-muted-foreground">
              الفترة (تظهر في ترويسة التقرير)
            </Label>
            <Input
              id="report-period"
              className="mt-1.5"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="مثال: الفصل الدراسي الأول 1447هـ"
            />

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <Label htmlFor="report-from" className="text-xs font-semibold text-muted-foreground">
                  من تاريخ
                </Label>
                <Input id="report-from" type="date" className="mt-1.5" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="report-to" className="text-xs font-semibold text-muted-foreground">
                  إلى تاريخ
                </Label>
                <Input id="report-to" type="date" className="mt-1.5" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>
            {fromDate && toDate && fromDate > toDate && (
              <p className="mt-2 text-xs text-destructive">تاريخ البداية يجب أن يسبق تاريخ النهاية.</p>
            )}

            <Label className="mt-4 block text-xs font-semibold text-muted-foreground">
              التحليل المهني والتوصيات
            </Label>
            <Textarea
              className="mt-1.5"
              rows={5}
              value={reportNarrative}
              onChange={(e) => setReportNarrative(e.target.value)}
              placeholder="اكتب تحليلك المهني وتوصياتك لهذه الفترة..."
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-muted-foreground">أقسام التقرير</Label>
            <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="أقسام التقرير">
              {SECTION_TOGGLES.map((item) => {
                const active = reportSections[item.key];
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleSection(item.key)}
                    className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition"
                    style={{
                      background: active ? "hsl(var(--primary))" : "transparent",
                      color: active ? "#ffffff" : undefined,
                      borderColor: active ? "hsl(var(--primary))" : undefined,
                    }}
                  >
                    {active ? <CheckSquare className="size-3.5" /> : <Square className="size-3.5" />}
                    {item.label}
                  </button>
                );
              })}
            </div>

            <Label className="mt-4 block text-xs font-semibold text-muted-foreground">
              السجلات المُدرجة ضمن "تفاصيل السجلات"
            </Label>
            <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="السجلات المدرجة">
              {RECORDS.filter((record) => record.key !== "reports").map((record) => {
                const active = selected.includes(record.key);
                return (
                  <button
                    key={record.key}
                    type="button"
                    onClick={() => toggleSelected(record.key)}
                    className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition"
                    style={{
                      background: active ? "hsl(var(--primary))" : "transparent",
                      color: active ? "#ffffff" : undefined,
                      borderColor: active ? "hsl(var(--primary))" : undefined,
                    }}
                  >
                    {active ? <CheckSquare className="size-3.5" /> : <Square className="size-3.5" />}
                    {record.title}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {isLoading && (
          <p className="mt-4 text-xs text-muted-foreground">جارٍ تحميل بيانات التقرير...</p>
        )}
        {isError && (
          <div className="mt-4 flex items-center gap-3 text-xs text-destructive">
            <span>تعذّر تحميل بيانات التقرير.</span>
            <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
              إعادة المحاولة
            </Button>
          </div>
        )}
        {!isLoading && !isError && reportData?.errors.length ? (
          <p className="mt-4 text-xs text-amber-700">
            تم إنشاء التقرير مع تجاهل السجلات التي تعذر الوصول إليها.
          </p>
        ) : null}
      </section>

      {/* =========================================================
          منطقة الطباعة الرسمية (A4)
      ========================================================= */}
      <div ref={printRef} className="reports-print-sheet print-area hidden bg-paper p-6 text-paper-foreground print:block">
        <style>{`
          @media print {
            .reports-print-sheet {
              display: block !important;
              padding: 42mm 12mm 48mm !important;
              width: 100% !important;
              background: #fff !important;
              box-shadow: none !important;
            }
            .reports-print-sheet .overflow-x-auto { overflow: visible !important; }
            .reports-print-sheet section,
            .reports-print-sheet tr,
            .reports-print-sheet h2,
            .reports-print-sheet p,
            .reports-print-sheet img {
              break-inside: avoid;
              page-break-inside: avoid;
            }
          }
        `}</style>
        <OfficialHeader
          school={school}
          title="تقرير التوجيه الطلابي"
          reportType="تقرير شامل"
          period={period || undefined}
        />

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <PrintStat label="إجمالي الطلاب" value={(sections?.students ?? []).length} />
          <PrintStat label="الحالات الإرشادية" value={(sections?.cases ?? []).length} />
          <PrintStat label="المقابلات" value={(sections?.interviews ?? []).length} />
          <PrintStat label="الشواهد" value={totalEvidence} />
        </div>

        {reportSections.kpis && (
          <section className="mt-6 break-inside-avoid">
            <h2 className="mb-3 border-r-4 border-primary pr-3 text-base font-black">
              الأداء العام
            </h2>

            {chartData.length > 0 ? (
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart />
            )}
          </section>
        )}

        <div className="mt-5 space-y-4">
          {/* KPIs */}

          {reportSections.kpis &&
            kpis.length > 0 && (
              <section className="mt-7 break-inside-avoid">
                <h2 className="mb-3 border-r-4 border-primary pr-3 text-base font-black">
                  مؤشرات الأداء (KPIs)
                </h2>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {kpis.map((kpi, idx) => {
                    const isPercent = isPercentKpi(kpi.key);
                    const formattedVal = isPercent
                      ? `${kpi.value}%`
                      : kpi.value;
                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-paper-border bg-paper-muted p-3.5 text-right"
                      >
                        <p className="text-xs text-muted-foreground">
                          {kpi.title}
                        </p>
                        <p className="mt-1 text-xl font-black text-primary">
                          {formattedVal}
                        </p>
                        {kpi.description && (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {kpi.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

          {/* Record Details */}

          {reportSections.details &&
            selected.map((key) => {
              const config = recordByKey(key);
              const rows = sections?.[key] ?? [];

              return (
                <section key={key} className="mt-8">
                  <h2 className="mb-3 border-r-4 border-primary pr-3 text-base font-black">
                    سجل: {config.title} ({rows.length})
                  </h2>

                  {rows.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-right text-xs">
                        <thead>
                          <tr className="bg-paper-muted">
                            {config.columns.map((col) => (
                              <th
                                key={col.key}
                                className="border border-paper-border p-2 font-bold"
                              >
                                {col.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, index) => (
                            <tr key={index} className="border-b border-paper-border">
                              {config.columns.map((col) => {
                                const val = row[col.key];
                                return (
                                  <td
                                    key={col.key}
                                    className="border border-paper-border p-2 align-top text-xs"
                                  >
                                    {displayRecordValue(val, col.type)}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="rounded-xl border border-dashed border-paper-border p-4 text-center text-xs text-muted-foreground">
                      لا توجد سجلات مطابقة للفترة المحددة.
                    </p>
                  )}
                </section>
              );
            })}

          {/* Evidence section */}

          {reportSections.evidence &&
            totalEvidence > 0 && (
              <section className="mt-8 break-inside-avoid">
                <h2 className="mb-3 border-r-4 border-primary pr-3 text-base font-black">
                  الشواهد والصور المرفقة ({totalEvidence})
                </h2>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {(sections?.["evidences"] ?? []).map((row, index) => {
                    const title = String(row["name"] ?? `شاهد ${index + 1}`);
                    return (
                      <div
                        key={String(row.id ?? index)}
                        className="rounded-xl border border-paper-border bg-paper-muted p-3"
                      >
                        <p className="text-[11px] font-bold">{title}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          النوع: {String(row["etype"] ?? "—")} · التاريخ: {String(row["edate"] ?? "—")}
                        </p>
                        <p className="mt-1 break-all text-[10px] text-muted-foreground">
                          {String(row["description"] ?? row["file_url"] ?? "لا يوجد وصف أو رابط مرفق")}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

          {/* Analysis & Recommendations */}

          {reportSections.analysis && (
            <section className="mt-8 break-inside-avoid rounded-xl border border-paper-border bg-paper-muted p-5">
              <h2 className="mb-3 font-black">
                التحليل المهني والتوصيات
              </h2>
              <p className="whitespace-pre-wrap text-sm leading-8">
                {reportNarrative.trim() ||
                  "لم يتم إدراج تحليل مهني أو توصيات إضافية."}
              </p>
            </section>
          )}

          {/* Signatures */}

          {reportSections.signatures && (
            <section className="mt-10 break-inside-avoid">
              <OfficialFooter school={school} />
            </section>
          )}
        </div>
      </div>

      {/* =========================================================
          SHARE DIALOG
      ========================================================= */}

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>مشاركة التقرير عبر واتساب</DialogTitle>
            <DialogDescription>
              أدخل رقم جوال ولي الأمر أو المسؤول (يبدأ بـ 05 أو 9665).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-2 block text-xs font-bold">
                رقم الجوال
              </Label>
              <Input
                value={sharePhone}
                onChange={(e) => setSharePhone(e.target.value)}
                placeholder="05xxxxxxxx"
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShareOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              onClick={sharePdf}
              className="bg-[#25D366] text-white hover:bg-[#1da851] gap-2"
            >
              <Share2 className="size-4" /> مشاركة التقرير
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
    <div className="rounded-xl border border-paper-border bg-paper-muted p-3 text-center">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[280px] w-full flex-col items-center justify-center rounded-xl border border-dashed text-muted-foreground">
      <BarChart3 className="mb-2 size-8 opacity-40" />
      <p className="text-xs">لا توجد بيانات كافية لعرض الرسم البياني</p>
    </div>
  );
}
