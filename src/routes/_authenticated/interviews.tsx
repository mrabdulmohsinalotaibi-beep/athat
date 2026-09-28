import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { RecordPage } from "@/components/RecordPage";
import { recordByKey } from "@/lib/records";

export const Route = createFileRoute("/_authenticated/interviews")({
  head: () => ({
    meta: [
      { title: "الجلسات الإرشادية | الذات" },
      { name: "description", content: "الجلسات الفردية والجماعية والطارئة وتوثيق التوصيات والمتابعة." },
      { property: "og:title", content: "الجلسات الإرشادية | منصة الذات" },
      { property: "og:description", content: "توثيق الجلسات الفردية والجماعية والطارئة والتوصيات والمتابعة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InterviewsPage,
});

function InterviewsPage() {
  return (
    <div className="space-y-4" dir="rtl">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/10 bg-card p-3 shadow-sm">
        <div>
          <h2 className="text-sm font-black">جلسات فردية وجماعية وطارئة</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            سجّل موضوع الجلسة والتوجيهات والتوصيات، وحدد موعد المتابعة.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline"><Link to="/calendar">جدول المواعيد</Link></Button>
          <Button asChild size="sm" variant="outline"><Link to="/toolkit">عقد التعاون والنماذج</Link></Button>
        </div>
      </section>
      <RecordPage config={recordByKey("interviews")} />
    </div>
  );
}
