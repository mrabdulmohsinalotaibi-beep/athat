import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArrowUpCircle,
  CheckCircle2,
  Clock3,
  Eye,
  FileCheck2,
  Inbox,
  RotateCcw,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PdfPreviewButton } from "@/components/PdfPreviewButton";

export const Route = createFileRoute("/_authenticated/school-inbox")({
  head: () => ({
    meta: [
      { title: "المراسلات الإدارية | الذات" },
      { name: "description", content: "تقارير المدرسة ومسار مراجعتها واعتمادها الإداري." },
    ],
  }),
  component: SchoolInboxPage,
});

type SnapshotColumn = { key: string; label: string };
type SnapshotSection = {
  key: string;
  title: string;
  columns?: SnapshotColumn[];
  rows?: Array<Record<string, unknown>>;
};
type ReportSnapshot = {
  version?: number;
  report_title?: string;
  document_no?: string;
  period?: string;
  from_date?: string;
  to_date?: string;
  narrative?: string;
  created_at?: string;
  total_rows?: number;
  sections?: SnapshotSection[];
};

type HandoffStatus = "sent" | "read" | "returned" | "forwarded" | "approved" | "archived";

type Handoff = {
  id: string;
  root_handoff_id: string;
  parent_handoff_id: string | null;
  sender_member_id: string;
  recipient_member_id: string;
  sender_name: string;
  sender_role: string;
  recipient_name: string;
  recipient_role: string;
  title: string;
  note: string | null;
  snapshot: ReportSnapshot;
  status: HandoffStatus;
  sent_at: string;
  read_at: string | null;
  decision_note: string | null;
  decision_at: string | null;
};

type HandoffEvent = {
  id: string;
  root_handoff_id: string;
  handoff_id: string;
  actor_member_id: string | null;
  actor_name: string;
  actor_role: string;
  event_type: "sent" | "read" | "returned" | "forwarded" | "approved" | "archived";
  note: string | null;
  target_member_id: string | null;
  target_name: string | null;
  target_role: string | null;
  created_at: string;
};

type TeamMember = {
  id: string;
  display_name?: string | null;
  role: string;
  member_status: string;
};

const roleLabel = (role: string) =>
  ({
    principal: "مدير المدرسة",
    vice_principal: "وكيل المدرسة",
    counselor: "الموجه الطلابي",
    teacher: "معلم",
    admin_staff: "إداري",
    guard: "حارس",
    observer: "اطلاع فقط",
  })[role] ?? role;

const statusLabel = (status: HandoffStatus) =>
  ({
    sent: "بانتظار الاطلاع",
    read: "قيد المراجعة",
    returned: "معاد بملاحظة",
    forwarded: "اعتمد ورُفع للمدير",
    approved: "معتمد نهائيًا",
    archived: "مؤرشف",
  })[status] ?? status;

const eventLabel = (event: HandoffEvent) => {
  if (event.event_type === "sent") return event.target_name ? `أرسل التقرير إلى ${event.target_name}` : "أرسل التقرير";
  if (event.event_type === "read") return "اطلع على التقرير";
  if (event.event_type === "returned") return event.target_name ? `أعاد التقرير إلى ${event.target_name}` : "أعاد التقرير بملاحظة";
  if (event.event_type === "forwarded") return event.target_name ? `اعتمد التقرير ورفعه إلى ${event.target_name}` : "اعتمد التقرير ورفعه";
  if (event.event_type === "approved") return "اعتمد التقرير اعتمادًا نهائيًا";
  return "أرشف التقرير";
};

const valueText = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

function SchoolInboxPage() {
  const queryClient = useQueryClient();
  const previewRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"received" | "sent">("received");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [forwardPrincipalId, setForwardPrincipalId] = useState("");

  const query = useQuery({
    queryKey: ["school-report-handoffs"],
    queryFn: async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("انتهت جلسة الدخول.");

      const { data: context, error: contextError } = await (supabase as any).rpc("get_my_school_context");
      if (contextError) throw contextError;
      const memberId = String(context?.membership?.id ?? "");
      const memberRole = String(context?.membership?.role ?? "");
      const members = (context?.members ?? []) as TeamMember[];
      if (!memberId) return { memberId: "", memberRole: "", members, rows: [] as Handoff[], events: [] as HandoffEvent[] };

      const [handoffsResult, eventsResult] = await Promise.all([
        (supabase as any)
          .from("school_report_handoffs")
          .select("*")
          .order("sent_at", { ascending: false })
          .limit(250),
        (supabase as any)
          .from("school_report_handoff_events")
          .select("*")
          .order("created_at", { ascending: true })
          .limit(750),
      ]);

      if (handoffsResult.error) throw handoffsResult.error;
      if (eventsResult.error) throw eventsResult.error;

      return {
        memberId,
        memberRole,
        members,
        rows: (handoffsResult.data ?? []) as Handoff[],
        events: (eventsResult.data ?? []) as HandoffEvent[],
      };
    },
    staleTime: 10_000,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["school-report-handoffs"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard-live-v2"] });
    await queryClient.invalidateQueries({ queryKey: ["app-alert-summary"] });
  };

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc("mark_school_report_handoff_read", {
        p_handoff_id: id,
      });
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (error) => toast.error((error as Error).message),
  });

  const review = useMutation({
    mutationFn: async ({
      id,
      action,
      note,
      forwardTo,
    }: {
      id: string;
      action: "return" | "approve" | "approve_and_forward";
      note?: string;
      forwardTo?: string;
    }) => {
      const { data, error } = await (supabase as any).rpc("review_school_report_handoff", {
        p_handoff_id: id,
        p_action: action,
        p_note: note?.trim() || null,
        p_forward_to_member_id: forwardTo || null,
      });
      if (error) throw error;
      return String(data ?? id);
    },
    onSuccess: async (newId, variables) => {
      setReviewNote("");
      setForwardPrincipalId("");
      if (variables.action === "approve_and_forward" && newId) setSelectedId(newId);
      await refresh();
      toast.success(
        variables.action === "return"
          ? "تمت إعادة التقرير بالملاحظة."
          : variables.action === "approve"
            ? "تم اعتماد التقرير نهائيًا."
            : "تم اعتماد التقرير ورفعه إلى مدير المدرسة.",
      );
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const archive = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc("archive_school_report_handoff", {
        p_handoff_id: id,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setSelectedId(null);
      await refresh();
      toast.success("تمت أرشفة التقرير.");
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const memberId = query.data?.memberId ?? "";
  const rows = query.data?.rows ?? [];
  const members = query.data?.members ?? [];
  const events = query.data?.events ?? [];
  const received = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.status !== "archived" &&
          (row.recipient_member_id === memberId ||
            (row.sender_member_id === memberId && row.status === "returned")),
      ),
    [rows, memberId],
  );
  const sent = useMemo(
    () => rows.filter((row) => row.sender_member_id === memberId),
    [rows, memberId],
  );
  const visible = mode === "received" ? received : sent;
  const selected = rows.find((row) => row.id === selectedId) ?? null;
  const pendingActions = received.filter(
    (row) =>
      (row.recipient_member_id === memberId && row.status === "sent") ||
      (row.sender_member_id === memberId && row.status === "returned"),
  ).length;
  const principals = members.filter((member) => member.member_status === "active" && member.role === "principal");
  const selectedEvents = selected
    ? events.filter((event) => event.root_handoff_id === selected.root_handoff_id)
    : [];
  const canReview = Boolean(
    selected &&
      selected.recipient_member_id === memberId &&
      (selected.status === "sent" || selected.status === "read"),
  );
  const principalForForward = forwardPrincipalId || principals[0]?.id || "";

  const openReport = (row: Handoff) => {
    setSelectedId(row.id);
    setReviewNote("");
    setForwardPrincipalId("");
    if (row.recipient_member_id === memberId && row.status === "sent") {
      markRead.mutate(row.id);
    }
  };

  return (
    <div dir="rtl" className="space-y-5">
      <section className="rounded-3xl border border-primary/15 bg-card p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="size-5" />
              <span className="text-xs font-black">مسار اعتماد موثق</span>
            </div>
            <h1 className="mt-2 text-2xl font-black">المراسلات والتقارير الإدارية</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
              نسخة التقرير ثابتة ولا تعدّل السجلات الأصلية. يظهر هنا مسار الإرسال والاطلاع والإعادة والاعتماد والرفع حتى الاعتماد النهائي.
            </p>
          </div>
          <div className="rounded-xl border bg-muted/30 px-4 py-3 text-center">
            <p className="text-2xl font-black text-primary">{pendingActions}</p>
            <p className="text-[10px] text-muted-foreground">بانتظار إجراء</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-3xl border bg-card p-3 shadow-[var(--shadow-card)]">
          <div className="mb-3 grid grid-cols-2 gap-2">
            <Button variant={mode === "received" ? "default" : "outline"} onClick={() => { setMode("received"); setSelectedId(null); }}>
              <Inbox className="size-4" /> الوارد {pendingActions ? `(${pendingActions})` : ""}
            </Button>
            <Button variant={mode === "sent" ? "default" : "outline"} onClick={() => { setMode("sent"); setSelectedId(null); }}>
              <Send className="size-4" /> المرسل
            </Button>
          </div>

          {query.isLoading && <p className="p-4 text-center text-xs text-muted-foreground">جارٍ تحميل التقارير...</p>}
          {query.isError && <p className="p-4 text-center text-xs text-destructive">تعذّر تحميل المراسلات الإدارية.</p>}

          <div className="space-y-2">
            {visible.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => openReport(row)}
                className={`w-full rounded-xl border p-3 text-right transition hover:border-primary/40 ${selectedId === row.id ? "border-primary bg-primary/5" : "bg-background"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-2 text-sm font-black">{row.title}</p>
                  {mode === "received" &&
                    ((row.recipient_member_id === memberId && row.status === "sent") ||
                      (row.sender_member_id === memberId && row.status === "returned")) && (
                      <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                    )}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {mode === "received"
                    ? `من: ${row.sender_name} · ${roleLabel(row.sender_role)}`
                    : `إلى: ${row.recipient_name} · ${roleLabel(row.recipient_role)}`}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-black">{statusLabel(row.status)}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(row.sent_at).toLocaleString("ar-SA")}</span>
                </div>
              </button>
            ))}
            {!query.isLoading && visible.length === 0 && (
              <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                لا توجد تقارير في هذا القسم بعد.
              </div>
            )}
          </div>
        </aside>

        <main className="min-w-0 rounded-3xl border bg-card p-4 shadow-[var(--shadow-card)]">
          {!selected ? (
            <div className="flex min-h-80 flex-col items-center justify-center text-center">
              <FileCheck2 className="size-10 text-primary/40" />
              <p className="mt-3 font-black">اختر تقريرًا لعرض النسخة ومسار اعتمادها</p>
              <p className="mt-1 text-xs text-muted-foreground">المستند المرسل للقراءة فقط، والمراجعة الإدارية تسجل كحدث مستقل.</p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black text-primary">{statusLabel(selected.status)}</span>
                    {selected.decision_at && <span className="text-[10px] text-muted-foreground">{new Date(selected.decision_at).toLocaleString("ar-SA")}</span>}
                  </div>
                  <h2 className="text-xl font-black">{selected.title}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    من {selected.sender_name} ({roleLabel(selected.sender_role)}) إلى {selected.recipient_name} ({roleLabel(selected.recipient_role)})
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <PdfPreviewButton elementRef={previewRef} filename={`تقرير-إداري-${selected.title}`} title={selected.title} />
                  {((selected.recipient_member_id === memberId &&
                    !["sent", "read", "archived"].includes(selected.status)) ||
                    (selected.sender_member_id === memberId && selected.status === "returned")) && (
                    <Button variant="outline" onClick={() => archive.mutate(selected.id)} disabled={archive.isPending}>
                      <Archive className="size-4" /> أرشفة
                    </Button>
                  )}
                </div>
              </div>

              {canReview && (
                <section className="mb-5 rounded-2xl border border-primary/20 bg-primary/[0.03] p-4">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="size-4 text-primary" />
                    <h3 className="font-black">مراجعة التقرير</h3>
                  </div>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">
                    سجّل قرارك هنا. محتوى التقرير نفسه يبقى ثابتًا ولا يمكن تعديله من مسار الاعتماد.
                  </p>

                  <textarea
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                    className="mt-3 min-h-24 w-full rounded-xl border bg-background px-3 py-2 text-sm"
                    placeholder={selected.recipient_role === "principal" ? "ملاحظة الاعتماد أو سبب الإعادة..." : "ملاحظة المراجعة أو سبب الإعادة..."}
                  />

                  {selected.recipient_role === "vice_principal" && principals.length > 1 && (
                    <select
                      value={principalForForward}
                      onChange={(event) => setForwardPrincipalId(event.target.value)}
                      className="mt-3 h-10 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      {principals.map((principal) => (
                        <option key={principal.id} value={principal.id}>
                          {principal.display_name || "مدير المدرسة"}
                        </option>
                      ))}
                    </select>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {selected.recipient_role === "vice_principal" && (
                      <Button
                        disabled={!principalForForward || review.isPending}
                        onClick={() =>
                          review.mutate({
                            id: selected.id,
                            action: "approve_and_forward",
                            note: reviewNote,
                            forwardTo: principalForForward,
                          })
                        }
                      >
                        <ArrowUpCircle className="size-4" /> اعتماد ورفع للمدير
                      </Button>
                    )}
                    {selected.recipient_role === "vice_principal" && principals.length === 0 && (
                      <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-800">
                        لا يوجد مدير مدرسة نشط في فريق المدرسة حاليًا. أضفه أو اعتمد عضويته أولًا.
                      </p>
                    )}
                    {selected.recipient_role === "principal" && (
                      <Button
                        disabled={review.isPending}
                        onClick={() => review.mutate({ id: selected.id, action: "approve", note: reviewNote })}
                      >
                        <CheckCircle2 className="size-4" /> اعتماد نهائي
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      disabled={!reviewNote.trim() || review.isPending}
                      onClick={() => review.mutate({ id: selected.id, action: "return", note: reviewNote })}
                    >
                      <RotateCcw className="size-4" /> إعادة بملاحظة
                    </Button>
                  </div>
                </section>
              )}

              {selected.decision_note && !canReview && (
                <div className="mb-5 rounded-xl border bg-muted/25 p-3 text-xs leading-6">
                  <strong>ملاحظة القرار:</strong> {selected.decision_note}
                </div>
              )}

              <section className="mb-5 rounded-2xl border bg-card p-4">
                <div className="flex items-center gap-2">
                  <Clock3 className="size-4 text-primary" />
                  <h3 className="font-black">سجل مسار التقرير</h3>
                </div>
                <div className="mt-4 space-y-3">
                  {selectedEvents.map((event, index) => (
                    <div key={event.id} className="relative flex gap-3">
                      <div className="flex w-5 shrink-0 flex-col items-center">
                        <span className="mt-1 size-2.5 rounded-full bg-primary" />
                        {index < selectedEvents.length - 1 && <span className="mt-1 h-full min-h-10 w-px bg-border" />}
                      </div>
                      <div className="min-w-0 flex-1 pb-2">
                        <p className="text-xs font-black">{eventLabel(event)}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {event.actor_name} · {roleLabel(event.actor_role)} · {new Date(event.created_at).toLocaleString("ar-SA")}
                        </p>
                        {event.note && <p className="mt-2 rounded-lg bg-muted/35 p-2 text-[11px] leading-5">{event.note}</p>}
                      </div>
                    </div>
                  ))}
                  {!selectedEvents.length && <p className="text-xs text-muted-foreground">لا توجد أحداث مسجلة لهذا التقرير بعد.</p>}
                </div>
              </section>

              <div ref={previewRef} className="space-y-5 bg-background p-4">
                <div className="rounded-xl border p-4">
                  <div className="flex items-center gap-2 text-primary"><Eye className="size-4" /><span className="text-xs font-black">نسخة ثابتة للقراءة فقط</span></div>
                  <h3 className="mt-2 text-lg font-black">{selected.snapshot?.report_title || selected.title}</h3>
                  <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                    <p><strong>رقم المستند:</strong> {selected.snapshot?.document_no || "—"}</p>
                    <p><strong>الفترة:</strong> {selected.snapshot?.period || "—"}</p>
                    <p><strong>من:</strong> {selected.snapshot?.from_date || "—"}</p>
                    <p><strong>إلى:</strong> {selected.snapshot?.to_date || "—"}</p>
                  </div>
                  {selected.note && <p className="mt-3 rounded-lg bg-muted/40 p-3 text-xs leading-6"><strong>رسالة المرسل:</strong> {selected.note}</p>}
                  {selected.snapshot?.narrative && <p className="mt-3 text-sm leading-7">{selected.snapshot.narrative}</p>}
                </div>

                {(selected.snapshot?.sections ?? []).map((section) => {
                  const columns = section.columns ?? [];
                  const sectionRows = section.rows ?? [];
                  return (
                    <section key={section.key} className="overflow-hidden rounded-xl border">
                      <div className="flex items-center justify-between bg-muted/30 px-4 py-3">
                        <h4 className="font-black">{section.title}</h4>
                        <span className="text-xs text-muted-foreground">{sectionRows.length} سجل</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-xs">
                          <thead className="bg-muted/20">
                            <tr>{columns.map((column) => <th key={column.key} className="border-b px-3 py-2 text-right font-black">{column.label}</th>)}</tr>
                          </thead>
                          <tbody>
                            {sectionRows.map((row, index) => (
                              <tr key={String(row["id"] ?? index)} className="border-b last:border-0">
                                {columns.map((column) => <td key={column.key} className="max-w-64 px-3 py-2 align-top">{valueText(row[column.key])}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  );
                })}
              </div>
            </>
          )}
        </main>
      </section>
    </div>
  );
}
