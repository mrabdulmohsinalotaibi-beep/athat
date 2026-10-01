import { createFileRoute } from "@tanstack/react-router";
import { CalendarPage } from "@/components/CalendarPage";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "تقويم الجلسات والمواعيد | الذات" },
      { name: "description", content: "عرض أسبوعي وشهري لمواعيد التوجيه الطلابي وإدارة السجلات." },
      { property: "og:title", content: "تقويم الجلسات والمواعيد | الذات" },
      { property: "og:description", content: "جدول أسبوعي وشهري للجلسات والمتابعات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CalendarPage,
});
