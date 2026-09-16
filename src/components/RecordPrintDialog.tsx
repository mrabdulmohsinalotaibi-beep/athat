import { useRef, useState } from "react";
import { FileDown, Printer } from "lucide-react";
import { toast } from "sonner";

import { useSchool } from "@/lib/school";
import { elementToPdf } from "@/lib/pdf";
import { displayRecordValue } from "@/lib/display";
import type { RecordConfig } from "@/lib/records";
import { OfficialFooter, OfficialHeader } from "@/components/OfficialHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const LONG_FIELDS = new Set(["summary", "notes", "observation", "decisions", "recommendations", "result", "reason", "description", "goal", "attendees", "intervention_plan"]);

export function RecordPrintDialog({
  open,
  onOpenChange,
  config,
  row,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  config: RecordConfig;
  row: Record<string, unknown> | null;
}) {
  const { data: school } = useSchool();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  if (!row) return null;

  const filled = config.fields
    .map((field) => ({ field, value: displayRecordValue(row[field.name]) }))
    .filter((item) => item.value && item.value !== "—");
  const shortFields = filled.filter((item) => !LONG_FIELDS.has(item.field.name) && item.field.type !== "textarea");
  const longFields = filled.filter((item) => LONG_FIELDS.has(item.field.name) || item.field.type === "textarea");
  const title = `${config.singular} — ${config.title}`;

  async function exportPdf() {
    if (!sheetRef.current || busy) return;
    setBusy(true);
    try {
      await elementToPdf(sheetRef.current, title);
      toast.success("تم تجهيز ملف PDF");
    } catch {
      toast.error("تعذّر تصدير PDF. حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="single-print-sheet max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader className="no-print">
          <DialogTitle>طباعة رسمية / PDF</DialogTitle>
        </DialogHeader>

        <div ref={sheetRef} className="print-area rounded-lg border bg-paper p-5 text-paper-foreground">
          <OfficialHeader school={school} title={title} reportType={config.singular} />

          <table className="mt-5 w-full text-right text-[12px]">
            <tbody>
              {shortFields.map((item) => (
                <tr key={item.field.name} className="border-b border-paper-border last:border-0">
                  <th className="w-44 border-l border-paper-border bg-paper-muted p-2 font-bold">{item.field.label}</th>
                  <td className="p-2">{item.value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {longFields.map((item) => (
            <section key={item.field.name} className="mt-4">
              <h3 className="report-summary border border-paper-border bg-paper-muted p-2 text-[12px] font-bold">{item.field.label}</h3>
              <p className="whitespace-pre-wrap border border-t-0 border-paper-border p-3 text-[12px] leading-7">{item.value}</p>
            </section>
          ))}

          <OfficialFooter school={school} />
        </div>

        <DialogFooter className="no-print gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" /> طباعة
          </Button>
          <Button onClick={exportPdf} disabled={busy}>
            <FileDown className="size-4" /> {busy ? "جارٍ تجهيز PDF..." : "تصدير PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
