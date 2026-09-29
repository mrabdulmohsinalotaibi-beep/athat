import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
        <h1 className="text-2xl font-extrabold">الاستشارات الواردة</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          كل ما يرد من استمارات الموقع العام: طلبات الاستشارة الفردية، إحالات المعلمين، والبلاغات
          السرية.
        </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/posts"><ArrowRight className="size-4" /> خدمات الموجه</Link>
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="size-4" /> تحديث
          </Button>
        </div>
      </div>
      <RequestsInbox />
    </div>
  );
}
