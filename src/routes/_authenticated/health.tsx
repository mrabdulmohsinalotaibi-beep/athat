import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Database, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/health")({
  head: () => ({
    meta: [
      { title: "صحة النظام | الذات" },
      { name: "description", content: "فحص اتصال قاعدة البيانات والجلسة والتخزين وحجم بيانات تسجيل الدخول." },
    ],
  }),
  component: SystemHealthPage,
});

type Check = {
  key: string;
  title: string;
  detail: string;
  ok: boolean;
  warning?: boolean;
};

function SystemHealthPage() {
  const health = useQuery({
    queryKey: ["system-health"],
    queryFn: async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const user = authData.user;
      const metadataBytes = new TextEncoder().encode(JSON.stringify(user?.user_metadata ?? {})).length;

      const [students, programs, deleted, avatarStorage, evidenceStorage] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("programs").select("id", { count: "exact", head: true }),
        (supabase as any).from("deleted_records").select("id", { count: "exact", head: true }),
        user
          ? supabase.storage.from("user-avatars").list(user.id, { limit: 1 })
          : Promise.resolve({ data: null, error: new Error("لا توجد جلسة") }),
        user
          ? supabase.storage.from("evidences").list(user.id, { limit: 1 })
          : Promise.resolve({ data: null, error: new Error("لا توجد جلسة") }),
      ]);

      const checks: Check[] = [
        {
          key: "auth",
          title: "جلسة الدخول",
          detail: authError || !user ? authError?.message || "لا توجد جلسة فعالة" : `متصل بالحساب ${user.email ?? ""}`,
          ok: !authError && Boolean(user),
        },
        {
          key: "jwt",
          title: "حجم بيانات تسجيل الدخول",
          detail: `${metadataBytes.toLocaleString("ar-SA")} بايت · الصور لا تُحفظ داخل Auth`,
          ok: metadataBytes < 12_000,
          warning: metadataBytes >= 8_000 && metadataBytes < 12_000,
        },
        {
          key: "students",
          title: "قاعدة بيانات الطلاب",
          detail: students.error ? students.error.message : `${students.count ?? 0} طالب متاح للحساب`,
          ok: !students.error,
        },
        {
          key: "programs",
          title: "قاعدة بيانات البرامج",
          detail: programs.error ? programs.error.message : `${programs.count ?? 0} برنامج متاح للحساب`,
          ok: !programs.error,
        },
        {
          key: "avatars",
          title: "تخزين الصور الشخصية",
          detail: avatarStorage.error ? avatarStorage.error.message : "Storage user-avatars يعمل",
          ok: !avatarStorage.error,
        },
        {
          key: "evidences",
          title: "تخزين الشواهد",
          detail: evidenceStorage.error ? evidenceStorage.error.message : "Storage evidences يعمل",
          ok: !evidenceStorage.error,
        },
        {
          key: "recycle",
          title: "حماية المحذوفات",
          detail: deleted.error ? deleted.error.message : `سلة المحذوفات تعمل · ${deleted.count ?? 0} سجل محفوظ`,
          ok: !deleted.error,
        },
      ];

      return { checks, metadataBytes };
    },
    staleTime: 15_000,
  });

  const checks = health.data?.checks ?? [];
  const problems = checks.filter((item) => !item.ok).length;
  const warnings = checks.filter((item) => item.warning).length;

  return (
    <div dir="rtl" className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl border border-primary/15 bg-card p-5 shadow-[var(--shadow-soft)]">
        <div aria-hidden="true" className="pointer-events-none absolute -left-12 -top-12 size-40 rounded-full bg-primary/8 blur-2xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="size-5" />
              <span className="text-xs font-black">تشخيص فوري</span>
            </div>
            <h1 className="mt-2 text-2xl font-black">صحة النظام</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
              يفحص الجلسة وقاعدة البيانات والتخزين وحجم بيانات Auth حتى تظهر المشكلة قبل أن تؤثر على فتح السجلات.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => void health.refetch()} disabled={health.isFetching}>
            <RefreshCw className={`size-4 ${health.isFetching ? "animate-spin" : ""}`} />
            فحص الآن
          </Button>
        </div>
      </section>

      {health.isLoading ? (
        <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">جارٍ فحص النظام...</div>
      ) : health.isError ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">
          تعذّر تشغيل فحص الصحة. أعد المحاولة.
        </div>
      ) : (
        <>
          <section className={`rounded-2xl border p-4 ${problems ? "border-destructive/25 bg-destructive/5" : warnings ? "border-amber-500/25 bg-amber-500/5" : "border-primary/20 bg-primary/5"}`}>
            <div className="flex items-center gap-2">
              {problems ? <TriangleAlert className="size-5 text-destructive" /> : <CheckCircle2 className="size-5 text-primary" />}
              <p className="font-black">
                {problems ? `يوجد ${problems} فحص يحتاج معالجة` : warnings ? "النظام يعمل مع تنبيه واحد أو أكثر" : "جميع الفحوصات الأساسية سليمة"}
              </p>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            {checks.map((item) => (
              <article key={item.key} className="rounded-3xl border bg-card p-4 shadow-[var(--shadow-card)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black">{item.title}</p>
                    <p className="mt-1 break-words text-[11px] leading-5 text-muted-foreground">{item.detail}</p>
                  </div>
                  {item.ok ? (
                    item.warning ? <TriangleAlert className="size-5 shrink-0 text-amber-500" /> : <CheckCircle2 className="size-5 shrink-0 text-primary" />
                  ) : (
                    <TriangleAlert className="size-5 shrink-0 text-destructive" />
                  )}
                </div>
              </article>
            ))}
          </section>

          <section className="rounded-2xl border bg-card p-4 text-xs leading-6 text-muted-foreground">
            <div className="flex items-center gap-2 font-black text-foreground"><Database className="size-4" /> حماية تشغيلية</div>
            <p className="mt-1">
              إذا ارتفع حجم بيانات تسجيل الدخول أو تعطل الوصول إلى قاعدة البيانات أو Storage سيظهر التنبيه هنا.
              النسخ الاحتياطية اليومية تظل مُدارة من صفحة Backups في Lovable Cloud.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
