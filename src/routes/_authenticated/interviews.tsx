import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, ClipboardList, MessageSquare, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RecordPage } from "@/components/RecordPage";
import { supabase } from "@/integrations/supabase/client";
import { recordByKey } from "@/lib/records";

export const Route = createFileRoute("/_authenticated/interviews")({
  head: () => ({
    meta: [
      { title: "الجلسات الإرشادية | الذات" },
      { name: "description", content: "الجلسات الإرشادية ومواعيد المتابعة المرتبطة بالطلاب والحالات." },
    ],
  }),
  component: InterviewsPage,
});

function InterviewsPage() {
  const { data: interviews = [] } = useQuery({
    queryKey: ["interviews-followup-hub"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interviews")
        .select("id,idate,itype,student_name,topic,followup_at,recommendations");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);
  const monthSessions = interviews.filter((row) => String(row.idate ?? "").slice(0, 7) === thisMonth);
  const dueFollowups = interviews.filter((row) => {
    const date = String(row.followup_at ?? "").slice(0, 10);
    return date && date <= today;
  });
  const upcoming = interviews
    .filter((row) => String(row.followup_at ?? "").slice(0, 10) > today)
    .sort((a, b) => String(a.followup_at).localeCompare(String(b.followup_at)))
    .slice(0, 5);
  const withRecommendations = interviews.filter((row) => String(row.recommendations ?? "").trim()).length;

  return (
    <div className="space-y-4" dir="rtl">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/10 bg-card p-4 shadow-sm">
        <div>
          <h1 className="text-lg font-black">الجلسات والمتابعة</h1>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            سجّل الجلسة، اربطها بالطالب، وحدد التوصيات وموعد المتابعة القادم.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline"><Link to="/calendar"><CalendarClock className="size-4" /> جدول المواعيد</Link></Button>
          <Button asChild size="sm" variant="outline"><Link to="/cases"><ClipboardList className="size-4" /> الحالات</Link></Button>
          <Button asChild size="sm" variant="outline"><Link to="/students"><Users className="size-4" /> ملفات الطلاب</Link></Button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat title="جلسات هذا الشهر" value={monthSessions.length} icon={<MessageSquare className="size-4" />} />
        <Stat title="متابعات مستحقة" value={dueFollowups.length} icon={<CalendarClock className="size-4" />} />
        <Stat title="مواعيد قادمة" value={upcoming.length} icon={<CheckCircle2 className="size-4" />} />
        <Stat title="جلسات بتوصيات" value={withRecommendations} icon={<ClipboardList className="size-4" />} />
      </section>

      {upcoming.length > 0 && (
        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-black">أقرب مواعيد المتابعة</h2>
            <Link to="/calendar" className="text-xs font-bold text-primary">عرض التقويم ←</Link>
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {upcoming.map((row) => (
              <div key={row.id} className="rounded-xl border p-3">
                <div className="flex items-center justify-between gap-2">
                  <strong className="truncate text-sm">{row.student_name || "طالب غير محدد"}</strong>
                  <span className="text-[11px] font-bold text-primary">{String(row.followup_at)}</span>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">{row.topic || row.itype || "جلسة إرشادية"}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <RecordPage config={recordByKey("interviews")} />
    </div>
  );
}

function Stat({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="rounded-xl bg-primary/10 p-2 text-primary">{icon}</span>
        <strong className="text-2xl">{value}</strong>
      </div>
      <p className="mt-3 text-xs font-black">{title}</p>
    </div>
  );
}
