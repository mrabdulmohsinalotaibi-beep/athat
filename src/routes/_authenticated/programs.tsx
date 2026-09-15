import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  CalendarRange, 
  Loader2, 
  Sparkles, 
  Printer, 
  Trash2, 
  Paperclip, 
  FileText, 
  PlusCircle, 
  CheckSquare, 
  Square 
} from "lucide-react";
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
      { title: "البرامج والأنشطة الإرشادية | منصة الذات" },
      { name: "description", content: "سجل البرامج الوزارية المعتمدة مع دعم الذكاء الاصطناعي والطباعة." },
      { property: "og:title", content: "البرامج والأنشطة | منصة الذات" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ProgramsPage,
});

// خطة مكة المكرمة 1448هـ مرتبة تصاعدياً من الأسبوع الأول في الأعلى
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

function ProgramsPage() {
  const queryClient = useQueryClient();
  const [openSeedDialog, setOpenSeedDialog] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [printProgram, setPrintProgram] = useState<any | null>(null);

  // استعلام جلب البرامج من قاعدة البيانات مرتبطة برمجياً
  const { data: programs = [], isLoading } = useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("programs").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // إضافة الخطة الوزارية دفعة واحدة
  async function seedMakkahPlan() {
    setBusy(true);
    try {
      const { data: existing } = await supabase.from("programs").select("name");
      const known = new Set((existing ?? []).map((p: any) => String(p.name ?? "").trim()));
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
          required_evidence: "صور، تقرير PDF، أو مقطع فيديو توثيقي",
        }));

      if (!payloads.length) {
        toast.info("جميع البرامج مضافة مسبقاً.");
        return;
      }
      const { error } = await supabase.from("programs").insert(payloads as never);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success(`تم استيراد ${payloads.length} برنامجاً وزارياً بنجاح!`);
      setOpenSeedDialog(false);
    } catch (error: any) {
      toast.error(`تعذر الاستيراد: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  // حذف الكل أو الحذف المخصص المحدد
  async function handleDeleteAll() {
    if (!confirm("هل أنت متأكد من حذف جميع البرامج المسجلة نهائياً؟")) return;
    try {
      const { error } = await supabase.from("programs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      setSelectedIds([]);
      toast.success("تم حذف كافة البرامج بنجاح");
    } catch (error: any) {
      toast.error(`خطأ في الحذف: ${error.message}`);
    }
  }

  async function handleDeleteSelected() {
    if (!selectedIds.length) {
      toast.error("الرجاء تحديد برنامج واحد على الأقل للحذف");
      return;
    }
    if (!confirm(`هل أنت متأكد من حذف (${selectedIds.length}) برامج محددة؟`)) return;
    try {
      const { error } = await supabase.from("programs").delete().in("id", selectedIds);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      setSelectedIds([]);
      toast.success("تم حذف العناصر المحددة بنجاح");
    } catch (error: any) {
      toast.error(`خطأ في الحذف: ${error.message}`);
    }
  }

  function toggleSelectAll() {
    if (selectedIds.length === programs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(programs.map((p: any) => p.id));
    }
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* شريط الأدوات العلوي والتحكم */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Button variant="default" onClick={() => setOpenSeedDialog(true)}>
            <CalendarRange className="size-4 ml-1" /> خطة برامج مكة (1448 هـ)
          </Button>
          {programs.length > 0 && (
            <>
              <Button variant="destructive" size="sm" onClick={handleDeleteAll}>
                <Trash2 className="size-4 ml-1" /> حذف الكل
              </Button>
              {selectedIds.length > 0 && (
                <Button variant="outline" size="sm" className="border-red-500 text-red-500 hover:bg-red-50" onClick={handleDeleteSelected}>
                  حذف المحدد ({selectedIds.length})
                </Button>
              )}
            </>
          )}
        </div>
        <div className="text-xs text-muted-foreground font-medium">
          إجمالي البرامج المدرجة: <span className="font-bold text-primary">{programs.length}</span> برنامج
        </div>
      </div>

      {/* جدول عرض البرامج مع أيقونات الملفات والطباعة */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b bg-muted/55">
                <th className="p-3 w-10 text-center">
                  <button onClick={toggleSelectAll}>
                    {programs.length > 0 && selectedIds.length === programs.length ? (
                      <CheckSquare className="size-4 text-primary" />
                    ) : (
                      <Square className="size-4 text-muted-foreground" />
                    )}
                  </button>
                </th>
                <th className="p-3 font-bold">الفترة / التاريخ الهجري</th>
                <th className="p-3 font-bold">اسم البرنامج</th>
                <th className="p-3 font-bold">النوع والجانب</th>
                <th className="p-3 font-bold">الفئة المستهدفة</th>
                <th className="p-3 font-bold">المرفقات (صور/PDF/فيديو)</th>
                <th className="p-3 font-bold text-center">الإجراءات والطباعة</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    <Loader2 className="mx-auto size-6 animate-spin mb-2" /> جاري تحميل السجلات...
                  </td>
                </tr>
              ) : programs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-foreground">
                    لا توجد برامج مضافة حالياً. يمكنك استخدام زر "خطة برامج مكة (1448 هـ)" للاستيراد السريع أو الإضافة اليدوية.
                  </td>
                </tr>
              ) : (
                programs.map((p: any) => {
                  const isChecked = selectedIds.includes(p.id);
                  return (
                    <tr key={p.id} className={`border-b transition-colors hover:bg-muted/20 ${isChecked ? "bg-muted/40" : ""}`}>
                      <td className="p-3 text-center">
                        <button onClick={() => toggleSelectOne(p.id)}>
                          {isChecked ? <CheckSquare className="size-4 text-primary" /> : <Square className="size-4 text-muted-foreground" />}
                        </button>
                      </td>
                      <td className="p-3 font-mono text-[11px] font-semibold text-primary whitespace-nowrap">
                        {p.term || p.program_no}
                      </td>
                      <td className="p-3 font-bold text-foreground">{p.name}</td>
                      <td className="p-3 text-muted-foreground">{p.ptype} ({p.domain})</td>
                      <td className="p-3">{p.target_group}</td>
                      <td className="p-3">
                        {p.attachment_url || p.file_path ? (
                          <a 
                            href={p.attachment_url || p.file_path} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-100"
                          >
                            <Paperclip className="size-3" /> عرض المرفق
                          </a>
                        ) : (
                          <span className="text-muted-foreground/60 italic text-[11px]">لا يوجد مرفق</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 px-2 text-[11px]"
                            onClick={() => setPrintProgram(p)}
                          >
                            <Printer className="size-3 ml-1" /> طباعة A4
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* نافذة استيراد خطة مكة */}
      <Dialog open={openSeedDialog} onOpenChange={setOpenSeedDialog}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>استيراد خطة برامج التوجيه الطلابي (مكة المكرمة 1448هـ)</DialogTitle>
            <DialogDescription>
              البرامج مرتبة تصاعدياً حسب التواريخ والأسابيع الهجرية المعتمدة.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto rounded border p-2">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b bg-muted/60">
                  <th className="p-2">الأسبوع والتاريخ الهجري</th>
                  <th className="p-2">البرنامج</th>
                  <th className="p-2">الهدف</th>
                </tr>
              </thead>
              <tbody>
                {MAKKAH_MINISTRY_PROGRAMS.map((item, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="p-2 font-mono text-[11px] text-primary">{item.week}</td>
                    <td className="p-2 font-bold">{item.name}</td>
                    <td className="p-2 text-muted-foreground">{item.goal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenSeedDialog(false)}>إلغاء</Button>
            <Button onClick={seedMakkahPlan} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin ml-1" />} اعتماد واستيراد البرامج للسجل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة معاينة وطباعة البرنامج بتصميم A4 هندسي احترافي */}
      {printProgram && (
        <Dialog open={!!printProgram} onOpenChange={() => setPrintProgram(null)}>
          <DialogContent className="max-w-3xl print:max-w-none print:p-0" dir="rtl">
            <div id="printable-area" className="space-y-6 p-6 bg-white text-black rounded-lg">
              <div className="border-b pb-4 text-center">
                <h2 className="text-lg font-extrabold">المملكة العربية السعودية</h2>
                <h3 className="text-sm font-semibold text-gray-600">وزارة التعليم - إدارة الإشراف التربوي (التوجيه الطلابي)</h3>
                <h1 className="mt-2 text-xl font-bold text-primary">تقرير تنفيذ برنامج إرشادي معتمد</h1>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded border">
                <div><strong>اسم البرنامج:</strong> {printProgram.name}</div>
                <div><strong>الفترة / التاريخ الهجري:</strong> {printProgram.term || printProgram.program_no}</div>
                <div><strong>نوع البرنامج:</strong> {printProgram.ptype}</div>
                <div><strong>الجانب الإرشادي:</strong> {printProgram.domain}</div>
                <div><strong>الفئة المستهدفة:</strong> {printProgram.target_group}</div>
                <div><strong>حالة التنفيذ:</strong> {printProgram.exec_status || "منفذ"}</div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="border rounded p-3">
                  <h4 className="font-bold text-gray-700 mb-1">أهداف البرنامج:</h4>
                  <p className="text-gray-600">{printProgram.goal || "غير مسجل"}</p>
                </div>
                <div className="border rounded p-3">
                  <h4 className="font-bold text-gray-700 mb-1">مؤشر التحقق:</h4>
                  <p className="text-gray-600">{printProgram.indicator || "غير مسجل"}</p>
                </div>
                <div className="border rounded p-3">
                  <h4 className="font-bold text-gray-700 mb-1">الشواهد والمرفقات الموثقة:</h4>
                  <p className="text-gray-600">{printProgram.required_evidence || printProgram.attachment_url || "لا توجد مرفقات إضافية"}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-10 text-center text-xs">
                <div>
                  <p className="font-bold">الموجه الطلابي</p>
                  <p className="mt-8 border-t pt-1">التوقيع:</p>
                </div>
                <div>
                  <p className="font-bold">مسؤول النشاط أو الإشراف</p>
                  <p className="mt-8 border-t pt-1">التوقيع:</p>
                </div>
                <div>
                  <p className="font-bold">قائد المدرسة</p>
                  <p className="mt-8 border-t pt-1">الختم والتوقيع:</p>
                </div>
              </div>
            </div>

            <DialogFooter className="print:hidden">
              <Button variant="outline" onClick={() => setPrintProgram(null)}>إغلاق</Button>
              <Button onClick={() => window.print()}>
                <Printer className="size-4 ml-1" /> طباعة التقرير (A4)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* نظام السجلات الأساسي الافتراضي للنظام */}
      <RecordPage
        config={recordByKey("programs")}
        toolbarExtra={
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="size-3.5 text-primary" /> مدمج بنظام DeepSeek والتواريخ الهجرية
          </div>
        }
      />
    </div>
  );
}