import { createFileRoute } from "@tanstack/react-router";
import { RecordPage } from "@/components/RecordPage";
import { recordByKey } from "@/lib/records";

export const Route = createFileRoute("/_authenticated/cases")({
  head: () => ({
    meta: [
      { title: "حالات التوجيه | الذات" },
      { name: "description", content: "دراسة الحالة والمتابعة الفردية وخطط التدخل الطلابي." },
      { property: "og:title", content: "حالات التوجيه | منصة الذات" },
      { property: "og:description", content: "دراسة الحالة والمتابعة الفردية وخطط التدخل الطلابي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <RecordPage config={recordByKey("cases")} />,
});
