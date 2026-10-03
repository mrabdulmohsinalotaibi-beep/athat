import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText, Upload, FileCheck2 } from "lucide-react";

import { RecordPage } from "@/components/RecordPage";
import { EvidenceGallery, EvidenceUploadDialog } from "@/components/EvidenceUpload";
import { Button } from "@/components/ui/button";
import { recordByKey } from "@/lib/records";\nimport { supabase } from "@/integrations/supabase/client";\nimport { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/evidences")({
  head: () => ({
    meta: [
      { title: "الشواهد والتوثيق | الذات" },
      { name: "description", content: "رفع وتصفح شواهد برامج وأنشطة التوجيه الطلابي." },
      { property: "og:title", content: "الشواهد والتوثيق | الذات" },
      { property: "og:description", content: "رفع وتصفح الشواهد المرتبطة بأعمال التوجيه الطلابي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EvidencesPage,
});

function EvidencesPage() {
  const [open, setOpen] = useState(false);\n  const submitApproval=async()=>{const title=window.prompt("عنوان الشاهد أو مجموعة الشواهد المراد اعتمادها","شواهد أعمال التوجيه الطلابي");if(!title)return;const notes=window.prompt("ملاحظة للمراجع (اختياري):")||null;const {error}=await (supabase as any).rpc("submit_guidance_approval",{p_item_type:"evidence_bundle",p_item_id:null,p_title:title,p_notes:notes,p_confidentiality:"team"});if(error)return toast.error(error.message);toast.success("تم رفع الشواهد للاعتماد.");};

  return (
    <div className="reference-screen space-y-4 pb-10" dir="rtl">
      <section className="reference-hero relative overflow-hidden rounded-[1.75rem] border border-[#D9C0A3]/35 bg-[#FFFDF9] p-4 shadow-[var(--shadow-soft)] sm:p-5">
        <div aria-hidden="true" className="pointer-events-none absolute -left-12 -top-12 size-40 rounded-full bg-primary/8 blur-2xl" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-[#D9C0A3]/35 bg-[#FFFDF9] p-3.5 shadow-[var(--shadow-card)] sm:p-4">
        <div className="mb-3">
          <h2 className="text-sm font-black">ملفات الشواهد</h2>
          <p className="mt-1 text-[10px] text-muted-foreground">بحث وتعديل وربط الشاهد من سجل واحد.</p>
        </div>
        <RecordPage config={recordByKey("evidences")} hideImport />
      </section>

      <section className="space-y-3 rounded-[1.75rem] border border-[#D9C0A3]/35 bg-[#FFFDF9] p-4 shadow-[var(--shadow-card)]">
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
