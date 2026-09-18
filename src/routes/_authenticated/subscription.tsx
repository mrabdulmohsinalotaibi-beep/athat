import { createFileRoute } from "@tanstack/react-router";
import { Check, Crown, Sparkles, Send, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/subscription")({
  head: () => ({ meta: [
    { title: "الاشتراك والترقية | منصة الذات" },
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
  const [requestSent, setRequestSent] = useState(false);
  const [customMessage, setCustomMessage] = useState("");

  const handleUpgradeRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setRequestSent(true);
  };

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

        {/* قسم إرسال ملاحظة أو طلب اهتمام مسبق للباقات المستقبلية */}
        <div className="mt-8 border-t pt-6">
          <h3 className="text-sm font-bold text-foreground mb-2">ترغب في حجز مكانك أو إرسال مقترح للباقات القادمة؟</h3>
          {requestSent ? (
            <div className="rounded-md bg-emerald-500/10 p-3 text-center text-sm font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              شكراً لك! تم تسجيل اهتمامك وملاحظتك بنجاح، وسيتم إشعارك فور تفعيل نظام الاشتراكات.
            </div>
          ) : (
            <form onSubmit={handleUpgradeRequest} className="space-y-3">
              <textarea
                placeholder="أكتب أي مقترح أو ملاحظة حول الباقات المستقبلية (اختياري)..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full rounded-md border bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                rows={2}
              />
              <Button type="submit" className="w-full sm:w-auto gap-2">
                <Send className="size-4" /> تسجیل الاهتمام بالباقات القادمة
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
