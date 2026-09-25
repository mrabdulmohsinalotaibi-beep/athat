import { createFileRoute } from "@tanstack/react-router";
import { StudentsPage } from "@/components/StudentsPage";

export const Route = createFileRoute("/_authenticated/students")({
  head: () => ({
    meta: [
      { title: "سجل الطلاب | ذات | THAT" },
      { name: "description", content: "بيانات الطلاب وأولياء الأمور والفصول والحالة الصحية والاجتماعية." },
      { property: "og:title", content: "سجل الطلاب | منصة الذات" },
      { property: "og:description", content: "بيانات الطلاب وأولياء الأمور والفصول والحالة الصحية والاجتماعية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentsPage,
});
