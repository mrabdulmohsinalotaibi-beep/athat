import { useMemo, useRef, useState } from "react";
import { FileDown, Printer, X } from "lucide-react";
import { toast } from "sonner";
import { elementToPdf } from "@/lib/pdf";
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

type TemplateField = { label: string; multiline?: boolean; placeholder?: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  fields: TemplateField[];
};

export function ElectronicTemplateDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
}: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const normalizedFields = useMemo(
    () => (fields.length ? fields : [{ label: "الملاحظات", multiline: true }]),
    [fields],
  );

  function setValue(label: string, value: string) {
    setValues((current) => ({ ...current, [label]: value }));
  }

  async function exportPdf() {
    if (!sheetRef.current || busy) return;
    setBusy(true);
    try {
      await elementToPdf(sheetRef.current, title);
      toast.success("تم تجهيز النموذج بصيغة A4 PDF");
    } catch {
      toast.error("تعذّر تجهيز النموذج للطباعة");
    } finally {
      setBusy(false);
    }
  }

  function printSheet() {
    window.setTimeout(() => window.print(), 80);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="electronic-template-dialog max-h-[94vh] max-w-5xl overflow-y-auto p-0"
      >
        <DialogHeader className="no-print border-b bg-card px-5 py-4 sm:px-6">
          <DialogTitle className="text-lg font-black">{title}</DialogTitle>
          <p className="text-xs leading-6 text-muted-foreground">
            {description} — املأ الحقول ثم اطبع النموذج أو احفظه PDF بمقاس A4.
          </p>
        </DialogHeader>
        <div className="no-print grid gap-5 bg-muted/20 p-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              {normalizedFields.map((field) => (
                <div
                  key={field.label}
                  className={field.multiline ? "space-y-2 sm:col-span-2" : "space-y-2"}
                >
                  <Label>{field.label}</Label>
                  {field.multiline ? (
                    <Textarea
                      rows={4}
                      value={values[field.label] ?? ""}
                      placeholder={field.placeholder}
                      onChange={(event) => setValue(field.label, event.target.value)}
                    />
                  ) : (
                    <Input
                      value={values[field.label] ?? ""}
                      placeholder={field.placeholder}
                      onChange={(event) => setValue(field.label, event.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-xs leading-6 text-muted-foreground">
              هذا نموذج إلكتروني داخل المنصة؛ يمكنك مراجعته وتعديله قبل الطباعة. للحفظ الدائم اربطه
              بالسجل المناسب من لوحة العمل.
            </div>
          </div>
          <aside className="space-y-3 rounded-2xl border bg-card p-4">
            <p className="text-sm font-black">إجراءات النموذج</p>
            <Button className="w-full gap-2" onClick={printSheet}>
              <Printer className="size-4" /> طباعة مباشرة A4
            </Button>
            <Button variant="outline" className="w-full gap-2" onClick={exportPdf} disabled={busy}>
              <FileDown className="size-4" /> {busy ? "جارٍ تجهيز PDF..." : "حفظ PDF A4"}
            </Button>
            <Button variant="ghost" className="w-full gap-2" onClick={() => onOpenChange(false)}>
              <X className="size-4" /> إغلاق
            </Button>
          </aside>
        </div>
        <div
          ref={sheetRef}
          className="electronic-template-sheet print-area mx-auto hidden w-full max-w-[210mm] bg-paper p-5 text-paper-foreground print:block sm:p-8"
        >
          <div className="official-letterhead mb-6 overflow-hidden rounded-b-2xl bg-[#1f5964] pb-3 text-white">
            <div className="border-t-4 border-[#c0925d] px-5 py-4 text-center">
              <p className="text-xs font-bold">منصة الذات للتوجيه الطلابي</p>
              <h1 className="mt-2 text-xl font-black">{title}</h1>
            </div>
          </div>
          <p className="mb-5 text-sm leading-7 text-paper-muted-foreground">{description}</p>
          <div className="grid grid-cols-2 border border-paper-border">
            {normalizedFields.map((field) => (
              <div
                key={field.label}
                className={
                  field.multiline
                    ? "col-span-2 border-b border-paper-border last:border-b-0"
                    : "border-b border-l border-paper-border last:border-b-0"
                }
              >
                <div className="bg-paper-muted px-3 py-2 text-xs font-black">{field.label}</div>
                <div
                  className={`min-h-12 whitespace-pre-wrap px-3 py-3 text-sm ${field.multiline ? "min-h-28" : ""}`}
                >
                  {values[field.label] || "—"}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-14 grid grid-cols-2 gap-10 text-center text-xs font-bold">
            <div>
              <div className="mb-10 border-b border-paper-border" />
              الموجه الطلابي
            </div>
            <div>
              <div className="mb-10 border-b border-paper-border" />
              مدير المدرسة
            </div>
          </div>
        </div>
        <DialogFooter className="no-print border-t px-5 py-4 sm:px-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
