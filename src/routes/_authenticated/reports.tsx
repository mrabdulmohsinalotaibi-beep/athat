import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckSquare, FileDown, FileText, Printer, RotateCcw, Square } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/lib/school";
import { computeKpis, isPercentKpi } from "@/lib/kpi";
import { RECORDS, type FieldDef } from "@/lib/records";
import { displayRecordValue } from "@/lib/display";
import { elementToPdf } from "@/lib/pdf";
import { OfficialFooter, OfficialHeader } from "@/components/OfficialHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requestPrint } from "@/lib/print";

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
   تحويل حقول السجل إلى أعمدة جدول التقرير
   (فقط الحقول المعلّمة بـ list: true تظهر في جدول التقرير)
========================================================= */
function reportColumns(fields: FieldDef[]) {
  return fields
    .filter((field) => field.list)
    .map((field) => ({ key: field.name, label: field.label, type: field.type }));
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

function ReportsPage() {
  const { data: school } = useSchool();
  const printRef = useRef<HTMLDivElement>(null);

  const reportableRecords = useMemo(() => RECORDS.filter((record) => record.key !== "reports"), []);

  const [reportMode, setReportMode] = useState<"single" | "combined">("single");
  const [selectedSingleKey, setSelectedSingleKey] = useState("cases");
  const [period, setPeriod] = useState("");
  const [reportTitle, setReportTitle] = useState("التقرير الرسمي للتوجيه الطلابي");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [narrative, setNarrative] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>(
    reportableRecords.map((record) => record.key),
  );
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["official-reports-all-records"],
    queryFn: async () => {
      const results = await Promise.all(
        reportableRecords.map(async (record) => {
          const result = await supabase.from(record.table).select("*");
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

  const sections = useMemo(() => data?.sections ?? {}, [data]);

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

  function toggleRecord(key: string) {
    setSelectedKeys((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }

  function selectAll() {
    setSelectedKeys(reportableRecords.map((record) => record.key));
  }

  function clearAll() {
    setSelectedKeys([]);
  }

  function reset() {
    setReportMode("single");
    setSelectedSingleKey("cases");
    setReportTitle("التقرير الرسمي للتوجيه الطلابي");
    setPeriod("");
    setFromDate("");
    setToDate("");
    setNarrative("");
    selectAll();
    toast.success("تمت إعادة ضبط التقرير.");
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

  const activeSelectedKeys = reportMode === "single" ? [selectedSingleKey] : selectedKeys;

  const selectedRecords = reportableRecords.filter((record) =>
    activeSelectedKeys.includes(record.key),
  );

  const totalRows = selectedRecords.reduce(
    (sum, record) => sum + (filteredSections[record.key]?.length ?? 0),
    0,
  );

  return (
    <div className="min-w-0 space-y-6" dir="rtl">
      <section className="no-print border-b border-border pb-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <FileText className="size-5" />
              <span className="text-xs font-bold">الإصدار الرسمي PDF</span>
            </div>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">التقارير</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
              اختر تقريرًا منفردًا أو اجمع عدة سجلات، ثم احفظ التقرير بصيغة PDF بالكليشة الرسمية
              وتوقيع الموجه الطلابي ومدير المدرسة.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => void exportOfficialPdf()}
              disabled={isExporting || isLoading}
            >
              <FileDown className="size-4" />
              {isExporting ? "جارٍ إنشاء PDF..." : "حفظ PDF للتقرير الرسمي"}
            </Button>
            <Button type="button" variant="outline" onClick={() => requestPrint()}>
              <Printer className="size-4" /> طباعة A4
            </Button>
            <Button type="button" variant="ghost" onClick={reset}>
              <RotateCcw className="size-4" />
              إعادة ضبط
            </Button>
          </div>
        </div>
      </section>

      <section className="no-print rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="space-y-5">
          <div>
            <Label>نوع التقرير</Label>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setReportMode("single")}
                className={`rounded-xl border p-4 text-right transition ${reportMode === "single" ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}
              >
                <div className="flex items-center gap-3">
                  <FileText className={`size-5 ${reportMode === "single" ? "text-primary" : ""}`} />
                  <div>
                    <p className="font-bold">تقرير منفرد</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      اختر سجلًا واحدًا واطبعه مباشرة.
                    </p>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setReportMode("combined")}
                className={`rounded-xl border p-4 text-right transition ${reportMode === "combined" ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}
              >
                <div className="flex items-center gap-3">
                  <CheckSquare
                    className={`size-5 ${reportMode === "combined" ? "text-primary" : ""}`}
                  />
                  <div>
                    <p className="font-bold">تقرير مجمع</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      اجمع أكثر من سجل في تقرير رسمي واحد.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {reportMode === "single" ? (
            <div>
              <Label htmlFor="single-report-record">السجل المطلوب طباعته</Label>
              <select
                id="single-report-record"
                value={selectedSingleKey}
                onChange={(event) => setSelectedSingleKey(event.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {reportableRecords.map((record) => (
                  <option key={record.key} value={record.key}>
                    {record.title} ({filteredSections[record.key]?.length ?? 0} سجل)
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between gap-3">
                <Label>السجلات التي ستظهر في التقرير</Label>
                <div className="flex gap-1">
                  <Button type="button" size="sm" variant="ghost" onClick={selectAll}>
                    الكل
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={clearAll}>
                    مسح
                  </Button>
                </div>
              </div>
              <div className="mt-2 grid max-h-64 grid-cols-1 gap-2 overflow-y-auto rounded-xl border border-border p-3 sm:grid-cols-2 lg:grid-cols-3">
                {reportableRecords.map((record) => {
                  const active = selectedKeys.includes(record.key);
                  const count = filteredSections[record.key]?.length ?? 0;
                  return (
                    <button
                      key={record.key}
                      type="button"
                      onClick={() => toggleRecord(record.key)}
                      className={`flex items-center justify-between gap-2 rounded-lg border p-3 text-right text-xs transition hover:bg-muted ${active ? "border-primary bg-primary/5" : "border-border"}`}
                    >
                      <span className="flex items-center gap-2 font-semibold">
                        {active ? (
                          <CheckSquare className="size-4 text-primary" />
                        ) : (
                          <Square className="size-4" />
                        )}
                        {record.title}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <PrintStat label="السجلات المختارة" value={selectedRecords.length} />
            <PrintStat label="إجمالي الصفوف" value={totalRows} />
            <PrintStat label="الطلاب" value={filteredSections.students?.length ?? 0} />
            <PrintStat label="الشواهد" value={filteredSections.evidences?.length ?? 0} />
          </div>

          {isLoading && <p className="text-xs text-muted-foreground">جارٍ تحميل السجلات...</p>}
          {isError && (
            <div className="flex items-center gap-3 text-xs text-destructive">
              <span>تعذّر تحميل بيانات التقرير.</span>
              <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
                إعادة المحاولة
              </Button>
            </div>
          )}
          {data?.errors.length ? (
            <p className="text-xs text-amber-700">
              تعذر الوصول إلى: {data.errors.map((error) => error.key).join("، ")}
            </p>
          ) : null}
        </div>
      </section>

      <div
        ref={printRef}
        className="reports-print-sheet print-area hidden bg-paper text-paper-foreground print:block"
      >
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
                <p>
                  <strong>الفترة:</strong> {period || "—"}
                </p>
                <p>
                  <strong>النطاق:</strong> {fromDate || "بداية البيانات"} إلى{" "}
                  {toDate || "نهاية البيانات"}
                </p>
              </div>
            </div>
          </section>

          <section className="report-summary mt-6">
            <h2 className="mb-3 border-r-4 border-primary pr-3 text-base font-black">
              ملخص مؤشرات الأداء
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {kpis.map((kpi) => (
                <div
                  key={kpi.key}
                  className="rounded-xl border border-paper-border bg-paper-muted p-3"
                >
                  <p className="text-[11px] text-muted-foreground">{kpi.title}</p>
                  <p className="mt-1 text-xl font-black text-primary">
                    {isPercentKpi(kpi.key) ? `${kpi.value}%` : kpi.value}
                  </p>
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
                  <h2 className="border-r-4 border-primary pr-3 text-base font-black">
                    {record.title}
                  </h2>
                  <span className="text-xs font-bold text-muted-foreground">
                    عدد السجلات: {rows.length}
                  </span>
                </div>
                {columns.length ? (
                  rows.length ? (
                    <div className="report-table-wrap overflow-visible">
                      <table className="w-full border-collapse text-right text-[9px] leading-5">
                        <thead>
                          <tr className="bg-paper-muted">
                            {columns.map((column) => (
                              <th
                                key={column.key}
                                className="border border-paper-border p-1.5 font-bold"
                              >
                                {column.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, index) => (
                            <tr key={String(row.id ?? index)}>
                              {columns.map((column) => (
                                <td
                                  key={column.key}
                                  className="border border-paper-border p-1.5 align-top break-words"
                                >
                                  {displayRecordValue(row[column.key], column.type)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-paper-border p-3 text-center text-xs text-muted-foreground">
                      لا توجد بيانات ضمن النطاق المحدد.
                    </p>
                  )
                ) : (
                  <p className="rounded-lg border border-dashed border-paper-border p-3 text-center text-xs text-muted-foreground">
                    لا توجد حقول قابلة للعرض في هذا السجل.
                  </p>
                )}
              </section>
            );
          })}

          <section className="report-analysis mt-8 break-inside-avoid">
            <h2 className="mb-3 border-r-4 border-primary pr-3 text-base font-black">
              التحليل والملاحظات والتوصيات
            </h2>
            <div className="min-h-32 rounded-xl border border-paper-border p-4">
              <p className="whitespace-pre-wrap text-sm leading-8">
                {narrative.trim() || "لا توجد ملاحظات أو توصيات إضافية."}
              </p>
            </div>
          </section>

          <section className="report-approval mt-10 break-inside-avoid">
            <div className="rounded-xl border border-paper-border bg-paper-muted p-4 text-center text-xs leading-7">
              أُعد هذا التقرير من خلال منصة الذات للتوجيه الطلابي، وتمت مراجعته واعتماده من الجهة
              المختصة في المدرسة.
            </div>
          </section>

          <OfficialFooter school={school} repeatEveryPage={false} />
        </main>
      </div>
    </div>
  );
}

function PrintStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-paper-border bg-paper-muted p-3 text-center">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}
