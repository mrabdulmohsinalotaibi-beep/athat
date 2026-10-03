import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, CheckSquare, FileText, Loader2, RotateCcw, Send, ShieldCheck, Sparkles, Square } from "lucide-react";
import { toast } from "sonner";
import { HijriDatePicker } from "@/components/HijriDatePicker";

import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/lib/school";
import { computeKpis, isPercentKpi, type KpiInput } from "@/lib/kpi";
import { RECORDS, type FieldDef } from "@/lib/records";
import { displayRecordValue } from "@/lib/display";
import { formatHijriDate } from "@/lib/date";
import { generateSmartFill } from "@/lib/deepseek.functions";

import { OfficialFooter, OfficialHeader } from "@/components/OfficialHeader";
import { Button } from "@/components/ui/button";

import { Label } from "@/components/ui/label";
import { PdfPreviewButton } from "@/components/PdfPreviewButton";
import { SendForSignatureDialog } from "@/components/SendForSignatureDialog";



type ReportRow = Record<string, unknown> & { id: string };

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "التقارير | الذات" },
      {
        name: "description",
        content: "إعداد واستعراض تقارير التوجيه الطلابي الرسمية ومشاركتها عبر واتساب.",
      },
    ],
  }),
  component: ReportsPage,
});

/* =========================================================
   تحويل حقول السجل إلى أعمدة جدول التقرير
   (فقط الحقول المعلّمة بـ list: true تظهر في جدول التقرير)
========================================================= */
function reportColumns(fields: FieldDef[]) {
  return fields
    .filter((field) => field.list)
    .map((field) => ({ key: field.name, label: field.label, type: field.type }));
}

/* =========================================================
   أدوات التاريخ وجلب البيانات
========================================================= */

function dateFieldForRecord(key: string) {
  const fields: Record<string, string> = {
    cases: "opened_at",
    plan: "due_date",
    programs: "start_date",
    interviews: "idate",
    attendance: "adate",
    behavior: "bdate",
    referrals: "referral_date",
    committees: "mdate",
    evidences: "edate",
    calendar: "edate",
  };
  return fields[key];
}

function reportSelectColumns(record: { key: string; fields: FieldDef[] }) {
  const columns = new Set<string>([
    "id",
    ...reportColumns(record.fields).map((column) => column.key),
  ]);

  const metricFields: Record<string, string[]> = {
    plan: ["exec_status", "doc_status", "indicator", "required_evidence", "done_date", "notes"],
    programs: ["exec_status", "goal", "indicator", "start_date", "end_date", "required_evidence", "notes"],
    evidences: ["file_url", "description", "reviewed_by", "notes"],
    cases: ["case_status", "last_followup", "followup_at"],
    attendance: ["case_type", "count_days"],
    interviews: ["itype"],
  };

  for (const field of metricFields[record.key] ?? []) columns.add(field);
  return [...columns].join(",");
}

function ReportsPage() {
  const queryClient = useQueryClient();
  const { data: school } = useSchool();
  const reportRef = useRef<HTMLDivElement>(null);

  const reportableRecords = useMemo(() => RECORDS.filter((record) => record.key !== "reports"), []);

  const [reportMode, setReportMode] = useState<"single" | "combined">("single");
  const [selectedSingleKey, setSelectedSingleKey] = useState("programs");
  const [period, setPeriod] = useState("");
  const [documentNo, setDocumentNo] = useState("");
  const [reportTitle, setReportTitle] = useState("تقرير تنفيذ أعمال التوجيه الطلابي");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [narrative, setNarrative] = useState("");
  const [aiNarrativeBusy, setAiNarrativeBusy] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(["plan", "programs", "evidences"]);
  const [recipientMemberId, setRecipientMemberId] = useState("");
  const [handoffNote, setHandoffNote] = useState("");
  const [workflowPlanTaskId, setWorkflowPlanTaskId] = useState("");
  const [workflowProgramId, setWorkflowProgramId] = useState("");
  const [workflowDraftInitialized, setWorkflowDraftInitialized] = useState(false);
  const [signatureReportOpen, setSignatureReportOpen] = useState(false);
  const [signatureReportId, setSignatureReportId] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("workflow") !== "1") return;
    const planTaskId = params.get("planTaskId") ?? "";
    const programId = params.get("programId") ?? "";
    setWorkflowPlanTaskId(planTaskId);
    setWorkflowProgramId(programId);
    setWorkflowDraftInitialized(false);
    setSignatureReportId("");
    setSignatureReportOpen(false);
    setReportMode("combined");
    setSelectedKeys(["plan", "programs", "evidences"]);
    setReportTitle("تقرير تنفيذ مهمة الخطة");
  }, []);

  const activeSelectedKeys = reportMode === "single" ? [selectedSingleKey] : selectedKeys;
  const selectedRecords = reportableRecords.filter((record) =>
    activeSelectedKeys.includes(record.key),
  );
  const selectedKeySignature = [...activeSelectedKeys].sort().join(",");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [
      "official-reports-selected-records",
      selectedKeySignature,
      fromDate,
      toDate,
      workflowPlanTaskId,
      workflowProgramId,
    ],
    queryFn: async () => {
      let workflowProgramRefs: string[] = [];
      let resolvedPlanTaskId = workflowPlanTaskId;
      if (workflowProgramId) {
        const { data: program } = await (supabase as any)
          .from("programs")
          .select("id,name,plan_task_id")
          .eq("id", workflowProgramId)
          .maybeSingle();
        if (program) {
          workflowProgramRefs = [String(program.id), String(program.name ?? "")].filter(Boolean);
          resolvedPlanTaskId = String(program.plan_task_id ?? "");
        }
      } else if (workflowPlanTaskId) {
        const { data: linkedPrograms } = await (supabase as any)
          .from("programs")
          .select("id,name")
          .eq("plan_task_id", workflowPlanTaskId);
        workflowProgramRefs = (linkedPrograms ?? [])
          .flatMap((program: any) => [String(program.id), String(program.name ?? "")])
          .filter(Boolean);
      }

      const results = await Promise.all(
        selectedRecords.map(async (record) => {
          const rows: ReportRow[] = [];
          const batchSize = 1000;
          const dateField = dateFieldForRecord(record.key);

          for (let offset = 0; ; offset += batchSize) {
            let request = (supabase as any)
              .from(record.table)
              .select(reportSelectColumns(record))
              .order("id", { ascending: true })
              .range(offset, offset + batchSize - 1);

            if (dateField && fromDate) request = request.gte(dateField, fromDate);
            if (dateField && toDate) request = request.lte(dateField, toDate);

            if (record.key === "plan" && (workflowPlanTaskId || workflowProgramId)) {
              request = resolvedPlanTaskId
                ? request.eq("id", resolvedPlanTaskId)
                : request.eq("id", "00000000-0000-0000-0000-000000000000");
            }
            if (record.key === "programs") {
              if (workflowProgramId) request = request.eq("id", workflowProgramId);
              else if (workflowPlanTaskId) request = request.eq("plan_task_id", workflowPlanTaskId);
            }
            if (record.key === "evidences" && (workflowPlanTaskId || workflowProgramId || workflowProgramRefs.length)) {
              const refs = [...new Set([
                ...workflowProgramRefs,
                ...(resolvedPlanTaskId ? [resolvedPlanTaskId] : []),
              ])];
              request = refs.length ? request.in("linked_ref", refs) : request.eq("id", "00000000-0000-0000-0000-000000000000");
              request = request.eq("doc_status", "معتمد");
            }

            const result = await request;
            if (result.error) {
              return { key: record.key, data: [] as ReportRow[], error: result.error };
            }

            const batch = (result.data ?? []) as ReportRow[];
            rows.push(...batch);
            if (batch.length < batchSize) break;
          }

          return { key: record.key, data: rows, error: null };
        }),
      );

      const errors = results
        .filter((item) => item.error)
        .map((item) => ({
          key: item.key,
          message: item.error?.message ?? "خطأ غير معروف",
        }));

      errors.forEach((item) => {
        console.warn(`[reports] تعذّر تحميل ${item.key}:`, item.message);
      });

      return {
        sections: Object.fromEntries(
          results.map((item) => [item.key, item.error ? [] : item.data]),
        ) as Record<string, ReportRow[]>,
        errors,
        resolvedPlanTaskId,
      };
    },
    staleTime: 30_000,
  });

  const sections = useMemo(() => data?.sections ?? {}, [data]);

  const { data: schoolTeamContext } = useQuery({
    queryKey: ["school-team-context"],
    queryFn: async () => {
      const { data: context, error } = await (supabase as any).rpc("get_my_school_context");
      if (error) throw error;
      return context as {
        membership?: { id: string; role: string; member_status: string } | null;
        members?: Array<{
          id: string;
          display_name?: string | null;
          role: string;
          member_status: string;
        }>;
      };
    },
    staleTime: 30_000,
  });

  // Date filtering is performed by Postgres before rows are transferred to the browser.
  // In workflow mode, the evidence section is already restricted at the database level
  // to approved evidence only.
  const filteredSections = sections;

  const kpis = useMemo(() => {
    const computed = computeKpis({
      planTasks: (filteredSections["plan"] ?? []) as unknown as KpiInput["planTasks"],
      cases: (filteredSections["cases"] ?? []) as unknown as KpiInput["cases"],
      attendance: (filteredSections["attendance"] ?? []) as unknown as KpiInput["attendance"],
      interviews: (filteredSections["interviews"] ?? []) as unknown as KpiInput["interviews"],
      students: (filteredSections["students"] ?? []) as unknown as KpiInput["students"],
    });

    const visibleKpis = new Set<string>();
    if (activeSelectedKeys.includes("plan")) visibleKpis.add("plan");
    if (activeSelectedKeys.includes("cases")) visibleKpis.add("cases");
    if (activeSelectedKeys.includes("attendance") && activeSelectedKeys.includes("students")) {
      visibleKpis.add("attendance");
    }
    if (activeSelectedKeys.includes("interviews")) {
      visibleKpis.add("sessions");
      visibleKpis.add("guardians");
    }

    return computed
      .filter((kpi) => visibleKpis.has(kpi.key))
      .map((kpi) => ({
        key: kpi.key,
        title: kpi.label,
        value: kpi.value,
        description: kpi.hint,
      }));
  }, [filteredSections, selectedKeySignature]);

  async function generateNarrativeWithAi() {
    if (!selectedRecords.length || aiNarrativeBusy) return;
    setAiNarrativeBusy(true);
    try {
      const sectionSummary = selectedRecords.map((record) => ({
        section: record.title,
        count: filteredSections[record.key]?.length ?? 0,
      }));
      const result = await generateSmartFill({
        data: {
          recordType: "official_report",
          recordTitle: reportTitle || "تقرير التوجيه الطلابي",
          brief: [
            "اكتب ملخصًا تنفيذيًا مهنيًا ومحايدًا للتقرير المدرسي اعتمادًا فقط على الأرقام والبيانات المرسلة.",
            "لا تخترع أسماء أو نتائج أو أسبابًا غير موجودة. اختم بتوصيات عملية قصيرة قابلة للتعديل.",
            period ? `الفترة: ${period}` : "",
            fromDate || toDate ? `النطاق: ${fromDate || "البداية"} إلى ${toDate || "النهاية"}` : "",
            `إجمالي الصفوف: ${totalRows}`,
            `الأقسام: ${sectionSummary.map((item) => `${item.section}: ${item.count}`).join("، ")}`,
            `إنجاز الخطة: ${planProgress}%، البرامج المنفذة: ${programDone} من ${programRows.length}، الشواهد: ${evidenceRows.length}`,
          ].filter(Boolean).join("\n"),
          schoolName: school?.school_name ?? "",
          fields: [{ name: "narrative", label: "التحليل والملاحظات والتوصيات", type: "textarea" as const }],
          values: {},
        },
      });
      const suggestion = String(result?.suggestions?.narrative ?? "").trim();
      if (!suggestion) {
        toast.info("لم تتوفر بيانات كافية لإنشاء ملخص.");
        return;
      }
      setNarrative(suggestion);
      toast.success("تم إنشاء مسودة الملخص بالذكاء الاصطناعي. راجعها قبل الاعتماد.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر إنشاء الملخص الذكي.");
    } finally {
      setAiNarrativeBusy(false);
    }
  }

  function toggleRecord(key: string) {
    setSelectedKeys((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }

  function selectAll() {
    setSelectedKeys(reportableRecords.map((record) => record.key));
  }

  function clearAll() {
    setSelectedKeys([]);
  }

  function applyPreset(keys: string[], title: string) {
    setReportMode("combined");
    setSelectedKeys(keys.filter((key) => reportableRecords.some((record) => record.key === key)));
    setReportTitle(title);
    toast.success("تم تجهيز حزمة المستندات.");
  }

  const documentPresets = [
    { title: "ملف التنفيذ", description: "الخطة + البرامج + الشواهد", keys: ["plan", "programs", "evidences"] },
    { title: "ملف متابعة الطلاب", description: "الطلاب + الحالات + الجلسات + الإحالات", keys: ["students", "cases", "interviews", "referrals"] },
    { title: "الملف الشامل", description: "جميع السجلات المتاحة في مستند واحد", keys: reportableRecords.map((record) => record.key) },
  ];

  function reset() {
    setReportMode("single");
    setSelectedSingleKey("programs");
    setReportTitle("تقرير تنفيذ أعمال التوجيه الطلابي");
    setPeriod("");
    setDocumentNo("");
    setFromDate("");
    setToDate("");
    setNarrative("");
    setSelectedKeys(["plan", "programs", "evidences"]);
    setWorkflowPlanTaskId("");
    setWorkflowProgramId("");
    setWorkflowDraftInitialized(false);
    setSignatureReportId("");
    setSignatureReportOpen(false);
    if (typeof window !== "undefined") {
      window.history.replaceState(window.history.state, "", window.location.pathname);
    }
    toast.success("تمت إعادة ضبط التقرير.");
  }


  const totalRows = selectedRecords.reduce(
    (sum, record) => sum + (filteredSections[record.key]?.length ?? 0),
    0,
  );

  const roleRank = (role: string) =>
    ({ principal: 50, vice_principal: 40, counselor: 30, teacher: 20, admin_staff: 20, guard: 10, observer: 0 })[role] ?? 0;
  const myRole = schoolTeamContext?.membership?.role ?? "";
  const activeSchoolMembers = (schoolTeamContext?.members ?? []).filter(
    (member) => member.member_status === "active",
  );
  const activeVicePrincipals = activeSchoolMembers.filter((member) => member.role === "vice_principal");
  const administrativeRecipients =
    myRole === "counselor"
      ? activeVicePrincipals.length
        ? activeVicePrincipals
        : activeSchoolMembers.filter((member) => member.role === "principal")
      : activeSchoolMembers.filter((member) => roleRank(member.role) > roleRank(myRole));

  const sendAdministrativeReport = useMutation({
    mutationFn: async () => {
      if (!recipientMemberId) throw new Error("اختر المستلم الإداري أولًا.");
      if (!selectedRecords.length) throw new Error("اختر سجلًا واحدًا على الأقل.");

      const snapshot = {
        version: 1,
        report_title: reportTitle.trim() || "تقرير التوجيه الطلابي",
        document_no: documentNo.trim(),
        period: period.trim(),
        from_date: fromDate,
        to_date: toDate,
        narrative: narrative.trim(),
        created_at: new Date().toISOString(),
        total_rows: totalRows,
        sections: selectedRecords.map((record) => {
          const columns = reportColumns(record.fields);
          const rows = (filteredSections[record.key] ?? []).map((row) =>
            Object.fromEntries([
              ["id", row["id"]],
              ...columns.map((column) => [column.key, row[column.key]]),
            ]),
          );
          return {
            key: record.key,
            title: record.title,
            columns,
            rows,
          };
        }),
      };

      const { data: handoffId, error } = await (supabase as any).rpc("create_school_report_handoff", {
        p_recipient_member_id: recipientMemberId,
        p_title: reportTitle.trim() || "تقرير التوجيه الطلابي",
        p_note: handoffNote.trim() || null,
        p_snapshot: snapshot,
      });
      if (error) throw error;
      return String(handoffId ?? "");
    },
    onSuccess: () => {
      setHandoffNote("");
      toast.success("تم رفع نسخة ثابتة إلى مسار الاعتماد الإداري.");
    },
    onError: (error) => toast.error((error as Error).message),
  });
  const planRows = filteredSections["plan"] ?? [];
  const programRows = filteredSections["programs"] ?? [];
  const evidenceRows = filteredSections["evidences"] ?? [];
  const planDone = planRows.filter((row) => String(row["exec_status"] ?? "") === "مكتمل").length;
  const programDone = programRows.filter((row) =>
    ["منفذ", "مكتمل"].includes(String(row["exec_status"] ?? "")),
  ).length;
  const planProgress = planRows.length ? Math.round((planDone / planRows.length) * 100) : 0;
  const programProgress = programRows.length ? Math.round((programDone / programRows.length) * 100) : 0;
  const workflowMode = Boolean(workflowPlanTaskId || workflowProgramId);
  const effectiveWorkflowPlanTaskId = workflowPlanTaskId || data?.resolvedPlanTaskId || "";
  const workflowTask = planRows[0];
  const workflowProgramsComplete =
    programRows.length > 0 &&
    programRows.every((row) => ["منفذ", "مكتمل"].includes(String(row["exec_status"] ?? "")));
  const workflowExecutionComplete = String(workflowTask?.["exec_status"] ?? "") === "مكتمل";
  const workflowHasApprovedEvidence = evidenceRows.length > 0;
  const workflowReportApproved = String(workflowTask?.["doc_status"] ?? "") === "معتمد";
  const workflowReadyForApproval =
    workflowMode &&
    workflowExecutionComplete &&
    workflowProgramsComplete &&
    workflowHasApprovedEvidence &&
    !workflowReportApproved;

  useEffect(() => {
    if (!workflowMode || workflowDraftInitialized || isLoading || !workflowTask) return;

    const taskName = String(workflowTask["task"] ?? "مهمة الخطة");
    const programNames = programRows
      .map((row) => String(row["name"] ?? "").trim())
      .filter(Boolean);
    const beneficiaries = programRows.reduce(
      (sum, row) => sum + (Number(row["beneficiaries"]) || 0),
      0,
    );
    const parts = [
      `تم تنفيذ مهمة «${taskName}» من الخطة التشغيلية عبر ${programRows.length} ${programRows.length === 1 ? "برنامج مرتبط" : "برامج مرتبطة"}${programNames.length ? `: ${programNames.join("، ")}` : ""}.`,
      beneficiaries > 0 ? `بلغ عدد المستفيدين المسجل في البرامج ${beneficiaries} مستفيدًا.` : "",
      `تم توثيق التنفيذ بعدد ${evidenceRows.length} من الشواهد المعتمدة فقط.`,
    ].filter(Boolean);

    setNarrative(parts.join("\n"));
    if (!documentNo) {
      const seq = String(workflowTask["seq"] ?? "").trim();
      setDocumentNo(seq ? `تنفيذ-${seq}` : `تنفيذ-${String(workflowTask["id"]).slice(0, 8)}`);
    }
    setWorkflowDraftInitialized(true);
  }, [
    workflowMode,
    workflowDraftInitialized,
    isLoading,
    workflowTask,
    programRows,
    evidenceRows,
    workflowReportApproved,
    workflowHasApprovedEvidence,
    documentNo,
  ]);

  const approveWorkflowReport = useMutation({
    mutationFn: async () => {
      if (!effectiveWorkflowPlanTaskId) throw new Error("لا توجد مهمة خطة مرتبطة بهذا التقرير.");
      if (!workflowExecutionComplete) throw new Error("اعتمد تنفيذ المهمة أولًا.");
      if (!workflowProgramsComplete) throw new Error("يجب اكتمال البرامج المرتبطة أولًا.");
      if (!workflowHasApprovedEvidence) throw new Error("يجب اعتماد شاهد واحد على الأقل قبل اعتماد التقرير.");

      const { error } = await supabase
        .from("plan_tasks")
        .update({ doc_status: "معتمد" })
        .eq("id", effectiveWorkflowPlanTaskId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({ queryKey: ["execution-flow"] }),
        queryClient.invalidateQueries({ queryKey: ["plan-execution-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-live-v2"] }),
      ]);
      toast.success("تم اعتماد التقرير والتوثيق. النسخة الرسمية أصبحت جاهزة للطباعة وPDF.");
    },
    onError: (error) => toast.error((error as Error).message || "تعذر اعتماد التقرير."),
  });

  return (
    <div className="reference-screen min-w-0 space-y-4" dir="rtl">
      <section className="reference-hero relative overflow-hidden rounded-3xl border border-[#D9C0A3]/35 bg-[#FFFDF9] p-4 shadow-[var(--shadow-soft)] sm:p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <FileText className="size-5" />
              <span className="text-xs font-bold">معاينة رسمية</span>
            </div>
            <h1 className="mt-2 text-2xl font-black text-navy sm:text-3xl">التقارير والإحصاءات</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
              اطبع تقرير برنامج أو اجمع الخطة والبرامج والشواهد في تقرير تنفيذ واحد، مع كليشة المدرسة الرسمية والتوقيعات.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PdfPreviewButton elementRef={reportRef} filename={`تقرير-${reportTitle || "الذات"}`} title={reportTitle || "التقرير الرسمي للتوجيه الطلابي"} disabled={isLoading} />
            <Button
              type="button"
              variant="outline"
              disabled={isLoading || selectedRecords.length === 0}
              onClick={() => {
                if (!signatureReportId) setSignatureReportId(crypto.randomUUID());
                setSignatureReportOpen(true);
              }}
            >
              <Send className="size-4" /> إرسال للاعتماد والتوقيع
            </Button>
            <Button type="button" variant="ghost" onClick={reset}>
              <RotateCcw className="size-4" />
              إعادة ضبط
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-[#D9C0A3]/35 bg-[#FFFDF9] p-4 shadow-[var(--shadow-card)]">
          <p className="text-[10px] font-black text-muted-foreground">إجمالي السجلات</p>
          <div className="mt-2 flex items-end justify-between gap-2">
            <strong className="text-2xl font-black text-navy">{totalRows}</strong>
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black text-emerald-700">مباشر</span>
          </div>
        </div>
        <div className="rounded-2xl border border-[#D9C0A3]/35 bg-[#FFFDF9] p-4 shadow-[var(--shadow-card)]">
          <p className="text-[10px] font-black text-muted-foreground">إنجاز الخطة</p>
          <div className="mt-2 flex items-end justify-between gap-2">
            <strong className="text-2xl font-black text-navy">{planProgress}%</strong>
            <span className="text-[9px] font-bold text-primary">{planDone} من {planRows.length}</span>
          </div>
        </div>
        <div className="rounded-2xl border border-[#D9C0A3]/35 bg-[#FFFDF9] p-4 shadow-[var(--shadow-card)]">
          <p className="text-[10px] font-black text-muted-foreground">البرامج المنفذة</p>
          <div className="mt-2 flex items-end justify-between gap-2">
            <strong className="text-2xl font-black text-navy">{programDone}</strong>
            <span className="text-[9px] font-bold text-primary">{programProgress}% إنجاز</span>
          </div>
        </div>
        <div className="rounded-2xl border border-[#D9C0A3]/35 bg-[#FFFDF9] p-4 shadow-[var(--shadow-card)]">
          <p className="text-[10px] font-black text-muted-foreground">الشواهد</p>
          <div className="mt-2 flex items-end justify-between gap-2">
            <strong className="text-2xl font-black text-navy">{evidenceRows.length}</strong>
            <span className="text-[9px] font-bold text-muted-foreground">ملف موثق</span>
          </div>
        </div>
      </section>

      {workflowMode && (
        <section
          className={
            "rounded-2xl border p-4 shadow-sm " +
            (workflowReportApproved
              ? "border-emerald-500/25 bg-emerald-500/[0.06]"
              : workflowReadyForApproval
                ? "border-[#89AA74]/40 bg-primary/[0.05]"
                : "border-amber-500/25 bg-amber-500/[0.06]")
          }
        >
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex items-center gap-2">
                {workflowReportApproved ? (
                  <CheckCircle2 className="size-4 text-emerald-700" />
                ) : (
                  <AlertTriangle className="size-4 text-amber-700" />
                )}
                <p className="text-xs font-black">
                  {workflowReportApproved
                    ? "تقرير تنفيذ مكتمل ومعتمد"
                    : workflowReadyForApproval
                      ? "المسودة جاهزة لاعتماد التقرير"
                      : "مسودة تقرير تنفيذ"}
                </p>
              </div>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                يعرض مهمة الخطة وبرامجها، ولا يُدخل في التقرير إلا الشواهد التي اعتمدتها. أي شاهد قيد المراجعة أو معاد للتعديل مستبعد من النسخة الرسمية.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {workflowReadyForApproval && (
                <Button
                  type="button"
                  size="sm"
                  disabled={approveWorkflowReport.isPending}
                  onClick={() => {
                    const approved = window.confirm(
                      "هل تعتمد هذا التقرير؟ سيتم اعتماد توثيق المهمة وإزالة علامة «مسودة غير معتمدة» من المستند الرسمي.",
                    );
                    if (approved) approveWorkflowReport.mutate();
                  }}
                >
                  <ShieldCheck className="size-4" />
                  {approveWorkflowReport.isPending ? "جارٍ الاعتماد..." : "اعتماد التقرير"}
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" onClick={reset}>
                عرض كل التقارير
              </Button>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-[#D9C0A3]/35 bg-[#FFFDF9] p-4 shadow-[var(--shadow-card)] sm:p-5">
        <div className="mb-3">
          <h2 className="font-black">حزم مستندات جاهزة</h2>
          <p className="mt-1 text-xs text-muted-foreground">اختر حزمة ثم عدّل السجلات أو الفترة قبل إنشاء PDF.</p>
        </div>
        <div className="grid gap-2 xl:grid-cols-3">
          {documentPresets.map((preset) => (
            <button key={preset.title} type="button" onClick={() => applyPreset(preset.keys, preset.title)} className="rounded-2xl border bg-[#FBF7F1] p-4 text-right transition hover:-translate-y-0.5 hover:border-[#89AA74] hover:bg-[#E4ECDF] hover:shadow-md">
              <p className="font-black">{preset.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{preset.description}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-border border-[#D9C0A3]/35 bg-[#FFFDF9] p-4 shadow-[var(--shadow-card)] sm:p-5">
        <div className="space-y-5">
          <div>
            <Label>نوع التقرير</Label>
            <div className="reference-tabs mt-2 grid grid-cols-2 gap-1 rounded-2xl border bg-muted/25 p-1.5">
              <button
                type="button"
                onClick={() => setReportMode("single")}
                className={`rounded-xl border-0 p-3 text-right transition ${reportMode === "single" ? "bg-primary text-primary-foreground shadow-sm" : "bg-transparent text-muted-foreground hover:bg-background"}`}
              >
                <div className="flex items-center gap-3">
                  <FileText className="size-5" />
                  <div>
                    <p className="font-bold">تقرير منفرد</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      اختر سجلًا واحدًا واطبعه مباشرة.
                    </p>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setReportMode("combined")}
                className={`rounded-xl border-0 p-3 text-right transition ${reportMode === "combined" ? "bg-primary text-primary-foreground shadow-sm" : "bg-transparent text-muted-foreground hover:bg-background"}`}
              >
                <div className="flex items-center gap-3">
                  <CheckSquare
                    className="size-5"
                  />
                  <div>
                    <p className="font-bold">تقرير مجمع</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      الافتراضي: الخطة والبرامج والشواهد، ويمكن إضافة سجلات أخرى عند الحاجة.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {reportMode === "single" ? (
            <div>
              <Label htmlFor="single-report-record">السجل المطلوب طباعته</Label>
              <select
                id="single-report-record"
                value={selectedSingleKey}
                onChange={(event) => setSelectedSingleKey(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-[#D9C0A3]/45 bg-[#FFFDF9] px-3 text-sm"
              >
                {reportableRecords.map((record) => (
                  <option key={record.key} value={record.key}>
                    {record.title} ({filteredSections[record.key]?.length ?? 0} سجل)
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between gap-3">
                <Label>السجلات التي ستظهر في التقرير</Label>
                <div className="flex gap-1">
                  <Button type="button" size="sm" variant="ghost" onClick={selectAll}>
                    الكل
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={clearAll}>
                    مسح
                  </Button>
                </div>
              </div>
              <div className="mt-2 grid max-h-64 grid-cols-1 gap-2 overflow-y-auto rounded-xl border border-[#D9C0A3]/35 p-3 xl:grid-cols-2 xl:grid-cols-3">
                {reportableRecords.map((record) => {
                  const active = selectedKeys.includes(record.key);
                  const count = filteredSections[record.key]?.length ?? 0;
                  return (
                    <button
                      key={record.key}
                      type="button"
                      onClick={() => toggleRecord(record.key)}
                      className={`flex items-center justify-between gap-2 rounded-lg border p-3 text-right text-xs transition hover:bg-muted ${active ? "border-primary bg-primary/5" : "border-border"}`}
                    >
                      <span className="flex items-center gap-2 font-semibold">
                        {active ? (
                          <CheckSquare className="size-4 text-primary" />
                        ) : (
                          <Square className="size-4" />
                        )}
                        {record.title}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid gap-3 xl:grid-cols-3">
            <div>
              <Label htmlFor="report-document-no">رقم المستند</Label>
              <input id="report-document-no" value={documentNo} onChange={(event) => setDocumentNo(event.target.value)} placeholder="اختياري" className="mt-2 h-11 w-full rounded-xl border border-[#D9C0A3]/45 bg-[#FFFDF9] px-3 text-sm" />
            </div>
            <div>
              <Label htmlFor="report-period">الفترة</Label>
              <input
                id="report-period"
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                placeholder="مثال: الفصل الدراسي الأول"
                className="mt-2 h-11 w-full rounded-xl border border-[#D9C0A3]/45 bg-[#FFFDF9] px-3 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="report-title">عنوان التقرير</Label>
              <input
                id="report-title"
                value={reportTitle}
                onChange={(event) => setReportTitle(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-[#D9C0A3]/45 bg-[#FFFDF9] px-3 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            <div>
              <Label htmlFor="report-from">من تاريخ</Label>
              <HijriDatePicker className="mt-2" value={fromDate} onChange={setFromDate} />
            </div>
            <div>
              <Label htmlFor="report-to">إلى تاريخ</Label>
              <HijriDatePicker className="mt-2" value={toDate} onChange={setToDate} />
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor="report-narrative">التحليل والملاحظات والتوصيات</Label>
              <Button type="button" variant="outline" size="sm" disabled={aiNarrativeBusy || isLoading || selectedRecords.length === 0} onClick={() => void generateNarrativeWithAi()}>
                {aiNarrativeBusy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {aiNarrativeBusy ? "جارٍ إعداد الملخص..." : "إنشاء ملخص ذكي"}
              </Button>
            </div>
            <textarea
              id="report-narrative"
              value={narrative}
              onChange={(event) => setNarrative(event.target.value)}
              rows={4}
              placeholder="اكتب الملاحظات أو التوصيات التي تريد ظهورها في التقرير الرسمي..."
              className="mt-2 w-full resize-y rounded-xl border border-[#D9C0A3]/45 bg-[#FFFDF9] px-3 py-2 text-sm leading-7"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            <ReportStat label="السجلات المختارة" value={selectedRecords.length} />
            <ReportStat label="إجمالي الصفوف" value={totalRows} />
            <ReportStat label="الطلاب" value={filteredSections["students"]?.length ?? 0} />
            <ReportStat label="الشواهد" value={filteredSections["evidences"]?.length ?? 0} />
          </div>

          {isLoading && <p className="text-xs text-muted-foreground">جارٍ تحميل السجلات...</p>}
          {(data?.errors?.length ?? 0) > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="font-black text-amber-800">بعض السجلات لم تُحمّل في التقرير</p>
            <p className="mt-1 text-xs text-muted-foreground">
              تم إبقاء بقية الأقسام متاحة، ويمكن إعادة المحاولة دون فقد أي بيانات.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
            إعادة المحاولة
          </Button>
        </div>
      )}

      {isError && (
            <div className="flex items-center gap-3 text-xs text-destructive">
              <span>تعذّر تحميل بيانات التقرير.</span>
              <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
                إعادة المحاولة
              </Button>
            </div>
          )}
          {data?.errors.length ? (
            <p className="text-xs text-amber-700">
              تعذر الوصول إلى: {data.errors.map((error) => error.key).join("، ")}
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-[#D9C0A3]/35 bg-[#FFFDF9] p-4 shadow-[var(--shadow-card)] sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="size-5" />
              <span className="text-xs font-black">إرسال إداري آمن</span>
            </div>
            <h2 className="mt-2 text-lg font-black">رفع التقرير للقراءة فقط</h2>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              عند الإرسال تُحفظ نسخة ثابتة من التقرير كما هو الآن. المستلم يستطيع القراءة والطباعة فقط، ولا يحصل على صلاحية تعديل سجلاتك الأصلية.
            </p>
          </div>

          <a href="/school-inbox" className="text-xs font-black text-primary hover:underline">
            فتح المراسلات الإدارية
          </a>
        </div>

        {administrativeRecipients.length ? (
          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(220px,0.8fr)_minmax(280px,1.4fr)_auto] lg:items-end">
            <div>
              <Label htmlFor="report-recipient">المستلم الأعلى صلاحية</Label>
              <select
                id="report-recipient"
                value={recipientMemberId}
                onChange={(event) => setRecipientMemberId(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-[#D9C0A3]/45 bg-[#FFFDF9] px-3 text-sm"
              >
                <option value="">اختر المستلم</option>
                {administrativeRecipients.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.display_name || "عضو المدرسة"} · {member.role === "principal" ? "مدير المدرسة" : member.role === "vice_principal" ? "وكيل المدرسة" : member.role}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="report-handoff-note">رسالة مرفقة</Label>
              <input
                id="report-handoff-note"
                value={handoffNote}
                onChange={(event) => setHandoffNote(event.target.value)}
                placeholder="مثال: للاطلاع واعتماد ما تم إنجازه خلال الفترة"
                className="mt-2 h-11 w-full rounded-xl border border-[#D9C0A3]/45 bg-[#FFFDF9] px-3 text-sm"
              />
            </div>
            <Button
              type="button"
              disabled={!recipientMemberId || sendAdministrativeReport.isPending || isLoading || selectedRecords.length === 0}
              onClick={() => sendAdministrativeReport.mutate()}
            >
              <Send className="size-4" />
              {sendAdministrativeReport.isPending ? "جارٍ الإرسال..." : "إرسال للإدارة"}
            </Button>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed p-4 text-xs leading-6 text-muted-foreground">
            لا يوجد حاليًا عضو أعلى صلاحية في فريق المدرسة. من صفحة <a href="/school-team" className="font-black text-primary hover:underline">فريق المدرسة والصلاحيات</a> أضف المدير أو الوكيل واعتمد عضويته، ثم سيظهر هنا تلقائيًا كمستلم.
          </div>
        )}
      </section>

      <div
        ref={reportRef}
        className="record-pdf-document reports-preview mx-auto mt-6 rounded-2xl border bg-paper p-4 text-paper-foreground shadow-[var(--shadow-card)] sm:p-6 xl:p-8"
      >
        <OfficialHeader
          school={school}
          title={reportTitle || "التقرير الرسمي للتوجيه الطلابي"}
          reportType="تقرير رسمي"
          reportNo={documentNo || undefined}
          period={period || undefined}
        />

        <main className="report-official-content">
          {workflowMode && !workflowReportApproved && (
            <div className="mx-5 mt-4 rounded-lg border border-amber-300 bg-amber-50 p-2 text-center text-xs font-black text-amber-800">
              مسودة غير معتمدة — للمعاينة والمراجعة فقط
            </div>
          )}
          <section className="report-cover block border-b border-paper-border pb-5 pt-5">
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <ReportStat label="عدد السجلات" value={selectedRecords.length} />
              <ReportStat label="إجمالي الصفوف" value={totalRows} />
              <ReportStat label="عدد الطلاب" value={filteredSections["students"]?.length ?? 0} />
              <ReportStat label="عدد الشواهد" value={filteredSections["evidences"]?.length ?? 0} />
            </div>
            <div className="mt-5 rounded-xl border border-paper-border bg-paper-muted p-4">
              <div className="grid gap-2 xl:grid-cols-2 text-xs">
                <p>
                  <strong>الفترة:</strong> {period || "—"}
                </p>
                <p>
                  <strong>النطاق:</strong>{" "}
                  {fromDate ? formatHijriDate(new Date(`${fromDate}T12:00:00`)) : "بداية البيانات"}{" "}
                  إلى{" "}
                  {toDate ? formatHijriDate(new Date(`${toDate}T12:00:00`)) : "نهاية البيانات"}
                </p>
              </div>
            </div>
          </section>

          {reportMode === "combined" && (
            <section className="mt-6 break-inside-avoid">
              <h2 className="mb-3 border-r-4 border-[var(--letterhead-primary)] pr-3 text-base font-black">الملخص التنفيذي للتنفيذ</h2>
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <ReportStat label="إنجاز الخطة" value={`${planProgress}%`} />
                <ReportStat label="البرامج المنفذة" value={`${programDone} / ${programRows.length}`} />
                <ReportStat label="إنجاز البرامج" value={`${programProgress}%`} />
                <ReportStat label={workflowMode ? "الشواهد المعتمدة" : "الشواهد الموثقة"} value={evidenceRows.length} />
              </div>
              <p className="mt-3 rounded-xl border border-paper-border bg-paper-muted p-3 text-xs leading-6">
                يعرض هذا التقرير دورة التنفيذ من الخطة التشغيلية إلى البرامج والشواهد، وفق السجلات المختارة والنطاق الزمني المحدد أعلاه.
              </p>
            </section>
          )}

          {workflowMode && evidenceRows.length > 0 && (
            <section className="mt-6 break-inside-avoid" data-pdf-block="true">
              <h2 className="mb-3 border-r-4 border-primary pr-3 text-base font-black">
                الشواهد المعتمدة
              </h2>
              <div className="grid gap-3 xl:grid-cols-2">
                {evidenceRows.map((evidence) => {
                  const fileUrl = String(evidence["file_url"] ?? "");
                  const imageEvidence =
                    String(evidence["etype"] ?? "").includes("صورة") ||
                    /\.(png|jpe?g|webp|gif)(\?|$)/i.test(fileUrl);
                  return (
                    <article key={String(evidence["id"])} className="break-inside-avoid rounded-xl border border-paper-border p-3">
                      {imageEvidence && fileUrl ? (
                        <img
                          src={fileUrl}
                          alt={String(evidence["name"] ?? "شاهد معتمد")}
                          crossOrigin="anonymous"
                          className="mb-3 max-h-64 w-full rounded-lg border border-paper-border object-contain"
                        />
                      ) : null}
                      <p className="text-xs font-black">{String(evidence["name"] ?? "شاهد معتمد")}</p>
                      <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
                        {String(evidence["etype"] ?? "مرفق")} · معتمد
                        {evidence["reviewed_by"] ? ` · راجعه: ${String(evidence["reviewed_by"])}` : ""}
                      </p>
                      {evidence["description"] ? (
                        <p className="mt-2 text-[10px] leading-5">{String(evidence["description"])}</p>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {kpis.length > 0 && (
            <section className="report-summary mt-6">
              <h2 className="mb-3 border-r-4 border-primary pr-3 text-base font-black">
                ملخص مؤشرات الأداء
              </h2>
              <div className="grid gap-3 xl:grid-cols-2 xl:grid-cols-3">
                {kpis.map((kpi) => (
                  <div
                    key={kpi.key}
                    className="rounded-xl border border-paper-border bg-paper-muted p-3"
                  >
                    <p className="text-[11px] text-muted-foreground">{kpi.title}</p>
                    <p className="mt-1 text-xl font-black text-primary">
                      {isPercentKpi(kpi.key) ? `${kpi.value}%` : kpi.value}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{kpi.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {selectedRecords.map((record) => {
            const rows = filteredSections[record.key] ?? [];
            const columns = reportColumns(record.fields);
            return (
              <section key={record.key} className="report-record-section mt-8 break-before-auto">
                <div className="mb-3 flex items-end justify-between gap-3 border-b-2 border-paper-border pb-2">
                  <h2 className="border-r-4 border-primary pr-3 text-base font-black">
                    {record.title}
                  </h2>
                  <span className="text-xs font-bold text-muted-foreground">
                    عدد السجلات: {rows.length}
                  </span>
                </div>
                {columns.length ? (
                  rows.length ? (
                    <div className="report-table-wrap overflow-visible">
                      <table className="w-full border-collapse text-right text-[9px] leading-5">
                        <thead>
                          <tr className="bg-paper-muted">
                            {columns.map((column) => (
                              <th
                                key={column.key}
                                className="border border-paper-border p-1.5 font-bold"
                              >
                                {column.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, index) => (
                            <tr key={String(row["id"] ?? index)}>
                              {columns.map((column) => (
                                <td
                                  key={column.key}
                                  className="border border-paper-border p-1.5 align-top break-words"
                                >
                                  {displayRecordValue(row[column.key])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-paper-border p-3 text-center text-xs text-muted-foreground">
                      لا توجد بيانات ضمن النطاق المحدد.
                    </p>
                  )
                ) : (
                  <p className="rounded-lg border border-dashed border-paper-border p-3 text-center text-xs text-muted-foreground">
                    لا توجد حقول قابلة للعرض في هذا السجل.
                  </p>
                )}
              </section>
            );
          })}

          <section className="report-analysis mt-8 break-inside-avoid">
            <h2 className="mb-3 border-r-4 border-primary pr-3 text-base font-black">
              التحليل والملاحظات والتوصيات
            </h2>
            <div className="min-h-32 rounded-xl border border-paper-border p-4">
              <p className="whitespace-pre-wrap text-sm leading-8">
                {narrative.trim() || "لا توجد ملاحظات أو توصيات إضافية."}
              </p>
            </div>
          </section>

          <section className="report-approval mt-10 break-inside-avoid">
            <div
              className={
                "rounded-xl border p-4 text-center text-xs leading-7 " +
                (workflowMode && !workflowReportApproved
                  ? "border-amber-300 bg-amber-50 text-amber-800"
                  : "border-paper-border bg-paper-muted")
              }
            >
              {workflowMode
                ? workflowReportApproved
                  ? "أُعد هذا التقرير من خلال الذات للتوجيه الطلابي من بيانات التنفيذ والشواهد المعتمدة، وتم اعتماد توثيق المهمة."
                  : "هذه مسودة مولدة من بيانات التنفيذ والشواهد المعتمدة فقط، ولم يتم اعتماد التقرير بعد."
                : "أُعد هذا التقرير من خلال الذات للتوجيه الطلابي وفق السجلات المختارة. راجع محتواه قبل اعتماده أو إرساله."}
            </div>
          </section>

          <OfficialFooter school={school} />
        </main>
      </div>
      {signatureReportId && (
        <SendForSignatureDialog
          open={signatureReportOpen}
          onOpenChange={setSignatureReportOpen}
          recordTable="generated_reports"
          recordId={signatureReportId}
          recordType="تقرير رسمي"
          title={reportTitle || "التقرير الرسمي للتوجيه الطلابي"}
          snapshot={{
            "عنوان التقرير": reportTitle || "التقرير الرسمي للتوجيه الطلابي",
            "رقم المستند": documentNo || null,
            "الفترة": period || null,
            "من تاريخ": fromDate || null,
            "إلى تاريخ": toDate || null,
            "إجمالي الصفوف": totalRows,
            "الأقسام": selectedRecords.map((record) => ({
              القسم: record.title,
              العدد: filteredSections[record.key]?.length ?? 0,
            })),
            "الملخص": narrative || null,
            "وضع مسار التنفيذ": workflowMode,
          }}
        />
      )}
    </div>
  );
}

function ReportStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-paper-border bg-paper-muted p-3 text-center">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}
