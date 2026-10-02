import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Clock3, FileText, Send, UsersRound } from "lucide-react";

import { RecordPage } from "@/components/RecordPage";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { recordByKey } from "@/lib/records";

export const Route = createFileRoute("/_authenticated/referrals")({
  head: () => ({
    meta: [
      { title: "سجل الإحالات | الذات" },
      { name: "description", content: "إحالة الطلاب إلى الجهات المختصة ومتابعة الردود." },
      { property: "og:title", content: "سجل الإحالات | الذات" },
      { property: "og:description", content: "إحالة الطلاب إلى الجهات المختصة ومتابعة الردود." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReferralsPage,
});

function ReferralsPage() {
  const {
    data: referrals = [],
    isError,
    refetch,
  } = useQuery({
    queryKey: ["referrals-mobile-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referrals")
        .select("id,student_name,referral_date,referred_to,status,reply_date,result")
        .order("referral_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const sent = referrals.filter((row) => String(row.status ?? "") === "مرسلة");
  const following = referrals.filter((row) => String(row.status ?? "") === "قيد المتابعة");
  const completed = referrals.filter((row) => String(row.status ?? "") === "منتهية");
  const waitingReply = referrals.filter(
    (row) => !row.reply_date && !["منتهية"].includes(String(row.status ?? "")),
  );

  return (
    <div className="reference-screen space-y-4" dir="rtl">
      <section className="reference-hero relative overflow-hidden rounded-[1.75rem] border border-[#D9C0A3]/35 bg-[#FFFDF9] p-4 shadow-[var(--shadow-soft)] sm:p-5">
        <div aria-hidden="true" className="pointer-events-none absolute -left-12 -top-12 size-40 rounded-full bg-primary/8 blur-2xl" />
        <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <span className="inline-flex rounded-full border border-[#89AA74]/30 bg-[#E4ECDF]/70 px-2.5 py-1 text-[10px] font-black text-primary">
              الإحالات والمتابعة
            </span>
            <h1 className="mt-2 text-2xl font-black text-navy">الإحالات الطلابية</h1>
            <p className="mt-1 max-w-2xl text-xs leading-6 text-muted-foreground">
              أنشئ الإحالة، تابع الجهة المحال إليها، وسجّل الرد والنتيجة في مسار واحد واضح.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <a href="/referrals?new=1"><Send className="size-4" /> إحالة جديدة</a>
            </Button>
            <Button asChild variant="outline">
              <Link to="/cases"><UsersRound className="size-4" /> الحالات</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/reports"><FileText className="size-4" /> التقارير <ArrowLeft className="size-3.5" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {isError && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-900">
          <span>تعذّر تحميل ملخص الإحالات، لكن سجل الإحالات ما زال متاحًا.</span>
          <Button type="button" size="sm" variant="ghost" onClick={() => void refetch()}>إعادة المحاولة</Button>
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <ReferralStat title="إجمالي الإحالات" value={referrals.length} icon={<Send className="size-4" />} />
        <ReferralStat title="قيد المتابعة" value={following.length} icon={<Clock3 className="size-4" />} />
        <ReferralStat title="بانتظار الرد" value={waitingReply.length} icon={<FileText className="size-4" />} />
        <ReferralStat title="منتهية" value={completed.length} icon={<CheckCircle2 className="size-4" />} />
      </section>

      {(sent.length > 0 || following.length > 0) && (
        <section className="rounded-3xl border border-[#D9C0A3]/35 bg-[#FFFDF9] p-4 shadow-[var(--shadow-card)]">
          <div className="mb-3">
            <h2 className="text-sm font-black">إحالات تحتاج متابعة</h2>
            <p className="mt-1 text-[10px] text-muted-foreground">أحدث الإحالات التي لم تنتهِ بعد.</p>
          </div>
          <div className="grid gap-2 xl:grid-cols-2 xl:grid-cols-3">
            {[...following, ...sent].slice(0, 6).map((row) => (
              <article key={row.id} className="rounded-2xl border bg-[#FBF7F1] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">{row.student_name || "طالب غير محدد"}</p>
                    <p className="mt-1 truncate text-[10px] text-muted-foreground">{row.referred_to || "جهة غير محددة"}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[9px] font-black text-primary">
                    {row.status || "مرسلة"}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{row.referral_date || "—"}</span>
                  <span>{row.reply_date ? "تم الرد" : "بانتظار الرد"}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <RecordPage config={recordByKey("referrals")} />
    </div>
  );
}

function ReferralStat({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#D9C0A3]/35 bg-[#FFFDF9] p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-[#E4ECDF] text-[#264938]">{icon}</span>
        <strong className="text-2xl font-black">{value}</strong>
      </div>
      <p className="mt-3 text-[11px] font-black">{title}</p>
    </div>
  );
}
