import { createFileRoute } from "@tanstack/react-router";

import { PublicLayout } from "@/components/PublicLayout";
import { PublicRequestForm } from "@/components/PublicRequestForm";

export const Route = createFileRoute("/forms/referral")({
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
      { title: "استمارة إحالة طالب | الذات" },
      {
        name: "description",
        content:
          "استمارة خاصة بالمعلمين لإحالة طالب إلى التوجيه الطلابي مع الملاحظات والإجراءات السابقة.",
      },
      { property: "og:title", content: "استمارة إحالة طالب | الذات" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ReferralFormPage,
});

function ReferralFormPage() {
  const { school, portal } = Route.useSearch();
  return (
    <PublicLayout
      schoolSlug={school}
      title="استمارة إحالة طالب"
      subtitle="خاصة بالمعلمين: أحل الطالب إلى التوجيه الطلابي مع توضيح الملاحظات والإجراءات التي سبق اتخاذها."
    >
      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-8">
        <PublicRequestForm
          schoolSlug={school}
          portalToken={portal}
          kind="إحالة طالب"
          heading="بيانات الإحالة"
          intro="كلما كانت الملاحظات أدق، كان التدخل الإرشادي أسرع وأكثر فاعلية."
          roleLabel="صفة المحيل"
          roleOptions={["معلم", "وكيل", "رائد نشاط", "مدير المدرسة"]}
          topicLabel="سبب الإحالة"
          topicOptions={[
            "تدني التحصيل الدراسي",
            "الغياب والتأخر",
            "مخالفة سلوكية",
            "حالة نفسية أو انسحاب",
            "تنمر أو مشكلة بين الطلاب",
            "سبب آخر",
          ]}
          detailsLabel="وصف الحالة والإجراءات السابقة"
          detailsPlaceholder="صف سلوك الطالب وملاحظاتك داخل الصف، والإجراءات التي اتخذتها قبل الإحالة…"
          privacyNote="تُحفظ الإحالة ضمن سجلات الطالب السرية لدى الموجه الطلابي، ولا تظهر لأي مستخدم آخر."
        />
      </section>
    </PublicLayout>
  );
}
