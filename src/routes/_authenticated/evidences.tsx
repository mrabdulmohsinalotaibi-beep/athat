import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText, Upload } from "lucide-react";

import { RecordPage } from "@/components/RecordPage";
import { EvidenceGallery, EvidenceUploadDialog } from "@/components/EvidenceUpload";
import { Button } from "@/components/ui/button";
import { recordByKey } from "@/lib/records";

export const Route = createFileRoute("/_authenticated/evidences")({
  head: () => ({
    meta: [
      { title: "الشواهد والتوثيق | منصة الذات" },
      { name: "description", content: "رفع وتصفح شواهد برامج وأنشطة التوجيه الطلابي." },
      { property: "og:title", content: "الشواهد والتوثيق | منصة الذات" },
      { property: "og:description", content: "رفع وتصفح الشواهد المرتبطة بأعمال التوجيه الطلابي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EvidencesPage,
});

function EvidencesPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-5 pb-10" dir="rtl">
      <section className="flex flex-col gap-3 rounded-2xl border border-primary/15 bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[11px] font-black text-primary">3. الشاهد</span>
          <h1 className="mt-1 text-xl font-black">الشواهد والتوثيق</h1>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            ارفع الشاهد مرة واحدة واربطه بالسجل أو البرنامج، ثم استخدمه في التقرير الرسمي.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Upload className="size-4" /> رفع شاهد
          </Button>
          <Button asChild variant="outline">
            <Link to="/reports"><FileText className="size-4" /> 4. التقرير <ArrowLeft className="size-3.5" /></Link>
          </Button>
        </div>
      </section>

      <RecordPage config={recordByKey("evidences")} hideImport />

      <section className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
        <div>
          <h2 className="font-black">معرض الشواهد</h2>
          <p className="mt-1 text-xs text-muted-foreground">معاينة الملفات المحفوظة دون إنشاء سجل آخر.</p>
        </div>
        <EvidenceGallery />
      </section>

      <EvidenceUploadDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
