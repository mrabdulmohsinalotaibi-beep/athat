import { createFileRoute } from "@tanstack/react-router";
import { RecordPage } from "@/components/RecordPage";
import { recordByKey } from "@/lib/records";

export const Route = createFileRoute("/_authenticated/committees")({
  head: () => ({
    meta: [
      { title: "اللجان والاجتماعات | منصة ذات" },
      { name: "description", content: "محاضر لجنة التوجيه الطلابي والقرارات والتوصيات." },
      { property: "og:title", content: "اللجان والاجتماعات | منصة ذات" },
      { property: "og:description", content: "محاضر لجنة التوجيه الطلابي والقرارات والتوصيات." },
    ],
  }),
  component: () => <RecordPage config={recordByKey("committees")} />,
});
