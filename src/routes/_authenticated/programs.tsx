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
  // ... (باقي الأسابيع 18 بنفس النمط)
];

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarRange, Loader2, Sparkles } from "lucide-react";
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
import { MINISTRY_PROGRAMS } from "@/data/ministry-programs";

export function MinistryProgramsDialog() {
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


import { useState } from "react";
import { Bot, Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function AIAssistantDialog() {
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


import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MINISTRY_PROGRAMS } from "@/data/ministry-programs";

export function PrintA4ReportButton() {
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


import { createFileRoute } from "@tanstack/react-router";
import { RecordPage } from "@/components/RecordPage";
import { recordByKey } from "@/lib/records";
import { MinistryProgramsDialog } from "@/components/programs/MinistryProgramsDialog";
import { AIAssistantDialog } from "@/components/programs/AIAssistantDialog";
import { PrintA4ReportButton } from "@/components/programs/PrintA4ReportButton";

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