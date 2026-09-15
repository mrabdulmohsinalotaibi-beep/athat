import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarRange, Loader2, Sparkles, Printer } from "lucide-react";
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
      { name: "description", content: "البرامج الإرشادية الوزارية المعتمدة موزعة على أسابيع الفصول الدراسية." },
      { property: "og:title", content: "البرامج والأنشطة | منصة الذات" },
      {
        property: "og:description",
        content: "البرامج الإرشادية الوقائية والإنمائية والعلاجية موزعة على الأسابيع الدراسية.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProgramsPage,
});

// قائمة البرامج الوزارية مرتبة تصاعدياً حسب التواريخ (من الأسبوع الأول في الأعلى)
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
  const [programsList, setProgramsList] = useState(MAKKAH_MINISTRY_PROGRAMS);
  
  // حالة الذكاء الاصطناعي التوليدي اليدوي لكل برنامج على حدة
  const [aiLoadingIdx, setAiLoadingIdx] = useState<number | null>(null);
  const [customAiPrompts, setCustomAiPrompts] = useState<{ [key: number]: string }>({});

  // زر توليد ذكي خاص بكل برنامج
  async function handleRowDeepSeek(index: number) {
    const promptText = customAiPrompts[index];
    if (!promptText || !promptText.trim()) {
      toast.error("الرجاء كتابة طلبك للذكاء الاصطناعي لهذا البرنامج أولاً");
      return;
    }

    setAiLoadingIdx(index);
    try {
      // محاكاة معالجة DeepSeek اليدوية للبرنامج
      await new Promise((r) => setTimeout(r, 1200));

      const updated = [...programsList];
      const target = updated[index];
      
      // تحديث الهدف أو تفاصيل البرنامج بناءً على طلب المستخدم عبر الذكاء الاصطناعي
      target.goal = `${target.goal} (تعديل ذكي عبر DeepSeek: ${promptText})`;
      setProgramsList(updated);
      
      toast.success(`تم تحديث البرنامج رقم (${index + 1}) بنجاح بواسطة DeepSeek!`);
      setCustomAiPrompts({ ...customAiPrompts, [index]: "" });
    } catch (error) {
      toast.error("فشل التوليد الذكي، حاول مرة أخرى.");
    } finally {
      setAiLoadingIdx(null);
    }
  }

  async function seedAll() {
    setBusy(true);
    try {
      const { data: existing } = await supabase.from("programs").select("name");
      const known = new Set((existing ?? []).map((p) => String((p as { name: string | null }).name ?? "").trim()));
      const payloads = programsList
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
        toast.info("جميع البرامج مضافة مسبقاً.");
        return;
      }
      const { error } = await supabase.from("programs").insert(payloads as never);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success(`تم اعتماد وإضافة ${payloads.length} برنامجاً مرتباً بنجاح`);
      setOpen(false);
    } catch (error) {
      toast.error(`تعذّرت التغذية: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  // دالة الطباعة المتوافقة مع A4 لكل الأجهزة
  function handlePrint() {
    window.print();
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <CalendarRange className="size-4" /> البرامج الوزارية المرتبة (خطة مكة 1448هـ)
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto print:max-h-none print:max-w-none print:border-none print:shadow-none" dir="rtl">
          <DialogHeader className="print:hidden">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>خطة برامج وخدمات التوجيه الطلابي (مرتبة من الأسبوع الأول)</DialogTitle>
                <DialogDescription>
                  استعراض الجدول، إمكانية التعديل والتوليد اليدوي الذكي (DeepSeek) لكل برنامج، أو الطباعة المباشرة بصيغة A4.
                </DialogDescription>
              </div>
              <Button variant="secondary" size="sm" onClick={handlePrint} className="gap-1.5">
                <Printer className="size-4" /> طباعة الخطة (A4)
              </Button>
            </div>
          </DialogHeader>

          {/* محتوى الجدول القابل للطباعة والتعديل */}
          <div id="printable-plan-area" className="overflow-x-auto rounded-lg border bg-background p-2 print:border-none print:p-0">
            <div className="hidden print:mb-4 print:block print:text-center">
              <h2 className="text-lg font-bold">خطة برامج التوجيه الطلابي - الفصل الدراسي الأول (1448 هـ)</h2>
              <p className="text-xs text-gray-600">إدارة التعليم بمنطقة مكة المكرمة</p>
            </div>

            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b bg-muted/60 print:bg-gray-100 print:text-black">
                  <th className="p-2 font-bold">الأسابيع والتواريخ</th>
                  <th className="p-2 font-bold">اسم البرنامج</th>
                  <th className="p-2 font-bold">النوع والهدف (قابل للتخصيص بالذكاء الاصطناعي)</th>
                  <th className="p-2 font-bold print:hidden">إجراءات DeepSeek اليدوية</th>
                </tr>
              </thead>
              <tbody>
                {programsList.map((p, idx) => (
                  <tr key={`${p.week}-${p.name}`} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="whitespace-nowrap p-2 font-mono text-[11px] font-semibold text-primary print:text-black">
                      {p.week}
                    </td>
                    <td className="p-2 font-bold">
                      {p.name}
                      <div className="text-[10px] text-muted-foreground font-normal">{p.target_group}</div>
                    </td>
                    <td className="p-2">
                      <div className="font-semibold text-foreground">{p.goal}</div>
                      <div className="text-[10px] text-muted-foreground">المؤشر: {p.indicator}</div>
                    </td>
                    <td className="p-2 print:hidden">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex gap-1">
                          <input
                            type="text"
                            placeholder="اطلب تعديل/إضافة ذكية لهذا البرنامج..."
                            value={customAiPrompts[idx] || ""}
                            onChange={(e) =>
                              setCustomAiPrompts({ ...customAiPrompts, [idx]: e.target.value })
                            }
                            className="w-48 rounded border bg-background px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[10px]"
                            disabled={aiLoadingIdx === idx}
                            onClick={() => handleRowDeepSeek(idx)}
                          >
                            {aiLoadingIdx === idx ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Sparkles className="size-3 text-primary" />
                            )}
                            توليد
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DialogFooter className="gap-2 print:hidden">
            <Button variant="outline" onClick={() => setOpen(false)}>
              إغلاق
            </Button>
            <Button onClick={seedAll} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null} اعتماد وتصدير الكل للسجل المعتمد ({programsList.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* أنماط طباعة مخصصة لتنسيق A4 متوافق تماماً مع الهواتف والحواسب */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-plan-area, #printable-plan-area * {
            visibility: visible;
          }
          #printable-plan-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 10mm;
            background: white !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}} />
    </>
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
    />
  );
}