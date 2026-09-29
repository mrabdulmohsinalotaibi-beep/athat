import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  ShieldCheck,
  Workflow,
  Chrome,
  MousePointerClick,
} from "lucide-react";

import { ExternalPlatformImporter } from "@/components/ExternalPlatformImporter";
import { NoorExportCenter } from "@/components/NoorExportCenter";
import { NoorConnectionPanel } from "@/components/NoorConnectionPanel";
import { AiCounselorAssistant } from "@/components/AiCounselorAssistant";

export const Route = createFileRoute("/_authenticated/integrations")({
  head: () => ({
    meta: [
      { title: "مركز نور ومدرستي | منصة الذات" },
      {
        name: "description",
        content:
          "استيراد بيانات الطلاب من نور ومدرستي إلى الذات، وتجهيز أعمال التوجيه وتوثيق ترحيلها إلى نور.",
      },
    ],
  }),
  component: IntegrationsPage,
});

function IntegrationsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6" dir="rtl">
      <section className="overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-bl from-primary/10 via-card to-accent/10 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
              <Workflow className="size-3.5" /> مركز التكامل المدرسي
            </span>
            <h1 className="mt-4 text-3xl font-black sm:text-4xl">نور ومدرستي × الذات</h1>
            <p className="mt-3 text-sm leading-8 text-muted-foreground sm:text-base">
              نقطة عمل واحدة لجلب بيانات الطلاب إلى «الذات»، مراجعتها وتنظيفها، ثم تجهيز أعمال
              التوجيه التي تحتاج توثيقًا في نور مع سجل يمنع التكرار ويحفظ حالة كل عملية.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
            {[
              [FileSpreadsheet, "ملف رسمي"],
              [ArrowDownToLine, "استيراد"],
              [Database, "سجلات الذات"],
              [ArrowUpFromLine, "تجهيز نور"],
            ].map(([Icon, label]) => {
              const IconComponent = Icon as typeof FileSpreadsheet;
              return (
                <div key={String(label)} className="rounded-2xl border bg-card/80 p-3">
                  <IconComponent className="mx-auto size-4 text-primary" />
                  <p className="mt-2 font-bold">{String(label)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5">
          <p className="flex items-center gap-2 text-sm font-black">
            <span className="grid size-7 place-items-center rounded-full bg-primary/10 text-primary">1</span>
            استيراد آمن
          </p>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            ارفع Excel/CSV المصدّر من نور أو مدرستي. تتم مطابقة الأعمدة وتنظيف الهوية والجوال
            وكشف التكرار قبل الحفظ.
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <p className="flex items-center gap-2 text-sm font-black">
            <span className="grid size-7 place-items-center rounded-full bg-primary/10 text-primary">2</span>
            العمل داخل الذات
          </p>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            تصبح بيانات الطالب أساسًا للحالات والمقابلات والسلوك والمواظبة والشواهد والتقارير
            بدل إعادة إدخالها في كل سجل.
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <p className="flex items-center gap-2 text-sm font-black">
            <span className="grid size-7 place-items-center rounded-full bg-primary/10 text-primary">3</span>
            تجهيز وتوثيق نور
          </p>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            حدد السجلات المطلوبة، جهزها، افتح نور للإدخال النظامي، ثم وثّق المرجع والحالة داخل
            الذات حتى لا تتكرر العملية.
          </p>
        </div>
      </section>

      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4 text-sm leading-7">
        <p className="flex items-center gap-2 font-black text-emerald-800">
          <ShieldCheck className="size-4" /> تكامل يحافظ على صلاحيات الأنظمة الرسمية
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          لا تحفظ «الذات» كلمة مرور نور أو مدرستي ولا تتجاوز رمز التحقق. التكامل يعتمد على
          التصدير الرسمي والمراجعة البشرية والتوثيق داخل المنصة.
        </p>
      </div>

      <section className="rounded-2xl border border-primary/20 bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xl font-black">
              <Chrome className="size-5 text-primary" /> Athat Bridge
            </p>
            <p className="mt-1 max-w-3xl text-sm leading-7 text-muted-foreground">
              الإضافة المباشرة تعمل داخل صفحة نور أو مدرستي المفتوحة، بنفس النمط العملي
              لإضافات التكامل المدرسي: تقرأ الجدول الذي تراه بصلاحيتك، تسحب بيانات «الذات»،
              وتعبئ عناصر الصفحة قبل أن تعتمد الحفظ بنفسك.
            </p>
          </div>
          <div className="rounded-xl border bg-muted/30 px-4 py-3 text-xs">
            <p className="flex items-center gap-2 font-black">
              <MousePointerClick className="size-4 text-primary" /> المسار المباشر
            </p>
            <p className="mt-1 text-muted-foreground">
              Chrome Extension • جلسة المستخدم • بدون تجاوز رمز التحقق
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border p-3 text-xs">
            <b>نور ← الذات</b>
            <p className="mt-1 leading-6 text-muted-foreground">
              قراءة كشف الطلاب الظاهر واستيراد الطلاب الجدد مع منع التكرار.
            </p>
          </div>
          <div className="rounded-xl border p-3 text-xs">
            <b>الذات ← نور</b>
            <p className="mt-1 leading-6 text-muted-foreground">
              سحب مواظبة اليوم ومطابقة أسماء الطلاب وتحديدهم داخل صفحة نور.
            </p>
          </div>
          <div className="rounded-xl border p-3 text-xs">
            <b>اعتماد بشري</b>
            <p className="mt-1 leading-6 text-muted-foreground">
              لا تضغط الإضافة «حفظ» النهائي تلقائيًا؛ تراجع ثم تعتمد أنت.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-primary/20 bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-lg font-black">
              <Puzzle className="size-5 text-primary" /> Athat Bridge — الاتصال المباشر داخل نور
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
              الإضافة تعمل داخل صفحة نور التي فتحتها وسجلت الدخول إليها بنفسك. تقرأ الجدول
              الظاهر، تطابق الطلاب بالهوية ثم الاسم، وتسحب السجلات الجاهزة من «الذات» لتجهيزها
              في نور. الاعتماد النهائي والحفظ يبقيان بيد المستخدم.
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-700">
            <MonitorUp className="size-4" /> Chrome / Edge على الكمبيوتر
          </span>
        </div>
        <div className="mt-4 grid gap-2 text-xs sm:grid-cols-4">
          {[
            "1. تثبيت Athat Bridge",
            "2. فتح نور وتسجيل الدخول",
            "3. فتح صفحة الرصد المطلوبة",
            "4. مطابقة ثم مراجعة وحفظ",
          ].map((step) => (
            <div key={step} className="rounded-xl border bg-muted/20 p-3 font-bold">
              {step}
            </div>
          ))}
        </div>
      </section>

      <NoorConnectionPanel />
      <ExternalPlatformImporter />
      <NoorExportCenter />

      <section className="rounded-2xl border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <CheckCircle2 className="size-5 text-primary" />
          <div>
            <h2 className="font-black">مساعد المراجعة التربوية</h2>
            <p className="text-xs text-muted-foreground">
              استخدمه لمراجعة الصياغة قبل اعتماد السجل أو ترحيله، وليس لاستبدال قرار الموجه.
            </p>
          </div>
        </div>
        <AiCounselorAssistant compact />
      </section>
    </div>
  );
}
