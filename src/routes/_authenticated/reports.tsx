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
            .select("*");
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

  const reportableRecords = useMemo(
    () => RECORDS.filter((record) => record.key !== "reports"),
    [],
  );

  const [period, setPeriod] = useState("");
  const [reportTitle, setReportTitle] = useState("التقرير الشامل للتوجيه الطلابي");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [narrative, setNarrative] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>(
    reportableRecords.map((record) => record.key),
  );
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["official-reports-all-records"],
    queryFn: async () => {
      const results = await Promise.all(
        reportableRecords.map(async (record) => {
          const result = await supabase
            .from(record.table)
            .select("*");
          return { key: record.key, data: result.data ?? [], error: result.error };
        }),
      );
      return {
        sections: Object.fromEntries(
          results.map((item) => [item.key, item.data as Record<string, unknown>[]]),
        ),
        errors: results
          .filter((item) => item.error)
          .map((item) => ({ key: item.key, message: item.error?.message ?? "خطأ غير معروف" })),
      };
    },
    staleTime: 30_000,
  });

  const sections = data?.sections ?? {};

  const filteredSections = useMemo(() => {
    const output: Record<string, Record<string, unknown>[]> = {};
    for (const record of reportableRecords) {
      let rows = sections[record.key] ?? [];
      const dateField = dateFieldForRecord(record.key);
      if ((fromDate || toDate) && dateField) {
        rows = rows.filter((row) => {
          const value = String(row[dateField] ?? "").slice(0, 10);
          return Boolean(value) && (!fromDate || value >= fromDate) && (!toDate || value <= toDate);
        });
      }
      output[record.key] = rows;
    }
    return output;
  }, [sections, reportableRecords, fromDate, toDate]);

  const kpis = useMemo(() => {
    const computed = computeKpis({
      planTasks: filteredSections.plan ?? [],
      cases: filteredSections.cases ?? [],
      attendance: filteredSections.attendance ?? [],
      interviews: filteredSections.interviews ?? [],
      students: filteredSections.students ?? [],
    });
    return computed.map((kpi) => ({
      key: kpi.key,
      title: kpi.label,
      value: kpi.value,
      description: kpi.hint,
    }));
  }, [filteredSections]);

  const totalRows = reportableRecords.reduce(
    (sum, record) => sum + (filteredSections[record.key]?.length ?? 0),
    0,
  );

  function toggleRecord(key: string) {
    setSelectedKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  }

  function selectAll() {
    setSelectedKeys(reportableRecords.map((record) => record.key));
  }

  function clearAll() {
    setSelectedKeys([]);
  }

  function reset() {
    setReportTitle("التقرير الشامل للتوجيه الطلابي");
    setPeriod("");
    setFromDate("");
    setToDate("");
    setNarrative("");
    selectAll();
    toast.success("تمت إعادة ضبط التقرير.");
  }

  function printOfficialReport() {
    if (!printRef.current || isPrinting) return;
    setIsPrinting(true);
    document.body.classList.add("printing-record");
    window.setTimeout(() => {
      window.print();
      window.setTimeout(() => {
        document.body.classList.remove("printing-record");
        setIsPrinting(false);
      }, 800);
    }, 100);
  }

  async function exportOfficialPdf() {
    if (!printRef.current || isExporting) return;
    setIsExporting(true);
    try {
      await elementToPdf(printRef.current, reportTitle || "تقرير_رسمي");
      toast.success("تم إنشاء التقرير الرسمي بصيغة PDF.");
    } catch (error) {
      console.error(error);
      toast.error("تعذّر إنشاء ملف PDF.");
    } finally {
      setIsExporting(false);
    }
  }

  const selectedRecords = reportableRecords.filter((record) =>
    selectedKeys.includes(record.key),
  );

  return (
    <div className="min-w-0 space-y-6" dir="rtl">
      <section className="no-print border-b border-border pb-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <FileText className="size-5" />
              <span className="text-xs font-bold">مركز الوثائق الرسمية</span>
            </div>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">التقارير الرسمية</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
              هذه هي نافذة الطباعة الرسمية الموحدة للمنصة. جميع السجلات متاحة في تقرير واحد،
              مع الكليشة الرسمية وتوقيع الموجه الطلابي ومدير المدرسة.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={printOfficialReport} disabled={isPrinting || isLoading}>
              <Printer className="size-4" />
              {isPrinting ? "جارٍ فتح الطباعة..." : "طباعة التقرير الرسمي"}
            </Button>
            <Button type="button" variant="outline" onClick={() => void exportOfficialPdf()} disabled={isExporting || isLoading}>
              <FileDown className="size-4" />
              {isExporting ? "جارٍ إنشاء PDF..." : "حفظ PDF"}
            </Button>
            <Button type="button" variant="ghost" onClick={reset}>
              <RotateCcw className="size-4" />
              إعادة ضبط
            </Button>
          </div>
        </div>
      </section>

      <section className="no-print rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
          <div className="space-y-4">
            <div>
              <Label htmlFor="official-report-title">عنوان التقرير</Label>
              <Input id="official-report-title" className="mt-1.5" value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="official-report-period">الفترة / المناسبة</Label>
              <Input id="official-report-period" className="mt-1.5" value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="مثال: الفصل الدراسي الأول 1447هـ" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="official-from">من تاريخ</Label>
                <Input id="official-from" className="mt-1.5" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="official-to">إلى تاريخ</Label>
                <Input id="official-to" className="mt-1.5" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>
            {fromDate && toDate && fromDate > toDate && (
              <p className="text-xs text-destructive">تاريخ البداية يجب أن يسبق تاريخ النهاية.</p>
            )}
            <div>
              <Label htmlFor="official-narrative">التحليل والملاحظات والتوصيات</Label>
              <Textarea id="official-narrative" className="mt-1.5" rows={5} value={narrative} onChange={(e) => setNarrative(e.target.value)} placeholder="اكتب التحليل المهني أو الملاحظات أو التوصيات التي تريد ظهورها في التقرير الرسمي..." />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <Label>السجلات المضمنة في التقرير</Label>
              <div className="flex gap-1">
                <Button type="button" size="sm" variant="ghost" onClick={selectAll}>تحديد الكل</Button>
                <Button type="button" size="sm" variant="ghost" onClick={clearAll}>إلغاء الكل</Button>
              </div>
            </div>
            <div className="mt-2 grid max-h-80 grid-cols-1 gap-2 overflow-y-auto rounded-xl border border-border p-3 sm:grid-cols-2">
              {reportableRecords.map((record) => {
                const active = selectedKeys.includes(record.key);
                const count = filteredSections[record.key]?.length ?? 0;
                return (
                  <button key={record.key} type="button" onClick={() => toggleRecord(record.key)} className={`flex items-center justify-between gap-2 rounded-xl border p-3 text-right text-xs transition hover:bg-muted ${active ? "border-primary bg-primary/5" : "border-border"}`}>
                    <span className="flex items-center gap-2 font-semibold">
                      {active ? <CheckSquare className="size-4 text-primary" /> : <Square className="size-4" />}
                      {record.title}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{count}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <PrintStat label="السجلات" value={selectedRecords.length} />
              <PrintStat label="إجمالي الصفوف" value={totalRows} />
              <PrintStat label="الطلاب" value={filteredSections.students?.length ?? 0} />
              <PrintStat label="الشواهد" value={filteredSections.evidences?.length ?? 0} />
            </div>
            {isLoading && <p className="mt-3 text-xs text-muted-foreground">جارٍ تحميل جميع السجلات...</p>}
            {isError && (
              <div className="mt-3 flex items-center gap-3 text-xs text-destructive">
                <span>تعذّر تحميل بيانات التقرير.</span>
                <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>إعادة المحاولة</Button>
              </div>
            )}
            {data?.errors.length ? (
              <p className="mt-3 text-xs text-amber-700">
                تعذر الوصول إلى: {data.errors.map((error) => error.key).join("، ")}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <div ref={printRef} className="reports-print-sheet print-area hidden bg-paper text-paper-foreground print:block">
        <OfficialHeader
          school={school}
          title={reportTitle || "التقرير الرسمي للتوجيه الطلابي"}
          reportType="تقرير رسمي"
          period={period || undefined}
        />

        <main className="report-official-content">
          <section className="report-cover block border-b border-paper-border pb-5 pt-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <PrintStat label="عدد السجلات" value={selectedRecords.length} />
              <PrintStat label="إجمالي الصفوف" value={totalRows} />
              <PrintStat label="عدد الطلاب" value={filteredSections.students?.length ?? 0} />
              <PrintStat label="عدد الشواهد" value={filteredSections.evidences?.length ?? 0} />
            </div>
            <div className="mt-5 rounded-xl border border-paper-border bg-paper-muted p-4">
              <div className="grid gap-2 sm:grid-cols-2 text-xs">
                <p><strong>الفترة:</strong> {period || "—"}</p>
                <p><strong>النطاق:</strong> {fromDate || "بداية البيانات"} إلى {toDate || "نهاية البيانات"}</p>
              </div>
            </div>
          </section>

          <section className="report-summary mt-6">
            <h2 className="mb-3 border-r-4 border-primary pr-3 text-base font-black">ملخص مؤشرات الأداء</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {kpis.map((kpi) => (
                <div key={kpi.key} className="rounded-xl border border-paper-border bg-paper-muted p-3">
                  <p className="text-[11px] text-muted-foreground">{kpi.title}</p>
                  <p className="mt-1 text-xl font-black text-primary">{isPercentKpi(kpi.key) ? `${kpi.value}%` : kpi.value}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{kpi.description}</p>
                </div>
              ))}
            </div>
          </section>

          {selectedRecords.map((record) => {
            const rows = filteredSections[record.key] ?? [];
            const columns = reportColumns(record.fields);
            return (
              <section key={record.key} className="report-record-section mt-8">
                <div className="mb-3 flex items-end justify-between gap-3 border-b-2 border-paper-border pb-2">
                  <h2 className="border-r-4 border-primary pr-3 text-base font-black">{record.title}</h2>
                  <span className="text-xs font-bold text-muted-foreground">عدد السجلات: {rows.length}</span>
                </div>
                {columns.length ? (
                  rows.length ? (
                    <div className="report-table-wrap overflow-visible">
                      <table className="w-full border-collapse text-right text-[9px] leading-5">
                        <thead>
                          <tr className="bg-paper-muted">
                            {columns.map((column) => (
                              <th key={column.key} className="border border-paper-border p-1.5 font-bold">{column.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, index) => (
                            <tr key={String(row.id ?? index)}>
                              {columns.map((column) => (
                                <td key={column.key} className="border border-paper-border p-1.5 align-top break-words">
                                  {displayRecordValue(row[column.key], column.type)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-paper-border p-3 text-center text-xs text-muted-foreground">لا توجد بيانات ضمن النطاق المحدد.</p>
                  )
                ) : (
                  <p className="rounded-lg border border-dashed border-paper-border p-3 text-center text-xs text-muted-foreground">لا توجد حقول قابلة للعرض في هذا السجل.</p>
                )}
              </section>
            );
          })}

          <section className="report-analysis mt-8 break-inside-avoid">
            <h2 className="mb-3 border-r-4 border-primary pr-3 text-base font-black">التحليل والملاحظات والتوصيات</h2>
            <div className="min-h-32 rounded-xl border border-paper-border p-4">
              <p className="whitespace-pre-wrap text-sm leading-8">{narrative.trim() || "لا توجد ملاحظات أو توصيات إضافية."}</p>
            </div>
          </section>

          <section className="report-approval mt-10 break-inside-avoid">
            <div className="rounded-xl border border-paper-border bg-paper-muted p-4 text-center text-xs leading-7">
              أُعد هذا التقرير من خلال منصة الذات للتوجيه الطلابي، وتمت مراجعته واعتماده من الجهة المختصة في المدرسة.
            </div>
          </section>

          <OfficialFooter school={school} />
        </main>
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
