import { createFileRoute } from "@tanstack/react-router";

import { PublicFeedback } from "@/components/PublicFeedback";

export const Route = createFileRoute("/feedback/$token")({
  head: () => ({
    meta: [
      { title: "نموذج الآراء والرسائل | ذات | THAT" },
      { name: "description", content: "نموذج آمن لمشاركة الآراء والمقترحات مع الموجه الطلابي." },
    ],
  }),
  component: FeedbackRoute,
});

function FeedbackRoute() {
  const { token } = Route.useParams();
  return <PublicFeedback token={token} />;
}
