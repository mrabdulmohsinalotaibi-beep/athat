import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/trash")({
  head: () => ({
    meta: [
      { title: "حماية البيانات | الذات" },
      { name: "description", content: "سلة المحذوفات وسجل العمليات لحماية بيانات الذات." },
    ],
  }),
  component: DataProtectionPage,
});

type DeletedItem = {
  id: string;
  table_name: string;
  record_id: string | null;
  record_data: Record<string, unknown>;
  deleted_at: string;
};

type AuditItem = {
  id: number;
  action: "INSERT" | "UPDATE" | "DELETE" | "RESTORE";
  table_name: string;
  record_id: string | null;
  changed_at: string;
};

const TABLE_LABELS: Record<string, string> = {
  students: "الطلاب",
  counseling_cases: "الحالات",
  interviews: "الجلسات",
  attendance: "المواظبة",
  behavior: "السلوك",
  referrals: "الإحالات",
  committees: "اللجان والاجتماعات",
  plan_tasks: "الخطة",
  programs: "البرامج",
  evidences: "الشواهد",
  calendar_events: "المواعيد",
  reports: "التقارير",
  posts: "المنشورات",
};

const ACTION_LABELS: Record<AuditItem["action"], string> = {
  INSERT: "إضافة",
  UPDATE: "تعديل",
  DELETE: "حذف",
  RESTORE: "استعادة",
};

function recordTitle(item: DeletedItem) {
  const row = item.record_data ?? {};
  return String(
    row["full_name"] ??
      row["student_name"] ??
      row["name"] ??
      row["task"] ??
      row["title"] ??
      row["topic"] ??
      row["summary"] ??
      row["case_no"] ??
      row["student_no"] ??
      item.record_id ??
      "سجل",
  );
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function DataProtectionPage() {
  const queryClient = useQueryClient();

  const deletedQuery = useQuery({
    queryKey: ["deleted-records"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("deleted_records")
        .select("id,table_name,record_id,record_data,deleted_at")
        .order("deleted_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as DeletedItem[];
    },
  });

  const auditQuery = useQuery({
    queryKey: ["audit-log"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("audit_log")
        .select("id,action,table_name,record_id,changed_at")
        .order("changed_at", { ascending: false })
        .limit(80);
      if (error) throw error;
      return (data ?? []) as AuditItem[];
    },
  });

  const restore = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc("restore_deleted_record", {
        p_deleted_id: id,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["deleted-records"] }),
        queryClient.invalidateQueries({ queryKey: ["audit-log"] }),
      ]);
      queryClient.invalidateQueries();
      toast.success("تمت استعادة السجل إلى مكانه الأصلي.");
    },
    onError: (error) => {
      toast.error(`تعذّرت الاستعادة: ${(error as Error).message}`);
    },
  });

  const deleted = deletedQuery.data ?? [];
  const audit = auditQuery.data ?? [];

  return (
    <div dir="rtl" className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-primary/15 bg-card p-5 shadow-[var(--shadow-soft)]">
        <div aria-hidden="true" className="pointer-events-none absolute -left-12 -top-12 size-40 rounded-full bg-primary/8 blur-2xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="size-5" />
              <span className="text-xs font-black">حماية بيانات الإنتاج</span>
            </div>
            <h1 className="mt-2 text-2xl font-black">سلة المحذوفات وسجل العمليات</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
              أي حذف من السجلات الأساسية يُنسخ تلقائيًا إلى سلة المحذوفات قبل إزالته، ويمكن استعادته من هنا.
              كما يسجل النظام الإضافة والتعديل والحذف والاستعادة لتسهيل المراجعة.
            </p>
          </div>
          <div className="rounded-xl border bg-muted/30 px-4 py-3 text-center">
            <p className="text-2xl font-black text-primary">{deleted.length}</p>
            <p className="text-[10px] text-muted-foreground">سجل قابل للاستعادة</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="mb-3 flex items-center gap-2">
          <Trash2 className="size-4 text-primary" />
          <h2 className="text-base font-black">سلة المحذوفات</h2>
        </div>

        {deletedQuery.isLoading ? (
          <p className="rounded-xl bg-muted/30 p-5 text-center text-sm text-muted-foreground">جارٍ تحميل السلة...</p>
        ) : deletedQuery.isError ? (
          <p className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            تعذّر تحميل سلة المحذوفات.
          </p>
        ) : deleted.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center">
            <ShieldCheck className="mx-auto size-7 text-primary" />
            <p className="mt-2 text-sm font-bold">لا توجد سجلات محذوفة.</p>
            <p className="mt-1 text-xs text-muted-foreground">أي حذف جديد من السجلات المحمية سيظهر هنا تلقائيًا.</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {deleted.map((item) => (
              <article key={item.id} className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-primary">{TABLE_LABELS[item.table_name] ?? item.table_name}</p>
                  <p className="truncate text-sm font-black">{recordTitle(item)}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">حُذف: {formatDate(item.deleted_at)}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={restore.isPending}
                  onClick={() => restore.mutate(item.id)}
                >
                  <RotateCcw className="size-4" />
                  استعادة
                </Button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="mb-3 flex items-center gap-2">
          <History className="size-4 text-primary" />
          <h2 className="text-base font-black">آخر العمليات</h2>
        </div>
        {auditQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">جارٍ تحميل سجل العمليات...</p>
        ) : audit.length === 0 ? (
          <p className="rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground">
            سيبدأ سجل العمليات من التغييرات الجديدة بعد تفعيل الحماية.
          </p>
        ) : (
          <div className="max-h-[460px] space-y-1.5 overflow-y-auto">
            {audit.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs">
                <div className="min-w-0">
                  <span className="font-black">{ACTION_LABELS[item.action]}</span>
                  <span className="mx-1 text-muted-foreground">·</span>
                  <span>{TABLE_LABELS[item.table_name] ?? item.table_name}</span>
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground">{formatDate(item.changed_at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
