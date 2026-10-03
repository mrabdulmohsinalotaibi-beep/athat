import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, BarChart3, ClipboardList, FileCheck2, FolderOpen, Pencil, Save, Settings, Target, Trash2, UsersRound } from "lucide-react";
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
  const [assignMemberId, setAssignMemberId] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [inviteRole, setInviteRole] = useState("عضو المبادرة");
  const [inviteUrl, setInviteUrl] = useState("");
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editSlogan, setEditSlogan] = useState("");
  const [editIdea, setEditIdea] = useState("");
  const [editGoal, setEditGoal] = useState("");
  const [editIndicators, setEditIndicators] = useState("");
  const [editStatus, setEditStatus] = useState("active");
  const [editObjectives, setEditObjectives] = useState<string[]>([]);
  const [editMechanism, setEditMechanism] = useState<string[]>([]);
  const [editResults, setEditResults] = useState<string[]>([]);
  const qc = useQueryClient();
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
  const approvalQuery=useQuery({queryKey:["initiative-approval",initiativeId],queryFn:async()=>{const {data,error}=await (supabase as any).from("guidance_approvals").select("id,status,review_notes,submitted_at").eq("item_type","initiative").eq("item_id",initiativeId).order("submitted_at",{ascending:false}).limit(1);if(error)throw error;return data?.[0]??null},enabled:Boolean(initiativeId)});

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
  const followupsQuery = useQuery({
    queryKey: ["initiative-detail-followups", initiativeId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_initiative_followups", { p_initiative_id: initiativeId });
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(initiativeId && item),
  });
  const assignStudents = useMutation({
    mutationFn: async () => {
      if (!assignMemberId) throw new Error("اختر المعلم أولًا");
      const { error } = await (supabase as any).rpc("assign_initiative_students", {
        p_initiative_id: initiativeId,
        p_initiative_member_id: assignMemberId,
        p_student_ids: selectedStudentIds,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("تم حفظ توزيع الطلاب.");
      setSelectedStudentIds([]);
      await qc.invalidateQueries({ queryKey: ["initiative-detail-students", initiativeId] });
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const inviteMember = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any).rpc("create_initiative_invite", {
        p_initiative_id: initiativeId,
        p_role_title: inviteRole.trim() || "عضو المبادرة",
        p_tasks: [],
        p_school_role: "teacher",
        p_permissions: { "dashboard.view": true, "students.view": true, "tasks.view": true },
        p_data_scope: { type: "assigned" },
        p_student_ids: [],
        p_expires_days: 7,
      });
      if (error) throw error;
      return String(data ?? "");
    },
    onSuccess: (token) => {
      const url = `${window.location.origin}/school-invite?invite=${encodeURIComponent(token)}`;
      setInviteUrl(url);
      toast.success("تم إنشاء رابط الدعوة.");
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const beginEdit = () => {
    setEditTitle(item?.title ?? ""); setEditSlogan(item?.slogan ?? ""); setEditIdea(item?.idea ?? "");
    setEditGoal(item?.general_goal ?? ""); setEditIndicators(item?.success_indicators ?? ""); setEditStatus(item?.status ?? "active");
    setEditObjectives([...(item?.objectives ?? [])]); setEditMechanism([...(item?.mechanism ?? [])]); setEditResults([...(item?.expected_results ?? [])]); setEditing(true);
  };
  const saveInitiative = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).rpc("update_initiative", {
        p_initiative_id: initiativeId, p_title: editTitle, p_slogan: editSlogan || null, p_idea: editIdea || null,
        p_general_goal: editGoal || null, p_objectives: editObjectives, p_mechanism: editMechanism,
        p_expected_results: editResults, p_success_indicators: editIndicators || null,
        p_status: editStatus, p_starts_at: item?.starts_at || null, p_ends_at: item?.ends_at || null,
      });
      if (error) throw error;
    },
    onSuccess: async () => { setEditing(false); await qc.invalidateQueries({queryKey:["initiative-detail",initiativeId]}); toast.success("تم حفظ تعديلات المبادرة."); },
    onError: e => toast.error((e as Error).message),
  });
  const editMember = async (m:any) => {
    const role=window.prompt("الدور داخل المبادرة",m.role_title||"عضو المبادرة"); if(role===null)return;
    const tasks=window.prompt("المهام، افصل بينها بفاصلة", (m.assigned_tasks??[]).join("، ")); if(tasks===null)return;
    const {error}=await (supabase as any).rpc("update_initiative_member",{p_member_id:m.id,p_role_title:role,p_tasks:tasks.split(/[،,]/).map((x:string)=>x.trim()).filter(Boolean)});
    if(error){toast.error(error.message);return;} await qc.invalidateQueries({queryKey:["initiative-detail",initiativeId]}); toast.success("تم تعديل بيانات العضو.");
  };
  const editUpdate = async (u:any) => {
    const title=window.prompt("عنوان السجل",u.title||""); if(title===null)return;
    const details=window.prompt("تفاصيل السجل",u.details||""); if(details===null)return;
    const progress=window.prompt("نسبة الإنجاز من 0 إلى 100",String(u.progress_percent??0)); if(progress===null)return;
    const {error}=await (supabase as any).rpc("update_initiative_update",{p_update_id:u.id,p_title:title,p_details:details||null,p_progress_percent:Math.max(0,Math.min(100,Number(progress)||0))});
    if(error){toast.error(error.message);return;} await qc.invalidateQueries({queryKey:["initiative-detail",initiativeId]}); toast.success("تم تعديل سجل الإنجاز.");
  };
  const runDelete = async (rpc: string, args: Record<string, unknown>, message: string) => {
    if (!window.confirm("هل أنت متأكد؟ لا يمكن التراجع عن الحذف.")) return;
    const { error } = await (supabase as any).rpc(rpc, args);
    if (error) { toast.error(error.message); return; }
    toast.success(message);
    await qc.invalidateQueries({ queryKey: ["initiative-detail", initiativeId] });
    await qc.invalidateQueries({ queryKey: ["initiative-detail-students", initiativeId] });
    await qc.invalidateQueries({ queryKey: ["initiative-detail-followups", initiativeId] });
    await qc.invalidateQueries({ queryKey: ["initiative-detail-dashboard", initiativeId] });
  };
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

  const submitApproval=async()=>{const notes=window.prompt("ملاحظة للمدير/المراجع (اختياري):")||null;const {error}=await (supabase as any).rpc("submit_guidance_approval",{p_item_type:"initiative",p_item_id:initiativeId,p_title:item.title||"مبادرة",p_notes:notes,p_confidentiality:"team"});if(error)return toast.error(error.message);toast.success("تم رفع المبادرة للاعتماد.");await qc.invalidateQueries({queryKey:["initiative-approval",initiativeId]});};
  const memberCount = (item.members ?? []).filter((m:any)=>m.status==="active").length;
  return <div dir="rtl" className="space-y-5">
    {approvalQuery.data&&<section className="rounded-2xl border bg-card p-4 text-xs"><b>حالة الاعتماد: </b>{approvalQuery.data.status==="approved"?"معتمد":approvalQuery.data.status==="rejected"?"معاد بملاحظة":approvalQuery.data.status==="reviewed"?"تمت المراجعة":"بانتظار المراجعة"}{approvalQuery.data.review_notes&&<p className="mt-2 text-muted-foreground">{approvalQuery.data.review_notes}</p>}</section>}
    <section className="rounded-3xl border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-3"><Button size="sm" variant="outline" onClick={submitApproval}><FileCheck2 className="size-4"/> رفع للاعتماد</Button>
        <div><button className="mb-3 inline-flex items-center gap-1 text-xs font-black text-primary" onClick={()=>history.back()}><ArrowRight className="size-4"/> المبادرات</button><p className="text-xs font-black text-primary">ملف المبادرة</p><h1 className="mt-1 text-2xl font-black">{item.title}</h1>{item.slogan && <p className="mt-2 font-bold text-primary">{item.slogan}</p>}</div>
        <div className="flex flex-wrap gap-2">{item.is_manager&&<Button size="sm" variant="outline" onClick={beginEdit}><Pencil className="size-4"/> تعديل المبادرة</Button>}<span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">{item.latest_progress || 0}% إنجاز</span>{item.my_membership?.status==="active" && <Button size="sm" onClick={()=>{window.location.href=`/initiative-member-work?initiative=${encodeURIComponent(item.id)}`;}}>مساحة عملي</Button>}{item.can_view_dashboard && <Button size="sm" variant="outline" onClick={()=>{window.location.href=`/initiative-dashboard?initiative=${encodeURIComponent(item.id)}`;}}>الداشبورد التنفيذي</Button>}</div>
      </div>
      {item.idea && <p className="mt-4 text-sm leading-7 text-muted-foreground">{item.idea}</p>}
    </section>

    {editing&&<section className="rounded-3xl border bg-card p-5"><h2 className="font-black">تعديل المبادرة</h2><div className="mt-4 grid gap-3 md:grid-cols-2"><input className="h-11 rounded-xl border bg-background px-3 text-sm" value={editTitle} onChange={e=>setEditTitle(e.target.value)} placeholder="اسم المبادرة"/><input className="h-11 rounded-xl border bg-background px-3 text-sm" value={editSlogan} onChange={e=>setEditSlogan(e.target.value)} placeholder="الشعار"/><textarea className="min-h-24 rounded-xl border bg-background p-3 text-sm md:col-span-2" value={editIdea} onChange={e=>setEditIdea(e.target.value)} placeholder="فكرة المبادرة"/><textarea className="min-h-24 rounded-xl border bg-background p-3 text-sm" value={editGoal} onChange={e=>setEditGoal(e.target.value)} placeholder="الهدف العام"/><textarea className="min-h-24 rounded-xl border bg-background p-3 text-sm" value={editIndicators} onChange={e=>setEditIndicators(e.target.value)} placeholder="مؤشرات النجاح"/><select className="h-11 rounded-xl border bg-background px-3 text-sm" value={editStatus} onChange={e=>setEditStatus(e.target.value)}><option value="draft">مسودة</option><option value="active">نشطة</option><option value="completed">مكتملة</option><option value="archived">مؤرشفة</option></select><EditableList title="الأهداف" items={editObjectives} setItems={setEditObjectives}/><EditableList title="آلية التنفيذ" items={editMechanism} setItems={setEditMechanism}/><EditableList title="النتائج المرجوة" items={editResults} setItems={setEditResults}/></div><div className="mt-4 flex gap-2"><Button disabled={!editTitle.trim()||saveInitiative.isPending} onClick={()=>saveInitiative.mutate()}><Save className="size-4"/> حفظ التعديلات</Button><Button variant="outline" onClick={()=>setEditing(false)}>إلغاء</Button></div></section>}

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

    {tab==="team" && <section className="rounded-3xl border bg-card p-5"><div className="flex items-center justify-between gap-2"><h2 className="font-black">فريق المبادرة</h2><span className="text-xs text-muted-foreground">{memberCount} عضو فعال</span></div>
      {item.is_manager&&<div className="mt-4 rounded-2xl border bg-muted/20 p-3"><p className="text-xs font-black">دعوة معلم أو عضو جديد</p><div className="mt-2 flex flex-wrap gap-2"><input className="h-9 min-w-52 flex-1 rounded-xl border bg-background px-3 text-xs" value={inviteRole} onChange={e=>setInviteRole(e.target.value)} placeholder="الدور داخل المبادرة"/><Button size="sm" disabled={inviteMember.isPending} onClick={()=>inviteMember.mutate()}>{inviteMember.isPending?"جارٍ الإنشاء...":"إنشاء رابط دعوة"}</Button></div>{inviteUrl&&<div className="mt-2 rounded-xl border bg-background p-2"><p className="break-all text-[10px] text-muted-foreground">{inviteUrl}</p><Button className="mt-2" size="sm" variant="outline" onClick={async()=>{await navigator.clipboard.writeText(inviteUrl);toast.success("تم نسخ الرابط");}}>نسخ الرابط</Button></div>}</div>}
      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{(item.members??[]).map((m:any)=><article key={m.id} className="rounded-2xl border p-3"><div className="flex justify-between gap-2"><div><p className="text-sm font-black">{m.display_name}</p><p className="text-[10px] text-primary">{m.role_title}</p></div><span className="text-[9px] text-muted-foreground">{m.status==="active"?"فعال":m.status}</span></div>{m.assigned_tasks?.length>0&&<div className="mt-2 flex flex-wrap gap-1">{m.assigned_tasks.map((x:string)=><span key={x} className="rounded-full bg-muted px-2 py-1 text-[9px]">{x}</span>)}</div>}{item.is_manager&&<div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={()=>void editMember(m)}><Pencil className="size-4"/> تعديل</Button>{m.status==="active"&&<Button className="flex-1" size="sm" variant="outline" onClick={()=>{setTab("students");setAssignMemberId(m.id);}}>توزيع الطلاب</Button>}{m.user_id!==item.created_by&&<Button size="sm" variant="destructive" onClick={()=>void runDelete("delete_initiative_member",{p_member_id:m.id},"تم حذف العضو من المبادرة.")}><Trash2 className="size-4"/> حذف</Button>}</div>}</article>)}</div></section>}

    {tab==="students" && <section className="rounded-3xl border bg-card p-5"><div className="flex items-center justify-between gap-2"><h2 className="font-black">طلاب المبادرة</h2><span className="text-xs text-muted-foreground">{(studentsQuery.data??[]).length} طالب</span></div>
      {item.is_manager&&<div className="mt-4 rounded-2xl border bg-muted/20 p-3"><p className="text-xs font-black">توزيع الطلاب على معلم</p><div className="mt-2 flex flex-wrap gap-2">{(item.members??[]).filter((m:any)=>m.status==="active").map((m:any)=><Button key={m.id} size="sm" variant={assignMemberId===m.id?"default":"outline"} onClick={()=>{setAssignMemberId(m.id);setSelectedStudentIds((studentsQuery.data??[]).filter((s:any)=>s.assigned_member_id===m.id).map((s:any)=>String(s.id)));}}>{m.display_name}</Button>)}</div>{assignMemberId&&<div className="mt-3"><p className="mb-2 text-[10px] text-muted-foreground">حدد الطلاب ثم احفظ. الطالب يكون مسندًا لمعلم واحد داخل المبادرة.</p><div className="grid max-h-80 gap-2 overflow-y-auto md:grid-cols-2 xl:grid-cols-3">{(studentsQuery.data??[]).map((s:any)=>{const id=String(s.id);const checked=selectedStudentIds.includes(id);return <label key={id} className="flex cursor-pointer items-center gap-2 rounded-xl border p-2 text-xs"><input type="checkbox" checked={checked} onChange={()=>setSelectedStudentIds(v=>checked?v.filter(x=>x!==id):[...v,id])}/><span className="min-w-0"><strong className="block truncate">{s.full_name}</strong><span className="text-[9px] text-muted-foreground">{[s.grade,s.classroom].filter(Boolean).join(" · ")}</span></span></label>})}</div><Button className="mt-3" disabled={assignStudents.isPending} onClick={()=>assignStudents.mutate()}>{assignStudents.isPending?"جارٍ الحفظ...":"حفظ توزيع الطلاب"}</Button></div>}</div>}
      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{(studentsQuery.data??[]).map((s:any)=><article key={s.id||s.student_id} className="rounded-2xl border p-3"><p className="text-sm font-black">{s.full_name}</p><p className="mt-1 text-[10px] text-muted-foreground">{[s.stage,s.grade,s.classroom].filter(Boolean).join(" · ")}</p>{s.assigned_member_name&&<p className="mt-2 text-[10px] text-primary">المعلم: {s.assigned_member_name}</p>}{s.last_followup&&<p className="mt-2 text-[9px] text-muted-foreground">آخر متابعة: {String(s.last_followup.week_start??"")}</p>}{item.is_manager&&s.assigned_member_id&&<Button className="mt-3 w-full" size="sm" variant="destructive" onClick={()=>void runDelete("unassign_initiative_student",{p_initiative_id:initiativeId,p_student_id:s.id||s.student_id},"تم إلغاء إسناد الطالب.")}><Trash2 className="size-4"/> إزالة من المبادرة</Button>}</article>)}</div></section>}

    {tab==="work" && <section className="rounded-3xl border bg-card p-5"><div className="flex items-center justify-between gap-2"><h2 className="font-black">الأعمال والمتابعة</h2>{item.my_membership?.status==="active"&&<Button size="sm" onClick={()=>{window.location.href=`/initiative-member-work?initiative=${encodeURIComponent(item.id)}`;}}>إضافة عمل أو متابعة</Button>}</div><div className="mt-4 grid gap-2 md:grid-cols-2">{(followupsQuery.data??[]).slice(0,12).map((f:any)=><article key={f.id} className="rounded-2xl border p-3"><div className="flex justify-between gap-2"><p className="text-sm font-black">{f.student_name}</p><span className="text-[10px] text-primary">{f.week_start}</span></div><p className="mt-1 text-[10px] text-muted-foreground">{f.member_name} · {f.role_title}</p><p className="mt-2 text-xs">{f.next_action||f.advice||f.notes||"متابعة مسجلة"}</p><Button className="mt-3" size="sm" variant="destructive" onClick={()=>void runDelete("delete_initiative_followup",{p_followup_id:f.id},"تم حذف المتابعة.")}><Trash2 className="size-4"/> حذف المتابعة</Button></article>)}</div><h3 className="mt-5 text-sm font-black">سجل إنجاز المبادرة</h3><div className="mt-3 space-y-2">{(item.updates??[]).map((u:any)=><article key={u.id} className="rounded-2xl border p-3"><div className="flex justify-between gap-2"><p className="text-sm font-black">{u.title}</p><span className="text-xs font-black text-primary">{u.progress_percent??"—"}%</span></div>{u.details&&<p className="mt-2 text-xs leading-6 text-muted-foreground">{u.details}</p>}<p className="mt-2 text-[10px] text-muted-foreground">{u.created_by_name}</p><div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={()=>void editUpdate(u)}><Pencil className="size-4"/> تعديل</Button><Button size="sm" variant="destructive" onClick={()=>void runDelete("delete_initiative_update",{p_update_id:u.id},"تم حذف سجل الإنجاز.")}><Trash2 className="size-4"/> حذف السجل</Button></div></article>)}</div></section>}

    {tab==="evidence" && <section className="rounded-3xl border bg-card p-5"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><FolderOpen className="size-5 text-primary"/><h2 className="font-black">شواهد المبادرة</h2></div><span className="text-xs text-muted-foreground">{(dashboardQuery.data as any)?.files_total||0} ملف</span></div>
      <p className="mt-2 text-xs leading-6 text-muted-foreground">الشواهد مرتبطة بأعمال أعضاء المبادرة، ويظهر هنا سجل الأعمال التي تحتوي ملفات وصورًا.</p>
      <div className="mt-4 grid gap-2 md:grid-cols-2">{(((dashboardQuery.data as any)?.recent_entries)||[]).filter((e:any)=>Number(e.files_count)>0).map((e:any)=><article key={e.id} className="rounded-2xl border p-3"><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-black">{e.title}</p><p className="mt-1 text-[10px] text-muted-foreground">{e.member_name} · {e.role_title}</p></div><span className="rounded-full bg-primary/10 px-2 py-1 text-[9px] font-black text-primary">{e.files_count} شاهد</span></div>{e.details&&<p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{e.details}</p>}</article>)}</div>
      {item.my_membership?.status==="active"&&<Button className="mt-4" onClick={()=>{window.location.href=`/initiative-member-work?initiative=${encodeURIComponent(item.id)}`;}}>رفع شاهد من مساحة عملي</Button>}</section>}

    {tab==="reports" && <section className="rounded-3xl border bg-card p-5"><div className="flex items-center justify-between gap-2"><div><h2 className="font-black">تقارير المبادرة</h2><p className="mt-1 text-xs text-muted-foreground">ملخص الأداء والطلاب والمتابعات والشواهد.</p></div>{item.can_view_dashboard&&<Button variant="outline" onClick={()=>{window.location.href=`/initiative-dashboard?initiative=${encodeURIComponent(item.id)}`;}}>فتح التقرير التنفيذي</Button>}</div>{dashboardQuery.data&&<div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4"><Stat icon={UsersRound} label="الأعضاء" value={(dashboardQuery.data as any).members_total||0}/><Stat icon={Target} label="الطلاب" value={(dashboardQuery.data as any).students_total||0}/><Stat icon={ClipboardList} label="المتابعات" value={(dashboardQuery.data as any).followups_total||0}/><Stat icon={FileCheck2} label="الشواهد" value={(dashboardQuery.data as any).files_total||0}/></div>}</section>}

    {tab==="settings" && <section className="rounded-3xl border bg-card p-5"><div className="flex items-center gap-2"><Settings className="size-5 text-primary"/><h2 className="font-black">الإعدادات والروابط</h2></div>{item.is_manager?<><div className="mt-4 grid gap-3 md:grid-cols-2"><div className="rounded-2xl border p-4"><h3 className="text-sm font-black">إدارة الفريق</h3><p className="mt-1 text-xs text-muted-foreground">الدعوات وإسناد الطلاب أصبحت داخل تبويبي الفريق والطلاب في هذه الصفحة.</p><Button className="mt-3" size="sm" variant="outline" onClick={()=>setTab("team")}>فتح الفريق</Button></div><div className="rounded-2xl border p-4"><h3 className="text-sm font-black">لوحة الإدارة</h3><p className="mt-1 text-xs text-muted-foreground">عرض إحصاءات جميع المعلمين والمتابعات والشواهد.</p>{item.can_view_dashboard&&<Button className="mt-3" size="sm" variant="outline" onClick={()=>{window.location.href=`/initiative-dashboard?initiative=${encodeURIComponent(item.id)}`;}}>فتح الداشبورد التنفيذي</Button>}</div></div><div className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/5 p-4"><h3 className="text-sm font-black text-destructive">منطقة الحذف</h3><p className="mt-1 text-xs text-muted-foreground">حذف المبادرة يحذف الفريق والتوزيعات والمتابعات والسجلات المرتبطة بها.</p><Button className="mt-3" variant="destructive" onClick={async()=>{if(!window.confirm("سيتم حذف المبادرة وكل بياناتها نهائيًا. هل تريد المتابعة؟"))return;const {error}=await (supabase as any).rpc("delete_initiative",{p_initiative_id:initiativeId});if(error){toast.error(error.message);return;}toast.success("تم حذف المبادرة.");window.location.href="/initiative-teams";}}><Trash2 className="size-4"/> حذف المبادرة بالكامل</Button></div></>:<p className="mt-2 text-xs leading-6 text-muted-foreground">إعدادات الإدارة والروابط متاحة لمدير المبادرة فقط.</p>}</section>}

  </div>;
}
function Stat({icon:Icon,label,value}:{icon:any;label:string;value:any}){return <div className="rounded-2xl border bg-card p-4"><Icon className="size-4 text-primary"/><strong className="mt-2 block text-xl">{value}</strong><span className="text-[10px] text-muted-foreground">{label}</span></div>}
function Info({title,text}:{title:string;text?:string|null}){return <section className="rounded-2xl border bg-card p-4"><h2 className="font-black">{title}</h2><p className="mt-2 text-xs leading-6 text-muted-foreground">{text||"لم يضف بعد."}</p></section>}
function ListInfo({title,items}:{title:string;items?:string[]}){return <section className="rounded-2xl border bg-card p-4"><h2 className="font-black">{title}</h2><ul className="mt-2 space-y-1 text-xs leading-6 text-muted-foreground">{(items??[]).length?(items??[]).map((x,i)=><li key={i}>• {x}</li>):<li>لم يضف بعد.</li>}</ul></section>}

function EditableList({title,items,setItems}:{title:string;items:string[];setItems:(v:string[])=>void}) {
  const [value,setValue]=useState("");
  return <div className="rounded-2xl border p-3 md:col-span-2"><div className="flex items-center justify-between gap-2"><h3 className="text-xs font-black">{title}</h3><span className="text-[10px] text-muted-foreground">{items.length} عنصر</span></div><div className="mt-2 space-y-2">{items.map((x,i)=><div key={i} className="flex gap-2"><input className="h-9 flex-1 rounded-xl border bg-background px-3 text-xs" value={x} onChange={e=>setItems(items.map((v,n)=>n===i?e.target.value:v))}/><Button type="button" size="sm" variant="destructive" onClick={()=>setItems(items.filter((_,n)=>n!==i))}><Trash2 className="size-4"/> حذف</Button></div>)}</div><div className="mt-2 flex gap-2"><input className="h-9 flex-1 rounded-xl border bg-background px-3 text-xs" value={value} onChange={e=>setValue(e.target.value)} placeholder={"إضافة عنصر إلى "+title}/><Button type="button" size="sm" variant="outline" onClick={()=>{const v=value.trim();if(!v)return;setItems([...items,v]);setValue("");}}>إضافة</Button></div></div>;
}
