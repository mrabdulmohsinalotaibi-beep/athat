import { createFileRoute } from "@tanstack/react-router";
import { RecordPage } from "@/components/RecordPage";
import { recordByKey } from "@/lib/records";

export const Route = createFileRoute("/_authenticated/committees")({
  head: () => ({
    meta: [
      { title: "اللجان والاجتماعات | ذات | THAT" },
      { name: "description", content: "محاضر لجنة التوجيه الطلابي والقرارات والتوصيات." },
      { property: "og:title", content: "اللجان والاجتماعات | منصة الذات" },
      { property: "og:description", content: "محاضر لجنة التوجيه الطلابي والقرارات والتوصيات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <RecordPage config={recordByKey("committees")} />,
});
