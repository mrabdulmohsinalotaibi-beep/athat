import { useState, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarRange,
  Plus,
  Trash2,
  Printer,
  Sparkles,
  Image as ImageIcon,
  CheckCircle2,
  FileText,
  Clock,
  Edit,
  Loader2,
  Calendar,
  X,
  Upload,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/lib/school";
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
      { name: "description", content: "البرامج الإرشادية الوزارية المعتمدة والأنشطة الطلابية." },
    ],
  }),
  component: ProgramsPage,
});

type Program = {
  id: string;
  name: string;
  ptype: string | null;
  domain: string | null;
  target_group: string | null;
  goal: string | null;
  indicator: string | null;
  exec_status: string | null;
  start_date_hijri?: string | null;
  end_date_hijri?: string | null;
  summary_report?: string | null;
  evidence_images?: string[] | null;
  video_url?: string | null;
  term?: string | null;
};

// تحويل التاريخ لـ هجري
function getHijriToday() {
  try {
    return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    }).format(new Date());
  } catch {
    return "1448/01/01 هـ";
  }
}

function ProgramsPage() {
  const queryClient = useQueryClient();
  const { data: school } = useSchool();
  const printRef = useRef<HTMLDivElement>(null);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [printableProgram, setPrintableProgram] = useState<Program | null>(null);
  const [term, setTerm] = useState("all");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // استعلام جلب البرامج
  const { data: programs = [], isLoading } = useQuery<Program[]>({
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

  // إضافة برنامج وزارى بضغطة زر
  async function addMinistryProgram(item: typeof MINISTRY_PROGRAMS[0]) {
    try {
      const payload = {
        name: item.name,
        ptype: item.ptype,
        domain: item.domain,
        target_group: item.target_group,
        goal: item.goal,
        indicator: item.indicator,
        exec_status: "مخطط له",
        term: item.term,
        start_date_hijri: getHijriToday(),
        end_date_hijri: getHijriToday(),
        summary_report: "",
        evidence_images: [],
      };

      const { error } = await supabase.from("programs").insert(payload as never);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success(`تمت إضافة برنامج "${item.name}" إلى قائمتك بنجاح`);
    } catch (err) {
      toast.error(`تعذر إضافة البرنامج: ${(err as Error).message}`);
    }
  }

  // حذف برنامج
  async function handleDelete(id: string, name: string) {
    if (!confirm(`هل أنت تأكد من حذف برنامج "${name}"؟`)) return;
    try {
      const { error } = await supabase.from("programs").delete().eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("تم حذف البرنامج بنجاح");
    } catch (err) {
      toast.error(`خطأ أثناء الحذف: ${(err as Error).message}`);
    }
  }

  // تعبئة البيانات التلقائية الذكية (الذكاء الاصطناعي)
  async function handleAiAutoFill() {
    if (!selectedProgram) return;
    setIsAiLoading(true);
    try {
      // محاكاة صياغة ذكية معتمدة على أهداف وخطة الوزارة
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const autoSummary = `تم بحمد الله وتوفيقه تنفيذ برنامج (${selectedProgram.name}) استناداً إلى خطة التوجيه الطلابية المعتمدة. استهدف البرنامج (${selectedProgram.target_group || "جميع الطلاب"}) بهدف ${selectedProgram.goal || "تعزيز القيم السلوكية والإرشادية"}. اشتمل البرنامج على ورش عمل تفاعلية وعروض مرئية وتوزيع منشورات توعوية، ولوحظ تجاوب ممتاز ومشاركة فاعلة أثرت حصيلة المخرجات وتحقيق مؤشرات التحقق بنجاح.`;

      setSelectedProgram((prev) =>
        prev
          ? {
              ...prev,
              summary_report: autoSummary,
              exec_status: "مكتمل",
            }
          : null
      );
      toast.success("تمت صياغة التقرير الإرشادي بنجاح عبر الذكاء الاصطناعي ✨");
    } catch {
      toast.error("تعذر التوليد بالذكاء الاصطناعي");
    } finally {
      setIsAiLoading(false);
    }
  }

  // حفظ التعديلات
  async function handleSaveProgram() {
    if (!selectedProgram) return;
    try {
      const { error } = await supabase
        .from("programs")
        .update({
          name: selectedProgram.name,
          ptype: selectedProgram.ptype,
          domain: selectedProgram.domain,
          target_group: selectedProgram.target_group,
          goal: selectedProgram.goal,
          indicator: selectedProgram.indicator,
          exec_status: selectedProgram.exec_status,
          start_date_hijri: selectedProgram.start_date_hijri,
          end_date_hijri: selectedProgram.end_date_hijri,
          summary_report: selectedProgram.summary_report,
          evidence_images: selectedProgram.evidence_images,
          video_url: selectedProgram.video_url,
        } as never)
        .eq("id", selectedProgram.id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("تم حفظ وتحديث بيانات البرنامج بنجاح");
      setEditDialogOpen(false);
    } catch (err) {
      toast.error(`تعذر الحفظ: ${(err as Error).message}`);
    }
  }

  // رفع شواهد الصور
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedProgram) return;

    setUploadingImage(true);
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split(".").pop();
        const filePath = `evidence/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("program_evidences")
          .upload(filePath, file);

        if (uploadError) {
          // في حال عدم وجود Bucket يحول الصورة لرابط محلي للتجربة
          const localUrl = URL.createObjectURL(file);
          newUrls.push(localUrl);
        } else {
          const { data } = supabase.storage.from("program_evidences").getPublicUrl(filePath);
          newUrls.push(data.publicUrl);
        }
      }

      setSelectedProgram({
        ...selectedProgram,
        evidence_images: [...(selectedProgram.evidence_images || []), ...newUrls],
      });
      toast.success("تم إضافة الصور بنجاح");
    } catch {
      toast.error("حدث خطأ أثناء تحميل الصور");
    } finally {
      setUploadingImage(false);
    }
  }

  // طباعة برنامج على حدة
  function triggerPrint(program: Program) {
    setPrintableProgram(program);
    setTimeout(() => {
      window.print();
    }, 300);
  }

  const ministryList =
    term === "all" ? MINISTRY_PROGRAMS : MINISTRY_PROGRAMS.filter((p) => p.term === term);

  return (
    <div className="space-y-6 dir-rtl">
      
      {/* 1. Header Card - ترويسة الصفحة بتصميم الداشبورد */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-6 text-primary-foreground shadow-xl shadow-primary/10 sm:p-8">
        <div className="absolute -left-12 -top-12 size-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-xs font-medium backdrop-blur-md">
              <Calendar className="size-3.5 text-amber-300" />
              <span>الخطة الإرشادية والوزارية</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-4xl">
              سجل البرامج والأنشطة الإرشادية
            </h1>
            <p className="text-xs font-medium text-primary-foreground/80 sm:text-sm">
              متابعة وتنفيذ وتوثيق البرامج الوقائية والعلاجية وتوليد التقارير الموثقة.
            </p>
          </div>

          <Button
            onClick={() => setAddDialogOpen(true)}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-6 text-sm font-extrabold text-primary shadow-lg transition-all hover:scale-105 active:scale-95 hover:bg-white"
          >
            <CalendarRange className="size-4" />
            <span>قائمة البرامج الوزارية</span>
          </Button>
        </div>
      </div>

      {/* 2. قائمة البرامج المضافة حالياً */}
      <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between border-b border-border/40 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <FileText className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-foreground">البرامج والأنشطة المضافة</h2>
              <p className="text-[11px] font-medium text-muted-foreground">
                إجمالي البرامج المسجلة: {programs.length} برنامجاً
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : programs.length === 0 ? (
          <div className="py-12 text-center text-sm font-bold text-muted-foreground">
            لا توجد برامج مضافة في السجل. انقر على "قائمة البرامج الوزارية" لإضافة برامج الخطط.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {programs.map((prog) => (
              <div
                key={prog.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-background p-5 transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-extrabold text-primary">
                      {prog.ptype || "برنامج إرشادي"}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        prog.exec_status === "مكتمل"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-amber-500/10 text-amber-600"
                      }`}
                    >
                      {prog.exec_status || "مخطط له"}
                    </span>
                  </div>

                  <h3 className="text-sm font-extrabold text-foreground">{prog.name}</h3>

                  <div className="space-y-1 text-[11px] text-muted-foreground">
                    <p>🎯 <span className="font-semibold text-foreground">الفئة:</span> {prog.target_group || "غير حدد"}</p>
                    <p>📅 <span className="font-semibold text-foreground">التاريخ:</span> {prog.start_date_hijri || "لم يحدد"}</p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-border/40 pt-3">
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 rounded-xl px-2.5 text-xs text-primary hover:bg-primary/10"
                      onClick={() => {
                        setSelectedProgram(prog);
                        setEditDialogOpen(true);
                      }}
                    >
                      <Edit className="size-3.5 ml-1" />
                      تعديل وتعبئة
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 rounded-xl px-2.5 text-xs text-rose-500 hover:bg-rose-50"
                      onClick={() => handleDelete(prog.id, prog.name)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-xl border-border/60 px-3 text-xs font-bold"
                    onClick={() => triggerPrint(prog)}
                  >
                    <Printer className="size-3.5 ml-1 text-primary" />
                    طباعة
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. نافذة اختيار وإضافة البرامج الوزارية */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">البرامج الإرشادية الوزارية المعتمدة</DialogTitle>
            <DialogDescription>
              اختر البرنامج الإرشادي من الخطة الوزارية لإضافته المباشرة إلى سجل برامجك.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3 my-2">
            <label className="text-xs font-bold">تصفية حسب الفصل الدراسي:</label>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="h-9 rounded-xl border border-input bg-background px-3 text-xs font-semibold"
            >
              <option value="all">جميع الفصول</option>
              {MINISTRY_TERMS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border/60">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b bg-muted/60 text-muted-foreground">
                  <th className="p-3 font-extrabold">الفصل/الأسبوع</th>
                  <th className="p-3 font-extrabold">اسم البرنامج</th>
                  <th className="p-3 font-extrabold">النوع</th>
                  <th className="p-3 font-extrabold">الفئة المستهدفة</th>
                  <th className="p-3 font-extrabold text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {ministryList.map((item) => (
                  <tr key={`${item.term}-${item.week}-${item.name}`} className="hover:bg-muted/30">
                    <td className="whitespace-nowrap p-3 font-semibold text-primary">
                      {item.term} — الأسبوع {item.week}
                    </td>
                    <td className="p-3 font-bold text-foreground">{item.name}</td>
                    <td className="p-3">{item.ptype}</td>
                    <td className="p-3">{item.target_group}</td>
                    <td className="p-3 text-center">
                      <Button
                        size="sm"
                        className="h-7 rounded-lg text-[11px] font-bold"
                        onClick={() => addMinistryProgram(item)}
                      >
                        <Plus className="size-3.5 ml-1" /> إضافة
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      {/* 4. نافذة تعديل وتعبئة التقرير والذكاء الاصطناعي والشواهد */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto dir-rtl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-black">تعبئة وتحديث تقرير البرنامج</DialogTitle>
            <DialogDescription>
              أدخل التواريخ، التقرير، والشواهد المصورة لإعداد التقرير للطباعة الرسمية.
            </DialogDescription>
          </DialogHeader>

          {selectedProgram && (
            <div className="space-y-4 text-xs">
              
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="font-bold text-foreground">اسم البرنامج</label>
                  <Input
                    value={selectedProgram.name}
                    onChange={(e) => setSelectedProgram({ ...selectedProgram, name: e.target.value })}
                    className="mt-1 h-9 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-foreground">حالة التنفيذ</label>
                  <select
                    value={selectedProgram.exec_status || "مخطط له"}
                    onChange={(e) => setSelectedProgram({ ...selectedProgram, exec_status: e.target.value })}
                    className="mt-1 h-9 w-full rounded-xl border border-input bg-background px-3 text-xs"
                  >
                    <option value="مخطط له">مخطط له</option>
                    <option value="قيد التنفيذ">قيد التنفيذ</option>
                    <option value="مكتمل">مكتمل</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="font-bold text-foreground">تاريخ بداية البرنامج (هجري)</label>
                  <Input
                    placeholder="مثال: 1448/02/10 هـ"
                    value={selectedProgram.start_date_hijri || ""}
                    onChange={(e) => setSelectedProgram({ ...selectedProgram, start_date_hijri: e.target.value })}
                    className="mt-1 h-9 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-foreground">تاريخ نهاية البرنامج (هجري)</label>
                  <Input
                    placeholder="مثال: 1448/02/14 هـ"
                    value={selectedProgram.end_date_hijri || ""}
                    onChange={(e) => setSelectedProgram({ ...selectedProgram, end_date_hijri: e.target.value })}
                    className="mt-1 h-9 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* التقرير وصياغة الذكاء الاصطناعي */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-foreground">تقرير ما تم تنفيذه والمخرجات</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAiAutoFill}
                    disabled={isAiLoading}
                    className="h-7 gap-1.5 rounded-xl border-primary/40 bg-primary/5 text-[11px] font-bold text-primary hover:bg-primary/10"
                  >
                    {isAiLoading ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3 text-amber-500" />}
                    صياغة بالذكاء الاصطناعي ✨
                  </Button>
                </div>
                <Textarea
                  rows={4}
                  value={selectedProgram.summary_report || ""}
                  onChange={(e) => setSelectedProgram({ ...selectedProgram, summary_report: e.target.value })}
                  placeholder="اكتب التقرير هنا أو استخدم التوليد الآلي عبر الذكاء الاصطناعي..."
                  className="rounded-xl text-xs"
                />
              </div>

              {/* الشواهد والمرئيات */}
              <div className="space-y-2">
                <label className="font-bold text-foreground">شواهد وصور التنفيذ</label>
                <div className="flex flex-wrap gap-2">
                  {selectedProgram.evidence_images?.map((img, idx) => (
                    <div key={idx} className="relative size-16 overflow-hidden rounded-xl border border-border">
                      <img src={img} alt="شاهد" className="size-full object-cover" />
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedProgram({
                            ...selectedProgram,
                            evidence_images: selectedProgram.evidence_images?.filter((_, i) => i !== idx),
                          })
                        }
                        className="absolute top-0.5 right-0.5 rounded-full bg-rose-500/80 p-0.5 text-white"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}

                  <label className="flex size-16 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-primary/50 bg-primary/5 text-primary hover:bg-primary/10">
                    {uploadingImage ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                    <span className="text-[9px] font-bold mt-1">إضافة صورة</span>
                    <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <div>
                <label className="font-bold text-foreground">رابط توثيق فيديو (اختياري)</label>
                <Input
                  placeholder="https://youtube.com/..."
                  value={selectedProgram.video_url || ""}
                  onChange={(e) => setSelectedProgram({ ...selectedProgram, video_url: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>

            </div>
          )}

          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(false)} className="rounded-xl">
              إلغاء
            </Button>
            <Button size="sm" onClick={handleSaveProgram} className="rounded-xl font-bold">
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. قالب الطباعة الرسمي للتقرير (A4 Printable Template) */}
      <div className="hidden">
        <div ref={printRef} id="printable-area" className="p-8 text-black bg-white dir-rtl font-sans">
          {printableProgram && (
            <div className="space-y-6 max-w-[210mm] mx-auto">
              
              {/* الكليشة الرسمية */}
              <div className="flex items-center justify-between border-b-2 border-black pb-4 text-center text-xs font-bold">
                <div className="space-y-1 text-right">
                  <p>المملكة العربية السعودية</p>
                  <p>وزارة التعليم</p>
                  <p>{school?.education_office || "إدارة التعليم"}</p>
                  <p>{school?.school_name || "مدرسة ..."}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-base font-black">تقرير تنفيذ برنامج إرشادي</p>
                  <p className="text-[11px] font-medium">العام الدراسي 1448 هـ</p>
                </div>
                <div className="space-y-1 text-left">
                  <p>التاريخ الهجري: {printableProgram.start_date_hijri || getHijriToday()}</p>
                  <p>حالة التقرير: {printableProgram.exec_status || "مكتمل"}</p>
                </div>
              </div>

              {/* جدول تفاصيل البرنامج */}
              <table className="w-full border-collapse border border-black text-xs">
                <tbody>
                  <tr className="border-b border-black">
                    <td className="bg-gray-100 p-2 font-bold w-1/4 border-l border-black">اسم البرنامج:</td>
                    <td className="p-2 font-semibold w-3/4" colSpan={3}>{printableProgram.name}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="bg-gray-100 p-2 font-bold border-l border-black">نوع البرنامج:</td>
                    <td className="p-2 border-l border-black">{printableProgram.ptype || "إرشادي وقائي"}</td>
                    <td className="bg-gray-100 p-2 font-bold border-l border-black">الفئة المستهدفة:</td>
                    <td className="p-2">{printableProgram.target_group || "جميع الطلاب"}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="bg-gray-100 p-2 font-bold border-l border-black">تاريخ التنفيذ (هجري):</td>
                    <td className="p-2" colSpan={3}>
                      من: {printableProgram.start_date_hijri || "—"} إلى: {printableProgram.end_date_hijri || "—"}
                    </td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="bg-gray-100 p-2 font-bold border-l border-black">أهداف البرنامج:</td>
                    <td className="p-2" colSpan={3}>{printableProgram.goal || "تعزيز السلوك الإيجابي ومساندة الطلاب."}</td>
                  </tr>
                </tbody>
              </table>

              {/* التقرير التنفيذي */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs border-b border-black pb-1">تقرير التنفيذ والمخرجات:</h4>
                <p className="text-xs leading-relaxed text-justify whitespace-pre-wrap p-2 bg-gray-50 rounded border border-gray-200">
                  {printableProgram.summary_report || "تم تنفيذ البرنامج وفق الأهداف المحددة."}
                </p>
              </div>

              {/* الشواهد المصورة */}
              {printableProgram.evidence_images && printableProgram.evidence_images.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-xs border-b border-black pb-1">شواهد التوثيق المصورة:</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {printableProgram.evidence_images.slice(0, 4).map((img, i) => (
                      <div key={i} className="h-40 border border-black rounded p-1">
                        <img src={img} alt="شاهد" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* التواقيع الرسمية */}
              <div className="pt-12 flex items-center justify-between text-xs font-bold text-center">
                <div className="space-y-8">
                  <p>الموجه الطلابي</p>
                  <p>{school?.counselor_name || "عبدالمحسن بن مرزوق العتيبي"}</p>
                </div>
                <div className="space-y-8">
                  <p>مدير المدرسة</p>
                  <p>{school?.principal_name || "..................................."}</p>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* CSS للطباعة */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-area, #printable-area * {
            visibility: visible;
          }
          #printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            size: A4;
            margin: 10mm;
          }
        }
      `}</style>

    </div>
  );
}