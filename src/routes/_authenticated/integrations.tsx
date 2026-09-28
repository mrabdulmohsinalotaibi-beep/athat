import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, ClipboardCheck, DownloadCloud, ShieldCheck } from "lucide-react";

import { ExternalPlatformImporter } from "@/components/ExternalPlatformImporter";
import { NoorExportCenter } from "@/components/NoorExportCenter";
import { AiCounselorAssistant } from "@/components/AiCounselorAssistant";

export const Route = createFileRoute("/_authenticated/integrations")({
  head: () => ({
    meta: [
      { title: "مدرستي ونور | منصة الذات" },
      { name: "description", content: "جلب البيانات وتجهيز أعمال التوجيه للترحيل إلى نور." },
    ],
  }),
  component: IntegrationsPage,
});

function IntegrationsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6" dir="rtl">
      <div className="rounded-3xl border border-primary/15 bg-gradient-to-bl from-primary/10 via-card to-accent/10 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <ShieldCheck className="size-3.5" /> مركز التكامل والتجهيز
            </span>
            <h1 className="mt-4 text-3xl font-black">مدرستي ونور</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
              انقل بياناتك بطريقة منظمة، راجعها قبل الحفظ، وجهّز سجلات التوجيه للترحيل إلى نور دون
              تجاوز تسجيل الدخول أو رمز التحقق.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-2xl border bg-card/80 p-3">
              <DownloadCloud className="mx-auto size-4 text-primary" />
              <p className="mt-2 font-bold">استيراد</p>
            </div>
            <div className="rounded-2xl border bg-card/80 p-3">
              <ClipboardCheck className="mx-auto size-4 text-primary" />
              <p className="mt-2 font-bold">مراجعة</p>
            </div>
            <div className="rounded-2xl border bg-card/80 p-3">
              <CheckCircle2 className="mx-auto size-4 text-primary" />
              <p className="mt-2 font-bold">توثيق</p>
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-sm font-black">1. صدّر من المصدر</p>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            استخدم ملف Excel/CSV الرسمي من مدرستي أو نور، أو الصق الجدول كما هو.
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-sm font-black">2. راجع المطابقة</p>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            تتحول عناوين الأعمدة إلى حقول منصة الذات وتظهر معاينة قبل الحفظ.
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-sm font-black">3. وثّق الرفع</p>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            بعد الإكمال اليدوي في نور، سجّل رقم المرجع وحالة العملية لمنع التكرار.
          </p>
        </div>
      </div>
      <ExternalPlatformImporter />
      <NoorExportCenter />
      <AiCounselorAssistant compact />
    </div>
  );
}
