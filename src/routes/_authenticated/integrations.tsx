import { createFileRoute } from "@tanstack/react-router";

import { ExternalPlatformImporter } from "@/components/ExternalPlatformImporter";
import { NoorExportCenter } from "@/components/NoorExportCenter";

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
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-black">مدرستي ونور</h1>
        <p className="mt-2 text-muted-foreground">استيراد آمن للبيانات ومركز تدقيق لترحيل أعمال التوجيه.</p>
      </div>
      <ExternalPlatformImporter />
      <NoorExportCenter />
    </div>
  );
}
