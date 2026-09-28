import { createFileRoute } from "@tanstack/react-router";

import { WeeklyGuidancePoster } from "@/components/WeeklyGuidancePoster";

export const Route = createFileRoute("/_authenticated/weekly-poster")({
  head: () => ({
    meta: [
      {
        title: "لوحة التوجيه الطلابي الأسبوعية | الذات",
      },
      {
        name: "description",
        content: "إعداد لوحة التوجيه الطلابي الأسبوعية وتعديل نصها ومراجعتها داخل المنصة.",
      },
      {
        property: "og:title",
        content: "لوحة التوجيه الطلابي الأسبوعية | منصة ذات",
      },
      {
        property: "og:description",
        content: "أنشئ لوحة توجيهية أسبوعية للطلاب وراجعها داخل المنصة.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        name: "twitter:card",
        content: "summary",
      },
      {
        name: "twitter:title",
        content: "لوحة التوجيه الطلابي الأسبوعية | منصة ذات",
      },
      {
        name: "twitter:description",
        content: "تجهيز لوحات التوجيه الطلابي الأسبوعية وطباعتها.",
      },
    ],
  }),

  component: WeeklyGuidancePoster,
});
