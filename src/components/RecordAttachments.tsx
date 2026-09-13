import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Film, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ACCEPT = ".jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.webm,.pdf,.doc,.docx,.xls,.xlsx";
const MAX_BYTES = 50 * 1024 * 1024;

function kindOf(mime: string, name: string) {
  const lower = `${mime} ${name}`.toLowerCase();
  if (mime.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/.test(lower)) return "image";
  if (mime.startsWith("video/") || /\.(mp4|mov|webm)$/.test(lower)) return "video";
  return "doc";
}

function typeLabel(kind: string) {
  return kind === "image" ? "صورة" : kind === "video" ? "مقطع فيديو" : "مستند";
}

export function useRecordAttachments(recordId: string | null) {
  return useQuery({
    queryKey: ["record-attachments", recordId],
    enabled: !!recordId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evidences")
        .select("*")
        .eq("linked_ref", recordId ?? "")
        .not("file_path", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      const paths = rows.map((row) => String(row.file_path));
      const signed = paths.length ? (await supabase.storage.from("evidences").createSignedUrls(paths, 3600)).data ?? [] : [];
      return rows.map((row, index) => ({
        id: String(row.id),
        name: String(row.name ?? row.file_name ?? "مرفق"),
        path: String(row.file_path),
        url: signed[index]?.signedUrl ?? "",
        kind: kindOf(String(row.mime_type ?? ""), String(row.file_name ?? "")),
      }));
    },
  });
}

export function RecordAttachmentsDialog({
  open,
  onOpenChange,
  recordId,
  recordTitle,
  linkedType,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  recordId: string | null;
  recordTitle: string;
  linkedType: string;
}) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ url: string; kind: string; name: string } | null>(null);
  const { data: items = [], isLoading } = useRecordAttachments(open ? recordId : null);

  async function upload(file: File) {
    if (!recordId) return;
    if (file.size > MAX_BYTES) {
      toast.error("حجم الملف يتجاوز 50 ميجابايت");
      return;
    }
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("الجلسة منتهية، أعد تسجيل الدخول");
      const safe = file.name.replace(/[^\w.\-\u0600-\u06FF]/g, "_");
      const path = `${uid}/${recordId}/${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage.from("evidences").upload(path, file, {
        ...(file.type ? { contentType: file.type } : {}),
        upsert: false,
      });
      if (upErr) throw upErr;

      const kind = kindOf(file.type, file.name);
      const { error } = await supabase.from("evidences").insert({
        name: file.name,
        etype: typeLabel(kind),
        linked_type: linkedType,
        linked_ref: recordId,
        edate: new Date().toISOString().slice(0, 10),
        doc_status: "قيد المراجعة",
        description: recordTitle || null,
        file_path: path,
        file_name: file.name,
        mime_type: file.type || null,
      } as never);
      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["record-attachments", recordId] });
      queryClient.invalidateQueries({ queryKey: ["evidences"] });
      queryClient.invalidateQueries({ queryKey: ["evidence-files"] });
      toast.success("تم رفع المرفق");
    } catch (error) {
      toast.error(`تعذّر الرفع: ${(error as Error).message}`);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function removeItem(id: string, path: string) {
    if (!confirm("هل تريد حذف هذا المرفق وملفه؟")) return;
    await supabase.storage.from("evidences").remove([path]);
    const { error } = await supabase.from("evidences").delete().eq("id", id);
    if (error) {
      toast.error(`تعذّر الحذف: ${error.message}`);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["record-attachments", recordId] });
    queryClient.invalidateQueries({ queryKey: ["evidence-files"] });
    toast.success("تم حذف المرفق");
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent dir="rtl" className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>مرفقات السجل</DialogTitle>
            <DialogDescription>{recordTitle || "—"} — صور، PDF، مستندات Word/Excel حتى 50 ميجابايت.</DialogDescription>
          </DialogHeader>

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) upload(file);
            }}
          />

          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files?.[0];
              if (file) upload(file);
            }}
            className="rounded-lg border border-dashed bg-muted/30 p-5 text-center"
          >
            {busy ? <Loader2 className="mx-auto size-7 animate-spin text-primary" /> : <Upload className="mx-auto size-7 text-primary" />}
            <p className="mt-2 text-sm font-bold">اسحب الملف هنا أو اختر من جهازك</p>
            <Button type="button" variant="outline" size="sm" className="mt-3" disabled={busy} onClick={() => inputRef.current?.click()}>
              اختيار ملف
            </Button>
          </div>

          {isLoading && <p className="text-sm text-muted-foreground">جارٍ تحميل المرفقات...</p>}
          {!isLoading && items.length === 0 && (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">لا توجد مرفقات لهذا السجل بعد.</p>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            {items.map((item) => (
              <div key={item.id} className="overflow-hidden rounded-xl border bg-card">
                <button
                  type="button"
                  className="flex h-28 w-full items-center justify-center bg-muted/50"
                  onClick={() => setPreview({ url: item.url, kind: item.kind, name: item.name })}
                >
                  {item.kind === "image" && item.url ? (
                    <img src={item.url} alt={item.name} className="h-full w-full object-cover" />
                  ) : item.kind === "video" ? (
                    <Film className="size-8 text-primary" />
                  ) : (
                    <FileText className="size-8 text-primary" />
                  )}
                </button>
                <div className="space-y-1 p-2">
                  <p className="truncate text-xs font-bold">{item.name}</p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="icon" asChild>
                      <a href={item.url} download target="_blank" rel="noreferrer" aria-label="تنزيل المرفق">
                        <Download className="size-4" />
                      </a>
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="حذف المرفق" onClick={() => removeItem(item.id, item.path)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={preview !== null} onOpenChange={(value) => !value && setPreview(null)}>
        <DialogContent dir="rtl" className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{preview?.name}</DialogTitle>
          </DialogHeader>
          {preview?.kind === "image" && <img src={preview.url} alt={preview.name} className="max-h-[70vh] w-full object-contain" />}
          {preview?.kind === "video" && <video src={preview.url} controls className="max-h-[70vh] w-full" />}
          {preview?.kind === "doc" && <iframe title={preview.name} src={preview.url} className="h-[70vh] w-full rounded-lg border" />}
          <DialogFooter>
            <Button asChild>
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
