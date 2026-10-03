import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock3, LogIn, School, ShieldCheck, UserCheck, Users } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PERMISSION_GROUPS, roleLabel } from "@/lib/team-permissions";

type InviteInfo = {
  valid: boolean;
  reason?: "not_found" | "inactive" | "expired" | "claimed_other_device" | "claimed_here" | "bound" | null;
  device_bound?: boolean;
  account_bound?: boolean;
  school_name?: string | null;
  education_dept?: string | null;
  education_office?: string | null;
  role?: string | null;
  permissions?: Record<string, boolean> | null;
  data_scope?: {
    type?: string;
    stage?: string;
    grade?: string;
    classroom?: string;
  } | null;
  linked_student_count?: number | null;
  expires_at?: string | null;
  initiative_id?: string | null;
  initiative_title?: string | null;
  initiative_slogan?: string | null;
  initiative_role?: string | null;
  initiative_tasks?: string[] | null;
};

export const Route = createFileRoute("/school-invite")({
  validateSearch: (search: Record<string, unknown>): { invite?: string } => ({
    invite: typeof search["invite"] === "string" ? search["invite"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "دعوة للانضمام إلى فريق المدرسة | الذات" },
      { name: "description", content: "دعوة خاصة مرتبطة بجهاز واحد للانضمام إلى فريق المدرسة." },
    ],
  }),
  component: SchoolInvitePage,
});

function getDeviceSecret(invite: string) {
  const key = `athat-school-invite-device:${invite}`;
  let value = window.localStorage.getItem(key);
  if (!value) {
    value =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? `${crypto.randomUUID()}-${crypto.randomUUID()}`
        : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(key, value);
  }
  return value;
}

function scopeLabel(scope: InviteInfo["data_scope"], linkedCount: number) {
  switch (scope?.type) {
    case "school": return "كل المدرسة";
    case "stage": return scope.stage ? `مرحلة ${scope.stage}` : "مرحلة محددة";
    case "grade": return [scope.stage, scope.grade].filter(Boolean).join(" · ") || "صف محدد";
    case "classroom": return [scope.stage, scope.grade, scope.classroom].filter(Boolean).join(" · ") || "فصل محدد";
    case "assigned": return linkedCount ? `${linkedCount} طالب/طلاب محددون` : "الطلاب المسندون فقط";
    case "self": return "الملف الشخصي للطالب فقط";
    case "children": return linkedCount ? `${linkedCount} من الأبناء المرتبطين` : "الأبناء المرتبطون فقط";
    default: return "حسب نطاق الدعوة";
  }
}

function reasonText(reason: InviteInfo["reason"]) {
  if (reason === "expired") return "انتهت صلاحية رابط الدعوة.";
  if (reason === "inactive") return "تم إلغاء رابط الدعوة من مسؤول المدرسة.";
  if (reason === "claimed_other_device") return "هذه الدعوة فُتحت وربطت بجهاز آخر، لذلك لن تعمل على هذا الجهاز.";
  return "رابط الدعوة غير صالح أو غير موجود.";
}

function SchoolInvitePage() {
  const navigate = useNavigate();
  const { invite = "" } = Route.useSearch();
  const autoBoundRef = useRef(false);

  const inviteQuery = useQuery({
    queryKey: ["claimed-school-invite", invite],
    queryFn: async () => {
      if (!invite.trim()) return { valid: false, reason: "not_found" } as InviteInfo;
      const deviceSecret = getDeviceSecret(invite.trim());
      const { data, error } = await (supabase as any).rpc("claim_school_invite_device", {
        p_token: invite.trim(),
        p_device_secret: deviceSecret,
      });
      if (error) throw error;
      return (data ?? { valid: false, reason: "not_found" }) as InviteInfo;
    },
    enabled: Boolean(invite.trim()),
    staleTime: 10_000,
  });

  const sessionQuery = useQuery({
    queryKey: ["school-invite-session"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    },
    staleTime: 3_000,
  });

  const bindInvite = useMutation({
    mutationFn: async () => {
      if (!invite.trim()) throw new Error("رابط الدعوة غير صالح.");
      const deviceSecret = getDeviceSecret(invite.trim());
      const { data, error } = await (supabase as any).rpc("bind_claimed_school_invite", {
        p_token: invite.trim(),
        p_device_secret: deviceSecret,
      });
      if (error) throw error;
      return String(data ?? "");
    },
    onSuccess: async () => {
      toast.success("تم ربط الدعوة بحسابك وإرسال طلب الانضمام.");
      await inviteQuery.refetch();
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const info = inviteQuery.data;
  const isLoggedIn = Boolean(sessionQuery.data?.user);

  useEffect(() => {
    if (
      autoBoundRef.current ||
      !isLoggedIn ||
      !info?.valid ||
      !info.device_bound ||
      info.account_bound ||
      bindInvite.isPending
    ) {
      return;
    }
    autoBoundRef.current = true;
    bindInvite.mutate();
  }, [isLoggedIn, info?.valid, info?.device_bound, info?.account_bound]);

  const enabledPermissionLabels = useMemo(() => {
    const enabled = new Set(
      Object.entries(info?.permissions ?? {})
        .filter(([, value]) => value === true)
        .map(([key]) => key),
    );
    return PERMISSION_GROUPS.flatMap((group) =>
      group.items.filter((item) => enabled.has(item.key)).map((item) => item.label),
    ).slice(0, 8);
  }, [info?.permissions]);

  const linkedCount = Number(info?.linked_student_count ?? 0);

  return (
    <div dir="rtl" className="min-h-screen bg-background px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-5 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="grid size-16 place-items-center overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-soft)]">
              <BrandLogo className="size-full" />
            </div>
            <div>
              <p className="text-xs font-black text-primary">الذات | ATHAT</p>
              <h1 className="text-xl font-black">دعوة خاصة للانضمام إلى فريق المدرسة</h1>
            </div>
          </div>
        </div>

        {inviteQuery.isLoading ? (
          <div className="rounded-3xl border bg-card p-8 text-center shadow-[var(--shadow-card)]">
            <p className="text-sm text-muted-foreground">جارٍ تأمين الدعوة وربطها بهذا الجهاز...</p>
          </div>
        ) : inviteQuery.isError ? (
          <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-8 text-center">
            <p className="font-black text-destructive">تعذّر التحقق من رابط الدعوة.</p>
            <Button className="mt-4" variant="outline" onClick={() => void inviteQuery.refetch()}>إعادة المحاولة</Button>
          </div>
        ) : !info?.valid ? (
          <div className="rounded-3xl border bg-card p-8 text-center shadow-[var(--shadow-card)]">
            <ShieldCheck className="mx-auto size-10 text-muted-foreground" />
            <h2 className="mt-3 text-lg font-black">الدعوة غير متاحة على هذا الجهاز</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{reasonText(info?.reason)}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border bg-card shadow-[var(--shadow-soft)]">
            <div className="border-b bg-primary/[0.035] p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <School className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-black text-primary">دعوة رسمية من المدرسة</p>
                  <h2 className="mt-1 text-2xl font-black">{info.school_name || "المدرسة"}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[info.education_dept, info.education_office].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700" />
                  <div>
                    <p className="text-sm font-black text-emerald-800">
                      {info.account_bound ? "تم ربط الدعوة بالحساب" : "تم حجز الدعوة لهذا الجهاز"}
                    </p>
                    <p className="mt-1 text-xs leading-6 text-muted-foreground">
                      {info.account_bound
                        ? "هذه الدعوة أصبحت مرتبطة بحساب البريد الذي سجلت به من هذا الجهاز."
                        : "لا تحتاج إلى تسجيل الدخول لفتح الدعوة. من الآن لن تعمل الدعوة على جهاز أو متصفح آخر."}
                    </p>
                  </div>
                </div>
              </div>

              {info.initiative_title && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center gap-2">
                    <Users className="size-4 text-primary" />
                    <p className="text-sm font-black">دعوة للانضمام إلى مبادرة</p>
                  </div>
                  <p className="mt-2 text-xl font-black text-primary">{info.initiative_title}</p>
                  {info.initiative_slogan && <p className="mt-1 text-sm font-bold">{info.initiative_slogan}</p>}
                  {info.initiative_role && <p className="mt-3 text-xs"><strong>دورك:</strong> {info.initiative_role}</p>}
                  {(info.initiative_tasks ?? []).length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-black">الأعمال المطلوبة منك</p>
                      <div className="mt-2 space-y-1.5">
                        {(info.initiative_tasks ?? []).map((task) => (
                          <div key={task} className="rounded-xl border bg-background px-3 py-2 text-xs">{task}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-2xl border bg-muted/15 p-4">
                <div className="flex items-center gap-2">
                  <UserCheck className="size-4 text-primary" />
                  <p className="text-sm font-black">الدور المقترح لك</p>
                </div>
                <p className="mt-2 text-xl font-black text-primary">{roleLabel(String(info.role ?? ""))}</p>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                  بعد ربط بريدك بالحساب يبقى تفعيل العضوية النهائي بيد مسؤول المدرسة.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border p-4">
                  <div className="flex items-center gap-2">
                    <Users className="size-4 text-primary" />
                    <p className="text-xs font-black">نطاق البيانات</p>
                  </div>
                  <p className="mt-2 text-sm font-bold">{scopeLabel(info.data_scope, linkedCount)}</p>
                </div>
                <div className="rounded-2xl border p-4">
                  <div className="flex items-center gap-2">
                    <Clock3 className="size-4 text-primary" />
                    <p className="text-xs font-black">صلاحية الدعوة</p>
                  </div>
                  <p className="mt-2 text-sm font-bold">
                    حتى {info.expires_at ? new Date(info.expires_at).toLocaleDateString("ar-SA") : "—"}
                  </p>
                </div>
              </div>

              {enabledPermissionLabels.length > 0 && (
                <div className="rounded-2xl border p-4">
                  <p className="text-xs font-black">أبرز الصلاحيات في الدعوة</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {enabledPermissionLabels.map((label) => (
                      <span key={label} className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">{label}</span>
                    ))}
                  </div>
                </div>
              )}

              {!info.account_bound && !isLoggedIn && (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <p className="text-xs font-black text-amber-900">الخطوة التالية</p>
                  <p className="mt-1 text-xs leading-6 text-amber-900/80">
                    يمكنك الاحتفاظ بالدعوة على هذا الجهاز، وعندما تسجل أو تنشئ حسابًا بالبريد من نفس المتصفح سيعود النظام إلى هنا ويربط الدعوة بحسابك مباشرة.
                  </p>
                  <Button
                    className="mt-3 w-full"
                    onClick={() => {
                      const next = `/school-invite?invite=${encodeURIComponent(invite.trim())}`;
                      navigate({ to: "/auth", search: { next } });
                    }}
                  >
                    <LogIn className="size-5" /> تسجيل الدخول أو إنشاء حساب بالبريد
                  </Button>
                </div>
              )}

              {!info.account_bound && isLoggedIn && (
                <Button className="w-full" disabled={bindInvite.isPending} onClick={() => bindInvite.mutate()}>
                  <CheckCircle2 className="size-5" />
                  {bindInvite.isPending ? "جارٍ ربط الحساب..." : "ربط الدعوة بحسابي الآن"}
                </Button>
              )}

              {info.account_bound && (
                <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 text-center">
                  <p className="text-sm font-black text-primary">تم ربط الدعوة بنجاح</p>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">
                    تم إرسال طلب الانضمام، وسيظهر لمسؤول المدرسة للمراجعة والاعتماد.
                  </p>
                </div>
              )}

              <p className="text-center text-[10px] leading-5 text-muted-foreground">
                ملاحظة: الربط هنا مرتبط بمتصفح هذا الجهاز. حذف بيانات المتصفح قد يفقد مفتاح الجهاز المحلي.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
