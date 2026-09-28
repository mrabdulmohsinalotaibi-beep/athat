import { createFileRoute } from "@tanstack/react-router";
import { RecordPage } from "@/components/RecordPage";
import { recordByKey } from "@/lib/records";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCheck, HeartHandshake, ShieldCheck, Siren } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cases")({
  head: () => ({
    meta: [
      { title: "الحالات الخاصة | الذات" },
      { name: "description", content: "سجل الحالات الخاصة وإجراءات الرصد والمتابعة والإحالة بسرية." },
      { property: "og:title", content: "الحالات الخاصة | منصة الذات" },
      { property: "og:description", content: "إدارة ومتابعة الحالات الخاصة بسرية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpecialCasesPage,
});

function SpecialCasesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">الحالات الخاصة</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          مساحة عمل للموجه الطلابي لرصد الاحتياج، وتوثيق التدخلات، ومتابعة الإحالات مع مراعاة السرية.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
            <ClipboardCheck className="size-5 text-primary" />
            <CardTitle className="text-sm">الرصد الأولي</CardTitle>
          </CardHeader>
          <CardContent className="text-xs leading-6 text-muted-foreground">
            تسجيل الملاحظة بعبارات موضوعية، وتحديد مصدرها وتاريخها دون إطلاق أحكام أو تشخيص.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
            <HeartHandshake className="size-5 text-primary" />
            <CardTitle className="text-sm">خطة المساندة</CardTitle>
          </CardHeader>
          <CardContent className="text-xs leading-6 text-muted-foreground">
            تحديد احتياج الطالب، وهدف قابل للمتابعة، والإجراءات والمسؤول عن كل إجراء.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
            <ShieldCheck className="size-5 text-primary" />
            <CardTitle className="text-sm">السرية والخصوصية</CardTitle>
          </CardHeader>
          <CardContent className="text-xs leading-6 text-muted-foreground">
            قصر الاطلاع على أصحاب الصلاحية، وتجنب إدراج تفاصيل حساسة في المستندات العامة.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
            <Siren className="size-5 text-destructive" />
            <CardTitle className="text-sm">الحالات العاجلة</CardTitle>
          </CardHeader>
          <CardContent className="text-xs leading-6 text-muted-foreground">
            عند وجود خطر مباشر على سلامة الطالب، اتبع إجراءات الحماية والإبلاغ المعتمدة فورًا ولا تؤخرها لأجل التوثيق.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">خطوات عمل مقترحة</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-1.5 pr-5 text-sm leading-6">
            <li>استقبال الحالة والتحقق من المعلومات الأساسية ومصدرها.</li>
            <li>إجراء مقابلة مناسبة وتوثيق الوقائع والاحتياج بلغة مهنية محايدة.</li>
            <li>التنسيق مع ولي الأمر والجهات المدرسية المختصة وفق الصلاحيات والإجراءات المعتمدة.</li>
            <li>وضع خطة تدخل ومواعيد متابعة، ثم توثيق النتائج والإغلاق أو الإحالة.</li>
          </ol>
        </CardContent>
      </Card>

      <RecordPage config={recordByKey("cases")} />
    </div>
  );
}
