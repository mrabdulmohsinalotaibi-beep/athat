import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, BarChart3, ClipboardList, FileCheck2, FolderOpen, Settings, Target, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/initiative-detail")({
  validateSearch: (search: Record<string, unknown>) => ({ initiative: String(search.initiative ?? "") }),
  head: () => ({ meta: [{ title: "ملف المبادرة | الذات" }, { name: "description", content: "صفحة مستقلة لإدارة المبادرة وفريقها وطلابها وأعمالها وشواهدها." }] }),
  component: InitiativeDetailPage,
});

function InitiativeDetailPage() {
  const { initiative: initiativeId } = Route.useSearch();
  const [tab, setTab] = useState<"overview"|"team"|"students"|"work"|"evidence"|"reports"|"settings">("overview");
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
  const studentsQuery = useQuery({
    queryKey: ["initiative-detail-students", initiativeId],
    queryFn: async () => {
      const rpc = item?.is_manager ? "get_initiative_students" : "get_my_initiative_student_group";
      const { data, error } = await (supabase as any).rpc(rpc, { p_initiative_id: initiativeId });
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(initiativeId && item),
  });
  const dashboardQuery = useQuery({
    queryKey: ["initiative-detail-dashboard", initiativeId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_initiative_dashboard", { p_initiative_id: initiativeId });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(initiativeId && item?.can_view_dashboard),
  });

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

    <nav className="flex gap-2 overflow-x-auto rounded-2xl border bg-card p-2">
      {[
        ["overview","نظرة عامة"],["team","الفريق"],["students","الطلاب"],["work","الأعمال والمتابعة"],["evidence","الشواهد"],["reports","التقارير"],["settings","الإعدادات والروابط"],
      ].map(([key,label])=><Button key={key} size="sm" variant={tab===key?"default":"ghost"} className="shrink-0" onClick={()=>setTab(key as any)}>{label}</Button>)}
    </nav>

    {tab==="overview" && <section className="grid gap-4 lg:grid-cols-3">
      <Info title="الهدف العام" text={item.general_goal}/><ListInfo title="الأهداف" items={item.objectives}/><ListInfo title="آلية التنفيذ" items={item.mechanism}/><ListInfo title="النتائج المرجوة" items={item.expected_results}/><Info title="مؤشرات النجاح" text={item.success_indicators}/>
      <section className="rounded-2xl border bg-card p-4"><h2 className="font-black">حالة المبادرة</h2><p className="mt-2 text-xs text-muted-foreground">{item.status || "نشطة"} · {item.latest_progress||0}% إنجاز</p></section>
    </section>}

    {tab==="team" && <section className="rounded-3xl border bg-card p-5"><div className="flex items-center justify-between gap-2"><h2 className="font-black">فريق المبادرة</h2>{item.is_manager&&<Button size="sm" variant="outline" onClick={()=>{window.location.href=`/initiative-teams?initiative=${encodeURIComponent(item.id)}&manage=1`;}}>إدارة الفريق</Button>}</div><div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{(item.members??[]).map((m:any)=><article key={m.id} className="rounded-2xl border p-3"><p className="text-sm font-black">{m.display_name}</p><p className="text-[10px] text-primary">{m.role_title}</p><p className="mt-2 text-[10px] text-muted-foreground">{m.status==="active"?"فعال":m.status}</p>{m.assigned_tasks?.length>0&&<div className="mt-2 flex flex-wrap gap-1">{m.assigned_tasks.map((x:string)=><span key={x} className="rounded-full bg-muted px-2 py-1 text-[9px]">{x}</span>)}</div>}</article>)}</div></section>}

    {tab==="students" && <section className="rounded-3xl border bg-card p-5"><div className="flex items-center justify-between gap-2"><h2 className="font-black">طلاب المبادرة</h2><span className="text-xs text-muted-foreground">{(studentsQuery.data??[]).length} طالب</span></div><div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{(studentsQuery.data??[]).map((s:any)=><article key={s.id||s.student_id} className="rounded-2xl border p-3"><p className="text-sm font-black">{s.full_name}</p><p className="mt-1 text-[10px] text-muted-foreground">{[s.stage,s.grade,s.classroom].filter(Boolean).join(" · ")}</p>{s.assigned_member_name&&<p className="mt-2 text-[10px] text-primary">المعلم: {s.assigned_member_name}</p>}</article>)}</div>{item.is_manager&&<Button className="mt-4" variant="outline" onClick={()=>{window.location.href=`/initiative-teams?initiative=${encodeURIComponent(item.id)}&manage=1`;}}>توزيع الطلاب على المعلمين</Button>}</section>}

    {tab==="work" && <section className="rounded-3xl border bg-card p-5"><div className="flex items-center justify-between gap-2"><h2 className="font-black">الأعمال والمتابعة</h2>{item.my_membership?.status==="active"&&<Button size="sm" onClick={()=>{window.location.href=`/initiative-member-work?initiative=${encodeURIComponent(item.id)}`;}}>إضافة عمل أو متابعة</Button>}</div><div className="mt-3 space-y-2">{(item.updates??[]).map((u:any)=><article key={u.id} className="rounded-2xl border p-3"><div className="flex justify-between gap-2"><p className="text-sm font-black">{u.title}</p><span className="text-xs font-black text-primary">{u.progress_percent??"—"}%</span></div>{u.details&&<p className="mt-2 text-xs leading-6 text-muted-foreground">{u.details}</p>}<p className="mt-2 text-[10px] text-muted-foreground">{u.created_by_name}</p></article>)}</div></section>}

    {tab==="evidence" && <section className="rounded-3xl border bg-card p-5"><div className="flex items-center gap-2"><FolderOpen className="size-5 text-primary"/><h2 className="font-black">شواهد المبادرة</h2></div><p className="mt-2 text-xs leading-6 text-muted-foreground">تجمع هنا الصور والملفات والشواهد المرفوعة من أعمال أعضاء المبادرة، وتظهر للمدير حسب صلاحياته.</p>{item.my_membership?.status==="active"&&<Button className="mt-4" onClick={()=>{window.location.href=`/initiative-member-work?initiative=${encodeURIComponent(item.id)}`;}}>رفع شاهد من مساحة عملي</Button>}</section>}

    {tab==="reports" && <section className="rounded-3xl border bg-card p-5"><div className="flex items-center justify-between gap-2"><div><h2 className="font-black">تقارير المبادرة</h2><p className="mt-1 text-xs text-muted-foreground">ملخص الأداء والطلاب والمتابعات والشواهد.</p></div>{item.can_view_dashboard&&<Button variant="outline" onClick={()=>{window.location.href=`/initiative-dashboard?initiative=${encodeURIComponent(item.id)}`;}}>فتح التقرير التنفيذي</Button>}</div>{dashboardQuery.data&&<div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4"><Stat icon={UsersRound} label="الأعضاء" value={(dashboardQuery.data as any).members_total||0}/><Stat icon={Target} label="الطلاب" value={(dashboardQuery.data as any).students_total||0}/><Stat icon={ClipboardList} label="المتابعات" value={(dashboardQuery.data as any).followups_total||0}/><Stat icon={FileCheck2} label="الشواهد" value={(dashboardQuery.data as any).files_total||0}/></div>}</section>}

    {tab==="settings" && <section className="rounded-3xl border bg-card p-5"><div className="flex items-center gap-2"><Settings className="size-5 text-primary"/><h2 className="font-black">الإعدادات والروابط</h2></div><p className="mt-2 text-xs leading-6 text-muted-foreground">{item.is_manager?"هذه المنطقة لمدير المبادرة: إدارة الأعضاء والتوزيع والروابط العامة وإعدادات المبادرة.":"إعدادات الإدارة والروابط متاحة لمدير المبادرة فقط."}</p>{item.is_manager&&<Button className="mt-4" variant="outline" onClick={()=>{window.location.href=`/initiative-teams?initiative=${encodeURIComponent(item.id)}&manage=1`;}}>فتح أدوات الإدارة</Button>}</section>}

  </div>;
}
function Stat({icon:Icon,label,value}:{icon:any;label:string;value:any}){return <div className="rounded-2xl border bg-card p-4"><Icon className="size-4 text-primary"/><strong className="mt-2 block text-xl">{value}</strong><span className="text-[10px] text-muted-foreground">{label}</span></div>}
function Info({title,text}:{title:string;text?:string|null}){return <section className="rounded-2xl border bg-card p-4"><h2 className="font-black">{title}</h2><p className="mt-2 text-xs leading-6 text-muted-foreground">{text||"لم يضف بعد."}</p></section>}
function ListInfo({title,items}:{title:string;items?:string[]}){return <section className="rounded-2xl border bg-card p-4"><h2 className="font-black">{title}</h2><ul className="mt-2 space-y-1 text-xs leading-6 text-muted-foreground">{(items??[]).length?(items??[]).map((x,i)=><li key={i}>• {x}</li>):<li>لم يضف بعد.</li>}</ul></section>}
