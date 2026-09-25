import { useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileDown,
  Plus,
  Printer,
  Search,
  Send,
  Trash2,
  Upload,
  Pencil,
  Paperclip,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/lib/school";
import { exportToExcel, readExcel, toIsoDate } from "@/lib/sheet";
import { elementToPdf } from "@/lib/pdf";
import { displayRecordValue } from "@/lib/display";
import { mergeLookupOptions } from "@/lib/lookups";
import { referralMessage, shareOnWhatsApp } from "@/lib/whatsapp";
import type { RecordConfig } from "@/lib/records";
import { OfficialFooter, OfficialHeader } from "@/components/OfficialHeader";
import {
  StudentCombobox,
  useStudentOptions,
  type StudentOption,
} from "@/components/StudentCombobox";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { RecordPrintDialog } from "@/components/RecordPrintDialog";
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
  DialogTitle,
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
  const { data: studentOptions = [] } = useStudentOptions();
  const [importing, setImporting] = useState(false);
  const [attachFor, setAttachFor] = useState<Row | null>(null);
  const [printFor, setPrintFor] = useState<Row | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
    setAuto((current) => ({ ...current, [config.fields.find((field) => field.lookupCategory === category)?.name ?? ""]: "" }));
    toast.success("تم حذف الخيار من القائمة");
  }

  const { data: rows = [], isLoading } = useQuery({
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
    const term = search.trim();
    let out = rows;
    if (term) {
      out = out.filter((row) =>
        config.fields.some((f) => String(row[f.name] ?? "").includes(term)),
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
      // Preserve a stable relationship for new student-linked records. Legacy
      // records without this column remain visible by their old name/number.
      if (config.key !== "students" && values["student_id"]) payload["student_id"] = values["student_id"];
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
      toast.success("تم حذف السجل");
    },
  });

  async function handleImport(file: File) {
    setImporting(true);
    try {
      const sheetRows = await readExcel(file);
      const importFields = config.fields.filter((field) => !field.generated);
      const headers = Array.from(new Set(sheetRows.flatMap((row) => Object.keys(row))));

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

  async function exportPdf() {
    if (!printRef.current || exportingPdf) return;
    setExportingPdf(true);
    try {
      await elementToPdf(printRef.current, config.title);
      toast.success("تم تجهيز ملف PDF");
    } catch {
      toast.error("تعذّر تصدير PDF. حاول مرة أخرى.");
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{config.title}</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} سجل</p>
        </div>
        <div className="flex flex-wrap gap-2">
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
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" /> طباعة
          </Button>
          <Button variant="outline" onClick={exportPdf} disabled={exportingPdf}>
            <FileDown className="size-4" /> {exportingPdf ? "جارٍ تجهيز PDF..." : "تصدير PDF"}
          </Button>
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

      {filters && <div className="no-print flex flex-wrap items-end gap-3">{filters}</div>}

      <div className="no-print relative max-w-sm">
        <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="بحث في السجل..."
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

      <div ref={printRef} className="print-area rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-4 block">
          <OfficialHeader school={school} title={config.title} />
        </div>
        <div className="overflow-x-auto">
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
                <th className="no-print p-3" />
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
                  <td className="no-print p-2">
                    <div className="flex gap-1">
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
                      <Button
                        variant="ghost"
                        size="icon"
                        title="طباعة رسمية / PDF"
                        onClick={() => setPrintFor(row)}
                      >
                        <Printer className="size-4" />
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
        {pageCount > 1 && (
          <div className="no-print mt-4 flex items-center justify-between gap-3 text-sm">
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
        <div className="hidden print:block">
          <OfficialFooter school={school} />
        </div>
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? `تعديل ${config.singular}` : `إضافة ${config.singular}`}
            </DialogTitle>
          </DialogHeader>
          <form
            id="record-form"
            className="grid gap-4 sm:grid-cols-2"
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
                  <div key={f.name} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
                    <Label htmlFor={f.name} className="mb-1.5 block text-xs">
                      {f.label}
                    </Label>
                    {f.student ? (
                      <div className="flex items-center gap-2">
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
                        {f.lookupCategory && current && lookups.some((item) => item.category === f.lookupCategory && item.value === current) && (
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
                    ) : (
                      <Input
                        key={current}
                        id={f.name}
                        name={f.name}
                        type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
                        defaultValue={current}
                      />
                    )}
                  </div>
                );
              })}
          </form>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
              إلغاء
            </Button>
            <Button type="submit" form="record-form" disabled={save.isPending}>
              حفظ
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
      <RecordPrintDialog
        open={printFor !== null}
        onOpenChange={(open) => !open && setPrintFor(null)}
        config={config}
        row={printFor}
      />
    </div>
  );
}
