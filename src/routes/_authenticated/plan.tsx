import { createFileRoute } from "@tanstack/react-router";
import { RecordPage } from "@/components/RecordPage";
import { recordByKey } from "@/lib/records";

export const Route = createFileRoute("/_authenticated/plan")({
  head: () => ({
    meta: [
      { title: "الخطة التشغيلية | منصة ذات" },
      { name: "description", content: "أهداف ومهام الخطة التشغيلية للتوجيه الطلابي ومؤشرات التحقق." },
      { property: "og:title", content: "الخطة التشغيلية | منصة ذات" },
      { property: "og:description", content: "أهداف ومهام الخطة التشغيلية للتوجيه الطلابي ومؤشرات التحقق." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <RecordPage config={recordByKey("plan")} />,
});
