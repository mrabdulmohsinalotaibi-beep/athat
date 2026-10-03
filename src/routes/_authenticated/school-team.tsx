import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Check, Clipboard, KeyRound, RefreshCw, School, Send, Settings2, Share2, ShieldCheck, UserCheck, Users } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PERMISSION_GROUPS,
  SCHOOL_ROLES,
  permissionsForRole,
  roleLabel,
  type DataScope,
  type SchoolRole,
} from "@/lib/team-permissions";

export const Route = createFileRoute("/_authenticated/school-team")({
  head: () => ({
    meta: [
      { title: "فريق المدرسة | الذات" },
      { name: "description", content: "ربط حسابات المدرسة وإدارة الأدوار وطلبات الانضمام." },
    ],
  }),
  component: SchoolTeamPage,
});

type Role = SchoolRole;
type MemberStatus = "pending" | "active" | "rejected" | "suspended";

type SchoolContext = {
  membership: null | {
    id: string;
    school_id: string;
    role: Role;
    member_status: MemberStatus;
    is_admin: boolean;
    permissions?: Record<string, boolean> | null;
    data_scope?: DataScope | null;
    linked_student_ids?: string[];
  };
  school: null | {
    id: string;
    name: string;
    education_dept?: string | null;
    education_office?: string | null;
  };
  members: Array<{
    id: string;
    user_id: string;
    display_name?: string | null;
    role: Role;
    member_status: MemberStatus;
    is_admin: boolean;
    permissions?: Record<string, boolean> | null;
    data_scope?: DataScope | null;
    linked_student_ids?: string[];
    joined_at?: string | null;
    created_at: string;
  }>;
  join_code?: string | null;
};


function SchoolTeamPage() {
  const queryClient = useQueryClient();
  const [joinCode, setJoinCode] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [educationDept, setEducationDept] = useState("");
  const [educationOffice, setEducationOffice] = useState("");
  const [newSchoolRole, setNewSchoolRole] = useState<Role>("counselor");
  const [pendingRoles, setPendingRoles] = useState<Record<string, Role>>({});
  const [inviteToken, setInviteToken] = useState("");
  const [inviteBuilderOpen, setInviteBuilderOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<Role>("teacher");
  const [invitePermissions, setInvitePermissions] = useState<Record<string, boolean>>(permissionsForRole("teacher"));
  const [inviteScope, setInviteScope] = useState<DataScope>({ type: "assigned" });
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteStudentIds, setInviteStudentIds] = useState<string[]>([]);
  const [editingMemberId, setEditingMemberId] = useState("");
  const [editRole, setEditRole] = useState<Role>("teacher");
  const [editPermissions, setEditPermissions] = useState<Record<string, boolean>>({});
  const [editScope, setEditScope] = useState<DataScope>({ type: "school" });
  const [editAdmin, setEditAdmin] = useState(false);
  const [editStudentIds, setEditStudentIds] = useState<string[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invitedCode = params.get("join");
    const invite = params.get("invite");
    if (invitedCode) setJoinCode(invitedCode.trim().toUpperCase());
    if (invite) setInviteToken(invite.trim());
  }, []);

  function buildInviteUrl(code: string) {
    return `${window.location.origin}/school-team?join=${encodeURIComponent(code)}`;
  }

  async function copyInvite(code: string) {
    await navigator.clipboard.writeText(buildInviteUrl(code));
    toast.success("تم نسخ رابط دعوة فريق المدرسة.");
  }

  async function shareInvite(code: string, name: string) {
    const url = buildInviteUrl(code);
    const text = `دعوة للانضمام إلى فريق ${name} في الذات | ATHAT. افتح الرابط وسجّل الدخول ثم أرسل طلب الانضمام:\n${url}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "دعوة فريق المدرسة", text, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    window.location.href = `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  const permissionStudentsQuery = useQuery({
    queryKey: ["school-permission-students"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_school_permission_students");
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        full_name: string | null;
        student_no: string | null;
        stage: string | null;
        grade: string | null;
        classroom: string | null;
        guardian_name: string | null;
      }>;
    },
    enabled: false,
    staleTime: 60_000,
  });

  const contextQuery = useQuery({
    queryKey: ["school-team-context"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_my_school_context");
      if (error) throw error;
      return data as SchoolContext;
    },
    staleTime: 15_000,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["school-team-context"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard-live-v2"] });
    await queryClient.invalidateQueries({ queryKey: ["app-alert-summary"] });
    await queryClient.invalidateQueries({ queryKey: ["school-access-context"] });
  };

  const createSchool = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).rpc("create_school_workspace", {
        p_name: schoolName.trim(),
        p_education_dept: educationDept.trim() || null,
        p_education_office: educationOffice.trim() || null,
        p_role: newSchoolRole,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await refresh();
      toast.success("تم إنشاء مساحة المدرسة وربط حسابك بها.");
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const requestJoin = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).rpc("request_join_school", {
        p_join_code: joinCode.trim(),
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await refresh();
      toast.success("تم إرسال طلب الانضمام إلى إدارة المدرسة.");
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const requestInviteJoin = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).rpc("request_join_school_invite", {
        p_token: inviteToken.trim(),
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await refresh();
      toast.success("تم إرسال طلب الانضمام بالصلاحيات المحددة في الدعوة.");
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const createInvite = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any).rpc("create_school_invite", {
        p_role: inviteRole,
        p_permissions: invitePermissions,
        p_data_scope: inviteScope,
        p_expires_days: 7,
        p_max_uses: 1,
        p_student_ids: inviteStudentIds,
      });
      if (error) throw error;
      return String(data ?? "");
    },
    onSuccess: (token) => {
      const url = `${window.location.origin}/school-team?invite=${encodeURIComponent(token)}`;
      setInviteUrl(url);
      toast.success("تم إنشاء دعوة مخصصة. أرسل الرابط للشخص المطلوب.");
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const updateAccess = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc("update_school_member_access", {
        p_member_id: id,
        p_role: editRole,
        p_permissions: editPermissions,
        p_data_scope: editScope,
        p_is_admin: editAdmin,
      });
      if (error) throw error;

      const relation =
        editScope.type === "self" ? "self" :
        editScope.type === "children" ? "child" : "assigned";

      const { error: linksError } = await (supabase as any).rpc("set_school_member_student_links", {
        p_member_id: id,
        p_student_ids: ["assigned", "self", "children"].includes(editScope.type) ? editStudentIds : [],
        p_relation: relation,
      });
      if (linksError) throw linksError;
    },
    onSuccess: async () => {
      setEditingMemberId("");
      await refresh();
      toast.success("تم حفظ الدور والصلاحيات ونطاق البيانات.");
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const approve = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: Role }) => {
      const { error } = await (supabase as any).rpc("approve_school_member", {
        p_member_id: id,
        p_role: role,
        p_is_admin: role === "principal" || role === "vice_principal",
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await refresh();
      toast.success("تم اعتماد العضو وصلاحية دوره.");
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const changeStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "rejected" | "suspended" | "active" }) => {
      const { error } = await (supabase as any).rpc("set_school_member_status", {
        p_member_id: id,
        p_status: status,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await refresh();
      toast.success("تم تحديث حالة العضو.");
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const rotateCode = useMutation({
    mutationFn: async (schoolId: string) => {
      const { data, error } = await (supabase as any).rpc("rotate_school_join_code", {
        p_school_id: schoolId,
      });
      if (error) throw error;
      return String(data ?? "");
    },
    onSuccess: async (code) => {
      await refresh();
      toast.success(`تم إنشاء رمز جديد: ${code}`);
    },
    onError: (error) => toast.error((error as Error).message),
  });

  if (contextQuery.isLoading) {
    return <div dir="rtl" className="rounded-2xl border border-[#D9C0A3]/35 bg-[#FFFDF9] p-8 text-center text-sm text-muted-foreground">جارٍ تحميل فريق المدرسة...</div>;
  }

  if (contextQuery.isError) {
    return (
      <div dir="rtl" className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5">
        <p className="font-black text-destructive">تعذّر تحميل مساحة المدرسة.</p>
        <Button className="mt-3" variant="outline" onClick={() => void contextQuery.refetch()}>
          <RefreshCw className="size-4" /> إعادة المحاولة
        </Button>
      </div>
    );
  }

  const context = contextQuery.data;
  const membership = context?.membership;
  const school = context?.school;

  if (!membership || !school) {
    return (
      <div dir="rtl" className="space-y-5">
        <section className="rounded-2xl border border-[#D9C0A3]/35 bg-[#FFFDF9] p-5">
          <div className="flex items-center gap-2 text-primary"><School className="size-5" /><span className="text-xs font-black">العمل المدرسي المشترك</span></div>
          <h1 className="mt-2 text-2xl font-black">اربط حسابك بمدرستك</h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">أنشئ مساحة للمدرسة أو أدخل الرمز الذي استلمته من مسؤول المدرسة.</p>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-[#D9C0A3]/35 bg-[#FFFDF9] p-5 shadow-[var(--shadow-card)]">
            <h2 className="font-black">إنشاء مساحة مدرسة</h2>
            <div className="mt-4 space-y-3">
              <div><Label>اسم المدرسة</Label><Input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} /></div>
              <div><Label>إدارة التعليم</Label><Input value={educationDept} onChange={(e) => setEducationDept(e.target.value)} /></div>
              <div><Label>مكتب التعليم</Label><Input value={educationOffice} onChange={(e) => setEducationOffice(e.target.value)} /></div>
              <div>
                <Label>دورك في المدرسة</Label>
                <select
                  value={newSchoolRole}
                  onChange={(e) => setNewSchoolRole(e.target.value as Role)}
                  className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  {SCHOOL_ROLES.filter((role) => role.value !== "observer" && role.value !== "student" && role.value !== "parent" && role.value !== "custom").map((role) => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
                  سيحدد هذا الدور واجهتك وصلاحياتك داخل الذات | ATHAT. منشئ مساحة المدرسة يبقى مسؤول إدارة الفريق.
                </p>
              </div>
              <Button disabled={!schoolName.trim() || createSchool.isPending} onClick={() => createSchool.mutate()}>
                <School className="size-4" /> إنشاء وربط الحساب
              </Button>
            </div>
          </div>
          <div className="rounded-3xl border border-[#D9C0A3]/35 bg-[#FFFDF9] p-5 shadow-[var(--shadow-card)]">
            <h2 className="font-black">الانضمام إلى مدرسة</h2>
            <p className="mt-1 text-xs text-muted-foreground">سيصل طلبك لمسؤول المدرسة للموافقة وتحديد دورك.</p>
            <div className="mt-4 space-y-3">
              {inviteToken && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3">
                  <p className="text-xs font-black text-primary">دعوة مخصصة جاهزة</p>
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">هذه الدعوة تحمل الدور والصلاحيات التي حددها مسؤول المدرسة لك.</p>
                  <Button className="mt-3 w-full" disabled={requestInviteJoin.isPending} onClick={() => requestInviteJoin.mutate()}>
                    <UserCheck className="size-4" /> إرسال طلب الانضمام من الدعوة
                  </Button>
                </div>
              )}
              <div><Label>رمز المدرسة</Label><Input dir="ltr" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="XXXXXXXX" /></div>
              <Button disabled={joinCode.trim().length < 4 || requestJoin.isPending} onClick={() => requestJoin.mutate()}>
                <KeyRound className="size-4" /> إرسال طلب الانضمام
              </Button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (membership.member_status === "pending") {
    return (
      <div dir="rtl" className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-6">
        <h1 className="text-xl font-black">طلب الانضمام قيد المراجعة</h1>
        <p className="mt-2 text-sm text-muted-foreground">المدرسة: {school.name}. سيظهر فريق المدرسة بعد اعتماد الطلب من المسؤول.</p>
      </div>
    );
  }

  const members = context?.members ?? [];
  const pending = members.filter((member) => member.member_status === "pending");
  const active = members.filter((member) => member.member_status === "active");
  const suspended = members.filter((member) => member.member_status === "suspended");

  return (
    <div dir="rtl" className="space-y-5">
      <section className="rounded-3xl border border-[#D9C0A3]/35 bg-[#FFFDF9] p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary"><ShieldCheck className="size-5" /><span className="text-xs font-black">مساحة المدرسة</span></div>
            <h1 className="mt-2 text-2xl font-black">{school.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{[school.education_dept, school.education_office].filter(Boolean).join(" · ")}</p>
            <p className="mt-2 text-xs">دورك: <strong>{roleLabel(membership.role)}</strong>{membership.is_admin ? " · مسؤول إدارة الفريق" : ""}</p>
          </div>
          <div className="rounded-xl border bg-muted/30 px-4 py-3 text-center">
            <p className="text-2xl font-black text-primary">{active.length}</p>
            <p className="text-[10px] text-muted-foreground">عضو نشط</p>
          </div>
        </div>
      </section>

      {membership.is_admin && context?.join_code && (
        <section className="rounded-3xl border border-[#D9C0A3]/35 bg-[#FFFDF9] p-4 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black text-muted-foreground">رمز ربط حسابات المدرسة</p>
              <div className="mt-1 flex items-center gap-2">
                <code dir="ltr" className="rounded-lg bg-muted px-3 py-2 text-lg font-black tracking-[0.2em]">{context.join_code}</code>
                <Button
                  size="icon"
                  variant="outline"
                  title="نسخ الرمز"
                  onClick={async () => {
                    await navigator.clipboard.writeText(context.join_code || "");
                    toast.success("تم نسخ رمز المدرسة.");
                  }}
                >
                  <Clipboard className="size-4" />
                </Button>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">أرسل الرمز للموظف فقط، ثم اعتمد طلبه وحدد دوره من هنا.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => {
                setInviteBuilderOpen((value) => !value);
                setInviteUrl("");
                setInviteStudentIds([]);
                void permissionStudentsQuery.refetch();
              }}>
                <Share2 className="size-4" /> دعوة عضو بصلاحيات
              </Button>
              <Button variant="outline" onClick={() => void copyInvite(context.join_code || "")}>
                <Send className="size-4" /> نسخ رابط الدعوة
              </Button>
              <Button variant="outline" disabled={rotateCode.isPending} onClick={() => rotateCode.mutate(school.id)}>
                <RefreshCw className="size-4" /> تغيير الرمز
              </Button>
            </div>
          </div>
        </section>
      )}

      {membership.is_admin && inviteBuilderOpen && (
        <section className="rounded-3xl border border-primary/20 bg-[#FFFDF9] p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black text-primary">دعوة مخصصة</p>
              <h2 className="mt-1 text-lg font-black">الدور + الصلاحيات + نطاق البيانات</h2>
              <p className="mt-1 text-xs text-muted-foreground">الرابط الناتج لشخص واحد وينتهي تلقائيًا بعد 7 أيام.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setInviteBuilderOpen(false)}>إغلاق</Button>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
            <div className="space-y-3">
              <div>
                <Label>الدور الأساسي</Label>
                <select
                  value={inviteRole}
                  onChange={(event) => {
                    const role = event.target.value as Role;
                    setInviteRole(role);
                    setInvitePermissions(permissionsForRole(role));
                    setInviteStudentIds([]);
                    setInviteScope({ type: role === "student" ? "self" : role === "parent" ? "children" : role === "teacher" ? "assigned" : "school" });
                  }}
                  className="mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm"
                >
                  {SCHOOL_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                </select>
              </div>
              <ScopeEditor
                value={inviteScope}
                onChange={(scope) => {
                  setInviteScope(scope);
                  if (!["assigned", "self", "children"].includes(scope.type)) setInviteStudentIds([]);
                }}
                students={permissionStudentsQuery.data ?? []}
                selectedStudentIds={inviteStudentIds}
                onSelectedStudentIdsChange={setInviteStudentIds}
              />
              <Button className="w-full" disabled={createInvite.isPending} onClick={() => createInvite.mutate()}>
                <KeyRound className="size-4" /> إنشاء رابط الدعوة
              </Button>
              {inviteUrl && (
                <div className="rounded-2xl border bg-muted/20 p-3">
                  <p className="text-[11px] font-black">الرابط جاهز</p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={async () => {
                        await navigator.clipboard.writeText(inviteUrl);
                        toast.success("تم نسخ رابط الدعوة.");
                      }}
                    >
                      <Clipboard className="size-4" /> نسخ
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        const text = `دعوة للانضمام إلى فريق ${school.name} في الذات | ATHAT\n${inviteUrl}`;
                        if (navigator.share) void navigator.share({ title: "دعوة فريق المدرسة", text, url: inviteUrl }).catch(() => undefined);
                        else window.location.href = `https://wa.me/?text=${encodeURIComponent(text)}`;
                      }}
                    >
                      <Send className="size-4" /> مشاركة
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <PermissionEditor permissions={invitePermissions} onChange={setInvitePermissions} />
          </div>
        </section>
      )}

      {membership.is_admin && pending.length > 0 && (
        <section className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
          <div className="mb-3 flex items-center gap-2"><UserCheck className="size-4" /><h2 className="font-black">طلبات انضمام تنتظر الاعتماد</h2></div>
          <div className="grid gap-2">
            {pending.map((member) => {
              const selectedRole = pendingRoles[member.id] ?? member.role ?? "teacher";
              return (
                <div key={member.id} className="flex flex-col gap-3 rounded-xl border bg-background p-3 xl:flex-row xl:items-center xl:justify-between">
                  <div><p className="font-black">{member.display_name || "عضو جديد"}</p><p className="text-[11px] text-muted-foreground">طلب جديد للانضمام</p></div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={selectedRole}
                      onChange={(e) => setPendingRoles((current) => ({ ...current, [member.id]: e.target.value as Role }))}
                      className="h-9 rounded-md border bg-background px-3 text-xs"
                    >
                      {SCHOOL_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                    </select>
                    <Button size="sm" onClick={() => approve.mutate({ id: member.id, role: selectedRole })}><Check className="size-4" /> اعتماد</Button>
                    <Button size="sm" variant="ghost" onClick={() => changeStatus.mutate({ id: member.id, status: "rejected" })}>رفض</Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-[#D9C0A3]/35 bg-[#FFFDF9] p-4 shadow-[var(--shadow-card)]">
        <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><Users className="size-4 text-primary" /><h2 className="font-black">فريق المدرسة</h2></div><span className="text-xs text-muted-foreground">{active.length} عضو</span></div>
        <div className="grid gap-2 xl:grid-cols-2 xl:grid-cols-3">
          {active.map((member) => (
            <article key={member.id} className="rounded-xl border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{member.display_name || "عضو المدرسة"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{roleLabel(member.role)}</p>
                </div>
                {member.is_admin && <span className="rounded-full bg-[#E4ECDF] px-2 py-1 text-[10px] font-black text-primary">مسؤول</span>}
              </div>
              {membership.is_admin && member.id !== membership.id && (
                <div className="mt-3 space-y-2 border-t pt-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingMemberId(editingMemberId === member.id ? "" : member.id);
                        setEditRole(member.role);
                        setEditPermissions({ ...permissionsForRole(member.role), ...(member.permissions ?? {}) });
                        setEditScope(member.data_scope ?? { type: member.role === "teacher" ? "assigned" : member.role === "student" ? "self" : member.role === "parent" ? "children" : "school" });
                        setEditStudentIds(member.linked_student_ids ?? []);
                        setEditAdmin(member.is_admin);
                        void permissionStudentsQuery.refetch();
                      }}
                    >
                      <Settings2 className="size-4" /> إدارة الصلاحيات
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => changeStatus.mutate({ id: member.id, status: "suspended" })}>تعليق العضوية</Button>
                  </div>
                  {editingMemberId === member.id && (
                    <div className="mt-3 space-y-4 rounded-2xl border bg-background p-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label>الدور</Label>
                          <select
                            value={editRole}
                            onChange={(event) => {
                              const role = event.target.value as Role;
                              setEditRole(role);
                              setEditPermissions(permissionsForRole(role));
                            }}
                            className="mt-2 h-10 w-full rounded-xl border bg-background px-3 text-xs"
                          >
                            {SCHOOL_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                          </select>
                        </div>
                        <ScopeEditor
                          value={editScope}
                          onChange={(scope) => {
                            setEditScope(scope);
                            if (!["assigned", "self", "children"].includes(scope.type)) setEditStudentIds([]);
                          }}
                          students={permissionStudentsQuery.data ?? []}
                          selectedStudentIds={editStudentIds}
                          onSelectedStudentIdsChange={setEditStudentIds}
                          compact
                        />
                      </div>
                      <label className="flex items-center gap-2 rounded-xl border p-3 text-xs font-bold">
                        <input type="checkbox" checked={editAdmin} onChange={(event) => setEditAdmin(event.target.checked)} />
                        مسؤول إدارة الفريق
                      </label>
                      <PermissionEditor permissions={editPermissions} onChange={setEditPermissions} compact />
                      <div className="flex gap-2">
                        <Button size="sm" disabled={updateAccess.isPending} onClick={() => updateAccess.mutate(member.id)}>حفظ الصلاحيات</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingMemberId("")}>إلغاء</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {membership.is_admin && suspended.length > 0 && (
        <section className="rounded-3xl border border-[#D9C0A3]/35 bg-[#FFFDF9] p-4 shadow-[var(--shadow-card)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-black">عضويات معلقة</h2>
            <span className="text-xs text-muted-foreground">{suspended.length} عضو</span>
          </div>
          <div className="grid gap-2 xl:grid-cols-2 xl:grid-cols-3">
            {suspended.map((member) => (
              <article key={member.id} className="rounded-xl border border-dashed p-3">
                <p className="text-sm font-black">{member.display_name || "عضو المدرسة"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{roleLabel(member.role)}</p>
                <Button className="mt-3" size="sm" variant="outline" onClick={() => changeStatus.mutate({ id: member.id, status: "active" })}>
                  إعادة تفعيل العضوية
                </Button>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-3xl border bg-muted/20 p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          <h2 className="text-sm font-black">صلاحيات الذات | ATHAT الفعلية</h2>
        </div>
        <div className="mt-3 grid gap-2 xl:grid-cols-3">
          <div className="rounded-xl border bg-background p-3">
            <p className="text-xs font-black">الموجه الطلابي</p>
            <p className="mt-1 text-[10px] leading-5 text-muted-foreground">سجلات التوجيه والحالات والجلسات والخطة والبرامج والشواهد، إضافة إلى مهام المدرسة.</p>
          </div>
          <div className="rounded-xl border bg-background p-3">
            <p className="text-xs font-black">المدير والوكيل</p>
            <p className="mt-1 text-[10px] leading-5 text-muted-foreground">إدارة الفريق والمهام والاعتمادات والتقارير المرفوعة لهم، دون فتح ملفات ملفات حالات التوجيه الطلابي الخام.</p>
          </div>
          <div className="rounded-xl border bg-background p-3">
            <p className="text-xs font-black">المعلم والإداري والحارس</p>
            <p className="mt-1 text-[10px] leading-5 text-muted-foreground">مساحة عمل مركزة على المهام المسندة والمراسلات المرتبطة بالدور، دون الوصول لسجلات التوجيه الحساسة.</p>
          </div>
        </div>
        <p className="mt-3 text-[10px] leading-5 text-muted-foreground">
          الحماية مطبقة في الواجهة وقاعدة البيانات معًا؛ كتابة رابط صفحة غير مصرح بها لا تمنح الوصول إلى بياناتها.
        </p>
      </section>
    </div>
  );
}


function ScopeEditor({
  value,
  onChange,
  students,
  selectedStudentIds,
  onSelectedStudentIdsChange,
  compact = false,
}: {
  value: DataScope;
  onChange: (scope: DataScope) => void;
  students: Array<{
    id: string;
    full_name: string | null;
    student_no: string | null;
    stage: string | null;
    grade: string | null;
    classroom: string | null;
    guardian_name: string | null;
  }>;
  selectedStudentIds: string[];
  onSelectedStudentIdsChange: (ids: string[]) => void;
  compact?: boolean;
}) {
  const [studentSearch, setStudentSearch] = useState("");
  const stages = Array.from(new Set(students.map((s) => s.stage).filter(Boolean) as string[])).sort();
  const grades = Array.from(new Set(
    students
      .filter((s) => !value.stage || s.stage === value.stage)
      .map((s) => s.grade)
      .filter(Boolean) as string[],
  )).sort();
  const classrooms = Array.from(new Set(
    students
      .filter((s) => (!value.stage || s.stage === value.stage) && (!value.grade || s.grade === value.grade))
      .map((s) => s.classroom)
      .filter(Boolean) as string[],
  )).sort();

  const search = studentSearch.trim().toLowerCase();
  const visibleStudents = students.filter((student) => {
    if (!search) return true;
    return [student.full_name, student.student_no, student.stage, student.grade, student.classroom, student.guardian_name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search);
  });

  function toggleStudent(id: string) {
    if (value.type === "self") {
      onSelectedStudentIdsChange(selectedStudentIds.includes(id) ? [] : [id]);
      return;
    }
    onSelectedStudentIdsChange(
      selectedStudentIds.includes(id)
        ? selectedStudentIds.filter((item) => item !== id)
        : [...selectedStudentIds, id],
    );
  }

  return (
    <div className="space-y-2">
      <Label>نطاق البيانات</Label>
      <select
        value={value.type}
        onChange={(event) => onChange({ type: event.target.value as DataScope["type"] })}
        className={"w-full rounded-xl border bg-background px-3 text-sm " + (compact ? "h-10" : "h-11")}
      >
        <option value="school">كل المدرسة</option>
        <option value="stage">مرحلة محددة</option>
        <option value="grade">صف محدد</option>
        <option value="classroom">فصل محدد</option>
        <option value="assigned">طلاب محددون / المسندون إليه</option>
        <option value="self">ملف الطالب نفسه فقط</option>
        <option value="children">أبناء ولي الأمر فقط</option>
      </select>

      {value.type === "stage" && (
        <select
          value={value.stage ?? ""}
          onChange={(event) => onChange({ type: "stage", stage: event.target.value })}
          className="h-10 w-full rounded-xl border bg-background px-3 text-xs"
        >
          <option value="">اختر المرحلة</option>
          {stages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
        </select>
      )}

      {value.type === "grade" && (
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            value={value.stage ?? ""}
            onChange={(event) => onChange({ type: "grade", stage: event.target.value, grade: "" })}
            className="h-10 w-full rounded-xl border bg-background px-3 text-xs"
          >
            <option value="">كل المراحل</option>
            {stages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
          </select>
          <select
            value={value.grade ?? ""}
            onChange={(event) => onChange({ ...value, type: "grade", grade: event.target.value })}
            className="h-10 w-full rounded-xl border bg-background px-3 text-xs"
          >
            <option value="">اختر الصف</option>
            {grades.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
          </select>
        </div>
      )}

      {value.type === "classroom" && (
        <div className="grid gap-2 sm:grid-cols-3">
          <select
            value={value.stage ?? ""}
            onChange={(event) => onChange({ type: "classroom", stage: event.target.value, grade: "", classroom: "" })}
            className="h-10 w-full rounded-xl border bg-background px-3 text-xs"
          >
            <option value="">المرحلة</option>
            {stages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
          </select>
          <select
            value={value.grade ?? ""}
            onChange={(event) => onChange({ ...value, type: "classroom", grade: event.target.value, classroom: "" })}
            className="h-10 w-full rounded-xl border bg-background px-3 text-xs"
          >
            <option value="">الصف</option>
            {grades.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
          </select>
          <select
            value={value.classroom ?? ""}
            onChange={(event) => onChange({ ...value, type: "classroom", classroom: event.target.value })}
            className="h-10 w-full rounded-xl border bg-background px-3 text-xs"
          >
            <option value="">الفصل</option>
            {classrooms.map((classroom) => <option key={classroom} value={classroom}>{classroom}</option>)}
          </select>
        </div>
      )}

      {["assigned", "self", "children"].includes(value.type) && (
        <div className="rounded-2xl border bg-muted/15 p-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-black">
              {value.type === "self" ? "اختر ملف الطالب" : value.type === "children" ? "اختر أبناء ولي الأمر" : "اختر الطلاب"}
            </p>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">
              {selectedStudentIds.length} محدد
            </span>
          </div>
          <Input
            className="mt-2 h-9 text-xs"
            value={studentSearch}
            onChange={(event) => setStudentSearch(event.target.value)}
            placeholder="ابحث بالاسم أو الرقم أو الصف أو الفصل"
          />
          <div className="mt-2 max-h-52 space-y-1 overflow-y-auto">
            {visibleStudents.length === 0 ? (
              <p className="p-3 text-center text-[11px] text-muted-foreground">لا توجد نتائج.</p>
            ) : visibleStudents.slice(0, 120).map((student) => {
              const checked = selectedStudentIds.includes(student.id);
              return (
                <label key={student.id} className="flex cursor-pointer items-center gap-2 rounded-xl border bg-background px-2.5 py-2 text-[11px]">
                  <input
                    type={value.type === "self" ? "radio" : "checkbox"}
                    name={value.type === "self" ? "single-student-scope" : undefined}
                    checked={checked}
                    onChange={() => toggleStudent(student.id)}
                  />
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate">{student.full_name || "طالب"}</strong>
                    <span className="text-[10px] text-muted-foreground">
                      {[student.stage, student.grade, student.classroom].filter(Boolean).join(" · ")}
                      {student.student_no ? ` · ${student.student_no}` : ""}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function PermissionEditor({
  permissions,
  onChange,
  compact = false,
}: {
  permissions: Record<string, boolean>;
  onChange: (permissions: Record<string, boolean>) => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-3" : "grid gap-3 sm:grid-cols-2"}>
      {PERMISSION_GROUPS.map((group) => (
        <section key={group.title} className="rounded-2xl border bg-muted/15 p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-black">{group.title}</h3>
            <button
              type="button"
              className="text-[10px] font-bold text-primary"
              onClick={() => {
                const next = { ...permissions };
                const allOn = group.items.every((item) => Boolean(next[item.key]));
                group.items.forEach((item) => { next[item.key] = !allOn; });
                onChange(next);
              }}
            >
              تحديد الكل
            </button>
          </div>
          <div className="mt-2 grid gap-1.5">
            {group.items.map((item) => (
              <label key={item.key} className="flex items-center gap-2 rounded-xl px-2 py-2 text-[11px] hover:bg-background">
                <input
                  type="checkbox"
                  checked={Boolean(permissions[item.key])}
                  onChange={(event) => onChange({ ...permissions, [item.key]: event.target.checked })}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
