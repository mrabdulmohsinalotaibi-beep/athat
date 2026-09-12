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
    ],
  }),
  component: () => <RecordPage config={recordByKey("plan")} />,
});
