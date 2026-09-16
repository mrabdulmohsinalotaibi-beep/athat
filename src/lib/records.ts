import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileDown,
  FileImage,
  FileText,
  Image as ImageIcon,
  Loader2,
  Printer,
  RefreshCw,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { recordByKey } from "@/lib/records";
import { useSchool } from "@/lib/school";

import { RecordPage } from "@/components/records/RecordPage";
import { OfficialFooter, OfficialHeader } from "@/components/OfficialHeader";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  MINISTRY_PROGRAMS,
} from "@/lib/ministry-programs";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type ProgramRow = {
  id: string;
  program_no?: string | number | null;
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
  beneficiaries?: number | string | null;
  required_evidence?: string | null;
  notes?: string | null;
  created_at?: string | null;
  noor_synced_at?: string | null;
  noor_sync_ref?: string | null;
};

type EvidenceItem = {
  id: string;
  name: string;
  file_name?: string | null;
  file_path: string;
  mime_type?: string | null;
  description?: string | null;
  url: string;
  kind: "image" | "video" | "document";
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getEvidenceKind(
  mimeType?: string | null,
  fileName?: string | null,
): EvidenceItem["kind"] {
  const mime = String(mimeType ?? "").toLowerCase();
  const name = String(fileName ?? "").toLowerCase();

  if (
    mime.startsWith("image/") ||
    /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(name)
  ) {
    return "image";
  }

  if (
    mime.startsWith("video/") ||
    /\.(mp4|mov|webm|avi|m4v)$/i.test(name)
  ) {
    return "video";
  }

  return "document";
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatShortDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("ar-SA");
}

function safeNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

/* -------------------------------------------------------------------------- */
/* Ministry Programs Dialog                                                   */
/* -------------------------------------------------------------------------- */

function MinistryProgramsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  const queryClient = useQueryClient();

  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const programs = Array.isArray(MINISTRY_PROGRAMS)
    ? MINISTRY_PROGRAMS
    : [];

  const toggleProgram = (name: string) => {
    setSelected((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    );
  };

  const selectAll = () => {
    setSelected(programs.map((program: any) => String(program.name)));
  };

  const clearSelection = () => {
    setSelected([]);
  };

  const addPrograms = async () => {
    if (selected.length === 0) {
      toast.error("اختر برنامجًا واحدًا على الأقل");
      return;
    }

    setSaving(true);

    try {
      const selectedPrograms = programs.filter((program: any) =>
        selected.includes(String(program.name)),
      );

      const payload = selectedPrograms.map((program: any, index: number) => ({
        program_no:
          program.program_no ??
          program.programNo ??
          `P-${Date.now()}-${index + 1}`,

        name: String(program.name ?? ""),

        ptype:
          program.ptype ??
          program.type ??
          "وقائي",

        domain:
          program.domain ??
          "وقائي",

        target_group:
          program.target_group ??
          program.targetGroup ??
          "طلاب المدرسة",

        term:
          program.term ??
          "الفصل الدراسي الأول",

        goal:
          program.goal ??
          program.objective ??
          "",

        indicator:
          program.indicator ??
          program.measure ??
          "",

        exec_status: "لم يبدأ",

        beneficiaries: 0,

        required_evidence:
          program.required_evidence ??
          program.requiredEvidence ??
          "صور وتقرير تنفيذ البرنامج",

        notes: "",
      }));

      const { error } = await supabase
        .from("programs")
        .insert(payload);

      if (error) {
        throw error;
      }

      await queryClient.invalidateQueries({
        queryKey: ["record", "programs"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["programs"],
      });

      toast.success(
        `تمت إضافة ${payload.length} برنامج إلى سجل البرامج`,
      );

      setSelected([]);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("تعذّرت إضافة البرامج");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="max-h-[90vh] max-w-4xl overflow-hidden p-0"
      >
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="size-5" />
            البرامج الإرشادية المقترحة
          </DialogTitle>

          <p className="text-sm text-muted-foreground">
            اختر البرامج التي تريد إضافتها مباشرة إلى سجل البرامج والأنشطة.
          </p>
        </DialogHeader>

        <div className="flex items-center justify-between border-b bg-muted/30 px-6 py-3">
          <span className="text-sm font-medium">
            تم اختيار {selected.length} من {programs.length}
          </span>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={selectAll}
            >
              تحديد الكل
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={clearSelection}
            >
              إلغاء التحديد
            </Button>
          </div>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-6">
          {programs.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
              لا توجد برامج معرفة في قائمة البرامج الوزارية.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {programs.map((program: any, index: number) => {
                const name = String(
                  program.name ?? `برنامج ${index + 1}`,
                );

                const checked = selected.includes(name);

                return (
                  <button
                    key={`${name}-${index}`}
                    type="button"
                    onClick={() => toggleProgram(name)}
                    className={[
                      "flex items-start gap-3 rounded-xl border p-4 text-right transition",
                      checked
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "hover:border-primary/40 hover:bg-muted/30",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border",
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/40",
                      ].join(" ")}
                    >
                      {checked && (
                        <CheckCircle2 className="size-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="font-semibold">
                        {name}
                      </div>

                      <div className="mt-1 text-xs text-muted-foreground">
                        {program.domain ??
                          program.ptype ??
                          "برنامج إرشادي"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            إلغاء
          </Button>

          <Button
            onClick={addPrograms}
            disabled={saving || selected.length === 0}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <BookOpen className="size-4" />
            )}

            إضافة البرامج المحددة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Noor Sync                                                                  */
/* -------------------------------------------------------------------------- */

function NoorSyncButton() {
  const queryClient = useQueryClient();

  const [syncing, setSyncing] = useState(false);

  const syncToNoor = async () => {
    if (syncing) return;

    setSyncing(true);

    try {
      const { data, error } = await supabase
        .from("programs")
        .select(
          "id, name, exec_status, noor_synced_at",
        );

      if (error) {
        throw error;
      }

      const pending = (data ?? []).filter(
        (row: any) =>
          row.exec_status === "مكتمل" &&
          !row.noor_synced_at,
      );

      if (pending.length === 0) {
        toast.info(
          "لا توجد برامج مكتملة تحتاج إلى مزامنة.",
        );
        return;
      }

      /*
       * محاكاة عملية المزامنة إلى نور.
       * عند ربط API الرسمي لاحقًا يتم استبدال هذا الجزء
       * باستدعاء خدمة التكامل الفعلية.
       */
      await new Promise((resolve) =>
        setTimeout(resolve, 900),
      );

      const syncedAt = new Date().toISOString();

      for (const program of pending) {
        const { error: updateError } = await supabase
          .from("programs")
          .update({
            noor_synced_at: syncedAt,
            noor_sync_ref: `NOOR-${program.id.slice(0, 8).toUpperCase()}`,
          })
          .eq("id", program.id);

        if (updateError) {
          throw updateError;
        }
      }

      await queryClient.invalidateQueries();

      toast.success(
        `تمت مزامنة ${pending.length} برنامج مكتمل.`,
      );
    } catch (error) {
      console.error(error);
      toast.error(
        "تعذرت مزامنة البرامج مع نور.",
      );
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={syncToNoor}
      disabled={syncing}
      title="مزامنة البرامج المكتملة"
    >
      {syncing ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <RefreshCw className="size-4" />
      )}

      مزامنة نور
    </Button>
  );
}

/* -------------------------------------------------------------------------- */
/* Clear Programs                                                             */
/* -------------------------------------------------------------------------- */

function ClearProgramsButton() {
  const queryClient = useQueryClient();

  const [busy, setBusy] = useState(false);

  const clearPrograms = async () => {
    const confirmed = window.confirm(
      "هل أنت متأكد من حذف جميع البرامج؟\n\nسيتم حذف البرامج من قاعدة البيانات، ولا يمكن التراجع عن العملية.",
    );

    if (!confirmed) return;

    setBusy(true);

    try {
      const { error } = await supabase
        .from("programs")
        .delete()
        .neq(
          "id",
          "00000000-0000-0000-0000-000000000000",
        );

      if (error) {
        throw error;
      }

      await queryClient.invalidateQueries();

      toast.success("تم حذف البرامج بنجاح.");
    } catch (error) {
      console.error(error);
      toast.error("تعذر حذف البرامج.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={clearPrograms}
      disabled={busy}
      className="text-destructive hover:text-destructive"
      title="حذف جميع البرامج"
    >
      {busy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Trash2 className="size-4" />
      )}

      حذف البرامج
    </Button>
  );
}

/* -------------------------------------------------------------------------- */
/* Program Statistics                                                         */
/* -------------------------------------------------------------------------- */

function ProgramsOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ["programs-overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select(
          "id, name, ptype, domain, exec_status, beneficiaries",
        );

      if (error) {
        throw error;
      }

      return (data ?? []) as ProgramRow[];
    },
  });

  const stats = useMemo(() => {
    const rows = data ?? [];

    return {
      total: rows.length,

      completed: rows.filter(
        (row) => row.exec_status === "مكتمل",
      ).length,

      inProgress: rows.filter(
        (row) => row.exec_status === "قيد التنفيذ",
      ).length,

      notStarted: rows.filter(
        (row) => row.exec_status === "لم يبدأ",
      ).length,

      postponed: rows.filter(
        (row) => row.exec_status === "مؤجل",
      ).length,

      beneficiaries: rows.reduce(
        (sum, row) =>
          sum + safeNumber(row.beneficiaries),
        0,
      ),
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((item) => (
          <div
            key={item}
            className="h-24 animate-pulse rounded-xl border bg-muted/30"
          />
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "إجمالي البرامج",
      value: stats.total,
      icon: ClipboardList,
    },
    {
      title: "مكتملة",
      value: stats.completed,
      icon: CheckCircle2,
    },
    {
      title: "قيد التنفيذ",
      value: stats.inProgress,
      icon: RefreshCw,
    },
    {
      title: "لم تبدأ",
      value: stats.notStarted,
      icon: BarChart3,
    },
    {
      title: "المستفيدون",
      value: stats.beneficiaries,
      icon: Users,
    },
  ];

  return (
    <div
      dir="rtl"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
    >
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.title}
            className="rounded-xl border bg-card p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  {card.title}
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {card.value.toLocaleString("ar-SA")}
                </p>
              </div>

              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Evidence Loading                                                           */
/* -------------------------------------------------------------------------- */

async function loadProgramEvidence(
  programIds: string[],
): Promise<Record<string, EvidenceItem[]>> {
  if (programIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from("evidences")
    .select(
      "id, name, file_name, file_path, mime_type, description, linked_ref, created_at",
    )
    .in("linked_ref", programIds)
    .not("file_path", "is", null)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  const rows = data ?? [];

  const paths = rows
    .map((item: any) =>
      String(item.file_path ?? ""),
    )
    .filter(Boolean);

  let signedUrls: Array<{
    path?: string;
    signedUrl?: string;
  }> = [];

  if (paths.length > 0) {
    const result =
      await supabase.storage
        .from("evidences")
        .createSignedUrls(paths, 3600);

    if (result.error) {
      console.warn(
        "Could not create signed evidence URLs",
        result.error,
      );
    } else {
      signedUrls = result.data ?? [];
    }
  }

  const urlByPath = new Map(
    signedUrls.map((item) => [
      String(item.path ?? ""),
      String(item.signedUrl ?? ""),
    ]),
  );

  const result: Record<string, EvidenceItem[]> = {};

  for (const item of rows as any[]) {
    const linkedRef = String(
      item.linked_ref ?? "",
    );

    if (!linkedRef) continue;

    const filePath = String(
      item.file_path ?? "",
    );

    const fileName = String(
      item.file_name ??
        item.name ??
        "شاهد",
    );

    const evidence: EvidenceItem = {
      id: String(item.id),
      name: String(
        item.name ??
          fileName ??
          "شاهد",
      ),
      file_name: fileName,
      file_path: filePath,
      mime_type: item.mime_type,
      description: item.description,
      url: urlByPath.get(filePath) ?? "",
      kind: getEvidenceKind(
        item.mime_type,
        fileName,
      ),
    };

    if (!result[linkedRef]) {
      result[linkedRef] = [];
    }

    result[linkedRef].push(evidence);
  }

  return result;
}

/* -------------------------------------------------------------------------- */
/* All Programs Print Report                                                  */
/* -------------------------------------------------------------------------- */

function ProgramsPrintReport({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { data: school } = useSchool();

  const [printing, setPrinting] = useState(false);

  const { data: programs = [], isLoading: programsLoading } =
    useQuery({
      queryKey: ["programs-print-all"],
      enabled: open,
      queryFn: async () => {
        const { data, error } = await supabase
          .from("programs")
          .select("*")
          .order("created_at", {
            ascending: true,
          });

        if (error) {
          throw error;
        }

        return (data ?? []) as ProgramRow[];
      },
    });

  const programIds = useMemo(
    () => programs.map((program) => program.id),
    [programs],
  );

  const {
    data: evidenceByProgram = {},
    isLoading: evidenceLoading,
  } = useQuery({
    queryKey: [
      "programs-print-evidence",
      programIds,
    ],
    enabled:
      open &&
      programIds.length > 0,
    queryFn: () =>
      loadProgramEvidence(programIds),
  });

  const ready =
    open &&
    !programsLoading &&
    !evidenceLoading;

  const imageCount = useMemo(
    () =>
      Object.values(evidenceByProgram)
        .flat()
        .filter(
          (item) => item.kind === "image",
        ).length,
    [evidenceByProgram],
  );

  const evidenceCount = useMemo(
    () =>
      Object.values(evidenceByProgram)
        .flat().length,
    [evidenceByProgram],
  );

  const printNow = useCallback(() => {
    if (!ready || printing) return;

    setPrinting(true);

    /*
     * إعطاء المتصفح فرصة لإظهار الصور قبل بدء نافذة الطباعة.
     */
    window.setTimeout(() => {
      window.print();

      window.setTimeout(() => {
        setPrinting(false);
        onClose();
      }, 500);
    }, 700);
  }, [
    ready,
    printing,
    onClose,
  ]);

  useEffect(() => {
    if (!open || !ready) return;

    /*
     * لا نطبع تلقائيًا.
     * المستخدم يضغط زر "طباعة" حتى لا تفتح نافذة الطباعة
     * مباشرة عند فتح شاشة التقرير.
     */
  }, [open, ready]);

  if (!open) {
    return null;
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!value && !printing) {
            onClose();
          }
        }}
      >
        <DialogContent
          dir="rtl"
          className="max-h-[90vh] max-w-3xl overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="size-5" />
              التقرير الشامل للبرامج الإرشادية
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border bg-muted/20 p-4 text-center">
                <div className="text-xs text-muted-foreground">
                  البرامج
                </div>
                <div className="mt-1 text-2xl font-bold">
                  {programs.length}
                </div>
              </div>

              <div className="rounded-xl border bg-muted/20 p-4 text-center">
                <div className="text-xs text-muted-foreground">
                  الشواهد
                </div>
                <div className="mt-1 text-2xl font-bold">
                  {evidenceCount}
                </div>
              </div>

              <div className="rounded-xl border bg-muted/20 p-4 text-center">
                <div className="text-xs text-muted-foreground">
                  الصور
                </div>
                <div className="mt-1 text-2xl font-bold">
                  {imageCount}
                </div>
              </div>
            </div>

            {programsLoading ||
            evidenceLoading ? (
              <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-5 animate-spin" />
                  جارٍ تجهيز جميع البرامج والشواهد...
                </div>
              </div>
            ) : programs.length === 0 ? (
              <div className="rounded-xl border border-dashed p-10 text-center">
                لا توجد برامج لطباعة التقرير.
              </div>
            ) : (
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="text-sm leading-7 text-muted-foreground">
                  سيتم إنشاء تقرير A4 يتضمن جميع بيانات البرامج،
                  الأهداف، المؤشرات، حالة التنفيذ، أعداد المستفيدين،
                  الشواهد والصور المرتبطة بكل برنامج.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={printing}
            >
              إلغاء
            </Button>

            <Button
              onClick={printNow}
              disabled={
                !ready ||
                programs.length === 0 ||
                printing
              }
            >
              {printing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Printer className="size-4" />
              )}

              طباعة التقرير الشامل A4
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* Print Document                                                      */}
      {/* ------------------------------------------------------------------ */}

      <div
        className="programs-print-root"
        dir="rtl"
        aria-hidden="true"
      >
        <div className="programs-print-document">
          <OfficialHeader
            school={school}
            title="التقرير الشامل للبرامج والأنشطة الإرشادية"
            reportType="البرامج الإرشادية"
          />

          <div className="programs-print-cover">
            <h1>
              التقرير الشامل للبرامج والأنشطة الإرشادية
            </h1>

            <p>
              سجل توثيق وتنفيذ ومتابعة البرامج الإرشادية
            </p>

            <div className="programs-print-summary">
              <div>
                <span>عدد البرامج</span>
                <strong>
                  {programs.length}
                </strong>
              </div>

              <div>
                <span>عدد الشواهد</span>
                <strong>
                  {evidenceCount}
                </strong>
              </div>

              <div>
                <span>عدد الصور</span>
                <strong>
                  {imageCount}
                </strong>
              </div>

              <div>
                <span>تاريخ التقرير</span>
                <strong>
                  {formatDate(
                    new Date().toISOString(),
                  )}
                </strong>
              </div>
            </div>
          </div>

          {programs.map(
            (program, programIndex) => {
              const evidences =
                evidenceByProgram[
                  program.id
                ] ?? [];

              return (
                <section
                  key={program.id}
                  className="program-print-report"
                >
                  <div className="program-print-number">
                    البرنامج رقم{" "}
                    {programIndex + 1}
                  </div>

                  <div className="program-print-heading">
                    <div>
                      <h2>
                        {program.name ||
                          "برنامج إرشادي"}
                      </h2>

                      <p>
                        رقم البرنامج:{" "}
                        {program.program_no ||
                          "—"}
                      </p>
                    </div>

                    <div className="program-print-status">
                      {program.exec_status ||
                        "—"}
                    </div>
                  </div>

                  <div className="program-print-section">
                    <h3>
                      البيانات الأساسية
                    </h3>

                    <table>
                      <tbody>
                        <tr>
                          <th>
                            اسم البرنامج
                          </th>
                          <td>
                            {program.name ||
                              "—"}
                          </td>

                          <th>
                            رقم البرنامج
                          </th>
                          <td>
                            {program.program_no ||
                              "—"}
                          </td>
                        </tr>

                        <tr>
                          <th>
                            نوع البرنامج
                          </th>
                          <td>
                            {program.ptype ||
                              "—"}
                          </td>

                          <th>
                            المجال
                          </th>
                          <td>
                            {program.domain ||
                              "—"}
                          </td>
                        </tr>

                        <tr>
                          <th>
                            الفئة المستهدفة
                          </th>
                          <td>
                            {program.target_group ||
                              "—"}
                          </td>

                          <th>
                            الفصل الدراسي
                          </th>
                          <td>
                            {program.term ||
                              "—"}
                          </td>
                        </tr>

                        <tr>
                          <th>
                            تاريخ البداية
                          </th>
                          <td>
                            {formatShortDate(
                              program.start_date,
                            )}
                          </td>

                          <th>
                            تاريخ النهاية
                          </th>
                          <td>
                            {formatShortDate(
                              program.end_date,
                            )}
                          </td>
                        </tr>

                        <tr>
                          <th>
                            حالة التنفيذ
                          </th>
                          <td>
                            {program.exec_status ||
                              "—"}
                          </td>

                          <th>
                            عدد المستفيدين
                          </th>
                          <td>
                            {safeNumber(
                              program.beneficiaries,
                            ).toLocaleString(
                              "ar-SA",
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {program.goal && (
                    <div className="program-print-section">
                      <h3>
                        الهدف من البرنامج
                      </h3>

                      <div className="program-print-text">
                        {program.goal}
                      </div>
                    </div>
                  )}

                  {program.indicator && (
                    <div className="program-print-section">
                      <h3>
                        المؤشر / معيار القياس
                      </h3>

                      <div className="program-print-text">
                        {program.indicator}
                      </div>
                    </div>
                  )}

                  {program.required_evidence && (
                    <div className="program-print-section">
                      <h3>
                        الشواهد المطلوبة
                      </h3>

                      <div className="program-print-text">
                        {program.required_evidence}
                      </div>
                    </div>
                  )}

                  {program.notes && (
                    <div className="program-print-section">
                      <h3>
                        الملاحظات
                      </h3>

                      <div className="program-print-text">
                        {program.notes}
                      </div>
                    </div>
                  )}

                  <div className="program-print-section">
                    <div className="program-print-evidence-title">
                      <div>
                        <h3>
                          الشواهد والمرفقات
                        </h3>

                        <p>
                          الشواهد المرتبطة بهذا البرنامج
                        </p>
                      </div>

                      <strong>
                        {evidences.length} شاهد
                      </strong>
                    </div>

                    {evidences.length === 0 ? (
                      <div className="program-print-empty">
                        لا توجد شواهد مرفقة بهذا البرنامج.
                      </div>
                    ) : (
                      <>
                        <div className="program-print-evidence-list">
                          {evidences
                            .filter(
                              (item) =>
                                item.kind !==
                                "image",
                            )
                            .map(
                              (
                                evidence,
                                index,
                              ) => (
                                <div
                                  key={
                                    evidence.id
                                  }
                                  className="program-print-file"
                                >
                                  <div>
                                    <strong>
                                      شاهد{" "}
                                      {index +
                                        1}
                                    </strong>

                                    <span>
                                      {
                                        evidence.name
                                      }
                                    </span>
                                  </div>

                                  <small>
                                    {evidence.kind ===
                                    "video"
                                      ? "مقطع فيديو"
                                      : "مستند"}
                                  </small>
                                </div>
                              ),
                            )}
                        </div>

                        {evidences.some(
                          (item) =>
                            item.kind ===
                            "image",
                        ) && (
                          <div className="program-print-images">
                            {evidences
                              .filter(
                                (item) =>
                                  item.kind ===
                                  "image",
                              )
                              .map(
                                (
                                  evidence,
                                  index,
                                ) => (
                                  <figure
                                    key={
                                      evidence.id
                                    }
                                    className="program-print-image-card"
                                  >
                                    {evidence.url ? (
                                      <img
                                        src={
                                          evidence.url
                                        }
                                        alt={
                                          evidence.name
                                        }
                                      />
                                    ) : (
                                      <div className="program-print-image-missing">
                                        تعذر تحميل الصورة
                                      </div>
                                    )}

                                    <figcaption>
                                      <strong>
                                        شاهد صورة{" "}
                                        {index +
                                          1}
                                      </strong>

                                      <span>
                                        {
                                          evidence.name
                                        }
                                      </span>

                                      {evidence.description && (
                                        <small>
                                          {
                                            evidence.description
                                          }
                                        </small>
                                      )}
                                    </figcaption>
                                  </figure>
                                ),
                              )}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="program-print-signatures">
                    <div>
                      اسم الموجه الطلابي
                      <span />
                    </div>

                    <div>
                      قائد المدرسة
                      <span />
                    </div>

                    <div>
                      التاريخ
                      <span />
                    </div>
                  </div>
                </section>
              );
            },
          )}

          <OfficialFooter school={school} />
        </div>
      </div>

      <style>{`
        .programs-print-root {
          display: none;
        }

        .programs-print-document {
          width: 210mm;
          margin: 0 auto;
          padding: 12mm 14mm;
          box-sizing: border-box;
          direction: rtl;
          background: #fff;
          color: #111827;
          font-family: Arial, Tahoma, sans-serif;
        }

        .programs-print-cover {
          text-align: center;
          padding: 18mm 0 12mm;
        }

        .programs-print-cover h1 {
          margin: 0;
          font-size: 22px;
          font-weight: 800;
        }

        .programs-print-cover p {
          margin: 5px 0 0;
          font-size: 12px;
        }

        .programs-print-summary {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 5mm;
          margin-top: 12mm;
        }

        .programs-print-summary > div {
          border: 1px solid #cbd5e1;
          border-radius: 5px;
          padding: 8mm 4mm;
          text-align: center;
        }

        .programs-print-summary span {
          display: block;
          font-size: 10px;
          margin-bottom: 4px;
        }

        .programs-print-summary strong {
          display: block;
          font-size: 18px;
        }

        .program-print-report {
          break-after: page;
          page-break-after: always;
          min-height: 270mm;
          box-sizing: border-box;
          padding-top: 5mm;
        }

        .program-print-report:last-of-type {
          break-after: auto;
          page-break-after: auto;
        }

        .program-print-number {
          display: inline-block;
          border: 1px solid #cbd5e1;
          border-radius: 999px;
          padding: 3px 9px;
          font-size: 10px;
          margin-bottom: 4mm;
        }

        .program-print-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10mm;
          border-bottom: 2px solid #111827;
          padding-bottom: 5mm;
        }

        .program-print-heading h2 {
          margin: 0;
          font-size: 19px;
          font-weight: 800;
        }

        .program-print-heading p {
          margin: 4px 0 0;
          font-size: 10px;
        }

        .program-print-status {
          border: 1px solid #94a3b8;
          border-radius: 5px;
          padding: 7px 12px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
        }

        .program-print-section {
          margin-top: 6mm;
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .program-print-section h3 {
          margin: 0;
          padding: 7px 9px;
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          font-size: 12px;
          font-weight: 800;
        }

        .program-print-section table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10.5px;
        }

        .program-print-section th,
        .program-print-section td {
          border: 1px solid #cbd5e1;
          padding: 7px;
          text-align: right;
          vertical-align: top;
        }

        .program-print-section th {
          width: 17%;
          font-weight: 700;
          background: #f8fafc;
        }

        .program-print-text {
          border: 1px solid #cbd5e1;
          border-top: 0;
          min-height: 12mm;
          padding: 9px;
          font-size: 10.5px;
          line-height: 1.9;
          white-space: pre-wrap;
        }

        .program-print-evidence-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8mm;
        }

        .program-print-evidence-title h3 {
          border: 0;
          background: transparent;
          padding: 0;
        }

        .program-print-evidence-title p {
          margin: 3px 0 0;
          font-size: 9px;
        }

        .program-print-evidence-title > strong {
          border: 1px solid #cbd5e1;
          border-radius: 999px;
          padding: 5px 10px;
          font-size: 10px;
          white-space: nowrap;
        }

        .program-print-empty {
          border: 1px dashed #cbd5e1;
          padding: 12mm;
          text-align: center;
          font-size: 10px;
        }

        .program-print-evidence-list {
          display: grid;
          gap: 3mm;
          margin-top: 4mm;
        }

        .program-print-file {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 5mm;
          border: 1px solid #cbd5e1;
          padding: 5px 8px;
          font-size: 10px;
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .program-print-file div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .program-print-file small {
          font-size: 9px;
        }

        .program-print-images {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 7mm;
          margin-top: 6mm;
        }

        .program-print-image-card {
          margin: 0;
          border: 1px solid #cbd5e1;
          padding: 4mm;
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .program-print-image-card img {
          display: block;
          width: 100%;
          height: 78mm;
          object-fit: contain;
          border: 1px solid #e2e8f0;
          background: #fff;
        }

        .program-print-image-card figcaption {
          display: flex;
          flex-direction: column;
          gap: 2px;
          margin-top: 3mm;
          font-size: 9px;
        }

        .program-print-image-card figcaption span {
          word-break: break-word;
        }

        .program-print-image-card figcaption small {
          line-height: 1.6;
        }

        .program-print-image-missing {
          height: 78mm;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px dashed #cbd5e1;
          font-size: 10px;
        }

        .program-print-signatures {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10mm;
          margin-top: 15mm;
          padding-top: 5mm;
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .program-print-signatures > div {
          text-align: center;
          font-size: 10px;
        }

        .program-print-signatures span {
          display: block;
          height: 12mm;
          margin-top: 4mm;
          border-bottom: 1px solid #111827;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }

          html,
          body {
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          body * {
            visibility: hidden !important;
          }

          .programs-print-root,
          .programs-print-root * {
            visibility: visible !important;
          }

          .programs-print-root {
            display: block !important;
            position: absolute !important;
            inset: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          .programs-print-document {
            display: block !important;
            width: 210mm !important;
            margin: 0 !important;
            padding: 12mm 14mm !important;
            box-sizing: border-box !important;
          }

          .program-print-report {
            break-after: page !important;
            page-break-after: always !important;
          }

          .program-print-report:last-of-type {
            break-after: auto !important;
            page-break-after: auto !important;
          }

          .program-print-image-card,
          .program-print-section,
          .program-print-signatures,
          .program-print-file {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          img {
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
        }
      `}</style>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Main Page                                                                  */
/* -------------------------------------------------------------------------- */

export default function ProgramsPage() {
  const [ministryOpen, setMinistryOpen] =
    useState(false);

  const [printAllOpen, setPrintAllOpen] =
    useState(false);

  const config = useMemo(
    () => recordByKey("programs"),
    [],
  );

  return (
    <div
      dir="rtl"
      className="space-y-5"
    >
      {/* ------------------------------------------------------------------ */}
      {/* Page Header                                                          */}
      {/* ------------------------------------------------------------------ */}

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <BookOpen className="size-6" />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  البرامج والأنشطة الإرشادية
                </h1>

                <p className="mt-1 text-sm text-muted-foreground">
                  إدارة البرامج الإرشادية وتنفيذها وتوثيقها بالشواهد
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setMinistryOpen(true)
              }
            >
              <BookOpen className="size-4" />
              البرامج الوزارية
            </Button>

            <NoorSyncButton />

            <Button
              variant="outline"
              onClick={() =>
                setPrintAllOpen(true)
              }
            >
              <Printer className="size-4" />
              التقرير الشامل
            </Button>

            <ClearProgramsButton />
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Overview                                                          */}
        {/* ---------------------------------------------------------------- */}

        <ProgramsOverview />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Main Records                                                        */}
      {/* ------------------------------------------------------------------ */}

      <RecordPage
        config={config}
        toolbarExtra={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setMinistryOpen(true)
              }
            >
              <BookOpen className="size-4" />
              إضافة من البرامج الوزارية
            </Button>

            <Button
              variant="outline"
              onClick={() =>
                setPrintAllOpen(true)
              }
            >
              <FileDown className="size-4" />
              تقرير شامل A4
            </Button>
          </div>
        }
      />

      {/* ------------------------------------------------------------------ */}
      {/* Ministry Programs                                                    */}
      {/* ------------------------------------------------------------------ */}

      <MinistryProgramsDialog
        open={ministryOpen}
        onOpenChange={setMinistryOpen}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Print All                                                            */}
      {/* ------------------------------------------------------------------ */}

      <ProgramsPrintReport
        open={printAllOpen}
        onClose={() =>
          setPrintAllOpen(false)
        }
      />

      {/* ------------------------------------------------------------------ */}
      {/* Small UI improvements                                                */}
      {/* ------------------------------------------------------------------ */}

      <style>{`
        /*
         * تحسين شكل جدول البرامج دون التأثير على بقية سجلات النظام.
         */
        [data-record-key="programs"] {
          direction: rtl;
        }

        /*
         * تحسين قراءة حقول البرامج الطويلة.
         */
        [data-record-key="programs"] textarea {
          min-height: 120px;
          resize: vertical;
          line-height: 1.8;
        }

        /*
         * عند وجود جدول عريض، يسمح بالتمرير الأفقي
         * بدل ضغط الأعمدة.
         */
        [data-record-key="programs"] {
          overflow-x: auto;
        }
      `}</style>
    </div>
  );
}
