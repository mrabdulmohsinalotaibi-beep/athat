import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

import { PublicLayout } from "@/components/PublicLayout";

export const Route = createFileRoute("/forms/")({
  head: () => ({
    meta: [
      { title: "الاستمارات الإلكترونية | الذات" },
      {
        name: "description",
        content:
          "الاستمارات الإلكترونية متاحة من رابط مدونة الموجه الطلابي الخاصة بكل مدرسة لضمان توجيه الطلب للموجه الصحيح.",
      },
      { property: "og:title", content: "الاستمارات الإلكترونية | الذات" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: FormsIndexPage,
});

function FormsIndexPage() {
  return (
    <PublicLayout
      title="الاستمارات الإلكترونية"
      subtitle="ترتبط كل استمارة بمدرسة وموجه محددين حتى يصل الطلب إلى الجهة الصحيحة."
    >
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-8">
        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-8 text-center">
          <ShieldCheck className="mx-auto size-10 text-primary" />
          <h2 className="mt-4 text-xl font-black">افتح الاستمارة من مدونة الموجه</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-8 text-muted-foreground">
            استخدم رابط مدونة الموجه الطلابي الذي تشاركه المدرسة. من هناك يمكنك فتح
            طلب الاستشارة أو إحالة الطالب أو الإبلاغ السري، وسيُربط الطلب تلقائيًا
            بالمدرسة والموجه الصحيحين.
          </p>
          <p className="mt-4 text-xs leading-6 text-muted-foreground">
            إذا وصلت إلى هذه الصفحة من رابط قديم، ارجع إلى رابط المدرسة أو مدونة الموجه
            ثم اختر الاستمارة المطلوبة.
          </p>
        </div>
      </section>
    </PublicLayout>
  );
}
