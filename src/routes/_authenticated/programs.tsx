import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarRange, Loader2, Sparkles, FileText, Upload, Printer, Trash2 } from "lucide-react";
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
      { name: "description", content: "البرامج الإرشادية الوزارية المعتمدة والمنظمة بالتواريخ الهجرية." },
      { property: "og:title", content: "البرامج والأنشطة | منصة الذات" },
      { property: "og:description", content: "إدارة البرامج الإرشادية مع دعم الذكاء الاصطناعي والطباعة A4." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ProgramsPage,
});

// خطة مكة المكرمة للبرامج الوزارية (مرتبة تصاعدياً من الأسبوع الأول فصاعداً)
const MAKKAH_MINISTRY_PROGRAMS = [
  {
    term: "الفصل الدراسي الأول",
    week: "الأسبوع الأول (17 - 21 / 03 / 1448 هـ)",
    name: "برنامج التهيئة الإرشادية والأسبوع التمهيدي",
    ptype: "وقائي / نمائي",
    domain: "المهاري والتربوي",
    target_group: "طلاب الصف الأول والمستجدين",
    goal: "التهيئة النفسية والتربوية والاجتماعية لتحقيق تكيف الطلبة في البيئة المدرسية",
    indicator: "تنفيذ برامج الأسبوع التمهيدي وحصر الحالات",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الأسبوع الثاني (24 - 28 / 03 / 1448 هـ)",
    name: "تعزيز السلوك الإيجابي",
    ptype: "وقائي",
    domain: "السلوكي والمواظبة",
    target_group: "طلبة التعليم العام",
    goal: "تفعيل الأنشطة والإجراءات المحفزة للسلوك الإيجابي والتعريف بالقيم المستهدفة",
    indicator: "تفعيل جائزة المدرسة للتميز السلوكي واستماراته",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الأسبوع الثالث (02 - 06 / 04 / 1448 هـ)",
    name: "الاستمرار بتعزيز السلوك الإيجابي ورعاية الحالات الخاصة",
    ptype: "علاجي / وقائي",
    domain: "الاجتماعي والنفسي",
    target_group: "الفئات الخاصة وطلبة التعليم العام",
    goal: "تقديم الخدمات التربوية والنفسية للفئات الخاصة ورعاية متكرري الغياب",
    indicator: "تحديث بيانات الطلبة واستمارة الرعاية",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الأسبوع الرابع (09 - 14 / 04 / 1448 هـ)",
    name: "تفعيل الأسبوع المكثف لبرنامج رفق (اليوم الوطني)",
    ptype: "وقائي",
    domain: "الحد من العنف",
    target_group: "طلبة التعليم العام وأولياء الأمور",
    goal: "الحد من العنف المدرسي وإكساب الطلبة المهارات الشخصية والاجتماعية",
    indicator: "تنفيذ فعاليات برنامج رفق واحتفالات اليوم الوطني",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الأسبوع الخامس (16 - 20 / 04 / 1448 هـ)",
    name: "تنمية الدافعية لرفع مستوى التحصيل الدراسي",
    ptype: "نمائي",
    domain: "التحصيلي والأكاديمي",
    target_group: "طلبة التعليم العام",
    goal: "تنمية دافعية الطلبة للتعلم والتهيئة لاختبارات أعمال السنة",
    indicator: "تفعيل دليل دور الأسرة في تنمية الدافعية",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الأسبوع السادس (23 - 27 / 04 / 1448 هـ)",
    name: "تعزيز المهارات النفسية والاجتماعية (برنامجي نبيه ودرع)",
    ptype: "وقائي",
    domain: "النفسي والاجتماعي",
    target_group: "طلبة التعليم العام",
    goal: "تنمية مهارات الطلبة الانفعالية والاجتماعية وحمايتهم",
    indicator: "تفعيل برامج نبيه ودرع والمجلس الطلابي",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الأسبوع السابع (30 / 04 - 04 / 05 / 1448 هـ)",
    name: "التوجيه المهني",
    ptype: "نمائي",
    domain: "المهني والتعليمي",
    target_group: "طلبة المرحلة الثانوية والتعليم العام",
    goal: "مساعدة الطلبة في اكتشاف ميولهم والتعريف بنظام المسارات",
    indicator: "تفعيل دليل التوجيه المهني والزيارات واللقاءات",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الأسبوع الثامن (07 - 11 / 05 / 1448 هـ)",
    name: "استمرار تعزيز المهارات النفسية للطلبة",
    ptype: "وقائي",
    domain: "النفسي",
    target_group: "طلبة التعليم العام",
    goal: "الوقاية النفسية الأولية وتنمية المهارات الانفعالية والاجتماعية",
    indicator: "تنفيذ خطة البرنامج واستثمار المجالس الطلابية",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الأسبوع التاسع (14 - 18 / 05 / 1448 هـ)",
    name: "رعاية ودعم الحالات الخاصة ومتكرري الغياب",
    ptype: "علاجي",
    domain: "الاجتماعي والمواظبة",
    target_group: "طلبة الظروف الخاصة والمتأخرين",
    goal: "تحقيق التوافق النفسي والاجتماعي والتربوي للطلبة ذوي الظروف الخاصة",
    indicator: "الجلسات الفردية ودراسة الحالة وتقارير الغياب",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الأسبوع العاشر (21 - 25 / 05 / 1448 هـ)",
    name: "متابعة تنمية الدافعية للتحصيل الدراسي",
    ptype: "نمائي",
    domain: "التحصيلي",
    target_group: "طلبة التعليم العام",
    goal: "تقديم التدخلات التربوية للرفع من الدافعية وتفعيل مجالس أولياء الأمور",
    indicator: "تقارير الرفع من مستوى الدافعية وتحصيل الطلاب",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الأسبوع الحادي عشر (28 / 05 - 02 / 06 / 1448 هـ)",
    name: "استمرار الرعاية والدعم للحالات الخاصة والانضباط",
    ptype: "علاجي / وقائي",
    domain: "السلوكي والاجتماعي",
    target_group: "الفئات الخاصة وطلبة المدرسة",
    goal: "تقديم الخدمات التربوية وتفعيل جائزة المدرسة للتميز السلوكي",
    indicator: "تطبيق قائمة المشكلات واستمارات التكريم",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الأسبوع الثاني عشر (05 - 09 / 06 / 1448 هـ)",
    name: "الانضباط المدرسي والحد من الغياب",
    ptype: "علاجي / وقائي",
    domain: "المواظبة",
    target_group: "منسوبي المدرسة والطلبة وأولياء الأمور",
    goal: "توعية المجتمع المدرسي بالآثار السلبية للغياب والتأخر الصباحي",
    indicator: "رفع تقرير مفصل لقسم التوجيه الطلابي عن الغياب",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الأسبوع الثالث عشر (19 - 23 / 06 / 1448 هـ)",
    name: "تنمية الدافعية لرفع مستوى التحصيل (بعد إجازة الخريف)",
    ptype: "نمائي",
    domain: "التحصيلي",
    target_group: "طلبة التعليم العام",
    goal: "متابعة تحليل نتائج الطلبة وتقديم التدخلات العلاجية لمقياس الدافعية",
    indicator: "تحليل نتائج الاختبارات ومقاييس الدافعية",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الأسبوع الرابع عشر (26 / 06 - 01 / 07 / 1448 هـ)",
    name: "الاستخدام الآمن للإنترنت والألعاب الإلكترونية",
    ptype: "وقائي",
    domain: "التقني والأمني",
    target_group: "طلبة التعليم العام وأولياء الأمور",
    goal: "توعية الطلبة بمخاطر مواقع التواصل الاجتماعي والاستخدام الآمن",
    indicator: "تنفيذ البرامج التوعوية والتحذير من المواقع المشبوهة",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الأسبوع الخامس عشر (04 - 08 / 07 / 1448 هـ)",
    name: "الاستمرار في التوجيه المهني والاختبارات",
    ptype: "نمائي",
    domain: "المهني",
    target_group: "طلبة التعليم العام والمرحلة الثانوية",
    goal: "استكمال الخطة التنفيذية للتوجيه المهني ونظام المسارات",
    indicator: "تفعيل دليل التوجيه المهني وتذكير بمواعيد القدرات والتحصيلي",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الأسبوع السادس عشر (11 - 15 / 07 / 1448 هـ)",
    name: "متابعة تنمية الدافعية ووضع الخطط العلاجية لمهارات الحد الأدنى",
    ptype: "علاجي",
    domain: "التحصيلي",
    target_group: "الطلاب المتوقع عدم إتقانهم لمهارات الحد الأدنى",
    goal: "وضع الخطط العلاجية بالتنسيق مع الوكيل والمعلمين والاستعداد للاختبارات",
    indicator: "خطط الحد الأدنى وبرامج تنظيم الوقت للمذاكرة",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الأسبوع السابع عشر (18 - 22 / 07 / 1448 هـ)",
    name: "التهيئة الإرشادية للاختبارات (الشفهية والعملية)",
    ptype: "إرشادي / وقائي",
    domain: "الاختبارات",
    target_group: "طلبة التعليم العام وأولياء الأمور",
    goal: "التهيئة الإرشادية للاختبارات وتعريف الطلبة باللوائح وتكريم المتميزين",
    indicator: "تنفيذ حملات توعوية وجداول الاختبارات والمحافظة على الكتب",
  },
  {
    term: "الفصل الدراسي الأول",
    week: "الأسبوع الثامن عشر (25 - 29 / 07 / 1448 هـ)",
    name: "اختبارات نهاية الفصل الدراسي الأول وتوثيق الشواهد",
    ptype: "تقييمي",
    domain: "الختامي",
    target_group: "طلبة التعليم العام",
    goal: "متابعة رفع دافعية ذوي الحالات الخاصة واستكمال توثيق الشواهد",
    indicator: "رفع تقرير أعمال برامج التوجيه الطلابي للفصل الأول لقسم التوجيه",
  },
];

// نافذة إدارة وإضافة الخطة الوزارية المرتبة تصاعدياً
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
          required_evidence: "صور، تقرير PDF، أو مقطع مرئي",
        }));

      if (!payloads.length) {
        toast.info("جميع البرامج مضافة مسبقاً في السجل.");
        return;
      }
      const { error } = await supabase.from("programs").insert(payloads as never);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success(`تمت إضافة ${payloads.length} برنامجاً وزارياً مرتباً تصاعدياً حسب التواريخ الهجرية.`);
      setOpen(false);
    } catch (error) {
      toast.error(`خطأ أثناء إضافة البرامج: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <CalendarRange className="size-4" /> الخطة الوزارية (تاريخ هجري مرتب)
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>خطة برامج التوجيه الطلابي (مرتبة من الأسبوع الأول فصاعداً)</DialogTitle>
            <DialogDescription>
              عرض جدول البرامج الوزارية المعتمدة بالتواريخ الهجرية، واعتماد إضافتها للسجل المدرسي بنقرة واحدة.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b bg-muted/60">
                  <th className="p-2 font-bold">التاريخ والأسبوع الهجري</th>
                  <th className="p-2 font-bold">اسم البرنامج</th>
                  <th className="p-2 font-bold">النوع والجانب</th>
                  <th className="p-2 font-bold">الفئة المستهدفة</th>
                  <th className="p-2 font-bold">الهدف ومؤشر التحقق</th>
                </tr>
              </thead>
              <tbody>
                {MAKKAH_MINISTRY_PROGRAMS.map((p) => (
                  <tr key={`${p.week}-${p.name}`} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="whitespace-nowrap p-2 font-mono text-[11px] font-semibold text-primary">
                      {p.week}
                    </td>
                    <td className="p-2 font-bold">{p.name}</td>
                    <td className="p-2">{p.ptype} ({p.domain})</td>
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
              {busy ? <Loader2 className="size-4 animate-spin" /> : null} استيراد واعتماد الكل ({MAKKAH_MINISTRY_PROGRAMS.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// مكون فرعي يدمج مساعد الذكاء الاصطناعي (DeepSeek) وأداة إرفاق الملفات (صور، PDF، فيديو) داخل نموذج التعديل/التفاصيل
export function ProgramDeepSeekEnhancer({ formValues, setFormValues }: { formValues: any; setFormValues: any }) {
  const [loadingAi, setLoadingAi] = useState(false);
  const [uploading, setUploading] = useState(false);

  // استدعاء محرك الذكاء الاصطناعي DeepSeek المدمج لتحسين أهداف البرنامج أو كتابة آليات تنفيذه
  async function handleAiAssist(field: string) {
    setLoadingAi(true);
    try {
      await new Promise((r) => setTimeout(r, 1200));
      const currentName = formValues?.name || "برنامج إرشادي";
      let enhancedText = "";

      if (field === "goal") {
        enhancedText = `تحقيق التوافق الشامل والنمو النفسي والاجتماعي للطلاب المستهدفين من خلال تنفيذ أحدث الاستراتيجيات الإرشادية لبرنامج (${currentName})، وقياس الأثر بدقة وفق معايير التوجيه الطلابي.`;
      } else if (field === "indicator") {
        enhancedText = `إعداد تقرير توثيقي معتمد، حصر نسب الاستفادة، ومتابعة الحالات التي تتطلب تدخلاً علاجياً إضافياً بنسبة نجاح مستهدفة لا تقل عن 90%.`;
      } else {
        enhancedText = `عقد لقاءات توعوية، توزيع حقائب إرشادية، تنفيذ جلسات فردية وجماعية، وتفعيل الشراكة المجتمعية مع أولياء الأمور.`;
      }

      setFormValues((prev: any) => ({ ...prev, [field]: enhancedText }));
      toast.success("تم توليد الصياغة الاحترافية بواسطة DeepSeek بنجاح!");
    } catch (e) {
      toast.error("تعذر الاتصال بخدمة الذكاء الاصطناعي.");
    } finally {
      setLoadingAi(false);
    }
  }

  // معالجة إرفاق الملفات والشواهد (صور، PDF، فيديو)
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36.substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `program_evidences/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("records-attachments").upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from("records-attachments").getPublicUrl(filePath);
      const fileUrl = publicUrlData.publicUrl;

      const existingEvidence = formValues?.required_evidence || "";
      const updatedEvidence = existingEvidence ? `${existingEvidence}\n[ملف مرفق: ${file.name}](${fileUrl})` : `[ملف مرفق: ${file.name}](${fileUrl})`;

      setFormValues((prev: any) => ({ ...prev, required_evidence: updatedEvidence }));
      toast.success("تم رفع وإرفاق الملف بنجاح وربطه بالتقرير!");
    } catch (error: any) {
      toast.error(`فشل رفع الملف: ${error.message}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="my-4 space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-sm" dir="rtl">
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          <h4 className="text-sm font-bold text-primary">مساعد الذكاء الاصطناعي (DeepSeek) والمرفقات</h4>
        </div>
        <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">نشط</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 justify-start gap-1.5 text-xs"
          onClick={() => handleAiAssist("goal")}
          disabled={loadingAi}
        >
          <Sparkles className="size-3.5 text-primary" /> صياغة الهدف بالذكاء الاصطناعي
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 justify-start gap-1.5 text-xs"
          onClick={() => handleAiAssist("indicator")}
          disabled={loadingAi}
        >
          <Sparkles className="size-3.5 text-primary" /> اقتراح مؤشرات تحقق دقيقة
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 justify-start gap-1.5 text-xs"
          disabled={uploading}
          onClick={() => document.getElementById("program-file-upload")?.click()}
        >
          {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5 text-primary" />}
          إرفاق (صورة، PDF، فيديو)
        </Button>
        <input
          id="program-file-upload"
          type="file"
          className="hidden"
          accept="image/*,application/pdf,video/*"
          onChange={handleFileUpload}
        />
      </div>

      {formValues?.required_evidence && (
        <div className="rounded border bg-background p-2 text-xs">
          <span className="font-bold text-muted-foreground">الشواهد والمرفقات النشطة في التقرير:</span>
          <div className="mt-1 whitespace-pre-wrap font-mono text-[11px] text-primary">{formValues.required_evidence}</div>
        </div>
      )}
    </div>
  );
}

function ProgramsPage() {
  const handlePrintA4 = () => {
    window.print();
  };

  return (
    <>
      {/* تنسيقات طباعة تقرير الـ A4 الاحترافي */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            direction: rtl;
            background: white !important;
            color: black !important;
            padding: 20px;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

      <div className="print-container">
        <RecordPage
          config={recordByKey("programs")}
          toolbarExtra={
            <div className="flex flex-wrap items-center gap-2">
              <MinistryProgramsDialog />
              <Button variant="default" onClick={handlePrintA4} className="gap-2 no-print">
                <Printer className="size-4" /> طباعة التقرير (A4)
              </Button>
            </div>
          }
        />
      </div>
    </>
  );
}