import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Clipboard, KeyRound, RefreshCw, School, ShieldCheck, UserCheck, Users } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/school-team")({
  head: () => ({
    meta: [
      { title: "فريق المدرسة | الذات" },
      { name: "description", content: "ربط حسابات المدرسة وإدارة الأدوار وطلبات الانضمام." },
    ],
  }),
  component: SchoolTeamPage,
});

type Role = "principal" | "vice_principal" | "counselor" | "teacher" | "admin_staff" | "guard" | "observer";
type MemberStatus = "pending" | "active" | "rejected" | "suspended";

type SchoolContext = {
  membership: null | {
    id: string;
    school_id: string;
    role: Role;
    member_status: MemberStatus;
    is_admin: boolean;
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
    joined_at?: string | null;
    created_at: string;
  }>;
  join_code?: string | null;
};

const ROLES: Array<{ value: Role; label: string }> = [
  { value: "principal", label: "مدير المدرسة" },
  { value: "vice_principal", label: "وكيل المدرسة" },
  { value: "counselor", label: "الموجه الطلابي" },
  { value: "teacher", label: "معلم" },
  { value: "admin_staff", label: "إداري" },
  { value: "guard", label: "حارس" },
  { value: "observer", label: "اطلاع فقط" },
];

const roleLabel = (role: Role) => ROLES.find((item) => item.value === role)?.label ?? role;

function SchoolTeamPage() {
  const queryClient = useQueryClient();
  const [joinCode, setJoinCode] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [educationDept, setEducationDept] = useState("");
  const [educationOffice, setEducationOffice] = useState("");
  const [pendingRoles, setPendingRoles] = useState<Record<string, Role>>({});

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
  };

  const createSchool = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).rpc("create_school_workspace", {
        p_name: schoolName.trim(),
        p_education_dept: educationDept.trim() || null,
        p_education_office: educationOffice.trim() || null,
        p_role: "counselor",
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
    return <div dir="rtl" className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">جارٍ تحميل فريق المدرسة...</div>;
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
        <section className="rounded-2xl border border-primary/15 bg-card p-5">
          <div className="flex items-center gap-2 text-primary"><School className="size-5" /><span className="text-xs font-black">العمل المدرسي المشترك</span></div>
          <h1 className="mt-2 text-2xl font-black">اربط حسابك بمدرستك</h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">أنشئ مساحة للمدرسة أو أدخل الرمز الذي استلمته من مسؤول المدرسة.</p>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="font-black">إنشاء مساحة مدرسة</h2>
            <div className="mt-4 space-y-3">
              <div><Label>اسم المدرسة</Label><Input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} /></div>
              <div><Label>إدارة التعليم</Label><Input value={educationDept} onChange={(e) => setEducationDept(e.target.value)} /></div>
              <div><Label>مكتب التعليم</Label><Input value={educationOffice} onChange={(e) => setEducationOffice(e.target.value)} /></div>
              <Button disabled={!schoolName.trim() || createSchool.isPending} onClick={() => createSchool.mutate()}>
                <School className="size-4" /> إنشاء وربط الحساب
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="font-black">الانضمام إلى مدرسة</h2>
            <p className="mt-1 text-xs text-muted-foreground">سيصل طلبك لمسؤول المدرسة للموافقة وتحديد دورك.</p>
            <div className="mt-4 space-y-3">
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
      <section className="rounded-2xl border border-primary/15 bg-card p-5 shadow-sm">
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
        <section className="rounded-2xl border bg-card p-4 shadow-sm">
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
            <Button variant="outline" disabled={rotateCode.isPending} onClick={() => rotateCode.mutate(school.id)}>
              <RefreshCw className="size-4" /> تغيير الرمز
            </Button>
          </div>
        </section>
      )}

      {membership.is_admin && pending.length > 0 && (
        <section className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
          <div className="mb-3 flex items-center gap-2"><UserCheck className="size-4" /><h2 className="font-black">طلبات انضمام تنتظر الاعتماد</h2></div>
          <div className="grid gap-2">
            {pending.map((member) => {
              const selectedRole = pendingRoles[member.id] ?? "teacher";
              return (
                <div key={member.id} className="flex flex-col gap-3 rounded-xl border bg-background p-3 lg:flex-row lg:items-center lg:justify-between">
                  <div><p className="font-black">{member.display_name || "عضو جديد"}</p><p className="text-[11px] text-muted-foreground">طلب جديد للانضمام</p></div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={selectedRole}
                      onChange={(e) => setPendingRoles((current) => ({ ...current, [member.id]: e.target.value as Role }))}
                      className="h-9 rounded-md border bg-background px-3 text-xs"
                    >
                      {ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
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

      <section className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><Users className="size-4 text-primary" /><h2 className="font-black">فريق المدرسة</h2></div><span className="text-xs text-muted-foreground">{active.length} عضو</span></div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {active.map((member) => (
            <article key={member.id} className="rounded-xl border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{member.display_name || "عضو المدرسة"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{roleLabel(member.role)}</p>
                </div>
                {member.is_admin && <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-black text-primary">مسؤول</span>}
              </div>
              {membership.is_admin && member.id !== membership.id && (
                <div className="mt-3 space-y-2 border-t pt-3">
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={pendingRoles[member.id] ?? member.role}
                      onChange={(e) => setPendingRoles((current) => ({ ...current, [member.id]: e.target.value as Role }))}
                      className="h-9 rounded-md border bg-background px-3 text-xs"
                    >
                      {ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={(pendingRoles[member.id] ?? member.role) === member.role || approve.isPending}
                      onClick={() => approve.mutate({ id: member.id, role: pendingRoles[member.id] ?? member.role })}
                    >
                      حفظ الدور
                    </Button>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => changeStatus.mutate({ id: member.id, status: "suspended" })}>تعليق العضوية</Button>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {membership.is_admin && suspended.length > 0 && (
        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-black">عضويات معلقة</h2>
            <span className="text-xs text-muted-foreground">{suspended.length} عضو</span>
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
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

      <section className="rounded-2xl border bg-muted/20 p-4 text-xs leading-6 text-muted-foreground">
        ربط الفريق هنا لا يشارك سجلات الطلاب الحساسة تلقائيًا. مشاركة السجلات ستُدار بصلاحيات مستقلة حسب الدور، حتى لا تتغير خصوصية بياناتك الحالية دون قصد.
      </section>
    </div>
  );
}
