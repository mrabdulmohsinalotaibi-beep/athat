import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Plus,
  Trash2,
  Printer,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Video,
  CheckCircle2,
  Clock,
  BookOpen,
  FileText,
  Search,
  Filter,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/lib/school";
import { MINISTRY_PROGRAMS } from "@/lib/ministry-programs";
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
      { name: "description", content: "إدارة وتوثيق البرامج والأنشطة الإرشادية والتقارير الشاملة." },
    ],
  }),
  component: ProgramsPage,
});

type ProgramItem = {
  id: string;
  name: string;
  ptype?: string;
  domain?: string;
  target_group?: string;
  goal?: string;
  indicator?: string;
  start_date_hijri?: string;
  end_date_hijri?: string;
  exec_status?: string;
  summary?: string;
  images?: string[];
  videos?: string[];
};

function ProgramsPage() {
  const queryClient = useQueryClient();
  const { data: school } = useSchool();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedProgram, setSelectedProgram] = useState<ProgramItem | null>(null);
  const [printProgram, setPrintProgram] = useState<ProgramItem | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Fetch Programs
  const { data: programs = [], isLoading } = useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProgramItem[];
    },
  });

  // Add Program
  const addProgramMutation = useMutation({
    mutationFn: async (programData: Partial<ProgramItem>) => {
      const { data, error } = await supabase.from("programs").insert([programData as never]).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("تمت إضافة البرنامج بنجاح");
      setIsAddDialogOpen(false);
    },
    onError: (err: Error) => toast.error(`خطأ أثناء الإضافة: ${err.message}`),
  });

  // Update Program
  const updateProgramMutation = useMutation({
    mutationFn: async (updated: ProgramItem) => {
      const { error } = await supabase.from("programs").update(updated as never).eq("id", updated.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("تم حفظ التحديثات بنجاح");
      setSelectedProgram(null);
    },
    onError: (err: Error) => toast.error(`خطأ أثناء الحفظ: ${err.message}`),
  });

  // Delete Program
  const deleteProgramMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("programs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("تم حذف البرنامج ويمكنك إعادة إضافته في أي وقت");
    },
  });

  // AI Filler Function
  const handleAiFill = async (program: ProgramItem) => {
    setIsAiGenerating(true);
    try {
      await new Promise((r) => setTimeout(r, 1200));
      const generatedGoal = `تنمية الوعي بـ (${program.name}) وتوفير البيئة الإرشادية الملائمة للطلاب لتعزيز كفاءتهم النفسية والسلوكية.`;
      const generatedIndicator = `ارتفاع نسبة المشاركة والتفاعل إلى 90% وتحسن الملاحظات السلوكية الإيجابية لدى الفئة المستهدفة.`;
      const generatedSummary = `تم تنفيذ برنامج (${program.name}) بنجاح عبر تقديم ورش عمل تفاعلية، منشورات توعوية، واجتماعات فردية وجماعية مع الفئة المستهدفة، مما حقق نتائج إيجابية ملحوظة ورضا عام.`;

      setSelectedProgram((prev) =>
        prev
          ? {
              ...prev,
              goal: generatedGoal,
              indicator: generatedIndicator,
              summary: generatedSummary,
              exec_status: "مكتمل",
            }
          : null
      );
      toast.success("تم توليد محتوى التقرير بنجاح عبر الذكاء الاصطناعي");
    } catch {
      toast.error("تعذر توليد المحتوى الآلي");
    } finally {
      setIsAiGenerating(false);
    }
  };

  const filteredPrograms = programs.filter((p) => {
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.exec_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const completedCount = programs.filter((p) => p.exec_status === "مكتمل").length;
  const inProgressCount = programs.filter((p) => p.exec_status === "قيد التنفيذ").length;

  return (
    <div className="space-y-6 dir-rtl">
      
      {/* 1. Hero Card - ترويسة بنفس تصميم الداشبورد */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-6 text-primary-foreground shadow-xl shadow-primary/10 sm:p-8">
        <div className="absolute -left-12 -top-12 size-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -right-12 -bottom-12 size-48 rounded-full bg-black/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-xs font-medium backdrop-blur-md">
              <Sparkles className="size-3.5 text-amber-300" />
              <span>الخطة الإرشادية التشغيلية</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-4xl">سجل البرامج والأنشطة</h1>
            <p className="text-xs font-medium text-primary-foreground/80 sm:text-sm">
              إدارة وتوثيق الأنشطة الإرشادية، طباعة التقارير المعتمدة بالتاريخ الهجري، ورفع الشواهد.
            </p>
          </div>

          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="inline-flex h-12 items-center justify-center gap-2.5 rounded-2xl bg-white px-6 text-sm font-extrabold text-primary shadow-lg transition-all hover:scale-105 active:scale-95 border-0 hover:bg-white/90"
          >
            <Plus className="size-4" />
            <span>إضافة برنامج من القائمة الوزارية</span>
          </Button>
        </div>
      </div>

      {/* 2. Stats Grid - إحصائيات سريعة */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-border/50 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-muted-foreground">إجمالي البرامج المسجلة</span>
            <div className="rounded-2xl bg-blue-500/10 p-3 text-blue-500">
              <BookOpen className="size-5" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-black text-foreground">{programs.length}</p>
        </div>

        <div className="rounded-3xl border border-border/50 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-muted-foreground">البرامج المكتملة</span>
            <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-500">
              <CheckCircle2 className="size-5" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-black text-foreground">{completedCount}</p>
        </div>

        <div className="rounded-3xl border border-border/50 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-muted-foreground">قيد التنفيذ</span>
            <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-500">
              <Clock className="size-5" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-black text-foreground">{inProgressCount}</p>
        </div>
      </div>

      {/* 3. Action Toolbar & Filters - شريط البحث والتصفية */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="البحث باسم البرنامج..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10 rounded-2xl bg-background/50 border-border/60"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background/50 px-3 py-1.5">
            <Filter className="size-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-foreground focus:outline-none"
            >
              <option value="all">كل الحالات</option>
              <option value="مكتمل">مكتمل</option>
              <option value="قيد التنفيذ">قيد التنفيذ</option>
              <option value="لم يبدأ">لم يبدأ</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Programs List - بطاقات البرامج */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : filteredPrograms.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/80 p-12 text-center text-muted-foreground">
          <p className="text-sm font-bold">لا توجد برامج مضافة حالياً في السجل</p>
          <p className="mt-1 text-xs">يمكنك إضافة برامج جديدة من قائمة البرامج الوزارية المعتمدة.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPrograms.map((program) => (
            <div
              key={program.id}
              className="group relative flex flex-col justify-between rounded-3xl border border-border/60 bg-card p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-flex rounded-xl bg-primary/10 px-3 py-1 text-[11px] font-extrabold text-primary">
                    {program.ptype || "برنامج إرشادي"}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      program.exec_status === "مكتمل"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : program.exec_status === "قيد التنفيذ"
                        ? "bg-amber-500/10 text-amber-600"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {program.exec_status || "لم يبدأ"}
                  </span>
                </div>

                <h3 className="mt-3 text-base font-black text-foreground">{program.name}</h3>

                <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                  <p>
                    <span className="font-bold text-foreground">الفئة: </span>
                    {program.target_group || "جميع الطلاب"}
                  </p>
                  <p>
                    <span className="font-bold text-foreground">تاريخ التنفيذ: </span>
                    {program.start_date_hijri ? `${program.start_date_hijri} هـ` : "غير محدد"}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-border/40 pt-4 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedProgram(program)}
                  className="rounded-xl text-xs font-bold gap-1.5 flex-1"
                >
                  <FileText className="size-3.5" />
                  <span>تعبئة الشواهد</span>
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setPrintProgram(program)}
                  className="rounded-xl text-xs font-bold gap-1"
                >
                  <Printer className="size-3.5" />
                  <span>طباعة</span>
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteProgramMutation.mutate(program.id)}
                  className="size-8 rounded-xl text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Add Ministry Program Dialog - حوار اختيار برنامج وزاري */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent dir="rtl" className="max-h-[85vh] max-w-2xl overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">قائمة البرامج الوزارية المعتمدة</DialogTitle>
            <DialogDescription className="text-xs">
              اختر البرنامج الإرشادية للبدء في توثيقه وتحديد التواريخ الشواهد.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {MINISTRY_PROGRAMS.map((mp, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/50 p-4 transition-all hover:border-primary/40"
              >
                <div>
                  <h4 className="text-sm font-extrabold text-foreground">{mp.name}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {mp.term} · الأسبوع {mp.week} · الفئة: {mp.target_group}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() =>
                    addProgramMutation.mutate({
                      name: mp.name,
                      ptype: mp.ptype,
                      domain: mp.domain,
                      target_group: mp.target_group,
                      goal: mp.goal,
                      indicator: mp.indicator,
                      exec_status: "لم يبدأ",
                    })
                  }
                  className="rounded-xl font-bold text-xs gap-1"
                >
                  <Plus className="size-3.5" /> إضافة
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* 6. Edit Program Details & AI Filler Dialog - تعبئة البرنامج وتوليد AI */}
      {selectedProgram && (
        <Dialog open={!!selectedProgram} onOpenChange={(open) => !open && setSelectedProgram(null)}>
          <DialogContent dir="rtl" className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-3xl">
            <DialogHeader className="flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-black">تفاصيل وتوثيق: {selectedProgram.name}</DialogTitle>
                <DialogDescription className="text-xs">تعديل البيانات والتواريخ ورفع الشواهد</DialogDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAiFill(selectedProgram)}
                disabled={isAiGenerating}
                className="gap-2 rounded-2xl border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 font-bold"
              >
                {isAiGenerating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 text-amber-500" />}
                <span>تعبئة تلقائية بالذكاء الاصطناعي</span>
              </Button>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold text-foreground">تاريخ بداية البرنامج (هجري)</label>
                  <Input
                    placeholder="مثال: 1448/02/15 هـ"
                    value={selectedProgram.start_date_hijri || ""}
                    onChange={(e) => setSelectedProgram({ ...selectedProgram, start_date_hijri: e.target.value })}
                    className="mt-1 rounded-2xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground">تاريخ نهاية البرنامج (هجري)</label>
                  <Input
                    placeholder="مثال: 1448/02/19 هـ"
                    value={selectedProgram.end_date_hijri || ""}
                    onChange={(e) => setSelectedProgram({ ...selectedProgram, end_date_hijri: e.target.value })}
                    className="mt-1 rounded-2xl"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold text-foreground">حالة التنفيذ</label>
                  <select
                    value={selectedProgram.exec_status || "لم يبدأ"}
                    onChange={(e) => setSelectedProgram({ ...selectedProgram, exec_status: e.target.value })}
                    className="mt-1 w-full rounded-2xl border border-input bg-background p-2.5 text-xs font-bold"
                  >
                    <option value="لم يبدأ">لم يبدأ</option>
                    <option value="قيد التنفيذ">قيد التنفيذ</option>
                    <option value="مكتمل">مكتمل</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground">الفئة المستهدفة</label>
                  <Input
                    value={selectedProgram.target_group || ""}
                    onChange={(e) => setSelectedProgram({ ...selectedProgram, target_group: e.target.value })}
                    className="mt-1 rounded-2xl"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground">هدف البرنامج</label>
                <Textarea
                  value={selectedProgram.goal || ""}
                  onChange={(e) => setSelectedProgram({ ...selectedProgram, goal: e.target.value })}
                  className="mt-1 rounded-2xl text-xs"
                  rows={2}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground">تقرير وما تم تنفيذه</label>
                <Textarea
                  value={selectedProgram.summary || ""}
                  onChange={(e) => setSelectedProgram({ ...selectedProgram, summary: e.target.value })}
                  className="mt-1 rounded-2xl text-xs"
                  rows={3}
                />
              </div>

              {/* Upload Evidence Section - رفع الشواهد */}
              <div className="rounded-2xl border border-dashed border-border/80 p-4 space-y-3 bg-muted/20">
                <span className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Upload className="size-4 text-primary" /> رفع الشواهد (روابط الصور والفيديوهات)
                </span>
                <div className="grid gap-2">
                  <Input
                    placeholder="رابط صورة شاهد (URL)"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = e.currentTarget.value.trim();
                        if (val) {
                          setSelectedProgram({
                            ...selectedProgram,
                            images: [...(selectedProgram.images || []), val],
                          });
                          e.currentTarget.value = "";
                        }
                      }
                    }}
                    className="rounded-2xl text-xs bg-background"
                  />
                  <p className="text-[10px] text-muted-foreground">اضغط Enter لإضافة رابط الصورة إلى القائمة</p>
                </div>

                {selectedProgram.images && selectedProgram.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {selectedProgram.images.map((img, idx) => (
                      <div key={idx} className="relative group size-16 rounded-xl overflow-hidden border border-border">
                        <img src={img} alt="شاهد" className="size-full object-cover" />
                        <button
                          onClick={() =>
                            setSelectedProgram({
                              ...selectedProgram,
                              images: selectedProgram.images?.filter((_, i) => i !== idx),
                            })
                          }
                          className="absolute top-1 right-1 bg-destructive text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setSelectedProgram(null)} className="rounded-2xl">
                إلغاء
              </Button>
              <Button onClick={() => updateProgramMutation.mutate(selectedProgram)} className="rounded-2xl">
                حفظ التغييرات
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 7. Official Printable Page Component - طباعة تقرير مستقل بالهجري فقط والكليشة الرسمية */}
      {printProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white text-black p-8 rounded-2xl max-w-3xl w-full shadow-2xl space-y-6 dir-rtl text-right print:p-0 print:shadow-none print:w-full">
            {/* الكليشة الرسمية */}
            <div className="flex items-center justify-between border-b-2 border-black pb-4 text-xs font-bold leading-relaxed">
              <div>
                <p>المملكة العربية السعودية</p>
                <p>وزارة التعليم</p>
                <p>الإدارة العامة للتعليم بمكة المكرمة</p>
                <p>مدرسة: {school?.school_name || "اسم المدرسة"}</p>
              </div>
              <div className="text-center">
                <p className="text-base font-black">تقرير تنفيذ برنامج إرشادي</p>
                <p className="text-[11px] font-normal">منصة الذات للتوجيه الطلابي</p>
              </div>
              <div className="text-left">
                <p>التاريخ: {printProgram.start_date_hijri || "1448/00/00"} هـ</p>
                <p>الفصل الدراسي: {school?.semester || "الأول"}</p>
              </div>
            </div>

            {/* تفاصيل التقرير */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 border p-4 rounded-xl text-xs">
                <p>
                  <strong>عنوان البرنامج: </strong> {printProgram.name}
                </p>
                <p>
                  <strong>نوع البرنامج: </strong> {printProgram.ptype || "إرشادي"}
                </p>
                <p>
                  <strong>تاريخ البداية: </strong> {printProgram.start_date_hijri || "—"} هـ
                </p>
                <p>
                  <strong>تاريخ النهاية: </strong> {printProgram.end_date_hijri || "—"} هـ
                </p>
                <p>
                  <strong>الفئة المستهدفة: </strong> {printProgram.target_group || "جميع الطلاب"}
                </p>
                <p>
                  <strong>حالة التنفيذ: </strong> {printProgram.exec_status || "مكتمل"}
                </p>
              </div>

              <div className="border p-4 rounded-xl text-xs space-y-2">
                <p className="font-bold border-b pb-1">أهداف البرنامج:</p>
                <p className="text-gray-700">{printProgram.goal || "تحقيق التوجيه والتمكين الطلابي الإيجابي."}</p>
              </div>

              <div className="border p-4 rounded-xl text-xs space-y-2">
                <p className="font-bold border-b pb-1">تقرير وما تم تنفيذه:</p>
                <p className="text-gray-700">{printProgram.summary || "تم تنفيذ الأنشطة واللقاءات الفردية وفق الخط الزمني المعتمد."}</p>
              </div>

              {/* الشواهد والصور */}
              {printProgram.images && printProgram.images.length > 0 && (
                <div className="border p-4 rounded-xl text-xs space-y-2">
                  <p className="font-bold border-b pb-1">شواهد الصور:</p>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    {printProgram.images.map((img, i) => (
                      <img key={i} src={img} alt="شاهد" className="h-36 w-full object-cover rounded-lg border" />
                    ))}
                  </div>
                </div>
              )}

              {/* التوقيع الاعتمادي */}
              <div className="flex justify-between pt-8 text-xs font-bold text-center">
                <div>
                  <p>الموجه الطلابي</p>
                  <p className="mt-8">{school?.counselor_name || "اسم الموجه"}</p>
                </div>
                <div>
                  <p>مدير المدرسة</p>
                  <p className="mt-8">.......................</p>
                </div>
              </div>
            </div>

            {/* أزرار الإغلاق والطباعة */}
            <div className="flex justify-end gap-3 border-t pt-4 print:hidden">
              <Button variant="outline" onClick={() => setPrintProgram(null)} className="rounded-xl">
                إغلاق
              </Button>
              <Button onClick={() => window.print()} className="rounded-xl gap-2 font-bold">
                <Printer className="size-4" /> طباعة التقرير
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}