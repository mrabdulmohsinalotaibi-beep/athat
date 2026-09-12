import { createFileRoute } from "@tanstack/react-router";
import { Check, Crown, LockKeyhole } from "lucide-react";
import { useSubscription } from "@/lib/subscription";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/subscription")({
  head: () => ({ meta: [
    { title: "الاشتراك والترقية | منصة ذات" },
    { name: "description", content: "إدارة خطة منصة ذات ومقارنة مزايا الخطة المجانية وباقة الموجه المحترف." },
    { property: "og:title", content: "الاشتراك والترقية | منصة ذات" },
    { property: "og:description", content: "مقارنة خطط منصة ذات للموجه الطلابي." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: SubscriptionPage,
});

const freeFeatures = ["حتى 5 حالات إرشادية", "تقارير فردية PDF", "استيراد الطلاب من Excel", "السجلات الأساسية"];
const proFeatures = ["حالات وشواهد بلا حدود", "تقارير مجمعة واحترافية", "المساعد الذكي الكامل", "مشاركة التقارير عبر واتساب"];

function SubscriptionPage() {
  const { data } = useSubscription();
  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <div>
        <Badge variant="secondary">خطتك الحالية: {data?.plan === "pro" ? "الموجه المحترف" : "المجانية"}</Badge>
        <h1 className="mt-3 text-3xl font-extrabold">اختر الخطة المناسبة لعملك</h1>
        <p className="mt-2 text-sm text-muted-foreground">ابدأ مجاناً، ثم انتقل إلى الأدوات المتقدمة عند الحاجة.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-sm font-bold text-muted-foreground">الخطة المجانية</p>
          <p className="mt-3 text-3xl font-extrabold">مجاناً</p>
          <ul className="mt-6 space-y-3 text-sm">{freeFeatures.map((f) => <li key={f} className="flex gap-2"><Check className="size-4 text-primary" />{f}</li>)}</ul>
          <Button variant="outline" className="mt-8 w-full" disabled>خطتك الحالية</Button>
        </div>
        <div className="rounded-lg border-2 border-primary bg-card p-6 shadow-lg">
          <div className="flex items-center justify-between"><p className="flex items-center gap-2 text-sm font-bold"><Crown className="size-5 text-primary" />الموجه المحترف</p><Badge>قريباً</Badge></div>
          <p className="mt-3 text-3xl font-extrabold">اشتراك مرن</p>
          <ul className="mt-6 space-y-3 text-sm">{proFeatures.map((f) => <li key={f} className="flex gap-2"><Check className="size-4 text-primary" />{f}</li>)}</ul>
          <Button className="mt-8 w-full" disabled><LockKeyhole className="size-4" />سيتاح الاشتراك قريباً</Button>
        </div>
      </div>
    </div>
  );
}
