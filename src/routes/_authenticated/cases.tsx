import { createFileRoute } from "@tanstack/react-router";
import { RecordPage } from "@/components/RecordPage";
import { recordByKey } from "@/lib/records";

export const Route = createFileRoute("/_authenticated/cases")({
  head: () => ({
    meta: [
      { title: "الحالات الإرشادية | منصة ذات" },
      { name: "description", content: "دراسة الحالة والمتابعة الفردية وخطط التدخل الإرشادي." },
      { property: "og:title", content: "الحالات الإرشادية | منصة ذات" },
      { property: "og:description", content: "دراسة الحالة والمتابعة الفردية وخطط التدخل الإرشادي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <RecordPage config={recordByKey("cases")} />,
});
