import { createFileRoute } from "@tanstack/react-router";
import { Check, Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/subscription")({
  head: () => ({ meta: [
    { title: "الاشتراك والترقية | منصة الذات" },
    { name: "description", content: "إدارة خطة منصة الذات ومقارنة مزايا الخطة المجانية وباقة الموجه المحترف." },
    { property: "og:title", content: "الاشتراك والترقية | منصة الذات" },
    { property: "og:description", content: "مقارنة خطط منصة الذات للموجه الطلابي." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: SubscriptionPage,
});

const currentFeatures = ["حالات وشواهد بلا حدود", "تقارير فردية ومجمعة PDF", "المساعد الذكي الكامل", "استيراد الطلاب ومشاركة التقارير"];
const futureFeatures = ["خدمات مؤسسية إضافية", "خيارات دعم وتخصيص موسعة", "مزايا جديدة للجهات التعليمية", "تفاصيل الباقة ستعلن لاحقاً"];

function SubscriptionPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <div>
        <Badge variant="secondary">جميع الخصائص مفتوحة حالياً</Badge>
        <h1 className="mt-3 text-3xl font-extrabold">الاشتراكات المستقبلية</h1>
        <p className="mt-2 text-sm text-muted-foreground">يمكنك الآن استخدام جميع أدوات منصة الذات دون قيود، وستبقى هذه الصفحة مرجعاً للخطط المستقبلية.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-bold text-muted-foreground"><Sparkles className="size-5 text-accent" />الوصول الكامل الحالي</p>
          <p className="mt-3 text-3xl font-extrabold">متاح للجميع</p>
          <ul className="mt-6 space-y-3 text-sm">{currentFeatures.map((f) => <li key={f} className="flex gap-2"><Check className="size-4 text-accent" />{f}</li>)}</ul>
          <Button variant="outline" className="mt-8 w-full" disabled>مفعّل بالكامل</Button>
        </div>
        <div className="rounded-lg border-2 border-primary bg-card p-6 shadow-lg">
          <div className="flex items-center justify-between"><p className="flex items-center gap-2 text-sm font-bold"><Crown className="size-5 text-primary" />الموجه المحترف</p><Badge>قريباً</Badge></div>
          <p className="mt-3 text-3xl font-extrabold">خيارات مستقبلية</p>
          <ul className="mt-6 space-y-3 text-sm">{futureFeatures.map((f) => <li key={f} className="flex gap-2"><Check className="size-4 text-accent" />{f}</li>)}</ul>
          <Button className="mt-8 w-full" disabled><Crown className="size-4" />ستُعلن التفاصيل لاحقاً</Button>
        </div>
      </div>
    </div>
  );
}
