import { createFileRoute } from "@tanstack/react-router";
import { RecordPage } from "@/components/RecordPage";
import { recordByKey } from "@/lib/records";

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({
    meta: [
      { title: "الحضور والمواظبة | الذات" },
      { name: "description", content: "رصد الغياب والتأخر والإجراءات الإرشادية المتخذة." },
      { property: "og:title", content: "الحضور والمواظبة | منصة الذات" },
      { property: "og:description", content: "رصد الغياب والتأخر والإجراءات الإرشادية المتخذة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <RecordPage config={recordByKey("attendance")} />,
});
