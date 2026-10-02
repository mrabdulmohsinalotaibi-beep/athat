import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, ClipboardList, FileText, Plus, UsersRound } from "lucide-react";

import { RecordPage } from "@/components/RecordPage";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { recordByKey } from "@/lib/records";

export const Route = createFileRoute("/_authenticated/committees")({
  head: () => ({
    meta: [
      { title: "اللجان والاجتماعات | الذات" },
      { name: "description", content: "محاضر لجنة التوجيه الطلابي والقرارات والتوصيات." },
      { property: "og:title", content: "اللجان والاجتماعات | الذات" },
      { property: "og:description", content: "محاضر لجنة التوجيه الطلابي والقرارات والتوصيات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CommitteesPage,
});

function CommitteesPage() {
  const { data: meetings = [], isError, refetch } = useQuery({
    queryKey: ["committees-mobile-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("committees")
        .select("id,mdate,meeting_type,topic,decisions,responsible,due_date")
        .order("mdate", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);
  const monthMeetings = meetings.filter((row) => String(row.mdate ?? "").slice(0, 7) === thisMonth);
  const withDecisions = meetings.filter((row) => String(row.decisions ?? "").trim());
  const dueActions = meetings.filter((row) => {
    const due = String(row.due_date ?? "").slice(0, 10);
    return due && due <= today && String(row.decisions ?? "").trim();
  });

  return (
    <div className="reference-screen space-y-4" dir="rtl">
      <section className="reference-hero relative overflow-hidden rounded-3xl border border-primary/15 bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5">
        <div aria-hidden="true" className="pointer-events-none absolute -left-10 -top-14 size-40 rounded-full bg-primary/8 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1 text-[10px] font-black text-primary">
              الاجتماعات والقرارات
            </span>
            <h1 className="mt-2 text-2xl font-black text-navy">اللجان والاجتماعات</h1>
            <p className="mt-1 max-w-2xl text-xs leading-6 text-muted-foreground">
              وثّق الاجتماع والقرارات، حدّد المسؤول وموعد التنفيذ، وارجع للمحضر الرسمي من نفس الصفحة.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <a href="/committees?new=1"><Plus className="size-4" /> اجتماع جديد</a>
            </Button>
            <Button asChild variant="outline">
              <Link to="/school-tasks"><ClipboardList className="size-4" /> المهام</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/reports"><FileText className="size-4" /> التقارير</Link>
            </Button>
          </div>
        </div>
      </section>

      {isError && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-900">
          <span>تعذّر تحميل ملخص الاجتماعات، لكن السجل ما زال متاحًا.</span>
          <Button type="button" size="sm" variant="ghost" onClick={() => void refetch()}>إعادة المحاولة</Button>
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MeetingStat title="إجمالي الاجتماعات" value={meetings.length} icon={<UsersRound className="size-4" />} />
        <MeetingStat title="هذا الشهر" value={monthMeetings.length} icon={<CalendarClock className="size-4" />} />
        <MeetingStat title="بقرارات موثقة" value={withDecisions.length} icon={<CheckCircle2 className="size-4" />} />
        <MeetingStat title="إجراءات مستحقة" value={dueActions.length} icon={<ClipboardList className="size-4" />} />
      </section>

      {dueActions.length > 0 && (
        <section className="rounded-3xl border bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="mb-3">
            <h2 className="text-sm font-black">قرارات تحتاج متابعة</h2>
            <p className="mt-1 text-[10px] text-muted-foreground">أقرب البنود التي وصل موعد تنفيذها.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {dueActions.slice(0, 6).map((row) => (
              <article key={row.id} className="rounded-2xl border bg-background/80 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">{row.topic || row.meeting_type || "اجتماع"}</p>
                    <p className="mt-1 truncate text-[10px] text-muted-foreground">{row.responsible || "لم يحدد المسؤول"}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[9px] font-black text-primary">
                    {row.due_date || "—"}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-muted-foreground">{row.decisions || "—"}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <RecordPage config={recordByKey("committees")} />
    </div>
  );
}

function MeetingStat({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</span>
        <strong className="text-2xl font-black">{value}</strong>
      </div>
      <p className="mt-3 text-[11px] font-black">{title}</p>
    </div>
  );
}
