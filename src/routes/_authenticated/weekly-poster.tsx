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
        content: "إعداد لوحة التوجيه الطلابي الأسبوعية وتعديل نصها وحفظها بصيغة PDF الرسمية.",
      },
      {
        property: "og:title",
        content: "لوحة التوجيه الطلابي الأسبوعية | منصة ذات",
      },
      {
        property: "og:description",
        content: "أنشئ لوحة توجيهية أسبوعية للطلاب ثم احفظها بصيغة PDF الرسمية.",
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
