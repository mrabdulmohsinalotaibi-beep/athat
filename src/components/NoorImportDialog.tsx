import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { readExcel, sheetHeaders } from "@/lib/sheet";
import { NOOR_FIELDS, autoMap, cleanId, cleanPhone } from "@/lib/noor";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type SheetRow = Record<string, unknown>;
type RowError = { row: number; name: string; reason: string };

export function NoorImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ inserted: number; errors: RowError[] } | null>(null);

  function reset() {
    setFileName("");
    setRows([]);
    setHeaders([]);
    setMapping({});
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function pickFile(file: File) {
    try {
      const parsed = await readExcel(file);
      if (!parsed.length) {
        toast.error("الملف لا يحتوي على بيانات.");
        return;
      }
      const hdrs = sheetHeaders(parsed);
      setFileName(file.name);
      setRows(parsed);
      setHeaders(hdrs);
      setMapping(autoMap(hdrs));
      setResult(null);
    } catch (error) {
      toast.error(`تعذّرت قراءة الملف: ${(error as Error).message}`);
    }
  }

  function valueOf(row: SheetRow, field: string): string {
    const column = mapping[field];
    if (!column) return "";
    const raw = row[column];
    if (raw === undefined || raw === null) return "";
    if (field === "guardian_phone") return cleanPhone(raw);
    if (field === "national_id") return cleanId(raw);
    return String(raw).trim();
  }

  async function runImport() {
    setBusy(true);
    try {
      const { data: existing } = await supabase.from("students").select("national_id");
      const known = new Set(
        (existing ?? []).map((s) => cleanId((s as { national_id: string | null }).national_id)).filter(Boolean),
      );

      const payloads: Record<string, string | null>[] = [];
      const errors: RowError[] = [];

      rows.forEach((row, index) => {
        const values: Record<string, string> = {};
        NOOR_FIELDS.forEach((f) => (values[f.name] = valueOf(row, f.name)));
        const rowNo = index + 2;
        const name = values["full_name"] || "—";

        if (!values["full_name"]) {
          errors.push({ row: rowNo, name, reason: "اسم الطالب مفقود" });
          return;
        }
        const id = values["national_id"] ?? "";
        if (!id) {
          errors.push({ row: rowNo, name, reason: "رقم الهوية مفقود" });
          return;
        }
        if (id.length < 8) {
          errors.push({ row: rowNo, name, reason: "رقم هوية غير صالح" });
          return;
        }
        if (known.has(id)) {
          errors.push({ row: rowNo, name, reason: "رقم الهوية مكرر (موجود مسبقاً أو متكرر في الملف)" });
          return;
        }
        known.add(id);

        const payload: Record<string, string | null> = { status: "نشط", student_no: id };
        NOOR_FIELDS.forEach((f) => {
          payload[f.name] = values[f.name] || null;
        });
        payloads.push(payload);
      });

      let inserted = 0;
      for (let i = 0; i < payloads.length; i += 200) {
        const chunk = payloads.slice(i, i + 200);
        const { error } = await supabase.from("students").insert(chunk as never);
        if (error) {
          chunk.forEach((c) =>
            errors.push({ row: 0, name: String(c["full_name"] ?? "—"), reason: `خطأ في الحفظ: ${error.message}` }),
          );
        } else {
          inserted += chunk.length;
        }
      }

      queryClient.invalidateQueries({ queryKey: ["students"] });
      setResult({ inserted, errors });
      if (inserted) toast.success(`تم استيراد ${inserted} طالباً`);
      else toast.error("لم يتم استيراد أي صف. راجع تقرير الأخطاء.");
    } catch (error) {
      toast.error(`تعذّر الاستيراد: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  const preview = rows.slice(0, 5);
  const missingRequired = NOOR_FIELDS.filter((f) => f.required && !mapping[f.name]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>استيراد الطلاب من تقارير نظام نور</DialogTitle>
          <DialogDescription>
            ارفع ملف نور (Excel/CSV)، ثم أكّد ربط الأعمدة السبعة قبل الحفظ.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) pickFile(file);
          }}
        />

        {!rows.length && !result && (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <FileSpreadsheet className="mx-auto size-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              الأعمدة المتوقعة: اسم الطالب · رقم الهوية · الجنسية · الصف · الفصل · ولي الأمر · جوال ولي الأمر
            </p>
            <Button className="mt-4" onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" /> اختيار ملف
            </Button>
          </div>
        )}

        {rows.length > 0 && !result && (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              الملف: <span className="font-semibold text-foreground">{fileName}</span> — {rows.length} صف
            </p>

            <div>
              <h3 className="mb-2 text-sm font-bold">1) تعيين الأعمدة</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {NOOR_FIELDS.map((f) => (
                  <div key={f.name}>
                    <Label className="mb-1.5 block text-xs">
                      {f.label} {f.required && <span className="text-destructive">*</span>}
                    </Label>
                    <select
                      value={mapping[f.name] ?? ""}
                      onChange={(e) => setMapping((m) => ({ ...m, [f.name]: e.target.value }))}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">— لا يوجد —</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              {missingRequired.length > 0 && (
                <p className="mt-2 flex items-center gap-2 text-xs text-destructive">
                  <AlertTriangle className="size-4" />
                  يجب تعيين: {missingRequired.map((f) => f.label).join("، ")}
                </p>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-bold">2) معاينة أول {preview.length} صفوف</h3>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b bg-muted/60">
                      {NOOR_FIELDS.map((f) => (
                        <th key={f.name} className="whitespace-nowrap p-2 font-bold">
                          {f.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-b last:border-0">
                        {NOOR_FIELDS.map((f) => (
                          <td key={f.name} className="whitespace-nowrap p-2">
                            {valueOf(row, f.name) || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-4 text-sm">
              <CheckCircle2 className="size-5 text-primary" />
              تم استيراد <span className="font-bold">{result.inserted}</span> طالباً بنجاح
              {result.errors.length > 0 && <span> — وتم تجاوز {result.errors.length} صفاً</span>}
            </div>
            {result.errors.length > 0 && (
              <div className="max-h-64 overflow-y-auto rounded-lg border">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b bg-muted/60">
                      <th className="p-2 font-bold">الصف في الملف</th>
                      <th className="p-2 font-bold">الاسم</th>
                      <th className="p-2 font-bold">سبب التجاوز</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((e, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="p-2">{e.row || "—"}</td>
                        <td className="p-2">{e.name}</td>
                        <td className="p-2 text-destructive">{e.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {result ? (
            <>
              <Button variant="outline" onClick={reset}>
                استيراد ملف آخر
              </Button>
              <Button onClick={() => onOpenChange(false)}>إغلاق</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                إلغاء
              </Button>
              {rows.length > 0 && (
                <>
                  <Button variant="outline" onClick={() => fileRef.current?.click()}>
                    تغيير الملف
                  </Button>
                  <Button onClick={runImport} disabled={busy || missingRequired.length > 0}>
                    {busy ? "جارٍ الاستيراد..." : `استيراد ${rows.length} صف`}
                  </Button>
                </>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
