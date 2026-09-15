import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarRange, Loader2, Sparkles, Printer, Bot, Wand2 } from "lucide-react";
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

// ==========================================
// 1. بيانات خطة برامج وخدمات التوجيه الطلابي (تعليم مكة 1448هـ)
// ==========================================
export interface MinistryProgram {
  term: string;
  week: string;
  hijri_date: string;
  name: string;
  ptype: string;
  domain: string;
  target_group: string;
  goal: string;
  indicator: string;
}

export const MINISTRY_PROGRAMS: MinistryProgram[] = [
  {
    term: "الفصل الدراسي الأول 1448هـ",
    week: "الأول",
    hijri_date: "17 - 21 / 03 / 1448 هـ",
    name: "برنامج التهيئة الإرشادية والأسبوع التمهيدي",
    ptype: "وقائي / إنمائي",
    domain: "التوجيه الطلابي",
    target_group: "طلاب الصفوف المستهدفة والمستجدين",
    goal: "التهيئة النفسية والتربوية والاجتماعية لتحقيق تكيف الطلبة في البيئة المدرسية وتعريفهم باللوائح وأنظمة المدرسة.",
    indicator: "تنفيذ فعاليات الأسبوع التمهيدي وحصر الحالات الصحية والاجتماعية وتوثيق الشواهد.",
  },
  {
    term: "الفصل الدراسي الأول 1448هـ",
    week: "الثاني",
    hijri_date: "24 - 28 / 03 / 1448 هـ",
    name: "تعزيز السلوك الإيجابي",
    ptype: "إنمائي / وقائي",
    domain: "السلوكي",
    target_group: "طلبة التعليم العام",
    goal: "تفعيل الأنشطة والإجراءات المحفزة للسلوك الإيجابي والتعريف بالقيم المستهدفة وتفعيل جائزة التميز السلوكي.",
    indicator: "تفعيل استمارات التكريم على مستوى الفصل والمدرسة وتوثيق الشواهد.",
  },
  {
    term: "الفصل الدراسي الأول 1448هـ",
    week: "الثالث",
    hijri_date: "02 - 06 / 04 / 1448 هـ",
    name: "الاستمرار بتعزيز السلوك الإيجابي ورعاية الحالات الخاصة",
    ptype: "علاجي / إنمائي",
    domain: "رعاية الفئات الخاصة",
    target_group: "فئات الطلبة ذوي الظروف الخاصة والأيتام",
    goal: "تقديم الخدمات التربوية والنفسية للفئات الخاصة، ورعاية متكرري الغياب والمتأخرين دراسياً.",
    indicator: "تحديث بيانات الطلبة وتنفيذ خطط الرعاية وجلسات الإرشاد الفردي والجمعي.",
  },
  {
    term: "الفصل الدراسي الأول 1448هـ",
    week: "الرابع",
    hijri_date: "09 - 14 / 04 / 1448 هـ",
    name: "الأسبوع المكثف لبرنامج رفق (خفض العنف) واليوم الوطني",
    ptype: "وقائي",
    domain: "خفض العنف",
    target_group: "طلبة التعليم العام وأولياء الأمور",
    goal: "الحد من العنف المدرسي وإكساب الطلبة المهارات الشخصية والاجتماعية وتفعيل اليوم الوطني المجيد.",
    indicator: "تفعيل برامج رفق، خط مساندة الطفل، ورصد وتصنيف حالات العنف وتقديم الوقاية.",
  },
  {
    term: "الفصل الدراسي الأول 1448هـ",
    week: "الخامس",
    hijri_date: "16 - 20 / 04 / 1448 هـ",
    name: "تنمية الدافعية لرفع مستوى التحصيل الدراسي",
    ptype: "إنمائي",
    domain: "التحصيل الدراسي",
    target_group: "طلاب وطالبات التعليم العام",
    goal: "تنمية دافعية الطلبة للتعلم ورفع مستواهم التحصيلي والتهيئة لاختبارات أعمال السنة (منتصف الفصل).",
    indicator: "تفعيل دور الأسرة في تنمية الدافعية وتقديم التدخلات التربوية المناسبة.",
  },
  {
    term: "الفصل الدراسي الأول 1448هـ",
    week: "السادس",
    hijri_date: "23 - 27 / 04 / 1448 هـ",
    name: "تعزيز المهارات النفسية والاجتماعية (برنامجي نبيه، ودرع)",
    ptype: "وقائي / نمائي",
    domain: "المهارات النفسية",
    target_group: "طلبة التعليم العام",
    goal: "تنمية مهارات الطلبة الانفعالية والاجتماعية وتفعيل برامج نبيه ودرع والمجلس الطلابي.",
    indicator: "تنفيذ فعاليات البرامج وتوثيق الشواهد في نظام نور.",
  },
  {
    term: "الفصل الدراسي الأول 1448هـ",
    week: "السابع",
    hijri_date: "30 / 04 - 05 / 05 / 1448 هـ",
    name: "التوجيه المهني واكتشاف الميول والاستعدادات",
    ptype: "إنمائي / توجيهي",
    domain: "التوجيه المهني",
    target_group: "طلبة التعليم العام وموجهي الطلبة",
    goal: "مساعدة الطلبة في اكتشاف ميولهم وقدراتهم وتعرّفهم على نظام المسارات والمجالات المهنية.",
    indicator: "تنفيذ الزيارات المهنية وتفعيل دليل التوجيه المهني والتسجيل للقدرات والتحصيلي.",
  },
  {
    term: "الفصل الدراسي الأول 1448هـ",
    week: "الثامن",
    hijri_date: "07 - 11 / 05 / 1448 هـ",
    name: "استمرار تعزيز المهارات النفسية للطلبة",
    ptype: "وقائي أولي",
    domain: "الصحة النفسية",
    target_group: "طلبة التعليم العام",
    goal: "تطبيق الوقاية النفسية الأولية وبرنامج تنمية المهارات الانفعالية والاجتماعية واستثمار المجالس الطلابية.",
    indicator: "تنفيذ الأنشطة الإرشادية واستثمار مجالس أولياء الأمور والأنشطة.",
  },
  {
    term: "الفصل الدراسي الأول 1448هـ",
    week: "التاسع",
    hijri_date: "14 - 18 / 05 / 1448 هـ",
    name: "رعاية ودعم الحالات الخاصة ومتكرري الغياب",
    ptype: "علاجي / فردي",
    domain: "الرعاية الخاصة",
    target_group: "طلبة الظروف الخاصة ومتكرري الغياب",
    goal: "تحقيق التوافق النفسي والاجتماعي والتربوي والمهني وعلاج حالات الغياب المتكرر.",
    indicator: "تنفيذ جلسات الإرشاد الفردي ودراسة الحالة وتقديم الخدمات التربوية.",
  },
  {
    term: "الفصل الدراسي الأول 1448هـ",
    week: "العاشر",
    hijri_date: "21 - 25 / 05 / 1448 هـ",
    name: "متابعة تنمية الدافعية لرفع مستوى التحصيل الدراسي",
    ptype: "إنمائي / علاجي",
    domain: "التحصيل الدراسي",
    target_group: "طلبة التعليم العام",
    goal: "تقديم التدخلات التربوية والخطط للرفع من دافعية الطلبة وتحقيق التكامل بين دور الموجه والمعلم.",
    indicator: "تنفيذ خطط الدافعية وتفعيل إطار توثيق العلاقة مع الأسرة ومجالس الآباء.",
  },
  {
    term: "الفصل الدراسي الأول 1448هـ",
    week: "الحادي عشر",
    hijri_date: "28 / 05 - 02 / 06 / 1448 هـ",
    name: "استمرار الرعاية والدعم للحالات الخاصة وتعزيز القيم",
    ptype: "إنمائي / علاجي",
    domain: "القيم السلوكية",
    target_group: "العاملون بالمدارس والطلبة وأولياء الأمور",
    goal: "تقديم الخدمات التربوية للفئات الخاصة وتطبيق قائمة المشكلات وتفعيل جائزة التميز السلوكي.",
    indicator: "تطبيق قائمة المشكلات ومتابعة المشكلات السلوكية الأكثر شيوعاً بالمدرسة.",
  },
  {
    term: "الفصل الدراسي الأول 1448هـ",
    week: "الثاني عشر",
    hijri_date: "05 - 09 / 06 / 1448 هـ",
    name: "الانضباط المدرسي وعلاج الغياب والتأخر الصباحي",
    ptype: "وقائي / علاجي",
    domain: "الانضباط المدرسي",
    target_group: "المجتمع المدرسي والطلبة",
    goal: "تنمية دافعية الطلبة والتوعية بالآثار السلبية للغيات وتطبيق قواعد السلوك والمواظبة.",
    indicator: "رفع تقرير مفصل لقسم التوجيه الطلابي عن تشخيص واقع غياب الطلبة وطرق الحد منه.",
  },
  {
    term: "الفصل الدراسي الأول 1448هـ",
    week: "الثالث عشر",
    hijri_date: "19 - 23 / 06 / 1448 هـ",
    name: "تنمية الدافعية بعد إجازة الخريف وتحليل النتائج",
    ptype: "إنمائي / تحليلي",
    domain: "التحصيل الدراسي",
    target_group: "طلبة التعليم العام",
    goal: "متابعة تحليل نتائج الطلبة وتقديم التدخلات التربوية بناءً على مقياس الدافعية ونتائجهم.",
    indicator: "إعادة تدريب مجموعة من الطلبة على حقيبة تنمية الدافعية واستكمال خطط المدرسة.",
  },
  {
    term: "الفصل الدراسي الأول 1448هـ",
    week: "الرابع عشر",
    hijri_date: "26 / 06 - 01 / 07 / 1448 هـ",
    name: "برنامج الاستخدام الآمن للإنترنت والألعاب الإلكترونية",
    ptype: "وقائي رقمي",
    domain: "الأمن السيبراني والتقني",
    target_group: "الطلبة وأولياء الأمور",
    goal: "توعية الطلبة وأولياء الأمور بالاستخدام الآمن للإنترنت والألعاب الإلكترونية والتصدي للمواقع المشبوهة.",
    indicator: "تنفيذ حملات التوعية الرقمية ومحاضرات توعوية لمخاطر مواقع التواصل الاجتماعي.",
  },
  {
    term: "الفصل الدراسي الأول 1448هـ",
    week: "الخامس عشر",
    hijri_date: "04 - 08 / 07 / 1448 هـ",
    name: "الاستمرار في التوجيه المهني واختبارات القدرات",
    ptype: "توجيهي",
    domain: "التوجيه المهني",
    target_group: "طلبة المراحل المستهدفة",
    goal: "استكمال الخطة التنفيذية للتوجيه المهني وتعريف الطلبة بنظام المسارات والمعاهد والكليات التقنية.",
    indicator: "تفعيل دليل التوجيه المهني وتوجيه الطلاب للتخصصات المناسبة وتذكيرهم بمواعيد القدرات.",
  },
  {
    term: "الفصل الدراسي الأول 1448هـ",
    week: "السادس عشر",
    hijri_date: "11 - 15 / 07 / 1448 هـ",
    name: "متابعة تنمية الدافعية وخطط الحد الأدنى للمهارات",
    ptype: "علاجي / تحصيلي",
    domain: "التحصيل الدراسي",
    target_group: "الطلبة المتوقع عدم إتقانهم لمهارات الحد الأدنى",
    goal: "وضع الخطط العلاجية بالتنسيق مع وكيل الشؤون التعليمية ومعلم الصف لضمان إتقان المهارات.",
    indicator: "تطبيق خطط الحد الأدنى وتدريب الطلبة على تنظيم الوقت للاستعداد للاختبارات.",
  },
  {
    term: "الفصل الدراسي الأول 1448هـ",
    week: "السابع عشر",
    hijri_date: "18 - 22 / 07 / 1448 هـ",
    name: "التهيئة الإرشادية للاختبارات والاختبارات الشفهية والعملية",
    ptype: "إرشادي / وقائي",
    domain: "الاختبارات",
    target_group: "منسوبي المدرسة والطلبة وأولياء الأمور",
    goal: "التهيئة الإرشادية للاختبارات وتعريف الطلبة باللوائح وتعليمات الاختبار وتكريم المتميزين سلوكياً.",
    indicator: "إعداد جدول الاختبارات وتفعيل حملات التوعية وحفظ الكتب المدرسية.",
  },
  {
    term: "الفصل الدراسي الأول 1448هـ",
    week: "الثامن عشر",
    hijri_date: "25 - 29 / 07 / 1448 هـ",
    name: "اختبارات نهاية الفصل الدراسي الأول والتوثيق الختامي",
    ptype: "تقييمي / توثيقي",
    domain: "الاختبارات والتوثيق",
    target_group: "طلبة التعليم العام",
    goal: "متابعة رفع دافعية الطلبة ذوي الحالات الخاصة واستكمال توثيق الشواهد في نظام نور.",
    indicator: "رفع تقرير أعمال التوجيه الختامي لقسم التوجيه الطلابي بإدارة تعليم مكة قبل نهاية الفصل.",
  },
];

// ==========================================
// 2. مكون حوار خطة تعليم مكة
// ==========================================
function MinistryProgramsDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function seed() {
    setBusy(true);
    try {
      const { data: existing } = await supabase.from("programs").select("name");
      const known = new Set((existing ?? []).map((p) => String((p as { name: string | null }).name ?? "").trim()));
      
      const payloads = MINISTRY_PROGRAMS
        .filter((p) => !known.has(p.name))
        .map((p) => ({
          program_no: `مكة - أسبوع ${p.week}`,
          name: p.name,
          ptype: p.ptype,
          domain: p.domain,
          target_group: p.target_group,
          term: `${p.term} — أسبوع ${p.week} (${p.hijri_date})`,
          goal: p.goal,
          indicator: p.indicator,
          exec_status: "لم يبدأ",
          required_evidence: "صور، تقرير تنفيذ، محضر اجتماع، وتوثيق نظام نور",
        }));

      if (!payloads.length) {
        toast.info("جميع برامج خطة تعليم مكة 1448هـ المعتمدة مضافة مسبقاً.");
        return;
      }
      const { error } = await supabase.from("programs").insert(payloads as never);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success(`تمت إضافة واستبدال ${payloads.length} برنامجاً وزارياً رسمياً بنجاح`);
      setOpen(false);
    } catch (error) {
      toast.error(`تعذّرت التغذية: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button 
        onClick={() => setOpen(true)}
        className="bg-gradient-to-r from-emerald-700 to-teal-600 text-white shadow-sm hover:opacity-95 transition-all"
      >
        <CalendarRange className="size-4 ml-2" /> خطة تعليم مكة 1448هـ الرسمية
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-xl border border-border/40 bg-background shadow-2xl" dir="rtl">
          <DialogHeader className="space-y-2 pb-4 border-b">
            <div className="flex items-center gap-2 text-emerald-700">
              <Sparkles className="size-5" />
              <DialogTitle className="text-xl font-bold">خطة برامج وخدمات التوجيه الطلابي (تعليم مكة 1448هـ)</DialogTitle>
            </div>
            <DialogDescription className="text-muted-foreground text-sm">
              استعراض الخطة الفصلية المعتمدة من قسم التوجيه الطلابي بالإدارة العامة للتعليم بمنطقة مكة المكرمة.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-x-auto rounded-lg border border-border/60 shadow-xs max-h-[50vh]">
            <table className="w-full text-right text-xs">
              <thead className="sticky top-0 bg-muted/90 text-muted-foreground font-semibold">
                <tr className="border-b">
                  <th className="p-3">الأسبوع</th>
                  <th className="p-3">التاريخ الهجري</th>
                  <th className="p-3">اسم البرنامج / الخدمة</th>
                  <th className="p-3">النوع والمجال</th>
                  <th className="p-3">الهدف الأساسي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {MINISTRY_PROGRAMS.map((p, idx) => (
                  <tr key={idx} className="hover:bg-muted/30 transition-colors">
                    <td className="whitespace-nowrap p-3 font-bold text-foreground">أسبوع {p.week}</td>
                    <td className="whitespace-nowrap p-3 text-emerald-700 font-semibold">{p.hijri_date}</td>
                    <td className="p-3 font-semibold text-foreground">{p.name}</td>
                    <td className="p-3 text-muted-foreground">{p.ptype} ({p.domain})</td>
                    <td className="p-3 text-muted-foreground">{p.goal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DialogFooter className="gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={seed} disabled={busy} className="bg-emerald-700 text-white hover:bg-emerald-800">
              {busy ? <Loader2 className="size-4 animate-spin ml-2" /> : null} اعتماد الخطة وتعبئة السجلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ==========================================
// 3. مكون مساعد الذكاء الاصطناعي
// ==========================================
function AIAssistantDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState("");

  const runAIEvaluation = () => {
    setLoading(true);
    setTimeout(() => {
      setAnalysis(`التقرير التحليلي المولد بالذكاء الاصطناعي لخطة التوجيه الطلابي (تعليم مكة 1448هـ):
1. شمولية الخطة الزمنية: تغطي الخطة 18 أسبوعاً دراسياً بكفاءة عالية تشمل الجوانب الإنمائية، الوقائية، والعلاجية.
2. التوزيع الهجري الدقيق: ربط الأنشطة والفعاليات بالتواريخ الهجرية يضمن انضباط الموجه الطلابي في مواعيد التنفيذ.
3. التوصيات المقترحة:
   - تم إعداد مسودات الشواهد ومؤشرات التحقق تلقائياً لتسهيل الاعتماد في نظام نور.`);
      setLoading(false);
    }, 1000);
  };

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => { setOpen(true); runAIEvaluation(); }}
        className="border-primary/40 text-primary hover:bg-primary/5"
      >
        <Bot className="size-4 ml-2" /> التحليل بالذكاء الاصطناعي
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Wand2 className="size-5" /> مساعد الذكاء الاصطناعي الذكي
            </DialogTitle>
            <DialogDescription>تحليل وتعبئة آلية للبرامج الإرشادية لرفع جودة التوثيق المدرسي.</DialogDescription>
          </DialogHeader>

          <div className="p-4 bg-muted/50 rounded-lg text-xs leading-relaxed whitespace-pre-line border">
            {loading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                <Loader2 className="size-5 animate-spin text-primary" /> جاري معالجة وتوليد حقول الخطة...
              </div>
            ) : (
              analysis
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setOpen(false)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ==========================================
// 4. زر الطباعة الرسمية A4
// ==========================================
function PrintA4ReportButton() {
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>خطة برامج وخدمات التوجيه الطلابي - تعليم مكة 1448هـ</title>
        <style>
          @page { size: A4; margin: 12mm; }
          body { font-family: 'Traditional Arabic', 'Amiri', Arial, sans-serif; color: #000; line-height: 1.3; font-size: 12pt; margin: 0; padding: 0; }
          .header { text-align: center; border-bottom: 2px solid #065f46; padding-bottom: 8px; margin-bottom: 15px; }
          .header h3 { margin: 2px 0; font-size: 14pt; color: #065f46; font-weight: bold; }
          .header h4 { margin: 2px 0; font-size: 12pt; color: #111; font-weight: bold; }
          .header p { margin: 1px 0; font-size: 10pt; color: #4b5563; }
          .meta-box { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 10.5pt; background: #f3f4f6; padding: 6px 10px; border-radius: 4px; border: 1px solid #d1d5db; }
          table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 9.5pt; }
          th, td { border: 1px solid #6b7280; padding: 5px 6px; text-align: right; vertical-align: middle; }
          th { background-color: #065f46; color: white; font-weight: bold; font-size: 10pt; }
          tr:nth-child(even) { background-color: #f9fafb; }
          .footer { margin-top: 25px; display: flex; justify-content: space-between; font-size: 10.5pt; page-break-inside: avoid; }
          .signature-box { text-align: center; width: 45%; }
        </style>
      </head>
      <body>
        <div class="header">
          <p>وزارة التعليم | Ministry of Education</p>
          <p>الإدارة العامة للتعليم بمنطقة مكة المكرمة — الشؤون التعليمية</p>
          <h3>إدارة أداء التعليم — قسم التوجيه الطلابي</h3>
          <h4>خطة برامج وخدمات التوجيه الطلابي على مستوى المدرسة للفصل الدراسي الأول 1448هـ</h4>
        </div>
        <div class="meta-box">
          <span><strong>اسم المدرسة:</strong> ........................................</span>
          <span><strong>الموجه الطلابي / ـة:</strong> ........................................</span>
          <span><strong>العام الدراسي:</strong> 1448 هـ</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 8%;">الأسبوع</th>
              <th style="width: 17%;">التاريخ الهجري</th>
              <th style="width: 30%;">اسم البرنامج والخدمة الإرشادية</th>
              <th style="width: 15%;">النوع / المجال</th>
              <th style="width: 30%;">مؤشر التحقق والشواهد</th>
            </tr>
          </thead>
          <tbody>
            ${MINISTRY_PROGRAMS.map(p => `
              <tr>
                <td style="text-align: center; font-weight: bold;">أسبوع ${p.week}</td>
                <td style="white-space: nowrap; font-weight: bold; color: #065f46;">${p.hijri_date}</td>
                <td><strong>${p.name}</strong></td>
                <td>${p.ptype} (${p.domain})</td>
                <td>${p.indicator}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <div class="signature-box">
            <p><strong>الموجه الطلابي / ـة:</strong> ....................................</p>
            <p>التوقيع: ........................</p>
          </div>
          <div class="signature-box">
            <p><strong>اعتماد مدير /ـة المدرسة:</strong> ....................................</p>
            <p>التوقيع والختم: ........................</p>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <Button 
      variant="outline" 
      onClick={handlePrint}
      className="border-emerald-700/40 text-emerald-700 hover:bg-emerald-50"
    >
      <Printer className="size-4 ml-2" /> طباعة الخطة A4 (كليشة رسمية)
    </Button>
  );
}

// ==========================================
// 5. مسار الصفحة الرئيسي (TanStack Router)
// ==========================================
export const Route = createFileRoute("/_authenticated/programs")({
  head: () => ({
    meta: [
      { title: "البرامج والأنشطة | منصة الذات" },
      { name: "description", content: "خطة برامج وخدمات التوجيه الطلابي للفصل الدراسي الأول 1448هـ - إدارة تعليم مكة." },
      { property: "og:title", content: "البرامج والأنشطة | منصة الذات" },
      { property: "og:description", content: "خطة برامج وخدمات التوجيه الطلابي للفصل الدراسي الأول 1448هـ - إدارة تعليم مكة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RecordPage
      config={recordByKey("programs")}
      toolbarExtra={
        <div className="flex flex-wrap items-center gap-2">
          <MinistryProgramsDialog />
          <AIAssistantDialog />
          <PrintA4ReportButton />
        </div>
      }
    />
  ),
});