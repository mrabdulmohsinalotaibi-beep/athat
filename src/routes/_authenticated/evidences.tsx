import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Upload, FolderCheck, Sparkles } from "lucide-react";

import { RecordPage } from "@/components/RecordPage";
import { recordByKey } from "@/lib/records";
import { EvidenceGallery, EvidenceUploadDialog } from "@/components/EvidenceUpload";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/evidences")({
  head: () => ({
    meta: [
      { title: "الشواهد والتوثيق | منصة الذات" },
      { name: "description", content: "رفع وتصفح شواهد البرامج: صور ومقاطع فيديو ومستندات مرتبطة بالأنشطة الإرشادية والخطط التشغيلية." },
      { property: "og:title", content: "الشواهد والتوثيق | منصة الذات" },
      {
        property: "og:description",
        content: "رفع وتصفح شواهد البرامج: صور ومقاطع فيديو ومستندات مرتبطة بالأنشطة الإرشادية والخطط التشغيلية.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EvidencesPage,
});

function EvidencesPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-8 pb-10">
      {/* رأس الصفحة الترحيبي والتوضيحي */}
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FolderCheck className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight">الشواهد والتوثيق الإرشادي</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                <Sparkles className="size-3" /> موثق ومنظم
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              توثيق شامل لأنشطة البرامج الإرشادية، الاجتماعات، والمقابلات الفردية لضمان جاهزية التقارير.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <Button onClick={() => setOpen(true)} className="gap-2 shadow-sm">
            <Upload className="size-4" />
            <span>رفع شاهد جديد</span>
          </Button>
        </div>
      </div>

      {/* قسم السجلات والجداول المرتبطة */}
      <RecordPage
        config={recordByKey("evidences")}
        toolbarExtra={
          <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
            <Upload className="size-4" /> 
            <span>رفع شاهد (صورة/مستند)</span>
          </Button>
        }
      />

      {/* معرض الشواهد المرئية */}
      <section className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h2 className="text-lg font-extrabold">معرض الشواهد المرفوعة</h2>
            <p className="text-xs text-muted-foreground mt-0.5">استعراض سريع لكافة الملفات، الصور، والمستندات المحفوظة في السجل</p>
          </div>
        </div>
        <EvidenceGallery />
      </section>

      {/* نافذة رفع الشواهد */}
      <EvidenceUploadDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
