import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CalendarClock, CheckCircle2, FileText, Send, ShieldAlert, UsersRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { RecordPage } from "@/components/RecordPage";
import { Button } from "@/components/ui/button";
import { recordByKey } from "@/lib/records";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/behavior")({
  head: () => ({
    meta: [
      { title: "السلوك والمتابعة | الذات" },
      { name: "description", content: "رصد المخالفات السلوكية والإجراءات ونتائج المتابعة." },
      { property: "og:title", content: "السلوك والمتابعة | الذات" },
      { property: "og:description", content: "رصد المخالفات السلوكية والإجراءات ونتائج المتابعة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BehaviorPage,
});

function BehaviorPage() {
  const { data: behaviorRows = [] } = useQuery({
    queryKey: ["behavior-followup-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("behavior")
        .select("id,student_id,student_no,student_name,result,followup_at,observation");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
  const today = new Date().toISOString().slice(0, 10);
  const needsFollowup = behaviorRows.filter((row) => ["تحتاج متابعة", "تحسن جزئي"].includes(String(row.result ?? "")));
  const dueFollowups = needsFollowup.filter((row) => {
    const date = String(row.followup_at ?? "").slice(0, 10);
    return Boolean(date && date <= today);
  });
  const improved = behaviorRows.filter((row) => row.result === "تحسن").length;
  const referred = behaviorRows.filter((row) => row.result === "تمت الإحالة").length;

  return (
    <div className="space-y-4" dir="rtl">
      <section className="relative overflow-hidden rounded-3xl border border-primary/15 bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5">
        <div aria-hidden="true" className="pointer-events-none absolute -left-12 -top-12 size-40 rounded-full bg-primary/8 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1 text-[10px] font-black text-primary">
              السلوك والمتابعة
            </span>
            <h1 className="mt-2 text-2xl font-black text-navy">السلوك الطلابي</h1>
            <p className="mt-1 max-w-2xl text-xs leading-6 text-muted-foreground">
              رصد الملاحظة، توثيق الإجراء، متابعة النتيجة، وربطها بملف الطالب عند الحاجة.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild><a href="/behavior?new=1"><ShieldAlert className="size-4" /> تسجيل حالة</a></Button>
            <Button asChild variant="outline"><Link to="/students"><UsersRound className="size-4" /> الطلاب</Link></Button>
            <Button asChild variant="outline"><Link to="/reports"><FileText className="size-4" /> التقارير</Link></Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <BehaviorStat title="إجمالي السجلات" value={behaviorRows.length} icon={<ShieldAlert className="size-4" />} />
        <BehaviorStat title="تحتاج متابعة" value={needsFollowup.length} icon={<CalendarClock className="size-4" />} />
        <BehaviorStat title="تحسن" value={improved} icon={<CheckCircle2 className="size-4" />} />
        <BehaviorStat title="تمت إحالتها" value={referred} icon={<Send className="size-4" />} />
      </section>

      {dueFollowups.length > 0 && (
        <section className="rounded-2xl border border-amber-300/60 bg-amber-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-amber-950">
            <AlertTriangle className="size-4" />
            <h2 className="text-sm font-black">متابعات سلوكية مستحقة</h2>
          </div>
          <div className="grid gap-2 xl:grid-cols-2">
            {dueFollowups.slice(0, 6).map((row) => (
              <div key={row.id} className="rounded-xl border border-amber-200 bg-white p-3">
                <strong className="text-sm">{row.student_name || "طالب غير محدد"}</strong>
                <p className="mt-1 text-xs text-muted-foreground">{row.observation || "ملاحظة سلوكية"} · {String(row.followup_at)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={`/interviews?new=student&studentId=${encodeURIComponent(String(row.student_id ?? ""))}&studentNo=${encodeURIComponent(String(row.student_no ?? ""))}&studentName=${encodeURIComponent(String(row.student_name ?? ""))}`} className="rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-black text-primary-foreground">
                    تسجيل متابعة
                  </a>
                  <a href={`/referrals?new=student&studentId=${encodeURIComponent(String(row.student_id ?? ""))}&studentNo=${encodeURIComponent(String(row.student_no ?? ""))}&studentName=${encodeURIComponent(String(row.student_name ?? ""))}`} className="rounded-lg border px-2.5 py-1.5 text-[11px] font-black text-primary">
                    إنشاء إحالة
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-3xl border bg-card p-3.5 shadow-[var(--shadow-card)] sm:p-4">
        <RecordPage config={recordByKey("behavior")} />
      </section>
    </div>
  );
}


function BehaviorStat({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <span className="rounded-xl bg-primary/10 p-2 text-primary">{icon}</span>
        <strong className="text-2xl">{value}</strong>
      </div>
      <p className="mt-3 text-xs font-black">{title}</p>
    </div>
  );
}
