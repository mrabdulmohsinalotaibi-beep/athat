import { useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, FileCheck2, PauseCircle, RefreshCw, UploadCloud } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const NOOR_URL = "https://noor.moe.gov.sa/Noor/Login.aspx";
type SourceTable = "counseling_cases" | "interviews" | "behavior";
type JobStatus = "ready" | "paused" | "submitted" | "failed";
type Job = { id: string; source_table: SourceTable; source_id: string; payload: Record<string, unknown>; status: JobStatus; noor_reference: string | null; last_error: string | null; pause_reason: string | null; updated_at: string };
type SourceRow = { table: SourceTable; id: string; label: string; payload: Record<string, unknown> };

const statusLabel: Record<JobStatus, string> = { ready: "جاهز للترحيل", paused: "متوقف لتدخل يدوي", submitted: "تم الرفع والتوثيق", failed: "فشل ويحتاج مراجعة" };
const statusClass: Record<JobStatus, string> = { ready: "bg-primary/10 text-primary", paused: "bg-amber-500/10 text-amber-700", submitted: "bg-emerald-500/10 text-emerald-700", failed: "bg-destructive/10 text-destructive" };

export function NoorExportCenter() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const sourceQuery = useQuery({
    queryKey: ["noor-source-records"],
    queryFn: async () => {
      const [cases, interviews, behavior] = await Promise.all([
        supabase.from("counseling_cases").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("interviews").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("behavior").select("*").order("created_at", { ascending: false }).limit(500),
      ]);
      for (const [name, result] of [
        ["counseling_cases", cases],
        ["interviews", interviews],
        ["behavior", behavior],
      ] as const) {
        if (result.error) {
          console.warn(`[noor-export] تعذّر تحميل ${name}:`, result.error.message);
        }
      }

      const make = (table: SourceTable, rows: Record<string, unknown>[]): SourceRow[] =>
        rows.map((row) => ({
          table,
          id: String(row["id"]),
          label: String(
            row["student_name"] || row["title"] || row["observation"] || "سجل توجيهي",
          ),
          payload: row,
        }));

      return [
        ...make("counseling_cases", (cases.error ? [] : cases.data ?? []) as Record<string, unknown>[]),
        ...make("interviews", (interviews.error ? [] : interviews.data ?? []) as Record<string, unknown>[]),
        ...make("behavior", (behavior.error ? [] : behavior.data ?? []) as Record<string, unknown>[]),
      ];
    },
  });
  const jobsQuery = useQuery({
    queryKey: ["noor-export-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("noor_export_jobs").select("id,source_table,source_id,payload,status,noor_reference,last_error,pause_reason,updated_at").order("updated_at", { ascending: false }).limit(500);
      if (error) throw new Error(error.message);
      return (data ?? []) as Job[];
    },
  });
  const rows = sourceQuery.data ?? [];
  const jobs = jobsQuery.data ?? [];
  const existing = useMemo(() => new Map(jobs.map((job) => [`${job.source_table}:${job.source_id}`, job])), [jobs]);
  const prepare = useMutation({
    mutationFn: async () => {
      const chosen = rows.filter((row) => selected.includes(`${row.table}:${row.id}`));
      if (!chosen.length) throw new Error("حدد سجلاً واحداً على الأقل.");
      const { error } = await supabase.from("noor_export_jobs").upsert(chosen.map((row) => ({ source_table: row.table, source_id: row.id, payload: row.payload, status: "ready" })), { onConflict: "user_id,source_table,source_id" });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("تم تجهيز السجلات ومنع تكرارها."); setSelected([]); void qc.invalidateQueries({ queryKey: ["noor-export-jobs"] }); },
    onError: (error: Error) => toast.error(error.message),
  });
  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: JobStatus }) => {
      const value = window.prompt(status === "submitted" ? "أدخل رقم المرجع في نور (اختياري):" : "سبب الإيقاف/الفشل (اختياري):") ?? "";
      const patch = status === "submitted" ? { status, noor_reference: value || null, submitted_at: new Date().toISOString(), last_error: null } : status === "failed" ? { status, last_error: value || "فشل الرفع" } : { status, pause_reason: value || "بانتظار تدخل يدوي" };
      const { error } = await supabase.from("noor_export_jobs").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["noor-export-jobs"] }),
    onError: (error: Error) => toast.error(error.message),
  });
  const allSelected = rows.length > 0 && selected.length === rows.length;
  return (
    <section className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-xl font-black"><UploadCloud className="size-5 text-primary" /> مركز ترحيل أعمال التوجيه إلى نور</h2><p className="mt-1 text-sm text-muted-foreground">الحالات، المقابلات والتواصل، والسلوك والمتابعة في قائمة جاهزة للمطابقة.</p></div><div className="flex gap-2"><Button asChild variant="outline"><a href={NOOR_URL} target="_blank" rel="noreferrer"><ExternalLink className="size-4" /> فتح نور</a></Button><Button onClick={() => prepare.mutate()} disabled={prepare.isPending || !selected.length}>تجهيز المحدد</Button></div></div>
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-6">تعبئة نور تتوقف عند تسجيل الدخول ورمز التحقق. لا يتم تجاوز الحماية؛ بعد الإكمال وثّق رقم المرجع هنا لمنع تكرار الإدخال.</div>
      <div className="flex flex-wrap gap-2"><Button size="sm" variant={allSelected ? "default" : "outline"} onClick={() => setSelected(allSelected ? [] : rows.map((row) => `${row.table}:${row.id}`))}>تحديد كل المصادر ({rows.length})</Button><Button size="sm" variant="ghost" onClick={() => { void sourceQuery.refetch(); void jobsQuery.refetch(); }}><RefreshCw className="size-4" /> تحديث</Button></div>
      <div className="grid gap-2 md:grid-cols-2">{rows.slice(0, 50).map((row) => { const key = `${row.table}:${row.id}`; const job = existing.get(key); return <label key={key} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 text-sm hover:bg-muted/40"><span className="flex min-w-0 items-center gap-2"><input type="checkbox" checked={selected.includes(key)} onChange={(event) => setSelected((value) => event.target.checked ? [...value, key] : value.filter((item) => item !== key))} /><span className="truncate"><b>{row.label}</b><small className="mt-1 block text-muted-foreground">{row.table === "counseling_cases" ? "حالة" : row.table === "interviews" ? "مقابلة/تواصل" : "سلوك"}</small></span></span>{job ? <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${statusClass[job.status]}`}>{statusLabel[job.status]}</span> : <span className="text-xs text-muted-foreground">غير مجهز</span>}</label>; })}</div>
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
      {jobs.length > 0 && <div className="border-t pt-4"><h3 className="mb-3 flex items-center gap-2 font-bold"><FileCheck2 className="size-4" /> سجل عمليات الترحيل</h3><div className="space-y-2">{jobs.slice(0, 30).map((job) => <div key={job.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm"><span className="flex items-center gap-2">{job.status === "submitted" ? <CheckCircle2 className="size-4 text-emerald-600" /> : <PauseCircle className="size-4 text-muted-foreground" />}<span>{String(job.payload["student_name"] || job.payload["title"] || job.payload["observation"] || "سجل توجيهي")}</span></span><span className="flex items-center gap-2"><span className={`rounded-full px-2 py-1 text-[11px] font-bold ${statusClass[job.status]}`}>{statusLabel[job.status]}</span>{job.status !== "submitted" && <Button size="sm" variant="outline" onClick={() => update.mutate({ id: job.id, status: "submitted" })}>توثيق الرفع</Button>}{job.status !== "submitted" && <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: job.id, status: "paused" })}>إيقاف مؤقت</Button>}</span></div>)}</div></div>}
    </section>
  );
}
