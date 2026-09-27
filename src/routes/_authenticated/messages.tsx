import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({
    meta: [
      { title: "الآراء والرسائل | الذات" },
      { name: "description", content: "إدارة آراء المستفيدين والرسائل الواردة ومتابعة الردود في منصة الذات." },
      { property: "og:title", content: "الآراء والرسائل | الذات" },
      { property: "og:description", content: "إدارة آراء المستفيدين والرسائل الواردة ومتابعة الردود في منصة الذات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
