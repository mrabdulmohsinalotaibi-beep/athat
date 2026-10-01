import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { RecordPage } from "@/components/RecordPage";
import { Button } from "@/components/ui/button";
import { recordByKey } from "@/lib/records";

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({
    meta: [
      { title: "الحضور والمواظبة | الذات" },
      { name: "description", content: "رصد الغياب والتأخر وإجراءات التوجيه الطلابي المتخذة." },
      { property: "og:title", content: "الحضور والمواظبة | الذات" },
      { property: "og:description", content: "رصد الغياب والتأخر وإجراءات التوجيه الطلابي المتخذة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AttendancePage,
});

function AttendancePage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pdf, setPdf] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const pickPdf = (file?: File) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("يرجى اختيار ملف PDF صادر من إتقان.");
      return;
    }
    setPdf(file);
    toast.success(`تم اختيار ${file.name}`);
  };

  const startImport = async () => {
    if (!pdf) return inputRef.current?.click();
    setBusy(true);
    try {
      // المرحلة الأولى: تجهيز مسار الاستيراد الآمن. القراءة والتحويل والحفظ
      // ستتم عبر خدمة الخادم حتى لا تُرسل بيانات الطلاب إلى خدمة خارجية.
      toast.info("تم تجهيز ملف إتقان للقراءة. جاري استكمال محلل PDF في الخطوة التالية.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 font-black">
              <FileText className="size-5 text-primary" />
              استيراد غياب إتقان PDF
            </div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              ارفع كشف الغياب PDF الصادر من إتقان، ثم راجع السجلات قبل إضافتها إلى المواظبة.
              سيُستخدم رقم الهوية وتاريخ الغياب لاكتشاف التكرار قبل الاعتماد.
            </p>
            {pdf && (
              <p className="mt-2 text-xs font-bold text-primary">
                الملف المحدد: {pdf.name} — {(pdf.size / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(event) => pickPdf(event.target.files?.[0])}
            />
            <Button variant="outline" onClick={() => inputRef.current?.click()}>
              <Upload className="size-4" />
              اختيار PDF
            </Button>
            <Button onClick={startImport} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
              {pdf ? "قراءة كشف إتقان" : "استيراد غياب إتقان"}
            </Button>
          </div>
        </div>
      </section>

      <RecordPage config={recordByKey("attendance")} />
    </div>
  );
}
