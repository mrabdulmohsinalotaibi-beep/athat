import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CalendarCheck, ClipboardList, Pencil, Save, Trash2, UsersRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/initiative-member-work")({
  validateSearch: (search: Record<string, unknown>): { initiative?: string } =>
    typeof search["initiative"] === "string" ? { initiative: search["initiative"] } : {},
  head: () => ({
    meta: [
      { title: "أعمالي في المبادرة | الذات" },
      { name: "description", content: "صفحة أعمال عضو المبادرة وطلابه ومتابعاته." },
    ],
  }),
  component: InitiativeMemberWorkPage,
});

type Student = {
  id: string;
  full_name: string;
  student_no?: string | null;
  stage?: string | null;
  grade?: string | null;
  classroom?: string | null;
};

type Followup = {
  id: string;
  student_id: string;
  week_start: string;
  attendance_status?: string | null;
  punctuality_status?: string | null;
  behavior_status?: string | null;
  homework_status?: string | null;
  academic_status?: string | null;
  meeting_held: boolean;
  family_contacted: boolean;
  strengths?: string | null;
  concerns?: string | null;
  advice?: string | null;
  next_action?: string | null;
  notes?: string | null;
  updated_at: string;
};

type Workspace = {
  initiative: { id: string; title: string; slogan?: string | null; idea?: string | null; general_goal?: string | null };
  school: { name?: string | null };
  member: { id: string; display_name: string; role_title: string; assigned_tasks: string[] };
  students: Student[];
  followups: Followup[];
  entries: Array<{ id: string; title: string; details?: string | null; progress_percent?: number | null; updated_at: string }>;
};

function InitiativeMemberWorkPage() {
  const { initiative = "" } = Route.useSearch();
  const qc = useQueryClient();
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [weekStart, setWeekStart] = useState(new Date().toISOString().slice(0, 10));
  const [attendanceStatus, setAttendanceStatus] = useState("منتظم");
  const [punctualityStatus, setPunctualityStatus] = useState("ملتزم");
  const [behaviorStatus, setBehaviorStatus] = useState("إيجابي");
  const [homeworkStatus, setHomeworkStatus] = useState("ملتزم");
  const [academicStatus, setAcademicStatus] = useState("مستقر");
  const [meetingHeld, setMeetingHeld] = useState(false);
  const [familyContacted, setFamilyContacted] = useState(false);
  const [strengths, setStrengths] = useState("");
  const [concerns, setConcerns] = useState("");
  const [advice, setAdvice] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [notes, setNotes] = useState("");
  const [updateTitle, setUpdateTitle] = useState("");
  const [updateDetails, setUpdateDetails] = useState("");
  const [progress, setProgress] = useState("0");

  const query = useQuery({
    queryKey: ["my-initiative-workspace", initiative],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_my_initiative_workspace", { p_initiative_id: initiative });
      if (error) throw error;
      return data as Workspace;
    },
    enabled: Boolean(initiative),
    staleTime: 5_000,
  });

  const saveFollowup = useMutation({
    mutationFn: async () => {
      if (studentIds.length === 0) throw new Error("اختر طالبًا واحدًا على الأقل.");
      const results = await Promise.all(studentIds.map((selectedStudentId) => (supabase as any).rpc("save_initiative_student_followup", {
        p_initiative_id: initiative,
        p_student_id: selectedStudentId,
        p_week_start: weekStart,
        p_attendance_status: attendanceStatus,
        p_punctuality_status: punctualityStatus,
        p_behavior_status: behaviorStatus,
        p_homework_status: homeworkStatus,
        p_academic_status: academicStatus,
        p_meeting_held: meetingHeld,
        p_family_contacted: familyContacted,
        p_strengths: strengths || null,
        p_concerns: concerns || null,
        p_advice: advice || null,
        p_next_action: nextAction || null,
        p_notes: notes || null,
      })));
      const failed = results.find((result:any) => result.error);
      if (failed?.error) throw failed.error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["my-initiative-workspace", initiative] });
      toast.success(studentIds.length > 1 ? `تم حفظ المتابعة لـ ${studentIds.length} طلاب.` : "تم حفظ متابعة الطالب.");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const loadFollowup = (f: Followup) => {
    setStudentIds([f.student_id]); setWeekStart(f.week_start); setAttendanceStatus(f.attendance_status||"منتظم");
    setPunctualityStatus(f.punctuality_status||"ملتزم"); setBehaviorStatus(f.behavior_status||"إيجابي");
    setHomeworkStatus(f.homework_status||"ملتزم"); setAcademicStatus(f.academic_status||"مستقر");
    setMeetingHeld(Boolean(f.meeting_held)); setFamilyContacted(Boolean(f.family_contacted)); setStrengths(f.strengths||"");
    setConcerns(f.concerns||""); setAdvice(f.advice||""); setNextAction(f.next_action||""); setNotes(f.notes||"");
    window.scrollTo({top:0,behavior:"smooth"}); toast.info("تم تحميل المتابعة للتعديل. عدّل ثم اضغط حفظ المتابعة.");
  };
  const deleteFollowup = async (id:string) => {
    if(!window.confirm("حذف هذه المتابعة؟")) return;
    const {error}=await (supabase as any).rpc("delete_initiative_followup",{p_followup_id:id});
    if(error){toast.error(error.message);return;} await qc.invalidateQueries({queryKey:["my-initiative-workspace",initiative]}); toast.success("تم حذف المتابعة.");
  };
  const deleteUpdate = async (id:string) => {
    if(!window.confirm("حذف تحديث الإنجاز؟")) return;
    const {error}=await (supabase as any).rpc("delete_initiative_update",{p_update_id:id});
    if(error){toast.error(error.message);return;} await qc.invalidateQueries({queryKey:["my-initiative-workspace",initiative]}); toast.success("تم حذف التحديث.");
  };
  const addUpdate = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).rpc("add_initiative_update", {
        p_initiative_id: initiative,
        p_title: updateTitle.trim(),
        p_details: updateDetails.trim() || null,
        p_progress_percent: Math.max(0, Math.min(100, Number(progress) || 0)),
        p_update_type: "progress",
        p_metrics: {},
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setUpdateTitle("");
      setUpdateDetails("");
      await qc.invalidateQueries({ queryKey: ["my-initiative-workspace", initiative] });
      toast.success("تم حفظ تحديث الإنجاز.");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!initiative) return <div dir="rtl" className="rounded-3xl border bg-card p-8 text-center">لم يتم تحديد المبادرة.</div>;
  if (query.isLoading) return <div dir="rtl" className="rounded-3xl border bg-card p-8 text-center">جارٍ تحميل صفحة أعمالك...</div>;
  if (query.isError || !query.data) return <div dir="rtl" className="rounded-3xl border bg-card p-8 text-center text-destructive">لا يمكنك فتح هذه الصفحة أو أن عضويتك في المبادرة غير فعالة.</div>;

  const data = query.data;
  const studentName = (id: string) => data.students.find((s) => s.id === id)?.full_name || "طالب";

  return (
    <div dir="rtl" className="space-y-5">
      <section className="rounded-3xl border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black text-primary">صفحة أعمالي في المبادرة</p>
            <h1 className="mt-1 text-2xl font-black">{data.initiative.title}</h1>
            {data.initiative.slogan && <p className="mt-1 font-bold text-primary">{data.initiative.slogan}</p>}
            <p className="mt-3 text-sm font-black">{data.member.display_name} · {data.member.role_title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{data.school.name}</p>
          </div>
          <Button variant="outline" onClick={() => history.back()}><ArrowRight className="size-4" /> رجوع</Button>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        <div className="space-y-5">
          <section className="rounded-3xl border bg-card p-5">
            <div className="flex items-center gap-2"><ClipboardList className="size-5 text-primary" /><h2 className="font-black">مهامي</h2></div>
            <div className="mt-3 space-y-2">
              {(data.member.assigned_tasks ?? []).map((task) => <div key={task} className="rounded-xl border px-3 py-2 text-xs">{task}</div>)}
            </div>
          </section>

          <section className="rounded-3xl border bg-card p-5">
            <div className="flex items-center gap-2"><UsersRound className="size-5 text-primary" /><h2 className="font-black">طلابي في المبادرة</h2></div>
            <p className="mt-2 text-xs text-muted-foreground">هذه المجموعة خاصة بك ولا تظهر لبقية معلمي المبادرة.</p>
            <div className="mt-3 space-y-2">
              {data.students.length === 0 ? <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">لم يتم إسناد طلاب لك بعد.</p> :
              data.students.map((s) => <button key={s.id} type="button" onClick={() => setStudentIds((current)=>current.includes(s.id)?current.filter((id)=>id!==s.id):[...current,s.id])} className={`w-full rounded-xl border p-3 text-right ${studentIds.includes(s.id) ? "border-primary bg-primary/5" : ""}`}><p className="font-black">{s.full_name}</p><p className="mt-1 text-[10px] text-muted-foreground">{[s.stage,s.grade,s.classroom].filter(Boolean).join(" · ")}</p></button>)}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-3xl border bg-card p-5">
            <div className="flex items-center gap-2"><CalendarCheck className="size-5 text-primary" /><h2 className="font-black">المتابعة الأسبوعية</h2></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-2"><div className="flex items-center justify-between gap-2"><Label>الطلاب</Label><div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={()=>setStudentIds(data.students.map(s=>s.id))}>تحديد الكل</Button>{studentIds.length>0&&<Button type="button" size="sm" variant="ghost" onClick={()=>setStudentIds([])}>إلغاء التحديد</Button>}</div></div><div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-xl border bg-background p-2">{data.students.map((s)=><label key={s.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted/50"><input type="checkbox" checked={studentIds.includes(s.id)} onChange={()=>setStudentIds(current=>current.includes(s.id)?current.filter(id=>id!==s.id):[...current,s.id])}/><span className="font-bold">{s.full_name}</span></label>)}</div>{studentIds.length>0&&<p className="mt-2 text-xs font-bold text-primary">تم اختيار {studentIds.length} طالب</p>}</div>
              <div><Label>بداية الأسبوع</Label><Input className="mt-2" type="date" value={weekStart} onChange={(e)=>setWeekStart(e.target.value)} /></div>
              <SimpleSelect label="الحضور" value={attendanceStatus} onChange={setAttendanceStatus} options={["منتظم","غياب متكرر","يحتاج متابعة"]} />
              <SimpleSelect label="الالتزام بالوقت" value={punctualityStatus} onChange={setPunctualityStatus} options={["ملتزم","تأخر محدود","تأخر متكرر"]} />
              <SimpleSelect label="السلوك" value={behaviorStatus} onChange={setBehaviorStatus} options={["إيجابي","مستقر","يحتاج تحسين","يحتاج تدخل"]} />
              <SimpleSelect label="الواجبات" value={homeworkStatus} onChange={setHomeworkStatus} options={["ملتزم","متفاوت","غير ملتزم"]} />
              <SimpleSelect label="المستوى الدراسي" value={academicStatus} onChange={setAcademicStatus} options={["متحسن","مستقر","متراجع","يحتاج دعم"]} />
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 rounded-xl border p-3 text-xs"><input type="checkbox" checked={meetingHeld} onChange={(e)=>setMeetingHeld(e.target.checked)} />تم لقاء الطالب</label>
              <label className="flex items-center gap-2 rounded-xl border p-3 text-xs"><input type="checkbox" checked={familyContacted} onChange={(e)=>setFamilyContacted(e.target.checked)} />تم التواصل مع الأسرة</label>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div><Label>نقاط القوة</Label><Textarea className="mt-2" value={strengths} onChange={(e)=>setStrengths(e.target.value)} /></div>
              <div><Label>جوانب تحتاج متابعة</Label><Textarea className="mt-2" value={concerns} onChange={(e)=>setConcerns(e.target.value)} /></div>
              <div><Label>النصح والتوجيه</Label><Textarea className="mt-2" value={advice} onChange={(e)=>setAdvice(e.target.value)} /></div>
              <div><Label>الإجراء القادم</Label><Textarea className="mt-2" value={nextAction} onChange={(e)=>setNextAction(e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>ملاحظات</Label><Textarea className="mt-2" value={notes} onChange={(e)=>setNotes(e.target.value)} /></div>
            </div>
            <Button className="mt-4" disabled={studentIds.length === 0 || saveFollowup.isPending} onClick={()=>saveFollowup.mutate()}><Save className="size-4" /> {studentIds.length > 1 ? `حفظ المتابعة لـ ${studentIds.length} طلاب` : "حفظ المتابعة"}</Button>
          </section>

          <section className="rounded-3xl border bg-card p-5">
            <h2 className="font-black">سجل متابعاتي</h2>
            <div className="mt-3 space-y-2">
              {data.followups.length === 0 ? <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">لا توجد متابعات بعد.</p> :
              data.followups.map((f)=><article key={f.id} className="rounded-2xl border p-3"><div className="flex justify-between gap-3"><p className="font-black">{studentName(f.student_id)}</p><span className="text-[10px] text-muted-foreground">{new Date(f.week_start).toLocaleDateString("ar-SA")}</span></div><p className="mt-2 text-[10px] text-muted-foreground">{[f.attendance_status,f.behavior_status,f.homework_status,f.academic_status].filter(Boolean).join(" · ")}</p>{f.next_action && <p className="mt-2 text-xs"><strong>الإجراء القادم:</strong> {f.next_action}</p>}<div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={()=>loadFollowup(f)}><Pencil className="size-4"/> تعديل</Button><Button size="sm" variant="destructive" onClick={()=>void deleteFollowup(f.id)}><Trash2 className="size-4"/> حذف</Button></div></article>)}
            </div>
          </section>

          <section className="rounded-3xl border bg-card p-5">
            <h2 className="font-black">تحديث إنجازي</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_120px]">
              <div><Label>عنوان التحديث</Label><Input className="mt-2" value={updateTitle} onChange={(e)=>setUpdateTitle(e.target.value)} /></div>
              <div><Label>نسبة الإنجاز</Label><Input className="mt-2" type="number" min="0" max="100" value={progress} onChange={(e)=>setProgress(e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>التفاصيل</Label><Textarea className="mt-2" value={updateDetails} onChange={(e)=>setUpdateDetails(e.target.value)} /></div>
            </div>
            <Button className="mt-3" disabled={!updateTitle.trim() || addUpdate.isPending} onClick={()=>addUpdate.mutate()}>حفظ التحديث</Button>
            <div className="mt-4 space-y-2">{data.entries.map((e)=><article key={e.id} className="rounded-2xl border p-3"><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-black">{e.title}</p>{e.details&&<p className="mt-1 text-xs text-muted-foreground">{e.details}</p>}</div><span className="text-xs font-black text-primary">{e.progress_percent??0}%</span></div><div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={()=>{setUpdateTitle(e.title);setUpdateDetails(e.details||"");setProgress(String(e.progress_percent??0));toast.info("عدّل البيانات ثم احفظ كتحديث جديد، أو احذف السجل القديم.");}}><Pencil className="size-4"/> نسخ للتعديل</Button><Button size="sm" variant="destructive" onClick={()=>void deleteUpdate(e.id)}><Trash2 className="size-4"/> حذف</Button></div></article>)}</div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SimpleSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v:string)=>void; options:string[] }) {
  return <div><Label>{label}</Label><select className="mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm" value={value} onChange={(e)=>onChange(e.target.value)}>{options.map((o)=><option key={o}>{o}</option>)}</select></div>;
}
