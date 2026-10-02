import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Plus,
  Search,
  Send,
  Sparkles,
  Loader2,
  Trash2,
  Upload,
  Pencil,
  Paperclip,
  FileText,
  X
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/lib/school";
import { exportToExcel, readExcel, toIsoDate } from "@/lib/sheet";

import { displayRecordValue } from "@/lib/display";
import { formatHijriDate } from "@/lib/date";
import { HijriDatePicker } from "@/components/HijriDatePicker";
import { mergeLookupOptions } from "@/lib/lookups";
import { referralMessage, shareOnWhatsApp } from "@/lib/whatsapp";
import { generateSmartFill } from "@/lib/deepseek.functions";
import { GRADES_BY_STAGE, type RecordConfig } from "@/lib/records";
import { OfficialFooter, OfficialHeader } from "@/components/OfficialHeader";
import {
  StudentCombobox,
  useStudentOptions,
  type StudentOption
} from "@/components/StudentCombobox";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { PdfPreviewButton } from "@/components/PdfPreviewButton";
import { SendForSignatureDialog } from "@/components/SendForSignatureDialog";

import { RecordAttachmentsDialog } from "@/components/RecordAttachments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";


type Row = Record<string, unknown> & { id: string };

const LINKED_TYPE: Record<string, string> = {
  cases: "حالة",
  programs: "برنامج",
  interviews: "مقابلة",
  attendance: "مواظبة",
  behavior: "سلوك",
  referrals: "إحالة",
  committees: "اجتماع",
  plan: "مهمة",
};

export function RecordPage({
  config,
  hideImport,
  toolbarExtra,
  filters,
  extraFilter,
  rowAction,
  serverPagination = false,
  serverFilters = {},
}: {
  config: RecordConfig;
  hideImport?: boolean;
  toolbarExtra?: ReactNode;
  filters?: ReactNode;
  extraFilter?: (row: Record<string, unknown>) => boolean;
  rowAction?: { icon: ReactNode; title: string; onClick: (row: Row) => void };
  serverPagination?: boolean;
  serverFilters?: Record<string, string>;
}) {
  const queryClient = useQueryClient();
  const { data: school } = useSchool();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);
  const [recordTab, setRecordTab] = useState("all");
  const pageSize = 20;

  const referenceTabs = useMemo(() => {
    if (config.key === "cases") {
      return [
        { key: "all", label: "الكل" },
        { key: "active", label: "نشطة" },
        { key: "closed", label: "مغلقة" },
      ];
    }
    if (config.key === "interviews") {
      return [
        { key: "all", label: "الكل" },
        { key: "upcoming", label: "القادمة" },
        { key: "previous", label: "السابقة" },
      ];
    }
    if (config.key === "referrals") {
      return [
        { key: "all", label: "الكل" },
        { key: "following", label: "قيد المتابعة" },
        { key: "done", label: "منتهية" },
      ];
    }
    if (config.key === "evidences") {
      return [
        { key: "all", label: "الكل" },
        { key: "images", label: "الصور" },
        { key: "documents", label: "المستندات" },
      ];
    }
    return [];
  }, [config.key]);
  const [editing, setEditing] = useState<Partial<Row> | null>(null);
  const [auto, setAuto] = useState<Record<string, string>>({});
  const [smartFilling, setSmartFilling] = useState(false);
  const [smartPromptOpen, setSmartPromptOpen] = useState(false);
  const [smartPrompt, setSmartPrompt] = useState("");
  const needsStudentOptions = config.fields.some((field) => field.student);
  const { data: studentOptions = [] } = useStudentOptions(needsStudentOptions);
  const [importing, setImporting] = useState(false);
  const [attachFor, setAttachFor] = useState<Row | null>(null);
  const [documentRow, setDocumentRow] = useState<Row | null>(null);
  const [signatureRow, setSignatureRow] = useState<Row | null>(null);
  const [approvedSignatures, setApprovedSignatures] = useState<Array<{ name: string; role: string; signatureData: string; signedAt?: string | null }>>([]);
  const singleDocumentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!documentRow?.id) { setApprovedSignatures([]); return; }
    let active = true;
    void (async () => {
      const { data, error } = await (supabase as any).from("document_signature_requests")
        .select("signer_name,signer_role,signature_data,signed_at,status")
        .eq("record_table", config.table).eq("record_id", documentRow.id)
        .eq("status", "signed").order("signed_at", { ascending: true });
      if (!active || error) return;
      setApprovedSignatures((data ?? []).filter((item:any) => item.signature_data).map((item:any) => ({
        name: item.signer_name, role: item.signer_role, signatureData: item.signature_data, signedAt: item.signed_at,
      })));
    })();
    return () => { active = false; };
  }, [config.table, documentRow?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const newMode = params.get("new");
    if (newMode !== "student" && newMode !== "1") return;

    if (newMode === "student") {
      const studentId = params.get("studentId") ?? "";
      const studentNo = params.get("studentNo") ?? "";
      const studentName = params.get("studentName") ?? "";
      const caseId = params.get("caseId") ?? "";
      const caseNo = params.get("caseNo") ?? "";
      if (!studentId && !studentNo && !studentName && !caseId) return;
      const prefill = {
        student_id: studentId,
        student_no: studentNo,
        student_name: studentName,
        ...(caseId ? { case_id: caseId } : {}),
        ...(caseNo ? { case_no: caseNo } : {}),
      };
      setAuto(prefill);
      setEditing(prefill);
    } else {
      setAuto({});
      setEditing({});
    }

    // Consume the one-time action link so refreshing does not reopen a duplicate draft.
    ["new", "studentId", "studentNo", "studentName", "caseId", "caseNo"].forEach((key) => params.delete(key));
    const query = params.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
    );
  }, [config.key]);

  const fileRef = useRef<HTMLInputElement>(null);
  const recordPdfRef = useRef<HTMLDivElement>(null);

  const listFields = config.fields.filter((f) => f.list).slice(0, 7);

  const { data: lookups = [] } = useQuery({
    queryKey: ["lookups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lookups")
        .select("id, category, value, sort_order")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const optionsFor = (field: (typeof config.fields)[number]) =>
    mergeLookupOptions(
      field.options,
      lookups
        .filter((item) => item.category === field.lookupCategory)
        .map((item) => item.value ?? ""),
    );

  async function addOption(category: string, label: string) {
    const value = window.prompt(`أدخل خياراً جديداً في ${label}`)?.trim();
    if (!value) return;
    const exists = lookups.some(
      (item) => item.category === category && item.value?.trim() === value,
    );
    if (exists) {
      toast.info("هذا الخيار موجود بالفعل");
      return;
    }
    const { error } = await supabase.from("lookups").insert({ category, value } as never);
    if (error) {
      toast.error(`تعذّرت إضافة الخيار: ${error.message}`);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["lookups"] });
    setAuto((current) => ({
      ...current,
      [config.fields.find((field) => field.lookupCategory === category)?.name ?? ""]: value,
    }));
    toast.success("تمت إضافة الخيار للقائمة");
  }

  async function removeOption(category: string, label: string, value: string) {
    const item = lookups.find((entry) => entry.category === category && entry.value === value);
    if (!item?.id) {
      toast.info("يمكن حذف الخيارات المضافة من الإعدادات فقط");
      return;
    }
    if (!window.confirm(`هل تريد حذف الخيار «${value}» من قائمة ${label}؟`)) return;
    const { error } = await supabase.from("lookups").delete().eq("id", item.id);
    if (error) {
      toast.error(`تعذّر حذف الخيار: ${error.message}`);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["lookups"] });
    setAuto((current) => ({
      ...current,
      [config.fields.find((field) => field.lookupCategory === category)?.name ?? ""]: "",
    }));
    toast.success("تم حذف الخيار من القائمة");
  }

  const serverFilterKey = JSON.stringify(serverFilters);
  const { data: rowResult, isLoading, isError: rowsError, error: rowsQueryError, refetch: refetchRows } = useQuery({
    queryKey: [config.table, serverPagination ? "server" : "client", page, search, sort, serverFilterKey],
    retry: 1,
    staleTime: 15_000,
    queryFn: async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("انتهت جلسة الدخول. سجّل الدخول مرة أخرى.");

      if (serverPagination) {
        let query = (supabase.from(config.table as never) as any)
          .select("*", { count: "exact" })
          .eq("user_id", authData.user.id);

        Object.entries(serverFilters).forEach(([key, value]) => {
          if (value) query = query.eq(key, value);
        });

        const safeTerm = search.trim().replace(/[,()%]/g, " ");
        if (safeTerm) {
          const searchable =
            config.key === "students"
              ? ["full_name", "student_no", "national_id", "grade", "classroom", "guardian_name"]
              : config.fields
                  .filter((field) => field.type !== "number" && field.type !== "date")
                  .slice(0, 8)
                  .map((field) => field.name);
          if (searchable.length) {
            query = query.or(searchable.map((name) => `${name}.ilike.%${safeTerm}%`).join(","));
          }
        }

        const orderKey = sort?.key || "created_at";
        query = query
          .order(orderKey, { ascending: sort?.dir === "asc" })
          .range((page - 1) * pageSize, page * pageSize - 1);

        const { data, error, count } = await query;
        if (error) throw error;
        return { rows: (data ?? []) as Row[], count: count ?? 0 };
      }

      const { data, error } = await supabase
        .from(config.table as never)
        .select("*")
        .eq("user_id", authData.user.id)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) throw error;
      const loaded = (data ?? []) as unknown as Row[];
      return { rows: loaded, count: loaded.length };
    },
  });

  const rows = rowResult?.rows ?? [];
  const filtered = useMemo(() => {
    if (serverPagination) return rows;

    const term = search.trim().toLocaleLowerCase("ar");
    let out = rows;
    if (term) {
      out = out.filter((row) =>
        config.fields.some((f) => String(row[f.name] ?? "").toLocaleLowerCase("ar").includes(term)),
      );
    }
    if (recordTab !== "all") {
      const day = new Date().toISOString().slice(0, 10);
      out = out.filter((row) => {
        if (config.key === "cases") {
          const status = String(row["case_status"] ?? "");
          return recordTab === "active" ? status !== "مغلقة" : status === "مغلقة";
        }
        if (config.key === "interviews") {
          const followup = String(row["followup_at"] ?? "").slice(0, 10);
          const date = String(row["idate"] ?? "").slice(0, 10);
          return recordTab === "upcoming"
            ? Boolean(followup && followup >= day)
            : Boolean(date && date < day);
        }
        if (config.key === "referrals") {
          const status = String(row["status"] ?? "");
          return recordTab === "following"
            ? ["مرسلة", "قيد المتابعة"].includes(status)
            : status === "منتهية";
        }
        if (config.key === "evidences") {
          const type = String(row["etype"] ?? "");
          return recordTab === "images"
            ? type === "صورة"
            : ["PDF", "تقرير", "كشف حضور", "محضر"].includes(type);
        }
        return true;
      });
    }
    if (extraFilter) out = out.filter((row) => extraFilter(row));
    if (sort) {
      const dir = sort.dir === "asc" ? 1 : -1;
      out = [...out].sort((a, b) => {
        const av = a[sort.key];
        const bv = b[sort.key];
        if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
        return String(av ?? "").localeCompare(String(bv ?? ""), "ar") * dir;
      });
    }
    return out;
  }, [rows, search, config.fields, config.key, extraFilter, sort, serverPagination, recordTab]);

  const totalRows = serverPagination ? rowResult?.count ?? 0 : filtered.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paged = useMemo(
    () => serverPagination ? filtered : filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, serverPagination],
  );

  function toggleSort(key: string) {
    setPage(1);
    setSort((current) =>
      current?.key === key
        ? current.dir === "asc"
          ? { key, dir: "desc" }
          : null
        : { key, dir: "asc" },
    );
  }

  const save = useMutation({
    mutationFn: async (values: Partial<Row>) => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("انتهت جلسة الدخول. سجّل الدخول مرة أخرى.");
      const payload: Record<string, unknown> = { user_id: authData.user.id };
      config.fields
        .filter((field) => !field.generated)
        .forEach((f) => {
          const raw = values[f.name];
          if (f.type === "number") payload[f.name] = raw === "" || raw == null ? null : Number(raw);
          else payload[f.name] = raw === "" ? null : (raw ?? null);
        });
      if (config.key !== "students" && values["student_id"])
        payload["student_id"] = values["student_id"];
      if ((config.key === "interviews" || config.key === "referrals") && values["case_id"])
        payload["case_id"] = values["case_id"];
      if (values.id) {
        const { error } = await supabase
          .from(config.table as never)
          .update(payload as never)
          .eq("id", values.id)
          .eq("user_id", authData.user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(config.table as never).insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [config.table] });
      queryClient.invalidateQueries({ queryKey: ["student-profile"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["cases-followup-center"] });
      queryClient.invalidateQueries({ queryKey: ["interviews-followup-hub"] });
      setEditing(null);
      toast.success("تم حفظ السجل");
    },
    onError: (error: Error) => toast.error(`تعذّر الحفظ: ${error.message}`),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("انتهت جلسة الدخول. سجّل الدخول مرة أخرى.");
      const { error } = await supabase
        .from(config.table as never)
        .delete()
        .eq("id", id)
        .eq("user_id", authData.user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [config.table] });
      queryClient.invalidateQueries({ queryKey: ["student-profile"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("تم حذف السجل");
    },
    onError: (error: Error) => toast.error(`تعذّر حذف السجل: ${error.message}`),
  });

  async function handleImport(file: File) {
    setImporting(true);
    try {
      const sheetRows = await readExcel(file);
      const importFields = config.fields.filter((field) => !field.generated);

      const payloads = sheetRows
        .map((sheetRow) => {
          const payload: Record<string, unknown> = {};
          importFields.forEach((f) => {
            const value = sheetRow[f.label] ?? sheetRow[f.name];
            if (value === undefined || value === "") return;
            if (f.type === "date") payload[f.name] = toIsoDate(value);
            else if (f.type === "number") payload[f.name] = Number(value) || null;
            else payload[f.name] = String(value).trim();
          });
          return payload;
        })
        .filter((p) => Object.keys(p).length > 0);

      if (!payloads.length) {
        toast.error("لم يتم العثور على بيانات مطابقة. تأكد من تطابق عناوين الأعمدة.");
        return;
      }
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("انتهت جلسة الدخول. سجّل الدخول مرة أخرى.");
      const ownedPayloads = payloads.map((payload) => ({ ...payload, user_id: authData.user.id }));
      const { error } = await supabase.from(config.table as never).insert(ownedPayloads as never);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: [config.table] });
      toast.success(`تم استيراد ${payloads.length} سجلاً`);
    } catch (error) {
      toast.error(`تعذّر الاستيراد: ${(error as Error).message}`);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function openSmartFill() {
    if (smartFilling) return;

    const form = document.getElementById("record-form");
    const liveData = form instanceof HTMLFormElement ? new FormData(form) : null;
    const fillableFields = config.fields.filter((field) => {
      if (field.generated || (field.type !== "text" && field.type !== "textarea")) return false;
      const liveValue = liveData?.get(field.name);
      const fallback = auto[field.name] ?? String(editing?.[field.name] ?? "");
      const value = typeof liveValue === "string" ? liveValue : fallback;
      return !value.trim();
    });

    if (!fillableFields.length) {
      toast.info("جميع الحقول النصية مكتملة بالفعل.");
      return;
    }

    // Do not block the user on a separate readiness probe. The real POST below
    // validates the Cloudflare secret and returns the precise DeepSeek error.
    setSmartPrompt("");
    setSmartPromptOpen(true);
  }

  async function handleRewrite(fieldName: string, fieldLabel: string) {
    if (smartFilling) return;

    const current = auto[fieldName] ?? String(editing?.[fieldName] ?? "");
    if (!current.trim()) {
      toast.info("اكتب النص أولًا ثم استخدم تحسين الصياغة.");
      return;
    }

    setSmartFilling(true);
    try {
      const result = await generateSmartFill({
        data: {
          recordType: config.key,
          recordTitle: config.title,
          brief: current.trim(),
          mode: "rewrite",
          targetField: fieldName,
          schoolName: school?.school_name ?? "",
          fields: [{ name: fieldName, label: fieldLabel, type: "textarea" }],
          values: { [fieldName]: current.trim() },
        },
      });

      const rewritten = result?.suggestions?.[fieldName]?.trim();
      if (!rewritten) {
        toast.info("لم يتم إنتاج صياغة بديلة.");
        return;
      }

      setAuto((a) => ({ ...a, [fieldName]: rewritten }));
      toast.success("تم تحسين الصياغة — راجع النص قبل الحفظ.");
    } catch (error) {
      toast.error((error as Error).message || "تعذّر تحسين الصياغة.");
    } finally {
      setSmartFilling(false);
    }
  }

  async function handleSmartFill() {
    if (smartFilling) return;

    const brief = smartPrompt.trim();
    if (brief.length < 2) {
      toast.error("اكتب مختصرًا بسيطًا عن الحالة أو الموضوع أولًا.");
      return;
    }

    // Read the live form first so text typed immediately before Smart Fill is
    // treated as user-owned content and is never overwritten by AI suggestions.
    const currentValues: Record<string, string> = {};
    const form = document.getElementById("record-form");
    const liveData = form instanceof HTMLFormElement ? new FormData(form) : null;

    config.fields
      .filter((field) => !field.generated)
      .forEach((field) => {
        const liveValue = liveData?.get(field.name);
        const fallback = auto[field.name] ?? String(editing?.[field.name] ?? "");
        const value = typeof liveValue === "string" ? liveValue : fallback;
        if (value.trim()) currentValues[field.name] = value.trim();
      });

    const fillableFields = config.fields.filter(
      (field) =>
        !field.generated &&
        (field.type === "text" || field.type === "textarea") &&
        !currentValues[field.name],
    );

    if (!fillableFields.length) {
      setSmartPromptOpen(false);
      toast.info("جميع الحقول النصية مكتملة بالفعل.");
      return;
    }

    setSmartFilling(true);
    try {
      const result = await generateSmartFill({
        data: {
          recordType: config.key,
          recordTitle: config.title,
          brief,
          schoolName: school?.school_name ?? "",
          fields: fillableFields.map((field) => ({
            name: field.name,
            label: field.label,
            type: field.type === "textarea" ? "textarea" : "text",
          })),
          values: currentValues,
        },
      });

      const suggestions = result?.suggestions ?? {};
      const usable = Object.fromEntries(
        Object.entries(suggestions).filter(([name, value]) => !currentValues[name] && value.trim()),
      );

      if (!Object.keys(usable).length) {
        toast.info("لم تتوفر معلومات كافية للتعبئة. جرّب كتابة مختصر أوضح.");
        return;
      }

      setAuto((current) => ({ ...current, ...usable }));
      setSmartPromptOpen(false);
      toast.success(
        `تمت تعبئة ${Object.keys(usable).length} حقول بالذكاء الاصطناعي — راجعها قبل الحفظ.`,
      );
    } catch (error) {
      toast.error((error as Error).message || "تعذّرت التعبئة الذكية.");
    } finally {
      setSmartFilling(false);
    }
  }


  return (
    <div className="record-page space-y-4">
      <section className="record-page-header rounded-3xl border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{config.title}</h1>
          <p className="text-sm text-muted-foreground">{totalRows} سجل</p>
        </div>
        <div className="record-toolbar flex w-full flex-wrap gap-2 sm:w-auto">
          <Button
            onClick={() => {
              setAuto({});
              setEditing({});
            }}
          >
            <Plus className="size-4" /> إضافة {config.singular}
          </Button>
          {toolbarExtra}
          {!hideImport && (
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importing}>
              <Upload className="size-4" /> استيراد Excel
            </Button>
          )}
          <Button
            variant="outline"
            onClick={async () => {
              if (!serverPagination) {
                exportToExcel(config.fields, filtered, config.title);
                return;
              }
              try {
                const { data: authData, error: authError } = await supabase.auth.getUser();
                if (authError) throw authError;
                if (!authData.user) throw new Error("انتهت جلسة الدخول.");

                let query = (supabase.from(config.table as never) as any)
                  .select("*")
                  .eq("user_id", authData.user.id);
                Object.entries(serverFilters).forEach(([key, value]) => {
                  if (value) query = query.eq(key, value);
                });
                const safeTerm = search.trim().replace(/[,()%]/g, " ");
                if (safeTerm && config.key === "students") {
                  query = query.or(
                    ["full_name", "student_no", "national_id", "grade", "classroom", "guardian_name"]
                      .map((name) => `${name}.ilike.%${safeTerm}%`)
                      .join(","),
                  );
                }
                const { data, error } = await query.order(sort?.key || "created_at", {
                  ascending: sort?.dir === "asc",
                }).limit(5000);
                if (error) throw error;
                exportToExcel(config.fields, (data ?? []) as Row[], config.title);
              } catch (error) {
                toast.error(`تعذّر تصدير البيانات: ${(error as Error).message}`);
              }
            }}
          >
            <Download className="size-4" /> تصدير Excel
          </Button>
          <PdfPreviewButton
            elementRef={recordPdfRef}
            filename={`${config.title}-تقرير`}
            title={config.title}
          />
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
            }}
          />
        </div>
      </div>
      </section>

      {referenceTabs.length > 0 && (
        <div className="reference-tabs flex gap-1 rounded-2xl border bg-card p-1.5 shadow-[var(--shadow-card)]">
          {referenceTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setRecordTab(tab.key);
                setPage(1);
              }}
              className={`flex-1 rounded-xl px-3 py-2 text-[11px] font-black transition ${recordTab === tab.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {filters && <div className="rounded-2xl border bg-card p-3 shadow-[var(--shadow-card)]"><div className="flex flex-wrap items-end gap-3">{filters}</div></div>}
      {rowsError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-bold text-destructive">تعذّر تحميل {config.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {rowsQueryError
                ? String((rowsQueryError as { message?: unknown })?.message ?? rowsQueryError)
                : "حدث خطأ أثناء جلب البيانات."}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetchRows()}>
            إعادة المحاولة
          </Button>
        </div>
      )}


      <div className="relative w-full rounded-2xl border bg-card p-2 shadow-[var(--shadow-card)] sm:max-w-md">
        <Search className="absolute right-5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={config.key === "students" ? "ابحث بالاسم أو رقم الطالب أو الهوية أو الصف..." : "بحث في السجل..."}
          aria-label={config.key === "students" ? "البحث بالاسم أو رقم الطالب أو الهوية أو الصف" : "بحث في السجل"}
          className="h-11 rounded-xl border-0 bg-muted/45 pr-9 pl-9 shadow-none focus-visible:ring-1"
        />
        {search && (
          <button
            type="button"
            aria-label="مسح البحث"
            title="مسح البحث"
            onClick={() => setSearch("")}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div ref={recordPdfRef} className="record-pdf-document rounded-3xl border bg-card p-3 shadow-[var(--shadow-card)] sm:p-4">
        <div className="mb-4 block">
          <OfficialHeader school={school} title={config.title} />
        </div>
        <div className="grid gap-2.5 xl:hidden print:hidden">
          {isLoading && (
            <div className="rounded-2xl border bg-muted/30 p-6 text-center text-sm text-muted-foreground">جارٍ التحميل...</div>
          )}
          {!isLoading && paged.length === 0 && (
            <div className="rounded-2xl border bg-muted/30 p-6 text-center text-sm text-muted-foreground">لا توجد سجلات بعد.</div>
          )}
          {paged.map((row) => {
            const primaryField = listFields[0];
            const secondaryFields = listFields.slice(1, 4);
            return (
              <article key={row.id} className="rounded-2xl border bg-background/80 p-3.5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-primary">{config.singular}</p>
                    <h3 className="mt-0.5 truncate text-sm font-black text-foreground">
                      {primaryField ? displayRecordValue(row[primaryField.name]) : config.singular}
                    </h3>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 shrink-0 rounded-xl px-2.5"
                    onClick={() => setDocumentRow(row)}
                  >
                    <FileText className="size-4" />
                    <span className="text-[10px]">المستند</span>
                  </Button>
                </div>

                {secondaryFields.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {secondaryFields.map((field) => (
                      <div key={field.name} className="rounded-xl bg-muted/45 px-2.5 py-2">
                        <p className="text-[9px] font-bold text-muted-foreground">{field.label}</p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] font-semibold text-foreground">
                          {displayRecordValue(row[field.name]) || "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-0.5">
                  {rowAction && (
                    <Button variant="outline" size="sm" className="h-9 shrink-0 rounded-xl" onClick={() => rowAction.onClick(row)}>
                      {rowAction.icon}
                      <span className="text-[10px]">{rowAction.title}</span>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 shrink-0 rounded-xl"
                    onClick={() => {
                      setAuto({});
                      setEditing(row);
                    }}
                  >
                    <Pencil className="size-4" />
                    <span className="text-[10px]">تعديل</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-9 shrink-0 rounded-xl" onClick={() => setAttachFor(row)}>
                    <Paperclip className="size-4" />
                    <span className="text-[10px]">المرفقات</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 shrink-0 rounded-xl"
                    onClick={() => {
                      const copy: Record<string, string> = {};
                      config.fields.filter((field) => !field.generated).forEach((field) => {
                        copy[field.name] = String(row[field.name] ?? "");
                      });
                      setAuto(copy);
                      setEditing({});
                    }}
                  >
                    <Copy className="size-4" />
                    <span className="text-[10px]">نسخ</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 shrink-0 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      if (confirm("هل تريد حذف هذا السجل؟")) remove.mutate(row.id);
                    }}
                  >
                    <Trash2 className="size-4" />
                    <span className="text-[10px]">حذف</span>
                  </Button>
                </div>
              </article>
            );
          })}
        </div>

        <div className="record-table-scroll hidden overflow-x-auto xl:block print:block">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b bg-muted/60 text-xs">
                {listFields.map((f) => (
                  <th key={f.name} className="whitespace-nowrap p-3 font-bold">
                    <button
                      type="button"
                      onClick={() => toggleSort(f.name)}
                      title={`ترتيب حسب ${f.label}`}
                      className="inline-flex items-center gap-1 hover:text-primary"
                    >
                      {f.label}
                      {sort?.key === f.name &&
                        (sort.dir === "asc" ? (
                          <ArrowUp className="size-3" />
                        ) : (
                          <ArrowDown className="size-3" />
                        ))}
                    </button>
                  </th>
                ))}
                <th data-pdf-exclude="true" className="p-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td
                    colSpan={listFields.length + 1}
                    className="p-6 text-center text-muted-foreground"
                  >
                    جارٍ التحميل...
                  </td>
                </tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={listFields.length + 1}
                    className="p-6 text-center text-muted-foreground"
                  >
                    لا توجد سجلات بعد.
                  </td>
                </tr>
              )}
              {paged.map((row) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-muted/40">
                  {listFields.map((f) => (
                    <td key={f.name} className="p-3 align-top">
                      {rowAction && config.key === "students" && f.name === "full_name" ? (
                        <button
                          type="button"
                          className="font-semibold text-primary hover:underline"
                          onClick={() => rowAction.onClick(row)}
                        >
                          {displayRecordValue(row[f.name])}
                        </button>
                      ) : (
                        displayRecordValue(row[f.name])
                      )}
                    </td>
                  ))}
                  <td data-pdf-exclude="true" className="p-2">
                    <div className="record-row-actions flex gap-1">
                      {rowAction && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title={rowAction.title}
                          onClick={() => rowAction.onClick(row)}
                        >
                          {rowAction.icon}
                        </Button>
                      )}
                      {(() => {
                        const phone =
                          row["guardian_phone"] ??
                          studentOptions.find(
                            (s) =>
                              s.full_name === String(row["student_name"] ?? "") ||
                              (!!row["student_no"] && s.student_no === String(row["student_no"])),
                          )?.guardian_phone;
                        if (!phone) return null;
                        return (
                          <WhatsAppButton
                            phone={phone}
                            guardian={String(row["guardian_name"] ?? "")}
                            student={String(row["student_name"] ?? row["full_name"] ?? "")}
                          />
                        );
                      })()}
                      <Button
                        variant="ghost"
                        size="icon"
                        title="فتح المستند A4"
                        onClick={() => setDocumentRow(row)}
                      >
                        <FileText className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="تعديل السجل"
                        onClick={() => {
                          setAuto({});
                          setEditing(row);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="نسخ السجل كنسخة جديدة"
                        onClick={() => {
                          const copy: Record<string, string> = {};
                          config.fields
                            .filter((field) => !field.generated)
                            .forEach((field) => {
                              copy[field.name] = String(row[field.name] ?? "");
                            });
                          setAuto(copy);
                          setEditing({});
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
                        <Paperclip className="size-4" />
                      </Button>
                      {config.key === "referrals" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="مشاركة الإحالة عبر واتساب"
                          onClick={() =>
                            shareOnWhatsApp(
                              referralMessage({
                                student: String(row["student_name"] ?? ""),
                                studentNo: String(row["student_no"] ?? ""),
                                destination: String(row["referred_to"] ?? ""),
                                reason: String(row["reason"] ?? ""),
                                actions: String(row["attachments"] ?? ""),
                                recommendations: String(row["result"] ?? ""),
                                date: String(row["referral_date"] ?? ""),
                                school: school?.school_name ?? "",
                                counselor: school?.counselor_name ?? "",
                              }),
                            )
                          }
                        >
                          <Send className="size-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("هل تريد حذف هذا السجل؟")) remove.mutate(row.id);
                        }}
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
        <OfficialFooter school={school} />
        {pageCount > 1 && (
          <div data-pdf-exclude="true" className="mt-4 flex items-center justify-between gap-3 text-sm">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronRight className="size-4" /> السابق
            </Button>
            <span className="text-muted-foreground">
              صفحة {currentPage} من {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === pageCount}
              onClick={() => setPage(currentPage + 1)}
            >
              التالي <ChevronLeft className="size-4" />
            </Button>
          </div>
        )}
      </div>


      <Dialog open={documentRow !== null} onOpenChange={(open) => !open && setDocumentRow(null)}>
        <DialogContent className="max-h-[96vh] max-w-5xl overflow-y-auto p-3 sm:p-5" dir="rtl">
          <DialogHeader data-pdf-exclude="true">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <DialogTitle>{`مستند ${config.singular}`}</DialogTitle>
              <PdfPreviewButton
                elementRef={singleDocumentRef}
                filename={`${config.singular}-${String(documentRow?.id ?? "مستند").slice(0, 8)}`}
                title={config.singular}
                disabled={!documentRow}
              />
              <Button
                type="button"
                variant="outline"
                disabled={!documentRow}
                onClick={() => documentRow && setSignatureRow(documentRow)}
              >
                <Send className="size-4" /> إرسال للاعتماد والتوقيع
              </Button>
            </div>
          </DialogHeader>
          {documentRow && (
            <div ref={singleDocumentRef} className="record-pdf-document min-h-[277mm] bg-white p-[10mm] text-[#2c2824] shadow-sm">
              <OfficialHeader
                school={school}
                title={config.singular}
                reportType={config.title}
                reportNo={String(
                  documentRow["case_no"] ??
                  documentRow["program_no"] ??
                  documentRow["referral_no"] ??
                  documentRow["report_no"] ??
                  documentRow["meeting_no"] ??
                  documentRow["seq"] ??
                  documentRow["student_no"] ??
                  documentRow["id"] ??
                  "",
                )}
              />
              <div className="my-6 grid grid-cols-1 gap-x-6 gap-y-0 border border-[var(--paper-border)] sm:grid-cols-2">
                {config.fields.map((field) => {
                  const value = displayRecordValue(documentRow[field.name]);
                  return (
                    <div
                      key={field.name}
                      data-pdf-block="true" className={`border-b border-[var(--paper-border)] p-3 ${field.type === "textarea" ? "sm:col-span-2" : ""}`}
                    >
                      <p className="mb-1 text-[11px] font-bold text-[var(--paper-muted-foreground)]">{field.label}</p>
                      <div className="whitespace-pre-wrap break-words text-sm leading-7">{value || "—"}</div>
                    </div>
                  );
                })}
              </div>
              <OfficialFooter school={school} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
            setSmartPromptOpen(false);
            setSmartPrompt("");
          }
        }}
      >
        <DialogContent className="flex max-h-[calc(100dvh-1rem)] max-w-2xl flex-col overflow-hidden p-0 sm:max-h-[90vh]" dir="rtl">
          <DialogHeader className="border-b px-4 pb-3 pt-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <DialogTitle>
                {editing?.id ? `تعديل ${config.singular}` : `إضافة ${config.singular}`}
              </DialogTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openSmartFill}
                disabled={smartFilling}
                title="اكتب مختصرًا وسيقوم DeepSeek بتعبئة بقية الحقول النصية"
              >
                {smartFilling ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {smartFilling ? "جارٍ التوليد..." : "التعبئة الذكية"}
              </Button>
            </div>
          </DialogHeader>
          {smartPromptOpen && (
            <div className="border-b bg-secondary/35 px-4 py-4 sm:px-6">
              <div className="rounded-2xl border border-primary/15 bg-background p-3.5 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-primary">التعبئة الذكية</p>
                    <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                      اكتب مختصرًا، وسيقترح DeepSeek محتوى للحقول النصية الفارغة فقط.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 shrink-0"
                    onClick={() => {
                      setSmartPromptOpen(false);
                      setSmartPrompt("");
                    }}
                    disabled={smartFilling}
                  >
                    إغلاق
                  </Button>
                </div>
                <Textarea
                  id="smart-fill-brief"
                  value={smartPrompt}
                  onChange={(e) => setSmartPrompt(e.target.value)}
                  placeholder="مثال: طالب يتكرر تأخره الصباحي، تمت مناقشة الأسباب معه ويحتاج إلى متابعة خلال الفترة القادمة."
                  rows={4}
                  autoFocus
                  disabled={smartFilling}
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-[10px] leading-5 text-muted-foreground">
                    الاقتراحات لا تُحفظ تلقائيًا ويمكن تعديلها قبل الحفظ.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSmartFill}
                    disabled={smartFilling || smartPrompt.trim().length < 2}
                    className="shrink-0"
                  >
                    {smartFilling ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Sparkles className="size-4" />
                    )}
                    {smartFilling ? "جارٍ التوليد..." : "تعبئة النموذج"}
                  </Button>
                </div>
              </div>
            </div>
          )}
          <form
            id="record-form"
            className="grid flex-1 gap-4 overflow-y-auto px-4 py-4 sm:grid-cols-2 sm:px-6"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const values: Partial<Row> = {};
              if (editing?.id) values.id = editing.id as string;
              config.fields
                .filter((field) => !field.generated)
                .forEach((f) => {
                  values[f.name] = data.get(f.name) as string;
                });
              const selectedStudentId = data.get("student_id");
              if (selectedStudentId) values["student_id"] = String(selectedStudentId);
              save.mutate(values);
            }}
          >
            {config.fields
              .filter((field) => !field.generated)
              .map((f) => {
                const current = auto[f.name] ?? String(editing?.[f.name] ?? "");
                const fieldOptions =
                  config.key === "students" && f.name === "grade"
                    ? [...(GRADES_BY_STAGE[String(auto["stage"] ?? editing?.["stage"] ?? "")] ?? [])]
                    : optionsFor(f);
                return (
                  <div key={f.name} className={f.type === "textarea" || f.student ? "sm:col-span-2" : ""}>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <Label htmlFor={f.name} className="text-xs">
                        {f.label}
                      </Label>
                      {(f.type === "text" || f.type === "textarea") && current.trim() && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleRewrite(f.name, f.label)}
                          disabled={smartFilling}
                          title="تحسين صياغة هذا الحقل بواسطة DeepSeek"
                        >
                          {smartFilling ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="size-3.5" />
                          )}
                          تحسين الصياغة
                        </Button>
                      )}
                    </div>
                    {f.student ? (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="flex-1">
                          <StudentCombobox
                            value={current}
                            multiple
                            onType={(name) =>
                              setAuto((a) => {
                                const names = String(a["student_name"] ?? current)
                                  .split(/\s*[،,]\s*/)
                                  .map((item) => item.trim())
                                  .filter(Boolean);
                                if (!names.includes(name)) names.push(name);
                                return {
                                  ...a,
                                  student_name: names.join("، "),
                                  student_id: names.length === 1 ? String(a["student_id"] ?? "") : "",
                                };
                              })
                            }
                            onSelect={(s: StudentOption) =>
                              setAuto((a) => {
                                const existing = String(a["student_name"] ?? current)
                                  .split(/\s*[،,]\s*/)
                                  .map((item) => item.trim())
                                  .filter(Boolean);
                                const alreadySelected = existing.includes(s.full_name);
                                const names = alreadySelected
                                  ? existing.filter((name) => name !== s.full_name)
                                  : [...existing, s.full_name];
                                const onlyStudent =
                                  names.length === 1
                                    ? studentOptions.find((student) => student.full_name === names[0])
                                    : undefined;
                                return {
                                  ...a,
                                  student_id: onlyStudent?.id ?? "",
                                  student_name: names.join("، "),
                                  student_no:
                                    names.length === 1
                                      ? onlyStudent?.student_no || onlyStudent?.national_id || ""
                                      : names
                                          .map((name) => {
                                            const student = studentOptions.find((item) => item.full_name === name);
                                            return student?.student_no || student?.national_id || "";
                                          })
                                          .filter(Boolean)
                                          .join("، "),
                                  guardian_name:
                                    names.length === 1 ? onlyStudent?.guardian_name ?? "" : "",
                                  grade: names.length === 1 ? onlyStudent?.grade ?? "" : String(a["grade"] ?? ""),
                                  classroom:
                                    names.length === 1 ? onlyStudent?.classroom ?? "" : String(a["classroom"] ?? ""),
                                  participant:
                                    names.length === 1
                                      ? String(a["participant"] || onlyStudent?.guardian_name || "")
                                      : String(a["participant"] ?? ""),
                                };
                              })
                            }
                            onClear={() =>
                              setAuto((a) => ({
                                ...a,
                                student_name: "",
                                student_id: "",
                                student_no: "",
                                guardian_name: "",
                              }))
                            }
                          />
                        </div>
                        {(() => {
                          const match = current.includes("،") ? undefined : studentOptions.find((s) => s.full_name === current);
                          if (!match?.guardian_phone) return null;
                          return (
                            <WhatsAppButton
                              phone={match.guardian_phone}
                              guardian={match.guardian_name}
                              student={match.full_name}
                            />
                          );
                        })()}
                        <input type="hidden" name={f.name} value={current} readOnly />
                        <input
                          type="hidden"
                          name="student_id"
                          value={auto["student_id"] ?? String(editing?.["student_id"] ?? "")}
                          readOnly
                        />
                      </div>
                    ) : f.type === "textarea" ? (
                      <Textarea
                        key={current}
                        id={f.name}
                        name={f.name}
                        defaultValue={current}
                        rows={4}
                      />
                    ) : f.type === "select" ? (
                      <div className="flex gap-2">
                        <select
                          key={current}
                          id={f.name}
                          name={f.name}
                          defaultValue={current}
                          className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="">—</option>
                          {fieldOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        {current && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title={`مسح اختيار ${f.label}`}
                            aria-label={`مسح اختيار ${f.label}`}
                            onClick={() => setAuto((a) => ({ ...a, [f.name]: "" }))}
                          >
                            <X className="size-4" />
                          </Button>
                        )}
                        {f.lookupCategory && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            title={`إضافة خيار إلى ${f.label}`}
                            aria-label={`إضافة خيار إلى ${f.label}`}
                            onClick={() => addOption(f.lookupCategory ?? "", f.label)}
                          >
                            <Plus className="size-4" />
                          </Button>
                        )}
                        {f.lookupCategory &&
                          current &&
                          lookups.some(
                            (item) => item.category === f.lookupCategory && item.value === current,
                          ) && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title={`حذف الخيار من ${f.label}`}
                              aria-label={`حذف الخيار من ${f.label}`}
                              onClick={() => removeOption(f.lookupCategory ?? "", f.label, current)}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          )}
                      </div>
                    ) : f.type === "date" ? (
                      <div>
                        <HijriDatePicker key={current} value={current} onChange={(iso) => setAuto((values) => ({ ...values, [f.name]: iso }))} />
                        <input type="hidden" id={f.name} name={f.name} value={auto[f.name] ?? current} />
                      </div>
                    ) : (
                      <Input
                        key={current}
                        id={f.name}
                        name={f.name}
                        type={f.type === "number" ? "number" : "text"}
                        defaultValue={current}
                      />
                    )}
                  </div>
                );
              })}
          </form>
          <DialogFooter className="sticky bottom-0 z-10 gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setEditing(null)} disabled={save.isPending}>
              إلغاء
            </Button>
            <Button type="submit" form="record-form" className="w-full sm:w-auto" disabled={save.isPending}>
              {save.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {save.isPending ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {signatureRow && (
        <SendForSignatureDialog
          open={signatureRow !== null}
          onOpenChange={(open) => !open && setSignatureRow(null)}
          recordTable={config.table}
          recordId={signatureRow.id}
          recordType={config.singular}
          title={`${config.singular} - ${displayRecordValue(signatureRow[listFields[0]?.name ?? "id"])}`}
          snapshot={Object.fromEntries(
            config.fields.map((field) => [field.label, signatureRow[field.name] ?? null]),
          )}
        />
      )}
      <RecordAttachmentsDialog
        open={attachFor !== null}
        onOpenChange={(open) => !open && setAttachFor(null)}
        recordId={attachFor?.id ?? null}
        recordTitle={displayRecordValue(attachFor?.[listFields[0]?.name ?? ""] ?? "")}
        linkedType={LINKED_TYPE[config.key] || config.singular}
      />
    </div>
  );
}
