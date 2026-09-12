import { createFileRoute } from "@tanstack/react-router";
import { RecordPage } from "@/components/RecordPage";
import { recordByKey } from "@/lib/records";

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({
    meta: [
      { title: "الحضور والمواظبة | منصة ذات" },
      { name: "description", content: "رصد الغياب والتأخر والإجراءات الإرشادية المتخذة." },
      { property: "og:title", content: "الحضور والمواظبة | منصة ذات" },
      { property: "og:description", content: "رصد الغياب والتأخر والإجراءات الإرشادية المتخذة." },
    ],
  }),
  component: () => <RecordPage config={recordByKey("attendance")} />,
});
