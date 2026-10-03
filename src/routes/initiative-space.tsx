import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, FileUp, Pencil, Plus, Save, ShieldCheck, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/initiative-space")({
  validateSearch: (search: Record<string, unknown>): { access?: string } => ({
    access: typeof search["access"] === "string" ? search["access"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "مساحة المبادرة | الذات" },
      { name: "description", content: "مساحة عمل خاصة بالمبادرة عبر رابط وصول مباشر." },
    ],
  }),
  component: PublicInitiativeSpace,
});

type PublicEntry = {
  id: string;
  entry_type: string;
  title: string;
  details?: string | null;
  progress_percent?: number | null;
  student_id?: string | null;
  payload?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  files?: Array<{ id: string; file_name: string; mime_type: string; data_url: string; size_bytes: number }>;
};

type Workspace = {
  valid: boolean;
  initiative?: {
    id: string;
    title: string;
    slogan?: string | null;
    idea?: string | null;
    general_goal?: string | null;
    objectives?: string[];
    mechanism?: string[];
    expected_results?: string[];
    success_indicators?: string | null;
    status?: string;
  };
  school?: { name?: string; education_dept?: string | null; education_office?: string | null };
  member?: { id: string; display_name: string; role_title: string; assigned_tasks?: string[] };
  students?: Array<{ id: string; full_name: string; student_no?: string | null; stage?: string | null; grade?: string | null; classroom?: string | null }>;
  entries?: PublicEntry[];
};

function PublicInitiativeSpace() {
  const qc = useQueryClient();
  const { access = "" } = Route.useSearch();
  const [editingId, setEditingId] = useState("");
  const [entryType, setEntryType] = useState("progress");
  const [entryTitle, setEntryTitle] = useState("");
  const [entryDetails, setEntryDetails] = useState("");
  const [progress, setProgress] = useState("0");
  const [studentId, setStudentId] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const query = useQuery({
    queryKey: ["public-initiative-space", access],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_public_initiative_workspace", { p_token: access.trim() });
      if (error) throw error;
      return (data ?? { valid: false }) as Workspace;
    },
    enabled: Boolean(access.trim()),
    staleTime: 5_000,
  });

  const data = query.data;
  const entries = data?.entries ?? [];
  const students = data?.students ?? [];

  const save = useMutation({
    mutationFn: async () => {
      const { data: id, error } = await (supabase as any).rpc("save_public_initiative_entry", {
        p_token: access.trim(),
        p_entry_id: editingId || null,
        p_entry_type: entryType,
        p_title: entryTitle.trim(),
        p_details: entryDetails.trim() || null,
        p_progress_percent: entryType === "progress" ? Math.max(0, Math.min(100, Number(progress) || 0)) : null,
        p_student_id: studentId || null,
        p_payload: {},
      });
      if (error) throw error;
      const entryId = String(id);
      for (const file of pendingFiles) {
        const dataUrl = await readFileAsDataUrl(file);
        const { error: fileError } = await (supabase as any).rpc("add_public_initiative_file", {
          p_token: access.trim(),
          p_entry_id: entryId,
          p_file_name: file.name,
          p_mime_type: file.type || "application/octet-stream",
          p_data_url: dataUrl,
          p_size_bytes: file.size,
        });
        if (fileError) throw fileError;
      }
    },
    onSuccess: async () => {
      setEditingId("");
      setEntryTitle("");
      setEntryDetails("");
      setProgress("0");
      setStudentId("");
      setPendingFiles([]);
      await qc.invalidateQueries({ queryKey: ["public-initiative-space", access] });
      toast.success("تم حفظ السجل ورفع الشواهد.");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc("delete_public_initiative_entry", { p_token: access.trim(), p_entry_id: id });
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["public-initiative-space", access] });
      toast.success("تم حذف السجل.");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const completion = useMemo(() => {
    const values = entries.map((e) => e.progress_percent).filter((v): v is number => typeof v === "number");
    if (!values.length) return 0;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }, [entries]);

  if (!access.trim()) {
    return <div dir="rtl" className="min-h-screen bg-background p-6"><div className="mx-auto max-w-xl rounded-3xl border p-8 text-center">رابط المبادرة غير مكتمل.</div></div>;
  }

  if (query.isLoading) {
    return <div dir="rtl" className="min-h-screen bg-background p-6"><div className="mx-auto max-w-xl rounded-3xl border p-8 text-center">جارٍ فتح مساحة المبادرة...</div></div>;
  }

  if (query.isError || !data?.valid || !data.initiative || !data.member) {
    return <div dir="rtl" className="min-h-screen bg-background p-6"><div className="mx-auto max-w-xl rounded-3xl border p-8 text-center"><ShieldCheck className="mx-auto size-10 text-muted-foreground" /><h1 className="mt-3 text-xl font-black">الرابط غير صالح أو منتهي</h1><p className="mt-2 text-sm text-muted-foreground">اطلب رابطًا جديدًا من قائد المبادرة.</p></div></div>;
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background px-3 py-5 sm:px-5">
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <header className="rounded-3xl border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid size-14 place-items-center overflow-hidden rounded-2xl border"><BrandLogo className="size-full" /></div>
              <div>
                <p className="text-xs font-black text-primary">الذات | مساحة مبادرة</p>
                <h1 className="mt-1 text-2xl font-black">{data.initiative.title}</h1>
                {data.initiative.slogan && <p className="mt-1 font-bold text-primary">{data.initiative.slogan}</p>}
              </div>
            </div>
            <div className="rounded-2xl bg-primary/10 px-4 py-3 text-center">
              <p className="text-2xl font-black text-primary">{completion}%</p>
              <p className="text-[10px] font-bold text-muted-foreground">متوسط التقدم المسجل</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border p-3"><p className="text-[10px] font-black text-muted-foreground">المدرسة</p><p className="mt-1 text-sm font-black">{data.school?.name || "المدرسة"}</p></div>
            <div className="rounded-2xl border p-3"><p className="text-[10px] font-black text-muted-foreground">المسؤول عن المتابعة</p><p className="mt-1 text-sm font-black">{data.member.display_name}</p></div>
            <div className="rounded-2xl border p-3"><p className="text-[10px] font-black text-muted-foreground">الدور</p><p className="mt-1 text-sm font-black">{data.member.role_title}</p></div>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
          <div className="space-y-5">
            <section className="rounded-3xl border bg-card p-5">
              <h2 className="font-black">المبادرة والأعمال المطلوبة</h2>
              {data.initiative.idea && <p className="mt-3 text-sm leading-7 text-muted-foreground">{data.initiative.idea}</p>}
              <div className="mt-4 space-y-2">
                {(data.member.assigned_tasks ?? []).map((task) => <div key={task} className="rounded-xl border px-3 py-2 text-xs">{task}</div>)}
              </div>
            </section>

            <section className="rounded-3xl border bg-card p-5">
              <h2 className="font-black">الطلاب المسندون لي</h2>
              <div className="mt-3 space-y-2">
                {students.length === 0 ? <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">لا يوجد طلاب مسندون لهذا الرابط.</p> :
                students.map((s) => <div key={s.id} className="rounded-xl border p-3"><p className="text-sm font-black">{s.full_name}</p><p className="mt-1 text-[10px] text-muted-foreground">{[s.stage,s.grade,s.classroom].filter(Boolean).join(" · ")}{s.student_no ? ` · ${s.student_no}` : ""}</p></div>)}
              </div>
            </section>
          </div>

          <div className="space-y-5">
            <section className="rounded-3xl border bg-card p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-2"><Plus className="size-5 text-primary" /><h2 className="font-black">{editingId ? "تعديل السجل" : "إضافة سجل أو متابعة"}</h2></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div><Label>نوع السجل</Label><select className="mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm" value={entryType} onChange={(e) => setEntryType(e.target.value)}><option value="progress">تقدم وإنجاز</option><option value="meeting">لقاء</option><option value="student_followup">متابعة طالب</option><option value="note">ملاحظة</option><option value="evidence">شاهد/توثيق</option></select></div>
                <div><Label>الطالب المرتبط</Label><select className="mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm" value={studentId} onChange={(e) => setStudentId(e.target.value)}><option value="">بدون طالب محدد</option>{students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select></div>
                <div className="sm:col-span-2"><Label>العنوان</Label><Input className="mt-2" value={entryTitle} onChange={(e) => setEntryTitle(e.target.value)} placeholder="مثال: متابعة الأسبوع الثالث" /></div>
                <div className="sm:col-span-2"><Label>التفاصيل</Label><Textarea className="mt-2 min-h-32" value={entryDetails} onChange={(e) => setEntryDetails(e.target.value)} /></div>
                {entryType === "progress" && <div><Label>نسبة الإنجاز</Label><Input className="mt-2" type="number" min="0" max="100" value={progress} onChange={(e) => setProgress(e.target.value)} /></div>}
                <div><Label>رفع شواهد</Label><Input className="mt-2" type="file" multiple accept="image/*,.pdf" onChange={(e) => setPendingFiles(Array.from(e.target.files ?? []))} /></div>
              </div>
              {pendingFiles.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{pendingFiles.map((f) => <span key={f.name} className="rounded-full bg-muted px-2 py-1 text-[10px]">{f.name}</span>)}</div>}
              <div className="mt-4 flex justify-end gap-2">
                {editingId && <Button variant="ghost" onClick={() => { setEditingId(""); setEntryTitle(""); setEntryDetails(""); setStudentId(""); setPendingFiles([]); }}>إلغاء التعديل</Button>}
                <Button disabled={!entryTitle.trim() || save.isPending} onClick={() => save.mutate()}><Save className="size-4" /> حفظ</Button>
              </div>
            </section>

            <section className="rounded-3xl border bg-card p-5">
              <div className="flex items-center gap-2"><ClipboardList className="size-5 text-primary" /><h2 className="font-black">سجل المبادرة</h2></div>
              <div className="mt-4 space-y-2">
                {entries.length === 0 ? <p className="rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground">لا توجد سجلات حتى الآن.</p> :
                entries.map((e) => <article key={e.id} className="rounded-2xl border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="text-sm font-black">{e.title}</p><p className="mt-1 text-[10px] text-muted-foreground">{new Date(e.updated_at).toLocaleString("ar-SA")}</p></div>
                    <div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => { setEditingId(e.id); setEntryType(e.entry_type); setEntryTitle(e.title); setEntryDetails(e.details ?? ""); setProgress(String(e.progress_percent ?? 0)); setStudentId(e.student_id ?? ""); setPendingFiles([]); }}><Pencil className="size-3" /></Button><Button size="sm" variant="outline" onClick={() => remove.mutate(e.id)}><Trash2 className="size-3" /></Button></div>
                  </div>
                  {e.details && <p className="mt-2 text-xs leading-6 text-muted-foreground">{e.details}</p>}
                  {typeof e.progress_percent === "number" && <div className="mt-2 rounded-full bg-muted p-1"><div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(0,Math.min(100,e.progress_percent))}%` }} /></div>}
                  {(e.files ?? []).length > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2">{(e.files ?? []).map((f) => <a key={f.id} href={f.data_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold"><FileUp className="size-4 text-primary" />{f.file_name}</a>)}</div>}
                </article>)}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("تعذر قراءة الملف"));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}
