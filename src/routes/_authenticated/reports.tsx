import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileDown, Printer } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/lib/school";
import { RECORDS, recordByKey } from "@/lib/records";
import { elementToPdf } from "@/lib/pdf";
import { computeKpis, isPercentKpi } from "@/lib/kpi";
import { OfficialFooter, OfficialHeader } from "@/components/OfficialHeader";
import { AiDraftAssistant } from "@/components/AiDraftAssistant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "التقارير والطباعة | منصة ذات" },
      { name: "description", content: "إعداد التقارير الرسمية وطباعتها أو تصديرها PDF بترويسة وزارية وتوقيع رسمي." },
      { property: "og:title", content: "التقارير والطباعة | منصة ذات" },
      { property: "og:description", content: "تقارير مفردة أو مجمعة جاهزة للطباعة الرسمية لأعمال الموجه الطلابي." },
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

function useSectionRows(keys: string[], from: string, to: string) {
  return useQuery({
    queryKey: ["report", keys.join(","), from, to],
    queryFn: async () => {
      const out: Record<string, Record<string, unknown>[]> = {};
      for (const key of keys) {
        const config = recordByKey(key);
        const dateField = DATE_FIELD[key];
        let query = supabase.from(config.table as never).select("*");
        if (dateField && from) query = query.gte(dateField, from);
        if (dateField && to) query = query.lte(dateField, to);
        const { data, error } = await query;
        if (error) throw error;
        out[key] = (data ?? []) as unknown as Record<string, unknown>[];
      }
      return out;
    },
  });
}

function useKpiData() {
  return useQuery({
    queryKey: ["report-kpis"],
    queryFn: async () => {
      const [planTasks, cases, attendance, interviews, students] = await Promise.all([
        supabase.from("plan_tasks").select("exec_status"),
        supabase.from("counseling_cases").select("case_status, last_followup, followup_at"),
        supabase.from("attendance").select("case_type, count_days"),
        supabase.from("interviews").select("itype"),
        supabase.from("students").select("id"),
      ]);
      return computeKpis({
        planTasks: planTasks.data ?? [],
        cases: cases.data ?? [],
        attendance: attendance.data ?? [],
        interviews: interviews.data ?? [],
        students: students.data ?? [],
      });
    },
  });
}

function ReportsPage() {
  const { data: school } = useSchool();
  const [selected, setSelected] = useState<string[]>(["cases"]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [withKpis, setWithKpis] = useState(true);
  const [aiNarrative, setAiNarrative] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  const { data: sections, isLoading } = useSectionRows(selected, from, to);
  const { data: kpis = [] } = useKpiData();

  const merged = selected.length > 1;
  const title = merged
    ? "تقرير مجمّع لأعمال التوجيه الطلابي"
    : `${recordByKey(selected[0] ?? "cases").title} — تقرير رسمي`;
  const fileName = merged ? "تقرير_مجمع" : recordByKey(selected[0] ?? "cases").title;
  const period = from || to ? `${from || "—"} إلى ${to || "—"}` : "كامل العام الدراسي";

  function toggle(key: string) {
    setSelected((current) =>
      current.includes(key)
        ? current.length > 1
          ? current.filter((k) => k !== key)
          : current
        : [...current, key],
    );
  }

  return (
    <div className="space-y-5">
      <div className="no-print">
        <h1 className="text-2xl font-extrabold">التقارير والطباعة</h1>
        <p className="text-sm text-muted-foreground">
          اختر سجلاً واحداً لتقرير منفرد، أو عدّة سجلات لدمجها في تقرير شامل، ثم اطبعه أو صدّره PDF بجودة عالية.
        </p>
      </div>

      <div className="no-print space-y-4 rounded-xl border bg-card p-4 shadow-sm">
        <div>
          <Label className="mb-2 block text-xs">السجلات المضمّنة في التقرير</Label>
          <div className="flex flex-wrap gap-2">
            {RECORDS.map((r) => (
              <Button
                key={r.key}
                type="button"
                variant={selected.includes(r.key) ? "default" : "outline"}
                size="sm"
                onClick={() => toggle(r.key)}
                className="rounded-full"
              >
                {r.title}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="mb-1.5 block text-xs">من تاريخ</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">إلى تاريخ</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 pb-2 text-xs">
            <input type="checkbox" checked={withKpis} onChange={(e) => setWithKpis(e.target.checked)} />
            تضمين مؤشرات الأداء
          </label>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" /> طباعة فورية
          </Button>
          <Button onClick={() => printRef.current && elementToPdf(printRef.current, fileName)}>
            <FileDown className="size-4" /> تصدير PDF
          </Button>
        </div>

        <AiDraftAssistant
          recordKey="reports"
          context={{
            report_type: title,
            period,
            included_records: selected.map((key) => recordByKey(key).title).join("، "),
          }}
          onDraft={(draft) =>
            setAiNarrative(
              `ملخص التقرير:\n${draft.summary}\n\nالأهداف:\n${draft.goals}\n\nمنهجية العمل والتدخل:\n${draft.interventionPlan}\n\nالنتائج:\n${draft.result}\n\nالتوصيات:\n${draft.recommendations}\n\nالإجراء القادم:\n${draft.nextAction}`,
            )
          }
        />
      </div>

      <div ref={printRef} className="print-area rounded-xl border bg-card p-6 shadow-sm">
        <OfficialHeader
          school={school}
          title={title}
          reportType={merged ? "تقرير مجمّع" : "تقرير سجل"}
          period={period}
        />

        {aiNarrative && (
          <section className="mt-6 rounded-lg border bg-muted/30 p-4 text-sm leading-7">
            <h3 className="mb-2 font-extrabold">الصياغة المهنية للتقرير</h3>
            <Textarea
              value={aiNarrative}
              onChange={(event) => setAiNarrative(event.target.value)}
              rows={12}
              className="border-0 bg-transparent leading-7 shadow-none focus-visible:ring-0"
            />
          </section>
        )}

        {withKpis && kpis.length > 0 && (
          <section className="mt-6">
            <h3 className="mb-3 text-sm font-extrabold">مؤشرات أداء التوجيه الطلابي</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {kpis.map((k) => (
                <div key={k.key} className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className="mt-1 text-2xl font-extrabold text-primary">
                    {k.value}
                    {isPercentKpi(k.key) ? "%" : ""}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{k.hint}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {selected.map((key) => {
          const config = recordByKey(key);
          const columns = config.fields.filter((f) => f.list).slice(0, 7);
          const rows = sections?.[key] ?? [];
          return (
            <section key={key} className="mt-7 break-inside-avoid">
              <h3 className="mb-2 text-sm font-extrabold">
                {config.title} <span className="text-xs font-normal text-muted-foreground">({rows.length} سجل)</span>
              </h3>
              <table className="w-full border-collapse text-right text-xs">
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
            </section>
          );
        })}

        <OfficialFooter school={school} />
      </div>
    </div>
  );
}
