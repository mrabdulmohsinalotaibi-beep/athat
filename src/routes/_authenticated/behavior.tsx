import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert, UsersRound, FileText } from "lucide-react";

import { RecordPage } from "@/components/RecordPage";
import { Button } from "@/components/ui/button";
import { recordByKey } from "@/lib/records";

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

      <section className="rounded-3xl border bg-card p-3.5 shadow-[var(--shadow-card)] sm:p-4">
        <RecordPage config={recordByKey("behavior")} />
      </section>
    </div>
  );
}
