import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BarChart3, ClipboardList, FileCheck2, Target, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/initiative-detail")({
  validateSearch: (search: Record<string, unknown>) => ({ initiative: String(search.initiative ?? "") }),
  head: () => ({ meta: [{ title: "ملف المبادرة | الذات" }, { name: "description", content: "صفحة مستقلة لإدارة المبادرة وفريقها وطلابها وأعمالها وشواهدها." }] }),
  component: InitiativeDetailPage,
});

function InitiativeDetailPage() {
  const { initiative: initiativeId } = Route.useSearch();
  const query = useQuery({
    queryKey: ["initiative-detail", initiativeId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_my_initiatives");
      if (error) throw error;
      return (data ?? []).find((item: any) => String(item.id) === initiativeId) ?? null;
    },
    enabled: Boolean(initiativeId),
  });
  const item: any = query.data;

  if (query.isLoading) return <div dir="rtl" className="rounded-3xl border p-8 text-center text-sm text-muted-foreground">جارٍ تحميل ملف المبادرة...</div>;
  if (!item) return <div dir="rtl" className="space-y-4 rounded-3xl border p-8 text-center"><p className="font-black">تعذر العثور على المبادرة أو لا تملك صلاحية الوصول إليها.</p><Button variant="outline" onClick={() => { window.location.href="/initiative-teams"; }}>العودة للمبادرات</Button></div>;

  const memberCount = (item.members ?? []).filter((m:any)=>m.status==="active").length;
  return <div dir="rtl" className="space-y-5">
    <section className="rounded-3xl border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><button className="mb-3 inline-flex items-center gap-1 text-xs font-black text-primary" onClick={()=>history.back()}><ArrowRight className="size-4"/> المبادرات</button><p className="text-xs font-black text-primary">ملف المبادرة</p><h1 className="mt-1 text-2xl font-black">{item.title}</h1>{item.slogan && <p className="mt-2 font-bold text-primary">{item.slogan}</p>}</div>
        <div className="flex flex-wrap gap-2"><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">{item.latest_progress || 0}% إنجاز</span>{item.my_membership?.status==="active" && <Button size="sm" onClick={()=>{window.location.href=`/initiative-member-work?initiative=${encodeURIComponent(item.id)}`;}}>مساحة عملي</Button>}{item.can_view_dashboard && <Button size="sm" variant="outline" onClick={()=>{window.location.href=`/initiative-dashboard?initiative=${encodeURIComponent(item.id)}`;}}>الداشبورد التنفيذي</Button>}</div>
      </div>
      {item.idea && <p className="mt-4 text-sm leading-7 text-muted-foreground">{item.idea}</p>}
    </section>

    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat icon={UsersRound} label="أعضاء الفريق" value={memberCount}/>
      <Stat icon={ClipboardList} label="التحديثات" value={(item.updates??[]).length}/>
      <Stat icon={Target} label="الأهداف" value={(item.objectives??[]).length}/>
      <Stat icon={BarChart3} label="نسبة الإنجاز" value={`${item.latest_progress||0}%`}/>
    </section>

    <section className="grid gap-4 lg:grid-cols-3">
      <Info title="الهدف العام" text={item.general_goal}/>
      <ListInfo title="الأهداف" items={item.objectives}/>
      <ListInfo title="آلية التنفيذ" items={item.mechanism}/>
      <ListInfo title="النتائج المرجوة" items={item.expected_results}/>
      <Info title="مؤشرات النجاح" text={item.success_indicators}/>
      <section className="rounded-2xl border bg-card p-4"><div className="flex items-center gap-2"><FileCheck2 className="size-4 text-primary"/><h2 className="font-black">إدارة المبادرة</h2></div><p className="mt-2 text-xs leading-6 text-muted-foreground">{item.is_manager ? "أنت مدير هذه المبادرة. إدارة الفريق والطلاب والتوزيع والمتابعة متاحة من أدوات المبادرة." : "أنت عضو في هذه المبادرة وتظهر لك الأعمال والطلاب المسندون إليك فقط."}</p>{item.is_manager && <Button className="mt-3 w-full" variant="outline" onClick={()=>{window.location.href=`/initiative-teams?initiative=${encodeURIComponent(item.id)}&manage=1`;}}>إدارة الفريق والتوزيع</Button>}</section>
    </section>

    <section className="rounded-3xl border bg-card p-5">
      <h2 className="font-black">فريق المبادرة</h2>
      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{(item.members??[]).map((m:any)=><article key={m.id} className="rounded-2xl border p-3"><div className="flex items-center justify-between gap-2"><div><p className="text-sm font-black">{m.display_name}</p><p className="text-[10px] text-primary">{m.role_title}</p></div><span className="text-[10px] text-muted-foreground">{m.status==="active"?"فعال":m.status}</span></div>{m.assigned_tasks?.length>0 && <p className="mt-2 line-clamp-2 text-[10px] leading-5 text-muted-foreground">{m.assigned_tasks.join(" · ")}</p>}</article>)}</div>
    </section>

    <section className="rounded-3xl border bg-card p-5"><h2 className="font-black">آخر أعمال المبادرة</h2><div className="mt-3 space-y-2">{(item.updates??[]).slice(0,8).map((u:any)=><article key={u.id} className="rounded-2xl border p-3"><div className="flex justify-between gap-2"><p className="text-sm font-black">{u.title}</p><span className="text-xs font-black text-primary">{u.progress_percent??"—"}%</span></div>{u.details&&<p className="mt-2 text-xs leading-6 text-muted-foreground">{u.details}</p>}<p className="mt-2 text-[10px] text-muted-foreground">{u.created_by_name}</p></article>)}</div></section>
  </div>;
}
function Stat({icon:Icon,label,value}:{icon:any;label:string;value:any}){return <div className="rounded-2xl border bg-card p-4"><Icon className="size-4 text-primary"/><strong className="mt-2 block text-xl">{value}</strong><span className="text-[10px] text-muted-foreground">{label}</span></div>}
function Info({title,text}:{title:string;text?:string|null}){return <section className="rounded-2xl border bg-card p-4"><h2 className="font-black">{title}</h2><p className="mt-2 text-xs leading-6 text-muted-foreground">{text||"لم يضف بعد."}</p></section>}
function ListInfo({title,items}:{title:string;items?:string[]}){return <section className="rounded-2xl border bg-card p-4"><h2 className="font-black">{title}</h2><ul className="mt-2 space-y-1 text-xs leading-6 text-muted-foreground">{(items??[]).length?(items??[]).map((x,i)=><li key={i}>• {x}</li>):<li>لم يضف بعد.</li>}</ul></section>}
