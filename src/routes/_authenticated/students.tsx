import { createFileRoute } from "@tanstack/react-router";
import { RecordPage } from "@/components/RecordPage";
import { recordByKey } from "@/lib/records";

export const Route = createFileRoute("/_authenticated/students")({
  head: () => ({
    meta: [
      { title: "سجل الطلاب | منصة ذات" },
      { name: "description", content: "بيانات الطلاب وأولياء الأمور والفصول والحالة الصحية والاجتماعية." },
      { property: "og:title", content: "سجل الطلاب | منصة ذات" },
      { property: "og:description", content: "بيانات الطلاب وأولياء الأمور والفصول والحالة الصحية والاجتماعية." },
    ],
  }),
  component: () => <RecordPage config={recordByKey("students")} />,
});
