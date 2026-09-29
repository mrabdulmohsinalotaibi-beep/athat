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
import { mergeLookupOptions } from "@/lib/lookups";
import { referralMessage, shareOnWhatsApp } from "@/lib/whatsapp";
import { generateSmartFill } from "@/lib/deepseek.functions";
import type { RecordConfig } from "@/lib/records";
import { OfficialFooter, OfficialHeader } from "@/components/OfficialHeader";
import {
  StudentCombobox,
  useStudentOptions,
  type StudentOption
} from "@/components/StudentCombobox";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { PdfPreviewButton } from "@/components/PdfPreviewButton";

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
}: {
  config: RecordConfig;
  hideImport?: boolean;
  toolbarExtra?: ReactNode;
  filters?: ReactNode;
  extraFilter?: (row: Record<string, unknown>) => boolean;
  rowAction?: { icon: ReactNode; title: string; onClick: (row: Row) => void };
}) {
  const queryClient = useQueryClient();
  const { data: school } = useSchool();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [editing, setEditing] = useState<Partial<Row> | null>(null);
  const [auto, setAuto] = useState<Record<string, string>>({});
  const [smartFilling, setSmartFilling] = useState(false);
  const [smartPromptOpen, setSmartPromptOpen] = useState(false);
  const [smartPrompt, setSmartPrompt] = useState("");
  const { data: studentOptions = [] } = useStudentOptions();
  const [importing, setImporting] = useState(false);
  const [attachFor, setAttachFor] = useState<Row | null>(null);
  const [documentRow, setDocumentRow] = useState<Row | null>(null);
  const singleDocumentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (config.key === "students" || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") !== "student") return;
    const studentId = params.get("studentId") ?? "";
    const studentNo = params.get("studentNo") ?? "";
    const studentName = params.get("studentName") ?? "";
    if (!studentId && !studentNo && !studentName) return;
    setAuto({ student_id: studentId, student_no: studentNo, student_name: studentName });
    setEditing({ student_id: studentId, student_no: studentNo, student_name: studentName });

    // Consume the prefill link once so refreshing the page does not reopen
    // a duplicate draft. Preserve unrelated query parameters and the hash.
    ["new", "studentId", "studentNo", "studentName"].forEach((key) => params.delete(key));
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

  const { data: rows = [], isLoading, isError: rowsError, error: rowsQueryError, refetch: refetchRows } = useQuery({
    queryKey: [config.table],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(config.table as never)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("ar");
    let out = rows;
    if (term) {
      out = out.filter((row) =>
        config.fields.some((f) => String(row[f.name] ?? "").toLocaleLowerCase("ar").includes(term)),
      );
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
  }, [rows, search, config.fields, extraFilter, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paged = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage],
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
      const payload: Record<string, unknown> = {};
      config.fields
        .filter((field) => !field.generated)
        .forEach((f) => {
          const raw = values[f.name];
          if (f.type === "number") payload[f.name] = raw === "" || raw == null ? null : Number(raw);
          else payload[f.name] = raw === "" ? null : (raw ?? null);
        });
      if (config.key !== "students" && values["student_id"])
        payload["student_id"] = values["student_id"];
      if (values.id) {
        const { error } = await supabase
          .from(config.table as never)
          .update(payload as never)
          .eq("id", values.id);
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
      setEditing(null);
      toast.success("تم حفظ السجل");
    },
    onError: (error: Error) => toast.error(`تعذّر الحفظ: ${error.message}`),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(config.table as never)
        .delete()
        .eq("id", id);
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
      const { error } = await supabase.from(config.table as never).insert(payloads as never);
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

    const fillableFields = config.fields.filter(
      (field) =>
        !field.generated &&
        (field.type === "text" || field.type === "textarea") &&
        !(auto[field.name] ?? String(editing?.[field.name] ?? "")).trim(),
    );

    if (!fillableFields.length) {
      toast.info("جميع الحقول النصية مكتملة بالفعل.");
      return;
    }

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

      const rewritten = result.suggestions?.[fieldName]?.trim();
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

    const currentValues: Record<string, string> = {};
    config.fields
      .filter((field) => !field.generated)
      .forEach((field) => {
        const value = auto[field.name] ?? String(editing?.[field.name] ?? "");
        if (value.trim()) currentValues[field.name] = value;
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

      const suggestions = result.suggestions ?? {};
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{config.title}</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} سجل</p>
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
            onClick={() => exportToExcel(config.fields, filtered, config.title)}
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

      {filters && <div className="flex flex-wrap items-end gap-3">{filters}</div>}
      {rowsError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-bold text-destructive">تعذّر تحميل {config.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {rowsQueryError instanceof Error ? rowsQueryError.message : "حدث خطأ أثناء جلب البيانات."}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetchRows()}>
            إعادة المحاولة
          </Button>
        </div>
      )}


      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={config.key === "students" ? "ابحث بالاسم أو رقم الطالب أو الهوية أو الصف..." : "بحث في السجل..."}
          aria-label={config.key === "students" ? "البحث بالاسم أو رقم الطالب أو الهوية أو الصف" : "بحث في السجل"}
          className="pr-9 pl-9"
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

      <div ref={recordPdfRef} className="record-pdf-document rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-4 block">
          <OfficialHeader school={school} title={config.title} />
        </div>
        <div className="record-table-scroll overflow-x-auto">
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

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
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
                            onType={(name) =>
                              setAuto((a) => ({ ...a, student_name: name, student_id: "" }))
                            }
                            onSelect={(s: StudentOption) =>
                              setAuto((a) => ({
                                ...a,
                                student_id: s.id,
                                student_name: s.full_name,
                                student_no: s.student_no || s.national_id,
                                guardian_name: s.guardian_name,
                                grade: s.grade,
                                classroom: s.classroom,
                                participant: a["participant"] || s.guardian_name,
                              }))
                            }
                            onClear={() =>
                              setAuto((a) => ({ ...a, student_name: "", student_id: "" }))
                            }
                          />
                        </div>
                        {(() => {
                          const match = studentOptions.find((s) => s.full_name === current);
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
                          {optionsFor(f).map((option) => (
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
                      <div className="relative">
                        <Input
                          key={current}
                          id={f.name}
                          name={f.name}
                          type="date"
                          defaultValue={current}
                          className="text-transparent caret-transparent"
                          aria-label={f.label}
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-foreground">
                          {current ? formatHijriDate(current) : "اختر التاريخ"}
                        </span>
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
      <Dialog
        open={smartPromptOpen}
        onOpenChange={(open) => {
          if (!smartFilling) setSmartPromptOpen(open);
        }}
      >
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>التعبئة الذكية</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="smart-fill-brief">اكتب مختصرًا عن الحالة أو الموضوع</Label>
            <Textarea
              id="smart-fill-brief"
              value={smartPrompt}
              onChange={(e) => setSmartPrompt(e.target.value)}
              placeholder="مثال: طالب يتكرر تأخره الصباحي، وتمت مناقشة أسباب التأخر معه، ويحتاج إلى متابعة خلال الفترة القادمة."
              rows={5}
              autoFocus
              disabled={smartFilling}
            />
            <p className="text-xs text-muted-foreground">
              سيستخدم الذكاء الاصطناعي هذا المختصر مع بيانات النموذج لكتابة الحقول النصية الناقصة
              فقط. لن يغيّر الحقول التي أدخلتها بنفسك.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSmartPromptOpen(false)}
              disabled={smartFilling}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleSmartFill}
              disabled={smartFilling || smartPrompt.trim().length < 2}
            >
              {smartFilling ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {smartFilling ? "جارٍ التوليد..." : "تعبئة النموذج"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
