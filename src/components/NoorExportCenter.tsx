import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  Filter,
  PauseCircle,
  RefreshCw,
  UploadCloud,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

const NOOR_URL = "https://noor.moe.gov.sa/Noor/Login.aspx";

type SourceTable = "counseling_cases" | "interviews" | "behavior" | "attendance";
type JobStatus = "ready" | "paused" | "submitted" | "failed";

type Job = {
  id: string;
  source_table: SourceTable;
  source_id: string;
  payload: Json;
  status: JobStatus;
  noor_reference: string | null;
  last_error: string | null;
  pause_reason: string | null;
  updated_at: string;
};

type SourceRow = {
  table: SourceTable;
  id: string;
  label: string;
  payload: Json;
};

const sourceLabel: Record<SourceTable, string> = {
  counseling_cases: "حالة إرشادية",
  interviews: "مقابلة / تواصل",
  behavior: "سلوك",
  attendance: "مواظبة",
};

const statusLabel: Record<JobStatus, string> = {
  ready: "جاهز للترحيل",
  paused: "متوقف لتدخل يدوي",
  submitted: "تم الرفع والتوثيق",
  failed: "فشل ويحتاج مراجعة",
};

const statusClass: Record<JobStatus, string> = {
  ready: "bg-primary/10 text-primary",
  paused: "bg-amber-500/10 text-amber-700",
  submitted: "bg-emerald-500/10 text-emerald-700",
  failed: "bg-destructive/10 text-destructive",
};

function payloadLabel(payload: Json): string {
  if (payload === null || Array.isArray(payload) || typeof payload !== "object") {
    return "سجل توجيهي";
  }

  return String(
    payload["student_name"] ??
      payload["title"] ??
      payload["observation"] ??
      payload["case_type"] ??
      "سجل توجيهي",
  );
}

function toSourceRows(
  table: SourceTable,
  rows: Record<string, unknown>[],
): SourceRow[] {
  return rows.map((row) => ({
    table,
    id: String(row["id"] ?? ""),
    label: String(
      row["student_name"] ??
        row["title"] ??
        row["observation"] ??
        row["case_type"] ??
        "سجل توجيهي",
    ),
    payload: row as unknown as Json,
  }));
}

export function NoorExportCenter() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<SourceTable | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "new" | JobStatus>("all");

  const sourceQuery = useQuery({
    queryKey: ["noor-source-records"],
    queryFn: async (): Promise<SourceRow[]> => {
      const [cases, interviews, behavior, attendance] = await Promise.all([
        supabase
          .from("counseling_cases")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("interviews")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("behavior")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("attendance")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500),
      ]);

      const sources = [
        ["counseling_cases", cases],
        ["interviews", interviews],
        ["behavior", behavior],
        ["attendance", attendance],
      ] as const;

      sources.forEach(([name, result]) => {
        if (result.error) {
          console.warn(`[noor-export] تعذّر تحميل ${name}:`, result.error.message);
        }
      });

      return [
        ...toSourceRows(
          "counseling_cases",
          (cases.error ? [] : cases.data ?? []) as Record<string, unknown>[],
        ),
        ...toSourceRows(
          "interviews",
          (interviews.error ? [] : interviews.data ?? []) as Record<string, unknown>[],
        ),
        ...toSourceRows(
          "behavior",
          (behavior.error ? [] : behavior.data ?? []) as Record<string, unknown>[],
        ),
        ...toSourceRows(
          "attendance",
          (attendance.error ? [] : attendance.data ?? []) as Record<string, unknown>[],
        ),
      ].filter((row) => Boolean(row.id));
    },
  });

  const jobsQuery = useQuery({
    queryKey: ["noor-export-jobs"],
    queryFn: async (): Promise<Job[]> => {
      const { data, error } = await supabase
        .from("noor_export_jobs")
        .select(
          "id,source_table,source_id,payload,status,noor_reference,last_error,pause_reason,updated_at",
        )
        .order("updated_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      return (data ?? [])
        .filter(
          (row) =>
            row.source_table === "counseling_cases" ||
            row.source_table === "interviews" ||
            row.source_table === "behavior" ||
            row.source_table === "attendance",
        )
        .map((row) => ({
          id: row.id,
          source_table: row.source_table as SourceTable,
          source_id: row.source_id,
          payload: row.payload,
          status: row.status as JobStatus,
          noor_reference: row.noor_reference,
          last_error: row.last_error,
          pause_reason: row.pause_reason,
          updated_at: row.updated_at,
        }));
    },
  });

  const rows = sourceQuery.data ?? [];
  const jobs = jobsQuery.data ?? [];

  const existing = useMemo(
    () => new Map(jobs.map((job) => [`${job.source_table}:${job.source_id}`, job])),
    [jobs],
  );

  const visibleRows = useMemo(
    () =>
      rows.filter((row) => {
        if (typeFilter !== "all" && row.table !== typeFilter) return false;
        const job = existing.get(`${row.table}:${row.id}`);
        if (statusFilter === "new") return !job;
        if (statusFilter !== "all" && job?.status !== statusFilter) return false;
        return true;
      }),
    [rows, typeFilter, statusFilter, existing],
  );

  const stats = useMemo(
    () => ({
      total: rows.length,
      fresh: rows.filter((row) => !existing.has(`${row.table}:${row.id}`)).length,
      ready: jobs.filter((job) => job.status === "ready").length,
      submitted: jobs.filter((job) => job.status === "submitted").length,
      attention: jobs.filter(
        (job) => job.status === "paused" || job.status === "failed",
      ).length,
    }),
    [rows, jobs, existing],
  );

  const prepare = useMutation({
    mutationFn: async () => {
      const chosen = rows.filter((row) =>
        selected.includes(`${row.table}:${row.id}`),
      );
      if (!chosen.length) throw new Error("حدد سجلاً واحداً على الأقل.");

      const { error } = await supabase
        .from("noor_export_jobs")
        .upsert(
          chosen.map((row) => ({
            source_table: row.table,
            source_id: row.id,
            payload: row.payload,
            status: "ready",
          })),
          { onConflict: "user_id,source_table,source_id" },
        );

      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("تم تجهيز السجلات ومنع تكرارها.");
      setSelected([]);
      await queryClient.invalidateQueries({ queryKey: ["noor-export-jobs"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: JobStatus }) => {
      const value =
        window.prompt(
          status === "submitted"
            ? "أدخل رقم المرجع في نور (اختياري):"
            : "اكتب سبب الإيقاف أو الفشل (اختياري):",
        ) ?? "";

      const patch =
        status === "submitted"
          ? {
              status,
              noor_reference: value || null,
              submitted_at: new Date().toISOString(),
              last_error: null,
              pause_reason: null,
            }
          : status === "failed"
            ? {
                status,
                last_error: value || "فشل الرفع",
                pause_reason: null,
              }
            : {
                status,
                pause_reason: value || "بانتظار تدخل يدوي",
                last_error: null,
              };

      const { error } = await supabase
        .from("noor_export_jobs")
        .update(patch)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["noor-export-jobs"] });
      toast.success("تم تحديث حالة عملية نور.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const visibleKeys = visibleRows.map((row) => `${row.table}:${row.id}`);
  const allSelected =
    visibleKeys.length > 0 && visibleKeys.every((key) => selected.includes(key));

  return (
    <section className="space-y-5 rounded-3xl border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-4 xl:flex-row lg:items-start xl:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black">
            <UploadCloud className="size-5 text-primary" /> تجهيز أعمال التوجيه لنظام نور
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-7 text-muted-foreground">
            اجمع الحالات والمقابلات والسلوك والمواظبة في قائمة عمل واحدة، ثم وثّق ما تم
            إدخاله في نور حتى لا يتكرر العمل.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild type="button" variant="outline">
            <a href={NOOR_URL} target="_blank" rel="noreferrer noopener">
              <ExternalLink className="size-4" /> فتح نظام نور
            </a>
          </Button>
          <Button
            type="button"
            onClick={() => prepare.mutate()}
            disabled={prepare.isPending || !selected.length}
          >
            <FileCheck2 className="size-4" />
            {prepare.isPending
              ? "جارٍ التجهيز..."
              : `تجهيز المحدد (${selected.length})`}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-6">
        «الذات» لا تدخل إلى حساب نور نيابة عنك ولا تتجاوز رمز التحقق. بعد الإدخال
        النظامي في نور، اضغط «توثيق الرفع» وسجّل رقم المرجع إن وجد.
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MiniStat label="مصادر التوجيه" value={stats.total} />
        <MiniStat label="غير مجهز" value={stats.fresh} />
        <MiniStat label="جاهز لنور" value={stats.ready} />
        <MiniStat label="تم توثيقه" value={stats.submitted} />
        <MiniStat label="يحتاج مراجعة" value={stats.attention} />
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-muted/20 p-3">
        <div>
          <label className="mb-1 block text-xs font-bold">نوع السجل</label>
          <select
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(event.target.value as SourceTable | "all")
            }
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="all">كل الأنواع</option>
            {(Object.entries(sourceLabel) as [SourceTable, string][]).map(
              ([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ),
            )}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold">حالة التجهيز</label>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "all" | "new" | JobStatus)
            }
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="all">كل الحالات</option>
            <option value="new">غير مجهز</option>
            <option value="ready">جاهز للترحيل</option>
            <option value="submitted">تم الرفع والتوثيق</option>
            <option value="paused">متوقف مؤقتًا</option>
            <option value="failed">يحتاج مراجعة</option>
          </select>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            setSelected((current) =>
              allSelected
                ? current.filter((key) => !visibleKeys.includes(key))
                : Array.from(new Set([...current, ...visibleKeys])),
            )
          }
          disabled={!visibleKeys.length}
        >
          <Filter className="size-4" />
          {allSelected
            ? "إلغاء تحديد الظاهر"
            : `تحديد الظاهر (${visibleKeys.length})`}
        </Button>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            void sourceQuery.refetch();
            void jobsQuery.refetch();
          }}
        >
          <RefreshCw className="size-4" /> تحديث
        </Button>
      </div>

      {sourceQuery.isLoading ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          جارٍ تحميل سجلات التوجيه…
        </div>
      ) : (
        <div className="grid gap-2 xl:grid-cols-2">
          {visibleRows.slice(0, 100).map((row) => {
            const key = `${row.table}:${row.id}`;
            const job = existing.get(key);
            return (
              <label
                key={key}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-3 text-sm hover:bg-muted/40"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.includes(key)}
                    onChange={(event) =>
                      setSelected((value) =>
                        event.target.checked
                          ? Array.from(new Set([...value, key]))
                          : value.filter((item) => item !== key),
                      )
                    }
                  />
                  <span className="truncate">
                    <b>{row.label}</b>
                    <small className="mt-1 block text-muted-foreground">
                      {sourceLabel[row.table]}
                    </small>
                  </span>
                </span>
                {job ? (
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${statusClass[job.status]}`}
                  >
                    {statusLabel[job.status]}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">غير مجهز</span>
                )}
              </label>
            );
          })}
        </div>
      )}

      {!sourceQuery.isLoading && !visibleRows.length && (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          لا توجد سجلات تطابق الفلاتر الحالية.
        </div>
      )}

      {sourceQuery.isError || jobsQuery.isError ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <span>تعذّر تحميل جزء من مركز نور.</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              void sourceQuery.refetch();
              void jobsQuery.refetch();
            }}
          >
            إعادة المحاولة
          </Button>
        </div>
      ) : null}

      {jobs.length > 0 && (
        <div className="border-t pt-4">
          <h3 className="mb-3 flex items-center gap-2 font-bold">
            <FileCheck2 className="size-4" /> سجل عمليات نور
          </h3>
          <div className="space-y-2">
            {jobs.slice(0, 40).map((job) => (
              <div
                key={job.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {job.status === "submitted" ? (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  ) : (
                    <PauseCircle className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="min-w-0">
                    <b className="block truncate">{payloadLabel(job.payload)}</b>
                    <small className="text-muted-foreground">
                      {sourceLabel[job.source_table]}
                      {job.noor_reference
                        ? ` • مرجع نور: ${job.noor_reference}`
                        : ""}
                    </small>
                  </span>
                </span>

                <span className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-bold ${statusClass[job.status]}`}
                  >
                    {statusLabel[job.status]}
                  </span>
                  {job.status !== "submitted" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={update.isPending}
                      onClick={() =>
                        update.mutate({ id: job.id, status: "submitted" })
                      }
                    >
                      توثيق الرفع
                    </Button>
                  )}
                  {job.status !== "submitted" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={update.isPending}
                      onClick={() =>
                        update.mutate({ id: job.id, status: "paused" })
                      }
                    >
                      إيقاف مؤقت
                    </Button>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}
