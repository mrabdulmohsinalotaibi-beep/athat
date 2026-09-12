import { createFileRoute } from "@tanstack/react-router";
import { RecordPage } from "@/components/RecordPage";
import { recordByKey } from "@/lib/records";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "التقويم والمتابعة | منصة الذات" },
      { name: "description", content: "المواعيد والمهام القادمة للموجه الطلابي." },
      { property: "og:title", content: "التقويم والمتابعة | منصة الذات" },
      { property: "og:description", content: "المواعيد والمهام القادمة للموجه الطلابي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <RecordPage config={recordByKey("calendar")} />,
});
