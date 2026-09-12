import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileDown, Printer } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/lib/school";
import { RECORDS, recordByKey } from "@/lib/records";
import { elementToPdf } from "@/lib/pdf";
import { OfficialFooter, OfficialHeader } from "@/components/OfficialHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "التقارير والطباعة | منصة ذات" },
      { name: "description", content: "إعداد التقارير الرسمية وطباعتها أو تصديرها PDF بترويسة وزارية وتوقيع رسمي." },
      { property: "og:title", content: "التقارير والطباعة | منصة ذات" },
      { property: "og:description", content: "تقارير جاهزة للطباعة الرسمية لأعمال الموجه الطلابي." },
    ],
  }),
  component: ReportsPage,
});

const DATE_FIELD: Record<string, string> = {
  cases: "opened_at",
  plan: "due_date",
  programs: "start_date",
  interviews: "idate",
  attendance: "adate",
  behavior: "bdate",
  referrals: "referral_date",
  committees: "mdate",
  evidences: "edate",
  calendar: "edate",
  reports: "report_date",
};

function ReportsPage() {
  const { data: school } = useSchool();
  const [recordKey, setRecordKey] = useState("cases");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  const config = recordByKey(recordKey);
  const dateField = DATE_FIELD[recordKey];

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["report", recordKey, from, to],
    queryFn: async () => {
      let query = supabase.from(config.table as never).select("*");
      if (dateField && from) query = query.gte(dateField, from);
      if (dateField && to) query = query.lte(dateField, to);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as Record<string, unknown>[];
    },
  });

  const columns = config.fields.filter((f) => f.list).slice(0, 7);
  const title = `${config.title} — تقرير رسمي`;

  return (
    <div className="space-y-5">
      <div className="no-print">
        <h1 className="text-2xl font-extrabold">التقارير والطباعة</h1>
        <p className="text-sm text-muted-foreground">
          اختر السجل والفترة، ثم اطبع التقرير أو صدّره بصيغة PDF بترويسة رسمية.
        </p>
      </div>

      <div className="no-print flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <div>
          <Label className="mb-1.5 block text-xs">السجل</Label>
          <select
            value={recordKey}
            onChange={(e) => setRecordKey(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {RECORDS.map((r) => (
              <option key={r.key} value={r.key}>
                {r.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">من تاريخ</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} disabled={!dateField} />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">إلى تاريخ</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} disabled={!dateField} />
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="size-4" /> طباعة
        </Button>
        <Button onClick={() => printRef.current && elementToPdf(printRef.current, config.title)}>
          <FileDown className="size-4" /> تصدير PDF
        </Button>
      </div>

      <div ref={printRef} className="print-area rounded-xl border bg-card p-6 shadow-sm">
        <OfficialHeader school={school} title={title} />
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {from || to ? `الفترة: ${from || "—"} إلى ${to || "—"}` : "جميع السجلات"} · عدد السجلات: {rows.length}
        </p>

        <table className="mt-5 w-full border-collapse text-right text-xs">
          <thead>
            <tr className="bg-secondary">
              {columns.map((f) => (
                <th key={f.name} className="border p-2 font-bold">
                  {f.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={columns.length} className="border p-4 text-center">
                  جارٍ التحميل...
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="border p-4 text-center text-muted-foreground">
                  لا توجد سجلات ضمن الفترة المحددة.
                </td>
              </tr>
            )}
            {rows.map((row, index) => (
              <tr key={String(row["id"] ?? index)}>
                {columns.map((f) => (
                  <td key={f.name} className="border p-2 align-top">
                    {String(row[f.name] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <OfficialFooter school={school} />
      </div>
    </div>
  );
}
