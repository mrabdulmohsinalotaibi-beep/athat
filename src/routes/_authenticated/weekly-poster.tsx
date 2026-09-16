import { createFileRoute } from "@tanstack/react-router";

import { WeeklyGuidancePoster } from "@/components/WeeklyGuidancePoster";

export const Route = createFileRoute("/_authenticated/weekly-poster")({
  head: () => ({
    meta: [
      { title: "لوحة التوجيه الطلابي الأسبوعية | منصة الذات" },
      { name: "description", content: "توليد لوحة التوجيه الطلابي الأسبوعية تلقائياً بالذكاء الاصطناعي." },
    ],
  }),
  component: WeeklyGuidancePoster,
});
