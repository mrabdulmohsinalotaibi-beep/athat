import { useState, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Plus,
  Trash2,
  Printer,
  Sparkles,
  Loader2,
  FileText,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  BookOpen,
  School,
  UserCheck,
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
      { name: "description", content: "إدارة وتوثيق البرامج الإرشادية والأنشطة الوزارية بالشهادات والشواهد." },
    ],
  }),
  component: ProgramsPage,
});

// تحويل التاريخ الجريغوري إلى هجري
function toHijriDate(dateStr?: string) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return dateStr;
  }
}

export type ProgramItem = {
  id: string;
  name: string;
  program_no?: string;
  ptype?: string;
  domain?: string;
  target_group?: string;
  term?: string;
  goal?: string;
  indicator?: string;
  start_date?: string;
  end_date?: string;
  exec_status?: string;
  summary?: string;
  evidence_images?: string[];
  created_at?: string;
};

function ProgramsPage() {
  const queryClient = useQueryClient();
  const { data: school } = useSchool();
  const printRef = useRef<HTMLDivElement>(null);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedMinistryProg, setSelectedMinistryProg] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [editProgram, setEditProgram] = useState<ProgramItem | null>(null);
  const [printProgram, setPrintProgram] = useState<ProgramItem | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [busy, setBusy] = useState(false);

  // جلب البرامج من قاعدة البيانات
  const { data: programs = [], isLoading } = useQuery({
    queryKey: ["programs-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProgramItem[];
    },
  });

  // إضافة برنامج من القائمة الوزارية
  async function handleAddProgram() {
    if (!selectedMinistryProg) {
      toast.error("يرجى اختيار برنامج من القائمة الوزارية");
      return;
    }
    const found = MINISTRY_PROGRAMS.find((p) => p.name === selectedMinistryProg);
    if (!found) return;

    setBusy(true);
    try {
      const payload = {
        name: found.name,
        program_no: `${found.term} - الأسبوع ${found.week}`,
        ptype: found.ptype,
        domain: found.domain,
        target_group: found.target_group,
        term: found.term,
        goal: found.goal,
        indicator: found.indicator,
        start_date: startDate || null,
        end_date: endDate || null,
        exec_status: "قيد التنفيذ",
        summary: `برنامج إرشادي موجه لـ ${found.target_group} يهدف إلى ${found.goal}.`,
        evidence_images: [],
      };

      const { error } = await supabase.from("programs").insert([payload as never]);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["programs-list"] });
      toast.success("تمت إضافة البرنامج بنجاح إلى القائمة");
      setAddDialogOpen(false);
      setSelectedMinistryProg("");
      setStartDate("");
      setEndDate("");
    } catch (err) {
      toast.error(`تعذر إضافة البرنامج: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  // حذف برنامج
  async function handleDeleteProgram(id: string) {
    if (!confirm("هل أنت تأكد من حذف هذا البرنامج؟ يمكنك إعادته لاحقاً من القائمة الوزارية.")) return;
    try {
      const { error } = await supabase.from("programs").delete().eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["programs-list"] });
      toast.success("تم حذف البرنامج");
    } catch (err) {
      toast.error(`تعذر الحذف: ${(err as Error).message}`);
    }
  }

  // توليد التقرير بالذكاء الاصطناعي
  async function handleAiGenerate(program: ProgramItem) {
    setAiGenerating(true);
    try {
      // محاكاة صياغة التقرير الإرشادي المتقدم بالذكاء الاصطناعي
      await new Promise((res) => setTimeout(res, 1200));
      const aiSummary = `تم تنفيذ برنامج (${program.name}) لخدمة (${program.target_group || "جميع الطلاب"})، ويهدف بالأساس إلى ${program.goal || "تعزيز السلوك الإيجابي ورفع الوعي"}. تم تحقيق مؤشر القياس وهو: [${program.indicator || "تفاعل واكتساب المهارات المطلوب"}] بنسبة نجاح عالية وتفاعل ممتاز من جميع المستهدفين.`;

      const updated = {
        ...program,
        summary: aiSummary,
        exec_status: "مكتمل",
      };

      const { error } = await supabase
        .from("programs")
        .update({ summary: aiSummary, exec_status: "مكتمل" } as never)
        .eq("id", program.id);

      if (error) throw error;

      setEditProgram(updated);
      queryClient.invalidateQueries({ queryKey: ["programs-list"] });
      toast.success("تمت التعبئة الصياغية وتطوير التقرير بواسطة الذكاء الاصطناعي");
    } catch (err) {
      toast.error(`خطأ أثناء توليد الذكاء الاصطناعي: ${(err as Error).message}`);
    } finally {
      setAiGenerating(false);
    }
  }

  // رفع الشواهد (صور)
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, program: ProgramItem) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setBusy(true);
    try {
      const uploadedUrls: string[] = [...(program.evidence_images || [])];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split(".").pop();
        const filePath = `programs/${program.id}/${Math.random()}.${fileExt}`;

        const { error: uploadErr } = await supabase.storage.from("evidence").upload(filePath, file);
        if (uploadErr) {
          // في حال عدم توفر Storage Bucket محلياً يتم استخدام Base64 مؤقتاً
          const reader = new FileReader();
          const base64Promise = new Promise<string>((res) => {
            reader.onload = () => res(reader.result as string);
            reader.readAsDataURL(file);
          });
          const base64Data = await base64Promise;
          uploadedUrls.push(base64Data);
        } else {
          const { data } = supabase.storage.from("evidence").getPublicUrl(filePath);
          uploadedUrls.push(data.publicUrl);
        }
      }

      const { error } = await supabase
        .from("programs")
        .update({ evidence_images: uploadedUrls } as never)
        .eq("id", program.id);

      if (error) throw error;

      const updated = { ...program, evidence_images: uploadedUrls };
      setEditProgram(updated);
      queryClient.invalidateQueries({ queryKey: ["programs-list"] });
      toast.success("تم رفع الشواهد بنجاح");
    } catch (err) {
      toast.error(`تعذر رفع الصور: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  // حفظ التعديلات اليدوية
  async function handleSaveProgramEdit() {
    if (!editProgram) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("programs")
        .update({
          start_date: editProgram.start_date,
          end_date: editProgram.end_date,
          exec_status: editProgram.exec_status,
          summary: editProgram.summary,
        } as never)
        .eq("id", editProgram.id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["programs-list"] });
      toast.success("تم حفظ بيانات البرنامج");
      setEditProgram(null);
    } catch (err) {
      toast.error(`تعذر الحفظ: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  // أمر الطباعة A4
  function triggerPrint(program: ProgramItem) {
    setPrintProgram(program);
    setTimeout(() => {
      window.print();
    }, 300);
  }

  return (
    <div className="space-y-6 dir-rtl">
      {/* 1. Hero Card - ترويسة الصفحة بتصميم الداشبورد */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-6 text-primary-foreground shadow-xl shadow-primary/10 sm:p-8">
        <div className="absolute -left-12 -top-12 size-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -right-12 -bottom-12 size-48 rounded-full bg-black/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-xs font-medium backdrop-blur-md">
              <Sparkles className="size-3.5 text-amber-300" />
              <span>البرامج والأنشطة الإرشادية الوزارية</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-4xl">سجل خطة البرامج والتنفيذ</h1>
            <p className="text-xs font-medium text-primary-foreground/80 sm:text-sm">
              إضافة البرامج وتوثيق التقرير بالشواهد والطباعة بالكليشة الرسمية
            </p>
          </div>

          <Button
            onClick={() => setAddDialogOpen(true)}
            className="inline-flex h-12 items-center justify-center gap-2.5 rounded-2xl bg-white px-6 text-sm font-extrabold text-primary shadow-lg transition-all hover:scale-105 active:scale-95 border-0 hover:bg-white/90"
          >
            <Plus className="size-5" />
            <span>إضافة برنامج من الخطة الوزارية</span>
          </Button>
        </div>
      </div>

      {/* 2. قائمة البرامج المضافة */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-foreground">البرامج المدرجة بالسجل ({programs.length})</h2>
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center rounded-3xl border border-border/60 bg-card">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : programs.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/80 bg-card p-12 text-center">
            <BookOpen className="mx-auto size-12 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-bold text-muted-foreground">لا توجد برامج مضافة في السجل حالياً</p>
            <p className="text-xs text-muted-foreground">اضغط على زر "إضافة برنامج" للبدء في توثيق برامجك.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {programs.map((prog) => (
              <div
                key={prog.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border/60 bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-extrabold text-primary">
                      {prog.ptype || "برنامج وزارِي"}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        prog.exec_status === "مكتمل"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-amber-500/10 text-amber-600"
                      }`}
                    >
                      {prog.exec_status || "قيد التنفيذ"}
                    </span>
                  </div>

                  <h3 className="mt-3 text-base font-black text-foreground leading-snug">{prog.name}</h3>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    الفئة: {prog.target_group || "جميع الطلاب"}
                  </p>

                  <div className="mt-4 space-y-1.5 text-xs font-medium text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="size-3.5 text-primary" />
                      <span>الفترة: {toHijriDate(prog.start_date)} - {toHijriDate(prog.end_date)}</span>
                    </div>
                    {prog.evidence_images && prog.evidence_images.length > 0 && (
                      <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                        <ImageIcon className="size-3.5" />
                        <span>الشواهد: {prog.evidence_images.length} صورة مرفقة</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-2 border-t border-border/40 pt-4">
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditProgram(prog)}
                      className="h-8 rounded-xl text-xs font-bold"
                    >
                      <FileText className="size-3.5 ml-1" />
                      تعبئة وتقرير
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => triggerPrint(prog)}
                      className="h-8 rounded-xl text-xs font-bold"
                    >
                      <Printer className="size-3.5 ml-1" />
                      طباعة
                    </Button>
                  </div>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDeleteProgram(prog.id)}
                    className="size-8 rounded-xl text-rose-500 hover:bg-rose-500/10"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. نافذة إضافة برنامج وزارِي فردي */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">إضافة برنامج إرشادي وزارِي</DialogTitle>
            <DialogDescription className="text-xs">
              اختر البرنامج المطلوب توثيقه وحدد فترة التنفيذ للبدء.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">البرنامج الوزاري المعتمد</label>
              <select
                value={selectedMinistryProg}
                onChange={(e) => setSelectedMinistryProg(e.target.value)}
                className="w-full h-11 rounded-2xl border border-input bg-background px-3 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">-- اختر من البرامج الوزارية --</option>
                {MINISTRY_PROGRAMS.map((p) => (
                  <option key={`${p.term}-${p.week}-${p.name}`} value={p.name}>
                    [{p.term} - الأسبوع {p.week}] {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">تاريخ بداية البرنامج</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">تاريخ نهاية البرنامج</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} className="rounded-xl">
              إلغاء
            </Button>
            <Button onClick={handleAddProgram} disabled={busy} className="rounded-xl">
              {busy && <Loader2 className="size-4 animate-spin ml-2" />}
              إضافة البرنامج بالسجل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. نافذة تعديل وتعبئة التقرير والشواهد للبرنامج */}
      {editProgram && (
        <Dialog open={!!editProgram} onOpenChange={() => setEditProgram(null)}>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-3xl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-lg font-black">{editProgram.name}</DialogTitle>
              <DialogDescription className="text-xs">
                تعبئة بيانات التقرير وتوليده بالذكاء الاصطناعي ورفع صور الشواهد.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleAiGenerate(editProgram)}
                  disabled={aiGenerating}
                  className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90 font-bold"
                >
                  {aiGenerating ? <Loader2 className="size-4 animate-spin ml-1" /> : <Sparkles className="size-4 ml-1 text-amber-300" />}
                  توليد وتعبئة التقرير بالذكاء الاصطناعي
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">تاريخ البداية (هجري موثق)</label>
                  <input
                    type="date"
                    value={editProgram.start_date || ""}
                    onChange={(e) => setEditProgram({ ...editProgram, start_date: e.target.value })}
                    className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs"
                  />
                  <p className="text-[10px] text-primary font-bold">الهجري: {toHijriDate(editProgram.start_date)}</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">تاريخ النهاية (هجري موثق)</label>
                  <input
                    type="date"
                    value={editProgram.end_date || ""}
                    onChange={(e) => setEditProgram({ ...editProgram, end_date: e.target.value })}
                    className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs"
                  />
                  <p className="text-[10px] text-primary font-bold">الهجري: {toHijriDate(editProgram.end_date)}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">حالة التنفيذ</label>
                <select
                  value={editProgram.exec_status || "قيد التنفيذ"}
                  onChange={(e) => setEditProgram({ ...editProgram, exec_status: e.target.value })}
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs font-bold"
                >
                  <option value="قيد التنفيذ">قيد التنفيذ</option>
                  <option value="مكتمل">مكتمل</option>
                  <option value="مؤجل">مؤجل</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">ملخص تقرير التنفيذ والنتائج</label>
                <textarea
                  rows={4}
                  value={editProgram.summary || ""}
                  onChange={(e) => setEditProgram({ ...editProgram, summary: e.target.value })}
                  placeholder="اكتب التقرير أو استخدم زر الذكاء الاصطناعي بالفي أعلى..."
                  className="w-full rounded-2xl border border-input bg-background p-3 text-xs leading-relaxed"
                />
              </div>

              {/* قسم رفع الصور الشواهد */}
              <div className="space-y-2 border-t border-border/60 pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ImageIcon className="size-4 text-primary" />
                    شواهد التنفيذ (صور وفيديوهات)
                  </label>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1 text-xs font-bold text-primary hover:bg-primary/20">
                    <Upload className="size-3.5" />
                    <span>رفع صور جديدة</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, editProgram)}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2">
                  {editProgram.evidence_images && editProgram.evidence_images.length > 0 ? (
                    editProgram.evidence_images.map((img, idx) => (
                      <div key={idx} className="relative aspect-video overflow-hidden rounded-xl border border-border">
                        <img src={img} alt={`شاهد ${idx + 1}`} className="h-full w-full object-cover" />
                      </div>
                    ))
                  ) : (
                    <p className="col-span-3 text-center py-6 text-xs text-muted-foreground border border-dashed rounded-2xl">
                      لا توجد صور شواهد مرفقة بعد.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditProgram(null)} className="rounded-xl">
                إغلاق
              </Button>
              <Button onClick={handleSaveProgramEdit} disabled={busy} className="rounded-xl">
                {busy && <Loader2 className="size-4 animate-spin ml-2" />}
                حفظ التقرير
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 5. نموذج طباعة A4 محدد بالكليشة الرسمية */}
      {printProgram && (
        <div className="hidden print:block fixed inset-0 bg-white p-0 text-black z-50 dir-rtl" ref={printRef}>
          <style>{`
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            body {
              background: white !important;
              color: black !important;
            }
          `}</style>

          <div className="w-full h-full border-4 border-double border-gray-800 p-6 flex flex-col justify-between">
            {/* الكليشة الرسمية أعلى الورقة */}
            <div>
              <div className="flex items-center justify-between border-b-2 border-gray-800 pb-4 mb-6">
                <div className="text-right text-xs font-bold leading-relaxed">
                  <p>المملكة العربية السعودية</p>
                  <p>وزارة التعليم</p>
                  <p>الإدارة العامة للتعليم بمحافظة {school?.city || "المعنية"}</p>
                  <p>مدرسة: {school?.school_name || "المرحلة الدراسية"}</p>
                </div>

                <div className="text-center">
                  <div className="size-16 mx-auto mb-1 flex items-center justify-center border border-gray-400 rounded-full font-black text-sm">
                    رؤية 2030
                  </div>
                  <h2 className="text-base font-black">تقرير تنفيذ برنامج إرشادي</h2>
                </div>

                <div className="text-left text-xs font-bold leading-relaxed">
                  <p>الفصل الدراسي: {school?.semester || "الحالي"}</p>
                  <p>التاريخ الهجري: {toHijriDate(printProgram.start_date)}</p>
                  <p>المجال: {printProgram.domain || "المجال الإرشادي"}</p>
                </div>
              </div>

              {/* جدول تفاصيل البرنامج */}
              <table className="w-full border-collapse border border-gray-800 text-xs mb-6">
                <tbody>
                  <tr className="border-b border-gray-800">
                    <td className="w-1/4 border-l border-gray-800 bg-gray-100 p-2 font-black">عنوان البرنامج:</td>
                    <td className="w-3/4 p-2 font-bold" colSpan={3}>
                      {printProgram.name}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="border-l border-gray-800 bg-gray-100 p-2 font-black">الفئة المستهدفة:</td>
                    <td className="border-l border-gray-800 p-2">{printProgram.target_group || "جميع الطلاب"}</td>
                    <td className="border-l border-gray-800 bg-gray-100 p-2 font-black">تاريخ التنفيذ:</td>
                    <td className="p-2">
                      من {toHijriDate(printProgram.start_date)} إلى {toHijriDate(printProgram.end_date)}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="border-l border-gray-800 bg-gray-100 p-2 font-black">هدف البرنامج:</td>
                    <td className="p-2" colSpan={3}>
                      {printProgram.goal || "تعزيز القيم السلوكية والإرشادية لدى الطلاب"}
                    </td>
                  </tr>
                  <tr>
                    <td className="border-l border-gray-800 bg-gray-100 p-2 font-black">مؤشر التحقق:</td>
                    <td className="p-2" colSpan={3}>
                      {printProgram.indicator || "مشاركة الطلاب ورصد التقييمات"}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* ملخص تقرير التنفيذ */}
              <div className="mb-6 border border-gray-800 p-4 rounded-md">
                <h4 className="font-black text-xs mb-2 border-b border-gray-400 pb-1">تقرير التنفيذ والنتائج:</h4>
                <p className="text-xs leading-relaxed whitespace-pre-line">
                  {printProgram.summary || "تم تنفيذ البرنامج بنجاح وحقق المستهدفات المطلوبة."}
                </p>
              </div>

              {/* شواهد الصور */}
              {printProgram.evidence_images && printProgram.evidence_images.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-black text-xs mb-3">شواهد وصور التنفيذ:</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {printProgram.evidence_images.slice(0, 4).map((img, idx) => (
                      <div key={idx} className="h-36 border border-gray-400 rounded-md overflow-hidden">
                        <img src={img} alt={`شاهد ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* التوقيعات الرسمية في الأسفل */}
            <div className="flex items-center justify-between pt-8 border-t border-gray-800 text-xs font-black">
              <div className="text-center w-1/3">
                <p>الموجه الطلابي</p>
                <p className="mt-8">{school?.counselor_name || "عبدالمحسن بن مرزوق العتيبي"}</p>
                <p className="text-[10px] text-gray-500">التوقيع: .....................</p>
              </div>
              <div className="text-center w-1/3">
                <p>مدير المدرسة</p>
                <p className="mt-8">{school?.principal_name || "مدير المدرسة"}</p>
                <p className="text-[10px] text-gray-500">التوقيع والختم: .....................</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}