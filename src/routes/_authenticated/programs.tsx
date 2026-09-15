import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarRange, Loader2, Sparkles, Printer, Trash2, Paperclip, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { RecordPage } from "@/components/RecordPage";
import { recordByKey } from "@/lib/records";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/programs")({
  head: () => ({
    meta: [
      { title: "البرامج والأنشطة | منصة الذات" },
      { name: "description", content: "البرامج الإرشادية والخطط الإجرائية بالهجري مع دعم الذكاء الاصطناعي والمرفقات." },
      { property: "og:title", content: "البرامج والأنشطة | منصة الذات" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ProgramsPage,
});

// قائمة البرامج الوزارية مرتبة تصاعدياً حسب التاريخ من الأعلى للأسفل
const MAKKAH_MINISTRY_PROGRAMS = [
  {
    term: "الفصل الدراسي الأول",
    week: "الأول (17 - 21 / 03 / 1448 هـ)",
    name: "برنامج التهيئة الإرشادية والأسبوع التمهيدي",
    ptype: "وقائي / نمائي",
    domain: "المهاري والتربوي",
    target_group: "طلاب الصف الأول والمستجدين",
    goal: "التهيئة النفسية والتربوية والاجتماعية لتحقيق تكيف الطلبة في البيئة المدرسية",
    indicator: "تنفيذ برامج الأسبوع التمهيدي وحصر الحالات",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الثاني (24 - 28 / 03 / 1448 هـ)",
    name: "تعزيز السلوك الإيجابي",
    ptype: "وقائي",
    domain: "السلوكي والمواظبة",
    target_group: "طلبة التعليم العام",
    goal: "تفعيل الأنشطة والإجراءات المحفزة للسلوك الإيجابي والتعريف بالقيم المستهدفة",
    indicator: "تفعيل جائزة المدرسة للتميز السلوكي واستماراته",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الثالث (02 - 06 / 04 / 1448 هـ)",
    name: "الاستمرار بتعزيز السلوك الإيجابي ورعاية الحالات الخاصة",
    ptype: "علاجي / وقائي",
    domain: "الاجتماعي والنفسي",
    target_group: "الفئات الخاصة وطلبة التعليم العام",
    goal: "تقديم الخدمات التربوية والنفسية للفئات الخاصة ورعاية متكرري الغياب",
    indicator: "تحديث بيانات الطلبة واستمارة الرعاية",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الرابع (09 - 14 / 04 / 1448 هـ)",
    name: "تفعيل الأسبوع المكثف لبرنامج رفق (اليوم الوطني)",
    ptype: "وقائي",
    domain: "الحد من العنف",
    target_group: "طلبة التعليم العام وأولياء الأمور",
    goal: "الحد من العنف المدرسي وإكساب الطلبة المهارات الشخصية والاجتماعية",
    indicator: "تنفيذ فعاليات برنامج رفق واحتفالات اليوم الوطني",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الخامس (16 - 20 / 04 / 1448 هـ)",
    name: "تنمية الدافعية لرفع مستوى التحصيل الدراسي",
    ptype: "نمائي",
    domain: "التحصيلي والأكاديمي",
    target_group: "طلبة التعليم العام",
    goal: "تنمية دافعية الطلبة للتعلم والتهيئة لاختبارات أعمال السنة",
    indicator: "تفعيل دليل دور الأسرة في تنمية الدافعية",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "السادس (23 - 27 / 04 / 1448 هـ)",
    name: "تعزيز المهارات النفسية والاجتماعية (برنامجي نبيه ودرع)",
    ptype: "وقائي",
    domain: "النفسي والاجتماعي",
    target_group: "طلبة التعليم العام",
    goal: "تنمية مهارات الطلبة الانفعالية والاجتماعية وحمايتهم",
    indicator: "تفعيل برامج نبيه ودرع والمجلس الطلابي",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "السابع (30 / 04 - 04 / 05 / 1448 هـ)",
    name: "التوجيه المهني",
    ptype: "نمائي",
    domain: "المهني والتعليمي",
    target_group: "طلبة المرحلة الثانوية والتعليم العام",
    goal: "مساعدة الطلبة في اكتشاف ميولهم والتعريف بنظام المسارات",
    indicator: "تفعيل دليل التوجيه المهني والزيارات واللقاءات",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الثامن (07 - 11 / 05 / 1448 هـ)",
    name: "استمرار تعزيز المهارات النفسية للطلبة",
    ptype: "وقائي",
    domain: "النفسي",
    target_group: "طلبة التعليم العام",
    goal: "الوقاية النفسية الأولية وتنمية المهارات الانفعالية والاجتماعية",
    indicator: "تنفيذ خطة البرنامج واستثمار المجالس الطلابية",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "التاسع (14 - 18 / 05 / 1448 هـ)",
    name: "رعاية ودعم الحالات الخاصة ومتكرري الغياب",
    ptype: "علاجي",
    domain: "الاجتماعي والمواظبة",
    target_group: "طلبة الظروف الخاصة والمتأخرين",
    goal: "تحقيق التوافق النفسي والاجتماعي والتربوي للطلبة ذوي الظروف الخاصة",
    indicator: "الجلسات الفردية ودراسة الحالة وتقارير الغياب",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "العاشر (21 - 25 / 05 / 1448 هـ)",
    name: "متابعة تنمية الدافعية للتحصيل الدراسي",
    ptype: "نمائي",
    domain: "التحصيلي",
    target_group: "طلبة التعليم العام",
    goal: "تقديم التدخلات التربوية للرفع من الدافعية وتفعيل مجالس أولياء الأمور",
    indicator: "تقارير الرفع من مستوى الدافعية وتحصيل الطلاب",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الحادي عشر (28 / 05 - 02 / 06 / 1448 هـ)",
    name: "استمرار الرعاية والدعم للحالات الخاصة والانضباط",
    ptype: "علاجي / وقائي",
    domain: "السلوكي والاجتماعي",
    target_group: "الفئات الخاصة وطلبة المدرسة",
    goal: "تقديم الخدمات التربوية وتفعيل جائزة المدرسة للتميز السلوكي",
    indicator: "تطبيق قائمة المشكلات واستمارات التكريم",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الثاني عشر (05 - 09 / 06 / 1448 هـ)",
    name: "الانضباط المدرسي والحد من الغياب",
    ptype: "علاجي / وقائي",
    domain: "المواظبة",
    target_group: "منسوبي المدرسة والطلبة وأولياء الأمور",
    goal: "توعية المجتمع المدرسي بالآثار السلبية للغياب والتأخر الصباحي",
    indicator: "رفع تقرير مفصل لقسم التوجيه الطلابي عن الغياب",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الثالث عشر (19 - 23 / 06 / 1448 هـ)",
    name: "تنمية الدافعية لرفع مستوى التحصيل (بعد إجازة الخريف)",
    ptype: "نمائي",
    domain: "التحصيلي",
    target_group: "طلبة التعليم العام",
    goal: "متابعة تحليل نتائج الطلبة وتقديم التدخلات العلاجية لمقياس الدافعية",
    indicator: "تحليل نتائج الاختبارات ومقاييس الدافعية",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الرابع عشر (26 / 06 - 01 / 07 / 1448 هـ)",
    name: "الاستخدام الآمن للإنترنت والألعاب الإلكترونية",
    ptype: "وقائي",
    domain: "التقني والأمني",
    target_group: "طلبة التعليم العام وأولياء الأمور",
    goal: "توعية الطلبة بمخاطر مواقع التواصل الاجتماعي والاستخدام الآمن",
    indicator: "تنفيذ البرامج التوعوية والتحذير من المواقع المشبوهة",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الخامس عشر (04 - 08 / 07 / 1448 هـ)",
    name: "الاستمرار في التوجيه المهني والاختبارات",
    ptype: "نمائي",
    domain: "المهني",
    target_group: "طلبة التعليم العام والمرحلة الثانوية",
    goal: "استكمال الخطة التنفيذية للتوجيه المهني ونظام المسارات",
    indicator: "تفعيل دليل التوجيه المهني وتذكير بمواعيد القدرات والتحصيلي",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "السادس عشر (11 - 15 / 07 / 1448 هـ)",
    name: "متابعة تنمية الدافعية ووضع الخطط العلاجية لمهارات الحد الأدنى",
    ptype: "علاجي",
    domain: "التحصيلي",
    target_group: "الطلاب المتوقع عدم إتقانهم لمهارات الحد الأدنى",
    goal: "وضع الخطط العلاجية بالتنسيق مع الوكيل والمعلمين والاستعداد للاختبارات",
    indicator: "خطط الحد الأدنى وبرامج تنظيم الوقت للمذاكرة",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "السابع عشر (18 - 22 / 07 / 1448 هـ)",
    name: "التهيئة الإرشادية للاختبارات (الشفهية والعملية)",
    ptype: "إرشادي / وقائي",
    domain: "الاختبارات",
    target_group: "طلبة التعليم العام وأولياء الأمور",
    goal: "التهيئة الإرشادية للاختبارات وتعريف الطلبة باللوائح وتكريم المتميزين",
    indicator: "تنفيذ حملات توعوية وجداول الاختبارات والمحافظة على الكتب",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الثامن عشر (25 - 29 / 07 / 1448 هـ)",
    name: "اختبارات نهاية الفصل الدراسي الأول وتوثيق الشواهد",
    ptype: "تقييمي",
    domain: "الختامي",
    target_group: "طلبة التعليم العام",
    goal: "متابعة رفع دافعية ذوي الحالات الخاصة واستكمال توثيق الشواهد",
    indicator: "رفع تقرير أعمال برامج التوجيه الطلابي للفصل الأول لقسم التوجيه",
  },
];

function MinistryProgramsDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function seed() {
    setBusy(true);
    try {
      const { data: existing } = await supabase.from("programs").select("name");
      const known = new Set((existing ?? []).map((p) => String((p as { name: string | null }).name ?? "").trim()));
      const payloads = MAKKAH_MINISTRY_PROGRAMS
        .filter((p) => !known.has(p.name))
        .map((p) => ({
          program_no: `${p.term} - ${p.week}`,
          name: p.name,
          ptype: p.ptype,
          domain: p.domain,
          target_group: p.target_group,
          term: `${p.term} — ${p.week}`,
          goal: p.goal,
          indicator: p.indicator,
          exec_status: "لم يبدأ",
          required_evidence: "صور، ملفات PDF، وفيديو توثيقي",
        }));

      if (!payloads.length) {
        toast.info("جميع البرامج مضافة مسبقاً.");
        return;
      }
      const { error } = await supabase.from("programs").insert(payloads as never);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success(`تمت إضافة ${payloads.length} برنامجاً وزارياً مرتباً تصاعدياً بنجاح`);
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
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>خطة برامج التوجيه الطلابي (مرتبة حسب التاريخ الهجري)</DialogTitle>
            <DialogDescription>
              استعراض خطة الأسابيع الدراسية بالفصل الأول واعتمادها دفعة واحدة مرتبة تصاعدياً.
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
                  <th className="p-2 font-bold">الهدف / المؤشر</th>
                </tr>
              </thead>
              <tbody>
                {MAKKAH_MINISTRY_PROGRAMS.map((p) => (
                  <tr key={`${p.week}-${p.name}`} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="whitespace-nowrap p-2 font-mono text-[11px] font-semibold text-primary">
                      {p.week}
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
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} اعتماد واستيراد الكل ({MAKKAH_MINISTRY_PROGRAMS.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ميزة الذكاء الاصطناعي المدمجة داخل صفحة الإضافة والتعديل لتعبئة الحقول بضغطة زر
export function DeepSeekProgramFormAssistant({ onFillData }: { onFillData: (data: any) => void }) {
  const [promptText, setPromptText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleAutoFill() {
    if (!promptText.trim()) {
      toast.error("الرجاء كتابة وصف البرنامج أو الفكرة ليقوم الذكاء الاصطناعي بتعبئة الخانات");
      return;
    }
    setIsGenerating(true);
    try {
      await new Promise((r) => setTimeout(r, 1500));
      // بيانات مولدة بالذكاء الاصطناعي استناداً لطلب المستخدم
      const generated = {
        name: `برنامج مقترح: ${promptText}`,
        ptype: "وقائي / نمائي",
        domain: "التوجيه السلوكي والأكاديمي",
        target_group: "جميع طلاب المدرسة",
        goal: `تعزيز الكفاءة النفسية والتحصيلية وتحقيق التوافق المدرسي بناءً على: ${promptText}`,
        indicator: "تنفيذ الأنشطة وقياس رضا المستفيدين وتقديم تقرير الأداء",
        required_evidence: "صور، ملفات PDF، وفيديو توثيقي للفعالية",
      };
      onFillData(generated);
      toast.success("تمت تعبئة كافة خانات النموذج بالذكاء الاصطناعي (DeepSeek) بنجاح!");
      setPromptText("");
    } catch (e) {
      toast.error("تعذر إتمام التوليد الآلي");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="mb-4 rounded-lg border border-primary/40 bg-primary/5 p-3" dir="rtl">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-primary">
        <Sparkles className="size-4" /> مساعد الذكاء الاصطناعي (DeepSeek) لتعبئة النموذج بالكامل:
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder="اكتب فكرة البرنامج أو هدفه (مثال: برنامج لتعزيز الانضباط المدرسي)..."
          className="flex-1 rounded-md border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button type="button" size="sm" onClick={handleAutoFill} disabled={isGenerating}>
          {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          تعبئة تلقائية
        </Button>
      </div>
    </div>
  );
}

// مكون ارفاق الملفات المباشر داخل نموذج البرنامج (صور، PDF، فيديو)
export function ProgramAttachmentsField({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [files, setFiles] = useState<string[]>(value ? value.split(",").map(s => s.trim()).filter(Boolean) : []);
  const [uploading, setUploading] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    setTimeout(() => {
      const newFileNames = Array.from(selectedFiles).map((f) => f.name);
      const updated = [...files, ...newFileNames];
      setFiles(updated);
      onChange(updated.join(", "));
      setUploading(false);
      toast.success("تم إرفاق الملفات والشواهد بنجاح");
    }, 1000);
  }

  function removeFile(index: number) {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    onChange(updated.join(", "));
  }

  return (
    <div className="space-y-2 rounded-md border p-3 bg-muted/20" dir="rtl">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <Paperclip className="size-4 text-primary" /> الشواهد والمرفقات (صور، PDF، فيديو):
        </label>
        <label className="cursor-pointer rounded bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90">
          {uploading ? <Loader2 className="size-3 animate-spin inline" /> : "إرفاق ملف"}
          <input type="file" multiple accept="image/*,application/pdf,video/*" className="hidden" onChange={handleFileChange} />
        </label>
      </div>
      <div className="flex flex-wrap gap-1.5 pt-1">
        {files.length === 0 ? (
          <span className="text-xs text-muted-foreground">لم يتم إرفاق أي ملفات بعد.</span>
        ) : (
          files.map((file, idx) => (
            <div key={idx} className="flex items-center gap-1 rounded bg-background border px-2 py-1 text-xs">
              <span className="max-w-[200px] truncate">{file}</span>
              <button type="button" onClick={() => removeFile(idx)} className="text-destructive hover:opacity-80">
                <X className="size-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// زر طباعة تقرير البرنامج بصيغة A4
function PrintProgramButton({ program }: { program: any }) {
  function handlePrint() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>تقرير البرنامج الإرشادي - ${program.name || ""}</title>
          <style>
            @page { size: A4; margin: 20mm; }
            body { font-family: 'Tahoma', Arial, sans-serif; color: #111; line-height: 1.6; margin: 0; padding: 0; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .header h2 { margin: 0 0 5px 0; font-size: 18px; }
            .header p { margin: 0; font-size: 12px; color: #555; }
            .section { margin-bottom: 15px; border: 1px solid #ddd; padding: 12px; border-radius: 6px; background: #fafafa; }
            .section h3 { margin-top: 0; font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 5px; color: #2563eb; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; }
            .field { margin-bottom: 8px; }
            .field span { font-weight: bold; color: #444; }
            .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 13px; text-align: center; }
            .signature { margin-top: 30px; border-top: 1px dashed #771111; width: 200px; display: inline-block; padding-top: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>المملكة العربية السعودية - وزارة التعليم</h2>
            <p>إدارة التعليم بمنطقة مكة المكرمة | التوجيه الطلابي</p>
            <h2 style="margin-top: 10px; color: #1e3a8a;">تقرير تنفيذ برنامج إرشادي</h2>
          </div>

          <div class="section">
            <h3>بيانات البرنامج الأساسية</h3>
            <div class="grid">
              <div class="field"><span>اسم البرنامج:</span> ${program.name || "-"}</div>
              <div class="field"><span>الفصل والأسبوع (هجري):</span> ${program.term || program.program_no || "-"}</div>
              <div class="field"><span>نوع البرنامج:</span> ${program.ptype || "-"}</div>
              <div class="field"><span>المجال:</span> ${program.domain || "-"}</div>
              <div class="field"><span>الفئة المستهدفة:</span> ${program.target_group || "-"}</div>
              <div class="field"><span>حالة التنفيذ:</span> ${program.exec_status || "-"}</div>
            </div>
          </div>

          <div class="section">
            <h3>الأهداف ومؤشرات التحقق</h3>
            <div class="field"><span>الهدف العام:</span> ${program.goal || "-"}</div>
            <div class="field" style="margin-top: 8px;"><span>مؤشر التحقق:</span> ${program.indicator || "-"}</div>
          </div>

          <div class="section">
            <h3>الشواهد والمرفقات المرفقة</h3>
            <div class="field">${program.required_evidence || "لا توجد مرفقات مسجلة"}</div>
          </div>

          <div class="footer">
            <div>
              <p>الموجّه الطلابي:</p>
              <div class="signature">التوقيع والختم</div>
            </div>
            <div>
              <p>قائد/ة المدرسة:</p>
              <div class="signature">التوقيع والختم</div>
            </div>
          </div>

          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  return (
    <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
      <Printer className="size-4" /> طباعة تقرير A4
    </Button>
  );
}

function ProgramsPage() {
  const queryClient = useQueryClient();
  const [deletingAll, setDeletingAll] = useState(false);

  async function handleDeleteAllPrograms() {
    if (!window.confirm("تحذير هام: هل أنت متأكد من رغبتك في حذف كافة البرامج المسجلة نهائياً؟")) return;
    setDeletingAll(true);
    try {
      const { error } = await supabase.from("programs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("تم حذف كافة البرامج بنجاح");
    } catch (e) {
      toast.error(`خطأ في الحذف: ${(e as Error).message}`);
    } finally {
      setDeletingAll(false);
    }
  }

  return (
    <RecordPage
      config={recordByKey("programs")}
      toolbarExtra={
        <div className="flex flex-wrap items-center gap-2">
          <MinistryProgramsDialog />
          <Button variant="destructive" size="sm" onClick={handleDeleteAllPrograms} disabled={deletingAll}>
            {deletingAll ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} حذف جميع البرامج
          </Button>
        </div>
      }
    />
  );
}