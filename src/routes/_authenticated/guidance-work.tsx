import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, ShieldCheck, UsersRound, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route=createFileRoute("/_authenticated/guidance-work")({component:GuidanceWorkPage,head:()=>({meta:[{title:"أعمالي مع التوجيه الطلابي | الذات"}]})});

const moduleInfo:Record<string,[string,string]>={
 plan:["الخطة والبرامج","/plan"],programs:["البرامج التوجيهية","/programs"],cases:["الحالات الطلابية","/cases"],interviews:["المقابلات","/interviews"],
 consultations:["الاستشارات","/school-inbox"],attendance:["المواظبة والغياب","/attendance"],behavior:["السلوك","/behavior"],referrals:["إحالات الطلاب","/guidance-requests"],
 family:["التواصل مع الأسرة","/outgoing-messages"],initiatives:["المبادرات","/initiative-teams"],evidence:["الشواهد","/evidences"],reports:["التقارير","/reports"],
 approvals:["الاعتمادات","/guidance-work"],oversight:["الإشراف على التوجيه","/reports"],academic:["المتابعة التحصيلية","/reports"],remedial:["الخطط العلاجية","/reports"],
 teacher_referrals:["إحالات المعلمين","/guidance-requests"],observations:["ملاحظات الطلاب","/guidance-requests"],consultation_request:["طلب استشارة","/guidance-requests"],assigned_tasks:["المهام المسندة","/school-tasks"],
 activities:["الأنشطة","/programs"],participants:["المشاركون","/initiative-teams"],health_referrals:["الإحالات الصحية","/health"],prevention:["البرامج الوقائية","/health"],
 health_programs:["التوجيه الصحي","/health"],students:["بيانات الطلاب","/students"],operational_records:["السجلات التشغيلية","/school-tasks"]
};

function GuidanceWorkPage(){
 const q=useQuery({queryKey:["my-guidance-workspace"],queryFn:async()=>{const {data,error}=await (supabase as any).rpc("get_my_guidance_workspace");if(error)throw error;return data as any;}});
 if(q.isLoading)return <div dir="rtl" className="rounded-3xl border bg-card p-8 text-center">جارٍ تجهيز أعمالك...</div>;
 if(q.isError||!q.data)return <div dir="rtl" className="rounded-3xl border bg-card p-8 text-center text-destructive">تعذر تحديد دورك المدرسي.</div>;
 const p=q.data.permissions||{}; const modules=(p.modules||[]) as string[];
 return <div dir="rtl" className="space-y-5">
  <section className="rounded-3xl border bg-card p-5"><div className="flex items-center gap-3"><ShieldCheck className="size-7 text-primary"/><div><p className="text-xs font-bold text-primary">أعمالي مع التوجيه الطلابي</p><h1 className="text-2xl font-black">{p.label}</h1><p className="mt-1 text-xs text-muted-foreground">{q.data.display_name} · تظهر لك الأعمال المرتبطة بصلاحيتك فقط.</p></div></div></section>
  <section className="rounded-3xl border bg-card p-5"><div className="flex items-center gap-2"><UsersRound className="size-5 text-primary"/><h2 className="font-black">صلاحياتي</h2></div><p className="mt-2 text-xs text-muted-foreground">مستويات الاطلاع: {(p.confidentiality||[]).map((x:string)=>x==="team"?"فريق العمل":x==="guidance"?"التوجيه":x==="restricted"?"مقيد وسري":x).join(" · ")||"حسب التكليف"}</p></section>
  <section><h2 className="mb-3 flex items-center gap-2 font-black"><ClipboardCheck className="size-5 text-primary"/>الأعمال المتاحة لي</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{modules.filter(x=>moduleInfo[x]).map(x=>{const [label,to]=moduleInfo[x];return <Link key={x} to={to as any} className="group rounded-2xl border bg-card p-4 transition hover:border-primary"><div className="flex items-center justify-between"><strong>{label}</strong><ArrowLeft className="size-4 text-muted-foreground group-hover:text-primary"/></div><p className="mt-2 text-[11px] text-muted-foreground">فتح العمل ضمن صلاحيات {p.label}</p></Link>})}</div>{modules.length===0&&<p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">لم تُسند لك أعمال توجيه طلابي بعد.</p>}</section>
  {p.manage&&<section className="rounded-3xl border bg-card p-5"><h2 className="font-black">الإدارة والاعتمادات</h2><p className="mt-2 text-xs text-muted-foreground">يمكنك متابعة الأعمال المرفوعة للمراجعة والاعتماد وفق مستوى السرية.</p><Button className="mt-3" asChild><Link to="/school-team">إدارة فريق المدرسة</Link></Button></section>}
 </div>
}