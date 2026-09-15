import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
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
  BookOpen,
  Video,
  CheckCircle2,
  X,
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
      {
        name: "description",
        content:
          "إدارة وتوثيق البرامج الإرشادية والأنشطة الوزارية بالشهادات والشواهد.",
      },
    ],
  }),
  component: ProgramsPage,
});

// ============ ثوابت ومساعدة ============
const HIJRI_FORMATTER = new Intl.DateTimeFormat(
  "ar-SA-u-ca-islamic-umalqura",
  {
    day: "numeric",
    month: "long",
    year: "numeric",
  }
);

const MAX_IMAGE_SIZE_MB = 5;
const MAX_VIDEO_SIZE_MB = 50;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const STORAGE_BUCKET = "programs-evidence";

// تحويل التاريخ حصراً إلى الهجري المعتمد (أم القرى)
function toHijriDate(dateStr?: string) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return HIJRI_FORMATTER.format(d);
  } catch {
    return dateStr;
  }
}

function validateFile(file: File, type: "image" | "video"): string | null {
  const allowed = type === "image" ? ALLOWED_IMAGE_TYPES : ALLOWED_VIDEO_TYPES;
  const maxMB = type === "image" ? MAX_IMAGE_SIZE_MB : MAX_VIDEO_SIZE_MB;

  if (!allowed.includes(file.type)) {
    return `نوع الملف غير مدعوم: ${file.name} (${file.type || "غير معروف"})`;
  }
  if (file.size > maxMB * 1024 * 1024) {
    return `حجم الملف ${file.name} يتجاوز الحد الأقصى (${maxMB}MB)`;
  }
  return null;
}

export type ProgramItem = {
  id: string;
  school_id?: string;
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
  evidence_videos?: string[];
  created_at?: string;
};

// ============ المكوّن الرئيسي ============
function ProgramsPage() {
  const queryClient = useQueryClient();
  const { data: school } = useSchool();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState("all");
  const [selectedMinistryProg, setSelectedMinistryProg] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [editProgram, setEditProgram] = useState<ProgramItem | null>(null);
  const [printProgram, setPrintProgram] = useState<ProgramItem | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  // ============ جلب البرامج (مفلتر حسب المدرسة) ============
  const {
    data: programs = [],
    isLoading,
  } = useQuery({
    queryKey: ["programs-list", school?.id],
    enabled: !!school?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .eq("school_id", school!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProgramItem[];
    },
  });

  // ============ فلترة قائمة البرامج الوزارية ============
  const ministryList = useMemo(
    () =>
      selectedTerm === "all"
        ? MINISTRY_PROGRAMS
        : MINISTRY_PROGRAMS.filter((p) => p.term === selectedTerm),
    [selectedTerm]
  );

  // ============ Mutations ============
  const addProgramMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { error } = await supabase.from("programs").insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs-list"] });
      toast.success("تمت إضافة البرنامج بنجاح إلى السجل");
      setAddDialogOpen(false);
      setSelectedMinistryProg("");
      setStartDate("");
      setEndDate("");
    },
    onError: (err: Error) => {
      toast.error(`تعذر إضافة البرنامج: ${err.message}`);
    },
  });

  const deleteProgramMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("programs").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({
        queryKey: ["programs-list", school?.id],
      });
      const previous = queryClient.getQueryData<ProgramItem[]>([
        "programs-list",
        school?.id,
      ]);
      queryClient.setQueryData<ProgramItem[]>(
        ["programs-list", school?.id],
        (old) => (old ?? []).filter((p) => p.id !== id)
      );
      return { previous };
    },
    onError: (err: Error, _id, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(
          ["programs-list", school?.id],
          ctx.previous
        );
      }
      toast.error(`تعذر الحذف: ${err.message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["programs-list"] });
    },
    onSuccess: () => {
      toast.success("تم حذف البرنامج بنجاح");
    },
  });

  const saveEditMutation = useMutation({
    mutationFn: async (program: ProgramItem) => {
      const { error } = await supabase
        .from("programs")
        .update({
          start_date: program.start_date,
          end_date: program.end_date,
          exec_status: program.exec_status,
          summary: program.summary,
        })
        .eq("id", program.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs-list"] });
      toast.success("تم حفظ تفاصيل البرنامج بنجاح");
      setEditProgram(null);
    },
    onError: (err: Error) => {
      toast.error(`تعذر الحفظ: ${err.message}`);
    },
  });

  // ============ إضافة برنامج واحد ============
  const handleAddSingleProgram = useCallback(() => {
    if (!school?.id) {
      toast.error("لم يتم تحميل بيانات المدرسة");
      return;
    }
    if (!selectedMinistryProg) {
      toast.error("يرجى اختيار برنامج من القائمة الوزارية");
      return;
    }
    const found = MINISTRY_PROGRAMS.find(
      (p) => p.name === selectedMinistryProg
    );
    if (!found) return;

    const payload = {
      school_id: school.id,
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
      summary: `برنامج إرشادي وزاري موجه لـ ${found.target_group} وفق خطة الوزارة بهدف ${found.goal}.`,
      evidence_images: [],
      evidence_videos: [],
    };

    addProgramMutation.mutate(payload);
  }, [
    school?.id,
    selectedMinistryProg,
    startDate,
    endDate,
    addProgramMutation,
  ]);

  // ============ حذف برنامج ============
  const handleDeleteProgram = useCallback(
    (id: string) => {
      if (
        !window.confirm(
          "هل أنت متأكد من حذف هذا البرنامج نهائياً من السجل؟"
        )
      )
        return;
      deleteProgramMutation.mutate(id);
    },
    [deleteProgramMutation]
  );

  // ============ توليد نص التقرير (قالب ذكي بدل الـ AI الوهمي) ============
  const handleGenerateTemplate = useCallback(
    async (program: ProgramItem) => {
      if (aiGenerating) return;
      setAiGenerating(true);
      try {
        const template = [
          `تم تنفيذ برنامج (${program.name}) المدرج ضمن خطة الأنشطة والبرامج الإرشادية الوزارية المعتمدة،`,
          `والموجه خصيصاً لفئة (${program.target_group || "جميع الطلاب"}).`,
          `استهدف البرنامج تحقيق: ${program.goal || "توجيه سلوكي ومهاري"}.`,
          `وقد أظهر الطلاب تفاعلاً إيجابياً ملحوظاً، وتم قياس الأثر وتحقق مؤشر التحقق المعتمد:`,
          `[${program.indicator || "رصد التفاعل والنتائج الإيجابية"}] بنسبة نجاح عالية.`,
          `\n(يمكن تعديل هذا النص يدوياً قبل الحفظ.)`,
        ].join(" ");

        const next = {
          ...program,
          summary: template,
          exec_status: "مكتمل",
        };

        const { error } = await supabase
          .from("programs")
          .update({ summary: template, exec_status: "مكتمل" })
          .eq("id", program.id);
        if (error) throw error;

        setEditProgram(next);
        queryClient.invalidateQueries({ queryKey: ["programs-list"] });
        toast.success("تم توليد مسودة التقرير بنجاح");
      } catch (err) {
        toast.error(`خطأ أثناء التوليد: ${(err as Error).message}`);
      } finally {
        setAiGenerating(false);
      }
    },
    [aiGenerating, queryClient]
  );

  // ============ رفع الشواهد عبر Supabase Storage ============
  const uploadEvidenceMutation = useMutation({
    mutationFn: async ({
      program,
      type,
      files,
    }: {
      program: ProgramItem;
      type: "image" | "video";
      files: File[];
    }) => {
      const currentList =
        type === "image"
          ? [...(program.evidence_images || [])]
          : [...(program.evidence_videos || [])];

      // تحقق مسبق
      const errors: string[] = [];
      const validFiles: File[] = [];
      files.forEach((f) => {
        const err = validateFile(f, type);
        if (err) errors.push(err);
        else validFiles.push(f);
      });
      if (errors.length > 0) {
        toast.error(errors.join(" • "));
      }
      if (validFiles.length === 0) return null;

      const folder = `${school?.id ?? "unknown"}/programs/${program.id}`;

      // رفع متوازٍ
      const results = await Promise.all(
        validFiles.map(async (file) => {
          const ext = file.name.split(".").pop() || "";
          const path = `${folder}/${crypto.randomUUID()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(path, file, {
              cacheControl: "3600",
              upsert: false,
            });
          if (upErr) throw upErr;
          const { data: urlData } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(path);
          return urlData.publicUrl;
        })
      );

      const newList = [...currentList, ...results];
      const updatePayload =
        type === "image"
          ? { evidence_images: newList }
          : { evidence_videos: newList };

      const { error } = await supabase
        .from("programs")
        .update(updatePayload)
        .eq("id", program.id);
      if (error) throw error;

      return { updatePayload, newList };
    },
    onSuccess: (res) => {
      if (!res) return;
      setEditProgram((prev) =>
        prev ? { ...prev, ...res.updatePayload } : null
      );
      queryClient.invalidateQueries({ queryKey: ["programs-list"] });
      toast.success("تم إرفاق الشواهد بنجاح");
    },
    onError: (err: Error) => {
      toast.error(`تعذر رفع الملفات: ${err.message}`);
    },
  });

  const handleFileUpload = useCallback(
    (
      e: React.ChangeEvent<HTMLInputElement>,
      program: ProgramItem,
      type: "image" | "video"
    ) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      uploadEvidenceMutation.mutate({
        program,
        type,
        files: Array.from(files),
      });
      // تصفير الحقل لتمكين رفع نفس الملف مجدداً
      e.target.value = "";
    },
    [uploadEvidenceMutation]
  );

  // ============ إزالة شاهد فردي ============
  const handleRemoveEvidence = useCallback(
    async (program: ProgramItem, type: "image" | "video", index: number) => {
      try {
        const list =
          type === "image"
            ? [...(program.evidence_images || [])]
            : [...(program.evidence_videos || [])];
        list.splice(index, 1);
        const updatePayload =
          type === "image"
            ? { evidence_images: list }
            : { evidence_videos: list };
        const { error } = await supabase
          .from("programs")
          .update(updatePayload)
          .eq("id", program.id);
        if (error) throw error;
        setEditProgram((prev) =>
          prev ? { ...prev, ...updatePayload } : null
        );
        queryClient.invalidateQueries({ queryKey: ["programs-list"] });
        toast.success("تم حذف الشاهد");
      } catch (err) {
        toast.error(`تعذر الحذف: ${(err as Error).message}`);
      }
    },
    [queryClient]
  );

  // ============ حفظ التعديلات اليدوية ============
  const handleSaveProgramEdit = useCallback(() => {
    if (!editProgram) return;
    saveEditMutation.mutate(editProgram);
  }, [editProgram, saveEditMutation]);

  // ============ الطباعة (بعد تحميل كل الصور) ============
  useEffect(() => {
    if (!printProgram) return;

    const root = printRef.current;
    if (!root) return;

    let cancelled = false;

    const waitForImages = async () => {
      const imgs = Array.from(root.querySelectorAll("img"));
      await Promise.all(
        imgs.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((res) => {
                img.addEventListener("load", () => res(), { once: true });
                img.addEventListener("error", () => res(), { once: true });
              })
        )
      );
    };

    const run = async () => {
      await waitForImages();
      if (cancelled) return;
      // إطار مزدوج لضمان تطبيق التنسيقات
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (!cancelled) window.print();
        })
      );
    };

    run();

    const handleAfterPrint = () => setPrintProgram(null);
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      cancelled = true;
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [printProgram]);

  const triggerPrint = useCallback((program: ProgramItem) => {
    setPrintProgram(program);
  }, []);

  // ============ العرض ============
  const isBusy =
    addProgramMutation.isPending ||
    uploadEvidenceMutation.isPending ||
    saveEditMutation.isPending;

  return (
    <div className="space-y-6 dir-rtl">
      {/* ترويسة الصفحة */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-6 text-primary-foreground shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -left-12 -top-12 size-48 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -right-12 size-48 rounded-full bg-black/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-xs font-medium backdrop-blur-md">
              <Sparkles className="size-3.5 text-amber-300" />
              <span>منصة التوجيه والإرشاد الطلابي</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-4xl">
              سجل البرامج والأنشطة الإرشادية
            </h1>
            <p className="text-xs font-medium text-primary-foreground/80 sm:text-sm">
              إدارة خطة البرامج الوزارية، وتوثيق الشواهد والتقارير، والطباعة
              الرسمية الفردية
            </p>
          </div>

          <Button
            onClick={() => setAddDialogOpen(true)}
            disabled={!school?.id}
            className="inline-flex h-12 items-center justify-center gap-2.5 rounded-2xl border-0 bg-white px-6 text-sm font-extrabold text-primary shadow-lg transition-all hover:scale-105 hover:bg-white/90 active:scale-95"
          >
            <Plus className="size-5" />
            <span>إضافة برنامج من القائمة الوزارية</span>
          </Button>
        </div>
      </div>

      {/* قائمة البرامج */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-foreground">
            البرامج الإرشادية المدرجة ({programs.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center rounded-3xl border border-border/60 bg-card">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : programs.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/80 bg-card p-12 text-center">
            <BookOpen className="mx-auto size-12 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-bold text-muted-foreground">
              لا توجد برامج مضافة في السجل حالياً
            </p>
            <p className="text-xs text-muted-foreground">
              قم بإضافة البرامج واختيار مواقيت تنفيذها حسب خطتكم.
            </p>
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
                      {prog.ptype || "برنامج وزاري"}
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

                  <h3 className="mt-3 text-base font-black leading-snug text-foreground">
                    {prog.name}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    الفئة المستهدفة: {prog.target_group || "جميع الطلاب"}
                  </p>

                  <div className="mt-4 space-y-1.5 text-xs font-medium text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="size-3.5 text-primary" />
                      <span>
                        فترة التنفيذ: {toHijriDate(prog.start_date)} -{" "}
                        {toHijriDate(prog.end_date)}
                      </span>
                    </div>
                    {(prog.evidence_images?.length || 0) > 0 ||
                    (prog.evidence_videos?.length || 0) > 0 ? (
                      <div className="flex items-center gap-1.5 font-bold text-emerald-600">
                        <CheckCircle2 className="size-3.5" />
                        <span>
                          الشواهد: {prog.evidence_images?.length || 0} صور،{" "}
                          {prog.evidence_videos?.length || 0} فيديو
                        </span>
                      </div>
                    ) : null}
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
                      <FileText className="ml-1 size-3.5" />
                      إدارة وتوثيق
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => triggerPrint(prog)}
                      className="h-8 rounded-xl text-xs font-bold"
                    >
                      <Printer className="ml-1 size-3.5" />
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

      {/* نافذة الإضافة */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">
              إضافة برنامج من القائمة الوزارية
            </DialogTitle>
            <DialogDescription className="text-xs">
              اختر الفصل الدراسي والبرنامج المحدد، ثم حدد تواريخ التنفيذ
              المناسبة لجدولك.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                تصفية الفصل الدراسي
              </label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="h-11 w-full rounded-2xl border border-input bg-background px-3 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">كل الفصول الدراسية</option>
                {MINISTRY_TERMS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                اختر البرنامج الوزاري
              </label>
              <select
                value={selectedMinistryProg}
                onChange={(e) => setSelectedMinistryProg(e.target.value)}
                className="h-11 w-full rounded-2xl border border-input bg-background px-3 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">-- اختر البرنامج --</option>
                {ministryList.map((p, idx) => (
                  <option
                    key={`${p.term}-${p.week}-${p.name}-${idx}`}
                    value={p.name}
                  >
                    [{p.term} - الأسبوع {p.week}] {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  تاريخ بداية التنفيذ
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  تاريخ نهاية التنفيذ
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              className="rounded-xl"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleAddSingleProgram}
              disabled={isBusy}
              className="rounded-xl"
            >
              {addProgramMutation.isPending && (
                <Loader2 className="ml-2 size-4 animate-spin" />
              )}
              إضافة البرنامج للسجل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة الإدارة والتوثيق */}
      <Dialog
        open={!!editProgram}
        onOpenChange={(open) => !open && setEditProgram(null)}
      >
        <DialogContent
          className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-3xl"
          dir="rtl"
        >
          {editProgram && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-black">
                  {editProgram.name}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  إدارة محتوى البرنامج، توليد مسودة التقرير، ورفع شواهد الصور
                  والفيديو.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-2">
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleGenerateTemplate(editProgram)}
                    disabled={aiGenerating}
                    className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 font-bold text-white hover:opacity-90"
                  >
                    {aiGenerating ? (
                      <Loader2 className="ml-1 size-4 animate-spin" />
                    ) : (
                      <Sparkles className="ml-1 size-4 text-amber-300" />
                    )}
                    توليد مسودة التقرير تلقائياً
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">
                      تاريخ البداية
                    </label>
                    <input
                      type="date"
                      value={editProgram.start_date || ""}
                      onChange={(e) =>
                        setEditProgram({
                          ...editProgram,
                          start_date: e.target.value,
                        })
                      }
                      className="h-10 w-full rounded-xl border border-input bg-background px-3 text-xs"
                    />
                    <p className="text-[10px] font-bold text-primary">
                      الموافق هجرياً: {toHijriDate(editProgram.start_date)}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">
                      تاريخ النهاية
                    </label>
                    <input
                      type="date"
                      value={editProgram.end_date || ""}
                      onChange={(e) =>
                        setEditProgram({
                          ...editProgram,
                          end_date: e.target.value,
                        })
                      }
                      className="h-10 w-full rounded-xl border border-input bg-background px-3 text-xs"
                    />
                    <p className="text-[10px] font-bold text-primary">
                      الموافق هجرياً: {toHijriDate(editProgram.end_date)}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    حالة التنفيذ
                  </label>
                  <select
                    value={editProgram.exec_status || "قيد التنفيذ"}
                    onChange={(e) =>
                      setEditProgram({
                        ...editProgram,
                        exec_status: e.target.value,
                      })
                    }
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-xs font-bold"
                  >
                    <option value="قيد التنفيذ">قيد التنفيذ</option>
                    <option value="مكتمل">مكتمل</option>
                    <option value="مؤجل">مؤجل</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    تقرير التنفيذ وما نفذ
                  </label>
                  <textarea
                    rows={4}
                    value={editProgram.summary || ""}
                    onChange={(e) =>
                      setEditProgram({
                        ...editProgram,
                        summary: e.target.value,
                      })
                    }
                    placeholder="اكتب تفاصيل ما نفذ أو استخدم زر التوليد..."
                    className="w-full rounded-2xl border border-input bg-background p-3 text-xs leading-relaxed"
                  />
                </div>

                {/* شواهد الصور */}
                <div className="space-y-3 border-t border-border/60 pt-4">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <ImageIcon className="size-4 text-primary" />
                      شواهد الصور (بحد أقصى {MAX_IMAGE_SIZE_MB}MB للصورة)
                    </label>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1 text-xs font-bold text-primary hover:bg-primary/20">
                      <Upload className="size-3.5" />
                      <span>إضافة صور</span>
                      <input
                        type="file"
                        multiple
                        accept={ALLOWED_IMAGE_TYPES.join(",")}
                        onChange={(e) =>
                          handleFileUpload(e, editProgram, "image")
                        }
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {editProgram.evidence_images &&
                    editProgram.evidence_images.length > 0 ? (
                      editProgram.evidence_images.map((img, idx) => (
                        <div
                          key={idx}
                          className="group/ev relative aspect-video overflow-hidden rounded-xl border border-border"
                        >
                          <img
                            src={img}
                            alt={`شاهد ${idx + 1}`}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveEvidence(
                                editProgram,
                                "image",
                                idx
                              )
                            }
                            className="absolute left-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover/ev:opacity-100"
                            aria-label="حذف الشاهد"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="col-span-3 rounded-2xl border border-dashed py-4 text-center text-xs text-muted-foreground">
                        لم يتم إرفاق صور شواهد بعد.
                      </p>
                    )}
                  </div>
                </div>

                {/* شواهد الفيديو */}
                <div className="space-y-3 border-t border-border/60 pt-4">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <Video className="size-4 text-primary" />
                      شواهد الفيديو (بحد أقصى {MAX_VIDEO_SIZE_MB}MB للفيديو)
                    </label>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1 text-xs font-bold text-primary hover:bg-primary/20">
                      <Upload className="size-3.5" />
                      <span>إضافة فيديوهات</span>
                      <input
                        type="file"
                        multiple
                        accept={ALLOWED_VIDEO_TYPES.join(",")}
                        onChange={(e) =>
                          handleFileUpload(e, editProgram, "video")
                        }
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {editProgram.evidence_videos &&
                    editProgram.evidence_videos.length > 0 ? (
                      editProgram.evidence_videos.map((vid, idx) => (
                        <