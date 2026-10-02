import { createFileRoute } from "@tanstack/react-router";
import { Clock3, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/upgrade-requests/")({
  head: () => ({
    meta: [
      { title: "طلبات ترقية الباقات | الذات" },
      {
        name: "description",
        content: "صفحة إدارة طلبات الترقية — لا تعرض بيانات طلبات غير موصولة بقاعدة البيانات.",
      },
    ],
  }),
  component: AdminUpgradeRequestsPage,
});

function AdminUpgradeRequestsPage() {
  return (
    <div dir="rtl" className="reference-screen mx-auto max-w-3xl space-y-6">
      <div>
        <Badge variant="secondary" className="gap-1.5">
          <ShieldCheck className="size-3.5 text-primary" />
          لوحة المشرف
        </Badge>
        <h1 className="mt-3 text-2xl font-black">طلبات ترقية الباقات</h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          هذه الصفحة متوقفة مؤقتًا حتى يتم ربط طلبات الترقية بجدول وقواعد صلاحيات فعلية في قاعدة البيانات.
        </p>
      </div>

      <section className="rounded-lg border border-border border-[#D9C0A3]/35 bg-[#FFFDF9] p-6">
        <div className="flex items-start gap-4">
          <span className="rounded-xl bg-[#E4ECDF] p-3 text-[#264938]">
            <Clock3 className="size-5" />
          </span>
          <div>
            <h2 className="font-bold">لا توجد بيانات تشغيلية معروضة</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              لن يتم عرض أسماء أو طلبات وهمية، ولن تعمل أزرار الموافقة أو الرفض محليًا دون حفظ فعلي.
              يمكن تفعيل هذه الصفحة بعد إضافة مخطط طلبات الترقية وصلاحيات المشرف والمعالجة الآمنة.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
