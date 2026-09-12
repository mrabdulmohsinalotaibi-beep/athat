import { createFileRoute } from "@tanstack/react-router";
import { RecordPage } from "@/components/RecordPage";
import { recordByKey } from "@/lib/records";

export const Route = createFileRoute("/_authenticated/behavior")({
  head: () => ({
    meta: [
      { title: "السلوك والمتابعة | منصة الذات" },
      { name: "description", content: "رصد المخالفات السلوكية والإجراءات ونتائج المتابعة." },
      { property: "og:title", content: "السلوك والمتابعة | منصة الذات" },
      { property: "og:description", content: "رصد المخالفات السلوكية والإجراءات ونتائج المتابعة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <RecordPage config={recordByKey("behavior")} />,
});
