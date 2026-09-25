import { createFileRoute } from "@tanstack/react-router";
import { RecordPage } from "@/components/RecordPage";
import { recordByKey } from "@/lib/records";

export const Route = createFileRoute("/_authenticated/referrals")({
  head: () => ({
    meta: [
      { title: "سجل الإحالات | ذات | THAT" },
      { name: "description", content: "إحالة الطلاب إلى الجهات المختصة ومتابعة الردود." },
      { property: "og:title", content: "سجل الإحالات | منصة الذات" },
      { property: "og:description", content: "إحالة الطلاب إلى الجهات المختصة ومتابعة الردود." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <RecordPage config={recordByKey("referrals")} />,
});
