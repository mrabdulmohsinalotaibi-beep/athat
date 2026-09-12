import { createFileRoute } from "@tanstack/react-router";
import { RecordPage } from "@/components/RecordPage";
import { recordByKey } from "@/lib/records";

export const Route = createFileRoute("/_authenticated/programs")({
  head: () => ({
    meta: [
      { title: "البرامج والأنشطة | منصة ذات" },
      { name: "description", content: "البرامج الإرشادية الوقائية والإنمائية والعلاجية والفئات المستهدفة." },
      { property: "og:title", content: "البرامج والأنشطة | منصة ذات" },
      { property: "og:description", content: "البرامج الإرشادية الوقائية والإنمائية والعلاجية والفئات المستهدفة." },
    ],
  }),
  component: () => <RecordPage config={recordByKey("programs")} />,
});
