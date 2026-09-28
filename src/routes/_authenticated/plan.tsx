import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ClipboardCheck, FileText, FolderCheck, Sparkles } from "lucide-react";

import { RecordPage } from "@/components/RecordPage";
import { Button } from "@/components/ui/button";
import { recordByKey } from "@/lib/records";

export const Route = createFileRoute("/_authenticated/plan")({
  head: () => ({
    meta: [
      { title: "الخطة التشغيلية | الذات" },
      { name: "description", content: "أهداف ومهام الخطة التشغيلية للتوجيه الطلابي ومؤشرات التحقق." },
      { property: "og:title", content: "الخطة التشغيلية | منصة الذات" },
      { property: "og:description", content: "أهداف ومهام الخطة التشغيلية للتوجيه الطلابي ومؤشرات التحقق." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlanPage,
});

function PlanPage() {
  return (
    <div dir="rtl" className="space-y-4">
      <section className="rounded-2xl border border-primary/15 bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="text-[11px] font-black text-primary">1. الخطة التشغيلية</span>
            <h1 className="mt-1 text-xl font-black">من المهمة إلى التقرير</h1>
            <p className="mt-1 max-w-2xl text-xs leading-6 text-muted-foreground">
              أضف مهام الخطة هنا، ثم انتقل إلى البرنامج للتنفيذ وإرفاق الشاهد وإخراج التقرير الرسمي.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/programs"><Sparkles className="size-4" /> 2. البرامج <ArrowLeft className="size-3.5" /></Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/evidences"><FolderCheck className="size-4" /> 3. الشواهد</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/reports"><FileText className="size-4" /> 4. التقارير</Link>
            </Button>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-primary/5 px-3 py-2 text-[11px] text-muted-foreground">
          <ClipboardCheck className="size-4 shrink-0 text-primary" />
          طباعة PDF الموجودة أدناه تستخدم كليشة المدرسة الرسمية وألوان منصة الذات.
        </div>
      </section>

      <RecordPage config={recordByKey("plan")} hideImport />
    </div>
  );
}
