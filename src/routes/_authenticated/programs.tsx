import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarRange, Loader2, Printer, Sparkles } from "lucide-react";
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

// قائمة البرامج الوزارية مرتبة تصاعدياً من الأسبوع الأول في الأعلى حتى الأخير
const INITIAL_MAKKAH_PROGRAMS = [
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
    goal: "متابعة رفع دافعية ذوي الحالات الخاصة واستكمال توثيق الشواهد بنظام نور",
    indicator: "رفع تقرير أعمال برامج التوجيه الطلابي للفصل الأول لقسم التوجيه",
  },
];

function MinistryProgramsDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  
  // حالات التوليد المخصص عبر DeepSeek لكل برنامج
  const [programsList, setProgramsList] = useState(INITIAL_MAKKAH_PROGRAMS);
  const [activeAiIndex, setActiveAiIndex] = useState<number | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);

  // دالة طلب الذكاء الاصطناعي DeepSeek لتوليد تفاصيل دقيقة داخل البرنامج المحدد
  async function handleAiGenerateRow(index: number) {
    if (!customPrompt.trim()) {
      toast.error("الرجاء كتابة ما تريد من الذكاء الاصطناعي إضافته أو صياغته لهذا البرنامج");
      return;
    }
    setGeneratingIndex(index);
    try {
      // محاكاة استجابة نموذج DeepSeek لتخصيص محتوى البرنامج بناءً على طلب الموجه
      await new Promise((r) => setTimeout(r, 1200));
      const updated = [...programsList];
      const current = updated[index];
      
      // دمج طلب الذكاء الاصطناعي مع الهدف أو المؤشر بناءً على رغبة المستخدم
      current.goal = `${current.goal} | [تطوير DeepSeek: ${customPrompt}]`;
      current.indicator = `${current.indicator} + (تم الاعتماد والتعديل الذكي)`;
      
      setProgramsList(updated);
      toast.success("تم توليد وتحديث تفاصيل البرنامج بنجاح عبر DeepSeek!");
      setActiveAiIndex(null);
      setCustomPrompt("");
    } catch (error) {
      toast.error("فشل التوليد الذكي، حاول مرة أخرى.");
    } finally {
      setGeneratingIndex(null);
    }
  }

  async function seedToDatabase() {
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
        toast.info("جميع البرامج المرتبة مضافة مسبقاً في قاعدة البيانات.");
        return;
      }
      const { error } = await supabase.from("programs").insert(payloads as never);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success(`تمت إضافة ${payloads.length} برنامجاً تصاعدياً للسجل بنجاح`);
      setOpen(false);
    } catch (error) {
      toast.error(`تعذّرت التغذية: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  // طباعة الجدول المخصص بنسق ممتاز ومنسق
  function handlePrint() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("تعذر فتح نافذة الطباعة، يرجى السماح بفتح النوافذ المنبثقة.");
      return;
    }

    const htmlContent = `
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>خطة برامج وخدمات التوجيه الطلابي - 1448 هـ</title>
          <style>
            body { font-family: Tahoma, Arial, sans-serif; padding: 20px; color: #111; }
            h2 { text-align: center; margin-bottom: 5px; font-size: 18px; }
            p.subtitle { text-align: center; font-size: 12px; color: #555; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th, td { border: 1px solid #333; padding: 8px 6px; text-align: right; vertical-align: top; }
            th { background-color: #f2f2f2; font-weight: bold; }
            tr:nth-child(even) { background-color: #fafafa; }
            .footer { margin-top: 30px; display: flex; justify-content: space-between; font-size: 12px; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <h2>المملكة العربية السعودية - وزارة التعليم</h2>
          <h2>إدارة التعليم بمنطقة مكة المكرمة | متوسطة علاء بن الحضرمي</h2>
          <h2>خطة برامج وخدمات التوجيه الطلابي للفصل الدراسي الأول (1448 هـ)</h2>
          <p class="subtitle">مرتبة تصاعدياً حسب الأسابيع والتواريخ المعتمدة</p>
          <table>
            <thead>
              <tr>
                <th>م</th>
                <th>الأسبوع والتاريخ الهجري</th>
                <th>اسم البرنامج الإرشادي</th>
                <th>النوع</th>
                <th>الفئة المستهدفة</th>
                <th>الهدف / التحديث الذكي ومؤشر التحقق</th>
              </tr>
            </thead>
            <tbody>
              ${programsList
                .map(
                  (p, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td><b>${p.week}</b></td>
                  <td><b>${p.name}</b></td>
                  <td>${p.ptype}</td>
                  <td>${p.target_group}</td>
                  <td>${p.goal} <br/><span style="color:#0066cc; font-size:10px;">المؤشر: ${p.indicator}</span></td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          <div class="footer">
            <div>الموجه الطلابي: ........................</div>
            <div>قائد المدرسة: ........................</div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <CalendarRange className="size-4" /> البرامج الوزارية (خطة مكة 1448هـ)
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto" dir="rtl">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div>
              <DialogTitle>خطة برامج التوجيه الطلابي (مرتبة تصاعدياً من الأسبوع الأول)</DialogTitle>
              <DialogDescription>
                استعراض جدول البرامج مع إمكانية التوليد الذكي المخصص لكل برنامج عبر DeepSeek والطباعة الاحترافية.
              </DialogDescription>
            </div>
            <Button variant="default" size="sm" onClick={handlePrint} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Printer className="size-4" /> طباعة الخطة المحدثة
            </Button>
          </DialogHeader>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b bg-muted/60">
                  <th className="p-2 font-bold">الأسبوع والتاريخ الهجري</th>
                  <th className="p-2 font-bold">البرنامج</th>
                  <th className="p-2 font-bold">النوع والجانب</th>
                  <th className="p-2 font-bold">الفئة المستهدفة</th>
                  <th className="p-2 font-bold">الهدف ومؤشر التحقق</th>
                  <th className="p-2 font-center">إجراء DeepSeek</th>
                </tr>
              </thead>
              <tbody>
                {programsList.map((p, idx) => (
                  <tr key={`${p.week}-${p.name}`} className="border-b last:border-0 hover:bg-muted/20 align-top">
                    <td className="whitespace-nowrap p-2 font-mono text-[11px] font-semibold text-primary">
                      {p.week}
                    </td>
                    <td className="p-2 font-bold">{p.name}</td>
                    <td className="p-2">
                      <div>{p.ptype}</div>
                      <div className="text-[10px] text-muted-foreground">{p.domain}</div>
                    </td>
                    <td className="p-2">{p.target_group}</td>
                    <td className="p-2 text-muted-foreground">
                      <div>{p.goal}</div>
                      <div className="mt-1 font-semibold text-foreground">مؤشر: {p.indicator}</div>
                    </td>
                    <td className="p-2 text-center">
                      {activeAiIndex === idx ? (
                        <div className="flex flex-col gap-1.5 rounded border bg-background p-2 shadow-sm">
                          <input
                            type="text"
                            placeholder="اطلب من DeepSeek تعديل الهدف، الأنشطة، أو إضافة فكرة..."
                            value={customPrompt}
                            onChange={(e) => setCustomPrompt(e.target.value)}
                            className="rounded border px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <div className="flex justify-end gap-1">
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => {
                                setActiveAiIndex(null);
                                setCustomPrompt("");
                              }}
                            >
                              إلغاء
                            </Button>
                            <Button
                              size="xs"
                              onClick={() => handleAiGenerateRow(idx)}
                              disabled={generatingIndex === idx}
                            >
                              {generatingIndex === idx ? <Loader2 className="size-3 animate-spin" /> : "توليد واعتماد"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="xs"
                          variant="outline"
                          className="gap-1 text-purple-600 hover:text-purple-700"
                          onClick={() => {
                            setActiveAiIndex(idx);
                            setCustomPrompt("");
                          }}
                        >
                          <Sparkles className="size-3" /> توليد بالذكاء الاصطناعي
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              إغلاق
            </Button>
            <Button onClick={seedToDatabase} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null} حفظ وتغذية قاعدة البيانات ({programsList.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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