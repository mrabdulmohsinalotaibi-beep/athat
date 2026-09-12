import { createFileRoute } from "@tanstack/react-router";
import { RecordPage } from "@/components/RecordPage";
import { recordByKey } from "@/lib/records";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "التقويم والمتابعة | منصة ذات" },
      { name: "description", content: "المواعيد والمهام القادمة للموجه الطلابي." },
      { property: "og:title", content: "التقويم والمتابعة | منصة ذات" },
      { property: "og:description", content: "المواعيد والمهام القادمة للموجه الطلابي." },
    ],
  }),
  component: () => <RecordPage config={recordByKey("calendar")} />,
});
