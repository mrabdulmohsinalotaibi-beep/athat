import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Upload } from "lucide-react";

import { RecordPage } from "@/components/RecordPage";
import { recordByKey } from "@/lib/records";
import { EvidenceGallery, EvidenceUploadDialog } from "@/components/EvidenceUpload";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/evidences")({
  head: () => ({
    meta: [
      { title: "الشواهد والتوثيق | منصة الذات" },
      { name: "description", content: "رفع وتصفح شواهد البرامج: صور ومقاطع فيديو ومستندات مرتبطة بالأنشطة الإرشادية." },
      { property: "og:title", content: "الشواهد والتوثيق | منصة الذات" },
      {
        property: "og:description",
        content: "رفع وتصفح شواهد البرامج: صور ومقاطع فيديو ومستندات مرتبطة بالأنشطة الإرشادية.",
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
    <div className="space-y-6">
      <RecordPage
        config={recordByKey("evidences")}
        toolbarExtra={
          <Button variant="outline" onClick={() => setOpen(true)}>
            <Upload className="size-4" /> رفع شاهد (صورة/فيديو/مستند)
          </Button>
        }
      />
      <section className="no-print space-y-3">
        <h2 className="text-lg font-extrabold">معرض الشواهد المرفوعة</h2>
        <EvidenceGallery />
      </section>
      <EvidenceUploadDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
