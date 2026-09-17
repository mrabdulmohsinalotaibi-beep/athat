import { createFileRoute } from "@tanstack/react-router";
import { Check, Crown, Sparkles, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/subscription")({
  head: () => ({ meta: [
    { title: "الاشتراك والترقية | منصة الذات" },
    { name: "description", content: "إدارة خطة منصة الذات والترقية إلى باقة الموجه المحترف." },
    { property: "og:title", content: "الاشتراك والترقية | منصة الذات" },
    { property: "og:description", content: "مقارنة خطط منصة الذات للموجه الطلابي." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: SubscriptionPage,
});

const basicFeatures = ["حالات وشواهد أساسية", "تقارير فردية مبسطة", "استيراد الطلاب المحدود"];
const proFeatures = ["حالات وشواهد بلا حدود", "تقارير فردية ومجمعة PDF", "المساعد الذكي الكامل", "استيراد الطلاب ومشاركة التقارير", "دعم فني وأولوية خاصة"];

function SubscriptionPage() {
  const [requestSent, setRequestSent] = useState(false);
  const [customMessage, setCustomMessage] = useState("");

  const handleUpgradeRequest = (e: React.FormEvent) => {
    e.preventDefault();
    // هنا يمكنك ربط الطلب بقاعدة البيانات (مثل Supabase) أو إرساله كرسالة
    setRequestSent(true);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <div>
        <Badge variant="secondary">باقتك الحالية: الأساسية</Badge>
        <h1 className="mt-3 text-3xl font-extrabold">الاشتراكات والترقية</h1>
        <p className="mt-2 text-sm text-muted-foreground">أنت تستخدم الباقة الأساسية حالياً. يمكنك ترقيتك للحصول على مميزات الموجه المحترف عبر إرسال طلب تفعيل.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* الباقة الأساسية (الحالية الافتراضية) */}
        <div className="rounded-lg border bg-card p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                <Sparkles className="size-5 text-accent" />الباقة الأساسية
              </p>
              <Badge variant="outline">باقتك الحالية</Badge>
            </div>
            <p className="mt-3 text-3xl font-extrabold">مجانية</p>
            <ul className="mt-6 space-y-3 text-sm">
              {basicFeatures.map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="size-4 text-accent" />{f}
                </li>
              ))}
            </ul>
          </div>
          <Button variant="outline" className="mt-8 w-full" disabled>
            مفعلة حالياً
          </Button>
        </div>

        {/* باقة الموجه المحترف (مع خيار طلب الترقية برسايل) */}
        <div className="rounded-lg border-2 border-primary bg-card p-6 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-bold">
                <Crown className="size-5 text-primary" />الموجه المحترف
              </p>
              <Badge>موصى بها</Badge>
            </div>
            <p className="mt-3 text-3xl font-extrabold">ترقية احترافية</p>
            <ul className="mt-6 space-y-3 text-sm">
              {proFeatures.map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="size-4 text-accent" />{f}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8">
            {requestSent ? (
              <div className="rounded-md bg-accent/10 p-3 text-center text-sm font-medium text-accent">
                تم إرسال طلب الترقية بنجاح وسيتم مراجعته قريباً.
              </div>
            ) : (
              <form onSubmit={handleUpgradeRequest} className="space-y-3">
                <textarea
                  placeholder="أكتب رسالة الطلب أو سبب الاحتياج للباقة (اختياري)..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full rounded-md border bg-background p-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={2}
                />
                <Button type="submit" className="w-full gap-2">
                  <Send className="size-4" /> طلب الترقية للباقة الاحترافية
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}