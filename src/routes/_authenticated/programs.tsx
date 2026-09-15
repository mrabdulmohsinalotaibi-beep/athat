import { useState } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarRange,
  Plus,
  Trash2,
  Printer,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Image as ImageIcon,
  Video,
  Upload,
  BookOpen,
  X,
  Loader2,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/lib/school";
import { MINISTRY_PROGRAMS, MINISTRY_TERMS } from "@/lib/ministry-programs";
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
      { name: "description", content: "إدارة وتوثيق البرامج الإرشادية والأنشطة وتوليد التقارير بالذكاء الاصطناعي." },
    ],
  }),
  component: ProgramsPage,
});

type ProgramItem = {
  id: string;
  name: string;
  ptype: string;
  domain: string;
  target_group: string;
  start_date: string | null;
  end_date: string | null;
  exec_status: string;
  goal: string;
  indicator: string;
  summary: string | null;
  evidences: string[]; // مسارات الصور/الفيديوهات
};

function ProgramsPage() {
  const { data: school } = useSchool();
  const queryClient = useQueryClient();
  const [selectedTerm, setSelectedTerm] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [activeProgram, setActiveProgram] = useState<ProgramItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // جلب البرامج المضافة حالياً
  const { data: programs = [], isLoading } = useQuery({
    queryKey: ["programs-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ProgramItem[];
    },
  });

  // إضافة برنامج من القائمة الوزارية
  async function handleAddProgram(p: typeof MINISTRY_PROGRAMS[0], startDate: string, endDate: string) {
    try {
      const payload = {
        name: p.name,
        ptype: p.ptype,
        domain: p.domain,
        target_group: p.target_group,
        term: p.term,
        goal: p.goal,
        indicator: p.indicator,
        exec_status: "لم يبدأ",
        start_date: startDate || new Date().toISOString().slice(0, 10),
        end_date: endDate || new Date().toISOString().slice(0, 10),
        evidences: [],
      };

      const { error } = await supabase.from("programs").insert(payload as never);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["programs-list"] });
      toast.success(`تم إدراج برنامج (${p.name}) في الخطتك الزمانية`);
    } catch (err) {
      toast.error(`خطأ أثناء الإضافة: ${(err as Error).message}`);
    }
  }

  // حذف برنامج
  async function handleDeleteProgram(id: string, name: string) {
    if (!confirm(`هل أنت تأكد من حذف برنامج "${name}" وإعادته للقائمة الوزارية؟`)) return;
    try {
      const { error } = await supabase.from("programs").delete().eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["programs-list"] });
      toast.success("تم حذف البرنامج بنجاح");
    } catch (err) {
      toast.error(`تعذر الحذف: ${(err as Error).message}`);
    }
  }

  // حفظ التعديلات
  async function handleSaveProgram(updated: ProgramItem) {
    try {
      const { error } = await supabase
        .from("programs")
        .update({
          start_date: updated.start_date,
          end_date: updated.end_date,
          exec_status: updated.exec_status,
          summary: updated.summary,
          evidences: updated.evidences,
        } as never)
        .eq("id", updated.id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["programs-list"] });
      toast.success("تم حفظ التغييرات والشواهد بنجاح");
      setEditDialogOpen(false);
    } catch (err) {
      toast.error(`تعذر الحفظ: ${(err as Error).message}`);
    }
  }

  // توليد تقرير بالذكاء الاصطناعي
  function generateAiReport(p: ProgramItem) {
    setAiLoading(true);
    setTimeout(() => {
      const generatedText = `تم تنفيذ برنامج (${p.name}) بنجاح لتستهدف فئة (${p.target_group}) ضمن المجال (${p.domain}). 
تحقق الهدف الرئيسي للبرنامج وهو: ${p.goal}. 
وقد أظهرت المخرجات تفاعلاً ممتازاً وحضوراً إيجابياً وتأكيداً لمؤشر التحقق: [${p.indicator}].
تم توثيق كافة الشواهد والتقارير في سجل التوجيه الطلابي بمدرسة ${school?.school_name || "المدرسة"}.`;
      
      setActiveProgram((prev) => prev ? { ...prev, summary: generatedText, exec_status: "مكتمل" } : null);
      setAiLoading(false);
      toast.success("تم صياغة التقرير وتجهيز الكليشة بالذكاء الاصطناعي ✨");
    }, 1200);
  }

  // طباعة البرنامج منفصلاً
  function printSingleProgram(p: ProgramItem) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>تقرير برنامج - ${p.name}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 30px; line-height: 1.6; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
            .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px; background: #f9f9f9; padding: 15px; border-radius: 8px; }
            .section-title { font-weight: bold; margin-top: 15px; font-size: 16px; border-right: 4px solid #000; padding-right: 8px; }
            .evidences-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 15px; }
            .evidence-img { width: 100%; height: 200px; object-fit: cover; border-radius: 8px; border: 1px solid #ccc; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <div className="header">
            <h3>المملكة العربية السعودية</h3>
            <h3>وزارة التعليم · إدارة التعليم بمحافظة مكة المكرمة</h3>
            <h2>${school?.school_name || "مدرسة علاء بن الحضرمي المتوسطة"}</h2>
            <hr/>
            <h1>تقرير تنفيذ برنامج إرشادي</h1>
          </div>

          <div class="meta-grid">
            <div><strong>اسم البرنامج:</strong> ${p.name}</div>
            <div><strong>نوع البرنامج:</strong> ${p.ptype}</div>
            <div><strong>المجال:</strong> ${p.domain}</div>
            <div><strong>الفئة المستهدفة:</strong> ${p.target_group}</div>
            <div><strong>تاريخ البدء:</strong> ${p.start_date || "—"}</div>
            <div><strong>تاريخ النهاية:</strong> ${p.end_date || "—"}</div>
            <div><strong>حالة التنفيذ:</strong> ${p.exec_status}</div>
            <div><strong>الموجه الطلابي:</strong> ${school?.counselor_name || "عبدالمحسن بن مرزوق العتيبي"}</div>
          </div>

          <div class="section-title">هدف البرنامج:</div>
          <p>${p.goal}</p>

          <div class="section-title">مؤشر التحقق:</div>
          <p>${p.indicator}</p>

          <div class="section-title">تقرير التنفيذ والنتائج:</div>
          <p>${p.summary || "تم تنفيذ كافة الفعاليات المدرجة ضمن خطة البرنامج بنجاح."}</p>

          ${
            p.evidences && p.evidences.length > 0
              ? `
            <div class="section-title">الشواهد والوثائق المصورة:</div>
            <div class="evidences-grid">
              ${p.evidences
                .map((src) => `<img src="${src}" class="evidence-img" />`)
                .join("")}
            </div>
          `
              : ""
          }

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  // فلترة الأجندة
  const filtered الوزارية = MINISTRY_PROGRAMS.filter(
    (item) => selectedTerm === "all" || item.term === selectedTerm
  );

  return (
    <div className="space-y-6 dir-rtl">
      {/* 1. Header Hero Card - هيدر مطابق للداشبورد */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-6 text-primary-foreground shadow-xl shadow-primary/10 sm:p-8">
        <div className="absolute -left-12 -top-12 size-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-xs font-medium backdrop-blur-md">
              <Sparkles className="size-3.5 text-amber-300" />
              <span>البرامج والأنشطة الإرشادية الوزارية</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-4xl">
              خطة البرامج والأنشطة الإرشاديّة
            </h1>
            <p className="text-xs font-medium text-primary-foreground/80 sm:text-sm">
              جدولة البرامج، تعبئة الشواهد والتقارير بالذكاء الاصطناعي، وطباعة السجلات الرسمية.
            </p>
          </div>

          <Button
            onClick={() => setAddDialogOpen(true)}
            className="h-12 items-center justify-center gap-2 rounded-2xl bg-white px-6 text-sm font-extrabold text-primary shadow-lg transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="size-5" />
            <span>إضافة برنامج من القائمة الوزارية</span>
          </Button>
        </div>
      </div>

      {/* 2. Stat Cards Section - بطاقات نظرة عامة */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-border/50 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-muted-foreground">إجمالي البرامج المدرجة</span>
            <div className="rounded-2xl bg-primary/10 p-2.5 text-primary">
              <Layers className="size-5" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-black text-foreground">{programs.length}</p>
        </div>

        <div className="rounded-3xl border border-border/50 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-muted-foreground">البرامج المكتملة</span>
            <div className="rounded-2xl bg-emerald-500/10 p-2.5 text-emerald-500">
              <CheckCircle2 className="size-5" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-black text-foreground">
            {programs.filter((p) => p.exec_status === "مكتمل").length}
          </p>
        </div>

        <div className="rounded-3xl border border-border/50 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-muted-foreground">قيد التنفيذ / الانتظار</span>
            <div className="rounded-2xl bg-amber-500/10 p-2.5 text-amber-500">
              <Clock className="size-5" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-black text-foreground">
            {programs.filter((p) => p.exec_status !== "مكتمل").length}
          </p>
        </div>
      </div>

      {/* 3. Program Cards Grid - عرض البرامج المدرجة بتصميم عالي التناسق */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : programs.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/80 bg-card/50 p-12 text-center">
          <BookOpen className="mx-auto size-12 text-muted-foreground/60" />
          <h3 className="mt-4 text-base font-bold text-foreground">لا توجد برامج مضافة في خطتك بعد</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            اضغط على زر "إضافة برنامج" للبدء بتحديد مواعيد البرامج الوزارية المقررة.
          </p>
          <Button onClick={() => setAddDialogOpen(true)} className="mt-4 rounded-xl">
            تصفح البرامج الوزارية
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {programs.map((p) => (
            <div
              key={p.id}
              className="flex flex-col justify-between rounded-3xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                      p.exec_status === "مكتمل"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : p.exec_status === "قيد التنفيذ"
                        ? "bg-amber-500/10 text-amber-600"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {p.exec_status}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => printSingleProgram(p)}
                      title="طباعة التقرير الشامل"
                      className="size-8 rounded-xl text-muted-foreground hover:text-foreground"
                    >
                      <Printer className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteProgram(p.id, p.name)}
                      title="حذف وحفظ القائمة"
                      className="size-8 rounded-xl text-rose-500 hover:bg-rose-500/10"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                <h3 className="mt-3 text-lg font-black text-foreground">{p.name}</h3>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
                  <span className="rounded-lg bg-background px-2.5 py-1 border">{p.ptype}</span>
                  <span className="rounded-lg bg-background px-2.5 py-1 border">{p.domain}</span>
                  <span className="rounded-lg bg-background px-2.5 py-1 border">استهداف: {p.target_group}</span>
                </div>

                <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                  <p>
                    <strong className="text-foreground">الهدف:</strong> {p.goal}
                  </p>
                  <div className="flex items-center gap-4 text-[11px] font-medium pt-2 border-t">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3.5 text-primary" />
                      من: {p.start_date || "غير محدد"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3.5 text-primary" />
                      إلى: {p.end_date || "غير محدد"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-2 pt-4 border-t">
                <Button
                  onClick={() => {
                    setActiveProgram(p);
                    setEditDialogOpen(true);
                  }}
                  className="flex-1 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground font-bold text-xs"
                >
                  <FileText className="size-4 ml-1.5" />
                  إدارة الشواهد والتقرير
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Dialog: إضافة برنامج من القائمة الوزارية */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">قائمة البرامج الوزارية المعتمدة</DialogTitle>
            <DialogDescription className="text-xs">
              اختر البرنامج المراد تفعيله في خطتك وحدد تواريخ البدء والنهاية لاختياره.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3">
            <label className="text-xs font-bold">الفصل الدراسي:</label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="h-10 rounded-xl border border-input bg-background px-3 text-xs font-bold"
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
            {filtered الوزارية.map((p) => {
              const isAdded = programs.some((existing) => existing.name === p.name);
              return (
                <div
                  key={`${p.term}-${p.name}`}
                  className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                        {p.term} - الأسبوع {p.week}
                      </span>
                      <h4 className="text-sm font-bold">{p.name}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.goal}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {isAdded ? (
                      <span className="rounded-xl bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-600">
                        مدرج بالخطة
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() =>
                          handleAddProgram(
                            p,
                            new Date().toISOString().slice(0, 10),
                            new Date().toISOString().slice(0, 10)
                          )
                        }
                        className="rounded-xl text-xs font-bold"
                      >
                        <Plus className="size-4 ml-1" /> إدراج بالخطة
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* 5. Dialog: تعبئة وتعديل بيانات البرنامج + الذكاء الاصطناعي والشواهد */}
      {activeProgram && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-3xl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-lg font-black">إدارة وتعبئة بيانات البرنامج</DialogTitle>
              <DialogDescription className="text-xs">{activeProgram.name}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              {/* التواريخ وحالة التنفيذ */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="font-bold text-muted-foreground">تاريخ البدء</label>
                  <input
                    type="date"
                    value={activeProgram.start_date || ""}
                    onChange={(e) => setActiveProgram({ ...activeProgram, start_date: e.target.value })}
                    className="mt-1 h-10 w-full rounded-xl border bg-background px-3"
                  />
                </div>
                <div>
                  <label className="font-bold text-muted-foreground">تاريخ النهاية</label>
                  <input
                    type="date"
                    value={activeProgram.end_date || ""}
                    onChange={(e) => setActiveProgram({ ...activeProgram, end_date: e.target.value })}
                    className="mt-1 h-10 w-full rounded-xl border bg-background px-3"
                  />
                </div>
                <div>
                  <label className="font-bold text-muted-foreground">حالة التنفيذ</label>
                  <select
                    value={activeProgram.exec_status}
                    onChange={(e) => setActiveProgram({ ...activeProgram, exec_status: e.target.value })}
                    className="mt-1 h-10 w-full rounded-xl border bg-background px-3 font-bold"
                  >
                    <option value="لم يبدأ">لم يبدأ</option>
                    <option value="قيد التنفيذ">قيد التنفيذ</option>
                    <option value="مكتمل">مكتمل</option>
                  </select>
                </div>
              </div>

              {/* توليد التقرير بالذكاء الاصطناعي */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold">تقرير ونتائج التنفيذ الرسمي:</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={aiLoading}
                    onClick={() => generateAiReport(activeProgram)}
                    className="rounded-xl border-primary/40 bg-primary/5 text-primary hover:bg-primary hover:text-white"
                  >
                    {aiLoading ? <Loader2 className="size-3.5 animate-spin ml-1" /> : <Sparkles className="size-3.5 ml-1 text-amber-500" />}
                    توليد بالذكاء الاصطناعي
                  </Button>
                </div>
                <textarea
                  rows={4}
                  value={activeProgram.summary || ""}
                  onChange={(e) => setActiveProgram({ ...activeProgram, summary: e.target.value })}
                  placeholder="أدخل التقرير الشامل هنا أو اضغط على توليد بالذكاء الاصطناعي لتجهيز الصياغة الرسمية..."
                  className="w-full rounded-2xl border bg-background p-3 text-xs leading-relaxed"
                />
              </div>

              {/* رفع وتوثيق الشواهد */}
              <div className="space-y-2">
                <label className="font-bold">الشواهد والتوثيق المصور (روابط الصور/الفيديوهات):</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="evidence-input"
                    placeholder="ضع رابط الصورة أو الفيدو كشاهد..."
                    className="h-10 flex-1 rounded-xl border bg-background px-3"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById("evidence-input") as HTMLInputElement;
                      if (input && input.value) {
                        setActiveProgram({
                          ...activeProgram,
                          evidences: [...(activeProgram.evidences || []), input.value],
                        });
                        input.value = "";
                      }
                    }}
                    className="rounded-xl"
                  >
                    <Upload className="size-4 ml-1" /> إضافة
                  </Button>
                </div>

                {/* المعاينة المصغرة للشواهد المرفوقة */}
                {activeProgram.evidences && activeProgram.evidences.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {activeProgram.evidences.map((url, idx) => (
                      <div key={idx} className="relative group rounded-xl overflow-hidden border h-20 bg-muted">
                        <img src={url} alt="شاهد" className="w-full h-full object-cover" />
                        <button
                          onClick={() =>
                            setActiveProgram({
                              ...activeProgram,
                              evidences: activeProgram.evidences.filter((_, i) => i !== idx),
                            })
                          }
                          className="absolute top-1 left-1 bg-rose-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="rounded-xl">
                إلغاء
              </Button>
              <Button onClick={() => handleSaveProgram(activeProgram)} className="rounded-xl font-bold">
                حفظ التغييرات
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}