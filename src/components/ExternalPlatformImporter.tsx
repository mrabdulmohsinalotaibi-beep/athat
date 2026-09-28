import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, FileUp, Globe2, Table2 } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { autoMap, cleanId, cleanPhone } from "@/lib/students-import";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const SOURCES = {
  madrasati: "https://schools.madrasati.sa/",
  noor: "https://noor.moe.gov.sa/Noor/Login.aspx",
} as const;

type Row = Record<string, string>;

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

export function ExternalPlatformImporter() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [source, setSource] = useState<keyof typeof SOURCES>("noor");
  const [paste, setPaste] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function readVisibleTable() {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) throw new Error("لم يتم تحميل الصفحة بعد.");
      const table = doc.querySelector("table");
      if (!table) throw new Error("لم يتم العثور على جدول ظاهر.");
      const matrix = [...table.querySelectorAll("tr")].map((tr) =>
        [...tr.querySelectorAll("th,td")].map((cell) => cell.textContent?.trim() ?? ""),
      );
      const next = rowsFromMatrix(matrix);
      setRows(next);
      setMessage(`تمت قراءة ${next.length} صفاً من الصفحة.`);
    } catch {
      setMessage(
        "تعذر قراءة الإطار الخارجي بسبب حماية النطاق. استخدم تصدير Excel/CSV أو الصق الجدول أدناه.",
      );
    }
  }

  async function handleFile(file: File) {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) throw new Error("الملف لا يحتوي على ورقة بيانات.");
    const sheet = workbook.Sheets[firstSheetName];
    if (!sheet) throw new Error("تعذر قراءة ورقة البيانات.");
    setRows(
      rowsFromMatrix(XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][]),
    );
    setMessage(`تم تحميل الملف: ${file.name}`);
  }

  async function saveRows() {
    if (!rows.length) {
      toast.error("أضف بيانات أولاً.");
      return;
    }
    setBusy(true);
    try {
      const firstRow = rows[0]!;
      const headers = Object.keys(firstRow);
      const mapping = autoMap(headers);
      const records = rows.map((row) => {
        const value = (field: string) => {
          const header = mapping[field] || "";
          return header ? row[header] || "" : "";
        };
        return {
          full_name: value("full_name") || "بيانات مستوردة بدون اسم",
          national_id: cleanId(value("national_id")),
          stage: value("stage") || null,
          grade: value("grade") || null,
          classroom: value("classroom") || null,
          guardian_name: value("guardian_name") || null,
          guardian_phone: cleanPhone(value("guardian_phone")),
        };
      });
      const { error } = await supabase.from("students").insert(records);
      if (error) throw new Error(error.message);
      toast.success(`تم حفظ ${records.length} سجل طالب.`);
      setMessage(`نجح الحفظ: ${records.length} سجل.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر حفظ البيانات");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black">
            <Globe2 className="size-5 text-primary" /> جلب البيانات من مدرستي أو نور
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            تصفح المنصة، ثم اقرأ جدولاً مسموحاً أو ارفع التصدير الرسمي واحفظه في Supabase.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={source === "madrasati" ? "default" : "outline"}
            onClick={() => setSource("madrasati")}
          >
            مدرستي
          </Button>
          <Button
            variant={source === "noor" ? "default" : "outline"}
            onClick={() => setSource("noor")}
          >
            نور
          </Button>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border bg-muted/20">
        <iframe
          ref={iframeRef}
          title={`منصة ${source}`}
          src={SOURCES[source]}
          className="h-72 w-full bg-background"
        />
        <div className="flex flex-wrap items-center justify-between gap-2 border-t p-3">
          <span className="text-xs text-muted-foreground">
            لن يتم تجاوز تسجيل الدخول أو رموز التحقق. إذا منعت المنصة العرض داخل الإطار، افتحها في
            تبويب مستقل.
          </span>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="ghost">
              <a href={SOURCES[source]} target="_blank" rel="noreferrer noopener">
                <ExternalLink className="size-4" /> فتح {source === "madrasati" ? "مدرستي" : "نور"}
              </a>
            </Button>
            <Button onClick={readVisibleTable} variant="outline">
              <Table2 className="size-4" /> قراءة الجدول الظاهر
            </Button>
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-bold">رفع Excel أو CSV</label>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-sm text-muted-foreground hover:bg-muted/50">
            <FileUp className="size-5" /> اختر ملفاً
            <input
              className="hidden"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
          </label>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold">لصق جدول من المنصة</label>
          <Textarea
            rows={5}
            value={paste}
            onChange={(event) => setPaste(event.target.value)}
            placeholder="الصق العناوين ثم الصفوف مفصولة بعلامة تبويب"
          />
          <Button
            variant="outline"
            onClick={() => {
              setRows(rowsFromText(paste));
              setMessage("تم تجهيز البيانات للصيانة والمعاينة.");
            }}
          >
            معاينة اللصق
          </Button>
        </div>
      </div>
      {message && (
        <div className="flex items-start gap-2 rounded-xl bg-primary/5 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-primary" />
          {message}
        </div>
      )}
      {rows.length > 0 && <Preview rows={rows} busy={busy} onSave={() => void saveRows()} />}
    </section>
  );
}

function Preview({ rows, busy, onSave }: { rows: Row[]; busy: boolean; onSave: () => void }) {
  const headers = Object.keys(rows[0]!);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold">معاينة {rows.length} صف</span>
        <Button onClick={onSave} disabled={busy}>
          <CheckCircle2 className="size-4" />
          {busy ? "جارٍ الحفظ..." : "حفظ في سجل الطلاب"}
        </Button>
      </div>
      <div className="max-h-52 overflow-auto rounded-xl border">
        <table className="w-full text-right text-xs">
          <thead className="bg-muted">
            <tr>
              {headers.slice(0, 6).map((header) => (
                <th key={header} className="whitespace-nowrap p-2">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 8).map((row, index) => (
              <tr key={index} className="border-t">
                {headers.slice(0, 6).map((header) => (
                  <td key={header} className="p-2">
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
