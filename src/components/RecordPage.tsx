import { useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, FileDown, Plus, Printer, Search, Send, Trash2, Upload, Pencil, Paperclip, X } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/lib/school";
import { exportToExcel, readExcel, toIsoDate } from "@/lib/sheet";
import { elementToPdf } from "@/lib/pdf";
import { displayRecordValue } from "@/lib/display";
import { mergeLookupOptions } from "@/lib/lookups";
import { mapImportColumns } from "@/lib/ai.functions";
import { referralMessage, shareOnWhatsApp } from "@/lib/whatsapp";
import type { RecordConfig } from "@/lib/records";
import { OfficialFooter, OfficialHeader } from "@/components/OfficialHeader";
import { StudentCombobox, useStudentOptions, type StudentOption } from "@/components/StudentCombobox";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { AiDraftAssistant } from "@/components/AiDraftAssistant";
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

const AI_RECORD_KEYS = new Set(["cases", "interviews", "behavior", "reports", "referrals"]);
const LINKED_TYPE: Record<string, string> = { cases: "حالة", programs: "برنامج", interviews: "مقابلة", attendance: "مواظبة", behavior: "سلوك", referrals: "إحالة", committees: "اجتماع", plan: "مهمة" };

export function RecordPage({
  config,
  hideImport,
  toolbarExtra,
  filters,
  extraFilter,
}: {
  config: RecordConfig;
  hideImport?: boolean;
  toolbarExtra?: ReactNode;
  filters?: ReactNode;
  extraFilter?: (row: Record<string, unknown>) => boolean;
}) {
  const queryClient = useQueryClient();
  const { data: school } = useSchool();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<Row> | null>(null);
  const [auto, setAuto] = useState<Record<string, string>>({});
  const { data: studentOptions = [] } = useStudentOptions();
  const [importing, setImporting] = useState(false);
  const [attachFor, setAttachFor] = useState<Row | null>(null);
  const [printFor, setPrintFor] = useState<Row | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const smartMap = useServerFn(mapImportColumns);
  const printRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const listFields = config.fields.filter((f) => f.list).slice(0, 7);

  const { data: lookups = [] } = useQuery({
    queryKey: ["lookups"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lookups").select("id, category, value, sort_order").order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const optionsFor = (field: (typeof config.fields)[number]) => mergeLookupOptions(
    field.options,
    lookups.filter((item) => item.category === field.lookupCategory).map((item) => item.value ?? ""),
  );

  async function addOption(category: string, label: string) {
    const value = window.prompt(`أدخل خياراً جديداً في ${label}`)?.trim();
    if (!value) return;
    const exists = lookups.some((item) => item.category === category && item.value?.trim() === value);
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
    setAuto((current) => ({ ...current, [config.fields.find((field) => field.lookupCategory === category)?.name ?? ""]: value }));
    toast.success("تمت إضافة الخيار للقائمة");
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
      out = out.filter((row) => config.fields.some((f) => String(row[f.name] ?? "").includes(term)));
    }
    if (extraFilter) out = out.filter((row) => extraFilter(row));
    return out;
  }, [rows, search, config.fields, extraFilter]);

  const save = useMutation({
    mutationFn: async (values: Partial<Row>) => {
      const payload: Record<string, unknown> = {};
      config.fields.filter((field) => !field.generated).forEach((f) => {
        const raw = values[f.name];
        if (f.type === "number") payload[f.name] = raw === "" || raw == null ? null : Number(raw);
        else payload[f.name] = raw === "" ? null : (raw ?? null);
      });
      if (values.id) {
        const { error } = await supabase.from(config.table as never).update(payload as never).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(config.table as never).insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [config.table] });
      setEditing(null);
      toast.success("تم حفظ السجل");
    },
    onError: (error: Error) => toast.error(`تعذّر الحفظ: ${error.message}`),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(config.table as never).delete().eq("id", id);
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
      const unmatched = importFields.filter((f) => !headers.includes(f.label) && !headers.includes(f.name));

      let smart: Record<string, string> = {};
      if (headers.length && unmatched.length) {
        try {
          smart = await smartMap({
            data: {
              headers,
              sample: sheetRows.slice(0, 3).map((row) =>
                Object.fromEntries(Object.entries(row).map(([key, value]) => [key, String(value ?? "").slice(0, 300)])),
              ),
              fields: importFields.map((f) => ({ name: f.name, label: f.label })),
            },
          });
          if (Object.keys(smart).length) toast.success("تم تعيين الأعمدة آلياً بالذكاء الاصطناعي");
        } catch {
          // Fall back to direct header matching.
        }
      }

      const payloads = sheetRows
        .map((sheetRow) => {
          const payload: Record<string, unknown> = {};
          importFields.forEach((f) => {
            const smartColumn = smart[f.name];
            const value = sheetRow[f.label] ?? sheetRow[f.name] ?? (smartColumn ? sheetRow[smartColumn] : undefined);
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
          <Button variant="outline" onClick={() => exportToExcel(config.fields, filtered, config.title)}>
            <Download className="size-4" /> تصدير Excel
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" /> طباعة
          </Button>
          <Button
            variant="outline"
            onClick={exportPdf}
            disabled={exportingPdf}
          >
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
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث في السجل..."
          className="pr-9"
        />
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
                    {f.label}
                  </th>
                ))}
                <th className="no-print p-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={listFields.length + 1} className="p-6 text-center text-muted-foreground">
                    جارٍ التحميل...
                  </td>
                </tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={listFields.length + 1} className="p-6 text-center text-muted-foreground">
                    لا توجد سجلات بعد.
                  </td>
                </tr>
              )}
              {filtered.map((row) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-muted/40">
                  {listFields.map((f) => (
                    <td key={f.name} className="p-3 align-top">
                      {displayRecordValue(row[f.name])}
                    </td>
                  ))}
                  <td className="no-print p-2">
                    <div className="flex gap-1">
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
                      <Button variant="ghost" size="icon" title="المرفقات" onClick={() => setAttachFor(row)}>
                        <Paperclip className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="طباعة رسمية / PDF" onClick={() => setPrintFor(row)}>
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
        <div className="hidden print:block">
          <OfficialFooter school={school} />
        </div>
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? `تعديل ${config.singular}` : `إضافة ${config.singular}`}</DialogTitle>
          </DialogHeader>
          <form
            id="record-form"
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const values: Partial<Row> = {};
              if (editing?.id) values.id = editing.id as string;
              config.fields.filter((field) => !field.generated).forEach((f) => {
                values[f.name] = data.get(f.name) as string;
              });
              save.mutate(values);
            }}
          >
            {AI_RECORD_KEYS.has(config.key) && (
              <AiDraftAssistant
                recordKey={config.key as "cases" | "interviews" | "behavior" | "reports"}
                context={Object.fromEntries(
                  config.fields.map((field) => [field.name, auto[field.name] ?? String(editing?.[field.name] ?? "")]),
                )}
                availableOptions={Object.fromEntries(config.fields.filter((field) => field.type === "select").map((field) => [field.name, optionsFor(field)]))}
                onDraft={(draft) => {
                  const generated: Record<string, string> = {};
                  if (config.key === "cases") {
                    generated["summary"] = `${draft.summary}\n\nوصف المشكلة:\n${draft.problemDescription}\n\nالأسباب المحتملة:\n${draft.causes}\n\nالأهداف الإرشادية:\n${draft.goals}`;
                    const interventionField = config.fields.find((field) => field.name === "intervention_plan");
                    if (interventionField && optionsFor(interventionField).includes(draft.interventionPlan)) generated["intervention_plan"] = draft.interventionPlan;
                    generated["next_action"] = draft.nextAction;
                    generated["notes"] = `الإجراءات:\n${draft.actions}\n\nالتوصيات:\n${draft.recommendations}\n\n${draft.notes}`;
                  } else if (config.key === "interviews") {
                    generated["topic"] = draft.problemDescription || draft.summary;
                    generated["result"] = `${draft.actions}\n\nالنتيجة:\n${draft.result}`;
                    generated["recommendations"] = `${draft.recommendations}\n\nالإجراء القادم: ${draft.nextAction}`;
                    generated["notes"] = draft.notes;
                  } else if (config.key === "behavior") {
                    generated["observation"] = `${draft.problemDescription}\n\nالأسباب المحتملة: ${draft.causes}`;
                    const actionField = config.fields.find((field) => field.name === "action");
                    const resultField = config.fields.find((field) => field.name === "result");
                    const action = draft.actions || draft.interventionPlan;
                    if (actionField && optionsFor(actionField).includes(action)) generated["action"] = action;
                    if (resultField && optionsFor(resultField).includes(draft.result)) generated["result"] = draft.result;
                    generated["notes"] = `${draft.recommendations}\n\nالإجراء القادم: ${draft.nextAction}`;
                  } else {
                    generated["summary"] = draft.summary;
                    generated["notes"] = `وصف الموضوع:\n${draft.problemDescription}\n\nالأسباب المحتملة:\n${draft.causes}\n\nالأهداف:\n${draft.goals}\n\nالإجراءات:\n${draft.actions}\n\nخطة العمل:\n${draft.interventionPlan}\n\nالنتائج:\n${draft.result}\n\nالتوصيات:\n${draft.recommendations}\n\nالإجراء القادم:\n${draft.nextAction}`;
                  }
                  Object.entries(draft.suggestedSelections).forEach(([fieldName, value]) => {
                    const field = config.fields.find((item) => item.name === fieldName);
                    if (field?.type === "select" && value && optionsFor(field).includes(value)) generated[fieldName] = value;
                  });
                  setAuto((current) => ({ ...current, ...generated }));
                }}
              />
            )}
            {config.fields.filter((field) => !field.generated).map((f) => {
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
                        onType={(name) => setAuto((a) => ({ ...a, student_name: name }))}
                        onSelect={(s: StudentOption) =>
                          setAuto((a) => ({
                            ...a,
                            student_name: s.full_name,
                            student_no: s.student_no || s.national_id,
                            guardian_name: s.guardian_name,
                            grade: s.grade,
                            classroom: s.classroom,
                            participant: a["participant"] || s.guardian_name,
                          }))
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
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    {f.lookupCategory && (
                      <Button type="button" variant="outline" size="icon" title={`إضافة خيار إلى ${f.label}`} aria-label={`إضافة خيار إلى ${f.label}`} onClick={() => addOption(f.lookupCategory ?? "", f.label)}>
                        <Plus className="size-4" />
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
      <EvidenceUploadDialog open={evidenceFor !== null} onOpenChange={(open) => !open && setEvidenceFor(null)} defaultLinkedType={LINKED_TYPE[config.key] || config.singular} defaultLinkedRef={displayRecordValue(evidenceFor?.[listFields[0]?.name ?? ""] ?? evidenceFor?.[config.fields.find((field) => field.type === "date")?.name ?? ""] ?? "")} />
    </div>
  );
}
