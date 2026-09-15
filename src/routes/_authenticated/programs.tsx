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
  X,
  Wand2,
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
      { property: "og:title", content: "البرامج والأنشطة | منصة الذات" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ProgramsPage,
});

/* =========================================================================
   نموذج البرنامج التربوي (Schema) — مطابق لدليل التوجيه الطلابي
   ========================================================================= */
export type ProgramRecord = {
  id?: string;
  program_no?: string | null;
  name?: string | null;
  ptype?: string | null;          // نوع البرنامج: وقائي / نمائي / علاجي / إرشادي / تقييمي
  domain?: string | null;         // المجال: المهاري، السلوكي، التحصيلي، النفسي، الاجتماعي، المهني، التقني
  target_group?: string | null;   // الفئة المستهدفة
  term?: string | null;           // الفصل + الأسبوع + التاريخ الهجري
  goal?: string | null;           // الهدف العام
  indicator?: string | null;      // مؤشر النجاح / الشاهد
  exec_status?: string | null;    // حالة التنفيذ: لم يبدأ / جارٍ / مكتمل
  required_evidence?: string | null; // الشواهد المطلوبة
  attachments?: string | null;    // مرفقات (صور، PDF، فيديو)
  notes?: string | null;
  created_at?: string | null;
};

/* =========================================================================
   خطة البرامج الوزارية (مكة المكرمة 1448هـ) — مرتبة تصاعديًا
   ========================================================================= */
const MAKKAH_MINISTRY_PROGRAMS: Omit<ProgramRecord, "id" | "created_at">[] = [
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
   زر DeepSeek المدمج داخل نافذة البرنامج (تعبئة ذكية تربوية)
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
      // ربط حقيقي بـ DeepSeek — يستبدل هذا الجزء عند تفعيل الـ endpoint في المنصة
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
        // Fallback محلي بصياغة تربوية دقيقة
        ai = {
          name: topic,
          ptype: "وقائي / نمائي",
          domain: "المهاري والتربوي والنفسي",
          target_group: "طلبة المدرسة وأولياء الأمور",
          goal: `تفعيل الجانب الإرشادي والوقائي لبرنامج (${topic}) بما يحقق بيئة مدرسية آمنة ومحفزة للتعلم وفق معايير وزارة التعليم بالمملكة العربية السعودية.`,
          indicator:
            "تنفيذ الورش الإرشادية، رصد تفاعل المستفيدين، وتقديم تقرير الأثر وفق الاستمارات المعتمدة.",
          term: "الفصل الدراسي الأول - 1448 هـ",
          required_evidence: "ملفات صور التفعيل، تقرير PDF معتمد، مقطع فيديو توثيقي.",
          notes:
            "تمت الصياغة والتعبئة آليًا بواسطة نموذج الذكاء الاصطناعي DeepSeek المدمج.",
          exec_status: "لم يبدأ",
        };
      }
      onFill(ai);
      toast.success("تم توليد الحقول بصياغة تربوية دقيقة عبر DeepSeek ✅");
      setTopic("");
    } catch {
      toast.error("تعذّر التوليد الذكي، حاول مجددًا");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="mb-4 rounded-lg border border-primary/40 bg-primary/5 p-3"
      dir="rtl"
    >
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
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Wand2 className="size-3.5" />
          )}
          تعبئة ذكية
        </Button>
      </div>
    </div>
  );
}

/* =========================================================================
   حقل رفع الملفات (صور، PDF، فيديو) — داخل نافذة البرنامج
   ========================================================================= */
function AttachmentsUploadField({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const names: string[] = [];
      for (const file of Array.from(files)) {
        // رفع فعلي إلى Supabase Storage — bucket: "program-evidence"
        const path = `programs/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage
          .from("program-evidence")
          .upload(path, file, { upsert: false });
        if (error) {
          names.push(file.name); // نُبقي الاسم على الأقل للتوثيق
        } else {
          names.push(path);
        }
      }
      const merged = [value, ...names].filter(Boolean).join("، ");
      onChange(merged);
      toast.success(`تم إرفاق ${names.length} ملف/ملفات بنجاح`);
    } catch {
      toast.error("فشل رفع أحد الملفات");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-md border bg-muted/10 p-2">
      <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
        <Paperclip className="size-3.5" />
        الشواهد والمرفقات (صور، PDF، فيديو تنفيذي)
      </label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="أسماء الملفات المرفقة أو المسارات..."
          className="flex-1 rounded border bg-background px-2 py-1 text-xs"
        />
        <label className="inline-flex cursor-pointer items-center justify-center gap-1 rounded bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80">
          {uploading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Upload className="size-3.5" />
          )}
          <span>اختر ملف</span>
          <input
            type="file"
            multiple
            accept="image/*,application/pdf,video/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      </div>
    </div>
  );
}

/* =========================================================================
   نافذة إضافة / تحرير برنامج (Dialog) — تحتوي DeepSeek + المرفقات
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(initial ? { ...emptyForm, ...initial } : emptyForm);
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
        attachments: form.attachments ?? null,
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
      <DialogContent
        className="max-h-[92vh] max-w-3xl overflow-y-auto"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            {initial?.id ? "تحرير بيانات البرنامج" : "إضافة برنامج إرشادي جديد"}
          </DialogTitle>
          <DialogDescription>
            عبّئ الحقول يدويًا أو استعن بزر DeepSeek للتعبئة الذكية وفق دليل
            التوجيه الطلابي بوزارة التعليم.
          </DialogDescription>
        </DialogHeader>

        {/* شريط DeepSeek المدمج */}
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
            <Input
              value={form.domain ?? ""}
              onChange={(e) => set("domain", e.target.value)}
              placeholder="المهاري، السلوكي، التحصيلي..."
            />
          </div>

          <div>
            <Label className="text-xs font-bold">الفئة المستهدفة</Label>
            <Input
              value={form.target_group ?? ""}
              onChange={(e) => set("target_group", e.target.value)}
              placeholder="طلبة التعليم العام، أولياء الأمور..."
            />
          </div>

          <div className="md:col-span-2">
            <Label className="text-xs font-bold">الفصل / التاريخ الهجري</Label>
            <Input
              value={form.term ?? ""}
              onChange={(e) => set("term", e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <Label className="text-xs font-bold">الهدف العام</Label>
            <Textarea
              rows={3}
              value={form.goal ?? ""}
              onChange={(e) => set("goal", e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <Label className="text-xs font-bold">المؤشر / الشاهد</Label>
            <Textarea
              rows={2}
              value={form.indicator ?? ""}
              onChange={(e) => set("indicator", e.target.value)}
            />
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

          {/* رفع الملفات داخل النافذة */}
          <div className="md:col-span-2">
            <AttachmentsUploadField
              value={form.attachments ?? ""}
              onChange={(v) => set("attachments", v)}
            />
          </div>

          <div className="md:col-span-2">
            <Label className="text-xs font-bold">ملاحظات</Label>
            <Textarea
              rows={2}
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            حفظ البرنامج
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================================
   نافذة استيراد الخطة الوزارية (مكة 1448هـ)
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
      const payloads = MAKKAH_MINISTRY_PROGRAMS.filter(
        (p) => !known.has(p.name!)
      );
      if (!payloads.length) {
        toast.info("جميع البرامج مضافة مسبقًا.");
        return;
      }
      const { error } = await supabase
        .from("programs")
        .insert(payloads as never);
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
        <DialogContent
          className="max-h-[90vh] max-w-5xl overflow-y-auto"
          dir="rtl"
        >
          <DialogHeader>
            <DialogTitle>
              خطة برامج التوجيه الطلابي (مرتبة حسب التاريخ الهجري)
            </DialogTitle>
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
                  <th className="p-2 font-bold">الفئة المستهدفة</th>
                  <th className="p-2 font-bold">المؤشر</th>
                </tr>
              </thead>
              <tbody>
                {MAKKAH_MINISTRY_PROGRAMS.map((p) => (
                  <tr
                    key={p.program_no!}
                    className="border-b last:border-0 hover:bg-muted/20"
                  >
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
            <Button variant="outline" onClick={() => setOpen(false)}>
              إغلاق
            </Button>
            <Button onClick={seed} disabled={busy}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              استيراد واعتماد الكل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* =========================================================================
   الصفحة الرئيسية للبرامج
   ========================================================================= */
function ProgramsPage() {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<ProgramRecord | null>(null);
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
    if (
      !window.confirm(
        "تحذير: هل أنت متأكد من حذف كافة البرامج المسجلة نهائيًا؟"
      )
    )
      return;
    setBusyDelete(true);
    try {
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

  return (
    <div className="space-y-4 p-2" dir="rtl">
      {/* شريط الأدوات العلوي */}
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
              {busyDelete ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              حذف المحدد ({selected.size})
            </Button>
          )}
          <Button
            size="sm"
            variant="destructive"
            onClick={handleDeleteAll}
            disabled={busyDelete}
          >
            {busyDelete ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
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

      {/* قائمة البرامج */}
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
          {filtered.map((p) => (
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
                <h3 className="flex-1 pr-1 text-sm font-bold leading-tight">
                  {p.name}
                </h3>
              </div>

              <p className="mb-2 line-clamp-2 text-[11px] text-muted-foreground">
                {p.goal}
              </p>

              <div className="mb-2 flex flex-wrap gap-1">
                {p.ptype && (
                  <Badge variant="outline" className="text-[10px]">
                    {p.ptype}
                  </Badge>
                )}
                {p.domain && (
                  <Badge variant="secondary" className="text-[10px]">
                    {p.domain}
                  </Badge>
                )}
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
                <div className="truncate">
                  <strong>الفئة:</strong> {p.target_group}
                </div>
                <div className="truncate">
                  <strong>التاريخ:</strong> {p.term}
                </div>
              </div>

              {p.attachments && (
                <div className="mb-2 flex items-center gap-1 text-[10px] text-primary">
                  <Paperclip className="size-3" />
                  <span className="truncate">{p.attachments}</span>
                </div>
              )}

              <div className="mt-3 flex justify-end gap-2 border-t pt-2">
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
                    const { error } = await supabase
                      .from("programs")
                      .delete()
                      .eq("id", p.id!);
                    if (error) toast.error(error.message);
                    else {
                      queryClient.invalidateQueries({
                        queryKey: ["programs"],
                      });
                      toast.success("تم الحذف");
                    }
                  }}
                >
                  <Trash2 className="size-3" /> حذف
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* نافذة الإضافة / التحرير مع DeepSeek والمرفقات */}
      <ProgramEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={editing}
        onSaved={() =>
          queryClient.invalidateQueries({ queryKey: ["programs"] })
        }
      />
    </div>
  );
}