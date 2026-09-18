import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarRange,
  Check,
  Copy,
  FileDown,
  FileText,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Printer,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/lib/school";
import { elementToPdf } from "@/lib/pdf";
import { OfficialFooter, OfficialHeader } from "@/components/OfficialHeader";
import { RecordAttachmentsDialog } from "@/components/RecordAttachments";
import { RecordPrintDialog } from "@/components/RecordPrintDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/programs")({
  head: () => ({
    meta: [
      { title: "البرامج والأنشطة | منصة الذات" },
      {
        name: "description",
        content: "إنشاء وتوثيق البرامج والأنشطة الإرشادية في مستندات A4 جاهزة للطباعة.",
      },
    ],
  }),
  component: ProgramsPage,
});

type ProgramRow = {
  id: string;
  program_no?: string | null;
  name?: string | null;
  ptype?: string | null;
  domain?: string | null;
  target_group?: string | null;
  term?: string | null;
  goal?: string | null;
  indicator?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  exec_status?: string | null;
  beneficiaries?: number | null;
  required_evidence?: string | null;
  notes?: string | null;
};

type ProgramDraft = Partial<Omit<ProgramRow, "id">> & { id?: string };

type Attachment = {
  id: string;
  name: string;
  file_name?: string | null;
  file_path: string;
  mime_type?: string | null;
};

const PROGRAM_TYPES = [
  "وقائي",
  "نمائي",
  "علاجي",
  "إرشادي / وقائي",
  "تقييمي",
  "وقائي / نمائي",
  "علاجي / وقائي",
];
const DOMAINS = [
  "النفسي والاجتماعي",
  "السلوكي والمواظبة",
  "المهاري والتربوي",
  "التحصيلي والأكاديمي",
  "المهني والتعليمي",
  "التقني والأمني",
  "الاختبارات",
  "الاجتماعي والمواظبة",
  "المهني",
  "التحصيلي",
  "الختامي",
];
const EXEC_STATUS = ["لم يبدأ", "قيد التنفيذ", "منفذ", "مؤجل", "ملغى"];

const MINISTRY_PROGRAMS = [
  [
    "الأول (17 - 21 / 03 / 1448 هـ)",
    "برنامج التهيئة الإرشادية والأسبوع التمهيدي",
    "وقائي / نمائي",
    "المهاري والتربوي",
    "طلاب الصف الأول والمستجدين",
    "التهيئة النفسية والتربوية والاجتماعية لتحقيق تكيف الطلبة في البيئة المدرسية",
    "تنفيذ برامج الأسبوع التمهيدي وحصر الحالات",
  ],
  [
    "الثاني (24 - 28 / 03 / 1448 هـ)",
    "تعزيز السلوك الإيجابي",
    "وقائي",
    "السلوكي والمواظبة",
    "طلبة التعليم العام",
    "تفعيل الأنشطة والإجراءات المحفزة للسلوك الإيجابي والتعريف بالقيم المستهدفة",
    "تفعيل جائزة المدرسة للتميز السلوكي واستماراته",
  ],
  [
    "الثالث (02 - 06 / 04 / 1448 هـ)",
    "الاستمرار بتعزيز السلوك الإيجابي ورعاية الحالات الخاصة",
    "علاجي / وقائي",
    "الاجتماعي والنفسي",
    "الفئات الخاصة وطلبة التعليم العام",
    "تقديم الخدمات التربوية والنفسية للفئات الخاصة ورعاية متكرري الغياب",
    "تحديث بيانات الطلبة واستمارة الرعاية",
  ],
  [
    "الرابع (09 - 14 / 04 / 1448 هـ)",
    "تفعيل الأسبوع المكثف لبرنامج رفق (اليوم الوطني)",
    "وقائي",
    "الحد من العنف",
    "طلبة التعليم العام وأولياء الأمور",
    "الحد من العنف المدرسي وإكساب الطلبة المهارات الشخصية والاجتماعية",
    "تنفيذ فعاليات برنامج رفق واحتفالات اليوم الوطني",
  ],
  [
    "الخامس (16 - 20 / 04 / 1448 هـ)",
    "تنمية الدافعية لرفع مستوى التحصيل الدراسي",
    "نمائي",
    "التحصيلي والأكاديمي",
    "طلبة التعليم العام",
    "تنمية دافعية الطلبة للتعلم والتهيئة لاختبارات أعمال السنة",
    "تفعيل دليل دور الأسرة في تنمية الدافعية",
  ],
  [
    "السادس (23 - 27 / 04 / 1448 هـ)",
    "تعزيز المهارات النفسية والاجتماعية (برنامجي نبيه ودرع)",
    "وقائي",
    "النفسي والاجتماعي",
    "طلبة التعليم العام",
    "تنمية مهارات الطلبة الانفعالية والاجتماعية وحمايتهم",
    "تفعيل برامج نبيه ودرع والمجلس الطلابي",
  ],
  [
    "السابع (30 / 04 - 04 / 05 / 1448 هـ)",
    "التوجيه المهني",
    "نمائي",
    "المهني والتعليمي",
    "طلبة المرحلة الثانوية والتعليم العام",
    "مساعدة الطلبة في اكتشاف ميولهم والتعريف بنظام المسارات",
    "تفعيل دليل التوجيه المهني والزيارات واللقاءات",
  ],
  [
    "الثامن (07 - 11 / 05 / 1448 هـ)",
    "استمرار تعزيز المهارات النفسية للطلبة",
    "وقائي",
    "النفسي",
    "طلبة التعليم العام",
    "الوقاية النفسية الأولية وتنمية المهارات الانفعالية والاجتماعية",
    "تنفيذ خطة البرنامج واستثمار المجالس الطلابية",
  ],
  [
    "التاسع (14 - 18 / 05 / 1448 هـ)",
    "رعاية ودعم الحالات الخاصة ومتكرري الغياب",
    "علاجي",
    "الاجتماعي والمواظبة",
    "طلبة الظروف الخاصة والمتأخرين",
    "تحقيق التوافق النفسي والاجتماعي والتربوي للطلبة ذوي الظروف الخاصة",
    "الجلسات الفردية ودراسة الحالة وتقارير الغياب",
  ],
  [
    "العاشر (21 - 25 / 05 / 1448 هـ)",
    "متابعة تنمية الدافعية للتحصيل الدراسي",
    "نمائي",
    "التحصيلي",
    "طلبة التعليم العام",
    "تقديم التدخلات التربوية للرفع من الدافعية وتفعيل مجالس أولياء الأمور",
    "تقارير الرفع من مستوى الدافعية وتحصيل الطلاب",
  ],
  [
    "الحادي عشر (28 / 05 - 02 / 06 / 1448 هـ)",
    "استمرار الرعاية والدعم للحالات الخاصة والانضباط",
    "علاجي / وقائي",
    "السلوكي والاجتماعي",
    "الفئات الخاصة وطلبة المدرسة",
    "تقديم الخدمات التربوية وتفعيل جائزة المدرسة للتميز السلوكي",
    "تطبيق قائمة المشكلات واستمارات التكريم",
  ],
  [
    "الثاني عشر (05 - 09 / 06 / 1448 هـ)",
    "الانضباط المدرسي والحد من الغياب",
    "علاجي / وقائي",
    "المواظبة",
    "منسوبي المدرسة والطلبة وأولياء الأمور",
    "توعية المجتمع المدرسي بالآثار السلبية للغياب والتأخر الصباحي",
    "رفع تقرير مفصل لقسم التوجيه الطلابي عن الغياب",
  ],
  [
    "الثالث عشر (19 - 23 / 06 / 1448 هـ)",
    "تنمية الدافعية لرفع مستوى التحصيل (بعد إجازة الخريف)",
    "نمائي",
    "التحصيلي",
    "طلبة التعليم العام",
    "متابعة تحليل نتائج الطلبة وتقديم التدخلات العلاجية لمقياس الدافعية",
    "تحليل نتائج الاختبارات ومقاييس الدافعية",
  ],
  [
    "الرابع عشر (26 / 06 - 01 / 07 / 1448 هـ)",
    "الاستخدام الآمن للإنترنت والألعاب الإلكترونية",
    "وقائي",
    "التقني والأمني",
    "طلبة التعليم العام وأولياء الأمور",
    "توعية الطلبة بمخاطر مواقع التواصل الاجتماعي والاستخدام الآمن",
    "تنفيذ البرامج التوعوية والتحذير من المواقع المشبوهة",
  ],
  [
    "الخامس عشر (04 - 08 / 07 / 1448 هـ)",
    "الاستمرار في التوجيه المهني والاختبارات",
    "نمائي",
    "المهني",
    "طلبة التعليم العام والمرحلة الثانوية",
    "استكمال الخطة التنفيذية للتوجيه المهني ونظام المسارات",
    "تفعيل دليل التوجيه المهني وتذكير بمواعيد القدرات والتحصيلي",
  ],
  [
    "السادس عشر (11 - 15 / 07 / 1448 هـ)",
    "متابعة تنمية الدافعية ووضع الخطط العلاجية لمهارات الحد الأدنى",
    "علاجي",
    "التحصيلي",
    "الطلاب المتوقع عدم إتقانهم لمهارات الحد الأدنى",
    "وضع الخطط العلاجية بالتنسيق مع الوكيل والمعلمين والاستعداد للاختبارات",
    "خطط الحد الأدنى وبرامج تنظيم الوقت للمذاكرة",
  ],
  [
    "السابع عشر (18 - 22 / 07 / 1448 هـ)",
    "التهيئة الإرشادية للاختبارات (الشفهية والعملية)",
    "إرشادي / وقائي",
    "الاختبارات",
    "طلبة التعليم العام وأولياء الأمور",
    "التهيئة الإرشادية للاختبارات وتعريف الطلبة باللوائح وتكريم المتميزين",
    "تنفيذ حملات توعوية وجداول الاختبارات والمحافظة على الكتب",
  ],
  [
    "الثامن عشر (25 - 29 / 07 / 1448 هـ)",
    "اختبارات نهاية الفصل الدراسي الأول وتوثيق الشواهد",
    "تقييمي",
    "الختامي",
    "طلبة التعليم العام",
    "متابعة رفع دافعية ذوي الحالات الخاصة واستكمال توثيق الشواهد",
    "رفع تقرير أعمال برامج التوجيه الطلابي للفصل الأول لقسم التوجيه",
  ],
] as const;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyDraft(): ProgramDraft {
  return {
    program_no: "",
    name: "",
    ptype: "",
    domain: "",
    target_group: "",
    term: "الفصل الدراسي الأول",
    goal: "",
    indicator: "",
    start_date: today(),
    end_date: today(),
    exec_status: "لم يبدأ",
    beneficiaries: null,
    required_evidence: "صور، ملفات PDF، فيديو تنفيذي",
    notes: "",
  };
}

function value(v: unknown) {
  return String(v ?? "");
}

function ProgramsPage() {
  const queryClient = useQueryClient();
  const { data: school } = useSchool();
  const printRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editing, setEditing] = useState<ProgramDraft | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [attachFor, setAttachFor] = useState<ProgramRow | null>(null);
  const [printFor, setPrintFor] = useState<ProgramRow | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadedAttachments, setUploadedAttachments] = useState<Attachment[]>([]);

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ProgramRow[];
    },
  });

  const ministryNames = useMemo(() => new Set<string>(MINISTRY_PROGRAMS.map((p) => p[1])), []);

  const save = useMutation({
    mutationFn: async (draft: ProgramDraft) => {
      const payload = {
        program_no: draft.program_no || null,
        name: draft.name || null,
        ptype: draft.ptype || null,
        domain: draft.domain || null,
        target_group: draft.target_group || null,
        term: draft.term || null,
        goal: draft.goal || null,
        indicator: draft.indicator || null,
        start_date: draft.start_date || null,
        end_date: draft.end_date || null,
        exec_status: draft.exec_status || "لم يبدأ",
        beneficiaries:
          draft.beneficiaries == null || String(draft.beneficiaries).trim() === ""
            ? null
            : Number(draft.beneficiaries),
        required_evidence: draft.required_evidence || null,
        notes: draft.notes || null,
      };
      if (draft.id) {
        const { data, error } = await supabase
          .from("programs")
          .update(payload as never)
          .eq("id", draft.id)
          .select("*")
          .single();
        if (error) throw error;
        return data as unknown as ProgramRow;
      }
      const { data, error } = await supabase
        .from("programs")
        .insert(payload as never)
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as ProgramRow;
    },
    onSuccess: async (row) => {
      await queryClient.invalidateQueries({ queryKey: ["programs"] });
      setEditing(row);
      toast.success("تم حفظ البرنامج");
      if (pendingFiles.length) await uploadFiles(row.id, row.name || "برنامج");
    },
    onError: (error: Error) => toast.error(`تعذّر حفظ البرنامج: ${error.message}`),
  });

  async function loadAttachments(recordId: string) {
    const { data, error } = await supabase
      .from("evidences")
      .select("id,name,file_name,file_path,mime_type")
      .eq("linked_ref", recordId)
      .eq("linked_type", "برنامج")
      .order("created_at", { ascending: true });
    if (error) throw error;
    setUploadedAttachments((data ?? []) as Attachment[]);
  }

  async function uploadFiles(recordId: string, recordTitle: string) {
    if (!pendingFiles.length) return;
    try {
      for (const file of pendingFiles) {
        if (file.size > 50 * 1024 * 1024) throw new Error(`الملف ${file.name} يتجاوز 50 ميجابايت.`);
        const safe = file.name.replace(/[^\w\-.\u0600-\u06FF ]/g, "_");
        const path = `programs/${recordId}/${Date.now()}-${safe}`;
        const { error: uploadError } = await supabase.storage
          .from("evidences")
          .upload(path, file, { ...(file.type ? { contentType: file.type } : {}), upsert: false });
        if (uploadError) throw uploadError;
        const { error } = await supabase.from("evidences").insert({
          name: file.name,
          etype: file.type.startsWith("image/") ? "صورة" : "مستند",
          linked_type: "برنامج",
          linked_ref: recordId,
          edate: today(),
          doc_status: "قيد المراجعة",
          description: recordTitle,
          file_path: path,
          file_name: file.name,
          mime_type: file.type || null,
        } as never);
        if (error) throw error;
      }
      setPendingFiles([]);
      await loadAttachments(recordId);
      await queryClient.invalidateQueries({ queryKey: ["evidence-files"] });
      toast.success("تم رفع الشواهد والصور وربطها بالبرنامج");
    } catch (error) {
      toast.error(`تعذّر رفع المرفقات: ${(error as Error).message}`);
    }
  }

  function openNew() {
    setEditing(emptyDraft());
    setPendingFiles([]);
    setUploadedAttachments([]);
    setEditorOpen(true);
  }

  async function openEdit(row: ProgramRow) {
    setEditing({ ...row });
    setPendingFiles([]);
    setUploadedAttachments([]);
    setEditorOpen(true);
    try {
      await loadAttachments(row.id);
    } catch (error) {
      toast.error(`تعذّر تحميل الشواهد: ${(error as Error).message}`);
    }
  }

  function selectMinistryProgram(name: string) {
    const item = MINISTRY_PROGRAMS.find((p) => p[1] === name);
    if (!item) return;
    setEditing((current) => ({
      ...(current ?? emptyDraft()),
      name: item[1],
      ptype: item[2],
      domain: item[3],
      target_group: item[4],
      goal: item[5],
      indicator: item[6],
      required_evidence: "صور تنفيذية، ملف البرنامج، إعلان/تعميم، سجل حضور عند الحاجة",
      exec_status: current?.exec_status || "لم يبدأ",
    }));
  }

  async function exportCurrentPdf() {
    if (!printRef.current || pdfBusy) return;
    setPdfBusy(true);
    try {
      await elementToPdf(printRef.current, `برنامج-${editing?.name || "نشاط إرشادي"}`);
      toast.success("تم تجهيز ملف PDF بصيغة A4");
    } catch (error) {
      toast.error(`تعذّر تصدير PDF: ${(error as Error).message}`);
    } finally {
      setPdfBusy(false);
    }
  }

  async function deleteProgram(row: ProgramRow) {
    if (!window.confirm(`هل تريد حذف البرنامج «${row.name || "بدون اسم"}» مع شواهده؟`)) return;
    setDeleteBusy(true);
    try {
      const { data: evidence, error: evidenceReadError } = await supabase
        .from("evidences")
        .select("id,file_path")
        .eq("linked_ref", row.id)
        .eq("linked_type", "برنامج");
      if (evidenceReadError) throw evidenceReadError;
      const paths = (evidence ?? []).map((x) => String(x.file_path ?? "")).filter(Boolean);
      if (paths.length) await supabase.storage.from("evidences").remove(paths);
      if ((evidence ?? []).length) {
        const { error } = await supabase
          .from("evidences")
          .delete()
          .in(
            "id",
            (evidence ?? []).map((x) => x.id),
          );
        if (error) throw error;
      }
      const { error } = await supabase.from("programs").delete().eq("id", row.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("تم حذف البرنامج وشواهده");
    } catch (error) {
      toast.error(`تعذّر الحذف: ${(error as Error).message}`);
    } finally {
      setDeleteBusy(false);
    }
  }

  async function deleteAll() {
    if (!window.confirm("تحذير: سيتم حذف جميع البرامج وشواهدها نهائياً. هل أنت متأكد؟")) return;
    setDeleteBusy(true);
    try {
      const ids = programs.map((p) => p.id);
      if (ids.length) {
        const { data: evidence, error } = await supabase
          .from("evidences")
          .select("id,file_path")
          .in("linked_ref", ids)
          .eq("linked_type", "برنامج");
        if (error) throw error;
        const paths = (evidence ?? []).map((x) => String(x.file_path ?? "")).filter(Boolean);
        if (paths.length) await supabase.storage.from("evidences").remove(paths);
        if ((evidence ?? []).length) {
          const { error: delEv } = await supabase
            .from("evidences")
            .delete()
            .in(
              "id",
              (evidence ?? []).map((x) => x.id),
            );
          if (delEv) throw delEv;
        }
      }
      const { error } = await supabase
        .from("programs")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("تم حذف جميع البرامج والشواهد");
    } catch (error) {
      toast.error(`تعذّر الحذف: ${(error as Error).message}`);
    } finally {
      setDeleteBusy(false);
    }
  }

  async function importMinistryPrograms() {
    const existing = new Set(programs.map((p) => value(p.name).trim()));
    const payload = MINISTRY_PROGRAMS.filter((p) => !existing.has(p[1])).map((p) => ({
      program_no: `الفصل الدراسي الأول - ${p[0]}`,
      name: p[1],
      ptype: p[2],
      domain: p[3],
      target_group: p[4],
      term: "الفصل الدراسي الأول",
      goal: p[5],
      indicator: p[6],
      exec_status: "لم يبدأ",
      required_evidence: "صور، ملفات PDF، فيديو تنفيذي",
    }));
    if (!payload.length) {
      toast.info("جميع البرامج الوزارية موجودة مسبقاً.");
      return;
    }
    const { error } = await supabase.from("programs").insert(payload as never);
    if (error) {
      toast.error(`تعذّر الاستيراد: `);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["programs"] });
    toast.success(`تم استيراد ${payload.length} برنامجاً`);
  }

  return (
    <div dir="rtl" className="space-y-5">
      <div className="no-print flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">البرامج والأنشطة</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            أنشئ البرنامج كمستند رسمي A4، واكتب تفاصيله، وأرفق الشواهد والصور داخله.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={openNew}>
            <Plus className="size-4" /> إضافة برنامج
          </Button>
          <Button variant="outline" onClick={importMinistryPrograms}>
            <CalendarRange className="size-4" /> الخطة الوزارية 1448هـ
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" /> طباعة القائمة
          </Button>
          <Button variant="destructive" onClick={deleteAll} disabled={deleteBusy}>
            <Trash2 className="size-4" /> حذف الكل
          </Button>
        </div>
      </div>

      <div className="no-print grid gap-3 md:grid-cols-4">
        <Stat title="إجمالي البرامج" value={programs.length} />
        <Stat title="منفذ" value={programs.filter((p) => p.exec_status === "منفذ").length} />
        <Stat
          title="قيد التنفيذ"
          value={programs.filter((p) => p.exec_status === "قيد التنفيذ").length}
        />
        <Stat
          title="برامج الخطة الوزارية"
          value={programs.filter((p) => ministryNames.has(value(p.name))).length}
        />
      </div>

      <div className="print-area overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="hidden print:block print:p-6">
          <OfficialHeader
            school={school}
            title="كشف البرامج والأنشطة الإرشادية"
            reportType="البرامج والأنشطة"
          />
        </div>
        <div className="no-print border-b bg-muted/30 p-4 text-sm font-bold">
          سجلات البرامج — اضغط «فتح المستند» للتعبئة والطباعة بصيغة A4.
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-xs">
                <th className="p-3">اسم البرنامج</th>
                <th className="p-3">النوع</th>
                <th className="p-3">المجال</th>
                <th className="p-3">الفئة</th>
                <th className="p-3">التنفيذ</th>
                <th className="p-3">المستفيدون</th>
                <th className="no-print p-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    جارٍ التحميل...
                  </td>
                </tr>
              )}
              {!isLoading && !programs.length && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    لا توجد برامج بعد. ابدأ بإضافة برنامج أو استيراد الخطة الوزارية.
                  </td>
                </tr>
              )}
              {programs.map((row) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-bold">{row.name || "—"}</td>
                  <td className="p-3">{row.ptype || "—"}</td>
                  <td className="p-3">{row.domain || "—"}</td>
                  <td className="p-3">{row.target_group || "—"}</td>
                  <td className="p-3">{row.exec_status || "—"}</td>
                  <td className="p-3">{row.beneficiaries ?? "—"}</td>
                  <td className="no-print p-2">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" onClick={() => openEdit(row)}>
                        <Pencil className="size-4" /> فتح المستند
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="نسخ"
                        onClick={() => {
                          setEditing({ ...row, id: "", program_no: ` - نسخة` });
                          setEditorOpen(true);
                        }}
                      >
                        <Copy className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="المرفقات"
                        onClick={() => setAttachFor(row)}
                      >
                        <Upload className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="طباعة رسمية"
                        onClick={() => setPrintFor(row)}
                      >
                        <Printer className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="حذف"
                        onClick={() => deleteProgram(row)}
                        disabled={deleteBusy}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="hidden print:block print:p-6 print:pt-0">
          <OfficialFooter school={school} />
        </div>
      </div>

      <Dialog open={editorOpen} onOpenChange={(open) => !open && setEditorOpen(false)}>
        <DialogContent dir="rtl" className="max-h-[96vh] max-w-6xl overflow-y-auto p-0">
          <DialogHeader className="no-print border-b px-6 py-4">
            <DialogTitle>
              {editing?.id ? "تحرير مستند البرنامج" : "إنشاء مستند برنامج جديد"}
            </DialogTitle>
            <DialogDescription>
              اختر اسم البرنامج، ثم أدخل التفاصيل والإجراءات والنتائج قبل الحفظ.
            </DialogDescription>
          </DialogHeader>

          <div className="no-print grid gap-4 bg-muted/20 p-4 lg:grid-cols-[300px_1fr]">
            <div className="space-y-4 rounded-xl border bg-card p-4">
              <div>
                <Label className="mb-1.5 block">اسم البرنامج من القائمة المنسدلة</Label>
                <select
                  value={value(editing?.name)}
                  onChange={(e) => selectMinistryProgram(e.target.value)}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">— اختر برنامجاً وزارياً أو اكتب اسماً أدناه —</option>
                  {MINISTRY_PROGRAMS.map((p) => (
                    <option key={p[1]} value={p[1]}>
                      {p[1]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="mb-1.5 block">اسم البرنامج / النشاط</Label>
                <Input
                  value={value(editing?.name)}
                  onChange={(e) =>
                    setEditing((x) => ({ ...(x ?? emptyDraft()), name: e.target.value }))
                  }
                />
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                أكمل بيانات البرنامج في الحقول أسفل المستند، ثم راجع المعاينة قبل الحفظ أو التصدير.
              </p>
            </div>

            <div className="mx-auto w-full max-w-[210mm]">
              <div
                ref={printRef}
                className="program-a4 bg-white text-black shadow-xl"
                style={{
                  minHeight: "297mm",
                  padding: "15mm",
                  fontFamily: "Cairo, Arial, sans-serif",
                }}
              >
                <OfficialHeader school={school} title="سجل تنفيذ برنامج / نشاط إرشادي" />
                <div className="mt-5 border-2 border-black">
                  <div className="border-b-2 border-black bg-gray-100 p-3 text-center text-xl font-extrabold">
                    {value(editing?.name) || "اسم البرنامج"}
                  </div>
                  <div className="grid grid-cols-2 text-sm">
                    <DocCell label="رقم البرنامج" value={value(editing?.program_no)} />
                    <DocCell label="الفصل الدراسي" value={value(editing?.term)} />
                    <DocCell label="نوع البرنامج" value={value(editing?.ptype)} />
                    <DocCell label="المجال" value={value(editing?.domain)} />
                    <DocCell label="الفئة المستهدفة" value={value(editing?.target_group)} />
                    <DocCell label="حالة التنفيذ" value={value(editing?.exec_status)} />
                    <DocCell label="تاريخ البداية" value={value(editing?.start_date)} />
                    <DocCell label="تاريخ النهاية" value={value(editing?.end_date)} />
                    <DocCell label="عدد المستفيدين" value={value(editing?.beneficiaries)} />
                    <DocCell label="الشواهد المطلوبة" value={value(editing?.required_evidence)} />
                  </div>
                </div>
                <DocSection title="الهدف من البرنامج">
                  <p className="whitespace-pre-wrap leading-7">
                    {value(editing?.goal) || "يُكتب الهدف هنا..."}
                  </p>
                </DocSection>
                <DocSection title="مؤشر / معيار النجاح">
                  <p className="whitespace-pre-wrap leading-7">
                    {value(editing?.indicator) || "يُكتب المؤشر هنا..."}
                  </p>
                </DocSection>
                <DocSection title="الإجراءات والملاحظات">
                  <p className="min-h-32 whitespace-pre-wrap leading-7">
                    {value(editing?.notes) ||
                      "يُكتب وصف التنفيذ والإجراءات والنتائج والتوصيات هنا..."}
                  </p>
                </DocSection>
                <DocSection title="الشواهد والصور">
                  {uploadedAttachments.length ? (
                    <EvidenceGrid attachments={uploadedAttachments} />
                  ) : (
                    <div className="flex h-28 items-center justify-center border border-dashed text-sm text-gray-500">
                      ستظهر الصور والشواهد المرفقة هنا بعد رفعها.
                    </div>
                  )}
                </DocSection>
                <div className="mt-8 grid grid-cols-2 gap-10 text-center text-sm">
                  <div>
                    <div className="mb-12 font-bold">اسم الموجه الطلابي</div>
                    <div>{school?.counselor_name || "........................"}</div>
                  </div>
                  <div>
                    <div className="mb-12 font-bold">مدير المدرسة</div>
                    <div>{school?.principal_name || "........................"}</div>
                  </div>
                </div>
                <OfficialFooter school={school} />
              </div>
            </div>
          </div>

          <div className="no-print space-y-4 border-t bg-background p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field
                label="نوع البرنامج"
                value={value(editing?.ptype)}
                onChange={(v) => setEditing((x) => ({ ...(x ?? emptyDraft()), ptype: v }))}
                options={PROGRAM_TYPES}
              />
              <Field
                label="المجال"
                value={value(editing?.domain)}
                onChange={(v) => setEditing((x) => ({ ...(x ?? emptyDraft()), domain: v }))}
                options={DOMAINS}
              />
              <Field
                label="الفئة المستهدفة"
                value={value(editing?.target_group)}
                onChange={(v) => setEditing((x) => ({ ...(x ?? emptyDraft()), target_group: v }))}
              />
              <Field
                label="حالة التنفيذ"
                value={value(editing?.exec_status)}
                onChange={(v) => setEditing((x) => ({ ...(x ?? emptyDraft()), exec_status: v }))}
                options={EXEC_STATUS}
              />
              <Field
                label="رقم البرنامج"
                value={value(editing?.program_no)}
                onChange={(v) => setEditing((x) => ({ ...(x ?? emptyDraft()), program_no: v }))}
              />
              <Field
                label="الفصل الدراسي"
                value={value(editing?.term)}
                onChange={(v) => setEditing((x) => ({ ...(x ?? emptyDraft()), term: v }))}
              />
              <Field
                label="تاريخ البداية"
                type="date"
                value={value(editing?.start_date)}
                onChange={(v) => setEditing((x) => ({ ...(x ?? emptyDraft()), start_date: v }))}
              />
              <Field
                label="تاريخ النهاية"
                type="date"
                value={value(editing?.end_date)}
                onChange={(v) => setEditing((x) => ({ ...(x ?? emptyDraft()), end_date: v }))}
              />
              <Field
                label="عدد المستفيدين"
                type="number"
                value={value(editing?.beneficiaries)}
                onChange={(v) =>
                  setEditing((x) => ({
                    ...(x ?? emptyDraft()),
                    beneficiaries: v === "" ? null : Number(v),
                  }))
                }
              />
            </div>
            <div>
              <Label className="mb-1.5 block">الهدف</Label>
              <Textarea
                rows={4}
                value={value(editing?.goal)}
                onChange={(e) =>
                  setEditing((x) => ({ ...(x ?? emptyDraft()), goal: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="mb-1.5 block">المؤشر / معيار النجاح</Label>
              <Textarea
                rows={3}
                value={value(editing?.indicator)}
                onChange={(e) =>
                  setEditing((x) => ({ ...(x ?? emptyDraft()), indicator: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="mb-1.5 block">ملاحظات التنفيذ والنتائج والتوصيات</Label>
              <Textarea
                rows={7}
                value={value(editing?.notes)}
                onChange={(e) =>
                  setEditing((x) => ({ ...(x ?? emptyDraft()), notes: e.target.value }))
                }
              />
            </div>

            <div className="rounded-xl border border-dashed p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold">الشواهد والصور</p>
                  <p className="text-xs text-muted-foreground">
                    ارفع عدة صور وملفات حتى 50MB للملف، وسترتبط مباشرة بهذا البرنامج.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="size-4" /> إضافة ملفات
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp4,.mov,.webm"
                className="hidden"
                onChange={(e) =>
                  setPendingFiles((x) => [...x, ...Array.from(e.target.files ?? [])])
                }
              />
              {!!pendingFiles.length && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {pendingFiles.map((file, i) => (
                    <div
                      key={`${file.name}-${i}`}
                      className="flex items-center gap-2 rounded-lg border p-2 text-xs"
                    >
                      <FileIcon type={file.type} />
                      <span className="min-w-0 flex-1 truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setPendingFiles((x) => x.filter((_, n) => n !== i))}
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {!!uploadedAttachments.length && (
                <p className="mt-3 text-xs font-bold text-emerald-700">
                  تم ربط {uploadedAttachments.length} شاهد/ملف بهذا البرنامج.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="no-print sticky bottom-0 border-t bg-background px-5 py-3">
            <Button variant="outline" onClick={() => setPreviewOpen(true)} disabled={!editing}>
              <FileText className="size-4" /> معاينة A4
            </Button>
            <Button variant="outline" onClick={exportCurrentPdf} disabled={pdfBusy || !editing}>
              <FileDown className="size-4" /> {pdfBusy ? "جارٍ إنشاء PDF..." : "حفظ PDF"}
            </Button>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              إغلاق
            </Button>
            <Button
              onClick={() => editing && save.mutate(editing)}
              disabled={save.isPending || !editing?.name?.trim()}
            >
              <Check className="size-4" /> {save.isPending ? "جارٍ الحفظ..." : "حفظ البرنامج"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent dir="rtl" className="max-h-[96vh] max-w-[1000px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>معاينة مستند البرنامج — A4</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center overflow-auto bg-muted/40 p-4">
            <div
              className="program-a4 w-full max-w-[210mm] bg-white shadow-xl"
              style={{ padding: "15mm", fontFamily: "Cairo, Arial, sans-serif" }}
            >
              <OfficialHeader school={school} title="سجل تنفيذ برنامج / نشاط إرشادي" />
              <div className="mt-4 border-2 border-black p-4 text-center text-xl font-extrabold">
                {value(editing?.name)}
              </div>
              <DocSection title="بيانات البرنامج">
                <div className="grid grid-cols-2 text-sm">
                  <DocCell label="النوع" value={value(editing?.ptype)} />
                  <DocCell label="المجال" value={value(editing?.domain)} />
                  <DocCell label="الفئة" value={value(editing?.target_group)} />
                  <DocCell label="الحالة" value={value(editing?.exec_status)} />
                  <DocCell label="البداية" value={value(editing?.start_date)} />
                  <DocCell label="النهاية" value={value(editing?.end_date)} />
                </div>
              </DocSection>
              <DocSection title="الهدف">
                <p className="whitespace-pre-wrap leading-7">{value(editing?.goal)}</p>
              </DocSection>
              <DocSection title="المؤشر">
                <p className="whitespace-pre-wrap leading-7">{value(editing?.indicator)}</p>
              </DocSection>
              <DocSection title="الإجراءات والنتائج والتوصيات">
                <p className="whitespace-pre-wrap leading-7">{value(editing?.notes)}</p>
              </DocSection>
              {uploadedAttachments.length > 0 && (
                <DocSection title="الشواهد والصور">
                  <EvidenceGrid attachments={uploadedAttachments} />
                </DocSection>
              )}
              <OfficialFooter school={school} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              إغلاق
            </Button>
            <Button onClick={exportCurrentPdf}>
              <FileDown className="size-4" /> حفظ PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RecordAttachmentsDialog
        open={attachFor !== null}
        onOpenChange={(open) => !open && setAttachFor(null)}
        recordId={attachFor?.id ?? null}
        recordTitle={value(attachFor?.name)}
        linkedType="برنامج"
      />
      <RecordPrintDialog
        open={printFor !== null}
        onOpenChange={(open) => !open && setPrintFor(null)}
        config={{
          key: "programs",
          table: "programs",
          title: "البرامج والأنشطة",
          singular: "برنامج",
          fields: [
            { name: "program_no", label: "رقم البرنامج" },
            { name: "name", label: "اسم البرنامج" },
            { name: "ptype", label: "النوع" },
            { name: "domain", label: "المجال" },
            { name: "target_group", label: "الفئة المستهدفة" },
            { name: "term", label: "الفصل الدراسي" },
            { name: "goal", label: "الهدف", type: "textarea" },
            { name: "indicator", label: "المؤشر" },
            { name: "start_date", label: "تاريخ البداية", type: "date" },
            { name: "end_date", label: "تاريخ النهاية", type: "date" },
            { name: "exec_status", label: "حالة التنفيذ" },
            { name: "beneficiaries", label: "عدد المستفيدين", type: "number" },
            { name: "required_evidence", label: "الشواهد المطلوبة" },
            { name: "notes", label: "الملاحظات", type: "textarea" },
          ],
        }}
        row={printFor as never}
      />
    </div>
  );
}

function Stat({ title, value: v }: { title: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-extrabold">{v}</p>
    </div>
  );
}
function DocCell({ label, value: v }: { label: string; value: string }) {
  return (
    <div className="border-b border-l border-black p-2 last:border-l-0">
      <span className="font-bold">{label}: </span>
      {v || "—"}
    </div>
  );
}
function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 break-inside-avoid">
      <h3 className="mb-2 border border-black bg-gray-100 p-2 text-center text-base font-extrabold">
        {title}
      </h3>
      <div className="border border-t-0 border-black p-3 text-sm">{children}</div>
    </section>
  );
}
function Field({
  label,
  value: v,
  onChange,
  options,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options?: string[];
  type?: string;
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs">{label}</Label>
      {options ? (
        <select
          value={v}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full rounded-md border bg-background px-2 text-sm"
        >
          <option value="">—</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <Input type={type} value={v} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}
function FileIcon({ type }: { type: string }) {
  return type.startsWith("image/") ? (
    <ImageIcon className="size-4 shrink-0 text-primary" />
  ) : (
    <FileText className="size-4 shrink-0 text-primary" />
  );
}
function EvidenceGrid({ attachments }: { attachments: Attachment[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {attachments.slice(0, 8).map((a) => (
        <EvidenceItem key={a.id} attachment={a} />
      ))}
    </div>
  );
}
function EvidenceItem({ attachment }: { attachment: Attachment }) {
  const [url, setUrl] = useState<string | null>(null);
  const image = (attachment.mime_type || "").startsWith("image/");
  useEffect(() => {
    let active = true;
    if (attachment.file_path)
      supabase.storage
        .from("evidences")
        .createSignedUrl(attachment.file_path, 3600)
        .then(({ data }) => {
          if (active) setUrl(data?.signedUrl ?? null);
        });
    return () => {
      active = false;
    };
  }, [attachment.file_path]);
  return (
    <div className="break-inside-avoid overflow-hidden border border-black bg-white">
      {image && url ? (
        <img src={url} alt={attachment.name} className="h-36 w-full object-cover" />
      ) : (
        <div className="flex h-36 items-center justify-center bg-gray-50">
          <FileText className="size-10" />
        </div>
      )}
      <div className="border-t border-black p-2 text-center text-xs font-bold">
        {attachment.name}
      </div>
    </div>
  );
}
