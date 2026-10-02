import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, FileText, Loader2, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";

import { RecordPage } from "@/components/RecordPage";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { recordByKey } from "@/lib/records";

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({ meta: [{ title: "الحضور والمواظبة | الذات" }] }),
  component: AttendancePage,
});

type ImportedAttendance = {
  student_name: string;
  student_no: string;
  national_id: string;
  adate: string;
  case_type: "غياب" | "غياب بعذر" | "تأخر";
  count_days: number;
  selected: boolean;
  duplicate?: boolean;
};

const arabicDigits = (value: string) =>
  value.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));

function normaliseDate(raw: string) {
  const clean = arabicDigits(raw).trim().replace(/[.]/g, "/");
  const m = clean.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (!m) return "";
  const [, d, mo, y] = m;
  return `${y}-${String(Number(mo)).padStart(2, "0")}-${String(Number(d)).padStart(2, "0")}`;
}

function rowsFromText(text: string): ImportedAttendance[] {
  const lines = text.split(/\n+/).map((line) => arabicDigits(line).replace(/\s+/g, " ").trim()).filter(Boolean);
  const rows: ImportedAttendance[] = [];
  for (const line of lines) {
    const dateMatch = line.match(/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{4}\b/);
    const idMatch = line.match(/\b\d{10}\b/);
    if (!dateMatch || !idMatch) continue;
    const adate = normaliseDate(dateMatch[0]);
    if (!adate) continue;
    const national_id = idMatch[0];
    const studentNoMatch = line.replace(national_id, "").match(/\b\d{4,9}\b/);
    const case_type: ImportedAttendance["case_type"] = /تأخر/.test(line) ? "تأخر" : /بعذر|مبرر/.test(line) ? "غياب بعذر" : "غياب";
    const beforeId = line.slice(0, line.indexOf(national_id)).replace(/\d+/g, "").replace(/[-|:]/g, " ").trim();
    const student_name = beforeId || line.replace(dateMatch[0], "").replace(national_id, "").replace(/\d+/g, "").replace(/غياب|بعذر|مبرر|تأخر/g, "").trim();
    rows.push({ student_name, student_no: studentNoMatch?.[0] ?? "", national_id, adate, case_type, count_days: 1, selected: true });
  }
  return rows;
}

async function extractPdfText(file: File) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  const pages: string[] = [];
  for (let pageNo = 1; pageNo <= doc.numPages; pageNo += 1) {
    const page = await doc.getPage(pageNo);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }
  return pages.join("\n");
}

function AttendancePage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pdf, setPdf] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<ImportedAttendance[]>([]);
  const selectedCount = useMemo(() => rows.filter((r) => r.selected && !r.duplicate).length, [rows]);

  const pickPdf = (file?: File) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return toast.error("يرجى اختيار ملف PDF صادر من إتقان.");
    setPdf(file); setRows([]); toast.success(`تم اختيار ${file.name}`);
  };

  const startImport = async () => {
    if (!pdf) return inputRef.current?.click();
    setBusy(true);
    try {
      const text = await extractPdfText(pdf);
      const parsed = rowsFromText(text);
      if (!parsed.length) {
        toast.error("لم أتمكن من استخراج سجلات من هذا PDF. إذا كان الكشف صورة ممسوحة ضوئيًا فسيحتاج OCR.");
        return;
      }
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("انتهت جلسة الدخول.");
      const dates = [...new Set(parsed.map((r) => r.adate))];
      const { data: existing, error } = await supabase.from("attendance").select("student_no,student_name,adate,case_type").eq("user_id", auth.user.id).in("adate", dates);
      if (error) throw error;
      const marked = parsed.map((row) => ({ ...row, duplicate: (existing ?? []).some((old) => String(old.adate) === row.adate && String(old.case_type) === row.case_type && ((row.student_no && String(old.student_no) === row.student_no) || String(old.student_name).trim() === row.student_name.trim())) }));
      setRows(marked);
      toast.success(`تمت قراءة ${marked.length} سجل. راجعها قبل الحفظ.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر قراءة ملف PDF.");
    } finally { setBusy(false); }
  };

  const saveRows = async () => {
    const chosen = rows.filter((r) => r.selected && !r.duplicate);
    if (!chosen.length) return toast.error("لا توجد سجلات جديدة محددة للحفظ.");
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("انتهت جلسة الدخول.");
      const payload = chosen.map((r, i) => ({ user_id: auth.user!.id, seq: String(i + 1), student_no: r.student_no || r.national_id, student_name: r.student_name, adate: r.adate, case_type: r.case_type, count_days: r.count_days, action: "تم الاستيراد من كشف إتقان", notes: `رقم الهوية: ${r.national_id} | المصدر: ${pdf?.name ?? "إتقان PDF"}` }));
      const { error } = await supabase.from("attendance").insert(payload);
      if (error) throw error;
      toast.success(`تم حفظ ${chosen.length} سجل في الحضور والمواظبة.`);
      setRows([]); setPdf(null);
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر حفظ السجلات."); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-primary/15 bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div><div className="flex items-center gap-2 font-black"><FileText className="size-5 text-primary" />استيراد غياب إتقان PDF</div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">ارفع كشف PDF النصي، ثم راجع السجلات المستخرجة والمكررة قبل إضافتها للمواظبة.</p>
            {pdf && <p className="mt-2 text-xs font-bold text-primary">الملف المحدد: {pdf.name} — {(pdf.size / 1024 / 1024).toFixed(2)} MB</p>}</div>
          <div className="flex flex-wrap gap-2">
            <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => pickPdf(e.target.files?.[0])} />
            <Button variant="outline" onClick={() => inputRef.current?.click()}><Upload className="size-4" />اختيار PDF</Button>
            <Button onClick={startImport} disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}{busy ? "جاري القراءة…" : "قراءة كشف إتقان"}</Button>
          </div>
        </div>
      </section>

      {rows.length > 0 && <section className="rounded-3xl border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="mb-3 flex items-center justify-between"><div><h2 className="font-black">معاينة السجلات المستخرجة</h2><p className="text-xs text-muted-foreground">{rows.length} سجل · {selectedCount} جديد جاهز للحفظ</p></div><Button onClick={saveRows} disabled={saving || !selectedCount}>{saving && <Loader2 className="size-4 animate-spin" />}اعتماد وحفظ ({selectedCount})</Button></div>
        <div className="grid gap-2">
          {rows.map((row, index) => <label key={`${row.national_id}-${row.adate}-${index}`} className={"flex items-start gap-3 rounded-xl border p-3 " + (row.duplicate ? "bg-muted/50 opacity-70" : "bg-background")}>
            <input type="checkbox" className="mt-1" disabled={row.duplicate} checked={row.selected && !row.duplicate} onChange={(e) => setRows((old) => old.map((item, i) => i === index ? { ...item, selected: e.target.checked } : item))} />
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{row.student_name || "اسم غير واضح"}</strong><span className="rounded-full bg-secondary px-2 py-0.5 text-[10px]">{row.case_type}</span>{row.duplicate ? <span className="inline-flex items-center gap-1 text-[10px] text-destructive"><XCircle className="size-3" />مكرر</span> : <span className="inline-flex items-center gap-1 text-[10px] text-primary"><CheckCircle2 className="size-3" />جديد</span>}</div><p className="mt-1 text-xs text-muted-foreground">الهوية: {row.national_id} · التاريخ: {row.adate}{row.student_no ? ` · رقم الطالب: ${row.student_no}` : ""}</p></div>
          </label>)}
        </div>
      </section>}

      <section className="rounded-3xl border bg-card p-3.5 shadow-[var(--shadow-card)] sm:p-4"><RecordPage config={recordByKey("attendance")} /></section>
    </div>
  );
}
