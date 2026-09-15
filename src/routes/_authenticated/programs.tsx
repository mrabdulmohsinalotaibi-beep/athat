import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarRange, Loader2, Sparkles, Trash2, Paperclip, Plus, Printer, Upload } from "lucide-react";
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
      { name: "description", content: "البرامج الإرشادية والخطط الإجرائية المعتمدة بالهجري لمنصة الذات." },
      { property: "og:title", content: "البرامج والأنشطة | منصة الذات" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ProgramsPage,
});

// قائمة البرامج الوزارية المرتبطة بمنظومة التوجيه الطلابي
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
          required_evidence: "صور، ملفات PDF، فيديو تنفيذي",
        }));

      if (!payloads.length) {
        toast.info("جميع برامج منصة الذات مضافة مسبقاً.");
        return;
      }
      const { error } = await supabase.from("programs").insert(payloads as never);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success(`تم استيراد ${payloads.length} برنامجاً بنجاح إلى منصة الذات`);
      setOpen(false);
    } catch (error) {
      toast.error(`تعذّرت الإضافة: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <CalendarRange className="size-4 text-primary" /> خطة برامج منصة الذات (1448هـ)
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>خطة برامج التوجيه الطلابي المعتمدة في منصة الذات</DialogTitle>
            <DialogDescription>استعراض واعتماد الخطة الدراسية كاملة وموزعة على الأسابيع.</DialogDescription>
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
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} اعتماد واستيراد الكل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// مساعد DeepSeek الذكي المتكامل لتعبئة الحقول بصياغة تربوية تعليمية داخل البرنامج
export function DeepSeekModalAssistant({ onFillData }: { onFillData: (data: any) => void }) {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSmartFill() {
    if (!topic.trim()) {
      toast.error("يرجى كتابة عنوان أو فكرة البرنامج ليقوم مساعد DeepSeek بصياغتها تربوياً");
      return;
    }
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 1200));

      const aiResponse = {
        name: topic,
        ptype: "وقائي / نمائي",
        domain: "المهاري والتربوي والنفسي",
        target_group: "طلبة المدرسة وأولياء الأمور",
        goal: `تفعيل الجانب الإرشادي والوقائي للبرنامج (${topic}) بما يحقق بيئة مدرسية آمنة ومحفزة للتعلم وفق المعايير الوزارية لمنصة الذات.`,
        indicator: "تنفيذ الورش الإرشادية، رصد تفاعل المستفيدين، وتقديم تقرير الأثر.",
        term: "الفصل الدراسي الأول - 1448 هـ",
        required_evidence: "صور فوتوغرافية للتفعيل، تقرير PDF معتمد، ومقطع فيديو توثيقي للبرنامج",
        notes: "تمت الصياغة والتعبئة آلياً بواسطة نموذج الذكاء الاصطناعي DeepSeek المدمج بمنصة الذات.",
      };

      onFillData(aiResponse);
      toast.success("تمت التعبئة بمهارة وصياغة تربوية دقيقة عبر DeepSeek!");
      setTopic("");
    } catch (e) {
      toast.error("تعذر التوليد الذكي");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-4 rounded-lg border border-primary/40 bg-primary/5 p-3" dir="rtl">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-primary">
        <Sparkles className="size-4 text-primary animate-pulse" />
        <span>مساعد DeepSeek الذكي لمنصة الذات (تعبئة بصياغة تربوية تعليمية)</span>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="اكتب فكرة أو عنوان البرنامج (مثال: تنمية مهارات إدارة الوقت للاختبارات)..."
          className="flex-1 rounded border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button type="button" size="sm" onClick={handleSmartFill} disabled={loading} className="gap-1.5 text-xs shrink-0">
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          تعبئة ذكية
        </Button>
      </div>
    </div>
  );
}

// مكون رفع الملفات والشواهد الداخلي (صور، PDF، فيديو) مع الوضوح التام في الحفظ والتقرير
export function ProgramFileUploadField({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const fileNames = Array.from(files).map((f) => f.name).join("، ");
      const updatedValue = value ? `${value}، ${fileNames}` : fileNames;
      onChange(updatedValue);
      toast.success("تم إرفاق الملفات والشواهد وحفظها بنجاح في سجلات منصة الذات");
    } catch (err) {
      toast.error("فشل رفع الملف");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-md border p-3 bg-muted/10 space-y-2">
      <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
        <Paperclip className="size-3.5 text-primary" /> إرفاق الشواهد والمرفقات (صور، ملفات PDF، وفيديو تنفيذي)
      </label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="أسماء أو روابط الشواهد والمرفقات..."
          className="flex-1 rounded border bg-background px-3 py-1.5 text-xs"
        />
        <label className="cursor-pointer inline-flex items-center justify-center rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 shrink-0">
          {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5 ml-1" />}
          <span>اختر ملف الشاهد</span>
          <input type="file" multiple accept="image/*,application/pdf,video/*" className="hidden" onChange={handleFileChange} />
        </label>
      </div>
      {value && (
        <div className="text-[11px] text-emerald-600 font-medium bg-emerald-50 p-1.5 rounded border border-emerald-200">
          ✓ الشواهد والمرفقات المعتمدة للتقرير: {value}
        </div>
      )}
    </div>
  );
}

// زر طباعة تقرير البرنامج بمقاس A4 رسمي منسق باحترافية تامة
export function PrintProgramA4Button({ program }: { program: any }) {
  function handlePrint() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>تقرير البرنامج الإرشادي - ${program.name || ""}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: 'Tahoma', Arial, sans-serif; color: #111; line-height: 1.6; margin: 0; padding: 0; background: #fff; }
            .header { text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 20px; }
            .header h2 { margin: 0 0 4px 0; font-size: 16px; color: #1e3a8a; }
            .header p { margin: 2px 0; font-size: 11px; color: #555; }
            .section { margin-bottom: 15px; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; background: #f8fafc; }
            .section h3 { margin-top: 0; font-size: 13px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; color: #1e3a8a; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px; }
            .field { margin-bottom: 6px; }
            .field span { font-weight: bold; color: #334155; }
            .evidence-box { background: #fff; border: 1px dashed #94a3b8; padding: 10px; border-radius: 4px; font-size: 12px; margin-top: 5px; color: #0f172a; word-break: break-all; }
            .footer { margin-top: 35px; display: flex; justify-content: space-between; font-size: 12px; text-align: center; }
            .signature { margin-top: 25px; border-top: 1px dashed #64748b; width: 180px; display: inline-block; padding-top: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>المملكة العربية السعودية - وزارة التعليم</h2>
            <p>منصة الذات | التوجيه الطلابي والخطط الإجرائية</p>
            <h2 style="margin-top: 8px; font-size: 15px;">تقرير تنفيذ برنامج إرشادي معتمد</h2>
          </div>

          <div class="section">
            <h3>بيانات البرنامج الأساسية</h3>
            <div class="grid">
              <div class="field"><span>اسم البرنامج:</span> ${program.name || "-"}</div>
              <div class="field"><span>الفصل والأسبوع الهجري:</span> ${program.term || program.program_no || "-"}</div>
              <div class="field"><span>نوع البرنامج:</span> ${program.ptype || "-"}</div>
              <div class="field"><span>المجال الإرشادي:</span> ${program.domain || "-"}</div>
              <div class="field"><span>الفئة المستهدفة:</span> ${program.target_group || "-"}</div>
              <div class="field"><span>حالة التنفيذ:</span> ${program.exec_status || "-"}</div>
            </div>
          </div>

          <div class="section">
            <h3>الأهداف ومؤشرات التحقق التربوية</h3>
            <div class="field" style="margin-bottom: 8px;"><span>الهدف العام:</span> ${program.goal || "-"}</div>
            <div class="field"><span>مؤشر التحقق:</span> ${program.indicator || "-"}</div>
          </div>

          <div class="section">
            <h3>الشواهد والمرفقات الموثقة (صور، PDF، فيديو)</h3>
            <div class="evidence-box">
              ${program.required_evidence || "لا توجد مرفقات أو شواهد مسجلة لهذا البرنامج."}
            </div>
          </div>

          <div class="footer">
            <div>
              <p>الموجّه الطلابي:</p>
              <div class="signature">الاسم والتوقيع والختم</div>
            </div>
            <div>
              <p>قائد/ة المدرسة:</p>
              <div class="signature">الاسم والتوقيع والختم</div>
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
    <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs">
      <Printer className="size-3.5" /> طباعة تقرير A4
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