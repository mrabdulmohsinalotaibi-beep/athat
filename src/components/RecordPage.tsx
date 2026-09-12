import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileDown, Plus, Printer, Search, Trash2, Upload, Pencil } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/lib/school";
import { exportToExcel, readExcel, toIsoDate } from "@/lib/sheet";
import { elementToPdf } from "@/lib/pdf";
import type { RecordConfig } from "@/lib/records";
import { OfficialFooter, OfficialHeader } from "@/components/OfficialHeader";
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

export function RecordPage({ config }: { config: RecordConfig }) {
  const queryClient = useQueryClient();
  const { data: school } = useSchool();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<Row> | null>(null);
  const [importing, setImporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const listFields = config.fields.filter((f) => f.list).slice(0, 7);

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
    if (!term) return rows;
    return rows.filter((row) =>
      config.fields.some((f) => String(row[f.name] ?? "").includes(term)),
    );
  }, [rows, search, config.fields]);

  const save = useMutation({
    mutationFn: async (values: Partial<Row>) => {
      const payload: Record<string, unknown> = {};
      config.fields.forEach((f) => {
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
      const payloads = sheetRows
        .map((sheetRow) => {
          const payload: Record<string, unknown> = {};
          config.fields.forEach((f) => {
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

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{config.title}</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} سجل</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setEditing({})}>
            <Plus className="size-4" /> إضافة {config.singular}
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importing}>
            <Upload className="size-4" /> استيراد Excel
          </Button>
          <Button variant="outline" onClick={() => exportToExcel(config.fields, filtered, config.title)}>
            <Download className="size-4" /> تصدير Excel
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" /> طباعة
          </Button>
          <Button
            variant="outline"
            onClick={() => printRef.current && elementToPdf(printRef.current, config.title)}
          >
            <FileDown className="size-4" /> تصدير PDF
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
                      {String(row[f.name] ?? "—")}
                    </td>
                  ))}
                  <td className="no-print p-2">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(row)}>
                        <Pencil className="size-4" />
                      </Button>
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
              const values: Partial<Row> = { id: editing?.id as string | undefined };
              config.fields.forEach((f) => {
                values[f.name] = data.get(f.name) as string;
              });
              save.mutate(values);
            }}
          >
            {config.fields.map((f) => (
              <div key={f.name} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
                <Label htmlFor={f.name} className="mb-1.5 block text-xs">
                  {f.label}
                </Label>
                {f.type === "textarea" ? (
                  <Textarea id={f.name} name={f.name} defaultValue={String(editing?.[f.name] ?? "")} rows={3} />
                ) : f.type === "select" ? (
                  <select
                    id={f.name}
                    name={f.name}
                    defaultValue={String(editing?.[f.name] ?? "")}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">—</option>
                    {f.options?.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={f.name}
                    name={f.name}
                    type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
                    defaultValue={String(editing?.[f.name] ?? "")}
                  />
                )}
              </div>
            ))}
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
    </div>
  );
}
