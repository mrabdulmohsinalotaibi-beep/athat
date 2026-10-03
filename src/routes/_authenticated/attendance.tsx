import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, FileText, Loader2, MessageSquare, Send, Upload } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { RecordPage } from "@/components/RecordPage";
import { Button } from "@/components/ui/button";
import { recordByKey } from "@/lib/records";
import { supabase } from "@/integrations/supabase/client";
import { parseAttendanceWithDeepSeek } from "@/lib/deepseek.functions";
import { hijriToIso } from "@/lib/date";

type ImportedAttendance = {
  student_no: string;
  student_name: string;
  adate: string;
  case_type: "غياب";
  count_days: number;
  action: string;
  selected: boolean;
  source: string;
  reviewStatus?: "جديد" | "مكرر" | "يحتاج مراجعة";
  reviewReason?: string;
  matchedStudentId?: string;
};

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({ meta: [{ title: "الحضور والمواظبة | الذات" }, { name: "description", content: "رصد الغياب والتأخر وإجراءات التوجيه الطلابي المتخذة." }] }),
  component: AttendancePage,
});

function normalizeDigits(value: string) {
  return value.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

function normalizeStudentName(value: string) {
  return normalizeDigits(value)
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[^\u0621-\u063A\u0641-\u064A0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isoFromText(value: string) {
  const v = normalizeDigits(value);
  const m = v.match(/((?:14|20)\d{2})[\/-](\d{1,2})[\/-](\d{1,2})/);
  if (!m) return "";
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (year >= 1400 && year < 1600) return hijriToIso(year, month, day);
  return `${m[1]}-${m[2]!.padStart(2, "0")}-${m[3]!.padStart(2, "0")}`;
}

function parseAttendanceText(text: string): ImportedAttendance[] {
  const normalizedText = normalizeDigits(text).replace(/\r/g, "");
  const datePattern = /(?:14|20)\d{2}[\/-]\d{1,2}[\/-]\d{1,2}/g;
  const dates = Array.from(normalizedText.matchAll(datePattern));
  const out: ImportedAttendance[] = [];

  // PDF tables often lose visual row breaks. A date is a reliable row boundary
  // in Noor/Itqan attendance exports, so parse the text around each occurrence.
  for (let index = 0; index < dates.length; index++) {
    const match = dates[index]!;
    const start = Math.max(0, (dates[index - 1]?.index ?? match.index! - 260) + (index ? dates[index - 1]![0].length : 0));
    const end = Math.min(normalizedText.length, dates[index + 1]?.index ?? match.index! + 300);
    const chunk = normalizedText.slice(start, end).replace(/\s+/g, " ").trim();
    const date = isoFromText(match[0]);
    if (!date) continue;

    const ids = Array.from(chunk.matchAll(/\b\d{6,12}\b/g))
      .map((m) => m[0])
      .filter((value) => !/^(14|20)\d{2}/.test(value));
    const studentNo = ids[0] ?? "";

    const arabicParts = chunk.match(/[\u0621-\u064A][\u0621-\u064A ]{5,}/g) ?? [];
    const ignored = /غياب|غائب|بعذر|بدون عذر|نوع الغياب|نوع العذر|التاريخ|الهوية|الاسم|الصف|الفصل|الجوال|الفترة|الحصة|المادة|المعلم|الملاحظات/;
    const name = arabicParts
      .map((part) => part.replace(/\s+/g, " ").trim())
      .filter((part) => !ignored.test(part))
      .sort((a, b) => b.split(" ").length - a.split(" ").length)[0] ?? "طالب من كشف PDF";

    out.push({
      student_no: studentNo,
      student_name: name,
      adate: date,
      case_type: "غياب",
      count_days: 1,
      action: "متابعة الغياب",
      selected: true,
      source: chunk,
    });
  }

  // Traditional line-based exports remain supported.
  if (!out.length) {
    const lines = normalizedText.split(/\n+/).map((x) => x.replace(/\s+/g, " ").trim()).filter(Boolean);
    for (const line of lines) {
      const dateMatch = line.match(/(?:14|20)\d{2}[\/-]\d{1,2}[\/-]\d{1,2}/)?.[0] ?? "";
      if (!dateMatch) continue;
      const id = line.match(/\b\d{6,12}\b/)?.[0] ?? "";
      out.push({ student_no: id, student_name: "طالب من كشف PDF", adate: isoFromText(dateMatch), case_type: "غياب", count_days: 1, action: "متابعة الغياب", selected: true, source: line });
    }
  }

  const unique = new Map<string, ImportedAttendance>();
  out.forEach((row, index) => {
    const key = `${row.student_no || normalizeStudentName(row.student_name) || index}|${row.adate}`;
    if (!unique.has(key)) unique.set(key, row);
  });
  return Array.from(unique.values());
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
  const [rows, setRows] = useState<ImportedAttendance[]>([]);
  const [importStatus, setImportStatus] = useState<OcrProgress | null>(null);
  const [studentSearch, setStudentSearch] = useState<Record<number, string>>({});

  const { data: attendanceRows = [] } = useQuery({
    queryKey: ["attendance-followup-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("id,student_id,student_no,student_name,case_type,count_days,adate,action");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const { data: schoolStudents = [] } = useQuery({
    queryKey: ["attendance-import-students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id,student_no,national_id,full_name,stage,grade,classroom")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const matchStudentManually = (index: number, student: any) => {
    setRows((current) => current.map((row, i) => {
      if (i !== index) return row;
      const studentId = String(student.id ?? "");
      const date = String(row.adate ?? "").slice(0, 10);
      const duplicateInImport = current.some((other, otherIndex) =>
        otherIndex !== index &&
        String(other.matchedStudentId ?? "") === studentId &&
        String(other.adate ?? "").slice(0, 10) === date
      );
      const duplicateSaved = attendanceRows.some((saved: any) =>
        String(saved.student_id ?? "") === studentId &&
        String(saved.adate ?? "").slice(0, 10) === date
      );
      const duplicate = Boolean(date && (duplicateInImport || duplicateSaved));
      return {
        ...row,
        matchedStudentId: studentId,
        student_no: String(student.student_no || student.national_id || row.student_no || ""),
        student_name: String(student.full_name || row.student_name),
        selected: Boolean(date) && !duplicate,
        reviewStatus: duplicate ? "مكرر" as const : date ? "جديد" as const : "يحتاج مراجعة" as const,
        reviewReason: duplicate
          ? duplicateInImport
            ? "مكرر داخل الملف لنفس الطالب ونفس يوم الغياب"
            : "محفوظ مسبقًا لنفس الطالب ونفس يوم الغياب"
          : date ? "" : "التاريخ غير مقروء",
      };
    }));
    setStudentSearch((current) => ({ ...current, [index]: "" }));
  };

  const repeatedAbsence = useMemo(() => {
    const grouped = new Map<string, { student_id?: string | null; student_no: string; student_name: string; count: number; lastDate: string }>();
    attendanceRows.forEach((row: any) => {
      if (!["غياب", "تأخر", "هروب"].includes(String(row.case_type ?? ""))) return;
      const key = String(row.student_id || row.student_no || row.student_name || "").trim();
      if (!key) return;
      const current = grouped.get(key) ?? { student_id: row.student_id, student_no: String(row.student_no ?? ""), student_name: String(row.student_name ?? "طالب غير محدد"), count: 0, lastDate: "" };
      current.count += Math.max(1, Number(row.count_days) || 1);
      const date = String(row.adate ?? "").slice(0, 10);
      if (date > current.lastDate) current.lastDate = date;
      grouped.set(key, current);
    });
    return Array.from(grouped.values()).filter((item) => item.count >= 3).sort((a, b) => b.count - a.count);
  }, [attendanceRows]);

  const pickPdf = (file?: File) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("يرجى اختيار ملف PDF يحتوي بيانات الغياب.");
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
        pages.push(
          content.items
            .map((item: any) => ("str" in item ? `${item.str}${item.hasEOL ? "\\n" : " "}` : ""))
            .join("")
            .replace(/[ \\t]+/g, " ")
            .replace(/ *\\n */g, "\\n"),
        );
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
          if (!parsed.length) parsed = parseAttendanceText(extractedText);
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

      const [{ data: existingAttendance }, { data: importStudents, error: importStudentsError }] = await Promise.all([
        supabase.from("attendance").select("student_id,student_no,student_name,adate"),
        supabase.from("students").select("id,student_no,national_id,full_name"),
      ]);
      if (importStudentsError) throw importStudentsError;

      const studentByNumber = new Map<string, string>();
      const studentByName = new Map<string, string>();
      const studentById = new Map<string, any>();
      const ambiguousNames = new Set<string>();
      (importStudents ?? []).forEach((student: any) => {
        const id = String(student.id ?? "");
        if (id) studentById.set(id, student);
        [student.student_no, student.national_id].forEach((value) => {
          const key = normalizeDigits(String(value ?? "")).trim();
          if (key && id) studentByNumber.set(key, id);
        });
        const nameKey = normalizeStudentName(String(student.full_name ?? ""));
        if (!nameKey || !id) return;
        if (studentByName.has(nameKey) && studentByName.get(nameKey) !== id) ambiguousNames.add(nameKey);
        else studentByName.set(nameKey, id);
      });
      ambiguousNames.forEach((name) => studentByName.delete(name));

      const resolveStudentId = (row: ImportedAttendance) =>
        studentByNumber.get(normalizeDigits(String(row.student_no ?? "")).trim()) ||
        studentByName.get(normalizeStudentName(String(row.student_name ?? ""))) ||
        "";

      const existingKeys = new Set(
        (existingAttendance ?? []).map((item: any) => {
          const studentKey =
            String(item.student_id ?? "") ||
            studentByNumber.get(normalizeDigits(String(item.student_no ?? "")).trim()) ||
            studentByName.get(normalizeStudentName(String(item.student_name ?? ""))) ||
            normalizeStudentName(String(item.student_name ?? "")) ||
            normalizeDigits(String(item.student_no ?? "")).trim();
          return `${studentKey}|${String(item.adate ?? "").slice(0, 10)}`;
        }),
      );
      const seenImportKeys = new Set<string>();
      const classified = parsed.map((row) => {
        const reasons: string[] = [];
        if (!row.student_no) reasons.push("رقم الطالب غير مقروء");
        if (!row.adate) reasons.push("التاريخ غير مقروء");
        if (!row.student_name || row.student_name === "طالب من كشف إتقان") reasons.push("اسم الطالب يحتاج مراجعة");
        const matchedStudentId = resolveStudentId(row);
        const matchedStudent = matchedStudentId ? studentById.get(matchedStudentId) : null;
        const canonicalName = matchedStudent?.full_name ? String(matchedStudent.full_name) : row.student_name;
        const canonicalNumber = matchedStudent?.student_no || matchedStudent?.national_id
          ? String(matchedStudent.student_no || matchedStudent.national_id)
          : row.student_no;
        const fallbackStudentKey = normalizeStudentName(canonicalName) || normalizeDigits(canonicalNumber).trim();
        const studentKey = matchedStudentId || fallbackStudentKey;
        if (!matchedStudentId) reasons.push("لم تتم مطابقة الطالب تلقائيًا مع سجل الطلاب");
        const key = `${studentKey}|${row.adate.slice(0, 10)}`;
        const duplicateInFile = Boolean(studentKey && row.adate && seenImportKeys.has(key));
        const duplicateSaved = Boolean(studentKey && row.adate && existingKeys.has(key));
        const duplicate = duplicateInFile || duplicateSaved;
        if (studentKey && row.adate) seenImportKeys.add(key);
        return {
          ...row,
          student_name: canonicalName,
          student_no: canonicalNumber,
          selected: Boolean(matchedStudentId) && !duplicate && reasons.length === 0,
          reviewStatus: duplicate ? "مكرر" as const : reasons.length ? "يحتاج مراجعة" as const : "جديد" as const,
          matchedStudentId,
          reviewReason: duplicate
            ? duplicateInFile
              ? "مكرر داخل الملف لنفس الطالب ونفس يوم الغياب"
              : "محفوظ مسبقًا لنفس الطالب ونفس يوم الغياب"
            : reasons.join("، "),
        };
      });

      setRows(classified);
      setImportStatus(null);
      const freshCount = classified.filter((row) => row.reviewStatus === "جديد").length;
      const duplicateCount = classified.filter((row) => row.reviewStatus === "مكرر").length;
      const reviewCount = classified.filter((row) => row.reviewStatus === "يحتاج مراجعة").length;
      toast.success(
        `تمت قراءة ${classified.length} سجل: ${freshCount} جديد، ${duplicateCount} مكرر، ${reviewCount} يحتاج مراجعة.`,
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

      const { data: studentRows, error: studentsError } = await supabase
        .from("students")
        .select("id,student_no,national_id,full_name");
      if (studentsError) throw studentsError;
      const byNumber = new Map<string, string>();
      const byName = new Map<string, string>();
      const duplicateNames = new Set<string>();
      (studentRows ?? []).forEach((student: any) => {
        const id = String(student.id ?? "");
        [student.student_no, student.national_id].forEach((value) => {
          const key = String(value ?? "").trim();
          if (key && id) byNumber.set(key, id);
        });
        const name = normalizeStudentName(String(student.full_name ?? ""));
        if (!name || !id) return;
        if (byName.has(name)) duplicateNames.add(name);
        else byName.set(name, id);
      });
      duplicateNames.forEach((name) => byName.delete(name));

      const payload = fresh.map(({ selected: _selected, source: _source, reviewStatus: _reviewStatus, reviewReason: _reviewReason, matchedStudentId, ...r }) => ({
        ...r,
        student_id:
          matchedStudentId ||
          byNumber.get(normalizeDigits(String(r.student_no ?? "")).trim()) ||
          byName.get(normalizeStudentName(String(r.student_name ?? ""))) ||
          null,
        user_id: auth.user!.id,
      }));
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
            <div className="flex items-center gap-2 font-black"><FileText className="size-5 text-primary" />استيراد الغياب الذكي من PDF</div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">ارفع أي ملف PDF يحتوي بيانات غياب الطلاب، سواء من إتقان أو نور أو أي كشف آخر. يتعرف النظام على تنسيق الملف تلقائيًا، ويقرأ الملفات النصية أو المصورة، ثم يستخرج الطلاب وأيام الغياب ويستبعد تكرار نفس الطالب في نفس اليوم قبل المراجعة والاعتماد.</p>
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
            <Button onClick={startImport} disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}{pdf ? "تحليل ملف الغياب" : "استيراد PDF"}</Button>
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
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black">{row.student_name}</p>
                    {row.reviewStatus && (
                      <span className="rounded-full border px-2 py-0.5 text-[10px] font-bold">{row.reviewStatus}</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">رقم الطالب: {row.student_no || "غير مقروء"} · التاريخ: {row.adate || "غير مقروء"} · غياب</p>
                  <p className={`mt-1 text-[10px] font-bold ${row.matchedStudentId ? "text-emerald-700" : "text-amber-700"}`}>{row.matchedStudentId ? "✓ تمت المطابقة مع ملف الطالب في الذات" : "تحتاج مطابقة مع ملف طالب"}</p>
                  {!row.matchedStudentId && (
                    <div className="mt-2 rounded-xl border bg-muted/20 p-2">
                      <input value={studentSearch[index] ?? ""} onChange={(e) => setStudentSearch((old) => ({ ...old, [index]: e.target.value }))} placeholder="ابحث باسم الطالب أو رقم الهوية/الطالب..." className="h-9 w-full rounded-lg border bg-background px-3 text-xs" />
                      {(studentSearch[index] ?? "").trim().length >= 2 && (
                        <div className="mt-2 max-h-44 space-y-1 overflow-y-auto">
                          {schoolStudents.filter((student: any) => {
                            const raw = studentSearch[index] ?? "";
                            const q = normalizeStudentName(raw);
                            const digits = normalizeDigits(raw).trim();
                            return normalizeStudentName(String(student.full_name ?? "")).includes(q) ||
                              (digits.length > 0 && [student.student_no, student.national_id].some((value) => normalizeDigits(String(value ?? "")).includes(digits)));
                          }).slice(0, 8).map((student: any) => (
                            <button type="button" key={student.id} onClick={() => matchStudentManually(index, student)} className="flex w-full items-center justify-between gap-2 rounded-lg border bg-background p-2 text-right">
                              <span><strong className="block text-xs">{student.full_name}</strong><span className="text-[9px] text-muted-foreground">{[student.stage, student.grade, student.classroom].filter(Boolean).join(" · ")}</span></span>
                              <span className="text-[9px] font-bold text-primary">اختيار</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {row.reviewReason && <p className="mt-1 text-[10px] font-semibold text-amber-700">{row.reviewReason}</p>}
                  {!row.matchedStudentId && <p className="mt-1 text-[10px] text-muted-foreground">لن يتم اعتماد هذا السجل حتى تتم مطابقته مع طالب من قاعدة بيانات الذات.</p>}
                </div>
              </label>
            ))}
          </div>
        </section>
      )}

      {repeatedAbsence.length > 0 && (
        <section className="rounded-2xl border border-amber-300/60 bg-amber-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-amber-950">
            <AlertTriangle className="size-4" />
            <div>
              <h2 className="text-sm font-black">مواظبة تحتاج متابعة</h2>
              <p className="text-xs text-amber-800">طلاب لديهم 3 حالات غياب/تأخر/هروب أو أكثر في السجل الحالي.</p>
            </div>
          </div>
          <div className="grid gap-2 xl:grid-cols-2">
            {repeatedAbsence.slice(0, 8).map((item) => (
              <div key={item.student_id || item.student_no || item.student_name} className="rounded-xl border border-amber-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-sm">{item.student_name}</strong>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-900">{item.count} حالات</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">آخر رصد: {item.lastDate || "—"}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={`/interviews?new=student&studentId=${encodeURIComponent(String(item.student_id ?? ""))}&studentNo=${encodeURIComponent(item.student_no)}&studentName=${encodeURIComponent(item.student_name)}`} className="rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-black text-primary-foreground">
                    <MessageSquare className="ml-1 inline size-3" /> تسجيل متابعة
                  </a>
                  <a href={`/referrals?new=student&studentId=${encodeURIComponent(String(item.student_id ?? ""))}&studentNo=${encodeURIComponent(item.student_no)}&studentName=${encodeURIComponent(item.student_name)}`} className="rounded-lg border px-2.5 py-1.5 text-[11px] font-black text-primary">
                    <Send className="ml-1 inline size-3" /> إنشاء إحالة
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-3xl border bg-card p-3.5 shadow-[var(--shadow-card)] sm:p-4"><RecordPage config={recordByKey("attendance")} /></section>
    </div>
  );
}
