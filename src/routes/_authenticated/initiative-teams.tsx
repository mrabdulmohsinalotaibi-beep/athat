import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, ClipboardList, Copy, Plus, RefreshCw, Send, ShieldCheck, Sparkles, UserCheck, Users, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/initiative-teams")({
  head: () => ({
    meta: [
      { title: "فرق المبادرات | الذات" },
      { name: "description", content: "إنشاء فرق المبادرات ودعوة الأعضاء وإسناد الأعمال ومتابعة الإنجاز." },
    ],
  }),
  component: InitiativeTeamsPage,
});

type InitiativeMember = {
  id: string;
  display_name: string;
  role_title: string;
  assigned_tasks: string[];
  status: "pending" | "active" | "rejected" | "suspended";
};

type InitiativeUpdate = {
  id: string;
  update_type: string;
  title: string;
  details?: string | null;
  progress_percent?: number | null;
  created_at: string;
  created_by_name: string;
};

type InitiativeStudent = {
  id: string; full_name: string; student_no?: string | null; stage?: string | null; grade?: string | null; classroom?: string | null;
  guardian_name?: string | null; guardian_phone?: string | null; assigned_member_id?: string | null; assigned_member_name?: string | null; assigned_role?: string | null;
};
type MyStudent = {
  assignment_id: string; student_id: string; full_name: string; student_no?: string | null; stage?: string | null; grade?: string | null;
  classroom?: string | null; guardian_name?: string | null; guardian_phone?: string | null; last_followup?: Record<string, unknown> | null;
};

type Initiative = {
  id: string;
  title: string;
  slogan?: string | null;
  idea?: string | null;
  general_goal?: string | null;
  objectives: string[];
  mechanism: string[];
  expected_results: string[];
  success_indicators?: string | null;
  status: string;
  latest_progress: number;
  is_manager: boolean;
  members: InitiativeMember[];
  updates: InitiativeUpdate[];
  my_membership?: { id: string; role_title: string; assigned_tasks: string[]; status: string } | null;
};

const FATHER_MENTOR = {
  title: "مبادرة الأب الناصح",
  slogan: "قدوةٌ ترعى، ونصيحةٌ تبني.",
  idea:
    "مبادرة تربوية تعزز دور المعلم بوصفه قدوةً ومربيًا يؤدي دور الأب الناصح داخل المدرسة؛ بالقرب من الطالب، والاستماع إليه، وتقديم النصح والتوجيه والإرشاد له، ومتابعة حضوره وانصرافه وسلوكه وأداء واجباته ومستواه الدراسي، بالتعاون مع الأسرة والموجه الطلابي.",
  generalGoal:
    "بناء علاقة تربوية قائمة على الثقة والاحترام بين المعلم والطالب، تسهم في تعزيز الانضباط وتحسين الأداء السلوكي والدراسي والاجتماعي.",
  objectives: [
    "تعزيز انتظام الطلاب في الحضور والانصراف والالتزام بالحصص.",
    "تنمية السلوك الإيجابي ومعالجة السلوكيات الخاطئة والسلبية.",
    "تحسين التحصيل الدراسي والالتزام بأداء الواجبات.",
    "تعزيز المسؤولية والثقة بالنفس واحترام الآخرين.",
    "توثيق الشراكة بين المدرسة والأسرة في متابعة الطالب.",
  ],
  mechanism: [
    "توزيع الطلاب على المعلمين المشاركين، بحيث يتولى كل معلم متابعة مجموعة محددة.",
    "عقد لقاء تعريفي مع الطلاب لبناء الثقة وتوضيح أهداف المبادرة.",
    "متابعة الحضور والانصراف والسلوك والواجبات والمستوى الدراسي بصورة منتظمة.",
    "تخصيص لقاء أسبوعي قصير للنصح والتحفيز والاستماع إلى احتياجات الطلاب.",
    "التنسيق مع الأسرة والموجه الطلابي لمعالجة الصعوبات، مع مراعاة خصوصية الطالب وحفظ كرامته.",
    "توثيق التقدم وتعزيز التحسن، ومراجعة نتائج المبادرة شهريًا.",
  ],
  results: [
    "ارتفاع مستوى الانضباط وانخفاض الغياب والتأخر.",
    "تحسن السلوك والتحصيل الدراسي والعلاقات الاجتماعية.",
    "الحد من السلوكيات السلبية والعمل على استبدالها بسلوكيات إيجابية.",
    "زيادة شعور الطالب بالاهتمام والانتماء إلى المدرسة.",
    "تعزيز التزام الطلاب بواجباتهم ومسؤولياتهم.",
  ],
  indicators:
    "مقارنة معدلات الغياب والتأخر والمخالفات السلوكية، ونسبة إنجاز الواجبات، ونتائج الطلاب قبل المبادرة وبعدها، مع استطلاع آراء الطلاب وأولياء الأمور حول أثرها.",
};

function lines(value: string) {
  return value.split("\n").map((v) => v.trim()).filter(Boolean);
}

function InitiativeTeamsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [title, setTitle] = useState("");
  const [slogan, setSlogan] = useState("");
  const [idea, setIdea] = useState("");
  const [generalGoal, setGeneralGoal] = useState("");
  const [objectives, setObjectives] = useState("");
  const [mechanism, setMechanism] = useState("");
  const [results, setResults] = useState("");
  const [indicators, setIndicators] = useState("");
  const [inviteRole, setInviteRole] = useState("الأب الناصح");
  const [inviteTasks, setInviteTasks] = useState("متابعة مجموعة الطلاب المسندة\nلقاء أسبوعي قصير مع الطلاب\nمتابعة الحضور والتأخر والسلوك والواجبات\nالتواصل مع الأسرة عند الحاجة\nرفع ملخص متابعة شهري");
  const [inviteUrl, setInviteUrl] = useState("");
  const [updateTitle, setUpdateTitle] = useState("");
  const [updateDetails, setUpdateDetails] = useState("");
  const [progress, setProgress] = useState("0");
  const [assignMemberId, setAssignMemberId] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [followStudent, setFollowStudent] = useState<MyStudent | null>(null);
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
  const [followNotes, setFollowNotes] = useState("");

  const query = useQuery({
    queryKey: ["initiative-teams"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_my_initiatives");
      if (error) throw error;
      return (data ?? []) as Initiative[];
    },
    staleTime: 15_000,
  });

  const managerStudentsQuery = useQuery({
    queryKey: ["initiative-students", selectedId || (query.data ?? [])[0]?.id],
    queryFn: async () => {
      const initiativeId = selectedId || (query.data ?? [])[0]?.id;
      if (!initiativeId) return [] as InitiativeStudent[];
      const { data, error } = await (supabase as any).rpc("get_initiative_students", { p_initiative_id: initiativeId });
      if (error) throw error;
      return (data ?? []) as InitiativeStudent[];
    },
    enabled: Boolean((selectedId || (query.data ?? [])[0]?.id) && ((query.data ?? []).find((x) => x.id === (selectedId || (query.data ?? [])[0]?.id))?.is_manager)),
    staleTime: 15_000,
  });

  const myStudentsQuery = useQuery({
    queryKey: ["my-initiative-students", selectedId || (query.data ?? [])[0]?.id],
    queryFn: async () => {
      const initiativeId = selectedId || (query.data ?? [])[0]?.id;
      if (!initiativeId) return [] as MyStudent[];
      const { data, error } = await (supabase as any).rpc("get_my_initiative_student_group", { p_initiative_id: initiativeId });
      if (error) throw error;
      return (data ?? []) as MyStudent[];
    },
    enabled: Boolean(selectedId || (query.data ?? [])[0]?.id),
    staleTime: 15_000,
  });

  const selected = useMemo(
    () => (query.data ?? []).find((item) => item.id === selectedId) ?? (query.data ?? [])[0],
    [query.data, selectedId],
  );

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["initiative-teams"] });
    await qc.invalidateQueries({ queryKey: ["initiative-students"] });
    await qc.invalidateQueries({ queryKey: ["my-initiative-students"] });
  };

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).rpc("create_initiative", {
        p_title: title.trim(),
        p_slogan: slogan.trim() || null,
        p_idea: idea.trim() || null,
        p_general_goal: generalGoal.trim() || null,
        p_objectives: lines(objectives),
        p_mechanism: lines(mechanism),
        p_expected_results: lines(results),
        p_success_indicators: indicators.trim() || null,
        p_starts_at: null,
        p_ends_at: null,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setShowCreate(false);
      await refresh();
      toast.success("تم إنشاء المبادرة والفريق.");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const invite = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("اختر المبادرة أولًا");
      const { data, error } = await (supabase as any).rpc("create_initiative_invite", {
        p_initiative_id: selected.id,
        p_role_title: inviteRole.trim() || "عضو المبادرة",
        p_tasks: lines(inviteTasks),
        p_school_role: "teacher",
        p_permissions: {
          "dashboard.view": true,
          "students.view": true,
          "attendance.view": true,
          "messages.view": true,
          "messages.send": true,
          "tasks.view": true,
        },
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
      toast.success("تم إنشاء رابط عضو واحد وجهاز واحد.");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const setMember = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "rejected" | "suspended" }) => {
      const { error } = await (supabase as any).rpc("set_initiative_member_status", { p_member_id: id, p_status: status });
      if (error) throw error;
    },
    onSuccess: async () => {
      await refresh();
      toast.success("تم تحديث عضوية المبادرة.");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const assignStudents = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("اختر المبادرة أولًا");
      if (!assignMemberId) throw new Error("اختر عضو الفريق");
      const { error } = await (supabase as any).rpc("assign_initiative_students", {
        p_initiative_id: selected.id, p_initiative_member_id: assignMemberId, p_student_ids: selectedStudentIds,
      });
      if (error) throw error;
    },
    onSuccess: async () => { await refresh(); toast.success("تم حفظ توزيع الطلاب على عضو المبادرة."); },
    onError: (e) => toast.error((e as Error).message),
  });

  const saveFollowup = useMutation({
    mutationFn: async () => {
      if (!selected || !followStudent) throw new Error("اختر الطالب");
      const { error } = await (supabase as any).rpc("save_initiative_student_followup", {
        p_initiative_id: selected.id, p_student_id: followStudent.student_id, p_week_start: weekStart,
        p_attendance_status: attendanceStatus, p_punctuality_status: punctualityStatus, p_behavior_status: behaviorStatus,
        p_homework_status: homeworkStatus, p_academic_status: academicStatus, p_meeting_held: meetingHeld,
        p_family_contacted: familyContacted, p_strengths: strengths || null, p_concerns: concerns || null,
        p_advice: advice || null, p_next_action: nextAction || null, p_notes: followNotes || null,
      });
      if (error) throw error;
    },
    onSuccess: async () => { setFollowStudent(null); await refresh(); toast.success("تم حفظ المتابعة الأسبوعية للطالب."); },
    onError: (e) => toast.error((e as Error).message),
  });

  const addUpdate = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("اختر المبادرة أولًا");
      const { error } = await (supabase as any).rpc("add_initiative_update", {
        p_initiative_id: selected.id,
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
      await refresh();
      toast.success("تم حفظ تحديث الإنجاز.");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  function applyFatherTemplate() {
    setTitle(FATHER_MENTOR.title);
    setSlogan(FATHER_MENTOR.slogan);
    setIdea(FATHER_MENTOR.idea);
    setGeneralGoal(FATHER_MENTOR.generalGoal);
    setObjectives(FATHER_MENTOR.objectives.join("\n"));
    setMechanism(FATHER_MENTOR.mechanism.join("\n"));
    setResults(FATHER_MENTOR.results.join("\n"));
    setIndicators(FATHER_MENTOR.indicators);
    setShowCreate(true);
  }

  return (
    <div dir="rtl" className="space-y-5">
      <section className="rounded-3xl border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black text-primary">الفرق والمبادرات</p>
            <h1 className="mt-1 text-2xl font-black">فرق المبادرات المدرسية</h1>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              أنشئ مبادرة، حدد أعمال أعضائها، ثم أرسل لكل عضو رابطًا خاصًا ينضم منه إلى الفريق بصلاحياته ومهامه المحددة.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void query.refetch()}><RefreshCw className="size-4" /> تحديث</Button>
            <Button variant="outline" onClick={applyFatherTemplate}><Sparkles className="size-4" /> نموذج الأب الناصح</Button>
            <Button onClick={() => setShowCreate((v) => !v)}><Plus className="size-4" /> مبادرة جديدة</Button>
          </div>
        </div>
      </section>

      {showCreate && (
        <section className="rounded-3xl border bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="font-black">بيانات المبادرة</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div><Label>اسم المبادرة</Label><Input className="mt-2" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div><Label>الشعار</Label><Input className="mt-2" value={slogan} onChange={(e) => setSlogan(e.target.value)} /></div>
            <div className="lg:col-span-2"><Label>فكرة المبادرة</Label><Textarea className="mt-2 min-h-28" value={idea} onChange={(e) => setIdea(e.target.value)} /></div>
            <div className="lg:col-span-2"><Label>الهدف العام</Label><Textarea className="mt-2" value={generalGoal} onChange={(e) => setGeneralGoal(e.target.value)} /></div>
            <div><Label>الأهداف — هدف في كل سطر</Label><Textarea className="mt-2 min-h-40" value={objectives} onChange={(e) => setObjectives(e.target.value)} /></div>
            <div><Label>آلية التنفيذ — خطوة في كل سطر</Label><Textarea className="mt-2 min-h-40" value={mechanism} onChange={(e) => setMechanism(e.target.value)} /></div>
            <div><Label>النتائج المرجوة — نتيجة في كل سطر</Label><Textarea className="mt-2 min-h-36" value={results} onChange={(e) => setResults(e.target.value)} /></div>
            <div><Label>مؤشرات قياس النجاح</Label><Textarea className="mt-2 min-h-36" value={indicators} onChange={(e) => setIndicators(e.target.value)} /></div>
          </div>
          <div className="mt-4 flex justify-end"><Button disabled={!title.trim() || create.isPending} onClick={() => create.mutate()}><ShieldCheck className="size-4" /> إنشاء المبادرة</Button></div>
        </section>
      )}

      {query.isLoading ? (
        <div className="rounded-3xl border p-8 text-center text-sm text-muted-foreground">جارٍ تحميل المبادرات...</div>
      ) : (query.data ?? []).length === 0 ? (
        <div className="rounded-3xl border border-dashed p-8 text-center text-sm text-muted-foreground">لا توجد مبادرات بعد. استخدم «نموذج الأب الناصح» أو أنشئ مبادرة جديدة.</div>
      ) : (
        <>
          <section className="rounded-3xl border bg-card p-4">
            <div className="flex flex-wrap gap-2">
              {(query.data ?? []).map((item) => (
                <Button key={item.id} variant={selected?.id === item.id ? "default" : "outline"} size="sm" onClick={() => setSelectedId(item.id)}>
                  {item.title}
                </Button>
              ))}
            </div>
          </section>

          {selected && (
            <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
              <div className="space-y-5">
                <section className="rounded-3xl border bg-card p-5 shadow-[var(--shadow-card)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black text-primary">المبادرة الحالية</p>
                      <h2 className="mt-1 text-2xl font-black">{selected.title}</h2>
                      {selected.slogan && <p className="mt-2 font-bold text-primary">{selected.slogan}</p>}
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">{selected.latest_progress || 0}% إنجاز</span>
                  </div>
                  {selected.idea && <p className="mt-4 text-sm leading-7 text-muted-foreground">{selected.idea}</p>}
                  {selected.general_goal && <div className="mt-4 rounded-2xl bg-muted/20 p-4"><p className="text-xs font-black">الهدف العام</p><p className="mt-2 text-sm leading-7">{selected.general_goal}</p></div>}
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <Info title="الأهداف" items={selected.objectives} />
                    <Info title="آلية التنفيذ" items={selected.mechanism} />
                    <Info title="النتائج المرجوة" items={selected.expected_results} />
                  </div>
                  {selected.success_indicators && <div className="mt-4 rounded-2xl border p-4"><p className="text-xs font-black">مؤشرات قياس النجاح</p><p className="mt-2 text-sm leading-7 text-muted-foreground">{selected.success_indicators}</p></div>}
                </section>

                <section className="rounded-3xl border bg-card p-5">
                  <div className="flex items-center gap-2"><UsersRound className="size-5 text-primary" /><h2 className="font-black">أعضاء الفريق</h2></div>
                  <div className="mt-4 space-y-2">
                    {selected.members.map((member) => (
                      <article key={member.id} className="rounded-2xl border p-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-black">{member.display_name}</p>
                            <p className="mt-1 text-xs text-primary">{member.role_title}</p>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {(member.assigned_tasks ?? []).map((task) => <span key={task} className="rounded-full bg-muted px-2 py-1 text-[10px]">{task}</span>)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground">{member.status === "active" ? "فعال" : member.status === "pending" ? "بانتظار الاعتماد" : member.status}</span>
                            {selected.is_manager && member.status === "pending" && <Button size="sm" onClick={() => setMember.mutate({ id: member.id, status: "active" })}><UserCheck className="size-4" /> اعتماد</Button>}
                            {selected.is_manager && member.status === "active" && <Button size="sm" variant="outline" onClick={() => setMember.mutate({ id: member.id, status: "suspended" })}>تعليق</Button>}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                {selected.is_manager && (
                  <section className="rounded-3xl border bg-card p-5">
                    <div className="flex items-center gap-2"><Users className="size-5 text-primary" /><h2 className="font-black">توزيع الطلاب على أعضاء المبادرة</h2></div>
                    <p className="mt-2 text-xs leading-6 text-muted-foreground">اختر عضوًا فعالًا، ثم حدد الطلاب المسؤول عن متابعتهم. لا يمكن إسناد الطالب لأكثر من عضو في المبادرة في الوقت نفسه.</p>
                    <div className="mt-4 grid gap-3 md:grid-cols-[240px_1fr]">
                      <div>
                        <Label>عضو الفريق</Label>
                        <select className="mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm" value={assignMemberId} onChange={(e) => {
                          const memberId = e.target.value; setAssignMemberId(memberId);
                          setSelectedStudentIds((managerStudentsQuery.data ?? []).filter((s) => s.assigned_member_id === memberId).map((s) => s.id));
                        }}>
                          <option value="">اختر العضو</option>
                          {selected.members.filter((m) => m.status === "active").map((m) => <option key={m.id} value={m.id}>{m.display_name} — {m.role_title}</option>)}
                        </select>
                      </div>
                      <div>
                        <Label>البحث في الطلاب</Label>
                        <Input className="mt-2" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} placeholder="الاسم أو الرقم أو الصف أو الفصل" />
                      </div>
                    </div>
                    <div className="mt-3 max-h-80 space-y-1 overflow-y-auto rounded-2xl border bg-muted/10 p-2">
                      {(managerStudentsQuery.data ?? []).filter((s) => {
                        const q = studentSearch.trim().toLowerCase(); if (!q) return true;
                        return [s.full_name,s.student_no,s.stage,s.grade,s.classroom].filter(Boolean).join(" ").toLowerCase().includes(q);
                      }).map((s) => {
                        const checked = selectedStudentIds.includes(s.id);
                        return <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-xl border bg-background px-3 py-2 text-xs">
                          <input type="checkbox" checked={checked} onChange={() => setSelectedStudentIds((ids) => checked ? ids.filter((id) => id !== s.id) : [...ids, s.id])} />
                          <span className="min-w-0 flex-1"><strong className="block truncate">{s.full_name}</strong><span className="text-[10px] text-muted-foreground">{[s.stage,s.grade,s.classroom].filter(Boolean).join(" · ")}{s.student_no ? ` · ${s.student_no}` : ""}</span></span>
                          {s.assigned_member_name && <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">{s.assigned_member_name}</span>}
                        </label>;
                      })}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{selectedStudentIds.length} طالب محدد</span><Button disabled={!assignMemberId || assignStudents.isPending} onClick={() => assignStudents.mutate()}>حفظ التوزيع</Button></div>
                  </section>
                )}

                <section className="rounded-3xl border bg-card p-5">
                  <div className="flex items-center gap-2"><CalendarCheck className="size-5 text-primary" /><h2 className="font-black">طلابي في المبادرة والمتابعة الأسبوعية</h2></div>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">يظهر لكل عضو فقط الطلاب المسندون إليه في المبادرة.</p>
                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    {(myStudentsQuery.data ?? []).length === 0 ? <p className="rounded-2xl border border-dashed p-5 text-center text-xs text-muted-foreground md:col-span-2">لا يوجد طلاب مسندون لك حاليًا.</p> :
                    (myStudentsQuery.data ?? []).map((s) => <article key={s.student_id} className="rounded-2xl border p-3">
                      <p className="font-black">{s.full_name}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{[s.stage,s.grade,s.classroom].filter(Boolean).join(" · ")}</p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground">{s.last_followup ? "لديه متابعة سابقة" : "لم تسجل متابعة بعد"}</span>
                        <Button size="sm" onClick={() => { setFollowStudent(s); setStrengths(""); setConcerns(""); setAdvice(""); setNextAction(""); setFollowNotes(""); }}>متابعة أسبوعية</Button>
                      </div>
                    </article>)}
                  </div>
                </section>

                <section className="rounded-3xl border bg-card p-5">
                  <div className="flex items-center gap-2"><ClipboardList className="size-5 text-primary" /><h2 className="font-black">سجل الإنجاز والمتابعة</h2></div>
                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_110px]">
                    <div><Label>عنوان التحديث</Label><Input className="mt-2" value={updateTitle} onChange={(e) => setUpdateTitle(e.target.value)} placeholder="مثال: متابعة الأسبوع الأول" /></div>
                    <div><Label>نسبة الإنجاز</Label><Input className="mt-2" type="number" min="0" max="100" value={progress} onChange={(e) => setProgress(e.target.value)} /></div>
                    <div className="md:col-span-2"><Label>التفاصيل والملاحظات</Label><Textarea className="mt-2" value={updateDetails} onChange={(e) => setUpdateDetails(e.target.value)} /></div>
                  </div>
                  <Button className="mt-3" disabled={!updateTitle.trim() || addUpdate.isPending} onClick={() => addUpdate.mutate()}>حفظ التحديث</Button>
                  <div className="mt-5 space-y-2">
                    {(selected.updates ?? []).map((u) => (
                      <article key={u.id} className="rounded-2xl border p-3">
                        <div className="flex justify-between gap-3"><p className="text-sm font-black">{u.title}</p><span className="text-xs font-black text-primary">{u.progress_percent ?? "—"}%</span></div>
                        {u.details && <p className="mt-2 text-xs leading-6 text-muted-foreground">{u.details}</p>}
                        <p className="mt-2 text-[10px] text-muted-foreground">{u.created_by_name} · {new Date(u.created_at).toLocaleString("ar-SA")}</p>
                      </article>
                    ))}
                  </div>
                </section>
              </div>

              <aside className="space-y-5">
                {selected.is_manager && (
                  <section className="rounded-3xl border bg-card p-5 shadow-[var(--shadow-card)]">
                    <div className="flex items-center gap-2"><Send className="size-5 text-primary" /><h2 className="font-black">دعوة عضو للمبادرة</h2></div>
                    <p className="mt-2 text-xs leading-6 text-muted-foreground">الرابط يعمل مرة واحدة وعلى جهاز واحد، ويعرض للعضو دوره وأعماله قبل الانضمام.</p>
                    <div className="mt-4 space-y-3">
                      <div><Label>دور العضو داخل المبادرة</Label><Input className="mt-2" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} /></div>
                      <div><Label>الأعمال المحددة — عمل في كل سطر</Label><Textarea className="mt-2 min-h-40" value={inviteTasks} onChange={(e) => setInviteTasks(e.target.value)} /></div>
                      <Button className="w-full" onClick={() => invite.mutate()} disabled={invite.isPending}><Send className="size-4" /> إنشاء رابط الانضمام</Button>
                      {inviteUrl && (
                        <div className="rounded-2xl border bg-muted/20 p-3">
                          <p className="break-all text-[11px] leading-5">{inviteUrl}</p>
                          <Button className="mt-2 w-full" variant="outline" size="sm" onClick={async () => { await navigator.clipboard.writeText(inviteUrl); toast.success("تم نسخ الرابط"); }}><Copy className="size-4" /> نسخ الرابط</Button>
                        </div>
                      )}
                    </div>
                  </section>
                )}
                {selected.my_membership && (
                  <section className="rounded-3xl border bg-card p-5">
                    <p className="text-xs font-black text-primary">دوري في المبادرة</p>
                    <p className="mt-2 text-lg font-black">{selected.my_membership.role_title}</p>
                    <div className="mt-3 space-y-2">
                      {(selected.my_membership.assigned_tasks ?? []).map((task) => <div key={task} className="rounded-xl border px-3 py-2 text-xs">{task}</div>)}
                    </div>
                  </section>
                )}
              </aside>
            </div>
          )}
        </>
      )}
      {followStudent && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-3" onClick={() => setFollowStudent(null)}>
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border bg-background p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black text-primary">المتابعة الأسبوعية</p><h2 className="mt-1 text-xl font-black">{followStudent.full_name}</h2></div><Button variant="ghost" size="sm" onClick={() => setFollowStudent(null)}>إغلاق</Button></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div><Label>بداية الأسبوع</Label><Input className="mt-2" type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} /></div>
              <StatusSelect label="الحضور" value={attendanceStatus} onChange={setAttendanceStatus} options={["منتظم","غياب متكرر","يحتاج متابعة"]} />
              <StatusSelect label="الانضباط في الوقت" value={punctualityStatus} onChange={setPunctualityStatus} options={["ملتزم","تأخر محدود","تأخر متكرر"]} />
              <StatusSelect label="السلوك" value={behaviorStatus} onChange={setBehaviorStatus} options={["إيجابي","مستقر","يحتاج تحسين","يحتاج تدخل"]} />
              <StatusSelect label="الواجبات" value={homeworkStatus} onChange={setHomeworkStatus} options={["ملتزم","متفاوت","غير ملتزم"]} />
              <StatusSelect label="المستوى الدراسي" value={academicStatus} onChange={setAcademicStatus} options={["متحسن","مستقر","متراجع","يحتاج دعم"]} />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 rounded-xl border p-3 text-xs"><input type="checkbox" checked={meetingHeld} onChange={(e) => setMeetingHeld(e.target.checked)} />تم لقاء الطالب هذا الأسبوع</label>
              <label className="flex items-center gap-2 rounded-xl border p-3 text-xs"><input type="checkbox" checked={familyContacted} onChange={(e) => setFamilyContacted(e.target.checked)} />تم التواصل مع الأسرة</label>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div><Label>نقاط القوة والتحسن</Label><Textarea className="mt-2" value={strengths} onChange={(e) => setStrengths(e.target.value)} /></div>
              <div><Label>الصعوبات أو جوانب القلق</Label><Textarea className="mt-2" value={concerns} onChange={(e) => setConcerns(e.target.value)} /></div>
              <div><Label>النصح والتوجيه المقدم</Label><Textarea className="mt-2" value={advice} onChange={(e) => setAdvice(e.target.value)} /></div>
              <div><Label>الإجراء أو الهدف للأسبوع القادم</Label><Textarea className="mt-2" value={nextAction} onChange={(e) => setNextAction(e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>ملاحظات إضافية</Label><Textarea className="mt-2" value={followNotes} onChange={(e) => setFollowNotes(e.target.value)} /></div>
            </div>
            <div className="mt-4 flex justify-end"><Button disabled={saveFollowup.isPending} onClick={() => saveFollowup.mutate()}><ShieldCheck className="size-4" /> حفظ المتابعة الأسبوعية</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <div><Label>{label}</Label><select className="mt-2 h-10 w-full rounded-xl border bg-background px-3 text-xs" value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>;
}

function Info({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border p-4">
      <p className="text-xs font-black">{title}</p>
      <ul className="mt-2 space-y-2 text-xs leading-6 text-muted-foreground">
        {(items ?? []).map((item, index) => <li key={index}>• {item}</li>)}
      </ul>
    </div>
  );
}
