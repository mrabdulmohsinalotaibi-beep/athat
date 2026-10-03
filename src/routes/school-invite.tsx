import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock3, LogIn, School, ShieldCheck, UserCheck, Users } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PERMISSION_GROUPS, roleLabel } from "@/lib/team-permissions";

type InviteInfo = {
  valid: boolean;
  reason?: "not_found" | "inactive" | "expired" | "used" | null;
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
  max_uses?: number | null;
  used_count?: number | null;
};

export const Route = createFileRoute("/school-invite")({
  validateSearch: (search: Record<string, unknown>): { invite?: string } => ({
    invite: typeof search["invite"] === "string" ? search["invite"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "دعوة للانضمام إلى فريق المدرسة | الذات" },
      { name: "description", content: "مراجعة دعوة الانضمام إلى فريق المدرسة في منصة الذات." },
    ],
  }),
  component: SchoolInvitePage,
});

function scopeLabel(scope: InviteInfo["data_scope"], linkedCount: number) {
  switch (scope?.type) {
    case "school":
      return "كل المدرسة";
    case "stage":
      return scope.stage ? `مرحلة ${scope.stage}` : "مرحلة محددة";
    case "grade":
      return [scope.stage, scope.grade].filter(Boolean).join(" · ") || "صف محدد";
    case "classroom":
      return [scope.stage, scope.grade, scope.classroom].filter(Boolean).join(" · ") || "فصل محدد";
    case "assigned":
      return linkedCount ? `${linkedCount} طالب/طلاب محددون` : "الطلاب المسندون فقط";
    case "self":
      return "الملف الشخصي للطالب فقط";
    case "children":
      return linkedCount ? `${linkedCount} من الأبناء المرتبطين` : "الأبناء المرتبطون فقط";
    default:
      return "حسب نطاق الدعوة";
  }
}

function reasonText(reason: InviteInfo["reason"]) {
  if (reason === "expired") return "انتهت صلاحية رابط الدعوة.";
  if (reason === "used") return "تم استخدام رابط الدعوة من قبل.";
  if (reason === "inactive") return "تم إلغاء رابط الدعوة من مسؤول المدرسة.";
  return "رابط الدعوة غير صالح أو غير موجود.";
}

function SchoolInvitePage() {
  const navigate = useNavigate();
  const { invite = "" } = Route.useSearch();

  const inviteQuery = useQuery({
    queryKey: ["public-school-invite", invite],
    queryFn: async () => {
      if (!invite.trim()) return { valid: false, reason: "not_found" } as InviteInfo;
      const { data, error } = await (supabase as any).rpc("get_public_school_invite", {
        p_token: invite.trim(),
      });
      if (error) throw error;
      return (data ?? { valid: false, reason: "not_found" }) as InviteInfo;
    },
    enabled: Boolean(invite.trim()),
    staleTime: 15_000,
  });

  const sessionQuery = useQuery({
    queryKey: ["school-invite-session"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    },
    staleTime: 5_000,
  });

  const acceptInvite = useMutation({
    mutationFn: async () => {
      if (!invite.trim()) throw new Error("رابط الدعوة غير صالح.");
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) {
        const next = `/school-invite?invite=${encodeURIComponent(invite.trim())}`;
        navigate({ to: "/auth", search: { next } });
        return { redirected: true };
      }

      const { error } = await (supabase as any).rpc("request_join_school_invite", {
        p_token: invite.trim(),
      });
      if (error) throw error;
      return { redirected: false };
    },
    onSuccess: (result) => {
      if (result.redirected) return;
      toast.success("تم إرسال طلب الانضمام إلى مسؤول المدرسة.");
      void inviteQuery.refetch();
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const info = inviteQuery.data;
  const enabledPermissionLabels = useMemo(() => {
    const enabled = new Set(
      Object.entries(info?.permissions ?? {})
        .filter(([, value]) => value === true)
        .map(([key]) => key),
    );
    return PERMISSION_GROUPS.flatMap((group) =>
      group.items
        .filter((item) => enabled.has(item.key))
        .map((item) => item.label),
    ).slice(0, 8);
  }, [info?.permissions]);

  const isLoggedIn = Boolean(sessionQuery.data?.user);
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
              <h1 className="text-xl font-black">دعوة للانضمام إلى فريق المدرسة</h1>
            </div>
          </div>
        </div>

        {inviteQuery.isLoading ? (
          <div className="rounded-3xl border bg-card p-8 text-center shadow-[var(--shadow-card)]">
            <p className="text-sm text-muted-foreground">جارٍ التحقق من الدعوة...</p>
          </div>
        ) : inviteQuery.isError ? (
          <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-8 text-center">
            <p className="font-black text-destructive">تعذّر التحقق من رابط الدعوة.</p>
            <Button className="mt-4" variant="outline" onClick={() => void inviteQuery.refetch()}>
              إعادة المحاولة
            </Button>
          </div>
        ) : !info?.valid ? (
          <div className="rounded-3xl border bg-card p-8 text-center shadow-[var(--shadow-card)]">
            <ShieldCheck className="mx-auto size-10 text-muted-foreground" />
            <h2 className="mt-3 text-lg font-black">تعذّر استخدام الدعوة</h2>
            <p className="mt-2 text-sm text-muted-foreground">{reasonText(info?.reason)}</p>
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
              <div className="rounded-2xl border bg-muted/15 p-4">
                <div className="flex items-center gap-2">
                  <UserCheck className="size-4 text-primary" />
                  <p className="text-sm font-black">الدور المقترح لك</p>
                </div>
                <p className="mt-2 text-xl font-black text-primary">{roleLabel(String(info.role ?? ""))}</p>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                  لن تبدأ الصلاحيات فعليًا إلا بعد موافقة مسؤول المدرسة على طلب انضمامك.
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
                    <p className="text-xs font-black">صلاحية الرابط</p>
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
                      <span key={label} className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs leading-6 text-amber-900">
                عند الضغط على «قبول الانضمام» سيرسل طلبك لمسؤول المدرسة للمراجعة. لا يتم منحك الوصول الكامل تلقائيًا.
              </div>

              <Button
                size="lg"
                className="w-full"
                disabled={acceptInvite.isPending || sessionQuery.isLoading}
                onClick={() => acceptInvite.mutate()}
              >
                {acceptInvite.isPending ? (
                  "جارٍ إرسال الطلب..."
                ) : isLoggedIn ? (
                  <>
                    <CheckCircle2 className="size-5" /> قبول الانضمام وإرسال الطلب
                  </>
                ) : (
                  <>
                    <LogIn className="size-5" /> تسجيل الدخول ثم قبول الانضمام
                  </>
                )}
              </Button>

              <p className="text-center text-[10px] leading-5 text-muted-foreground">
                إذا لم يكن لديك حساب، يمكنك إنشاء حساب من شاشة تسجيل الدخول ثم ستعود تلقائيًا إلى هذه الدعوة.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
