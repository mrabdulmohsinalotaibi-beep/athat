import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  Chrome,
  ExternalLink,
  LockKeyhole,
  MonitorUp,
  ShieldCheck,
  RefreshCw,
  ServerCog,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getNoorConnectorStatus } from "@/lib/noor-connector.functions";

const NOOR_URL = "https://noor.moe.gov.sa/Noor/Login.aspx";
const MADRASATI_URL = "https://schools.madrasati.sa/";

export function NoorConnectionPanel() {
  const connectorStatus = useQuery({
    queryKey: ["noor-connector-status"],
    queryFn: async () => getNoorConnectorStatus(),
    staleTime: 60_000,
    retry: 1,
  });
  const status = connectorStatus.data;

  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="border-b bg-gradient-to-l from-primary/10 via-card to-card p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xl font-black">
              <Chrome className="size-5 text-primary" /> إضافة «ذات» لنور ومدرستي
            </p>
            <p className="mt-1 max-w-3xl text-sm leading-7 text-muted-foreground">
              الاتصال المباشر يعمل من داخل صفحة نور أو مدرستي المفتوحة في متصفحك، بنفس النمط
              العملي المستخدم في إضافات الإدارة المدرسية: الإضافة تقرأ ما تسمح جلستك بعرضه،
              تطابقه مع «الذات»، وتجهز الحقول؛ الاعتماد النهائي يبقى بيدك.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild type="button">
              <a href={NOOR_URL} target="_blank" rel="noreferrer noopener">
                <ExternalLink className="size-4" /> فتح نور
              </a>
            </Button>
            <Button asChild type="button" variant="outline">
              <a href={MADRASATI_URL} target="_blank" rel="noreferrer noopener">
                <ExternalLink className="size-4" /> فتح مدرستي
              </a>
            </Button>
          </div>
        </div>
      </div>

      <div className="border-b bg-muted/15 p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-black">
              <ServerCog className="size-4 text-primary" /> حالة الموصل الرسمي
            </p>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              هذا الفحص يخص اتصال API/OAuth الرسمي إن تم توفير اعتماد من الجهة، وهو مستقل عن إضافة Athat Bridge داخل المتصفح.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={connectorStatus.isFetching} onClick={() => void connectorStatus.refetch()}>
            <RefreshCw className={`size-4 ${connectorStatus.isFetching ? "animate-spin" : ""}`} />
            تحديث الحالة
          </Button>
        </div>

        {connectorStatus.isLoading ? (
          <div className="mt-3 rounded-xl border bg-background p-3 text-xs text-muted-foreground">
            جارٍ التحقق من إعداد الموصل الرسمي...
          </div>
        ) : connectorStatus.isError ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-xs leading-6">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-700" />
            <span>تعذر قراءة حالة الموصل الرسمي حاليًا. لا يؤثر ذلك على الاستيراد بالملف أو Athat Bridge.</span>
          </div>
        ) : status?.configured ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3 text-xs">
              <p className="font-black text-emerald-700">إعداد الاتصال</p>
              <p className="mt-1 text-muted-foreground">مكتمل على الخادم</p>
            </div>
            <div className="rounded-xl border bg-background p-3 text-xs">
              <p className="font-black">القراءة الرسمية</p>
              <p className="mt-1 text-muted-foreground">{status.canRead ? "مسموحة بالإعداد الحالي" : "غير مفعلة"}</p>
            </div>
            <div className="rounded-xl border bg-background p-3 text-xs">
              <p className="font-black">الكتابة الرسمية</p>
              <p className="mt-1 text-muted-foreground">{status.canWrite ? "مسموحة بالإعداد الحالي" : "غير مفعلة"}</p>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-sky-500/25 bg-sky-500/5 p-3 text-xs leading-6">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-sky-700" />
            <div>
              <p className="font-black text-foreground">الموصل الرسمي غير مفعّل بعد</p>
              <p className="text-muted-foreground">
                النظام سيستمر بالمسارين المتاحين: الاستيراد الرسمي بالملف وAthat Bridge. لا يتم الادعاء بوجود ربط API مباشر قبل اكتمال الاعتماد الرسمي.
              </p>
              {(status?.missing?.length ?? 0) > 0 && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  إعدادات الخادم الناقصة: {status?.missing.join("، ")}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 p-5 xl:grid-cols-3">
        <Step
          number="1"
          icon={LockKeyhole}
          title="سجّل الدخول بنفسك"
          text="افتح نور أو مدرستي وسجّل الدخول بالطريقة المعتادة. الإضافة لا تقرأ كلمة المرور أو رمز التحقق."
        />
        <Step
          number="2"
          icon={MonitorUp}
          title="افتح أداة ذات داخل الصفحة"
          text="تظهر لوحة ذات فوق الصفحة الحالية وتتعامل فقط مع البيانات والجداول التي يملك حسابك صلاحية عرضها."
        />
        <Step
          number="3"
          icon={CheckCircle2}
          title="راجع ثم اعتمد"
          text="ذات تطابق الطلاب وتجهز الرصد. في نور يبقى زر الحفظ النهائي بيد المستخدم بعد المراجعة."
        />
      </div>

      <div className="grid gap-3 border-t bg-muted/20 p-5 sm:grid-cols-2">
        <div className="rounded-2xl border bg-background p-4">
          <ArrowDownToLine className="size-5 text-primary" />
          <p className="mt-3 font-black">نور / مدرستي ← الذات</p>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            قراءة الطلاب الظاهرين في الصفحة، مطابقة الاسم والهوية والفصل، ثم إضافة الجديد إلى
            سجل الطلاب في «الذات» مع منع التكرار.
          </p>
        </div>
        <div className="rounded-2xl border bg-background p-4">
          <ArrowUpFromLine className="size-5 text-primary" />
          <p className="mt-3 font-black">الذات → نور</p>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            سحب غياب اليوم من «الذات»، مطابقة الطلاب في صفحة المواظبة المفتوحة، وتحديدهم
            تلقائيًا لتراجع النتيجة ثم تضغط «حفظ» في نور.
          </p>
        </div>
      </div>

      <div className="border-t p-5">
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-700" />
          <div className="text-xs leading-6">
            <p className="font-black text-foreground">خصوصية الجلسة</p>
            <p className="text-muted-foreground">
              بيانات دخول نور ومدرستي تبقى لدى المنصة الرسمية. إضافة «ذات» تعمل في صفحة
              المستخدم الحالية، ولا تحتاج حفظ كلمة مرور نور في قاعدة بيانات «الذات».
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Step({
  number,
  icon: Icon,
  title,
  text,
}: {
  number: string;
  icon: typeof LockKeyhole;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-full bg-primary text-xs font-black text-primary-foreground">
          {number}
        </span>
        <Icon className="size-4 text-primary" />
      </div>
      <p className="mt-3 font-black">{title}</p>
      <p className="mt-1 text-xs leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}
