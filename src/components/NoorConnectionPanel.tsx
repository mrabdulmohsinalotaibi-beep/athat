import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Loader2,
  LockKeyhole,
  RefreshCw,
  Users,
  CalendarCheck2,
  ClipboardList,
  FileCheck2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getNoorConnectorStatus } from "@/lib/noor-connector.functions";

const NOOR_URL = "https://noor.moe.gov.sa/Noor/Login.aspx";

type ConnectionState = "idle" | "waiting";

export function NoorConnectionPanel() {
  const [state, setState] = useState<ConnectionState>("idle");
  const connectorQuery = useQuery({
    queryKey: ["noor-connector-status"],
    queryFn: async () => getNoorConnectorStatus(),
    staleTime: 60_000,
    retry: false,
  });
  const connector = connectorQuery.data;
  const connectorReady = Boolean(connector?.configured);
  const canRead = Boolean(connector?.canRead);
  const canWrite = Boolean(connector?.canWrite);

  function openNoor() {
    window.open(NOOR_URL, "_blank", "noopener,noreferrer");
    setState("waiting");
  }

  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="border-b bg-gradient-to-l from-primary/10 via-card to-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xl font-black">
              <KeyRound className="size-5 text-primary" /> جلسة نور
            </p>
            <p className="mt-1 max-w-2xl text-sm leading-7 text-muted-foreground">
              تجربة اتصال شبيهة بتطبيقات الاستيراد: افتح نور، سجّل الدخول بنفسك، ثم تصبح الجلسة
              جاهزة للمزامنة عندما يتوفر موصل نور المعتمد.
            </p>
          </div>
          <Button type="button" onClick={openNoor}>
            <ExternalLink className="size-4" />
            {state === "waiting" ? "فتح نور مرة أخرى" : "بدء جلسة نور"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 border-b p-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [Users, "طلاب وفصول", "سحب من نور عند السماح"],
          [CalendarCheck2, "مواظبة", "سحب الغياب والتأخر المصرح"],
          [ClipboardList, "توجيه طلابي", "تجهيز الحالات والمقابلات"],
          [FileCheck2, "توثيق", "حفظ المرجع ونتيجة الرفع"],
        ].map(([Icon, title, hint]) => {
          const IconComponent = Icon as typeof Users;
          return (
            <div key={String(title)} className="rounded-xl border bg-background p-3">
              <IconComponent className="size-4 text-primary" />
              <p className="mt-2 text-sm font-black">{String(title)}</p>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{String(hint)}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.15fr_.85fr]">
        <div className="p-5">
          <div
            className={
              state === "waiting"
                ? "rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5"
                : "rounded-2xl border bg-muted/20 p-5"
            }
          >
            <div className="flex items-start gap-3">
              {state === "waiting" ? (
                <Loader2 className="mt-0.5 size-5 animate-spin text-amber-600" />
              ) : (
                <LockKeyhole className="mt-0.5 size-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-black">
                  {state === "waiting" ? "بانتظار تسجيل دخولك في نور…" : "لا توجد جلسة نور نشطة"}
                </p>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                  كلمة المرور ورمز التحقق يبقيان في نظام نور ولا يتم تخزينهما داخل «الذات».
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={!canRead}
              className={`rounded-2xl border p-4 text-right transition ${canRead ? "hover:border-primary/40 hover:bg-primary/5" : "opacity-60"}`}
              title={canRead ? "الموصل جاهز للقراءة" : "تحتاج صلاحية قراءة معتمدة من نور"}
            >
              <ArrowDownToLine className="size-5 text-primary" />
              <p className="mt-3 font-black">سحب من نور إلى الذات</p>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                الطلاب، الفصول، المواظبة والبيانات المصرح بها.
              </p>
            </button>
            <button
              type="button"
              disabled={!canWrite}
              className={`rounded-2xl border p-4 text-right transition ${canWrite ? "hover:border-primary/40 hover:bg-primary/5" : "opacity-60"}`}
              title={canWrite ? "الموصل جاهز للرفع" : "تحتاج صلاحية كتابة معتمدة من نور"}
            >
              <ArrowUpFromLine className="size-5 text-primary" />
              <p className="mt-3 font-black">رفع من الذات إلى نور</p>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                تجهيز السجلات المصرح بترحيلها وتوثيق نتيجة العملية.
              </p>
            </button>
          </div>
        </div>

        <aside className="border-t bg-muted/20 p-5 lg:border-r lg:border-t-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-black">حالة التكامل المباشر</p>
            <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${
              connectorReady
                ? "bg-emerald-500/10 text-emerald-700"
                : "bg-amber-500/10 text-amber-700"
            }`}>
              {connectorQuery.isLoading
                ? "جارٍ التحقق"
                : connectorReady
                  ? "مهيأ"
                  : "غير مهيأ"}
            </span>
          </div>
          <div className="mt-4 space-y-3 text-xs">
            <Status ok label="فتح نظام نور الرسمي" />
            <Status ok={state === "waiting"} label="بدء جلسة تسجيل الدخول بواسطة المستخدم" />
            <Status label="تثبيت إضافة «ذات — مساعد نور» في المتصفح" />
            <Status ok={connectorReady || canRead} label="قراءة البيانات عبر مسار معتمد/مهيأ" />
            <Status ok={connectorReady || canWrite} label="تجهيز الرفع مع بقاء الحفظ بيد المستخدم" />
          </div>
          <div className="mt-5 rounded-xl border border-primary/15 bg-background p-3 text-xs leading-6 text-muted-foreground">
            إضافة المتصفح هي المسار المباشر المشابه لإتقان: تعمل داخل نور بجلسة المستخدم ولا تحتاج كلمة مرور نور داخل «الذات». إلى أن تُنشر الإضافة وتُقترن بحساب المدرسة، يبقى الاستيراد بالملف متاحًا كمسار احتياطي.
          </div>
          {state === "waiting" && (
            <Button
              type="button"
              className="mt-4 w-full"
              variant="outline"
              onClick={() => setState("idle")}
            >
              <RefreshCw className="size-4" /> إنهاء الانتظار
            </Button>
          )}
        </aside>
      </div>
    </section>
  );
}

function Status({ label, ok = false }: { label: string; ok?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle2 className={ok ? "size-4 text-emerald-600" : "size-4 text-muted-foreground/40"} />
      <span className={ok ? "font-bold text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}
