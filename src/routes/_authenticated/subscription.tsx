import { createFileRoute } from "@tanstack/react-router";
import { Check, Crown, Sparkles, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/subscription")({
  head: () => ({ meta: [
    { title: "الاشتراك والترقية | الذات" },
    { name: "description", content: "جميع الخصائص متاحة حالياً للجميع، وقريباً تفعيل نظام الاشتراكات والترقية." },
    { property: "og:title", content: "الاشتراك والترقية | منصة الذات" },
    { property: "og:description", content: "جميع خصائص منصة الذات مفتوحة للجميع مؤقتاً." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: SubscriptionPage,
});

const allUnlockedFeatures = [
  "حالات وشواهد بلا حدود (مفتوحة حالياً)",
  "تقارير فردية ومجمعة PDF (مفتوحة حالياً)",
  "إدارة السجلات والنماذج الكاملة (مفتوحة حالياً)",
  "استيراد الطلاب ومشاركة التقارير (متاح للجميع)",
  "دعم فني وأولوية خاصة (متاح لجميع المستخدمين)",
];

function SubscriptionPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <div>
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-emerald-600 gap-1.5">
            <Sparkles className="size-3.5" /> جميع الخصائص مفتاحية ومجانية حالياً
          </Badge>
          <Badge variant="outline" className="text-amber-600 border-amber-300 gap-1.5">
            <Clock className="size-3.5" /> قريباً تفعيل الاشتراكات
          </Badge>
        </div>
        <h1 className="mt-3 text-3xl font-extrabold">الاشتراكات والخصائص المتاحة</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          نظراً للمرحلة الحالية، تم فتح كافة مميزات وخصائص المنصة بالكامل لجميع المستخدمين مجاناً ودون قيود، وسيتم إطلاق نظام الاشتراكات والترقيات رسمياً قريباً.
        </p>
      </div>

      <div className="rounded-xl border-2 border-primary/40 bg-card p-8 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <Crown className="size-6 text-primary" />
              <h2 className="text-2xl font-bold">باقة الموجه الشاملة (مفتوحة بالكامل)</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground max-w-xl">
              تتمتع الآن بصلاحيات مطلقة وكاملة على جميع أدوات منصة الذات للتوجيه الطلابي دون الحاجة لأي دفع أو ترقية حالية.
            </p>

            <ul className="mt-6 grid gap-3 sm:grid-cols-2 text-sm">
              {allUnlockedFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2 font-medium">
                  <Check className="size-4 text-emerald-600 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-6">
          <h3 className="text-sm font-bold text-foreground">الاشتراكات المستقبلية</h3>
          <p className="mt-2 rounded-lg border border-amber-300/60 bg-amber-500/5 p-4 text-sm leading-7 text-muted-foreground">
            التسجيل الإلكتروني للاهتمام بالباقات لم يُفعّل بعد. لن تعرض المنصة رسالة نجاح إلا بعد
            ربط الطلب بقاعدة البيانات وصلاحيات الإدارة بشكل فعلي.
          </p>
        </div>
      </div>
    </div>
  );
}
