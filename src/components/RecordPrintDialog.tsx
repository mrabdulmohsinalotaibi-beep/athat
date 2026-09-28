import { useRef, useState } from "react";
import { FileDown, Printer } from "lucide-react";
import { toast } from "sonner";

import { useSchool } from "@/lib/school";
import { elementToPdf } from "@/lib/pdf";
import { displayRecordValue } from "@/lib/display";
import type { RecordConfig } from "@/lib/records";
import { OfficialFooter, OfficialHeader } from "@/components/OfficialHeader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const LONG_FIELDS = new Set([
  "summary",
  "notes",
  "observation",
  "decisions",
  "recommendations",
  "result",
  "reason",
  "description",
  "goal",
  "attendees",
  "intervention_plan",
]);

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
  const shortFields = filled.filter(
    (item) => !LONG_FIELDS.has(item.field.name) && item.field.type !== "textarea",
  );
  const longFields = filled.filter(
    (item) => LONG_FIELDS.has(item.field.name) || item.field.type === "textarea",
  );
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

  function printDocument() {
    document.body.classList.add("printing-record");
    window.setTimeout(() => {
      window.print();
      window.setTimeout(() => document.body.classList.remove("printing-record"), 300);
    }, 80);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* تنسيقات الطباعة محصورة في هذا المكوّن ولا تؤثر على بقية الموقع */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          body.printing-record > * {
            visibility: hidden !important;
          }

          body.printing-record .record-print-dialog {
            visibility: visible !important;
          }

          body.printing-record .record-print-dialog *,
          body.printing-record .record-print-dialog {
            box-sizing: border-box !important;
          }

          body.printing-record .record-print-dialog {
            position: static !important;
            inset: auto !important;
            width: 100% !important;
            max-width: none !important;
            max-height: none !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            transform: none !important;
          }

          body.printing-record .record-print-dialog .no-print {
            display: none !important;
          }

          body.printing-record .record-print-dialog .print-area {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: #fff !important;
            color: #000 !important;
            box-shadow: none !important;
          }

          body.printing-record .record-print-dialog .print-area table {
            width: 100% !important;
            max-width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
          }

          body.printing-record .record-print-dialog .print-area th,
          body.printing-record .record-print-dialog .print-area td {
            white-space: normal !important;
            overflow-wrap: anywhere !important;
            word-break: normal !important;
            vertical-align: top !important;
          }

          body.printing-record .record-print-dialog .print-area tr,
          body.printing-record .record-print-dialog .print-area .break-inside-avoid,
          body.printing-record .record-print-dialog .print-area .report-signatures,
          body.printing-record .record-print-dialog .print-area .official-letterhead:not(.print-repeat-header) {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          body.printing-record .record-print-dialog .print-area h1,
          body.printing-record .record-print-dialog .print-area h2,
          body.printing-record .record-print-dialog .print-area h3 {
            break-after: avoid-page !important;
            page-break-after: avoid !important;
          }

          /* Reserve physical space for the fixed official header/footer.
             Without this, the first/last lines of every printed page can sit
             underneath the letterhead or signatures. */
          body.printing-record .record-print-dialog .print-area {
            padding-top: 40mm !important;
            padding-bottom: 46mm !important;
          }

          body.printing-record .record-print-dialog .print-repeat-header {
            position: fixed !important;
            top: 12mm !important;
            left: 12mm !important;
            right: 12mm !important;
            width: auto !important;
            height: 34mm !important;
            overflow: hidden !important;
            z-index: 9999 !important;
            background: #fff !important;
          }

          body.printing-record .record-print-dialog .print-repeat-footer {
            position: fixed !important;
            left: 12mm !important;
            right: 12mm !important;
            bottom: 7mm !important;
            width: auto !important;
            height: 39mm !important;
            overflow: hidden !important;
            z-index: 9999 !important;
            background: #fff !important;
          }

          body.printing-record .record-print-dialog .print-area table {
            margin-top: 0 !important;
          }

          body.printing-record .record-print-dialog .print-area section {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          body.printing-record .record-print-dialog .print-area img {
            max-width: 100% !important;
            height: auto !important;
            object-fit: contain !important;
          }
        }
      `}</style>

      <DialogContent
        dir="rtl"
        className="record-print-dialog single-print-sheet max-h-[92vh] max-w-3xl overflow-y-auto"
      >
        <DialogHeader className="no-print">
          <DialogTitle>حفظ PDF رسمي</DialogTitle>
        </DialogHeader>

        <div
          ref={sheetRef}
          className="print-area rounded-lg border bg-paper p-5 text-paper-foreground"
        >
          <OfficialHeader school={school} title={title} reportType={config.singular} />

          <table className="mt-5 w-full text-right text-[12px]">
            <tbody>
              {shortFields.map((item) => (
                <tr key={item.field.name} className="border-b border-paper-border last:border-0">
                  <th className="w-44 border-l border-paper-border bg-paper-muted p-2 font-bold">
                    {item.field.label}
                  </th>
                  <td className="p-2">{item.value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {longFields.map((item) => (
            <section key={item.field.name} className="mt-4 break-inside-avoid">
              <h3 className="report-summary border border-paper-border bg-paper-muted p-2 text-[12px] font-bold">
                {item.field.label}
              </h3>
              <p className="whitespace-pre-wrap border border-t-0 border-paper-border p-3 text-[12px] leading-7">
                {item.value}
              </p>
            </section>
          ))}

          <OfficialFooter school={school} />
        </div>

        <DialogFooter className="no-print gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>
          <Button onClick={exportPdf} disabled={busy}>
            <FileDown className="size-4" /> {busy ? "جارٍ تجهيز PDF..." : "تصدير PDF"}
          </Button>
          <Button variant="outline" onClick={printDocument}>
            <Printer className="size-4" /> طباعة A4
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
