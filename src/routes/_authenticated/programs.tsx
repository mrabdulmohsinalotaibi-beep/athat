import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarRange,
  Plus,
  Trash2,
  Printer,
  Sparkles,
  Loader2,
  CheckCircle2,
  Clock,
  FileText,
  Upload,
  Image as ImageIcon,
  Video,
  X,
  Calendar,
  Layers,
  Award,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { MINISTRY_PROGRAMS, MINISTRY_TERMS } from "@/lib/ministry-programs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
      { name: "description", content: "إدارة البرامج الإرشادية الوزارية والشواهد وصناعة المحتوى." },
    ],
  }),
  component: ProgramsPage,
});

type Program = {
  id: string;
  program_no?: string;
  name: string;
  ptype?: string;
  domain?: string;
  target_group?: string;
  term?: string;
  goal?: string;
  indicator?: string;
  exec_status: string;
  start_date?: string;
  end_date?: string;
  executed_summary?: string;
  evidence_urls?: string[];
  created_at?: string;
};

function ProgramsPage() {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState("all");
  const [selectedProgramToEdit, setSelectedProgramToEdit] = useState<Program | null>(null);
  const [aiPost, setAiPost] = useState<{ id: string; content: string } | null>(null);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  // 1. جلب البرامج من Supabase
  const { data: programs = [], isLoading } = useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Program[];
    },
  });

  const existingNames = new Set(programs.map((p) => p.name.trim()));

  const filteredMinistryList =
    selectedTerm === "all"
      ? MINISTRY_PROGRAMS
      : MINISTRY_PROGRAMS.filter((p) => p.term === selectedTerm);

  // 2. إضافة برنامج وزاري محدد بالتاريخ
  async function handleAddSingleProgram(prog: typeof MINISTRY_PROGRAMS[0], customDate: string) {
    setAddingId(prog.name);
    try {
      const payload = {
        program_no: `${prog.term} - الأسبوع ${prog.week}`,
        name: prog.name,
        ptype: prog.ptype,
        domain: prog.domain,
        target_group: prog.target_group,
        term: `${prog.term} — الأسبوع ${prog.week}`,
        goal: prog.goal,
        indicator: prog.indicator,
        exec_status: "مخطط له",
        start_date: customDate || new Date().toISOString().slice(0, 10),
        evidence_urls: [],
      };

      const { error } = await supabase.from("programs").insert([payload] as never);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success(`تمت إضافة برنامج "${prog.name}" بنجاح`);
    } catch (err) {
      toast.error(`تعذر إضافة البرنامج: ${(err as Error).message}`);
    } finally {
      setAddingId(null);
    }
  }

  // 3. حذف برنامج
  async function handleDeleteProgram(id: string, name: string) {
    if (!confirm(`هل أنت تأكد من حذف برنامج "${name}"؟ يمكنك إعادته لاحقاً من القائمة الوزارية.`)) return;
    try {
      const { error } = await supabase.from("programs").delete().eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("تم حذف البرنامج من السجل");
    } catch (err) {
      toast.error(`فشل الحذف: ${(err as Error).message}`);
    }
  }

  // 4. حفظ تعديلات البرنامج (تواريخ، شواهد، ما تم تنفيذه)
  async function handleUpdateProgram(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedProgramToEdit) return;

    const formData = new FormData(e.currentTarget);
    const updates = {
      start_date: formData.get("start_date") as string,
      end_date: formData.get("end_date") as string,
      exec_status: formData.get("exec_status") as string,
      executed_summary: formData.get("executed_summary") as string,
      evidence_urls: (formData.get("evidence_urls") as string)
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    };

    try {
      const { error } = await supabase
        .from("programs")
        .update(updates as never)
        .eq("id", selectedProgramToEdit.id);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("تم حفظ تفاصيل البرنامج والشواهد بنجاح");
      setSelectedProgramToEdit(null);
    } catch (err) {
      toast.error(`تعذر الحفظ: ${(err as Error).message}`);
    }
  }

  // 5. إنشاء منشور ذكاء اصطناعي
  function generateAiPost(program: Program) {
    setIsAiGenerating(true);
    setAiPost(null);
    setTimeout(() => {
      const postContent = `🌟 **تغطية إعلامية | تنفيذ برنامج إرشادي** 🌟

📌 **اسم البرنامج:** ${program.name}
🎯 **الهدف العام:** ${program.goal || "تعزيز الوعي والسلوك الإيجابي لدى الطلاب."}
👥 **الفئة المستهدفة:** ${program.target_group || "جميع الطلاب"}
📅 **فترة التنفيذ:** ${program.start_date || "الفصل الحالي"}

تم بفضل الله وتوفيقه تنفيذ برنامج (${program.name}) تحت إشراف التوجيه الطلابي بالمدرسة، والذي يهدف إلى ${
        program.goal || "تنمية المهارات الإرشادية والوقائية"
      }. 

نشكر جميع المشاركين والقائمين على إنجاح هذا البرنامج المعزز لسلوك أبنائنا الطلاب. ✨

#التوجيه_الطلابي #التعليم #النشاط_المدرسي #برامج_إرشادية`;

      setAiPost({ id: program.id, content: postContent });
      setIsAiGenerating(false);
    }, 1000);
  }

  // 6. طباعة برنامج محدد بكافة مكوناته
  function handlePrintProgram(program: Program) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <title>تقرير برنامج: ${program.name}</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 40px; color: #111; line-height: 1.6; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .title { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
          .subtitle { font-size: 14px; color: #666; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
          .box { border: 1px solid #ddd; padding: 12px; border-radius: 8px; background: #fafafa; }
          .box-title { font-size: 11px; color: #666; font-weight: bold; margin-bottom: 4px; }
          .box-value { font-size: 14px; font-weight: bold; }
          .section { margin-top: 25px; }
          .section-title { font-size: 16px; font-weight: bold; border-right: 4px solid #4f46e5; padding-right: 8px; margin-bottom: 10px; }
          .evidence-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px; }
          .evidence-img { width: 100%; height: 180px; object-fit: cover; border-radius: 6px; border: 1px solid #ccc; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">تقرير تنفيذ برنامج إرشادي</div>
          <div class="subtitle">منصة الذات للتوجيه الطلابي</div>
        </div>

        <div style="font-size: 20px; font-weight: bold; margin-bottom: 20px; color: #4f46e5;">
          ${program.name}
        </div>

        <div class="grid">
          <div class="box"><div class="box-title">نوع البرنامج</div><div class="box-value">${program.ptype || "إرشادي"}</div></div>
          <div class="box"><div class="box-title">المجال</div><div class="box-value">${program.domain || "عام"}</div></div>
          <div class="box"><div class="box-title">الفئة المستهدفة</div><div class="box-value">${program.target_group || "جميع الطلاب"}</div></div>
          <div class="box"><div class="box-title">حالة التنفيذ</div><div class="box-value">${program.exec_status}</div></div>
          <div class="box"><div class="box-title">تاريخ البداية</div><div class="box-value">${program.start_date || "غير محدد"}</div></div>
          <div class="box"><div class="box-title">تاريخ النهاية</div><div class="box-value">${program.end_date || "غير محدد"}</div></div>
        </div>

        <div class="section">
          <div class="section-title">هدف البرنامج</div>
          <p>${program.goal || "لا يوجد هدف مسجل"}</p>
        </div>

        <div class="section">
          <div class="section-title">مؤشر التحقق</div>
          <p>${program.indicator || "لا يوجد مؤشر مسجل"}</p>
        </div>

        <div class="section">
          <div class="section-title">ملخص ما تم تنفيذه</div>
          <p>${program.executed_summary || "لم يتم تدوين ملخص التنفيذ بعد."}</p>
        </div>

        ${
          program.evidence_urls && program.evidence_urls.length > 0
            ? `
          <div class="section">
            <div class="section-title">الشواهد والمرفقات</div>
            <div class="evidence-grid">
              ${program.evidence_urls
                .map((url) => `<img src="${url}" class="evidence-img" onerror="this.style.display='none'" />`)
                .join("")}
            </div>
          </div>
        `
            : ""
        }

        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }

  const completedCount = programs.filter((p) => p.exec_status === "مكتمل").length;
  const inProgressCount = programs.filter((p) => p.exec_status === "قيد التنفيذ").length;
  const plannedCount = programs.filter((p) => p.exec_status === "مخطط له").length;

  return (
    <div className="space-y-6 dir-rtl">
      {/* 1. Hero Card - تصميم مطابق للداشبورد */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-6 text-primary-foreground shadow-xl shadow-primary/10 sm:p-8">
        <div className="absolute -left-12 -top-12 size-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -right-12 -bottom-12 size-48 rounded-full bg-black/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-xs font-medium backdrop-blur-md">
              <Sparkles className="size-3.5 text-amber-300" />
              <span>الخطة التشغيلية للبرامج الإرشادية</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-4xl">
              سجل البرامج والأنشطة الإرشادية 🎯
            </h1>
            <p className="text-xs font-medium text-primary-foreground/80 sm:text-sm">
              متابعة تنفيذ البرامج الوزارية، رفع الشواهد، وتوليد المنشورات بالذكاء الاصطناعي.
            </p>
          </div>

          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="h-12 gap-2 rounded-2xl bg-white px-6 font-extrabold text-primary shadow-lg transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="size-5" />
            <span>إضافة برنامج من القائمة الوزارية</span>
          </Button>
        </div>
      </div>

      {/* 2. Stats Grid - بطاقات إحصائيات المطابقة للداشبورد */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-border/50 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-muted-foreground">البرامج المكتملة</span>
            <div className="rounded-2xl bg-background/80 p-3 text-emerald-500 shadow-sm backdrop-blur-md">
              <CheckCircle2 className="size-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <p className="text-3xl font-black text-foreground">{completedCount}</p>
            <span className="rounded-full bg-background/60 px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
              مكتمل
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-border/50 bg-gradient-to-br from-amber-500/20 to-orange-500/10 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-muted-foreground">قيد التنفيذ</span>
            <div className="rounded-2xl bg-background/80 p-3 text-amber-500 shadow-sm backdrop-blur-md">
              <Clock className="size-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <p className="text-3xl font-black text-foreground">{inProgressCount}</p>
            <span className="rounded-full bg-background/60 px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
              جاري العمل
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-border/50 bg-gradient-to-br from-blue-500/20 to-indigo-500/10 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-muted-foreground">مخطط له</span>
            <div className="rounded-2xl bg-background/80 p-3 text-blue-500 shadow-sm backdrop-blur-md">
              <Calendar className="size-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <p className="text-3xl font-black text-foreground">{plannedCount}</p>
            <span className="rounded-full bg-background/60 px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
              مجدول
            </span>
          </div>
        </div>
      </div>

      {/* 3. Main Content - قائمة البرامج المضافة */}
      <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between border-b border-border/40 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <Layers className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-foreground">البرامج الإرشادية الحالية</h2>
              <p className="text-[11px] font-medium text-muted-foreground">
                إدارة تفاصيل التنفيذ والشواهد وإنشاء التقارير
              </p>
            </div>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-extrabold text-primary">
            إجمالي البرامج: {programs.length}
          </span>
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : programs.length === 0 ? (
          <div className="py-12 text-center">
            <Award className="mx-auto size-12 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-bold text-muted-foreground">لا توجد برامج مضافة حتى الآن</p>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              variant="outline"
              className="mt-4 gap-2 rounded-2xl border-dashed"
            >
              <Plus className="size-4" /> اختر برامج من القائمة الوزارية
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {programs.map((program) => (
              <div
                key={program.id}
                className="group relative flex flex-col justify-between rounded-3xl border border-border/60 bg-background/60 p-5 transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black text-primary">
                      {program.program_no || "برنامج وزاري"}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        program.exec_status === "مكتمل"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : program.exec_status === "قيد التنفيذ"
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-blue-500/10 text-blue-600"
                      }`}
                    >
                      {program.exec_status}
                    </span>
                  </div>

                  <h3 className="mt-3 text-base font-black text-foreground leading-snug">
                    {program.name}
                  </h3>

                  <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-primary" />
                      <span>
                        البداية: {program.start_date || "غير محدد"}
                      </span>
                    </div>
                    {program.target_group && (
                      <div className="flex items-center gap-1.5">
                        <Award className="size-3.5 text-amber-500" />
                        <span>الفئة: {program.target_group}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 space-y-2 border-t border-border/40 pt-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedProgramToEdit(program)}
                      className="w-full justify-center gap-1.5 rounded-xl text-xs font-bold"
                    >
                      <FileText className="size-3.5" /> التفاصيل والشواهد
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generateAiPost(program)}
                      className="w-full justify-center gap-1.5 rounded-xl text-xs font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                    >
                      <Sparkles className="size-3.5" /> منشور AI
                    </Button>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handlePrintProgram(program)}
                      className="w-full justify-center gap-1 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground"
                    >
                      <Printer className="size-3.5" /> طباعة الصفحة
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteProgram(program.id, program.name)}
                      className="rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Dialog - إضافة برنامج من القائمة الوزارية بتواريخ محددة */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">البرامج الإرشادية الوزارية المعتمدة</DialogTitle>
            <DialogDescription className="text-xs">
              حدد الفصل الدراسي واضف البرنامج المطلوب مع تحديد تاريخ بداية التنفيذ.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3 py-2">
            <label className="text-xs font-bold text-muted-foreground">الفصل الدراسي:</label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="h-10 rounded-2xl border border-input bg-background px-4 text-xs font-bold"
            >
              <option value="all">جميع الفصول الدراسية</option>
              {MINISTRY_TERMS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {filteredMinistryList.map((prog) => {
              const isAlreadyAdded = existingNames.has(prog.name.trim());
              return (
                <div
                  key={`${prog.term}-${prog.week}-${prog.name}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border/60 bg-background p-4 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                        {prog.term} — الأسبوع {prog.week}
                      </span>
                      <span className="text-xs font-bold text-muted-foreground">{prog.ptype}</span>
                    </div>
                    <h4 className="text-sm font-black text-foreground">{prog.name}</h4>
                    <p className="text-xs text-muted-foreground">{prog.goal}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isAlreadyAdded ? (
                      <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-600">
                        <CheckCircle2 className="size-4" /> مضاف بالسجل
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          defaultValue={new Date().toISOString().slice(0, 10)}
                          id={`date-${prog.name}`}
                          className="h-9 w-36 rounded-xl text-xs font-bold"
                        />
                        <Button
                          size="sm"
                          disabled={addingId === prog.name}
                          onClick={() => {
                            const inputEl = document.getElementById(
                              `date-${prog.name}`
                            ) as HTMLInputElement;
                            handleAddSingleProgram(prog, inputEl?.value);
                          }}
                          className="gap-1.5 rounded-xl text-xs font-bold"
                        >
                          {addingId === prog.name ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Plus className="size-3.5" />
                          )}
                          إضافة
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* 5. Dialog - تعبئة بيانات وإنجاز وشواهد الصفحة الخاصة بالبرنامج */}
      {selectedProgramToEdit && (
        <Dialog open={!!selectedProgramToEdit} onOpenChange={() => setSelectedProgramToEdit(null)}>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-3xl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-lg font-black">
                تعبئة تفاصيل وتوثيق: {selectedProgramToEdit.name}
              </DialogTitle>
              <DialogDescription className="text-xs">
                حدد التواريخ وما تم تنفيذه وارفق روابط صور وفيديوهات الشواهد.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUpdateProgram} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">تاريخ البداية</label>
                  <Input
                    type="date"
                    name="start_date"
                    defaultValue={selectedProgramToEdit.start_date || ""}
                    className="rounded-xl text-xs font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">تاريخ النهاية</label>
                  <Input
                    type="date"
                    name="end_date"
                    defaultValue={selectedProgramToEdit.end_date || ""}
                    className="rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">حالة التنفيذ</label>
                <select
                  name="exec_status"
                  defaultValue={selectedProgramToEdit.exec_status || "مخطط له"}
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-xs font-bold"
                >
                  <option value="مخطط له">مخطط له</option>
                  <option value="قيد التنفيذ">قيد التنفيذ</option>
                  <option value="مكتمل">مكتمل</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">ملخص ما تم تنفيذه</label>
                <Textarea
                  name="executed_summary"
                  rows={3}
                  placeholder="اكتب هنا تفاصيل وفعاليات التنفيذ والنتائج..."
                  defaultValue={selectedProgramToEdit.executed_summary || ""}
                  className="rounded-xl text-xs font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">
                  شواهد التنفيذ (روابط الصور أو الفيديوهات - رابط في كل سطر)
                </label>
                <Textarea
                  name="evidence_urls"
                  rows={3}
                  placeholder="https://example.com/photo1.jpg&#10;https://example.com/video1.mp4"
                  defaultValue={(selectedProgramToEdit.evidence_urls || []).join("\n")}
                  className="rounded-xl text-xs font-mono dir-ltr"
                />
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setSelectedProgramToEdit(null)} className="rounded-xl text-xs font-bold">
                  إلغاء
                </Button>
                <Button type="submit" className="rounded-xl text-xs font-bold">
                  حفظ التفاصيل والشواهد
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* 6. Dialog - عرض المنشور المولد بالذكاء الاصطناعي */}
      <Dialog open={!!aiPost || isAiGenerating} onOpenChange={() => setAiPost(null)}>
        <DialogContent className="max-w-lg rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-black">
              <Sparkles className="size-5 text-indigo-500" />
              المنشور الإعلامي للبرنامج (AI)
            </DialogTitle>
          </DialogHeader>

          {isAiGenerating ? (
            <div className="flex h-36 flex-col items-center justify-center gap-3">
              <Loader2 className="size-8 animate-spin text-indigo-500" />
              <p className="text-xs font-bold text-muted-foreground">جاري صياغة المنشور الإعلامي...</p>
            </div>
          ) : (
            aiPost && (
              <div className="space-y-4">
                <Textarea
                  value={aiPost.content}
                  readOnly
                  rows={10}
                  className="rounded-2xl border-indigo-100 bg-indigo-50/30 p-4 text-xs font-medium leading-relaxed"
                />
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(aiPost.content);
                    toast.success("تم نسخ المنشور للحافظة جاهزاً للنشر");
                  }}
                  className="w-full gap-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700"
                >
                  نسخ النص للنشر
                </Button>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}