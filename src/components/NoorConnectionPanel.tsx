import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Loader2,
  LockKeyhole,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const NOOR_URL = "https://noor.moe.gov.sa/Noor/Login.aspx";

type ConnectionState = "idle" | "waiting";

export function NoorConnectionPanel() {
  const [state, setState] = useState<ConnectionState>("idle");

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
              disabled
              className="rounded-2xl border p-4 text-right opacity-60"
            >
              <ArrowDownToLine className="size-5 text-primary" />
              <p className="mt-3 font-black">سحب من نور إلى الذات</p>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                الطلاب، الفصول، المواظبة والبيانات المصرح بها.
              </p>
            </button>
            <button
              type="button"
              disabled
              className="rounded-2xl border p-4 text-right opacity-60"
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
          <p className="font-black">حالة الموصل المباشر</p>
          <div className="mt-4 space-y-3 text-xs">
            <Status ok label="فتح نظام نور الرسمي" />
            <Status ok label="تسجيل الدخول بواسطة المستخدم" />
            <Status label="اكتشاف جلسة نور المعتمدة" />
            <Status label="صلاحية قراءة البيانات" />
            <Status label="صلاحية رفع البيانات" />
          </div>
          <div className="mt-5 rounded-xl border border-primary/15 bg-background p-3 text-xs leading-6 text-muted-foreground">
            حتى اعتماد الموصل المباشر، استخدم الاستيراد بالملف والتجهيز اليدوي الموجودين أسفل
            هذه اللوحة. لن تعرض «الذات» اتصالًا ناجحًا غير حقيقي.
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
