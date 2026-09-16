import { useMemo, useRef, useState } from "react";
import { FileDown, Printer } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
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

type EvidenceItem = {
  id: string;
  name: string;
  path: string;
  url: string;
  kind: "image" | "video" | "doc";
};

function evidenceKind(mime: string, name: string): EvidenceItem["kind"] {
  const value = `${mime} ${name}`.toLowerCase();

  if (
    mime.startsWith("image/") ||
    /\.(jpg|jpeg|png|webp|gif)$/i.test(value)
  ) {
    return "image";
  }

  if (
    mime.startsWith("video/") ||
    /\.(mp4|mov|webm)$/i.test(value)
  ) {
    return "video";
  }

  return "doc";
}

function formatDate(value: unknown) {
  if (!value) return "—";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

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

  /*
   * تحميل الشواهد المرتبطة بالسجل.
   * مهم جدًا للبرامج لأن التقرير الرسمي يجب أن يحتوي
   * على الشواهد المرتبطة بالبرنامج نفسه.
   */
  const { data: evidences = [], isLoading: evidenceLoading } = useQuery({
    queryKey: ["record-print-evidences", row?.id],
    enabled: open && !!row?.id,
    queryFn: async () => {
      if (!row?.id) return [];

      const { data, error } = await supabase
        .from("evidences")
        .select(
          "id, name, file_name, file_path, mime_type, created_at, description",
        )
        .eq("linked_ref", row.id)
        .not("file_path", "is", null)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const records = data ?? [];

      const paths = records
        .map((item) => String(item.file_path ?? ""))
        .filter(Boolean);

      const signed =
        paths.length > 0
          ? (
              await supabase.storage
                .from("evidences")
                .createSignedUrls(paths, 3600)
            ).data ?? []
          : [];

      return records.map((item, index) => {
        const name = String(
          item.name ?? item.file_name ?? `شاهد ${index + 1}`,
        );

        const path = String(item.file_path ?? "");

        return {
          id: String(item.id),
          name,
          path,
          url: signed[index]?.signedUrl ?? "",
          kind: evidenceKind(
            String(item.mime_type ?? ""),
            String(item.file_name ?? name),
          ),
        } satisfies EvidenceItem;
      });
    },
  });

  const filled = useMemo(() => {
    return config.fields
      .map((field) => ({
        field,
        rawValue: row?.[field.name],
        value: displayRecordValue(row?.[field.name]),
      }))
      .filter(
        (item) =>
          item.value &&
          item.value !== "—" &&
          item.value !== "null" &&
          item.value !== "undefined",
      );
  }, [config.fields, row]);

  const isProgram = config.key === "programs";

  const programMainFields = useMemo(() => {
    if (!isProgram) return [];

    const names = [
      "program_no",
      "name",
      "ptype",
      "domain",
      "target_group",
      "term",
      "indicator",
      "start_date",
      "end_date",
      "exec_status",
      "beneficiaries",
      "required_evidence",
    ];

    return names
      .map((name) => filled.find((item) => item.field.name === name))
      .filter(Boolean) as typeof filled;
  }, [filled, isProgram]);

  const regularShortFields = filled.filter(
    (item) =>
      !LONG_FIELDS.has(item.field.name) &&
      item.field.type !== "textarea" &&
      !(
        isProgram &&
        [
          "program_no",
          "name",
          "ptype",
          "domain",
          "target_group",
          "term",
          "indicator",
          "start_date",
          "end_date",
          "exec_status",
          "beneficiaries",
          "required_evidence",
        ].includes(item.field.name)
      ),
  );

  const longFields = filled.filter(
    (item) =>
      LONG_FIELDS.has(item.field.name) || item.field.type === "textarea",
  );

  const title = isProgram
    ? "تقرير تنفيذ برنامج إرشادي"
    : `${config.singular} — ${config.title}`;

  async function exportPdf() {
    if (!sheetRef.current || busy) return;

    setBusy(true);

    try {
      await elementToPdf(sheetRef.current, title);
      toast.success("تم تجهيز ملف PDF بنجاح");
    } catch (error) {
      console.error(error);
      toast.error("تعذّر تصدير PDF. حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  function printOnlyReport() {
    window.print();
  }

  if (!row) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          dir="rtl"
          className="max-h-[94vh] max-w-5xl overflow-y-auto p-0 print-dialog"
        >
          <DialogHeader className="no-print border-b px-6 py-4">
            <DialogTitle>
              {isProgram
                ? "تقرير البرنامج الإرشادي"
                : "طباعة رسمية / PDF"}
            </DialogTitle>
          </DialogHeader>

          <div className="print-scroll-container p-4 sm:p-6">
            <div
              ref={sheetRef}
              className="official-report-sheet mx-auto bg-white text-black"
            >
              <OfficialHeader
                school={school}
                title={title}
                reportType={isProgram ? "برنامج إرشادي" : config.singular}
              />

              {isProgram ? (
                <>
                  {/* عنوان التقرير */}
                  <div className="program-report-title">
                    <h2>تقرير تنفيذ برنامج إرشادي</h2>
                    <p>
                      توثيق وتنفيذ ومتابعة أحد البرامج والأنشطة الإرشادية
                    </p>
                  </div>

                  {/* بطاقة الحالة */}
                  <div className="program-status-row">
                    <div>
                      <span>حالة التنفيذ</span>
                      <strong>
                        {displayRecordValue(row.exec_status)}
                      </strong>
                    </div>

                    <div>
                      <span>عدد المستفيدين</span>
                      <strong>
                        {displayRecordValue(row.beneficiaries)}
                      </strong>
                    </div>

                    <div>
                      <span>نوع البرنامج</span>
                      <strong>
                        {displayRecordValue(row.ptype)}
                      </strong>
                    </div>
                  </div>

                  {/* البيانات الأساسية */}
                  <section className="report-section">
                    <h3>أولاً: البيانات الأساسية للبرنامج</h3>

                    <table className="report-table">
                      <tbody>
                        {programMainFields.map((item) => (
                          <tr key={item.field.name}>
                            <th>{item.field.label}</th>
                            <td>
                              {item.field.name === "start_date" ||
                              item.field.name === "end_date"
                                ? formatDate(item.rawValue)
                                : item.value}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>

                  {/* الهدف */}
                  {row.goal && (
                    <section className="report-section">
                      <h3>ثانياً: الهدف من البرنامج</h3>
                      <div className="report-long-text">
                        {String(row.goal)}
                      </div>
                    </section>
                  )}

                  {/* الملاحظات */}
                  {row.notes && (
                    <section className="report-section">
                      <h3>ثالثاً: الملاحظات</h3>
                      <div className="report-long-text">
                        {String(row.notes)}
                      </div>
                    </section>
                  )}

                  {/* الشواهد */}
                  <section className="report-section evidence-section">
                    <div className="evidence-heading">
                      <div>
                        <h3>رابعاً: الشواهد والمرفقات</h3>
                        <p>
                          الشواهد المرتبطة مباشرة بهذا البرنامج في النظام
                        </p>
                      </div>

                      <span className="evidence-count">
                        {evidenceLoading
                          ? "..."
                          : `${evidences.length} شاهد`}
                      </span>
                    </div>

                    {evidenceLoading ? (
                      <div className="empty-evidence">
                        جارٍ تحميل الشواهد...
                      </div>
                    ) : evidences.length === 0 ? (
                      <div className="empty-evidence">
                        لا توجد شواهد مرفقة بهذا البرنامج.
                      </div>
                    ) : (
                      <div className="evidence-grid">
                        {evidences.map((evidence, index) => (
                          <div
                            key={evidence.id}
                            className="evidence-card"
                          >
                            <div className="evidence-card-header">
                              <strong>
                                شاهد رقم {index + 1}
                              </strong>

                              <span>{evidence.name}</span>
                            </div>

                            {evidence.kind === "image" &&
                            evidence.url ? (
                              <img
                                src={evidence.url}
                                alt={evidence.name}
                                className="evidence-image"
                              />
                            ) : evidence.kind === "video" &&
                              evidence.url ? (
                              <div className="evidence-file">
                                مقطع فيديو مرفق
                              </div>
                            ) : (
                              <div className="evidence-file">
                                مستند مرفق: {evidence.name}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              ) : (
                <>
                  <table className="mt-5 w-full text-right text-[12px]">
                    <tbody>
                      {regularShortFields.map((item) => (
                        <tr
                          key={item.field.name}
                          className="border-b border-paper-border last:border-0"
                        >
                          <th className="w-44 border-l border-paper-border bg-paper-muted p-2 font-bold">
                            {item.field.label}
                          </th>
                          <td className="p-2">
                            {item.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {longFields.map((item) => (
                    <section
                      key={item.field.name}
                      className="mt-4"
                    >
                      <h3 className="border border-paper-border bg-paper-muted p-2 text-[12px] font-bold">
                        {item.field.label}
                      </h3>

                      <p className="whitespace-pre-wrap border border-t-0 border-paper-border p-3 text-[12px] leading-7">
                        {item.value}
                      </p>
                    </section>
                  ))}
                </>
              )}

              <OfficialFooter school={school} />
            </div>
          </div>

          <DialogFooter className="no-print gap-2 border-t px-6 py-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              إغلاق
            </Button>

            <Button
              variant="outline"
              onClick={printOnlyReport}
            >
              <Printer className="size-4" />
              طباعة A4
            </Button>

            <Button onClick={exportPdf} disabled={busy}>
              <FileDown className="size-4" />
              {busy
                ? "جارٍ تجهيز PDF..."
                : "تصدير PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`
        .official-report-sheet {
          width: 210mm;
          min-height: 297mm;
          box-sizing: border-box;
          padding: 12mm 14mm;
          font-family: Arial, "Tahoma", sans-serif;
          direction: rtl;
        }

        .program-report-title {
          text-align: center;
          margin: 12mm 0 7mm;
        }

        .program-report-title h2 {
          margin: 0;
          font-size: 19px;
          font-weight: 800;
        }

        .program-report-title p {
          margin-top: 4px;
          font-size: 11px;
          color: #555;
        }

        .program-status-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 8mm;
        }

        .program-status-row > div {
          border: 1px solid #d1d5db;
          padding: 8px;
          text-align: center;
          border-radius: 6px;
        }

        .program-status-row span {
          display: block;
          font-size: 10px;
          color: #666;
          margin-bottom: 4px;
        }

        .program-status-row strong {
          display: block;
          font-size: 13px;
        }

        .report-section {
          margin-top: 7mm;
        }

        .report-section h3 {
          margin: 0;
          padding: 7px 9px;
          border: 1px solid #cbd5e1;
          background: #f1f5f9;
          font-size: 13px;
          font-weight: 800;
        }

        .report-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }

        .report-table th,
        .report-table td {
          border: 1px solid #cbd5e1;
          padding: 8px;
          vertical-align: top;
        }

        .report-table th {
          width: 32%;
          background: #f8fafc;
          font-weight: 700;
        }

        .report-long-text {
          border: 1px solid #cbd5e1;
          border-top: 0;
          padding: 10px;
          white-space: pre-wrap;
          line-height: 1.9;
          font-size: 11px;
          min-height: 45px;
        }

        .evidence-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }

        .evidence-heading h3 {
          border: 0;
          background: transparent;
          padding: 0;
        }

        .evidence-heading p {
          margin: 4px 0 0;
          font-size: 9px;
          color: #666;
        }

        .evidence-count {
          border: 1px solid #cbd5e1;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 10px;
          white-space: nowrap;
        }

        .evidence-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8mm;
          margin-top: 6mm;
        }

        .evidence-card {
          border: 1px solid #cbd5e1;
          padding: 5mm;
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .evidence-card-header {
          display: flex;
          flex-direction: column;
          gap: 3px;
          margin-bottom: 4mm;
          font-size: 10px;
        }

        .evidence-card-header span {
          color: #555;
          word-break: break-word;
        }

        .evidence-image {
          display: block;
          width: 100%;
          height: 85mm;
          object-fit: contain;
          background: #fff;
          border: 1px solid #e2e8f0;
        }

        .evidence-file {
          height: 55mm;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px dashed #cbd5e1;
          background: #f8fafc;
          text-align: center;
          font-size: 11px;
        }

        .empty-evidence {
          border: 1px dashed #cbd5e1;
          padding: 15mm;
          margin-top: 4mm;
          text-align: center;
          font-size: 11px;
          color: #666;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }

          html,
          body {
            width: 210mm;
            min-height: 297mm;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          body * {
            visibility: hidden;
          }

          .print-dialog,
          .print-dialog * {
            visibility: visible;
          }

          .print-dialog {
            position: absolute !important;
            inset: 0 !important;
            width: 210mm !important;
            max-width: none !important;
            max-height: none !important;
            overflow: visible !important;
            border: 0 !important;
            box-shadow: none !important;
            background: white !important;
          }

          .print-scroll-container {
            padding: 0 !important;
            overflow: visible !important;
          }

          .official-report-sheet {
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 12mm 14mm !important;
            border: 0 !important;
            box-shadow: none !important;
          }

          .no-print {
            display: none !important;
          }

          .report-section,
          .evidence-card {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .evidence-image {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </>
  );
}
