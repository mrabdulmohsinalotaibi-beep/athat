import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, CircleDot, Inbox, Mail, MessageCircle, RotateCcw, ShieldAlert, Send } from "lucide-react";
import { toast } from "sonner";


import { Button } from "@/components/ui/button";
import { OfficialFooter, OfficialHeader } from "@/components/OfficialHeader";
import { PdfPreviewButton } from "@/components/PdfPreviewButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatHijriDate } from "@/lib/date";

import { useSchool } from "@/lib/school";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { normalizeSaudiPhone, shareOnWhatsApp } from "@/lib/whatsapp";


export const REQUEST_KINDS = ["استشارة فردية", "إحالة طالب", "إبلاغ سري"] as const;
export const REQUEST_STATUSES = [
  "جديد",
  "قيد المعالجة",
  "تم التحويل لمقابلة",
  "تم التحويل لإحالة",
  "تم التحويل لحالة",
  "مغلق",
] as const;

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
  linked_table?: string | null;
  linked_record_id?: string | null;
  counselor_notes: string | null;
  handled_at: string | null;
  created_at: string;
  source?: "public_requests" | "feedback_messages";
}

function feedbackStatusToRequest(status: string): string {
  if (status === "جديد") return "جديد";
  if (status === "قيد المراجعة") return "قيد المعالجة";
  if (status === "تم الرد" || status === "محفوظ") return "مغلق";
  return "جديد";
}

function requestStatusToFeedback(status: string): string {
  if (status === "جديد") return "جديد";
  if (status === "مغلق") return "محفوظ";
  if (status.startsWith("تم التحويل")) return "تم الرد";
  return "قيد المراجعة";
}

function parseTaggedMessage(message: string, label: string): string | null {
  const match = message.match(new RegExp("^\\[" + label + "\\]\\s*(.+)$", "m"));
  return match?.[1]?.trim() || null;
}

function feedbackToRequest(row: {
  id: string;
  sender_name: string;
  sender_contact: string | null;
  sender_role: string;
  category: string;
  message: string;
  status: string;
  internal_notes: string | null;
  created_at: string;
}): PublicRequestRow {
  return {
    id: row.id,
    request_no: `MSG-${row.id.slice(0, 8).toUpperCase()}`,
    kind: row.category,
    requester_name: row.sender_name || null,
    requester_role: row.sender_role || null,
    requester_contact: row.sender_contact || null,
    student_name: parseTaggedMessage(row.message, "الطالب"),
    student_grade: parseTaggedMessage(row.message, "الصف"),
    classroom: parseTaggedMessage(row.message, "الفصل"),
    topic: parseTaggedMessage(row.message, "الموضوع"),
    urgency: parseTaggedMessage(row.message, "الأهمية") || "عادي",
    preferred_time: parseTaggedMessage(row.message, "الوقت المفضل"),
    details: row.message
      .replace(/^\\[نوع الطلب\\].*$/gm, "")
      .replace(/^\\[الموضوع\\].*$/gm, "")
      .replace(/^\\[الطالب\\].*$/gm, "")
      .replace(/^\\[الصف\\].*$/gm, "")
      .replace(/^\\[الفصل\\].*$/gm, "")
      .replace(/^\\[الأهمية\\].*$/gm, "")
      .replace(/^\\[الوقت المفضل\\].*$/gm, "")
      .trim(),
    is_anonymous: row.sender_name === "مجهول",
    status: feedbackStatusToRequest(row.status),
    linked_table: null,
    linked_record_id: null,
    counselor_notes: row.internal_notes,
    handled_at: null,
    created_at: row.created_at,
    source: "feedback_messages",
  };
}

function usePublicRequests() {
  return useQuery({
    queryKey: ["public_requests"],
    retry: 1,
    refetchOnWindowFocus: "always",
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    queryFn: async (): Promise<PublicRequestRow[]> => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error("انتهت جلسة الدخول. سجّل الدخول مرة أخرى.");

      let primary: PublicRequestRow[] = [];
      let primaryError: Error | null = null;

      const full = await supabase
        .from("public_requests")
        .select(
          "id,request_no,kind,requester_name,requester_role,requester_contact,student_name,student_grade,classroom,topic,urgency,preferred_time,details,is_anonymous,status,linked_table,linked_record_id,counselor_notes,handled_at,created_at",
        )
        .order("created_at", { ascending: false });

      if (!full.error) {
        primary = (full.data ?? []).map((row) => ({ ...row, source: "public_requests" as const })) as PublicRequestRow[];
      } else {
        primaryError = new Error(full.error.message);
      }

      const feedback = await supabase
        .from("feedback_messages")
        .select("id,sender_name,sender_contact,sender_role,category,message,status,internal_notes,created_at")
        .in("category", ["استشارة فردية", "إحالة طالب", "إبلاغ سري"])
        .order("created_at", { ascending: false });

      const legacy = feedback.error
        ? []
        : (feedback.data ?? []).map((row) => feedbackToRequest(row));

      if (primary.length === 0 && legacy.length === 0 && primaryError && feedback.error) {
        throw new Error(
          `تعذّر تحميل الطلبات: ${primaryError.message}. قناة الرسائل الاحتياطية: ${feedback.error.message}`,
        );
      }

      const merged = [...primary, ...legacy];
      const seen = new Set<string>();
      return merged
        .filter((item) => {
          const key = `${item.source}:${item.id}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
        "rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]",
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
  const { data: requests = [], isLoading, isError, error, refetch } = usePublicRequests();
  const [kindFilter, setKindFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void supabase.auth.getUser().then(({ data }) => {
      if (!active || !data.user) return;
      channel = supabase
        .channel(`public-requests-${data.user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "public_requests",
            filter: `user_id=eq.${data.user.id}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ["public_requests"] });
          },
        )
        .subscribe();
    });

    return () => {
      active = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const update = useMutation({
    mutationFn: async (values: { id: string; source?: PublicRequestRow["source"]; status?: string; counselor_notes?: string }) => {
      const payload: Record<string, unknown> = {};
      if (values.status) {
        payload["status"] = values.status;
        payload["handled_at"] = values.status === "جديد" ? null : new Date().toISOString();
      }
      if (values.counselor_notes !== undefined) payload["counselor_notes"] = values.counselor_notes;
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error("انتهت جلسة الدخول. سجّل الدخول مرة أخرى.");

      if (values.source === "feedback_messages") {
        const feedbackPayload: Record<string, unknown> = {};
        if (values.status) feedbackPayload["status"] = requestStatusToFeedback(values.status);
        if (values.counselor_notes !== undefined) feedbackPayload["internal_notes"] = values.counselor_notes;
        const { error } = await supabase
          .from("feedback_messages")
          .update(feedbackPayload as never)
          .eq("id", values.id)
          .eq("user_id", userData.user.id);
        if (error) throw error;
        return;
      }

      const { error } = await supabase
        .from("public_requests")
        .update(payload as never)
        .eq("id", values.id)
        .eq("user_id", userData.user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public_requests"] });
      toast.success("تم تحديث الطلب");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const convertToRecord = useMutation({
    mutationFn: async (request: PublicRequestRow) => {
      if (request.linked_record_id || request.status.startsWith("تم التحويل")) {
        throw new Error("هذا الطلب تم تحويله إلى سجل داخلي بالفعل.");
      }

      const today = new Date().toISOString().slice(0, 10);
      let linkedTable: "interviews" | "referrals" | "counseling_cases";
      let linkedRecordId = "";
      let status = "";

      if (request.kind === "استشارة فردية") {
        const { data, error } = await supabase
          .from("interviews")
          .insert({
            student_name: request.student_name || request.requester_name || "طالب",
            participant: request.requester_name,
            topic: request.topic || "استشارة فردية",
            itype: request.requester_role || "استشارة فردية",
            idate: today,
            notes: [
              request.details,
              request.preferred_time ? `الوقت المفضل: ${request.preferred_time}` : "",
              `وارد من طلب رقم ${request.request_no ?? "—"}`,
            ]
              .filter(Boolean)
              .join("\n"),
            recommendations: request.counselor_notes,
          })
          .select("id")
          .single();
        if (error) throw error;
        linkedTable = "interviews";
        linkedRecordId = data.id;
        status = "تم التحويل لمقابلة";
      } else if (request.kind === "إحالة طالب") {
        const { data, error } = await supabase
          .from("referrals")
          .insert({
            student_name: request.student_name || request.requester_name || "طالب",
            referral_date: today,
            reason: [request.topic, request.details].filter(Boolean).join(" — "),
            referred_to: "التوجيه الطلابي",
            status: "جديدة",
            notes: [
              request.requester_name ? `المحيل: ${request.requester_name}` : "",
              request.requester_role ? `الصفة: ${request.requester_role}` : "",
              `وارد من طلب رقم ${request.request_no ?? "—"}`,
            ]
              .filter(Boolean)
              .join("\n"),
          })
          .select("id")
          .single();
        if (error) throw error;
        linkedTable = "referrals";
        linkedRecordId = data.id;
        status = "تم التحويل لإحالة";
      } else {
        const { data, error } = await supabase
          .from("counseling_cases")
          .insert({
            student_name: request.student_name || "طالب غير محدد",
            domain: "سلوكي",
            referral_source: request.is_anonymous
              ? "بلاغ سري"
              : request.requester_role || "بلاغ سري",
            case_status: "مفتوحة",
            priority:
              request.urgency === "عاجل"
                ? "عالية"
                : request.urgency === "مهم"
                  ? "متوسطة"
                  : "منخفضة",
            summary: [request.topic, request.details].filter(Boolean).join(" — "),
            opened_at: today,
            notes: `محوّلة من بلاغ رقم ${request.request_no ?? "—"}`,
          })
          .select("id")
          .single();
        if (error) throw error;

        const { error: behaviorError } = await supabase.from("behavior").insert({
          student_name: request.student_name || "طالب غير محدد",
          bdate: today,
          observation: request.topic || "بلاغ سري",
          referral_source: request.is_anonymous
            ? "بلاغ سري"
            : request.requester_role || "إبلاغ إلكتروني",
          action: "فتح حالة طلابية ومتابعة السلوك",
          result: request.counselor_notes || null,
          notes: [
            request.details,
            `وارد من بلاغ رقم ${request.request_no ?? "—"}`,
            `مرتبط بالحالة: ${data.id}`,
          ]
            .filter(Boolean)
            .join("\n"),
        });
        if (behaviorError) {
          console.warn(
            "[public-requests] counseling case created but behavior record failed:",
            behaviorError.message,
          );
        }

        linkedTable = "counseling_cases";
        linkedRecordId = data.id;
        status = "تم التحويل لحالة";
      }

      const handledAt = new Date().toISOString();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error("انتهت جلسة الدخول. سجّل الدخول مرة أخرى.");

      if (request.source === "feedback_messages") {
        const note = [
          request.counselor_notes?.trim(),
          `تم التحويل إلى ${linkedTable} — رقم السجل: ${linkedRecordId}`,
        ]
          .filter(Boolean)
          .join("\n");

        const fallback = await supabase
          .from("feedback_messages")
          .update({
            status: "تم الرد",
            internal_notes: note,
          })
          .eq("id", request.id)
          .eq("user_id", userData.user.id);
        if (fallback.error) throw fallback.error;
        return { linkedTable, linkedRecordId, status, linkPersisted: false };
      }

      const linkedUpdate = await supabase
        .from("public_requests")
        .update({
          status,
          handled_at: handledAt,
          linked_table: linkedTable,
          linked_record_id: linkedRecordId,
        })
        .eq("id", request.id)
        .eq("user_id", userData.user.id);

      let linkPersisted = true;
      if (linkedUpdate.error) {
        const fallback = await supabase
          .from("public_requests")
          .update({
            status,
            handled_at: handledAt,
          })
          .eq("id", request.id)
          .eq("user_id", userData.user.id);
        if (fallback.error) throw fallback.error;
        linkPersisted = false;
      }

      return { linkedTable, linkedRecordId, status, linkPersisted };
    },
    onSuccess: ({ linkedTable, linkPersisted }) => {
      queryClient.invalidateQueries({ queryKey: ["public_requests"] });
      queryClient.invalidateQueries({ queryKey: [linkedTable] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      if (linkPersisted) {
        toast.success("تم إنشاء السجل وربطه بالطلب");
      } else {
        toast.success("تم إنشاء السجل وحفظ حالة التحويل");
      }
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


  function linkedRoute(request: PublicRequestRow) {
    if (request.linked_table === "interviews") return "/interviews";
    if (request.linked_table === "referrals") return "/referrals";
    if (request.linked_table === "counseling_cases") return "/cases";
    return null;
  }

  function conversionLabel(request: PublicRequestRow) {
    if (request.kind === "استشارة فردية") return "تحويل إلى مقابلة طلابية";
    if (request.kind === "إحالة طالب") return "تحويل إلى سجل إحالة";
    return "تحويل إلى حالة طلابية";
  }

  function replyText(request: PublicRequestRow) {
    return [
      `السلام عليكم${request.requester_name ? ` ${request.requester_name}` : ""}،`,
      `بخصوص ${request.kind} رقم ${request.request_no || "—"}`,
      request.topic ? `الموضوع: ${request.topic}` : "",
      request.counselor_notes?.trim()
        ? `رد الموجه / الإجراء: ${request.counselor_notes.trim()}`
        : "تم استلام طلبك وهو قيد المتابعة لدى التوجيه الطلابي.",
      "",
      school?.school_name || "التوجيه الطلابي",
    ]
      .filter(Boolean)
      .join("\n");
  }

  function replyWhatsApp(request: PublicRequestRow) {
    if (request.is_anonymous) {
      toast.info("البلاغ مجهول ولا يحتوي على وسيلة تواصل.");
      return;
    }
    const phone = normalizeSaudiPhone(request.requester_contact || "");
    if (!phone) {
      toast.info("لا يوجد رقم جوال صالح في الطلب.");
      return;
    }
    shareOnWhatsApp(replyText(request), phone);
  }

  function quickStatus(status: string) {
    if (!selected) return;
    update.mutate({
      id: selected.id,
      source: selected.source,
      status,
      counselor_notes: selected.counselor_notes ?? "",
    });
  }

  function workflowStep(status: string) {
    if (status === "جديد") return 0;
    if (status === "قيد المعالجة") return 1;
    if (status.startsWith("تم التحويل")) return 2;
    if (status === "مغلق") return 3;
    return 1;
  }

  function replyEmail(request: PublicRequestRow) {
    if (request.is_anonymous) {
      toast.info("البلاغ مجهول ولا يحتوي على وسيلة تواصل.");
      return;
    }
    const email = request.requester_contact?.trim() || "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.info("لا يوجد بريد إلكتروني صالح في الطلب.");
      return;
    }
    const subject = encodeURIComponent(
      `رد التوجيه الطلابي — ${request.request_no || request.kind}`,
    );
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${encodeURIComponent(replyText(request))}`;
  }

  return (
    <div className="space-y-6">
      {isError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-bold text-destructive">تعذّر تحميل صندوق الطلبات</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {error instanceof Error ? error.message : "تعذّر الاتصال ببيانات الطلبات."}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
            إعادة المحاولة
          </Button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="إجمالي الطلبات" value={stats.total} hint="الواردة من الاستمارات العامة" />
        <StatCard label="طلبات جديدة" value={stats.fresh} hint="بانتظار المراجعة" tone="amber" />
        <StatCard label="طلبات عاجلة" value={stats.urgent} hint="تحتاج تدخلاً سريعاً" tone="rose" />
        <StatCard label="إحالات المعلمين" value={stats.referrals} hint="واردة من استمارة الإحالة" />
        <StatCard label="بلاغات سرية" value={stats.reports} hint="تنمر ومشكلات السلامة" />
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]">
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
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
                  "w-full rounded-xl border p-3 text-right text-sm transition-colors hover:bg-muted",
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
          <div className="rounded-3xl border bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
              <div>
                <h2 className="text-lg font-extrabold">
                  {selected.kind} — {selected.request_no}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  تاريخ الورود: {formatHijriDate(selected.created_at)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2" data-pdf-exclude="true">
                <PdfPreviewButton
                  elementRef={printRef}
                  filename={`${selected.kind}-${selected.request_no || selected.id}`}
                  title={`${selected.kind} — ${selected.request_no || "طلب"}`}
                />
                <Button type="button" size="sm" variant="outline" onClick={() => replyWhatsApp(selected)}>
                  <MessageCircle className="size-4" /> رد واتساب
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => replyEmail(selected)}>
                  <Mail className="size-4" /> رد بالبريد
                </Button>
              </div>
            </div>

            <div
              ref={printRef}
              className="record-pdf-document mt-4 rounded-xl bg-paper p-5 text-paper-foreground"
            >
              <OfficialHeader
                school={school}
                title={selected.kind}
                reportType="طلب وارد للتوجيه الطلابي"
                reportNo={selected.request_no || selected.id}
              />
              <div className="mt-5">
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


              </div>
              {selected.counselor_notes?.trim() && (
                <div className="mt-5 rounded-lg border border-paper-border p-4">
                  <p className="text-xs font-bold text-paper-muted-foreground">رد الموجه / الإجراء</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7">
                    {selected.counselor_notes}
                  </p>
                </div>
              )}
              <OfficialFooter school={school} />
            </div>

            <section className="mt-5 border-t pt-4" data-pdf-exclude="true">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-primary">مسار معالجة الطلب</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    راجع الطلب، ابدأ المعالجة، حوّله إلى السجل المناسب عند الحاجة، ثم أغلقه بعد اكتمال الإجراء.
                  </p>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold">
                  الحالة الحالية: {selected.status}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {[
                  ["وارد", 0],
                  ["معالجة", 1],
                  ["توثيق", 2],
                  ["مغلق", 3],
                ].map(([label, step]) => {
                  const current = workflowStep(selected.status);
                  const complete = Number(step) <= current;
                  return (
                    <div key={String(label)} className="text-center">
                      <div className={cn("mx-auto flex size-8 items-center justify-center rounded-full border", complete ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground")}>
                        {complete ? <CheckCircle2 className="size-4" /> : <CircleDot className="size-4" />}
                      </div>
                      <p className={cn("mt-1 text-[11px] font-bold", complete ? "text-primary" : "text-muted-foreground")}>{label}</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {selected.status === "جديد" && (
                  <Button type="button" size="sm" onClick={() => quickStatus("قيد المعالجة")} disabled={update.isPending}>
                    بدء المعالجة
                  </Button>
                )}
                {selected.status !== "مغلق" && (
                  <Button type="button" size="sm" variant="outline" onClick={() => quickStatus("مغلق")} disabled={update.isPending}>
                    <CheckCircle2 className="size-4" /> إغلاق الطلب
                  </Button>
                )}
                {selected.status === "مغلق" && (
                  <Button type="button" size="sm" variant="outline" onClick={() => quickStatus("قيد المعالجة")} disabled={update.isPending}>
                    <RotateCcw className="size-4" /> إعادة فتح الطلب
                  </Button>
                )}
              </div>
            </section>

            <form
              className="mt-5 grid gap-3 border-t pt-4 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                update.mutate({
                  id: selected.id,
                  source: selected.source,
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
                {selected.linked_record_id && linkedRoute(selected) ? (
                  <Button asChild type="button" variant="outline">
                    <Link to={linkedRoute(selected)!}>
                      <Send className="size-4" /> فتح السجل المرتبط
                    </Link>
                  </Button>
                ) : selected.status.startsWith("تم التحويل") ? (
                  <Button type="button" variant="outline" disabled>
                    <Send className="size-4" /> تم إنشاء السجل
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={convertToRecord.isPending}
                    onClick={() => convertToRecord.mutate(selected)}
                  >
                    <Send className="size-4" /> {conversionLabel(selected)}
                  </Button>
                )}
              </div>
            </form>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-xl border bg-card p-10 text-sm text-muted-foreground shadow-sm">
            <AlertTriangle className="ml-2 size-4" /> اختر طلباً لعرض تفاصيله.
          </div>
        )}
      </div>
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
