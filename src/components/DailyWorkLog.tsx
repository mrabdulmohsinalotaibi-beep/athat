import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BookOpenCheck, CalendarDays, ClipboardPenLine, Loader2, Save } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const today = () => new Date().toISOString().slice(0, 10);

type DailyPayload = {
  interviews: string;
  cases: string;
  communications: string;
  referrals: string;
  activities: string;
  notes: string;
};

const EMPTY: DailyPayload = {
  interviews: "0",
  cases: "0",
  communications: "0",
  referrals: "0",
  activities: "0",
  notes: "",
};

export function DailyWorkLog() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(today());
  const [payload, setPayload] = useState<DailyPayload>(EMPTY);
  const [saving, setSaving] = useState(false);
  const { data: recent = [], isLoading } = useQuery({
    queryKey: ["daily-work-log"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("reports")
        .select("id, report_date, summary, created_at")
        .eq("report_type", "سجل يومي")
        .order("report_date", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; report_date: string | null; summary: string | null }>;
    },
  });

  function update(key: keyof DailyPayload, value: string) {
    setPayload((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    const summary = JSON.stringify({
      ...payload,
      interviews: Number(payload.interviews) || 0,
      cases: Number(payload.cases) || 0,
      communications: Number(payload.communications) || 0,
      referrals: Number(payload.referrals) || 0,
      activities: Number(payload.activities) || 0,
    });
    const { error } = await (supabase as any).from("reports").insert({
      report_type: "سجل يومي",
      report_date: date,
      report_no: `DAILY-${date}`,
      period: "يومي",
      prepared_by: "الموجه الطلابي",
      status: "مسودة",
      summary,
    });
    setSaving(false);
    if (error) {
      toast.error(`تعذّر حفظ السجل اليومي: ${error.message}`);
      return;
    }
    setPayload(EMPTY);
    await queryClient.invalidateQueries({ queryKey: ["daily-work-log"] });
    toast.success("تم حفظ سجل العمل اليومي");
  }

  return (
    <section className="dashboard-panel rounded-3xl border border-primary/12 bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">
            <ClipboardPenLine className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-black">سجل العمل اليومي</h2>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              وثّقي إنجازات اليوم في أقل من دقيقة، واحتفظي بسجل مرتب للمتابعة والتقارير.
            </p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary">
          <BookOpenCheck className="size-3.5" /> توثيق سريع
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs font-bold">
          التاريخ
          <div className="relative mt-1.5">
            <CalendarDays className="pointer-events-none absolute right-3 top-2.5 size-4 text-muted-foreground" />
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="pr-9" />
          </div>
        </label>
        {[
          ["interviews", "المقابلات"],
          ["cases", "الحالات الجديدة"],
          ["communications", "التواصل"],
          ["referrals", "الإحالات"],
          ["activities", "الأنشطة"],
        ].map(([key, label]) => (
          <label key={key} className="text-xs font-bold">
            {label}
            <Input
              type="number"
              min="0"
              inputMode="numeric"
              value={payload[key as keyof DailyPayload]}
              onChange={(event) => update(key as keyof DailyPayload, event.target.value)}
              className="mt-1.5"
            />
          </label>
        ))}
      </div>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 text-xs font-bold">
          أبرز الملاحظات أو الإجراءات المنفذة
          <Textarea
            value={payload.notes}
            onChange={(event) => update("notes", event.target.value)}
            rows={2}
            placeholder="مثال: تمت متابعة حالتين والتواصل مع ولي أمر طالب..."
            className="mt-1.5"
          />
        </label>
        <Button type="button" onClick={() => void save()} disabled={saving || !date} className="gap-2 sm:mb-0.5">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          حفظ سجل اليوم
        </Button>
      </div>

      <div className="mt-5 border-t pt-4">
        <p className="mb-2 text-xs font-black">آخر السجلات المحفوظة</p>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">جارٍ التحميل...</p>
        ) : recent.length === 0 ? (
          <p className="text-xs text-muted-foreground">سيظهر سجل اليوم هنا بعد أول عملية حفظ.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {recent.map((item) => (
              <span key={item.id} className="rounded-xl border bg-background/70 px-3 py-2 text-[11px] font-semibold">
                {item.report_date || "بدون تاريخ"}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
