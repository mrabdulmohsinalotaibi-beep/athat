import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  LinkIcon,
  ShieldCheck,
  Smartphone,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { readExcel, sheetHeaders } from "@/lib/sheet";
import { NOOR_FIELDS, autoMap, cleanId, cleanPhone } from "@/lib/noor";
import { importNoorStudents, type NoorImportResult } from "@/lib/noor-import.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const STEPS = [
  "التحقق من الهوية عبر نفاذ",
  "الاتصال بنظام نور وجلب الكشوفات",
  "توزيع الطلاب على الصفوف والفصول",
];

const NAFATH_SECONDS = 60;

function NafathTab({ onDone }: { onDone: () => void }) {
  const runImport = useServerFn(importNoorStudents);
  const [nationalId, setNationalId] = useState("");
  const [requestNumber, setRequestNumber] = useState<number | null>(null);
  const [options, setOptions] = useState<number[]>([]);
  const [seconds, setSeconds] = useState(NAFATH_SECONDS);
  const [approved, setApproved] = useState(false);
  const [step, setStep] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<NoorImportResult | null>(null);

  useEffect(() => {
    if (requestNumber === null || approved) return;
    if (seconds <= 0) {
      setRequestNumber(null);
      toast.error("انتهت صلاحية طلب نفاذ. أعد المحاولة.");
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, requestNumber, approved]);

  function requestNafath() {
    const digits = nationalId.replace(/\D/g, "");
    if (digits.length !== 10) {
      toast.error("أدخل رقم هوية وطنية صحيحاً مكوّناً من 10 أرقام");
      return;
    }
    const correct = Math.floor(Math.random() * 80) + 10;
    const set = new Set<number>([correct]);
    while (set.size < 3) set.add(Math.floor(Math.random() * 80) + 10);
    setRequestNumber(correct);
    setOptions([...set].sort(() => Math.random() - 0.5));
    setSeconds(NAFATH_SECONDS);
    setApproved(false);
    setResult(null);
    setStep(-1);
  }

  async function approve(choice: number) {
    if (choice !== requestNumber) {
      toast.error("الرقم المختار لا يطابق رقم الطلب المعروض. حاول مرة أخرى.");
      return;
    }
    setApproved(true);
    setBusy(true);
    setStep(0);
    try {
      const timer = setTimeout(() => setStep(1), 900);
      const data = await runImport({
        data: { nationalId: nationalId.replace(/\D/g, ""), requestNumber: String(requestNumber) },
      });
      clearTimeout(timer);
      setStep(2);
      await new Promise((r) => setTimeout(r, 500));
      setResult(data);
      setStep(3);
      if (data.inserted) toast.success(`تم استيراد ${data.inserted} طالباً وتوزيعهم على الفصول`);
      else toast.warning("لم تتم إضافة طلاب جدد (قد تكون البيانات مستوردة مسبقاً).");
      onDone();
    } catch (error) {
      setStep(-1);
      setApproved(false);
      toast.error((error as Error).message || "تعذّر الاتصال بنظام نور");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-xl border">
        <div className="flex items-center justify-between gap-3 bg-[#00693e] px-4 py-3 text-white">
          <div className="leading-tight">
            <p className="text-sm font-extrabold">النفاذ الوطني الموحد</p>
            <p className="text-[11px] opacity-90">Nafath — الدخول الآمن للخدمات الحكومية</p>
          </div>
          <span className="rounded-md bg-white/15 px-2 py-1 text-[10px]">iam.gov.sa/sso/nafath</span>
        </div>

        <div className="space-y-4 bg-card p-4">
          <div className="flex gap-2 rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              يتم التحقق من هوية الموجه الطلابي عبر النفاذ الوطني الموحد دون حفظ أي كلمات مرور. بعد قبول الطلب من تطبيق
              نفاذ يُسمح للنظام بجلب كشوفات الطلاب من نور. هذه واجهة محاكاة داخل المنصة، ويمكنك دائماً استخدام الإدخال
              اليدوي أو رفع ملف Excel كبديل.
            </span>
          </div>

          {requestNumber === null && (
            <div className="space-y-3">
              <div>
                <Label className="mb-1.5 block text-xs">رقم الهوية الوطنية / الإقامة</Label>
                <Input
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  inputMode="numeric"
                  placeholder="10xxxxxxxx"
                  autoComplete="off"
                  className="tracking-widest"
                />
              </div>
              <Button onClick={requestNafath} className="w-full" disabled={nationalId.replace(/\D/g, "").length !== 10}>
                <LinkIcon className="size-4" /> تسجيل الدخول عبر نفاذ
              </Button>
              <a
                href="https://www.iam.gov.sa/sso/nafath"
                target="_blank"
                rel="noreferrer"
                className="block text-center text-[11px] text-muted-foreground underline"
              >
                عن بوابة النفاذ الوطني الموحد الرسمية
              </a>
            </div>
          )}
        </div>
      </div>

      {requestNumber !== null && (
        <div className="rounded-2xl border bg-card p-5 text-center shadow-sm">
          <div className="mx-auto flex max-w-xs flex-col items-center gap-3 rounded-2xl border bg-muted/40 p-5">
            <Smartphone className="size-6 text-primary" />
            <p className="text-sm font-bold">افتح تطبيق نفاذ واختر الرقم التالي</p>
            <p className="text-5xl font-extrabold tracking-widest text-primary">{requestNumber}</p>
            {!approved && (
              <p className="text-xs text-muted-foreground">تنتهي صلاحية الطلب خلال {seconds} ثانية</p>
            )}
            {!approved && <Progress value={(seconds / NAFATH_SECONDS) * 100} className="w-full" />}
          </div>

          {!approved ? (
            <div className="mt-5">
              <p className="mb-2 text-xs text-muted-foreground">محاكاة تطبيق نفاذ — اختر الرقم المطابق للقبول:</p>
              <div className="flex justify-center gap-3">
                {options.map((o) => (
                  <button
                    key={o}
                    onClick={() => approve(o)}
                    className="size-16 rounded-xl border-2 text-xl font-bold transition-colors hover:border-primary hover:bg-primary/10"
                  >
                    {o}
                  </button>
                ))}
              </div>
              <Button variant="ghost" className="mt-3" onClick={() => setRequestNumber(null)}>
                إلغاء الطلب
              </Button>
            </div>
          ) : (
            <p className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-primary">
              <CheckCircle2 className="size-4" /> تم قبول الطلب عبر نفاذ
            </p>
          )}
        </div>
      )}

      {step >= 0 && (
        <div className="space-y-3 rounded-lg border p-4">
          <Progress value={Math.min(((step + 1) / STEPS.length) * 100, 100)} />
          <ul className="space-y-2 text-sm">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-2">
                {step > i ? (
                  <CheckCircle2 className="size-4 text-primary" />
                ) : step === i ? (
                  <Loader2 className="size-4 animate-spin text-primary" />
                ) : (
                  <span className="size-4 rounded-full border" />
                )}
                <span className={step >= i ? "text-foreground" : "text-muted-foreground"}>{s}</span>
              </li>
            ))}
          </ul>
          {busy && <p className="text-xs text-muted-foreground">جارٍ الاتصال بنظام نور...</p>}
        </div>
      )}

      {result && (
        <div className="space-y-3 rounded-lg border bg-muted/40 p-4 text-sm">
          <p>{result.message}</p>
          <p>
            تم جلب <span className="font-bold">{result.fetched}</span> سجلاً، وإضافة{" "}
            <span className="font-bold">{result.inserted}</span> طالباً
            {result.skipped.length > 0 && <> وتجاوز {result.skipped.length} سجلاً</>}.
          </p>
          {result.distribution.length > 0 && (
            <div>
              <p className="mb-2 font-semibold">التوزيع على الصفوف والفصول:</p>
              <div className="flex flex-wrap gap-2 text-xs">
                {result.distribution.map((d) => (
                  <span key={`${d.grade}-${d.classroom}`} className="rounded-full bg-secondary px-3 py-1">
                    {d.grade} / {d.classroom}: {d.count}
                  </span>
                ))}
              </div>
            </div>
          )}
          {result.skipped.length > 0 && (
            <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-destructive">
              {result.skipped.map((s, i) => (
                <li key={i}>
                  {s.name} — {s.reason}
                </li>
              ))}
            </ul>
          )}
          <Button
            variant="outline"
            onClick={() => {
              setRequestNumber(null);
              setResult(null);
              setStep(-1);
            }}
          >
            تنفيذ عملية ربط جديدة
          </Button>
        </div>
      )}
    </div>
  );
}


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
            اربط النظام مباشرة بحساب نور، أو ارفع كشف نور (Excel/CSV) وأكّد ربط الأعمدة قبل الحفظ.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="file" dir="rtl">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="direct">الربط عبر نفاذ</TabsTrigger>
            <TabsTrigger value="file">رفع ملف كشف نور</TabsTrigger>
          </TabsList>

          <TabsContent value="direct" className="pt-4">
            <NafathTab onDone={() => queryClient.invalidateQueries({ queryKey: ["students"] })} />
          </TabsContent>

          <TabsContent value="file" className="space-y-4 pt-4">
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
