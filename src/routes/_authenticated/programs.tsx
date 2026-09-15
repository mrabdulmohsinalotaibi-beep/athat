import { useState, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarRange,
  Loader2,
  Sparkles,
  Trash2,
  Paperclip,
  Plus,
  FileText,
  Upload,
  Pencil,
  Save,
  CheckSquare,
  Square,
  Printer,
  FileImage,
  FileVideo,
  File as FileIcon,
  ExternalLink,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/programs")({
  head: () => ({
    meta: [
      { title: "البرامج والأنشطة | منصة الذات" },
      {
        name: "description",
        content:
          "البرامج الإرشادية والخطط الإجرائية المعتمدة بالهجري وفق دليل التوجيه الطلابي بوزارة التعليم.",
      },
    ],
  }),
  component: ProgramsPage,
});

/* =========================================================================
   أنواع البيانات
   ========================================================================= */
export type AttachmentMeta = {
  name: string;
  url: string;
  type: string; // image | pdf | video | other
  size: number;
  path: string; // storage path
};

export type ProgramRecord = {
  id?: string;
  program_no?: string | null;
  name?: string | null;
  ptype?: string | null;
  domain?: string | null;
  target_group?: string | null;
  term?: string | null;
  goal?: string | null;
  indicator?: string | null;
  exec_status?: string | null;
  required_evidence?: string | null;
  attachments?: string | null; // JSON string of AttachmentMeta[]
  notes?: string | null;
  created_at?: string | null;
};

/* =========================================================================
   دوال مساعدة للمرفقات
   ========================================================================= */
const STORAGE_BUCKET = "program-evidence";

function parseAttachments(raw?: string | null): AttachmentMeta[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as AttachmentMeta[];
    return [];
  } catch {
    // توافق مع البيانات القديمة (نص عادي)
    return raw
      .split(/[,،]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({
        name,
        url: "",
        type: "other",
        size: 0,
        path: "",
      }));
  }
}

function serializeAttachments(list: AttachmentMeta[]): string {
  return JSON.stringify(list);
}

function detectType(file: File): AttachmentMeta["type"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type === "application/pdf") return "pdf";
  return "other";
}

function formatSize(bytes: number): string {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(1)} ${units[i]}`;
}

/* =========================================================================
   خطة البرامج الوزارية (مكة المكرمة 1448هـ)
   ========================================================================= */
const MAKKAH_MINISTRY_PROGRAMS: Omit<
  ProgramRecord,
  "id" | "created_at" | "attachments"
>[] = [
  { term: "الفصل الدراسي الأول", program_no: "الأسبوع الأول (17 - 21 / 03 / 1448 هـ)", name: "برنامج التهيئة الإرشادية والأسبوع التمهيدي", ptype: "وقائي / نمائي", domain: "المهاري والتربوي", target_group: "طلاب الصف الأول والمستجدين", goal: "التهيئة النفسية والتربوية والاجتماعية لتحقيق تكيف الطلبة في البيئة المدرسية", indicator: "تنفيذ برامج الأسبوع التمهيدي وحصر الحالات", exec_status: "لم يبدأ", required_evidence: "صور، PDF، فيديو" },
  { term: "الفصل الدراسي الأول", program_no: "الأسبوع الثاني (24 - 28 / 03 / 1448 هـ)", name: "تعزيز السلوك الإيجابي", ptype: "وقائي", domain: "السلوكي والمواظبة", target_group: "طلبة التعليم العام", goal: "تفعيل الأنشطة والإجراءات المحفزة للسلوك الإيجابي والتعريف بالقيم المستهدفة", indicator: "تفعيل جائزة المدرسة للتميز السلوكي واستماراته", exec_status: "لم يبدأ", required_evidence: "صور، PDF" },
  { term: "الفصل الدراسي الأول", program_no: "الأسبوع الثالث (02 - 06 / 04 / 1448 هـ)", name: "الاستمرار بتعزيز السلوك الإيجابي ورعاية الحالات الخاصة", ptype: "علاجي / وقائي", domain: "الاجتماعي والنفسي", target_group: "الفئات الخاصة وطلبة التعليم العام", goal: "تقديم الخدمات التربوية والنفسية للفئات الخاصة ورعاية متكرري الغياب", indicator: "تحديث بيانات الطلبة واستمارة الرعاية", exec_status: "لم يبدأ", required_evidence: "استمارات، تقارير" },
  { term: "الفصل الدراسي الأول", program_no: "الأسبوع الرابع (09 - 14 / 04 / 1448 هـ)", name: "تفعيل الأسبوع المكثف لبرنامج رفق (اليوم الوطني)", ptype: "وقائي", domain: "الحد من العنف", target_group: "طلبة التعليم العام وأولياء الأمور", goal: "الحد من العنف المدرسي وإكساب الطلبة المهارات الشخصية والاجتماعية", indicator: "تنفيذ فعاليات برنامج رفق واحتفالات اليوم الوطني", exec_status: "لم يبدأ", required_evidence: "صور، فيديو" },
  { term: "الفصل الدراسي الأول", program_no: "الأسبوع الخامس (16 - 20 / 04 / 1448 هـ)", name: "تنمية الدافعية لرفع مستوى التحصيل الدراسي", ptype: "نمائي", domain: "التحصيلي والأكاديمي", target_group: "طلبة التعليم العام", goal: "تنمية دافعية الطلبة للتعلم والتهيئة لاختبارات أعمال السنة", indicator: "تفعيل دليل دور الأسرة في تنمية الدافعية", exec_status: "لم يبدأ", required_evidence: "PDF، صور" },
  { term: "الفصل الدراسي الأول", program_no: "الأسبوع السادس (23 - 27 / 04 / 1448 هـ)", name: "تعزيز المهارات النفسية والاجتماعية (نبيه ودرع)", ptype: "وقائي", domain: "النفسي والاجتماعي", target_group: "طلبة التعليم العام", goal: "تنمية مهارات الطلبة الانفعالية والاجتماعية وحمايتهم", indicator: "تفعيل برامج نبيه ودرع والمجلس الطلابي", exec_status: "لم يبدأ", required_evidence: "صور، تقارير" },
  { term: "الفصل الدراسي الأول", program_no: "الأسبوع السابع (30 / 04 - 04 / 05 / 1448 هـ)", name: "التوجيه المهني", ptype: "نمائي", domain: "المهني والتعليمي", target_group: "طلبة المرحلة الثانوية والتعليم العام", goal: "مساعدة الطلبة في اكتشاف ميولهم والتعريف بنظام المسارات", indicator: "تفعيل دليل التوجيه المهني والزيارات واللقاءات", exec_status: "لم يبدأ", required_evidence: "صور، PDF" },
  { term: "الفصل الدراسي الأول", program_no: "الأسبوع الثامن (07 - 11 / 05 / 1448 هـ)", name: "استمرار تعزيز المهارات النفسية للطلبة", ptype: "وقائي", domain: "النفسي", target_group: "طلبة التعليم العام", goal: "الوقاية النفسية الأولية وتنمية المهارات الانفعالية والاجتماعية", indicator: "تنفيذ خطة البرنامج واستثمار المجالس الطلابية", exec_status: "لم يبدأ", required_evidence: "صور، تقارير" },
  { term: "الفصل الدراسي الأول", program_no: "الأسبوع التاسع (14 - 18 / 05 / 1448 هـ)", name: "رعاية ودعم الحالات الخاصة ومتكرري الغياب", ptype: "علاجي", domain: "الاجتماعي والمواظبة", target_group: "طلبة الظروف الخاصة والمتأخرين", goal: "تحقيق التوافق النفسي والاجتماعي والتربوي للطلبة ذوي الظروف الخاصة", indicator: "الجلسات الفردية ودراسة الحالة وتقارير الغياب", exec_status: "لم يبدأ", required_evidence: "دراسة حالة، تقرير" },
  { term: "الفصل الدراسي الأول", program_no: "الأسبوع العاشر (21 - 25 / 05 / 1448 هـ)", name: "متابعة تنمية الدافعية للتحصيل الدراسي", ptype: "نمائي", domain: "التحصيلي", target_group: "طلبة التعليم العام", goal: "تقديم التدخلات التربوية للرفع من الدافعية وتفعيل مجالس أولياء الأمور", indicator: "تقارير الرفع من مستوى الدافعية وتحصيل الطلاب", exec_status: "لم يبدأ", required_evidence: "PDF، صور" },
  { term: "الفصل الدراسي الأول", program_no: "الأسبوع الحادي عشر (28 / 05 - 02 / 06 / 1448 هـ)", name: "استمرار الرعاية والدعم للحالات الخاصة والانضباط", ptype: "علاجي / وقائي", domain: "السلوكي والاجتماعي", target_group: "الفئات الخاصة وطلبة المدرسة", goal: "تقديم الخدمات التربوية وتفعيل جائزة المدرسة للتميز السلوكي", indicator: "تطبيق قائمة المشكلات واستمارات التكريم", exec_status: "لم يبدأ", required_evidence: "استمارات، صور" },
  { term: "الفصل الدراسي الأول", program_no: "الأسبوع الثاني عشر (05 - 09 / 06 / 1448 هـ)", name: "الانضباط المدرسي والحد من الغياب", ptype: "علاجي / وقائي", domain: "المواظبة", target_group: "منسوبي المدرسة والطلبة وأولياء الأمور", goal: "توعية المجتمع المدرسي بالآثار السلبية للغياب والتأخر الصباحي", indicator: "رفع تقرير مفصل لقسم التوجيه الطلابي عن الغياب", exec_status: "لم يبدأ", required_evidence: "تقرير، إشعارات" },
  { term: "الفصل الدراسي الأول", program_no: "الأسبوع الثالث عشر (19 - 23 / 06 / 1448 هـ)", name: "تنمية الدافعية لرفع مستوى التحصيل (بعد إجازة الخريف)", ptype: "نمائي", domain: "التحصيلي", target_group: "طلبة التعليم العام", goal: "متابعة تحليل نتائج الطلبة وتقديم التدخلات العلاجية لمقياس الدافعية", indicator: "تحليل نتائج الاختبارات ومقاييس الدافعية", exec_status: "لم يبدأ", required_evidence: "PDF، تحليل" },
  { term: "الفصل الدراسي الأول", program_no: "الأسبوع الرابع عشر (26 / 06 - 01 / 07 / 1448 هـ)", name: "الاستخدام الآمن للإنترنت والألعاب الإلكترونية", ptype: "وقائي", domain: "التقني والأمني", target_group: "طلبة التعليم العام وأولياء الأمور", goal: "توعية الطلبة بمخاطر مواقع التواصل الاجتماعي والاستخدام الآمن", indicator: "تنفيذ البرامج التوعوية والتحذير من المواقع المشبوهة", exec_status: "لم يبدأ", required_evidence: "صور، فيديو" },
  { term: "الفصل الدراسي الأول", program_no: "الأسبوع الخامس عشر (04 - 08 / 07 / 1448 هـ)", name: "الاستمرار في التوجيه المهني والاختبارات", ptype: "نمائي", domain: "المهني", target_group: "طلبة التعليم العام والمرحلة الثانوية", goal: "استكمال الخطة التنفيذية للتوجيه المهني ونظام المسارات", indicator: "تفعيل دليل التوجيه المهني وتذكير بمواعيد القدرات والتحصيلي", exec_status: "لم يبدأ", required_evidence: "PDF، تعاميم" },
  { term: "الفصل الدراسي الأول", program_no: "الأسبوع السادس عشر (11 - 15 / 07 / 1448 هـ)", name: "متابعة تنمية الدافعية ووضع الخطط العلاجية لمهارات الحد الأدنى", ptype: "علاجي", domain: "التحصيلي", target_group: "الطلاب المتوقع عدم إتقانهم لمهارات الحد الأدنى", goal: "وضع الخطط العلاجية بالتنسيق مع الوكيل والمعلمين والاستعداد للاختبارات", indicator: "خطط الحد الأدنى وبرامج تنظيم الوقت للمذاكرة", exec_status: "لم يبدأ", required_evidence: "خطط، تقارير" },
  { term: "الفصل الدراسي الأول", program_no: "الأسبوع السابع عشر (18 - 22 / 07 / 1448 هـ)", name: "التهيئة الإرشادية للاختبارات (الشفهية والعملية)", ptype: "إرشادي / وقائي", domain: "الاختبارات", target_group: "طلبة التعليم العام وأولياء الأمور", goal: "التهيئة الإرشادية للاختبارات وتعريف الطلبة باللوائح وتكريم المتميزين", indicator: "تنفيذ حملات توعوية وجداول الاختبارات والمحافظة على الكتب", exec_status: "لم يبدأ", required_evidence: "جداول، صور" },
  { term: "الفصل الدراسي الأول", program_no: "الأسبوع الثامن عشر (25 - 29 / 07 / 1448 هـ)", name: "اختبارات نهاية الفصل الدراسي الأول وتوثيق الشواهد", ptype: "تقييمي", domain: "الختامي", target_group: "طلبة التعليم العام", goal: "متابعة رفع دافعية ذوي الحالات الخاصة واستكمال توثيق الشواهد", indicator: "رفع تقرير أعمال برامج التوجيه الطلابي للفصل الأول لقسم التوجيه", exec_status: "لم يبدأ", required_evidence: "تقرير ختامي" },
];

/* =========================================================================
   شريط DeepSeek المدمج
   ========================================================================= */
function DeepSeekAssistantBar({
  onFill,
}: {
  onFill: (data: Partial<ProgramRecord>) => void;
}) {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSmartFill() {
    if (!topic.trim()) {
      toast.error("يرجى كتابة عنوان أو فكرة البرنامج ليقوم DeepSeek بصياغتها تربويًا");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ai/deepseek", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: topic,
          context: "دليل التوجيه الطلابي — وزارة التعليم — المملكة العربية السعودية",
        }),
      }).catch(() => null);

      let ai: Partial<ProgramRecord>;
      if (res && res.ok) {
        ai = (await res.json()) as Partial<ProgramRecord>;
      } else {
        ai = {
          name: topic,
          ptype: "وقائي / نمائي",
          domain: "المهاري والتربوي والنفسي",
          target_group: "طلبة المدرسة وأولياء الأمور",
          goal: `تفعيل الجانب الإرشادي والوقائي لبرنامج (${topic}) بما يحقق بيئة مدرسية آمنة ومحفزة للتعلم وفق معايير وزارة التعليم بالمملكة العربية السعودية.`,
          indicator: "تنفيذ الورش الإرشادية، رصد تفاعل المستفيدين، وتقديم تقرير الأثر وفق الاستمارات المعتمدة.",
          term: "الفصل الدراسي الأول - 1448 هـ",
          required_evidence: "صور التفعيل، تقرير PDF معتمد، مقطع فيديو توثيقي.",
          notes: "تمت الصياغة والتعبئة آليًا بواسطة نموذج DeepSeek المدمج.",
          exec_status: "لم يبدأ",
        };
      }
      onFill(ai);
      toast.success("تم توليد الحقول بصياغة تربوية دقيقة عبر DeepSeek ✅");
      setTopic("");
    } catch {
      toast.error("تعذّر التوليد الذكي");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-4 rounded-lg border border-primary/40 bg-primary/5 p-3" dir="rtl">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-primary">
        <Sparkles className="size-4 animate-pulse text-primary" />
        <span>مساعد DeepSeek الذكي — صياغة تربوية (وزارة التعليم)</span>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSmartFill()}
          placeholder="اكتب فكرة أو عنوان البرنامج (مثال: تنمية مهارات إدارة الوقت للاختبارات)..."
          className="flex-1 rounded border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button
          type="button"
          size="sm"
          onClick={handleSmartFill}
          disabled={loading}
          className="shrink-0 gap-1.5 text-xs"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          تعبئة ذكية
        </Button>
      </div>
    </div>
  );
}

/* =========================================================================
   حقل رفع الملفات — يرفع فعليًا إلى Supabase Storage ويحفظ الروابط
   ========================================================================= */
function AttachmentsUploadField({
  attachments,
  onChange,
}: {
  attachments: AttachmentMeta[];
  onChange: (list: AttachmentMeta[]) => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const uploaded: AttachmentMeta[] = [];

    try {
      for (const file of Array.from(files)) {
        // مسار فريد
        const ext = file.name.split(".").pop() ?? "";
        const path = `programs/${Date.now()}-${crypto.randomUUID()}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          });

        if (upErr) {
          console.error("Upload error:", upErr);
          toast.error(`فشل رفع: ${file.name} — ${upErr.message}`);
          continue;
        }

        // رابط عام (bucket عام). إن كان خاصًا استخدم createSignedUrl
        const { data: pub } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(path);

        uploaded.push({
          name: file.name,
          url: pub.publicUrl,
          type: detectType(file),
          size: file.size,
          path,
        });
      }

      if (uploaded.length) {
        onChange([...attachments, ...uploaded]);
        toast.success(`تم رفع ${uploaded.length} ملف وحفظ الروابط بنجاح`);
      }
    } catch (err) {
      toast.error(`خطأ غير متوقع: ${(err as Error).message}`);
    } finally {
      setUploading(false);
      e.target.value = ""; // للسماح بإعادة رفع نفس الملف
    }
  }

  async function handleRemove(idx: number) {
    const target = attachments[idx];
    if (!target) return;
    if (target.path) {
      await supabase.storage.from(STORAGE_BUCKET).remove([target.path]);
    }
    const next = attachments.filter((_, i) => i !== idx);
    onChange(next);
  }

  function iconFor(type: string) {
    if (type === "image") return <FileImage className="size-3.5 text-primary" />;
    if (type === "video") return <FileVideo className="size-3.5 text-primary" />;
    if (type === "pdf") return <FileIcon className="size-3.5 text-red-500" />;
    return <FileIcon className="size-3.5 text-muted-foreground" />;
  }

  return (
    <div className="rounded-md border bg-muted/10 p-3">
      <div className="mb-2 flex items-center justify-between">
        <label className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
          <Paperclip className="size-3.5" />
          الشواهد والمرفقات (صور، PDF، فيديو) — {attachments.length} ملف
        </label>
        <label className="inline-flex cursor-pointer items-center justify-center gap-1 rounded bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80">
          {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
          <span>إضافة ملفات</span>
          <input
            type="file"
            multiple
            accept="image/*,application/pdf,video/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
      </div>

      {attachments.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">لم يتم إرفاق أي شاهد بعد.</p>
      ) : (
        <ul className="space-y-1.5">
          {attachments.map((a, i) => (
            <li
              key={`${a.path}-${i}`}
              className="flex items-center justify-between gap-2 rounded border bg-background px-2 py-1.5 text-[11px]"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {iconFor(a.type)}
                <span className="truncate font-medium">{a.name}</span>
                <span className="shrink-0 text-muted-foreground">{formatSize(a.size)}</span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {a.url && (
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded p-1 text-primary hover:bg-primary/10"
                    title="عرض"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(i)}
                  className="rounded p-1 text-destructive hover:bg-destructive/10"
                  title="حذف"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* =========================================================================
   نافذة تحرير البرنامج
   ========================================================================= */
function ProgramEditDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: ProgramRecord | null;
  onSaved: () => void;
}) {
  const emptyForm: ProgramRecord = {
    name: "",
    program_no: "",
    ptype: "وقائي",
    domain: "",
    target_group: "",
    term: "الفصل الدراسي الأول - 1448 هـ",
    goal: "",
    indicator: "",
    exec_status: "لم يبدأ",
    required_evidence: "صور، PDF، فيديو",
    attachments: "",
    notes: "",
  };

  const [form, setForm] = useState<ProgramRecord>(emptyForm);
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({ ...emptyForm, ...initial });
        setAttachments(parseAttachments(initial.attachments));
      } else {
        setForm(emptyForm);
        setAttachments([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  function set<K extends keyof ProgramRecord>(key: K, val: ProgramRecord[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function handleAIFill(data: Partial<ProgramRecord>) {
    setForm((f) => ({ ...f, ...data }));
  }

  async function handleSave() {
    if (!form.name?.trim()) {
      toast.error("اسم البرنامج مطلوب");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        program_no: form.program_no ?? null,
        name: form.name,
        ptype: form.ptype ?? null,
        domain: form.domain ?? null,
        target_group: form.target_group ?? null,
        term: form.term ?? null,
        goal: form.goal ?? null,
        indicator: form.indicator ?? null,
        exec_status: form.exec_status ?? "لم يبدأ",
        required_evidence: form.required_evidence ?? null,
        attachments: serializeAttachments(attachments), // ← الحفظ الفعلي
        notes: form.notes ?? null,
      };

      if (initial?.id) {
        const { error } = await supabase
          .from("programs")
          .update(payload as never)
          .eq("id", initial.id);
        if (error) throw error;
        toast.success("تم تحديث البرنامج بنجاح");
      } else {
        const { error } = await supabase
          .from("programs")
          .insert(payload as never);
        if (error) throw error;
        toast.success("تمت إضافة البرنامج بنجاح");
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(`تعذّر الحفظ: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            {initial?.id ? "تحرير بيانات البرنامج" : "إضافة برنامج إرشادي جديد"}
          </DialogTitle>
          <DialogDescription>
            عبّئ الحقول يدويًا أو استعن بزر DeepSeek للتعبئة الذكية، مع إمكانية إرفاق الشواهد.
          </DialogDescription>
        </DialogHeader>

        <DeepSeekAssistantBar onFill={handleAIFill} />

        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label className="text-xs font-bold">اسم البرنامج *</Label>
            <Input
              value={form.name ?? ""}
              onChange={(e) => set("name", e.target.value)}
              placeholder="مثال: برنامج تعزيز السلوك الإيجابي"
            />
          </div>

          <div>
            <Label className="text-xs font-bold">رقم / أسبوع البرنامج</Label>
            <Input
              value={form.program_no ?? ""}
              onChange={(e) => set("program_no", e.target.value)}
              placeholder="الأسبوع الثاني (24 - 28 / 03 / 1448 هـ)"
            />
          </div>

          <div>
            <Label className="text-xs font-bold">نوع البرنامج</Label>
            <select
              value={form.ptype ?? ""}
              onChange={(e) => set("ptype", e.target.value)}
              className="w-full rounded border bg-background px-2 py-2 text-sm"
            >
              <option value="وقائي">وقائي</option>
              <option value="نمائي">نمائي</option>
              <option value="علاجي">علاجي</option>
              <option value="إرشادي / وقائي">إرشادي / وقائي</option>
              <option value="تقييمي">تقييمي</option>
              <option value="وقائي / نمائي">وقائي / نمائي</option>
              <option value="علاجي / وقائي">علاجي / وقائي</option>
            </select>
          </div>

          <div>
            <Label className="text-xs font-bold">المجال</Label>
            <Input value={form.domain ?? ""} onChange={(e) => set("domain", e.target.value)} />
          </div>

          <div>
            <Label className="text-xs font-bold">الفئة المستهدفة</Label>
            <Input
              value={form.target_group ?? ""}
              onChange={(e) => set("target_group", e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <Label className="text-xs font-bold">الفصل / التاريخ الهجري</Label>
            <Input value={form.term ?? ""} onChange={(e) => set("term", e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <Label className="text-xs font-bold">الهدف العام</Label>
            <Textarea rows={3} value={form.goal ?? ""} onChange={(e) => set("goal", e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <Label className="text-xs font-bold">المؤشر / الشاهد</Label>
            <Textarea rows={2} value={form.indicator ?? ""} onChange={(e) => set("indicator", e.target.value)} />
          </div>

          <div>
            <Label className="text-xs font-bold">حالة التنفيذ</Label>
            <select
              value={form.exec_status ?? "لم يبدأ"}
              onChange={(e) => set("exec_status", e.target.value)}
              className="w-full rounded border bg-background px-2 py-2 text-sm"
            >
              <option value="لم يبدأ">لم يبدأ</option>
              <option value="جارٍ التنفيذ">جارٍ التنفيذ</option>
              <option value="مكتمل">مكتمل</option>
              <option value="مؤجل">مؤجل</option>
            </select>
          </div>

          <div>
            <Label className="text-xs font-bold">الشواهد المطلوبة</Label>
            <Input
              value={form.required_evidence ?? ""}
              onChange={(e) => set("required_evidence", e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <AttachmentsUploadField attachments={attachments} onChange={setAttachments} />
          </div>

          <div className="md:col-span-2">
            <Label className="text-xs font-bold">ملاحظات</Label>
            <Textarea rows={2} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            حفظ البرنامج
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================================
   نافذة عرض التقرير المفصل + الطباعة
   ========================================================================= */
function ProgramReportDialog({
  open,
  onOpenChange,
  program,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  program: ProgramRecord | null;
}) {
  const attachments = useMemo(
    () => parseAttachments(program?.attachments),
    [program]
  );

  function handlePrint() {
    // ننتظر قليلًا حتى يتم الرسم ثم نطبع
    setTimeout(() => window.print(), 100);
  }

  if (!program) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92vh] max-w-4xl overflow-y-auto print:max-h-none print:max-w-none print:shadow-none"
        dir="rtl"
      >
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center gap-2">
            <Printer className="size-5 text-primary" /> تقرير البرنامج الإرشادي
          </DialogTitle>
          <DialogDescription>
            عرض التقرير الكامل مع الشواهد وإمكانية الطباعة أو الحفظ PDF.
          </DialogDescription>
        </DialogHeader>

        {/* منطقة الطباعة */}
        <div id="print-report" className="space-y-4 rounded-lg border bg-card p-6 print:border-0 print:p-0">
          {/* رأس رسمي */}
          <header className="border-b-2 border-primary/60 pb-3 text-center">
            <p className="text-[11px] font-semibold text-muted-foreground">
              المملكة العربية السعودية — وزارة التعليم
            </p>
            <p className="text-[11px] text-muted-foreground">
              إدارة التعليم — قسم التوجيه الطلابي
            </p>
            <h1 className="mt-2 text-lg font-bold text-primary">
              تقرير البرنامج الإرشادي
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              تاريخ الإصدار: {new Date().toLocaleDateString("ar-SA")}
            </p>
          </header>

          {/* بيانات البرنامج */}
          <section>
            <h2 className="mb-2 border-r-4 border-primary pr-2 text-sm font-bold">
              بيانات البرنامج
            </h2>
            <table className="w-full border-collapse text-xs">
              <tbody>
                <ReportRow label="اسم البرنامج" value={program.name} />
                <ReportRow label="رقم / أسبوع البرنامج" value={program.program_no} />
                <ReportRow label="الفصل / التاريخ الهجري" value={program.term} />
                <ReportRow label="نوع البرنامج" value={program.ptype} />
                <ReportRow label="المجال" value={program.domain} />
                <ReportRow label="الفئة المستهدفة" value={program.target_group} />
                <ReportRow label="حالة التنفيذ" value={program.exec_status} />
              </tbody>
            </table>
          </section>

          {/* المحتوى التربوي */}
          <section>
            <h2 className="mb-2 border-r-4 border-primary pr-2 text-sm font-bold">
              المحتوى التربوي
            </h2>
            <div className="space-y-2 text-xs">
              <ReportBlock title="الهدف العام" value={program.goal} />
              <ReportBlock title="المؤشر / الشاهد" value={program.indicator} />
              <ReportBlock title="الشواهد المطلوبة" value={program.required_evidence} />
              {program.notes && <ReportBlock title="ملاحظات" value={program.notes} />}
            </div>
          </section>

          {/* الشواهد والمرفقات */}
          <section>
            <h2 className="mb-2 border-r-4 border-primary pr-2 text-sm font-bold">
              الشواهد والمرفقات ({attachments.length})
            </h2>

            {attachments.length === 0 ? (
              <p className="text-xs text-muted-foreground">لا توجد شواهد مرفقة.</p>
            ) : (
              <>
                {/* شبكة الصور */}
                {attachments.some((a) => a.type === "image") && (
                  <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {attachments
                      .filter((a) => a.type === "image")
                      .map((a, i) => (
                        <a
                          key={i}
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block overflow-hidden rounded border bg-muted"
                        >
                          <img
                            src={a.url}
                            alt={a.name}
                            className="h-32 w-full object-cover"
                            loading="lazy"
                          />
                          <p className="truncate p-1 text-[10px]">{a.name}</p>
                        </a>
                      ))}
                  </div>
                )}

                {/* جدول بقية الملفات */}
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-muted/60">
                      <th className="border p-1.5 text-right">#</th>
                      <th className="border p-1.5 text-right">اسم الملف</th>
                      <th className="border p-1.5 text-right">النوع</th>
                      <th className="border p-1.5 text-right">الحجم</th>
                      <th className="border p-1.5 text-right print:hidden">الرابط</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attachments.map((a, i) => (
                      <tr key={i}>
                        <td className="border p-1.5">{i + 1}</td>
                        <td className="border p-1.5 font-medium">{a.name}</td>
                        <td className="border p-1.5">
                          {a.type === "image"
                            ? "صورة"
                            : a.type === "video"
                            ? "فيديو"
                            : a.type === "pdf"
                            ? "PDF"
                            : "ملف"}
                        </td>
                        <td className="border p-1.5">{formatSize(a.size)}</td>
                        <td className="border p-1.5 print:hidden">
                          {a.url ? (
                            <a
                              href={a.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary underline"
                            >
                              فتح
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </section>

          {/* التوقيعات */}
          <section className="mt-8 grid grid-cols-2 gap-6 text-xs">
            <div className="text-center">
              <p className="font-bold">الموجه الطلابي</p>
              <div className="mt-8 border-t border-dashed pt-1 text-muted-foreground">
                الاسم / التوقيع
              </div>
            </div>
            <div className="text-center">
              <p className="font-bold">مدير المدرسة</p>
              <div className="mt-8 border-t border-dashed pt-1 text-muted-foreground">
                الاسم / التوقيع
              </div>
            </div>
          </section>
        </div>

        <DialogFooter className="gap-2 print:hidden">
          <Button variant="outline" onClick={() => onOpenChange(false)}>إغلاق</Button>
          <Button onClick={handlePrint}>
            <Printer className="size-4" /> طباعة / حفظ PDF
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* CSS مخصص للطباعة */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-report, #print-report * { visibility: visible !important; }
          #print-report {
            position: absolute; inset: 0;
            width: 100%; padding: 20px;
            background: white; color: black;
          }
          @page { size: A4; margin: 12mm; }
        }
      `}</style>
    </Dialog>
  );
}

function ReportRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <tr className="border-b">
      <th className="w-44 border bg-muted/40 p-2 text-right align-top font-bold">
        {label}
      </th>
      <td className="border p-2 align-top">{value || "—"}</td>
    </tr>
  );
}

function ReportBlock({ title, value }: { title: string; value?: string | null }) {
  return (
    <div className="rounded border bg-muted/10 p-2">
      <p className="mb-1 text-[11px] font-bold text-primary">{title}</p>
      <p className="whitespace-pre-wrap leading-relaxed">{value || "—"}</p>
    </div>
  );
}

/* =========================================================================
   نافذة استيراد الخطة الوزارية
   ========================================================================= */
function MinistryProgramsDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function seed() {
    setBusy(true);
    try {
      const { data: existing } = await supabase.from("programs").select("name");
      const known = new Set(
        (existing ?? []).map((p) =>
          String((p as { name: string | null }).name ?? "").trim()
        )
      );
      const payloads = MAKKAH_MINISTRY_PROGRAMS.filter((p) => !known.has(p.name!))
        .map((p) => ({ ...p, attachments: "[]" }));
      if (!payloads.length) {
        toast.info("جميع البرامج مضافة مسبقًا.");
        return;
      }
      const { error } = await supabase.from("programs").insert(payloads as never);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success(`تم استيراد ${payloads.length} برنامجًا وزاريًا بنجاح`);
      setOpen(false);
    } catch (error) {
      toast.error(`تعذّرت الإضافة: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <CalendarRange className="size-4" /> الخطة الوزارية (مكة 1448هـ)
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>خطة برامج التوجيه الطلابي (مرتبة حسب التاريخ الهجري)</DialogTitle>
            <DialogDescription>
              استعراض واعتماد الخطة الدراسية كاملة موزعة على 18 أسبوعًا.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b bg-muted/60">
                  <th className="p-2 font-bold">الأسبوع والتاريخ الهجري</th>
                  <th className="p-2 font-bold">البرنامج</th>
                  <th className="p-2 font-bold">النوع</th>
                  <th className="p-2 font-bold">الفئة</th>
                  <th className="p-2 font-bold">المؤشر</th>
                </tr>
              </thead>
              <tbody>
                {MAKKAH_MINISTRY_PROGRAMS.map((p) => (
                  <tr key={p.program_no!} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="whitespace-nowrap p-2 font-mono text-[11px] font-semibold text-primary">
                      {p.program_no}
                    </td>
                    <td className="p-2 font-bold">{p.name}</td>
                    <td className="p-2">{p.ptype}</td>
                    <td className="p-2">{p.target_group}</td>
                    <td className="p-2 text-muted-foreground">{p.indicator}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>إغلاق</Button>
            <Button onClick={seed} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              استيراد واعتماد الكل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* =========================================================================
   الصفحة الرئيسية
   ========================================================================= */
function ProgramsPage() {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<ProgramRecord | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reporting, setReporting] = useState<ProgramRecord | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyDelete, setBusyDelete] = useState(false);
  const [search, setSearch] = useState("");

  const { data: programs = [], isLoading } = useQuery<ProgramRecord[]>({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProgramRecord[];
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return programs;
    const q = search.trim();
    return programs.filter(
      (p) =>
        (p.name ?? "").includes(q) ||
        (p.domain ?? "").includes(q) ||
        (p.target_group ?? "").includes(q)
    );
  }, [programs, search]);

  function toggleSelect(id?: string) {
    if (!id) return;
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((p) => p.id!).filter(Boolean)));
  }

  async function handleDeleteSelected() {
    if (selected.size === 0) {
      toast.error("لم يتم تحديد أي برنامج");
      return;
    }
    if (!window.confirm(`سيتم حذف ${selected.size} برنامجًا. متابعة؟`)) return;
    setBusyDelete(true);
    try {
      // حذف المرفقات من Storage أولًا
      const toDelete = programs.filter((p) => p.id && selected.has(p.id));
      const paths: string[] = [];
      toDelete.forEach((p) =>
        parseAttachments(p.attachments).forEach((a) => a.path && paths.push(a.path))
      );
      if (paths.length) {
        await supabase.storage.from(STORAGE_BUCKET).remove(paths);
      }

      const { error } = await supabase
        .from("programs")
        .delete()
        .in("id", Array.from(selected));
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      setSelected(new Set());
      toast.success("تم حذف البرامج المحددة");
    } catch (e) {
      toast.error(`خطأ في الحذف: ${(e as Error).message}`);
    } finally {
      setBusyDelete(false);
    }
  }

  async function handleDeleteAll() {
    if (!window.confirm("تحذير: هل أنت متأكد من حذف كافة البرامج المسجلة نهائيًا؟")) return;
    setBusyDelete(true);
    try {
      const paths: string[] = [];
      programs.forEach((p) =>
        parseAttachments(p.attachments).forEach((a) => a.path && paths.push(a.path))
      );
      if (paths.length) {
        await supabase.storage.from(STORAGE_BUCKET).remove(paths);
      }

      const { error } = await supabase
        .from("programs")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      setSelected(new Set());
      toast.success("تم حذف كافة البرامج");
    } catch (e) {
      toast.error(`خطأ في الحذف: ${(e as Error).message}`);
    } finally {
      setBusyDelete(false);
    }
  }

  function openEdit(p?: ProgramRecord) {
    setEditing(p ?? null);
    setEditOpen(true);
  }

  function openReport(p: ProgramRecord) {
    setReporting(p);
    setReportOpen(true);
  }

  return (
    <div className="space-y-4 p-2" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <MinistryProgramsDialog />
          <Button size="sm" onClick={() => openEdit()}>
            <Plus className="size-4" /> إضافة برنامج
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={toggleSelectAll}
            disabled={!filtered.length}
          >
            {selected.size === filtered.length && filtered.length > 0 ? (
              <CheckSquare className="size-4" />
            ) : (
              <Square className="size-4" />
            )}
            تحديد الكل
          </Button>
          {selected.size > 0 && (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDeleteSelected}
              disabled={busyDelete}
            >
              {busyDelete ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              حذف المحدد ({selected.size})
            </Button>
          )}
          <Button size="sm" variant="destructive" onClick={handleDeleteAll} disabled={busyDelete}>
            {busyDelete ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            حذف الكل
          </Button>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو المجال أو الفئة..."
          className="w-full max-w-xs rounded border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-10">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          لا توجد برامج. ابدأ باستيراد الخطة الوزارية أو أضف برنامجًا جديدًا.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const atts = parseAttachments(p.attachments);
            return (
              <div
                key={p.id}
                className="relative rounded-lg border bg-card p-3 shadow-sm transition hover:border-primary/60"
              >
                <button
                  onClick={() => toggleSelect(p.id)}
                  className="absolute left-2 top-2 text-muted-foreground hover:text-primary"
                  title="تحديد"
                >
                  {selected.has(p.id!) ? (
                    <CheckSquare className="size-4 text-primary" />
                  ) : (
                    <Square className="size-4" />
                  )}
                </button>

                <div className="mb-1 flex items-start gap-2">
                  <FileText className="mt-0.5 size-4 shrink-0 text-primary" />
                  <h3 className="flex-1 pr-1 text-sm font-bold leading-tight">{p.name}</h3>
                </div>

                <p className="mb-2 line-clamp-2 text-[11px] text-muted-foreground">{p.goal}</p>

                <div className="mb-2 flex flex-wrap gap-1">
                  {p.ptype && <Badge variant="outline" className="text-[10px]">{p.ptype}</Badge>}
                  {p.domain && <Badge variant="secondary" className="text-[10px]">{p.domain}</Badge>}
                  <Badge
                    className="text-[10px]"
                    variant={
                      p.exec_status === "مكتمل"
                        ? "default"
                        : p.exec_status === "جارٍ التنفيذ"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {p.exec_status}
                  </Badge>
                </div>

                <div className="mb-2 text-[10px] text-muted-foreground">
                  <div className="truncate"><strong>الفئة:</strong> {p.target_group}</div>
                  <div className="truncate"><strong>التاريخ:</strong> {p.term}</div>
                </div>

                {atts.length > 0 && (
                  <div className="mb-2 flex items-center gap-1 text-[10px] text-primary">
                    <Paperclip className="size-3" />
                    <span>{atts.length} شاهد مرفق</span>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap justify-end gap-2 border-t pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px]"
                    onClick={() => openReport(p)}
                  >
                    <Printer className="size-3" /> تقرير وطباعة
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px]"
                    onClick={() => openEdit(p)}
                  >
                    <Pencil className="size-3" /> تحرير
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-7 text-[11px]"
                    onClick={async () => {
                      if (!window.confirm(`حذف البرنامج: ${p.name}؟`)) return;
                      try {
                        const paths = parseAttachments(p.attachments)
                          .map((a) => a.path)
                          .filter(Boolean);
                        if (paths.length) {
                          await supabase.storage.from(STORAGE_BUCKET).remove(paths);
                        }
                        const { error } = await supabase
                          .from("programs")
                          .delete()
                          .eq("id", p.id!);
                        if (error) throw error;
                        queryClient.invalidateQueries({ queryKey: ["programs"] });
                        toast.success("تم الحذف");
                      } catch (e) {
                        toast.error((e as Error).message);
                      }
                    }}
                  >
                    <Trash2 className="size-3" /> حذف
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ProgramEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={editing}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["programs"] })}
      />

      <ProgramReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        program={reporting}
      />
    </div>
  );
}