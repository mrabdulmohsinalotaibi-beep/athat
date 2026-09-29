import { createFileRoute } from "@tanstack/react-router";

import { PublicLayout } from "@/components/PublicLayout";
import { PublicRequestForm } from "@/components/PublicRequestForm";

export const Route = createFileRoute("/forms/report")({
  validateSearch: (search: Record<string, unknown>): { school?: string; portal?: string } => {
    const school = typeof search["school"] === "string" ? search["school"] : "";
    const portal = typeof search["portal"] === "string" ? search["portal"] : "";
    return {
      ...(school ? { school } : {}),
      ...(portal ? { portal } : {}),
    };
  },
  head: () => ({
    meta: [
      { title: "الإبلاغ السري | الذات" },
      {
        name: "description",
        content: "استمارة الإبلاغ السري عن التنمر أو المشكلات التي تمس سلامة الطلاب داخل المدرسة.",
      },
      { property: "og:title", content: "الإبلاغ السري | الذات" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ReportFormPage,
});

function ReportFormPage() {
  const { school, portal } = Route.useSearch();
  return (
    <PublicLayout
      schoolSlug={school}
      title="الإبلاغ السري"
      subtitle="بلّغ عن التنمر أو أي مشكلة تمس سلامة الطلاب. يمكنك الإبلاغ دون ذكر اسمك، ويصل البلاغ إلى الموجه الطلابي فقط."
    >
      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-8">
        <PublicRequestForm
          schoolSlug={school}
          portalToken={portal}
          kind="إبلاغ سري"
          heading="بيانات البلاغ"
          intro="ذكر تفاصيل دقيقة (المكان والوقت والأشخاص) يساعد على التدخل السريع."
          roleLabel="صفة المُبلغ"
          roleOptions={["طالب", "ولي أمر", "معلم", "أخرى"]}
          topicLabel="نوع البلاغ"
          topicOptions={[
            "تنمر لفظي",
            "تنمر جسدي",
            "تنمر إلكتروني",
            "إيذاء أو خطر على السلامة",
            "مشكلة أسرية",
            "مشكلة أخرى",
          ]}
          detailsLabel="تفاصيل البلاغ"
          detailsPlaceholder="اذكر ما حدث، ومكان وزمان الحادثة، وهل تكرر من قبل…"
          requireIdentity={false}
          allowAnonymous
          privacyNote="البلاغ سري تماماً ولا يُفصح عن هوية المُبلغ. عند اختيار الإبلاغ دون اسم لن يتم حفظ أي بيانات تعريفية عنك."
        />
      </section>
    </PublicLayout>
  );
}
