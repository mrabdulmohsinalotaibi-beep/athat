import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Clock3, Search, ShieldCheck } from "lucide-react";

import { PublicLayout } from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatHijriDate } from "@/lib/date";

type RequestStatusRow = {
  request_no: string;
  kind: string;
  topic: string | null;
  status: string;
  created_at: string;
  handled_at: string | null;
};

export const Route = createFileRoute("/request-status")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { request?: string; code?: string } => {
    const request = typeof search["request"] === "string" ? search["request"] : "";
    const code = typeof search["code"] === "string" ? search["code"] : "";
    return {
      ...(request ? { request } : {}),
      ...(code ? { code } : {}),
    };
  },
  head: () => ({
    meta: [
      { title: "تتبع طلب التوجيه الطلابي | ذات" },
      {
        name: "description",
        content: "متابعة حالة الطلب المرسل إلى الموجه الطلابي باستخدام رقم الطلب ورمز التتبع.",
      },
    ],
  }),
  component: RequestStatusPage,
});

const STATUS_STEPS = ["تم الاستلام", "قيد المتابعة", "تم الإجراء"] as const;

function statusStep(status: string) {
  if (status === "جديد") return 0;
  if (status === "قيد المعالجة") return 1;
  if (status === "مغلق" || status.startsWith("تم التحويل")) return 2;
  return 1;
}

function RequestStatusPage() {
  const search = Route.useSearch();
  const [requestNo, setRequestNo] = useState(search.request ?? "");
  const [trackingCode, setTrackingCode] = useState(search.code ?? "");

  const lookup = useMutation({
    mutationFn: async () => {
      const no = requestNo.trim();
      const code = trackingCode.trim().toLowerCase();
      if (!no || !code) throw new Error("أدخل رقم الطلب ورمز التتبع.");

      const { data, error } = await (supabase as any).rpc("get_public_request_status", {
        p_request_no: no,
        p_tracking_code: code,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : null;
      if (!row) throw new Error("لم يتم العثور على طلب مطابق. تحقق من رقم الطلب ورمز التتبع.");
      return row as RequestStatusRow;
    },
  });

  const current = lookup.data ? statusStep(lookup.data.status) : -1;

  return (
    <PublicLayout
      title="تتبع الطلب"
      subtitle="اطّلع على حالة طلبك دون عرض أي بيانات شخصية أو تفاصيل سرية."
    >
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-8 sm:py-16">
        <div className="rounded-3xl border border-[#D9C0A3]/35 bg-[#FFFDF9] p-5 shadow-sm sm:p-8">
          <div className="flex items-start gap-3 rounded-2xl border border-[#89AA74]/35 bg-[#E4ECDF]/70 p-4">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
            <p className="text-xs leading-6 text-muted-foreground">
              للحماية، يلزم رقم الطلب ورمز التتبع معًا. لا تعرض هذه الصفحة اسم الطالب أو
              تفاصيل الطلب أو ملاحظات الموجه.
            </p>
          </div>

          <form
            className="mt-6 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              lookup.mutate();
            }}
          >
            <div>
              <Label htmlFor="request-no" className="mb-1.5 block text-xs">
                رقم الطلب
              </Label>
              <Input
                id="request-no"
                value={requestNo}
                onChange={(event) => setRequestNo(event.target.value)}
                placeholder="مثال: 2610-0001"
                dir="ltr"
              />
            </div>
            <div>
              <Label htmlFor="tracking-code" className="mb-1.5 block text-xs">
                رمز التتبع
              </Label>
              <Input
                id="tracking-code"
                value={trackingCode}
                onChange={(event) => setTrackingCode(event.target.value)}
                placeholder="رمز التتبع"
                dir="ltr"
              />
            </div>
            <Button type="submit" disabled={lookup.isPending}>
              <Search className="size-4" />
              {lookup.isPending ? "جارٍ التحقق…" : "تتبع"}
            </Button>
          </form>

          {lookup.isError && (
            <p className="mt-5 rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive">
              {(lookup.error as Error).message}
            </p>
          )}

          {lookup.data && (
            <div className="mt-7 rounded-2xl border border-[#D9C0A3]/40 bg-[#FBF7F1] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-primary">طلب رقم {lookup.data.request_no}</p>
                  <h2 className="mt-1 text-xl font-black">{lookup.data.kind}</h2>
                  {lookup.data.topic && (
                    <p className="mt-1 text-sm text-muted-foreground">{lookup.data.topic}</p>
                  )}
                </div>
                <span className="rounded-full bg-[#E4ECDF] px-3 py-1.5 text-xs font-black text-primary">
                  {lookup.data.status}
                </span>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-2">
                {STATUS_STEPS.map((label, index) => {
                  const reached = index <= current;
                  return (
                    <div key={label} className="text-center">
                      <div
                        className={
                          "mx-auto grid size-9 place-items-center rounded-full border " +
                          (reached
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-muted text-muted-foreground")
                        }
                      >
                        {reached ? <CheckCircle2 className="size-4" /> : <Clock3 className="size-4" />}
                      </div>
                      <p className="mt-2 text-[11px] font-bold">{label}</p>
                    </div>
                  );
                })}
              </div>

              <p className="mt-6 border-t pt-4 text-xs text-muted-foreground">
                تاريخ الاستلام: {formatHijriDate(lookup.data.created_at)}
              </p>
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
