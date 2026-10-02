import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, FileText, Film, ImageIcon, Loader2, RotateCcw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { displayRecordValue } from "@/lib/display";
import { formatHijriDate } from "@/lib/date";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ACCEPT = ".jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.webm,.pdf,.doc,.docx,.xls,.xlsx";
const MAX_BYTES = 50 * 1024 * 1024;

function kindOf(mime: string, name: string) {
  const lower = `${mime} ${name}`.toLowerCase();
  if (mime.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/.test(lower)) return "image";
  if (mime.startsWith("video/") || /\.(mp4|mov|webm)$/.test(lower)) return "video";
  return "doc";
}

function fileSizeLabel(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميجابايت`;
}

function typeLabel(kind: string) {
  return kind === "image" ? "صورة" : kind === "video" ? "مقطع فيديو" : "مستند";
}

function mimeForFile(file: File) {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif",
    mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm",
    pdf: "application/pdf", doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  return map[ext ?? ""] ?? "";
}

export function EvidenceUploadDialog({
  open,
  onOpenChange,
  defaultLinkedType = "برنامج",
  defaultLinkedRef = "",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultLinkedType?: string;
  defaultLinkedRef?: string;
}) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [linkedRef, setLinkedRef] = useState(defaultLinkedRef);
  const [linkedType, setLinkedType] = useState(defaultLinkedType);
  const [edate, setEdate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const previewUrl = useMemo(
    () => (file && kindOf(file.type, file.name) === "image" ? URL.createObjectURL(file) : ""),
    [file],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const { data: programs = [] } = useQuery({
    queryKey: ["programs-options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("programs").select("id, name, program_no");
      if (error) throw error;
      return data ?? [];
    },
  });

  function reset() {
    setFile(null);
    setName("");
    setLinkedRef(defaultLinkedRef);
    setDescription("");
  }

  async function upload() {
    if (!file) {
      toast.error("اختر ملف الشاهد أولاً");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("حجم الملف يتجاوز 50 ميجابايت");
      return;
    }
    const contentType = mimeForFile(file);
    if (!contentType) {
      toast.error("نوع الملف غير مدعوم. اختر صورة أو فيديو أو PDF أو Word أو Excel.");
      return;
    }
    setBusy(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      let uid = sessionData.session?.user.id ?? "";
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (!authError && auth.user) uid = auth.user.id;
      } catch {
        // Continue with the locally persisted session on transient auth failures.
      }
      if (!uid) throw new Error("الجلسة منتهية، أعد تسجيل الدخول");
      const safe = file.name.replace(/[^\w.\-\u0600-\u06FF]/g, "_");
      const path = `${uid}/${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage.from("evidences").upload(path, file, {
        contentType,
        upsert: false,
      });
      if (upErr) throw upErr;

      const kind = kindOf(file.type, file.name);
      const { error } = await supabase.from("evidences").insert({
        name: name.trim() || file.name,
        etype: typeLabel(kind),
        linked_type: linkedType,
        linked_ref: linkedRef || null,
        edate,
        doc_status: "قيد المراجعة",
        description: description || null,
        file_path: path,
        file_name: file.name,
        mime_type: contentType,
      } as never);
      if (error) {
        await supabase.storage.from("evidences").remove([path]);
        throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["evidences"] });
      queryClient.invalidateQueries({ queryKey: ["evidence-files"] });
      toast.success("تم رفع الشاهد وتوثيقه");
      reset();
      onOpenChange(false);
    } catch (error) {
      const message = (error as Error).message;
      toast.error(`تعذّر رفع الشاهد: ${message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[96dvh] w-[calc(100vw-1rem)] max-w-[46rem] overflow-y-auto rounded-[1.75rem] p-4 xl:max-w-3xl">
        <DialogHeader>
          <DialogTitle>رفع شاهد جديد</DialogTitle>
          <DialogDescription>صور (JPG/PNG) · مقاطع فيديو (MP4) · مستندات (PDF/Word/Excel) — حتى 50 ميجابايت.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="mb-1.5 block text-xs">ملف الشاهد</Label>
            <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => {
              const chosen = e.target.files?.[0] ?? null;
              if (chosen && chosen.size > MAX_BYTES) { toast.error("حجم الملف يتجاوز 50 ميجابايت"); e.target.value = ""; return; }
              setFile(chosen); if (chosen && !name) setName(chosen.name);
            }} />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => {
              const chosen = e.target.files?.[0] ?? null;
              if (chosen && chosen.size > MAX_BYTES) { toast.error("حجم الملف يتجاوز 50 ميجابايت"); e.target.value = ""; return; }
              setFile(chosen); if (chosen && !name) setName(chosen.name);
            }} />
            <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const chosen=e.dataTransfer.files?.[0]; if (!chosen) return; if (chosen.size > MAX_BYTES) { toast.error("حجم الملف يتجاوز 50 ميجابايت"); return; } setFile(chosen); if (!name) setName(chosen.name); }} className="rounded-3xl border border-dashed border-[#89AA74]/40 bg-[#E4ECDF]/55 p-6 text-center shadow-inner">
              {previewUrl ? <img src={previewUrl} alt="معاينة الشاهد" className="mx-auto mb-3 max-h-[55vh] min-h-64 w-full rounded-xl border bg-black/5 object-contain" /> : <Upload className="mx-auto size-7 text-primary" />}
              <p className="mt-2 break-all text-sm font-bold">{file?.name || "اسحب الملف هنا"}</p>
              {file && <p className="mt-1 text-xs font-semibold text-primary">{typeLabel(kindOf(file.type, file.name))} · {fileSizeLabel(file.size)}</p>}
              <p className="mt-1 text-xs text-muted-foreground">صور، فيديو، PDF، Word أو Excel — حتى 50 ميجابايت</p>
              <div className="mt-4 grid grid-cols-2 gap-2"><Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>اختيار ملف</Button><Button type="button" variant="outline" size="sm" onClick={() => cameraRef.current?.click()}>التقاط صورة</Button></div>
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">اسم الشاهد</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: صور تنفيذ برنامج رفق" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-xs">مرتبط بنوع</Label>
              <select
                value={linkedType}
                onChange={(e) => setLinkedType(e.target.value)}
                className="h-11 w-full rounded-xl border border-[#D9C0A3]/45 bg-[#FFFDF9] px-3 text-sm"
              >
                {["برنامج", "حالة", "مقابلة", "اجتماع", "مهمة"].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">تاريخ الشاهد</Label>
              <div className="relative">
                <Input type="date" value={edate} onChange={(e) => setEdate(e.target.value)} className="text-transparent caret-transparent" aria-label="تاريخ الشاهد" />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-foreground">{formatHijriDate(edate)}</span>
              </div>
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">
              {linkedType === "برنامج" ? "البرنامج/النشاط المرتبط" : "رقم السجل المرتبط"}
            </Label>
            {linkedType === "برنامج" ? (
              <select
                value={linkedRef}
                onChange={(e) => setLinkedRef(e.target.value)}
                className="h-11 w-full rounded-xl border border-[#D9C0A3]/45 bg-[#FFFDF9] px-3 text-sm"
              >
                <option value="">— اختر البرنامج —</option>
                {programs.map((p) => (
                  <option key={String(p.id)} value={String(p.id)}>
                    {String(p.name ?? "")}{p.program_no ? ` — ${String(p.program_no)}` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <Input value={linkedRef} onChange={(e) => setLinkedRef(e.target.value)} />
            )}
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">وصف الشاهد</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={upload} disabled={busy || !file}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} {busy ? "جارٍ الرفع..." : "رفع الشاهد"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EvidenceGallery() {
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<{ url: string; kind: string; name: string; id?: string; status?: string; notes?: string | null } | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const {
    data: items = [],
    isLoading,
    isError,
    error: evidenceError,
    refetch: refetchEvidence,
  } = useQuery({
    queryKey: ["evidence-files"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evidences")
        .select("*")
        .not("file_path", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      const paths = rows.map((r) => String(r.file_path));
      let signed: Array<{ signedUrl?: string | null }> = [];
      if (paths.length) {
        const signedResult = await supabase.storage.from("evidences").createSignedUrls(paths, 3600);
        if (signedResult.error) throw signedResult.error;
        signed = signedResult.data ?? [];
      }
      return rows.map((r, i) => ({
        ...r,
        url: signed[i]?.signedUrl ?? "",
        kind: kindOf(String(r.mime_type ?? ""), String(r.file_name ?? "")),
      }));
    },
  });

  async function removeItem(id: string, path: string) {
    if (!confirm("هل تريد حذف هذا الشاهد وملفه؟")) return;
    const { error } = await supabase.from("evidences").delete().eq("id", id);
    if (error) { toast.error(`تعذّر حذف سجل الشاهد: ${error.message}`); return; }
    const { error: storageError } = await supabase.storage.from("evidences").remove([path]);
    if (storageError) {
      console.warn("[evidences] تعذّر تنظيف الملف بعد حذف السجل:", storageError.message);
      toast.warning("تم حذف الشاهد من السجل، وتعذّر تنظيف الملف من التخزين.");
    }
    queryClient.invalidateQueries({ queryKey: ["evidence-files"] });
    queryClient.invalidateQueries({ queryKey: ["evidences"] });
    if (!storageError) toast.success("تم حذف الشاهد");
  }

  async function reviewEvidence(
    id: string,
    nextStatus: "معتمد" | "ناقص",
    currentNotes?: string | null,
  ) {
    let reviewNote = "";
    if (nextStatus === "معتمد") {
      if (!window.confirm("هل تعتمد هذا الشاهد؟ سيصبح معتمدًا للتوثيق، ولن يعتمد التقرير تلقائيًا.")) return;
    } else {
      reviewNote = window.prompt("اكتب ملاحظة الإعادة للتعديل:")?.trim() ?? "";
      if (!reviewNote) {
        toast.info("اكتب ملاحظة واضحة قبل إعادة الشاهد للتعديل.");
        return;
      }
    }

    setReviewingId(id);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("انتهت جلسة الدخول. سجّل الدخول مرة أخرى.");

      const { data: settings } = await supabase
        .from("school_settings")
        .select("counselor_name")
        .limit(1)
        .maybeSingle();

      const reviewer = String(
        settings?.counselor_name || authData.user.email || "المستخدم الحالي",
      );
      const previousNotes = String(currentNotes ?? "").trim();
      const reviewEntry = reviewNote
        ? `ملاحظة مراجعة (${new Date().toLocaleDateString("ar-SA")}): ${reviewNote}`
        : "";
      const nextNotes = reviewEntry
        ? [previousNotes, reviewEntry].filter(Boolean).join("\n")
        : previousNotes;

      const patch =
        nextStatus === "معتمد"
          ? { doc_status: "معتمد", reviewed_by: reviewer }
          : { doc_status: "ناقص", reviewed_by: reviewer, notes: nextNotes };

      const { error } = await supabase
        .from("evidences")
        .update(patch as never)
        .eq("id", id);
      if (error) throw error;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["evidence-files"] }),
        queryClient.invalidateQueries({ queryKey: ["evidences"] }),
        queryClient.invalidateQueries({ queryKey: ["execution-flow"] }),
        queryClient.invalidateQueries({ queryKey: ["plan-execution-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-live-v2"] }),
      ]);
      toast.success(
        nextStatus === "معتمد"
          ? "تم اعتماد الشاهد. التقرير ما زال يحتاج اعتمادك بشكل مستقل."
          : "أُعيد الشاهد للتعديل مع حفظ ملاحظة المراجعة.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّرت مراجعة الشاهد.");
    } finally {
      setReviewingId(null);
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">جارٍ تحميل الشواهد...</p>;
  if (isError)
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-center text-sm">
        <p className="font-bold text-destructive">تعذّر تحميل ملفات الشواهد</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {evidenceError instanceof Error ? evidenceError.message : "حدث خطأ أثناء تجهيز روابط الملفات."}
        </p>
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void refetchEvidence()}>
          إعادة المحاولة
        </Button>
      </div>
    );
  if (!items.length)
    return (
      <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        لا توجد ملفات شواهد مرفوعة بعد.
      </p>
    );

  return (
    <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {items.map((it) => (
          <div key={String(it.id)} className="overflow-hidden rounded-2xl border border-[#D9C0A3]/35 bg-[#FFFDF9] shadow-[var(--shadow-card)]">
            <button
              type="button"
              className="flex h-36 w-full items-center justify-center bg-[#F3F5F2]"
              onClick={() => setPreview({ url: it.url, kind: it.kind, name: String(it.name ?? ""), id: String(it.id), status: String(it.doc_status ?? "قيد المراجعة"), notes: it.notes })}
            >
              {it.kind === "image" && it.url ? (
                <img src={it.url} alt={String(it.name ?? "شاهد")} className="h-full w-full object-cover" />
              ) : it.kind === "video" ? (
                <Film className="size-10 text-primary" />
              ) : (
                <FileText className="size-10 text-primary" />
              )}
            </button>
            <div className="space-y-1.5 p-3">
              <p className="truncate text-sm font-bold">{String(it.name ?? "—")}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {String(it.linked_type ?? "")} {it.linked_ref ? `· ${displayRecordValue(it.linked_ref)}` : ""} ·{" "}
                {it.edate ? formatHijriDate(String(it.edate)) : "—"}
              </p>
              <div className="flex flex-wrap items-center gap-1 pt-1">
                <span
                  className={
                    "rounded-full px-2 py-1 text-[9px] font-black " +
                    (it.doc_status === "معتمد"
                      ? "bg-emerald-500/10 text-emerald-700"
                      : it.doc_status === "ناقص"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-amber-500/10 text-amber-700")
                  }
                >
                  {String(it.doc_status || "قيد المراجعة")}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 px-2 text-[10px]"
                  onClick={() => setPreview({ url: it.url, kind: it.kind, name: String(it.name ?? ""), id: String(it.id), status: String(it.doc_status ?? "قيد المراجعة"), notes: it.notes })}
                >
                  <ImageIcon className="size-3.5" />
                  مراجعة الشاهد
                </Button>
              </div>
              {it.doc_status === "ناقص" && it.notes && (
                <p className="line-clamp-2 text-[10px] leading-5 text-destructive">
                  {String(it.notes).split("\n").at(-1)}
                </p>
              )}
              <div className="flex gap-1 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreview({ url: it.url, kind: it.kind, name: String(it.name ?? ""), id: String(it.id), status: String(it.doc_status ?? "قيد المراجعة"), notes: it.notes })}
                >
                  <ImageIcon className="size-4" /> معاينة
                </Button>
                <Button variant="outline" size="icon" asChild>
                  <a href={it.url} download target="_blank" rel="noreferrer">
                    <Download className="size-4" />
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(String(it.id), String(it.file_path))}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={preview !== null} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent dir="rtl" className="max-h-[96vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{preview?.name}</DialogTitle>
          </DialogHeader>
          {preview?.kind === "image" && <img src={preview.url} alt={preview.name} className="max-h-[70vh] w-full object-contain" />}
          {preview?.kind === "video" && <video src={preview.url} controls className="max-h-[70vh] w-full" />}
          {preview?.kind === "doc" && (
            <iframe title={preview.name} src={preview.url} className="h-[70vh] w-full rounded-lg border" />
          )}
          <DialogFooter className="flex-wrap gap-2">
            {preview?.id && preview.status !== "معتمد" && (
              <Button
                type="button"
                disabled={reviewingId === preview.id}
                onClick={async () => {
                  await reviewEvidence(preview.id!, "معتمد", preview.notes);
                  setPreview(null);
                }}
              >
                {reviewingId === preview.id ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                اعتماد هذا الشاهد
              </Button>
            )}
            {preview?.id && preview.status !== "ناقص" && (
              <Button
                type="button"
                variant="outline"
                disabled={reviewingId === preview.id}
                onClick={async () => {
                  await reviewEvidence(preview.id!, "ناقص", preview.notes);
                  setPreview(null);
                }}
              >
                <RotateCcw className="size-4" /> إعادة للتعديل
              </Button>
            )}
            <Button variant="outline" asChild>
              <a href={preview?.url} target="_blank" rel="noreferrer">
                <ImageIcon className="size-4" /> فتح بالحجم الكامل
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={preview?.url} download target="_blank" rel="noreferrer">
                <Download className="size-4" /> تنزيل
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
