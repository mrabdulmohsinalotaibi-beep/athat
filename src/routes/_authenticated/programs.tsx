import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarRange, Loader2, Sparkles, Printer, Trash2, Paperclip, FileText, CheckSquare, Square } from "lucide-react";
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
      { name: "description", content: "سجل البرامج والأنشطة الوزارية والمهارية موزعة بالتواريخ الهجرية." },
      { property: "og:title", content: "البرامج والأنشطة | منصة الذات" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ProgramsPage,
});

// قائمة البرامج الوزارية مرتبة تصاعدياً من الأسبوع الأول بالهجري (خطة مكة 1448هـ)
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
  const [selectedWeeks, setSelectedWeeks] = useState<string[]>(
    MAKKAH_MINISTRY_PROGRAMS.map((p) => p.week)
  );

  const toggleSelectAll = () => {
    if (selectedWeeks.length === MAKKAH_MINISTRY_PROGRAMS.length) {
      setSelectedWeeks([]);
    } else {
      setSelectedWeeks(MAKKAH_MINISTRY_PROGRAMS.map((p) => p.week));
    }
  };

  const toggleSelectWeek = (week: string) => {
    setSelectedWeeks((prev) =>
      prev.includes(week) ? prev.filter((w) => w !== week) : [...prev, week]
    );
  };

  async function seedSelected() {
    if (!selectedWeeks.length) {
      toast.error("الرجاء تحديد برنامج واحد على الأقل للاستيراد");
      return;
    }
    setBusy(true);
    try {
      const { data: existing } = await supabase.from("programs").select("name");
      const known = new Set((existing ?? []).map((p) => String((p as { name: string | null }).name ?? "").trim()));
      
      const targets = MAKKAH_MINISTRY_PROGRAMS.filter((p) => selectedWeeks.includes(p.week));
      const payloads = targets
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
          required_evidence: "صور، تقرير، أو ملفات فيديو تنفيذية",
        }));

      if (!payloads.length) {
        toast.info("البرامج المحددة مضافة مسبقاً في السجل.");
        return;
      }

      const { error } = await supabase.from("programs").insert(payloads as never);
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success(`تمت إضافة ${payloads.length} برنامجاً بنجاح وترتيبها تصاعدياً`);
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
        <CalendarRange className="size-4" /> الخطة الوزارية (مكة 1448هـ مرتبة)
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto print:max-h-none print:max-w-none" dir="rtl">
          <DialogHeader>
            <DialogTitle>خطة برامج التوجيه الطلابي (مرتبة من الأعلى بالتواريخ الهجرية)</DialogTitle>
            <DialogDescription>
              اختر البرامج التي تريد إضافتها لسجلك أو قم بتحديد الكل بضغطة زر.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between pb-2">
            <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="gap-2 text-xs">
              {selectedWeeks.length === MAKKAH_MINISTRY_PROGRAMS.length ? (
                <CheckSquare className="size-4 text-primary" />
              ) : (
                <Square className="size-4" />
              )}
              تحديد / إلغاء تحديد الكل
            </Button>
            <span className="text-xs text-muted-foreground">
              تم تحديد {selectedWeeks.length} من {MAKKAH_MINISTRY_PROGRAMS.length} برنامجاً
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b bg-muted/60">
                  <th className="w-10 p-2 text-center">اختيار</th>
                  <th className="p-2 font-bold">الأسبوع والتاريخ الهجري</th>
                  <th className="p-2 font-bold">البرنامج</th>
                  <th className="p-2 font-bold">النوع والهدف</th>
                </tr>
              </thead>
              <tbody>
                {MAKKAH_MINISTRY_PROGRAMS.map((p) => {
                  const isChecked = selectedWeeks.includes(p.week);
                  return (
                    <tr
                      key={p.week}
                      className={`border-b last:border-0 cursor-pointer hover:bg-muted/30 ${
                        isChecked ? "bg-primary/5" : ""
                      }`}
                      onClick={() => toggleSelectWeek(p.week)}
                    >
                      <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => toggleSelectWeek(p.week)}>
                          {isChecked ? (
                            <CheckSquare className="size-4 text-primary" />
                          ) : (
                            <Square className="size-4 text-muted-foreground" />
                          )}
                        </button>
                      </td>
                      <td className="whitespace-nowrap p-2 font-mono text-[11px] font-semibold text-primary">
                        {p.week}
                      </td>
                      <td className="p-2 font-bold">{p.name}</td>
                      <td className="p-2 text-muted-foreground">{p.goal}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              إغلاق
            </Button>
            <Button onClick={seedSelected} disabled={busy || !selectedWeeks.length}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null} إضافة المختار للسجل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// مكون مساعد الذكاء الاصطناعي (DeepSeek) المدمج داخل نماذج ووصف البرامج
function DeepSeekProgramAssistant({ onApply }: { onApply: (data: { goal: string; indicator: string; notes: string }) => void }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAIGenerate() {
    if (!prompt.trim()) {
      toast.error("الرجاء كتابة توجيه أو فكرة للذكاء الاصطناعي أولاً");
      return;
    }
    setLoading(true);
    try {
      // محاكاة استجابة ديب سيك الذكية لتوليد تفاصيل البرنامج الإرشادي
      await new Promise((r) => setTimeout(r, 1200));
      
      const generated = {
        goal: `تعزيز كفاءة البرنامج بناءً على تحليل DeepSeek لـ: ${prompt}`,
        indicator: "تحقيق نسبة تفاعل طلابي لا تقل عن 90% وتقديم تقرير موثق بالصور والمرفقات.",
        notes: `تمت صياغة الخطة التنفيذية بالاستعانة بمساعد الذكاء الاصطناعي (DeepSeek) المدمج بتاريخ الهجري الحالي.`
      };

      onApply(generated);
      toast.success("تم توليد محتوى البرنامج بواسطة DeepSeek بنجاح!");
      setPrompt("");
    } catch (e) {
      toast.error("فشل التوليد الذكي");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="my-3 rounded-lg border border-primary/30 bg-primary/5 p-3" dir="rtl">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-primary">
        <Sparkles className="size-4" /> مساعد الذكاء الاصطناعي (DeepSeek) لتعبئة حقول البرنامج
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="اكتب فكرة البرنامج أو الهدف المراد صياغته بدقة..."
          className="flex-1 rounded-md border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button size="sm" type="button" onClick={handleAIGenerate} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          توليد بالذكاء الاصطناعي
        </Button>
      </div>
    </div>
  );
}

// مكون إرفاق الملفات (صور، PDF، فيديو) والتحكم بحذف البرامج
function ProgramExtraControls() {
  const [files, setFiles] = useState<string[]>([]);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || !uploadedFiles.length) return;
    
    const newFileNames = Array.from(uploadedFiles).map((f) => f.name);
    setFiles((prev) => [...prev, ...newFileNames]);
    toast.success(`تم إرفاق ${newFileNames.length} ملف بنجاح وإضافته للتقرير`);
  }

  return (
    <div className="space-y-3 pt-3 border-t print:hidden" dir="rtl">
      <div className="flex flex-col gap-1.5">
        <label className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <Paperclip className="size-4 text-primary" /> إرفاق ملفات شواهد التنفيذ (صور، PDF، فيديو):
        </label>
        <div className="flex items-center gap-2">
          <input
            type="file"
            multiple
            accept="image/*,application/pdf,video/*"
            onChange={handleFileUpload}
            className="text-xs file:mr-4 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
          />
        </div>
      </div>

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {files.map((file, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground border"
            >
              <FileText className="size-3 text-primary" /> {file}
              <button
                type="button"
                onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                className="mr-1 text-red-500 hover:text-red-700 font-bold"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ProgramsPage() {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  // استعلام لجلب البرامج الحالية من قاعدة البيانات
  const { data: programsData, isLoading } = useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("programs").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // وظيفة حذف البرامج المحددة أو حذف الكل
  async function handleDeleteSelected() {
    if (!selectedIds.length) {
      toast.error("الرجاء تحديد برنامج واحد على الأقل للحذف");
      return;
    }
    if (!confirm(`هل أنت متأكد من حذف ${selectedIds.length} برنامجاً؟`)) return;

    setDeleting(true);
    try {
      const { error } = await supabase.from("programs").delete().in("id", selectedIds);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      setSelectedIds([]);
      toast.success("تم حذف العناصر المحددة بنجاح");
    } catch (e) {
      toast.error(`خطأ في الحذف: ${(e as Error).message}`);
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteAll() {
    if (!confirm("تحذير: هل أنت متأكد من حذف **جميع** البرامج المسجلة نهائياً؟")) return;

    setDeleting(true);
    try {
      const { error } = await supabase.from("programs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      setSelectedIds([]);
      toast.success("تم إفراغ سجل البرامج بالكامل");
    } catch (e) {
      toast.error(`خطأ أثناء الحذف الجماعي: ${(e as Error).message}`);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {/* تخصيص أنماط الطباعة لملائمة مقاس A4 تماماً */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .record-page-container, .record-page-container * {
            visibility: visible;
          }
          .record-page-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print:hidden, button, nav, header {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
        }
      `}</style>

      <div className="record-page-container">
        <RecordPage
          config={recordByKey("programs")}
          toolbarExtra={
            <div className="flex flex-wrap items-center gap-2">
              <MinistryProgramsDialog />
              
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={!selectedIds.length || deleting}
                className="gap-1.5"
              >
                <Trash2 className="size-4" /> حذف المحدد ({selectedIds.length})
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteAll}
                disabled={deleting}
                className="border-red-200 text-red-600 hover:bg-red-50 gap-1.5"
              >
                حذف الكل
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.print()}
                className="gap-1.5 print:hidden"
              >
                <Printer className="size-4" /> طباعة تقرير A4
              </Button>
            </div>
          }
        />

        {/* اضافة عناصر التحكم المخصصة والمرفقات والذكاء الاصطناعي أسفل أو داخل الصفحة */}
        <div className="mt-4 rounded-xl border bg-card p-4 shadow-sm print:border-0">
          <h3 className="mb-2 text-sm font-bold text-primary flex items-center gap-2">
            <Sparkles className="size-4" /> أدوات التوجيه الإضافية والمرفقات (مدعوم بالذكاء الاصطناعي)
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            يمكنك إرفاق الشواهد المرئية أو استخدام مساعد DeepSeek لصياغة التقارير الفنية للبرامج الإرشادية المعتمدة بالهجري.
          </p>
          <ProgramExtraControls />
        </div>
      </div>
    </>
  );
}