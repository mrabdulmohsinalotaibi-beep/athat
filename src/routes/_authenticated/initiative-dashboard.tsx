import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BarChart3, ClipboardList, FileText, RefreshCw, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/initiative-dashboard")({
  validateSearch: (search: Record<string, unknown>): { initiative?: string } =>
    typeof search["initiative"] === "string" ? { initiative: search["initiative"] } : {},
  head: () => ({
    meta: [
      { title: "لوحة المبادرة | الذات" },
      { name: "description", content: "لوحة تنفيذية شاملة لمتابعة المبادرة وأعضائها وإنجازها وشواهدها." },
    ],
  }),
  component: InitiativeDashboardPage,
});

type Initiative = {
  id: string;
  title: string;
  slogan?: string | null;
  general_goal?: string | null;
  can_view_dashboard?: boolean;
};

type Dashboard = {
  members_total: number;
  students_total: number;
  followups_total: number;
  public_entries_total: number;
  files_total: number;
  avg_progress: number;
  members: Array<{
    id: string;
    display_name: string;
    role_title: string;
    student_count: number;
    entry_count: number;
    file_count: number;
    last_activity?: string | null;
    public_link_active: boolean;
    public_link_expires_at?: string | null;
  }>;
  recent_entries: Array<{
    id: string;
    member_name: string;
    role_title: string;
    entry_type: string;
    title: string;
    details?: string | null;
    progress_percent?: number | null;
    student_name?: string | null;
    created_at: string;
    updated_at: string;
    files_count: number;
  }>;
};

function InitiativeDashboardPage() {
  const { initiative = "" } = Route.useSearch();

  const initiativesQuery = useQuery({
    queryKey: ["initiative-teams"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_my_initiatives");
      if (error) throw error;
      return (data ?? []) as Initiative[];
    },
    staleTime: 15_000,
  });

  const selected = (initiativesQuery.data ?? []).find((i) => i.id === initiative);

  const dashboardQuery = useQuery({
    queryKey: ["initiative-dashboard-page", initiative],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_initiative_dashboard", { p_initiative_id: initiative });
      if (error) throw error;
      return data as Dashboard;
    },
    enabled: Boolean(initiative),
    staleTime: 10_000,
  });

  if (!initiative) {
    return <div dir="rtl" className="rounded-3xl border bg-card p-8 text-center text-sm text-muted-foreground">لم يتم تحديد مبادرة.</div>;
  }

  if (initiativesQuery.isLoading || dashboardQuery.isLoading) {
    return <div dir="rtl" className="rounded-3xl border bg-card p-8 text-center text-sm text-muted-foreground">جارٍ تحميل لوحة المبادرة...</div>;
  }

  if (!selected?.can_view_dashboard || dashboardQuery.isError || !dashboardQuery.data) {
    return <div dir="rtl" className="rounded-3xl border bg-card p-8 text-center text-sm text-muted-foreground">لا تملك صلاحية عرض هذه اللوحة أو تعذر تحميل بياناتها.</div>;
  }

  const d = dashboardQuery.data;

  return (
    <div dir="rtl" className="space-y-5">
      <section className="rounded-3xl border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black text-primary">لوحة المبادرة</p>
            <h1 className="mt-1 text-2xl font-black">{selected.title}</h1>
            {selected.slogan && <p className="mt-1 font-bold text-primary">{selected.slogan}</p>}
            {selected.general_goal && <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{selected.general_goal}</p>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => history.back()}><ArrowRight className="size-4" /> رجوع</Button>
            <Button variant="outline" onClick={() => void dashboardQuery.refetch()}><RefreshCw className="size-4" /> تحديث</Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Metric icon={UsersRound} label="الأعضاء" value={d.members_total} />
        <Metric icon={UsersRound} label="الطلاب" value={d.students_total} />
        <Metric icon={ClipboardList} label="المتابعات" value={d.followups_total} />
        <Metric icon={FileText} label="السجلات" value={d.public_entries_total} />
        <Metric icon={FileText} label="الشواهد" value={d.files_total} />
        <Metric icon={BarChart3} label="متوسط الإنجاز" value={`${d.avg_progress}%`} />
      </section>

      <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <section className="rounded-3xl border bg-card p-5">
          <h2 className="font-black">أداء أعضاء المبادرة</h2>
          <div className="mt-4 space-y-2">
            {(d.members ?? []).map((m) => (
              <article key={m.id} className="rounded-2xl border p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="font-black">{m.display_name}</p><p className="mt-1 text-xs text-primary">{m.role_title}</p></div>
                  <span className="rounded-full bg-muted px-2 py-1 text-[10px]">{m.public_link_active ? "رابط العمل فعال" : "رابط العمل غير فعال"}</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]">
                  <div className="rounded-xl bg-muted/20 p-2">الطلاب<br/><strong className="text-base">{m.student_count}</strong></div>
                  <div className="rounded-xl bg-muted/20 p-2">السجلات<br/><strong className="text-base">{m.entry_count}</strong></div>
                  <div className="rounded-xl bg-muted/20 p-2">الشواهد<br/><strong className="text-base">{m.file_count}</strong></div>
                </div>
                <p className="mt-3 text-[10px] text-muted-foreground">آخر نشاط: {m.last_activity ? new Date(m.last_activity).toLocaleString("ar-SA") : "لا يوجد"}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border bg-card p-5">
          <h2 className="font-black">آخر السجلات والنشاطات</h2>
          <div className="mt-4 max-h-[700px] space-y-2 overflow-y-auto">
            {(d.recent_entries ?? []).length === 0 ? <p className="rounded-2xl border border-dashed p-5 text-center text-xs text-muted-foreground">لا توجد نشاطات مسجلة.</p> :
            (d.recent_entries ?? []).map((e) => (
              <article key={e.id} className="rounded-2xl border p-3">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="text-sm font-black">{e.title}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{e.member_name} · {e.role_title}{e.student_name ? ` · ${e.student_name}` : ""}</p>
                  </div>
                  {typeof e.progress_percent === "number" && <span className="text-sm font-black text-primary">{e.progress_percent}%</span>}
                </div>
                {e.details && <p className="mt-2 text-xs leading-6 text-muted-foreground">{e.details}</p>}
                <div className="mt-2 flex justify-between gap-2 text-[10px] text-muted-foreground"><span>{new Date(e.updated_at).toLocaleString("ar-SA")}</span><span>{e.files_count} شاهد</span></div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof UsersRound; label: string; value: string | number }) {
  return <div className="rounded-2xl border bg-card p-4 text-center"><Icon className="mx-auto size-5 text-primary" /><p className="mt-2 text-2xl font-black text-primary">{value}</p><p className="mt-1 text-[10px] font-bold text-muted-foreground">{label}</p></div>;
}
