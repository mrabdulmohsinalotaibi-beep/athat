import { createFileRoute } from "@tanstack/react-router";
import { RecordPage } from "@/components/RecordPage";
import { recordByKey } from "@/lib/records";

export const Route = createFileRoute("/_authenticated/referrals")({
  head: () => ({
    meta: [
      { title: "سجل الإحالات | منصة ذات" },
      { name: "description", content: "إحالة الطلاب إلى الجهات المختصة ومتابعة الردود." },
      { property: "og:title", content: "سجل الإحالات | منصة ذات" },
      { property: "og:description", content: "إحالة الطلاب إلى الجهات المختصة ومتابعة الردود." },
    ],
  }),
  component: () => <RecordPage config={recordByKey("referrals")} />,
});
