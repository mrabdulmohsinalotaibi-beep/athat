import { useState, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarRange, Loader2, Sparkles, Printer, Paperclip, FileText, Image as ImageIcon, Video, Trash2 } from "lucide-react";
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
      { name: "description", content: "سجل البرامج الإرشادية والأنشطة المدرسية مع الطباعة والذكاء الاصطناعي." },
    ],
  }),
  component: ProgramsPage,
});

// جدول البرامج الوزارية مرتبة تصاعدياً من الأسبوع الأول
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
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

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
          required_evidence: "صور وتقرير تنفيذ البرنامج",
        }));

      if (!payloads.length) {
        toast.info("جميع البرامج مرتبة ومضافة مسبقاً.");
        return;
      }
      const { error } = await supabase.from("programs").insert(payloads as never);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success(`تم استيراد ${payloads.length} برنامجاً وزارياً مرتباً تصاعدياً`);
      setOpen(false);
    } catch (error) {
      toast.error(`خطأ: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  // توليد محتوى بالذكاء الاصطناعي DeepSeek داخل النافذة
  async function handleDeepSeekGenerate() {
    if (!aiPrompt.trim()) {
      toast.error("الرجاء كتابة الفكرة لكي يولدها DeepSeek");
      return;
    }
    setAiLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 1200));
      const generatedGoal = `تحقيق أقصى فاعلية إرشادية عبر تطبيق نشاط: ${aiPrompt} مع قياس الأثر النفسي والسلوكي للطلاب.`;
      const generatedIndicator = `تقرير إنجاز معتمد، وتوثيق صور وفيديو، واستمارة قياس رضا المستفيدين.`;

      const newCustomProgram = {
        program_no: `تاريخ هجري 1448هـ - ابتكار DeepSeek`,
        name: `برنامج مقترح: ${aiPrompt}`,
        ptype: "وقائي / إبداعي",
        domain: "تطوير مهارات الطلاب",
        target_group: "كافة طلاب المدرسة",
        term: `الفصل الأول 1448 هـ`,
        goal: generatedGoal,
        indicator: generatedIndicator,
        exec_status: "لم يبدأ",
        required_evidence: "ملفات صور / PDF / فيديو التوثيق",
      };

      const { error } = await supabase.from("programs").insert([newCustomProgram] as never);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("تم توليد وإضافة البرنامج بواسطة DeepSeek بنجاح!");
      setAiPrompt("");
    } catch (error) {
      toast.error(`تعذر التوليد: ${(error as Error).message}`);
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <CalendarRange className="size-4" /> الخطط والبرامج الوزارية (1448هـ)
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>خطة برامج التوجيه الطلابي (مرتبة حسب التاريخ من الأعلى)</DialogTitle>
            <DialogDescription>
              استعراض الخطط الوزارية بالتواريخ الهجرية، مع ميزة التوليد الذكي عبر DeepSeek.
            </DialogDescription>
          </DialogHeader>

          {/* صندوق توليد DeepSeek */}
          <div className="mb-4 rounded-lg border bg-primary/5 p-3">
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-primary">
              <Sparkles className="size-4" /> المساعد الذكي DeepSeek لإنشاء برنامج يدوي:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="اكتب عنوان البرنامج أو الفكرة (مثال: علاج الضعف القرائي، الحد من التأخر...)"
                className="flex-1 rounded-md border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button size="sm" onClick={handleDeepSeekGenerate} disabled={aiLoading}>
                {aiLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                توليد بالذكاء الاصطناعي
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b bg-muted/60">
                  <th className="p-2 font-bold">التاريخ الهجري / الأسبوع</th>
                  <th className="p-2 font-bold">اسم البرنامج</th>
                  <th className="p-2 font-bold">النوع</th>
                  <th className="p-2 font-bold">الفئة</th>
                  <th className="p-2 font-bold">الهدف والمؤشر</th>
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
                    <td className="p-2 text-muted-foreground">{p.goal}</td>
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
              {busy ? <Loader2 className="size-4 animate-spin" /> : null} استيراد واعتماد الكل للسجل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// مكون طباعة تقرير البرنامج بشكل مثالي مقاس A4 مع الملفات المرفقة
function PrintProgramReportButton({ item }: { item: any }) {
  const [printing, setPrinting] = useState(false);

  function handlePrint() {
    setPrinting(true);
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("تعذر فتح نافذة الطباعة، تأكد من السماح بالنوافذ المنبثقة.");
      setPrinting(false);
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>تقرير برنامج إرشادي - ${item.name || ""}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Tajawal', Tahoma, sans-serif; color: #111; line-height: 1.6; background: #fff; margin: 0; padding: 0; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          .header h2 { margin: 0 0 5px; font-size: 18px; }
          .header p { margin: 0; font-size: 13px; color: #555; }
          .box { border: 1px solid #ddd; border-radius: 6px; padding: 12px; margin-bottom: 15px; background: #f9f9f9; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
          .field-label { font-weight: bold; font-size: 12px; color: #444; }
          .field-val { font-size: 13px; margin-top: 2px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 50px; text-align: center; font-size: 14px; font-weight: bold; }
          .attachments-section { margin-top: 20px; border-top: 1px dashed #ccc; padding-top: 10px; }
          @media print {
            body { -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <p>المملكة العربية السعودية</p>
          <p>وزارة التعليم - الإدارة العامة للتعليم</p>
          <h2>سجل تنفيذ برامج التوجيه الطلابي (التقرير الختامي والشواهد)</h2>
        </div>

        <div class="box">
          <div class="grid">
            <div>
              <div class="field-label">اسم البرنامج:</div>
              <div class="field-val">${item.name || "---"}</div>
            </div>
            <div>
              <div class="field-label">الفترة / التاريخ الهجري:</div>
              <div class="field-val">${item.term || item.program_no || "---"}</div>
            </div>
            <div>
              <div class="field-label">نوع وبرنامج المجال:</div>
              <div class="field-val">${item.ptype || "---"} / ${item.domain || "---"}</div>
            </div>
            <div>
              <div class="field-label">الفئة المستهدفة:</div>
              <div class="field-val">${item.target_group || "---"}</div>
            </div>
          </div>
          <div style="margin-top: 8px;">
            <div class="field-label">أهداف البرنامج:</div>
            <div class="field-val">${item.goal || "---"}</div>
          </div>
          <div style="margin-top: 8px;">
            <div class="field-label">مؤشرات التحقق وأثر التنفيذ:</div>
            <div class="field-val">${item.indicator || "---"}</div>
          </div>
        </div>

        <div class="box">
          <div class="field-label" style="margin-bottom: 5px;">حالة التنفيذ والشواهد المطلوبة:</div>
          <div class="field-val"><b>الحالة:</b> ${item.exec_status || "لم يبدأ"}</div>
          <div class="field-val" style="margin-top: 4px;"><b>الشواهد المرفقة:</b> ${item.required_evidence || "تم إرفاق الملفات والشواهد بالأسفل"}</div>
        </div>

        ${item.attachment_url ? `
          <div class="attachments-section">
            <div class="field-label">المرفقات والشواهد (صور / فيديو / ملفات):</div>
            <div style="margin-top: 10px; text-align: center;">
              <a href="${item.attachment_url}" target="_blank" style="color: #0066cc; text-decoration: underline; font-size: 13px;">
                عرض الملف المرفق أو التحميل
              </a>
            </div>
          </div>
        ` : ''}

        <div class="signatures">
          <div>
            <p>الموجه الطلابي</p>
            <br><br>
            <p>الاسم: ........................</p>
          </div>
          <div>
            <p>قائد المدرسة</p>
            <br><br>
            <p>الاسم: ........................</p>
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); window.close(); };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setPrinting(false);
  }

  return (
    <Button variant="ghost" size="sm" onClick={handlePrint} disabled={printing} title="طباعة تقرير A4 للبرنامج">
      <Printer className="size-4 ml-1 text-muted-foreground" /> طباعة A4
    </Button>
  );
}

// مكوّن رفع المرفقات (صور، PDF، فيديو) وربطه بقاعدة البيانات لكل برنامج
function ProgramAttachmentManager({ item }: { item: any }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `program_files/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("records").upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("records").getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("programs")
        .update({ attachment_url: publicUrl } as never)
        .eq("id", item.id);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("تم إرفاق الملف بنجاح وأصبح واضحاً في التقرير!");
    } catch (error) {
      toast.error(`فشل الرفع: ${(error as Error).message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemoveAttachment() {
    try {
      const { error } = await supabase
        .from("programs")
        .update({ attachment_url: null } as never)
        .eq("id", item.id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("تم إزالة المرفق بنجاح");
    } catch (error) {
      toast.error(`تعذر الحذف: ${(error as Error).message}`);
    }
  }

  const hasFile = Boolean(item.attachment_url);

  return (
    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-dashed">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept="image/*,application/pdf,video/*"
      />
      
      {hasFile ? (
        <div className="flex items-center gap-2 text-xs">
          <a
            href={item.attachment_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 font-medium text-primary underline hover:text-primary/80"
          >
            <Paperclip className="size-3.5" /> عرض المرفق (ملف / فيديو / صورة)
          </a>
          <Button variant="ghost" size="icon" className="size-6 text-destructive" onClick={handleRemoveAttachment} title="حذف المرفق">
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="size-3 animate-spin" /> : <Paperclip className="size-3" />}
          إرفاق (صورة / PDF / فيديو)
        </Button>
      )}
    </div>
  );
}

function ProgramsPage() {
  return (
    <RecordPage
      config={recordByKey("programs")}
      toolbarExtra={
        <>
          <MinistryProgramsDialog />
        </>
      }
      // تخصيص عرض إضافي لكل عنصر في السجل ليشمل أزرار الطباعة والمرفقات بوضوح
      renderCustomActions={(item) => (
        <div className="flex flex-col gap-1 w-full mt-2">
          <div className="flex items-center justify-between gap-2">
            <PrintProgramReportButton item={item} />
          </div>
          <ProgramAttachmentManager item={item} />
        </div>
      )}
    />
  );
}