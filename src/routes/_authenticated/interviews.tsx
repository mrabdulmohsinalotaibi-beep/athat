import { createFileRoute } from "@tanstack/react-router";
import { RecordPage } from "@/components/RecordPage";
import { recordByKey } from "@/lib/records";

export const Route = createFileRoute("/_authenticated/interviews")({
  head: () => ({
    meta: [
      { title: "المقابلات والتواصل | منصة الذات" },
      { name: "description", content: "مقابلات الطلاب وأولياء الأمور والمعلمين ونتائجها." },
      { property: "og:title", content: "المقابلات والتواصل | منصة الذات" },
      { property: "og:description", content: "مقابلات الطلاب وأولياء الأمور والمعلمين ونتائجها." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <RecordPage config={recordByKey("interviews")} />,
});
