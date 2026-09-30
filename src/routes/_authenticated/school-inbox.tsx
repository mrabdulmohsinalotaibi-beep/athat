import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Eye, FileCheck2, Inbox, Send, ShieldCheck } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PdfPreviewButton } from "@/components/PdfPreviewButton";

export const Route = createFileRoute("/_authenticated/school-inbox")({
  head: () => ({
    meta: [
      { title: "المراسلات الإدارية | الذات" },
      { name: "description", content: "تقارير المدرسة المرسلة للقراءة والاطلاع فقط." },
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

type Handoff = {
  id: string;
  sender_member_id: string;
  recipient_member_id: string;
  sender_name: string;
  sender_role: string;
  recipient_name: string;
  recipient_role: string;
  title: string;
  note: string | null;
  snapshot: ReportSnapshot;
  status: "sent" | "read" | "archived";
  sent_at: string;
  read_at: string | null;
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

  const query = useQuery({
    queryKey: ["school-report-handoffs"],
    queryFn: async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("انتهت جلسة الدخول.");

      const { data: context, error: contextError } = await (supabase as any).rpc("get_my_school_context");
      if (contextError) throw contextError;
      const memberId = String(context?.membership?.id ?? "");
      if (!memberId) return { memberId: "", rows: [] as Handoff[] };

      const { data, error } = await (supabase as any)
        .from("school_report_handoffs")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return { memberId, rows: (data ?? []) as Handoff[] };
    },
    staleTime: 10_000,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc("mark_school_report_handoff_read", {
        p_handoff_id: id,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["school-report-handoffs"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-live-v2"] });
      await queryClient.invalidateQueries({ queryKey: ["app-alert-summary"] });
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
      await queryClient.invalidateQueries({ queryKey: ["school-report-handoffs"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-live-v2"] });
      await queryClient.invalidateQueries({ queryKey: ["app-alert-summary"] });
      toast.success("تمت أرشفة التقرير.");
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const memberId = query.data?.memberId ?? "";
  const rows = query.data?.rows ?? [];
  const received = useMemo(
    () => rows.filter((row) => row.recipient_member_id === memberId && row.status !== "archived"),
    [rows, memberId],
  );
  const sent = useMemo(
    () => rows.filter((row) => row.sender_member_id === memberId),
    [rows, memberId],
  );
  const visible = mode === "received" ? received : sent;
  const selected = rows.find((row) => row.id === selectedId) ?? null;
  const unread = received.filter((row) => row.status === "sent").length;

  const openReport = (row: Handoff) => {
    setSelectedId(row.id);
    if (row.recipient_member_id === memberId && row.status === "sent") {
      markRead.mutate(row.id);
    }
  };

  return (
    <div dir="rtl" className="space-y-5">
      <section className="rounded-2xl border border-primary/15 bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="size-5" />
              <span className="text-xs font-black">قراءة فقط</span>
            </div>
            <h1 className="mt-2 text-2xl font-black">المراسلات والتقارير الإدارية</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
              التقارير هنا نسخة ثابتة وقت الإرسال. الاطلاع عليها لا يمنح المستلم صلاحية تعديل السجلات الأصلية.
            </p>
          </div>
          <div className="rounded-xl border bg-muted/30 px-4 py-3 text-center">
            <p className="text-2xl font-black text-primary">{unread}</p>
            <p className="text-[10px] text-muted-foreground">غير مقروء</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-2xl border bg-card p-3 shadow-sm">
          <div className="mb-3 grid grid-cols-2 gap-2">
            <Button variant={mode === "received" ? "default" : "outline"} onClick={() => { setMode("received"); setSelectedId(null); }}>
              <Inbox className="size-4" /> الوارد {unread ? `(${unread})` : ""}
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
                  {mode === "received" && row.status === "sent" && <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {mode === "received"
                    ? `من: ${row.sender_name} · ${roleLabel(row.sender_role)}`
                    : `إلى: ${row.recipient_name} · ${roleLabel(row.recipient_role)}`}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">{new Date(row.sent_at).toLocaleString("ar-SA")}</p>
              </button>
            ))}
            {!query.isLoading && visible.length === 0 && (
              <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                لا توجد تقارير في هذا القسم بعد.
              </div>
            )}
          </div>
        </aside>

        <main className="min-w-0 rounded-2xl border bg-card p-4 shadow-sm">
          {!selected ? (
            <div className="flex min-h-80 flex-col items-center justify-center text-center">
              <FileCheck2 className="size-10 text-primary/40" />
              <p className="mt-3 font-black">اختر تقريرًا لعرض النسخة المرسلة</p>
              <p className="mt-1 text-xs text-muted-foreground">لن تتمكن من تعديل محتوى النسخة أو السجلات الأصلية من هذه الصفحة.</p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                <div>
                  <h2 className="text-xl font-black">{selected.title}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    من {selected.sender_name} ({roleLabel(selected.sender_role)}) إلى {selected.recipient_name} ({roleLabel(selected.recipient_role)})
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <PdfPreviewButton elementRef={previewRef} filename={`تقرير-إداري-${selected.title}`} title={selected.title} />
                  {selected.recipient_member_id === memberId && selected.status !== "archived" && (
                    <Button variant="outline" onClick={() => archive.mutate(selected.id)} disabled={archive.isPending}>
                      <Archive className="size-4" /> أرشفة
                    </Button>
                  )}
                </div>
              </div>

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
