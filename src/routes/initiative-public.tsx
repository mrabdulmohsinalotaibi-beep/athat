import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, ShieldCheck, UsersRound } from "lucide-react";

import { BrandLogo } from "@/components/BrandLogo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/initiative-public")({
  validateSearch: (search: Record<string, unknown>): { view?: string } =>
    typeof search["view"] === "string" ? { view: search["view"] } : {},
  head: () => ({
    meta: [
      { title: "مبادرة مدرسية | الذات" },
      { name: "description", content: "صفحة عرض عامة لمبادرة مدرسية." },
    ],
  }),
  component: InitiativePublicPage,
});

type PublicView = {
  valid: boolean;
  school?: { name?: string; education_dept?: string | null; education_office?: string | null };
  initiative?: {
    title: string;
    slogan?: string | null;
    idea?: string | null;
    general_goal?: string | null;
    objectives?: string[];
    mechanism?: string[];
    expected_results?: string[];
    success_indicators?: string | null;
    status?: string;
  };
  team?: Array<{ display_name: string; role_title: string }>;
  stats?: { members: number; students: number; entries: number; evidences: number; avg_progress: number };
};

function InitiativePublicPage() {
  const { view = "" } = Route.useSearch();
  const query = useQuery({
    queryKey: ["public-initiative-view", view],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_public_initiative_view", { p_token: view.trim() });
      if (error) throw error;
      return (data ?? { valid: false }) as PublicView;
    },
    enabled: Boolean(view.trim()),
    staleTime: 30_000,
  });

  const data = query.data;
  if (!view.trim() || query.isError || (!query.isLoading && !data?.valid)) {
    return <div dir="rtl" className="min-h-screen bg-background p-6"><div className="mx-auto max-w-xl rounded-3xl border bg-card p-8 text-center"><ShieldCheck className="mx-auto size-10 text-muted-foreground" /><h1 className="mt-3 text-xl font-black">صفحة المبادرة غير متاحة</h1><p className="mt-2 text-sm text-muted-foreground">الرابط غير صالح أو تم إيقافه.</p></div></div>;
  }

  if (query.isLoading || !data?.initiative) {
    return <div dir="rtl" className="min-h-screen bg-background p-6"><div className="mx-auto max-w-xl rounded-3xl border bg-card p-8 text-center">جارٍ تحميل المبادرة...</div></div>;
  }

  const stats = data.stats ?? { members: 0, students: 0, entries: 0, evidences: 0, avg_progress: 0 };

  return (
    <div dir="rtl" className="min-h-screen bg-background px-3 py-5 sm:px-5">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-3xl border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3">
            <div className="grid size-16 place-items-center overflow-hidden rounded-2xl border"><BrandLogo className="size-full" /></div>
            <div>
              <p className="text-xs font-black text-primary">الذات | مبادرة مدرسية</p>
              <h1 className="mt-1 text-2xl font-black">{data.initiative.title}</h1>
              {data.initiative.slogan && <p className="mt-1 font-bold text-primary">{data.initiative.slogan}</p>}
              <p className="mt-2 text-xs text-muted-foreground">{data.school?.name || "المدرسة"}</p>
            </div>
          </div>
        </header>

        <section className="rounded-3xl border bg-card p-5">
          <h2 className="text-lg font-black">عن المبادرة</h2>
          {data.initiative.idea && <p className="mt-3 text-sm leading-8 text-muted-foreground">{data.initiative.idea}</p>}
          {data.initiative.general_goal && <div className="mt-4 rounded-2xl bg-muted/20 p-4"><p className="text-xs font-black">الهدف العام</p><p className="mt-2 text-sm leading-7">{data.initiative.general_goal}</p></div>}
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[["الأعضاء",stats.members],["الطلاب المشمولون",stats.students],["السجلات",stats.entries],["الشواهد",stats.evidences],["متوسط الإنجاز",`${stats.avg_progress}%`]].map(([label,value]) =>
            <div key={String(label)} className="rounded-2xl border bg-card p-4 text-center"><p className="text-2xl font-black text-primary">{value as any}</p><p className="mt-1 text-[10px] font-bold text-muted-foreground">{label}</p></div>
          )}
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Info title="الأهداف" items={data.initiative.objectives ?? []} />
          <Info title="آلية التنفيذ" items={data.initiative.mechanism ?? []} />
          <Info title="النتائج المرجوة" items={data.initiative.expected_results ?? []} />
        </section>

        {data.initiative.success_indicators && <section className="rounded-3xl border bg-card p-5"><div className="flex items-center gap-2"><BarChart3 className="size-5 text-primary" /><h2 className="font-black">مؤشرات قياس النجاح</h2></div><p className="mt-3 text-sm leading-8 text-muted-foreground">{data.initiative.success_indicators}</p></section>}

        <section className="rounded-3xl border bg-card p-5">
          <div className="flex items-center gap-2"><UsersRound className="size-5 text-primary" /><h2 className="font-black">القائمون على المبادرة</h2></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {(data.team ?? []).map((m,idx)=><div key={idx} className="rounded-2xl border p-3"><p className="text-sm font-black">{m.display_name}</p><p className="mt-1 text-xs text-primary">{m.role_title}</p></div>)}
          </div>
        </section>
      </div>
    </div>
  );
}

function Info({ title, items }: { title: string; items: string[] }) {
  return <section className="rounded-3xl border bg-card p-5"><h2 className="font-black">{title}</h2><div className="mt-3 space-y-2">{items.length ? items.map((item,i)=><div key={i} className="rounded-xl border px-3 py-2 text-xs leading-6">{item}</div>) : <p className="text-xs text-muted-foreground">لا توجد بيانات.</p>}</div></section>;
}
