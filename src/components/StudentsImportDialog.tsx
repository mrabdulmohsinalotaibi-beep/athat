import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { suggestStudentImportMapping } from "@/lib/deepseek.functions";
import { readExcel, sheetHeaders } from "@/lib/sheet";
import {
  STUDENT_IMPORT_FIELDS,
  autoMap,
  mergeMappings,
  normalizeStudentValues,
  studentIdentityKeys,
  studentImportWarnings,
  type StudentImportValues,
} from "@/lib/students-import";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type SheetRow = Record<string, unknown>;
type ReportRow = {
  row: number;
  name: string;
  reason: string;
};

type ImportResult = {
  inserted: number;
  updatedExisting: number;
  duplicateFile: ReportRow[];
  duplicateExisting: ReportRow[];
  warnings: ReportRow[];
  errors: ReportRow[];
};

type PreparedRow = {
  sourceIndex: number;
  rowNo: number;
  values: StudentImportValues;
  keys: string[];
  warnings: string[];
};

function countFilled(values: StudentImportValues) {
  return Object.values(values).filter((value) => String(value ?? "").trim()).length;
}

function mergeStudentValues(
  primary: StudentImportValues,
  secondary: StudentImportValues,
): StudentImportValues {
  const merged = { ...primary };
  for (const field of STUDENT_IMPORT_FIELDS) {
    if (!merged[field.name] && secondary[field.name]) {
      merged[field.name] = secondary[field.name];
    }
  }
  return merged;
}

export function StudentsImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiStatus, setAiStatus] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  function reset() {
    setFileName("");
    setRows([]);
    setHeaders([]);
    setMapping({});
    setResult(null);
    setAiStatus("");
    setAiBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function valuesFromRow(
    row: SheetRow,
    activeMapping = mapping,
  ): StudentImportValues {
    const rawValues: Record<string, unknown> = {};
    for (const field of STUDENT_IMPORT_FIELDS) {
      const column = activeMapping[field.name];
      rawValues[field.name] = column ? row[column] : "";
    }
    return normalizeStudentValues(rawValues);
  }

  async function enhanceMappingWithAi(
    activeHeaders = headers,
    localMapping = mapping,
  ) {
    if (!activeHeaders.length) return;
    setAiBusy(true);
    setAiStatus("DeepSeek يحلل عناوين الأعمدة...");
    try {
      const response = await suggestStudentImportMapping({
        data: { headers: activeHeaders },
      });
      const next = mergeMappings(localMapping, response.mapping, activeHeaders);
      setMapping(next);
      const aiAdded = STUDENT_IMPORT_FIELDS.filter(
        (field) => !localMapping[field.name] && next[field.name],
      ).length;
      setAiStatus(
        aiAdded
          ? `اكتملت المطابقة الذكية، وتم التعرف على ${aiAdded} عمود إضافي.`
          : "اكتملت المطابقة الذكية. العناوين الحالية واضحة ولا تحتاج تغييرات إضافية.",
      );
    } catch (error) {
      setAiStatus(
        `تعذرت المطابقة بالذكاء الصناعي، وستبقى المطابقة المحلية متاحة: ${
          error instanceof Error ? error.message : "خطأ غير معروف"
        }`,
      );
    } finally {
      setAiBusy(false);
    }
  }

  async function pickFile(file: File) {
    try {
      const parsed = await readExcel(file);
      if (!parsed.length) {
        toast.error("الملف لا يحتوي على بيانات.");
        return;
      }
      const hdrs = sheetHeaders(parsed);
      const localMapping = autoMap(hdrs);
      setFileName(file.name);
      setRows(parsed);
      setHeaders(hdrs);
      setMapping(localMapping);
      setResult(null);
      setAiStatus("تمت القراءة. جارٍ تحسين توزيع الأعمدة بالذكاء الصناعي.");
      void enhanceMappingWithAi(hdrs, localMapping);
    } catch (error) {
      toast.error(`تعذّرت قراءة الملف: ${(error as Error).message}`);
    }
  }

  const prepared = useMemo<PreparedRow[]>(
    () =>
      rows.map((row, index) => {
        const values = valuesFromRow(row);
        return {
          sourceIndex: index,
          rowNo: index + 2,
          values,
          keys: studentIdentityKeys(values),
          warnings: studentImportWarnings(values),
        };
      }),
    [rows, mapping],
  );

  const duplicatePreview = useMemo(() => {
    const seen = new Map<string, number>();
    const duplicateIndexes = new Set<number>();
    const details: ReportRow[] = [];

    for (const item of prepared) {
      if (!item.values.full_name) continue;
      const repeatedKey = item.keys.find((key) => seen.has(key));
      if (repeatedKey) {
        duplicateIndexes.add(item.sourceIndex);
        details.push({
          row: item.rowNo,
          name: item.values.full_name,
          reason: "مكرر داخل ملف الاستيراد",
        });
        continue;
      }
      item.keys.forEach((key) => seen.set(key, item.sourceIndex));
    }

    return { duplicateIndexes, details };
  }, [prepared]);

  const missingRequired = STUDENT_IMPORT_FIELDS.filter(
    (field) => field.required && !mapping[field.name],
  );

  const warningCount = prepared.reduce(
    (total, item) => total + item.warnings.length,
    0,
  );
  const missingNameCount = prepared.filter(
    (item) => !item.values.full_name,
  ).length;
  const preview = prepared.slice(0, 8);

  function removePendingDuplicates() {
    if (!duplicatePreview.duplicateIndexes.size) return;
    setRows((currentRows) =>
      currentRows.filter(
        (_row, index) => !duplicatePreview.duplicateIndexes.has(index),
      ),
    );
    toast.success(
      `تم حذف ${duplicatePreview.duplicateIndexes.size} صف مكرر من ملف الاستيراد قبل الحفظ.`,
    );
  }

  async function runImport() {
    if (missingRequired.length) {
      toast.error("يلزم تعيين عمود اسم الطالب قبل الاستيراد.");
      return;
    }

    setBusy(true);
    try {
      const { data: existing, error: existingError } = await supabase
        .from("students")
        .select(
          "id,student_no,full_name,national_id,nationality,gender,stage,grade,classroom,guardian_name,guardian_phone,address,health_status,social_status,status,notes",
        );
      if (existingError) throw existingError;

      const existingKeys = new Set<string>();
      const existingByKey = new Map<string, any>();
      for (const student of existing ?? []) {
        studentIdentityKeys({
          national_id: String(student.national_id ?? ""),
          student_no: String(student.student_no ?? ""),
          full_name: String(student.full_name ?? ""),
          stage: String(student.stage ?? ""),
          grade: String(student.grade ?? ""),
          classroom: String(student.classroom ?? ""),
          guardian_phone: String(student.guardian_phone ?? ""),
        }).forEach((key) => {
          existingKeys.add(key);
          existingByKey.set(key, student);
        });
      }

      const duplicateFile: ReportRow[] = [];
      const duplicateExisting: ReportRow[] = [];
      const warnings: ReportRow[] = [];
      const errors: ReportRow[] = [];
      const uniqueRows: PreparedRow[] = [];
      const keyToIndex = new Map<string, number>();

      for (const item of prepared) {
        const name = item.values.full_name || "—";

        if (!item.values.full_name) {
          errors.push({
            row: item.rowNo,
            name,
            reason: "اسم الطالب مفقود؛ تعذر إنشاء سجل طالب بدون اسم.",
          });
          continue;
        }

        item.warnings.forEach((reason) =>
          warnings.push({ row: item.rowNo, name, reason }),
        );

        const repeatedKey = item.keys.find((key) => keyToIndex.has(key));
        if (repeatedKey) {
          const targetIndex = keyToIndex.get(repeatedKey)!;
          const target = uniqueRows[targetIndex]!;
          const richer =
            countFilled(item.values) > countFilled(target.values)
              ? mergeStudentValues(item.values, target.values)
              : mergeStudentValues(target.values, item.values);
          uniqueRows[targetIndex] = {
            ...target,
            values: richer,
            keys: studentIdentityKeys(richer),
          };
          duplicateFile.push({
            row: item.rowNo,
            name,
            reason: "مكرر داخل الملف؛ تم دمج البيانات الناقصة وعدم إنشاء سجل ثانٍ.",
          });
          continue;
        }

        const nextIndex = uniqueRows.length;
        uniqueRows.push(item);
        item.keys.forEach((key) => keyToIndex.set(key, nextIndex));
      }

      const rowsToInsert: PreparedRow[] = [];
      let updatedExisting = 0;
      for (const item of uniqueRows) {
        const matchedKey = item.keys.find((key) => existingKeys.has(key));
        if (matchedKey) {
          const current = existingByKey.get(matchedKey);
          const patch: Record<string, string> = {};
          for (const field of STUDENT_IMPORT_FIELDS) {
            const incoming = item.values[field.name];
            const oldValue = String(current?.[field.name] ?? "").trim();
            if (!oldValue && incoming) patch[field.name] = incoming;
          }
          if (current?.id && Object.keys(patch).length) {
            const { error: updateError } = await supabase.from("students").update(patch as never).eq("id", current.id);
            if (updateError) {
              errors.push({ row: item.rowNo, name: item.values.full_name, reason: `تعذر استكمال بيانات الطالب الموجود: ${updateError.message}` });
            } else {
              updatedExisting += 1;
              duplicateExisting.push({
                row: item.rowNo,
                name: item.values.full_name,
                reason: `الطالب موجود مسبقًا؛ تم استكمال ${Object.keys(patch).length} خانة فارغة دون استبدال بياناته الحالية.`,
              });
            }
          } else {
            duplicateExisting.push({
              row: item.rowNo,
              name: item.values.full_name,
              reason: "الطالب موجود مسبقًا في الموقع؛ لم تتم إضافته مرة أخرى ولم تُستبدل بياناته الحالية.",
            });
          }
          continue;
        }
        rowsToInsert.push(item);
      }

      let inserted = 0;
      for (let i = 0; i < rowsToInsert.length; i += 200) {
        const chunk = rowsToInsert.slice(i, i + 200);
        const payloads = chunk.map((item) => {
          const payload: Record<string, string | null> = {};
          for (const field of STUDENT_IMPORT_FIELDS) {
            payload[field.name] = item.values[field.name] || null;
          }
          if (!payload.status) payload.status = "نشط";
          return payload;
        });

        const { error } = await supabase.from("students").insert(payloads as never);
        if (error) {
          chunk.forEach((item) =>
            errors.push({
              row: item.rowNo,
              name: item.values.full_name || "—",
              reason: `خطأ في الحفظ: ${error.message}`,
            }),
          );
        } else {
          inserted += chunk.length;
        }
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["students"] }),
        queryClient.invalidateQueries({ queryKey: ["student-options"] }),
        queryClient.invalidateQueries({ queryKey: ["students-filter-options"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-core"] }),
      ]);

      setResult({
        inserted,
        updatedExisting,
        duplicateFile,
        duplicateExisting,
        warnings,
        errors,
      });

      if (inserted) {
        toast.success(
          `تمت إضافة ${inserted} طالب جديد. تم استبعاد التكرار تلقائيًا.`,
        );
      } else if (duplicateExisting.length || duplicateFile.length) {
        toast.info("لم تُضف سجلات جديدة؛ راجع تقرير التكرار.");
      } else {
        toast.error("لم يتم استيراد أي صف. راجع التقرير.");
      }
    } catch (error) {
      toast.error(
        `تعذّر الاستيراد: ${
          error instanceof Error ? error.message : "خطأ غير معروف"
        }`,
      );
    } finally {
      setBusy(false);
    }
  }

  function downloadReport() {
    if (!result) return;

    const items = [
      ...result.duplicateFile.map((item) => ({
        ...item,
        type: "مكرر داخل الملف",
      })),
      ...result.duplicateExisting.map((item) => ({
        ...item,
        type: "موجود مسبقًا",
      })),
      ...result.warnings.map((item) => ({ ...item, type: "ملاحظة" })),
      ...result.errors.map((item) => ({ ...item, type: "خطأ" })),
    ];

    const csv = [
      "النوع,رقم الصف,اسم الطالب,التفاصيل",
      ...items.map((item) =>
        [item.type, item.row || "", item.name, item.reason]
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      ),
    ].join("\n");

    const url = URL.createObjectURL(
      new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "تقرير_الاستيراد_الذكي_للطلاب.csv";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  const resultRows = result
    ? [
        ...result.duplicateFile,
        ...result.duplicateExisting,
        ...result.errors,
      ]
    : [];

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) reset();
        onOpenChange(value);
      }}
    >
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            الاستيراد الذكي لبيانات الطلاب
          </DialogTitle>
          <DialogDescription>
            ارفع Excel أو CSV. يوزع النظام البيانات على حقول الطالب، وينظف القيم،
            ويستنتج المرحلة من الصف عند الإمكان، ويمنع إضافة الطالب المكرر.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void pickFile(file);
            }}
          />

          {!rows.length && !result && (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <FileSpreadsheet className="mx-auto size-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                يقبل الملفات غير المرتبة والعناوين المكتوبة بصيغ مختلفة أو بأخطاء
                بسيطة، بما فيها الشرطة السفلية _.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                للخصوصية: DeepSeek يستقبل عناوين الأعمدة فقط، ولا تُرسل إليه أسماء
                الطلاب أو الهويات أو أرقام الجوال.
              </p>
              <Button className="mt-4" onClick={() => fileRef.current?.click()}>
                <Upload className="size-4" /> اختيار ملف
              </Button>
            </div>
          )}

          {rows.length > 0 && !result && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  الملف: <span className="font-semibold text-foreground">{fileName}</span>{" "}
                  — {rows.length} صف
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={aiBusy}
                  onClick={() => void enhanceMappingWithAi()}
                >
                  {aiBusy ? (
                    <RefreshCw className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  مطابقة ذكية بـ DeepSeek
                </Button>
              </div>

              {aiStatus && (
                <div className="rounded-lg border bg-primary/5 p-3 text-xs leading-6">
                  {aiStatus}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="إجمالي الصفوف" value={rows.length} />
                <Metric
                  label="مكرر داخل الملف"
                  value={duplicatePreview.details.length}
                  warning={duplicatePreview.details.length > 0}
                />
                <Metric
                  label="صفوف بدون اسم"
                  value={missingNameCount}
                  warning={missingNameCount > 0}
                />
                <Metric
                  label="ملاحظات تحتاج مراجعة"
                  value={warningCount}
                  warning={warningCount > 0}
                />
              </div>

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold">
                    1) توزيع بيانات الملف على خانات الطالب
                  </h3>
                  {duplicatePreview.details.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={removePendingDuplicates}
                    >
                      <Trash2 className="size-4" />
                      حذف المكرر من الملف ({duplicatePreview.details.length})
                    </Button>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {STUDENT_IMPORT_FIELDS.map((field) => (
                    <div key={field.name}>
                      <Label className="mb-1.5 block text-xs">
                        {field.label}{" "}
                        {field.required && (
                          <span className="text-destructive">*</span>
                        )}
                      </Label>
                      <select
                        value={mapping[field.name] ?? ""}
                        onChange={(event) =>
                          setMapping((currentMapping) => ({
                            ...currentMapping,
                            [field.name]: event.target.value,
                          }))
                        }
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="">— لا يوجد —</option>
                        {headers.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                {missingRequired.length > 0 && (
                  <p className="mt-2 flex items-center gap-2 text-xs text-destructive">
                    <AlertTriangle className="size-4" />
                    يجب تعيين:{" "}
                    {missingRequired.map((field) => field.label).join("، ")}
                  </p>
                )}
              </div>

              <div>
                <h3 className="mb-2 text-sm font-bold">
                  2) معاينة البيانات بعد التنظيف والتوزيع
                </h3>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b bg-muted/60">
                        {[
                          "اسم الطالب",
                          "رقم الهوية",
                          "المرحلة",
                          "الصف",
                          "الفصل",
                          "ولي الأمر",
                          "الجوال",
                          "الحالة",
                        ].map((label) => (
                          <th key={label} className="whitespace-nowrap p-2 font-bold">
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((item) => (
                        <tr key={item.sourceIndex} className="border-b last:border-0">
                          <td className="whitespace-nowrap p-2">
                            {item.values.full_name || "—"}
                          </td>
                          <td className="whitespace-nowrap p-2">
                            {item.values.national_id || "—"}
                          </td>
                          <td className="whitespace-nowrap p-2">
                            {item.values.stage || "—"}
                          </td>
                          <td className="whitespace-nowrap p-2">
                            {item.values.grade || "—"}
                          </td>
                          <td className="whitespace-nowrap p-2">
                            {item.values.classroom || "—"}
                          </td>
                          <td className="whitespace-nowrap p-2">
                            {item.values.guardian_name || "—"}
                          </td>
                          <td className="whitespace-nowrap p-2">
                            {item.values.guardian_phone || "—"}
                          </td>
                          <td className="whitespace-nowrap p-2">
                            {item.warnings.length ? (
                              <span className="text-amber-700">
                                {item.warnings.join("، ")}
                              </span>
                            ) : (
                              <span className="text-emerald-700">جاهز</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  الصفوف التي تحتوي على أخطاء غير حرجة ستُستورد مع توضيحها في
                  التقرير. الصف الوحيد الذي لا يمكن حفظه هو الصف الذي لا يحتوي على
                  اسم طالب.
                </p>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="تمت إضافتهم" value={result.inserted} />
                <Metric label="تم استكمال بياناتهم" value={result.updatedExisting} />
                <Metric
                  label="مكرر داخل الملف"
                  value={result.duplicateFile.length}
                  warning={result.duplicateFile.length > 0}
                />
                <Metric
                  label="موجود مسبقًا"
                  value={result.duplicateExisting.length}
                  warning={result.duplicateExisting.length > 0}
                />
                <Metric
                  label="تعذر حفظه"
                  value={result.errors.length}
                  warning={result.errors.length > 0}
                />
              </div>

              <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-4 text-sm leading-6">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
                <span>
                  اكتمل الاستيراد. أضيف الجديد فقط، وتم دمج التكرار داخل الملف، واستُكملت الخانات الفارغة للطلاب الموجودين دون استبدال بياناتهم الحالية.
                  {result.warnings.length > 0 &&
                    ` يوجد ${result.warnings.length} ملاحظة جودة على البيانات المستوردة.`}
                </span>
              </div>

              {(resultRows.length > 0 || result.warnings.length > 0) && (
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={downloadReport}
                  >
                    <Download className="size-4" />
                    تنزيل تقرير الاستيراد والتكرار
                  </Button>

                  {resultRows.length > 0 && (
                    <div className="max-h-64 overflow-y-auto rounded-lg border">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="border-b bg-muted/60">
                            <th className="p-2 font-bold">الصف في الملف</th>
                            <th className="p-2 font-bold">الاسم</th>
                            <th className="p-2 font-bold">النتيجة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resultRows.map((item, index) => (
                            <tr key={index} className="border-b last:border-0">
                              <td className="p-2">{item.row || "—"}</td>
                              <td className="p-2">{item.name}</td>
                              <td className="p-2">{item.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            {result ? (
              <>
                <Button variant="outline" onClick={reset}>
                  استيراد ملف آخر
                </Button>
                <Button onClick={() => onOpenChange(false)}>إغلاق</Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  إلغاء
                </Button>
                {rows.length > 0 && (
                  <>
                    <Button variant="outline" onClick={() => fileRef.current?.click()}>
                      تغيير الملف
                    </Button>
                    <Button
                      onClick={() => void runImport()}
                      disabled={busy || missingRequired.length > 0}
                    >
                      {busy
                        ? "جارٍ الاستيراد..."
                        : `استيراد الجديد من ${rows.length} صف`}
                    </Button>
                  </>
                )}
              </>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Metric({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          warning
            ? "mt-1 text-xl font-black text-amber-700"
            : "mt-1 text-xl font-black"
        }
      >
        {value}
      </p>
    </div>
  );
}
