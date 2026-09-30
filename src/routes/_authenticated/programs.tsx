import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarRange,
  FileText,
  Image as ImageIcon,
  Loader2,
  Plus,
  Sparkles,
  Trash2
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/lib/school";


import { generateSmartFill } from "@/lib/deepseek.functions";



import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OfficialFooter, OfficialHeader } from "@/components/OfficialHeader";
import { PdfPreviewButton } from "@/components/PdfPreviewButton";


export const Route = createFileRoute("/_authenticated/programs")({
  head: () => ({
    meta: [
      { title: "البرامج والأنشطة | الذات" },
      {
        name: "description",
        content: "إنشاء وتوثيق برامج وأنشطة التوجيه الطلابي ومتابعتها.",
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
  plan_task_id?: string | null;
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
    plan_task_id: "",
    exec_status: "لم يبدأ",
    beneficiaries: null,
    required_evidence: "صور، ملفات PDF، فيديو تنفيذي",
    notes: "",
  };
}

function value(v: unknown) {
  return String(v ?? "");
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options?: readonly string[];
  type?: "text" | "date" | "number";
};

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
    </div>
  );
}

function DocCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-l border-paper-border p-3">
      <p className="mb-1 text-xs text-paper-muted-foreground">{label}</p>
      <p className="min-h-6 whitespace-pre-wrap font-semibold">{value || "—"}</p>
    </div>
  );
}

function DocSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-4 break-inside-avoid rounded-xl border border-paper-border p-3">
      <h3 className="mb-2 border-b border-paper-border pb-2 font-black text-[var(--letterhead-primary)]">{title}</h3>
      <div>{children}</div>
    </section>
  );
}

function EvidenceGrid({ attachments }: { attachments: Attachment[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {attachments.map((attachment) => (
        <div key={attachment.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
          {attachment.mime_type?.startsWith("image/") ? (
            <ImageIcon className="size-4 shrink-0" />
          ) : (
            <FileText className="size-4 shrink-0" />
          )}
          <span className="truncate">{attachment.name || attachment.file_name || "مرفق"}</span>
        </div>
      ))}
    </div>
  );
}

function Field({ label, value, onChange, options, type = "text" }: FieldProps) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      {options ? (
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
        >
          <option value="">— اختر —</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </div>
  );
}

function ProgramsPage() {
  const queryClient = useQueryClient();
  const { data: school } = useSchool();




  const [editorOpen, setEditorOpen] = useState(false);

  const [editing, setEditing] = useState<ProgramDraft | null>(null);

  const [aiBusy, setAiBusy] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const programPrintRef = useRef<HTMLDivElement>(null);


  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadedAttachments, setUploadedAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") !== "1") return;
    const planTaskId = params.get("planTaskId") ?? "";
    setEditing({ ...emptyDraft(), plan_task_id: planTaskId });
    setPendingFiles([]);
    setUploadedAttachments([]);
    setEditorOpen(true);
    params.delete("new");
    params.delete("planTaskId");
    const query = params.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
    );
  }, []);

  const {
    data: programs = [],
    isLoading,
    isError: programsFailed,
  } = useQuery({
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

  const {
    data: planTasks = [],
    isError: planTasksFailed,
    refetch: refetchPlanTasks,
  } = useQuery({
    queryKey: ["plan-tasks-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_tasks")
        .select("id, seq, task, term")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (typeof window === "undefined" || programs.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const programId = params.get("programId");
    if (!programId) return;
    const row = programs.find((program) => program.id === programId);
    if (!row) return;
    void openEdit(row);
    params.delete("programId");
    const query = params.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
    );
  }, [programs]);

  const ministryNames = useMemo(() => new Set<string>(MINISTRY_PROGRAMS.map((p) => p[1])), []);
  const linkedPlanTask = useMemo(
    () => planTasks.find((task) => String(task.id) === value(editing?.plan_task_id)),
    [planTasks, editing?.plan_task_id],
  );

  const save = useMutation({
    mutationFn: async (draft: ProgramDraft) => {
      const { data: sessionData } = await supabase.auth.getSession();
      let userId = sessionData.session?.user.id ?? "";
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (!authError && authData.user) userId = authData.user.id;
      } catch {
        // Continue with the locally persisted session during a transient auth failure.
      }
      if (!userId) {
        throw new Error("يجب تسجيل الدخول قبل حفظ البرنامج.");
      }

      const payload = {
        user_id: userId,
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
        plan_task_id: draft.plan_task_id || null,
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

  async function loadAttachments(recordId: string, recordTitle = "") {
    const { data, error } = await supabase
      .from("evidences")
      .select("id,name,file_name,file_path,mime_type")
      .eq("linked_type", "برنامج")
      .or(`linked_ref.eq.${recordId}${recordTitle ? `,linked_ref.eq.${recordTitle.replace(/,/g, " ")}` : ""}`)
      .order("created_at", { ascending: true });
    if (error) throw error;
    setUploadedAttachments((data ?? []) as Attachment[]);
  }

  async function uploadFiles(recordId: string, recordTitle: string) {
    const { data: sessionData } = await supabase.auth.getSession();
    let userId = sessionData.session?.user.id ?? "";
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (!authError && authData.user) userId = authData.user.id;
    } catch {
      // Continue with the locally persisted session during a transient auth failure.
    }
    if (!userId) throw new Error("يجب تسجيل الدخول قبل رفع الشواهد.");
    if (!pendingFiles.length) return;
    try {
      for (const file of pendingFiles) {
        if (file.size > 50 * 1024 * 1024) throw new Error(`الملف ${file.name} يتجاوز 50 ميجابايت.`);
        const safe = file.name.replace(/[^\w\-.\u0600-\u06FF ]/g, "_");
        const path = `${userId}/programs/${recordId}/${Date.now()}-${safe}`;
        const { error: uploadError } = await supabase.storage
          .from("evidences")
          .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
        if (uploadError) throw uploadError;
        const mimeType =
          file.type ||
          (
            {
              pdf: "application/pdf",
              doc: "application/msword",
              docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              xls: "application/vnd.ms-excel",
              xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            } as Record<string, string>
          )[file.name.split(".").pop()?.toLowerCase() ?? ""] ||
          null;

        const { error } = await supabase.from("evidences").insert({
          name: file.name,
          etype: (mimeType || "").startsWith("image/") ? "صورة" : "مستند",
          linked_type: "برنامج",
          linked_ref: recordId,
          edate: today(),
          doc_status: "قيد المراجعة",
          description: recordTitle,
          file_path: path,
          file_name: file.name,
          mime_type: mimeType,
        } as never);
        if (error) {
          await supabase.storage.from("evidences").remove([path]);
          throw error;
        }
      }
      setPendingFiles([]);
      await loadAttachments(recordId, recordTitle);
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
      await loadAttachments(row.id, row.name || "");
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



  async function fillProgramWithAi() {
    const brief = aiPrompt.trim();
    if (!editing || brief.length < 5 || aiBusy) return;
    const fields = [
      ["target_group", "الفئة المستهدفة"],
      ["goal", "الهدف من البرنامج"],
      ["indicator", "مؤشر / معيار النجاح"],
      ["required_evidence", "الشواهد المطلوبة"],
      ["notes", "الإجراءات والملاحظات"],
    ] as const;
    const values = Object.fromEntries(
      fields
        .map(([name]) => [name, value(editing[name])] as const)
        .filter(([, text]) => text.trim()),
    );
    const missing = fields.filter(([name]) => !value(editing[name]).trim());
    if (!missing.length) {
      toast.info("الحقول النصية مكتملة بالفعل ويمكنك تعديلها يدويًا.");
      return;
    }
    setAiBusy(true);
    try {
      const result = await generateSmartFill({
        data: {
          recordType: "program",
          recordTitle: "برنامج / نشاط إرشادي",
          brief,
          schoolName: school?.school_name ?? "",
          fields: missing.map(([name, label]) => ({ name, label, type: "textarea" as const })),
          values,
        },
      });
      const suggestions = result.suggestions ?? {};
      setEditing((current) => ({ ...(current ?? emptyDraft()), ...suggestions }));
      toast.success(
        Object.keys(suggestions).length
          ? `تمت تعبئة ${Object.keys(suggestions).length} حقول — راجعها قبل الحفظ.`
          : "لم تتوفر معلومات كافية للتعبئة.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّرت التعبئة الذكية");
    } finally {
      setAiBusy(false);
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
      toast.error(`تعذّر الاستيراد: ${error.message}`);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["programs"] });
    toast.success(`تم استيراد ${payload.length} برنامجاً`);
  }

  return (
    <div dir="rtl" className="space-y-5">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">البرامج والأنشطة</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            أنشئ البرنامج ضمن السجل، واكتب تفاصيله، وأرفق الشواهد والصور.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={openNew}>
            <Plus className="size-4" /> إضافة برنامج
          </Button>
          <Button
            variant="outline"
            onClick={importMinistryPrograms}
            disabled={isLoading || programsFailed}
          >
            <CalendarRange className="size-4" /> الخطة الوزارية 1448هـ
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Stat title="إجمالي البرامج" value={programs.length} />
        <Stat title="منفذ" value={programs.filter((p) => ["منفذ", "مكتمل"].includes(String(p.exec_status ?? ""))).length} />
        <Stat
          title="قيد التنفيذ"
          value={programs.filter((p) => p.exec_status === "قيد التنفيذ").length}
        />
        <Stat
          title="برامج الخطة الوزارية"
          value={programs.filter((p) => ministryNames.has(value(p.name))).length}
        />
      </div>


      <Dialog open={editorOpen} onOpenChange={(open) => !open && setEditorOpen(false)}>
        <DialogContent dir="rtl" className="max-h-[96vh] max-w-6xl overflow-y-auto p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>
              {editing?.id ? "تحرير مستند البرنامج" : "إنشاء مستند برنامج جديد"}
            </DialogTitle>
            <DialogDescription>
              اختر اسم البرنامج، ثم أدخل التفاصيل والإجراءات والنتائج قبل الحفظ.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 bg-muted/20 p-4 lg:grid-cols-[300px_1fr]">
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

            <div className="mx-auto w-full max-w-[210mm] space-y-3">
              {editing && (
                <>
                  <div className="flex justify-end" data-pdf-exclude="true">
                    <PdfPreviewButton
                      elementRef={programPrintRef}
                      filename={`برنامج-${value(editing.name) || "إرشادي"}`}
                      title={value(editing.name) || "تقرير برنامج إرشادي"}
                    />
                  </div>
                  <div ref={programPrintRef} className="record-pdf-document rounded-xl border bg-paper p-5 text-paper-foreground shadow-sm">
                    <OfficialHeader
                      school={school}
                      title={value(editing.name) || "برنامج إرشادي"}
                      reportType="تقرير تنفيذ برنامج"
                      reportNo={value(editing.program_no) || undefined}
                      period={value(editing.term) || undefined}
                    />
                    <div className="mt-5 grid grid-cols-2 border-r border-t border-paper-border text-xs">
                      <DocCell label="نوع البرنامج" value={value(editing.ptype)} />
                      <DocCell label="المجال" value={value(editing.domain)} />
                      <DocCell label="الفئة المستهدفة" value={value(editing.target_group)} />
                      <DocCell label="حالة التنفيذ" value={value(editing.exec_status)} />
                      <DocCell label="تاريخ البداية" value={value(editing.start_date)} />
                      <DocCell label="تاريخ النهاية" value={value(editing.end_date)} />
                      <DocCell label="عدد المستفيدين" value={value(editing.beneficiaries)} />
                      <DocCell label="الفصل الدراسي" value={value(editing.term)} />
                      <DocCell label="مهمة الخطة المرتبطة" value={linkedPlanTask ? `${linkedPlanTask.seq ? `#${linkedPlanTask.seq} - ` : ""}${linkedPlanTask.task ?? ""}` : "—"} />
                      <DocCell label="عدد الشواهد المرفوعة" value={String(uploadedAttachments.length)} />
                    </div>
                    <DocSection title="الهدف">
                      <p className="whitespace-pre-wrap text-sm leading-7">{value(editing.goal) || "—"}</p>
                    </DocSection>
                    <DocSection title="مؤشر النجاح / التنفيذ">
                      <p className="whitespace-pre-wrap text-sm leading-7">{value(editing.indicator) || "—"}</p>
                    </DocSection>
                    <DocSection title="التوثيق والشواهد المطلوبة">
                      <p className="whitespace-pre-wrap text-sm leading-7">{value(editing.required_evidence) || "—"}</p>
                    </DocSection>
                    <DocSection title="الشواهد المرفوعة">
                      {uploadedAttachments.length > 0 ? (
                        <EvidenceGrid attachments={uploadedAttachments} />
                      ) : (
                        <p className="text-sm text-paper-muted-foreground">لم تُرفق شواهد بالبرنامج حتى الآن.</p>
                      )}
                    </DocSection>
                    <DocSection title="الملاحظات والإجراءات">
                      <p className="whitespace-pre-wrap text-sm leading-7">{value(editing.notes) || "—"}</p>
                    </DocSection>
                    <div className="mt-4 rounded-xl border border-paper-border bg-[var(--letterhead-soft)] p-3 text-xs leading-6">
                      <strong className="text-[var(--letterhead-primary)]">ملخص التوثيق:</strong>{" "}
                      حالة التنفيذ: {value(editing.exec_status) || "—"} · عدد المستفيدين: {value(editing.beneficiaries) || "—"} · الشواهد المرفوعة: {uploadedAttachments.length}
                    </div>
                    <OfficialFooter school={school} />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="space-y-4 border-t bg-background p-5">
            <div className="rounded-xl border border-primary/15 bg-primary/5 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="flex items-center gap-2 font-black text-primary">
                  <Sparkles className="size-4" /> التعبئة بالذكاء الاصطناعي
                </Label>
                <span className="text-[10px] text-muted-foreground">
                  وتبقى جميع الحقول قابلة للتعديل اليدوي
                </span>
              </div>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <Textarea
                  rows={2}
                  value={aiPrompt}
                  onChange={(event) => setAiPrompt(event.target.value)}
                  placeholder="اكتب مختصرًا عن البرنامج وأهدافه والفئة المستهدفة"
                  disabled={aiBusy}
                />
                <Button
                  className="shrink-0 gap-2 sm:self-end"
                  onClick={() => void fillProgramWithAi()}
                  disabled={aiBusy || aiPrompt.trim().length < 5}
                >
                  {aiBusy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  {aiBusy ? "جارٍ التعبئة..." : "تعبئة الحقول"}
                </Button>
              </div>
              <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
                لا تضع أسماء الطلاب أو أرقامهم أو أرقام الجوال في الملخص.
              </p>
            </div>
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
              <div>
                <Label className="mb-1.5 block">مهمة الخطة المرتبطة</Label>
                <select
                  value={value(editing?.plan_task_id)}
                  onChange={(e) =>
                    setEditing((x) => ({ ...(x ?? emptyDraft()), plan_task_id: e.target.value }))
                  }
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">— اختر المهمة المرتبطة بالخطة —</option>
                  {planTasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.seq ? `#${task.seq} - ` : ""}
                      {task.task}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
