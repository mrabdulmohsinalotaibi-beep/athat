import { createFileRoute } from "@tanstack/react-router";

import { PublicLayout } from "@/components/PublicLayout";
import { PublicRequestForm } from "@/components/PublicRequestForm";

export const Route = createFileRoute("/forms/consultation")({
  head: () => ({
    meta: [
      { title: "طلب استشارة فردية | الذات" },
      {
        name: "description",
        content: "استمارة طلب استشارة فردية من الطالب أو ولي الأمر لدى الموجه الطلابي.",
      },
      { property: "og:title", content: "طلب استشارة فردية | الذات" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ConsultationFormPage,
});

function ConsultationFormPage() {
  return (
    <PublicLayout
      title="طلب استشارة فردية"
      subtitle="للطلاب وأولياء الأمور: احجز موعداً مع الموجه الطلابي لمناقشة موضوع أكاديمي أو سلوكي أو نفسي أو مهني."
    >
      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-8">
        <PublicRequestForm
          kind="استشارة فردية"
          heading="بيانات طلب الاستشارة"
          intro="أكمل البيانات التالية وسيتواصل معك الموجه الطلابي لتحديد موعد المقابلة."
          roleOptions={["طالب", "ولي أمر"]}
          topicLabel="مجال الاستشارة"
          topicOptions={["إرشاد أكاديمي", "إرشاد سلوكي", "إرشاد نفسي", "إرشاد مهني", "موضوع آخر"]}
          detailsLabel="تفاصيل الموضوع"
          detailsPlaceholder="اشرح الموضوع الذي ترغب بمناقشته مع الموجه الطلابي…"
          showPreferredTime
          privacyNote="بيانات الطلب تصل إلى الموجه الطلابي فقط، وتُحفظ ضمن سجلات سرية لا يطلع عليها غيره."
        />
      </section>
    </PublicLayout>
  );
}
