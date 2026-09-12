import { createFileRoute } from "@tanstack/react-router";
import { RecordPage } from "@/components/RecordPage";
import { recordByKey } from "@/lib/records";

export const Route = createFileRoute("/_authenticated/evidences")({
  head: () => ({
    meta: [
      { title: "الشواهد والتوثيق | منصة ذات" },
      { name: "description", content: "توثيق شواهد البرامج والأنشطة وحالة اعتمادها." },
      { property: "og:title", content: "الشواهد والتوثيق | منصة ذات" },
      { property: "og:description", content: "توثيق شواهد البرامج والأنشطة وحالة اعتمادها." },
    ],
  }),
  component: () => <RecordPage config={recordByKey("evidences")} />,
});
