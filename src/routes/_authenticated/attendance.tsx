import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { RecordPage } from "@/components/RecordPage";
import { Button } from "@/components/ui/button";
import { recordByKey } from "@/lib/records";
import { supabase } from "@/integrations/supabase/client";
import { parseAttendanceWithDeepSeek } from "@/lib/deepseek.functions";

type ImportedAttendance = {
  student_no: string;
  student_name: string;
  adate: string;
  case_type: "غياب";
  count_days: number;
  action: string;
  selected: boolean;
  source: string;
};

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({ meta: [{ title: "الحضور والمواظبة | الذات" }, { name: "description", content: "رصد الغياب والتأخر وإجراءات التوجيه الطلابي المتخذة." }] }),
  component: AttendancePage,
});

function normalizeDigits(value: string) {
  return value.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

function isoFromText(value: string) {
  const v = normalizeDigits(value);
  const m = v.match(/(20\d{2})[\/-](\d{1,2})[\/-](\d{1,2})/);
  if (!m) return "";
  return `${m[1]}-${m[2]!.padStart(2, "0")}-${m[3]!.padStart(2, "0")}`;
}

function parseAttendanceText(text: string): ImportedAttendance[] {
  const lines = text.split(/\n+/).map((x) => x.replace(/\s+/g, " ").trim()).filter(Boolean);
  const out: ImportedAttendance[] = [];
  for (const line of lines) {
    if (!/غياب|غائب|absent/i.test(line)) continue;
    const normalized = normalizeDigits(line);
    const id = normalized.match(/\b\d{6,12}\b/)?.[0] ?? "";
    const dateMatch = normalized.match(/20\d{2}[\/-]\d{1,2}[\/-]\d{1,2}/)?.[0] ?? "";
    const date = isoFromText(dateMatch);
    let name = line
      .replace(/غياب|غائب|absent/gi, " ")
      .replace(/[٠-٩۰-۹0-9]{6,12}/g, " ")
      .replace(/20[٠-٩۰-۹0-9]{2}[\/-][٠-٩۰-۹0-9]{1,2}[\/-][٠-٩۰-۹0-9]{1,2}/g, " ")
      .replace(/\s+/g, " ").trim();
    if (name.length < 2) name = "طالب من كشف إتقان";
    out.push({ student_no: id, student_name: name, adate: date, case_type: "غياب", count_days: 1, action: "متابعة الغياب", selected: true, source: line });
  }
  return out;
}

type OcrProgress = {
  message: string;
  percent: number;
};

async function extractPdfOcrText(
  doc: any,
  onProgress: (progress: OcrProgress) => void,
) {
  const MAX_OCR_PAGES = 20;
  if (doc.numPages > MAX_OCR_PAGES) {
    throw new Error(`الملف يحتوي ${doc.numPages} صفحة. قسّم الملف إلى أجزاء لا تتجاوز ${MAX_OCR_PAGES} صفحة ثم أعد المحاولة.`);
  }

  const tesseractUrl =
    "https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.esm.min.js";
  const tesseract = (await import(/* @vite-ignore */ tesseractUrl)) as {
    createWorker: (
      langs?: string,
      oem?: number,
      options?: { logger?: (event: { status?: string; progress?: number }) => void },
    ) => Promise<{
      recognize: (image: HTMLCanvasElement) => Promise<{ data?: { text?: string } }>;
      terminate: () => Promise<void>;
    }>;
  };

  let currentPage = 1;
  const worker = await tesseract.createWorker("ara+eng", 1, {
    logger: (event) => {
      if (typeof event.progress !== "number") return;
      const pageBase = (currentPage - 1) / doc.numPages;
      const pageShare = event.progress / doc.numPages;
      onProgress({
        message: `جارٍ قراءة الصفحة ${currentPage} من ${doc.numPages} بالـ OCR...`,
        percent: Math.min(99, Math.round((pageBase + pageShare) * 100)),
      });
    },
  });

  const texts: string[] = [];
  try {
    for (let pageNo = 1; pageNo <= doc.numPages; pageNo++) {
      currentPage = pageNo;
      onProgress({
        message: `جارٍ تجهيز الصفحة ${pageNo} من ${doc.numPages} للقراءة...`,
        percent: Math.round(((pageNo - 1) / doc.numPages) * 100),
      });

      const page = await doc.getPage(pageNo);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(
        2,
        Math.max(1.35, 1800 / Math.max(1, baseViewport.width)),
      );
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("تعذر تجهيز صفحة PDF للقراءة الضوئية.");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      await page.render({ canvasContext: context, viewport, canvas }).promise;
      const result = await worker.recognize(canvas);
      const text = result.data?.text?.trim();
      if (text) texts.push(text);

      canvas.width = 1;
      canvas.height = 1;
      page.cleanup?.();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  } finally {
    await worker.terminate().catch(() => undefined);
  }

  onProgress({
    message: "اكتملت القراءة الضوئية، جارٍ تحليل البيانات...",
    percent: 100,
  });
  return texts.join("\n");
}

function AttendancePage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pdf, setPdf] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<ImportedAttendance[]>([]);\n  const [importStatus, setImportStatus] = useState<OcrProgress | null>(null);

  const pickPdf = (file?: File) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("يرجى اختيار ملف PDF صادر من إتقان.");
      return;
    }
    setPdf(file); setRows([]);
    toast.success(`تم اختيار ${file.name}`);
  };

  const startImport = async () => {
    if (!pdf) { inputRef.current?.click(); return; }
    setBusy(true);
    try {
      // pdfjs-dist touches browser-only globals (for example DOMMatrix) when its
      // module is evaluated. File routes are imported during SSR too, so keeping
      // pdfjs at module scope can crash the entire app — even on the public home page.
      // Load it only after the user explicitly starts a browser-side PDF import.
      if (typeof window === "undefined") {
        throw new Error("قراءة PDF متاحة من المتصفح فقط.");
      }

      const [{ getDocument, GlobalWorkerOptions }, workerModule] = await Promise.all([
        import("pdfjs-dist"),
        import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
      ]);
      GlobalWorkerOptions.workerSrc = workerModule.default;

      const bytes = new Uint8Array(await pdf.arrayBuffer());
      const doc = await getDocument({ data: bytes }).promise;
      const pages: string[] = [];
      for (let pageNo = 1; pageNo <= doc.numPages; pageNo++) {
        const page = await doc.getPage(pageNo);
        const content = await page.getTextContent();
        pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
      }
      let extractedText = pages.join("\n").trim();
      let usedOcr = false;

      if (extractedText.length <= 20) {
        usedOcr = true;
        setImportStatus({
          message: "الملف مصوّر؛ جارٍ تشغيل القراءة الضوئية OCR...",
          percent: 0,
        });
        try {
          extractedText = (await extractPdfOcrText(doc, setImportStatus)).trim();
        } catch (ocrError) {
          throw new Error(
            ocrError instanceof Error
              ? `فشل OCR: ${ocrError.message}`
              : "فشل OCR في قراءة صفحات الملف المصوّر.",
          );
        }
      }

      let parsed: ImportedAttendance[] = [];
      if (extractedText.length > 20) {
        try {
          setImportStatus({
            message: usedOcr
              ? "تمت قراءة الصور؛ جارٍ توزيع السجلات عبر DeepSeek..."
              : "جارٍ تحليل كشف إتقان وتوزيع البيانات عبر DeepSeek...",
            percent: usedOcr ? 100 : 65,
          });
          const ai = await parseAttendanceWithDeepSeek({
            data: { text: extractedText },
          });
          parsed = (ai.records ?? []).map((row) => ({
            student_no: row.student_no || "",
            student_name: row.student_name || "طالب من كشف إتقان",
            adate: row.adate || "",
            case_type: "غياب" as const,
            count_days: row.count_days || 1,
            action: row.action || "متابعة الغياب",
            selected: true,
            source: row.source || "",
          }));
        } catch (aiError) {
          console.warn("[Attendance] DeepSeek parsing failed; using local parser", aiError);
          parsed = parseAttendanceText(extractedText);
          if (parsed.length) {
            toast.info("تعذر التحليل الذكي، وتمت القراءة بالطريقة الاحتياطية.");
          }
        }
      }

      if (!parsed.length) {
        throw new Error(
          extractedText.length <= 20
            ? "لم يتمكن OCR من استخراج نص واضح من الملف. جرّب نسخة أوضح من كشف إتقان."
            : usedOcr
              ? "نجح OCR في قراءة الملف، لكن لم يتم العثور على سجلات غياب واضحة بعد التحليل."
              : "تم فتح PDF لكن لم يتم العثور على سجلات غياب قابلة للقراءة.",
        );
      }

      setRows(parsed);
      setImportStatus(null);
      toast.success(
        `تمت قراءة ${parsed.length} سجل${usedOcr ? " باستخدام OCR والذكاء الاصطناعي" : ""}. راجعها قبل الاعتماد.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? `تعذر قراءة PDF: ${error.message}` : "تعذر قراءة ملف PDF.");
    } finally { setBusy(false); setImportStatus(null); }
  };

  const saveRows = async () => {
    const selected = rows.filter((r) => r.selected);
    if (!selected.length) { toast.error("حدد سجلًا واحدًا على الأقل."); return; }
    setBusy(true);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new Error("انتهت جلسة الدخول.");
      const { data: existing, error: existingError } = await supabase.from("attendance").select("student_no,adate").eq("user_id", auth.user.id);
      if (existingError) throw existingError;
      const keys = new Set((existing ?? []).map((r: any) => `${r.student_no ?? ""}|${r.adate ?? ""}`));
      const fresh = selected.filter((r) => !keys.has(`${r.student_no}|${r.adate}`));
      if (!fresh.length) { toast.info("كل السجلات المحددة موجودة مسبقًا."); return; }
      const payload = fresh.map(({ selected: _selected, source: _source, ...r }) => ({ ...r, user_id: auth.user!.id }));
      const { error } = await supabase.from("attendance").insert(payload as never);
      if (error) throw error;
      setRows([]);
      toast.success(`تم حفظ ${fresh.length} سجل مواظبة، وتجاوز ${selected.length - fresh.length} مكرر.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر حفظ سجلات المواظبة.");
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-3xl border border-primary/15 bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5">
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 font-black"><FileText className="size-5 text-primary" />استيراد غياب إتقان PDF</div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">ارفع كشف الغياب PDF الصادر من إتقان. يقرأ النظام النص مباشرة، وإذا كان الملف مصورًا يشغّل OCR تلقائيًا، ثم يستخدم DeepSeek لفهم التنسيق وتوزيع البيانات قبل المراجعة والاعتماد.</p>
            {pdf && <p className="mt-2 text-xs font-bold text-primary">الملف المحدد: {pdf.name} — {(pdf.size / 1024 / 1024).toFixed(2)} MB</p>}
            {importStatus && (
              <div className="mt-3 max-w-xl rounded-xl border border-primary/15 bg-primary/5 p-3">
                <div className="flex items-center justify-between gap-3 text-xs font-bold text-primary">
                  <span>{importStatus.message}</span>
                  <span>{importStatus.percent}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary/10">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-300"
                    style={{ width: `${importStatus.percent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => pickPdf(e.target.files?.[0])} />
            <Button variant="outline" onClick={() => inputRef.current?.click()}><Upload className="size-4" />اختيار PDF</Button>
            <Button onClick={startImport} disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}{pdf ? "قراءة كشف إتقان" : "استيراد غياب إتقان"}</Button>
          </div>
        </div>
      </section>

      {rows.length > 0 && (
        <section className="rounded-3xl border bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="font-black">معاينة السجلات المستخرجة</h2><p className="text-xs text-muted-foreground">ألغِ تحديد أي سجل غير صحيح قبل الحفظ.</p></div><Button onClick={saveRows} disabled={busy}><CheckCircle2 className="size-4" />اعتماد المحدد ({rows.filter((r) => r.selected).length})</Button></div>
          <div className="grid gap-2">
            {rows.map((row, index) => (
              <label key={index} className="grid grid-cols-[auto_1fr] gap-3 rounded-xl border p-3 text-sm">
                <input type="checkbox" checked={row.selected} onChange={(e) => setRows((old) => old.map((r, i) => i === index ? { ...r, selected: e.target.checked } : r))} />
                <div><p className="font-black">{row.student_name}</p><p className="mt-1 text-xs text-muted-foreground">رقم الطالب: {row.student_no || "غير مقروء"} · التاريخ: {row.adate || "غير مقروء"} · غياب</p><p className="mt-1 line-clamp-1 text-[10px] text-muted-foreground">{row.source}</p></div>
              </label>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-3xl border bg-card p-3.5 shadow-[var(--shadow-card)] sm:p-4"><RecordPage config={recordByKey("attendance")} /></section>
    </div>
  );
}
