import { createFileRoute } from "@tanstack/react-router";

import { RequestsInbox } from "@/components/RequestsInbox";

export const Route = createFileRoute("/_authenticated/requests")({
  head: () => ({
    meta: [
      { title: "صندوق الطلبات والإحالات | الذات" },
      {
        name: "description",
        content:
          "مراجعة طلبات الاستشارة والإحالات والبلاغات الواردة من الاستمارات العامة ومتابعتها.",
      },
      { property: "og:title", content: "صندوق الطلبات والإحالات | منصة الذات" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RequestsPage,
});

function RequestsPage() {
  return (
    <div className="space-y-6">
      <div className="no-print">
        <h1 className="text-2xl font-extrabold">صندوق الطلبات والإحالات</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          كل ما يرد من استمارات الموقع العام: طلبات الاستشارة الفردية، إحالات المعلمين، والبلاغات
          السرية.
        </p>
      </div>
      <RequestsInbox />
    </div>
  );
}
