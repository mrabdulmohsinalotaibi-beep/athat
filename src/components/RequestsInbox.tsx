import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, FileDown, Inbox, Printer, ShieldAlert, Send } from "lucide-react";
import { toast } from "sonner";

import { OfficialFooter, OfficialHeader } from "@/components/OfficialHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatHijriDate } from "@/lib/date";
import { elementToPdf } from "@/lib/pdf";
import { useSchool } from "@/lib/school";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const REQUEST_KINDS = ["استشارة فردية", "إحالة طالب", "إبلاغ سري"] as const;
export const REQUEST_STATUSES = ["جديد", "قيد المعالجة", "تم التحويل لحالة", "مغلق"] as const;

export interface PublicRequestRow {
  id: string;
  request_no: string | null;
  kind: string;
  requester_name: string | null;
  requester_role: string | null;
  requester_contact: string | null;
  student_name: string | null;
  student_grade: string | null;
  classroom: string | null;
  topic: string | null;
  urgency: string;
  preferred_time: string | null;
  details: string;
  is_anonymous: boolean;
  status: string;
  counselor_notes: string | null;
  handled_at: string | null;
  created_at: string;
}

function usePublicRequests() {
  return useQuery({
    queryKey: ["public_requests"],
    queryFn: async (): Promise<PublicRequestRow[]> => {
      const { data, error } = await supabase
        .from("public_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PublicRequestRow[];
    },
  });
}

function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: number;
  hint: string;
  tone?: "default" | "amber" | "rose";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 shadow-sm",
        tone === "amber" && "border-amber-300/60 bg-amber-50/60",
        tone === "rose" && "border-rose-300/60 bg-rose-50/60",
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

export function RequestsInbox() {
  const queryClient = useQueryClient();
  const { data: school } = useSchool();
  const { data: requests = [], isLoading } = usePublicRequests();
  const [kindFilter, setKindFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const update = useMutation({
    mutationFn: async (values: { id: string; status?: string; counselor_notes?: string }) => {
      const payload: Record<string, unknown> = {};
      if (values.status) {
        payload["status"] = values.status;
        payload["handled_at"] = values.status === "جديد" ? null : new Date().toISOString();
      }
      if (values.counselor_notes !== undefined) payload["counselor_notes"] = values.counselor_notes;
      const { error } = await supabase
        .from("public_requests")
        .update(payload as never)
        .eq("id", values.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public_requests"] });
      toast.success("تم تحديث الطلب");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const convertToCase = useMutation({
    mutationFn: async (request: PublicRequestRow) => {
      const { error } = await supabase.from("counseling_cases").insert({
        student_name: request.student_name || request.requester_name || "طالب",
        domain: request.kind === "إبلاغ سري" ? "سلوكي" : "إنمائي",
        referral_source:
          request.kind === "إحالة طالب"
            ? "المعلم"
            : request.requester_role === "ولي أمر"
              ? "ولي الأمر"
              : "الطالب نفسه",
        case_status: "مفتوحة",
        priority:
          request.urgency === "عاجل" ? "عالية" : request.urgency === "مهم" ? "متوسطة" : "منخفضة",
        summary: `${request.topic ? `${request.topic} — ` : ""}${request.details}`,
        opened_at: new Date().toISOString().slice(0, 10),
        notes: `محوّلة من ${request.kind} رقم ${request.request_no ?? ""}`.trim(),
      } as never);
      if (error) throw error;
      const { error: statusError } = await supabase
        .from("public_requests")
        .update({ status: "تم التحويل لحالة", handled_at: new Date().toISOString() } as never)
        .eq("id", request.id);
      if (statusError) throw statusError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public_requests"] });
      queryClient.invalidateQueries({ queryKey: ["counseling_cases"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("تم تحويل الطلب إلى حالة إرشادية");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const filtered = useMemo(() => {
    const term = search.trim();
    return requests.filter((item) => {
      if (kindFilter && item.kind !== kindFilter) return false;
      if (statusFilter && item.status !== statusFilter) return false;
      if (!term) return true;
      return [item.request_no, item.requester_name, item.student_name, item.topic, item.details]
        .filter(Boolean)
        .some((value) => String(value).includes(term));
    });
  }, [requests, kindFilter, statusFilter, search]);

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;

  const stats = useMemo(
    () => ({
      total: requests.length,
      fresh: requests.filter((item) => item.status === "جديد").length,
      urgent: requests.filter((item) => item.urgency === "عاجل" && item.status !== "مغلق").length,
      referrals: requests.filter((item) => item.kind === "إحالة طالب").length,
      reports: requests.filter((item) => item.kind === "إبلاغ سري").length,
    }),
    [requests],
  );

  async function exportPdf() {
    if (!printRef.current || !selected || exporting) return;
    setExporting(true);
    try {
      await elementToPdf(printRef.current, `طلب_${selected.request_no ?? selected.kind}`);
      toast.success("تم حفظ الطلب بصيغة PDF");
    } catch {
      toast.error("تعذّر حفظ ملف PDF.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="no-print grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="إجمالي الطلبات" value={stats.total} hint="الواردة من الاستمارات العامة" />
        <StatCard label="طلبات جديدة" value={stats.fresh} hint="بانتظار المراجعة" tone="amber" />
        <StatCard label="طلبات عاجلة" value={stats.urgent} hint="تحتاج تدخلاً سريعاً" tone="rose" />
        <StatCard label="إحالات المعلمين" value={stats.referrals} hint="واردة من استمارة الإحالة" />
        <StatCard label="بلاغات سرية" value={stats.reports} hint="تنمر ومشكلات السلامة" />
      </div>

      <div className="no-print flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="min-w-48 flex-1">
          <Label className="mb-1.5 block text-xs">بحث</Label>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="رقم الطلب أو اسم الطالب أو الموضوع"
          />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">نوع الطلب</Label>
          <select
            value={kindFilter}
            onChange={(event) => setKindFilter(event.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">الكل</option>
            {REQUEST_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">الحالة</Label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">الكل</option>
            {REQUEST_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="no-print grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <ul className="max-h-[32rem] space-y-2 overflow-y-auto rounded-xl border bg-card p-3 shadow-sm">
          {isLoading && <li className="p-4 text-sm text-muted-foreground">جارٍ التحميل…</li>}
          {!isLoading && filtered.length === 0 && (
            <li className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
              <Inbox className="size-6" />
              لا توجد طلبات مطابقة.
            </li>
          )}
          {filtered.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  "w-full rounded-lg border p-3 text-right text-sm transition-colors hover:bg-muted",
                  selected?.id === item.id && "border-primary bg-primary/5",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold">{item.kind}</span>
                  <span className="text-[11px] text-muted-foreground">{item.request_no}</span>
                </div>
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                  {item.student_name || item.requester_name || "بدون اسم"} —{" "}
                  {item.topic || "بدون موضوع"}
                </p>
                <div className="mt-2 flex items-center gap-2 text-[11px]">
                  <span className="rounded-full bg-secondary px-2 py-0.5">{item.status}</span>
                  {item.urgency !== "عادي" && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5",
                        item.urgency === "عاجل"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-amber-100 text-amber-700",
                      )}
                    >
                      {item.urgency}
                    </span>
                  )}
                  <span className="text-muted-foreground">{formatHijriDate(item.created_at)}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>

        {selected ? (
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
              <div>
                <h2 className="text-lg font-extrabold">
                  {selected.kind} — {selected.request_no}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  تاريخ الورود: {formatHijriDate(selected.created_at)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportPdf} disabled={exporting}>
                  <FileDown className="size-4" /> PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="size-4" /> طباعة
                </Button>
              </div>
            </div>

            {selected.is_anonymous && (
              <p className="mt-4 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                <ShieldAlert className="size-4" /> بلاغ مجهول: لم يفصح المُبلغ عن بياناته.
              </p>
            )}

            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <Detail
                label="مقدم الطلب"
                value={selected.is_anonymous ? "مجهول" : selected.requester_name}
              />
              <Detail label="الصفة" value={selected.requester_role} />
              <Detail
                label="وسيلة التواصل"
                value={selected.is_anonymous ? "—" : selected.requester_contact}
              />
              <Detail label="الطالب" value={selected.student_name} />
              <Detail label="الصف" value={selected.student_grade} />
              <Detail label="الفصل" value={selected.classroom} />
              <Detail label="الموضوع" value={selected.topic} />
              <Detail label="درجة الأهمية" value={selected.urgency} />
              <Detail label="الوقت المفضل" value={selected.preferred_time} />
            </dl>

            <div className="mt-4">
              <p className="text-xs font-bold text-muted-foreground">التفاصيل</p>
              <p className="mt-1 whitespace-pre-wrap rounded-lg bg-secondary/50 p-3 text-sm leading-7">
                {selected.details}
              </p>
            </div>

            <form
              className="mt-5 grid gap-3 border-t pt-4 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                update.mutate({
                  id: selected.id,
                  status: String(data.get("status") ?? selected.status),
                  counselor_notes: String(data.get("counselor_notes") ?? ""),
                });
              }}
            >
              <div>
                <Label htmlFor="status" className="mb-1.5 block text-xs">
                  حالة الطلب
                </Label>
                <select
                  id="status"
                  name="status"
                  key={`status-${selected.id}`}
                  defaultValue={selected.status}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {REQUEST_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="counselor_notes" className="mb-1.5 block text-xs">
                  ملاحظات الموجه والإجراء
                </Label>
                <Textarea
                  id="counselor_notes"
                  name="counselor_notes"
                  key={`notes-${selected.id}`}
                  rows={3}
                  defaultValue={selected.counselor_notes ?? ""}
                  placeholder="الإجراء المتخذ، موعد المقابلة، الجهة التي تم التنسيق معها…"
                />
              </div>
              <div className="sm:col-span-2 flex flex-wrap gap-2">
                <Button type="submit" disabled={update.isPending}>
                  حفظ التحديث
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={convertToCase.isPending}
                  onClick={() => convertToCase.mutate(selected)}
                >
                  <Send className="size-4" /> تحويل إلى حالة إرشادية
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-xl border bg-card p-10 text-sm text-muted-foreground shadow-sm">
            <AlertTriangle className="ml-2 size-4" /> اختر طلباً لعرض تفاصيله.
          </div>
        )}
      </div>

      {selected && (
        <div ref={printRef} className="print-only-document print-area space-y-4 bg-white p-6 text-black" dir="rtl">
          <OfficialHeader
            school={school}
            title={`استمارة ${selected.kind}`}
            reportType={selected.kind}
            reportNo={selected.request_no ?? ""}
          />
          <table className="w-full border border-gray-300 text-sm">
            <tbody>
              <PrintRow label="رقم الطلب" value={selected.request_no} />
              <PrintRow label="تاريخ الورود" value={formatHijriDate(selected.created_at)} />
              <PrintRow label="نوع الطلب" value={selected.kind} />
              <PrintRow
                label="مقدم الطلب"
                value={selected.is_anonymous ? "مجهول (بلاغ سري)" : selected.requester_name}
              />
              <PrintRow label="الصفة" value={selected.requester_role} />
              <PrintRow
                label="وسيلة التواصل"
                value={selected.is_anonymous ? "—" : selected.requester_contact}
              />
              <PrintRow label="اسم الطالب" value={selected.student_name} />
              <PrintRow
                label="الصف / الفصل"
                value={[selected.student_grade, selected.classroom].filter(Boolean).join(" - ")}
              />
              <PrintRow label="الموضوع" value={selected.topic} />
              <PrintRow label="درجة الأهمية" value={selected.urgency} />
              <PrintRow label="الوقت المفضل" value={selected.preferred_time} />
              <PrintRow label="حالة الطلب" value={selected.status} />
              <PrintRow label="الموجه الطلابي" value={school?.counselor_name} />
            </tbody>
          </table>

          <div>
            <p className="font-bold">تفاصيل الطلب</p>
            <p className="mt-1 whitespace-pre-wrap rounded border border-gray-300 p-3 leading-7">
              {selected.details}
            </p>
          </div>

          <div>
            <p className="font-bold">ملاحظات الموجه الطلابي والإجراء المتخذ</p>
            <p className="mt-1 min-h-20 whitespace-pre-wrap rounded border border-gray-300 p-3 leading-7">
              {selected.counselor_notes || ""}
            </p>
          </div>

          <OfficialFooter school={school} repeatEveryPage={false} />
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{value || "—"}</dd>
    </div>
  );
}

function PrintRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <tr className="border-b border-gray-300">
      <th className="w-40 border-l border-gray-300 bg-gray-50 p-2 text-right font-semibold">
        {label}
      </th>
      <td className="p-2">{value || "—"}</td>
    </tr>
  );
}
