import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  FileUp,
  RefreshCw,
  School,
  ShieldCheck,
  Table2,
  Users,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { autoMap, cleanId, cleanPhone } from "@/lib/students-import";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const SOURCES = {
  madrasati: {
    label: "مدرستي",
    url: "https://schools.madrasati.sa/",
    hint: "استخدم كشف الطلاب أو الملف الذي تم تصديره من مدرستي.",
  },
  noor: {
    label: "نور",
    url: "https://noor.moe.gov.sa/Noor/Login.aspx",
    hint: "استخدم كشف الطلاب الرسمي المصدّر من نظام نور.",
  },
} as const;

type SourceKey = keyof typeof SOURCES;
type Row = Record<string, string>;
type PreparedStudent = {
  rowNumber: number;
  full_name: string;
  national_id: string;
  stage: string | null;
  grade: string | null;
  classroom: string | null;
  guardian_name: string | null;
  guardian_phone: string;
};

function rowsFromMatrix(matrix: unknown[][]): Row[] {
  const headers = (matrix[0] ?? []).map((value) => String(value ?? "").trim());
  return matrix
    .slice(1)
    .filter((line) => line.some((value) => String(value ?? "").trim()))
    .map((line) =>
      Object.fromEntries(
        headers.map((header, index) => [header, String(line[index] ?? "").trim()]),
      ),
    );
}

function rowsFromText(value: string): Row[] {
  const lines = value.trim().split(/\r?\n/).filter(Boolean);
  return rowsFromMatrix(lines.map((line) => line.split(/\t|,/)));
}

function prepareRows(rows: Row[]) {
  if (!rows.length) {
    return {
      mapping: {} as Record<string, string>,
      records: [] as PreparedStudent[],
      invalid: [] as PreparedStudent[],
      duplicateIds: new Set<string>(),
    };
  }

  const mapping = autoMap(Object.keys(rows[0]!));
  const records = rows.map((row, index) => {
    const value = (field: string) => {
      const header = mapping[field] || "";
      return header ? String(row[header] ?? "").trim() : "";
    };
    return {
      rowNumber: index + 2,
      full_name: value("full_name"),
      national_id: cleanId(value("national_id")),
      stage: value("stage") || null,
      grade: value("grade") || null,
      classroom: value("classroom") || null,
      guardian_name: value("guardian_name") || null,
      guardian_phone: cleanPhone(value("guardian_phone")),
    };
  });

  const invalid = records.filter(
    (record) => !record.full_name || record.national_id.length !== 10,
  );
  const seen = new Set<string>();
  const duplicateIds = new Set<string>();
  records.forEach((record) => {
    if (!record.national_id) return;
    if (seen.has(record.national_id)) duplicateIds.add(record.national_id);
    seen.add(record.national_id);
  });

  return { mapping, records, invalid, duplicateIds };
}

export function ExternalPlatformImporter() {
  const queryClient = useQueryClient();
  const [source, setSource] = useState<SourceKey>("noor");
  const [paste, setPaste] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [fileName, setFileName] = useState("");

  const prepared = useMemo(() => prepareRows(rows), [rows]);
  const validCount =
    prepared.records.length -
    prepared.invalid.length -
    prepared.records.filter((row) => prepared.duplicateIds.has(row.national_id)).length;

  function resetImport() {
    setPaste("");
    setRows([]);
    setMessage("");
    setFileName("");
  }

  async function handleFile(file: File) {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) throw new Error("الملف لا يحتوي على ورقة بيانات.");
      const sheet = workbook.Sheets[firstSheetName];
      if (!sheet) throw new Error("تعذر قراءة ورقة البيانات.");
      const next = rowsFromMatrix(
        XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][],
      );
      setRows(next);
      setFileName(file.name);
      setMessage(`تمت قراءة ${next.length} صف من ${SOURCES[source].label}. راجع الجودة والمطابقة قبل الحفظ.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر قراءة الملف.");
    }
  }

  async function saveRows() {
    if (!prepared.records.length) {
      toast.error("أضف ملفًا أو جدولًا أولاً.");
      return;
    }
    if (prepared.invalid.length) {
      toast.error(
        `يوجد ${prepared.invalid.length} صف غير مكتمل. يلزم اسم الطالب وهوية من 10 أرقام.`,
      );
      return;
    }
    if (prepared.duplicateIds.size) {
      toast.error(
        `يوجد ${prepared.duplicateIds.size} رقم هوية مكرر داخل الملف. صحح التكرار قبل الحفظ.`,
      );
      return;
    }

    setBusy(true);
    try {
      const nationalIds = prepared.records.map((record) => record.national_id);
      const { data: existing, error: existingError } = await supabase
        .from("students")
        .select("national_id")
        .in("national_id", nationalIds);
      if (existingError) throw existingError;

      const existingIds = new Set(
        (existing ?? []).map((item) => String(item.national_id ?? "")),
      );
      const newRecords = prepared.records
        .filter((record) => !existingIds.has(record.national_id))
        .map(({ rowNumber: _rowNumber, ...record }) => record);

      if (!newRecords.length) {
        toast.info("كل الطلاب في هذا الملف موجودون مسبقًا في «الذات».");
        setMessage("لم تتم إضافة سجلات جديدة؛ جميع الهويات موجودة مسبقًا.");
        return;
      }

      const { error } = await supabase.from("students").insert(newRecords);
      if (error) throw error;

      const skipped = prepared.records.length - newRecords.length;
      await queryClient.invalidateQueries({ queryKey: ["students"] });
      await queryClient.invalidateQueries({ queryKey: ["student-options"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-core"] });
      toast.success(`تم استيراد ${newRecords.length} طالب إلى «الذات».`);
      setMessage(
        `اكتمل الاستيراد: ${newRecords.length} جديد، ${skipped} موجود مسبقًا. لم يتم حذف أو استبدال أي طالب قائم.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر حفظ البيانات.");
    } finally {
      setBusy(false);
    }
  }

  const mappedFields = [
    ["full_name", "اسم الطالب"],
    ["national_id", "رقم الهوية"],
    ["stage", "المرحلة"],
    ["grade", "الصف"],
    ["classroom", "الفصل"],
    ["guardian_name", "ولي الأمر"],
    ["guardian_phone", "جوال ولي الأمر"],
  ] as const;

  return (
    <section className="space-y-5 rounded-3xl border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black">
            <FileSpreadsheet className="size-5 text-primary" /> استيراد الطلاب إلى «الذات»
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-7 text-muted-foreground">
            استورد كشف الطلاب الرسمي من نور أو مدرستي، ثم راجع المطابقة والجودة قبل إضافة أي سجل.
            الاستيراد يضيف الجديد فقط ولا يستبدل الطلاب الموجودين.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SOURCES) as SourceKey[]).map((key) => (
            <Button
              key={key}
              type="button"
              variant={source === key ? "default" : "outline"}
              onClick={() => {
                setSource(key);
                resetImport();
              }}
            >
              <School className="size-4" /> {SOURCES[key].label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-primary/15 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-bold">المصدر الحالي: {SOURCES[source].label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{SOURCES[source].hint}</p>
        </div>
        <Button asChild type="button" variant="outline">
          <a href={SOURCES[source].url} target="_blank" rel="noreferrer noopener">
            <ExternalLink className="size-4" /> فتح {SOURCES[source].label}
          </a>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-bold">1. ارفع ملف Excel أو CSV</label>
          <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground hover:bg-muted/50">
            <FileUp className="size-6 text-primary" />
            <span className="font-bold text-foreground">
              {fileName || "اختر ملف التصدير الرسمي"}
            </span>
            <span className="text-xs">XLSX / XLS / CSV</span>
            <input
              className="hidden"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold">أو الصق جدولاً مباشرة</label>
          <Textarea
            rows={5}
            value={paste}
            onChange={(event) => setPaste(event.target.value)}
            placeholder="الصق صف العناوين ثم بيانات الطلاب من Excel أو النظام"
          />
          <Button
            type="button"
            variant="outline"
            disabled={!paste.trim()}
            onClick={() => {
              const next = rowsFromText(paste);
              setRows(next);
              setFileName("بيانات ملصقة");
              setMessage(`تم تجهيز ${next.length} صف للمعاينة.`);
            }}
          >
            <Table2 className="size-4" /> تحليل ومعاينة
          </Button>
        </div>
      </div>

      {rows.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric icon={Users} label="إجمالي الصفوف" value={rows.length} />
            <Metric
              icon={CheckCircle2}
              label="صالحة مبدئيًا"
              value={Math.max(0, validCount)}
              tone="success"
            />
            <Metric
              icon={AlertTriangle}
              label="ناقصة"
              value={prepared.invalid.length}
              tone={prepared.invalid.length ? "warning" : "default"}
            />
            <Metric
              icon={RefreshCw}
              label="تكرار داخل الملف"
              value={prepared.duplicateIds.size}
              tone={prepared.duplicateIds.size ? "warning" : "default"}
            />
          </div>

          <div className="rounded-2xl border p-4">
            <p className="mb-3 text-sm font-black">مطابقة أعمدة الملف مع «الذات»</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {mappedFields.map(([field, label]) => (
                <div key={field} className="rounded-lg bg-muted/40 p-3 text-xs">
                  <p className="font-bold">{label}</p>
                  <p className="mt-1 truncate text-muted-foreground">
                    {prepared.mapping[field] || "لم تتم المطابقة"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <Preview
            rows={rows}
            busy={busy}
            canSave={!prepared.invalid.length && !prepared.duplicateIds.size}
            onSave={() => void saveRows()}
          />
        </>
      )}

      {message && (
        <div className="flex items-start gap-2 rounded-xl bg-primary/5 p-3 text-sm leading-6">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          {message}
        </div>
      )}
    </section>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: typeof Users;
  label: string;
  value: number;
  tone?: "default" | "success" | "warning";
}) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="flex items-center gap-2">
        <Icon
          className={
            tone === "success"
              ? "size-4 text-emerald-600"
              : tone === "warning"
                ? "size-4 text-amber-600"
                : "size-4 text-primary"
          }
        />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function Preview({
  rows,
  busy,
  canSave,
  onSave,
}: {
  rows: Row[];
  busy: boolean;
  canSave: boolean;
  onSave: () => void;
}) {
  const headers = Object.keys(rows[0]!);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold">معاينة أول {Math.min(rows.length, 10)} صفوف</span>
        <Button type="button" onClick={onSave} disabled={busy || !canSave}>
          <CheckCircle2 className="size-4" />
          {busy ? "جارٍ الاستيراد..." : "اعتماد وحفظ الطلاب الجدد"}
        </Button>
      </div>
      <div className="max-h-72 overflow-auto rounded-xl border">
        <table className="w-full text-right text-xs">
          <thead className="sticky top-0 bg-muted">
            <tr>
              {headers.slice(0, 7).map((header) => (
                <th key={header} className="whitespace-nowrap p-2">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 10).map((row, index) => (
              <tr key={index} className="border-t">
                {headers.slice(0, 7).map((header) => (
                  <td key={header} className="max-w-48 truncate p-2">
                    {row[header]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
