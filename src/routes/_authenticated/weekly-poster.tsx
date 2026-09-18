import { createFileRoute } from "@tanstack/react-router";

import { WeeklyGuidancePoster } from "@/components/WeeklyGuidancePoster";

export const Route = createFileRoute("/_authenticated/weekly-poster")({
  head: () => ({
    meta: [
      {
        title: "لوحة التوجيه الطلابي الأسبوعية | منصة ذات",
      },
      {
        name: "description",
        content:
          "إعداد وتوليد لوحة التوجيه الطلابي الأسبوعية باستخدام الذكاء الاصطناعي، مع إمكانية تعديل النص وتصديره بصيغة PNG أو PDF.",
      },
      {
        property: "og:title",
        content: "لوحة التوجيه الطلابي الأسبوعية | منصة ذات",
      },
      {
        property: "og:description",
        content:
          "أنشئ لوحة توجيهية أسبوعية للطلاب بالذكاء الاصطناعي، ثم عدّلها واحفظها بصيغة PNG أو PDF.",
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
        content:
          "توليد وتجهيز لوحات التوجيه الطلابي الأسبوعية بالذكاء الاصطناعي.",
      },
    ],
  }),

  component: WeeklyGuidancePoster,
});