import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Film, ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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

function kindOf(mime: string, name: string) {
  const lower = `${mime} ${name}`.toLowerCase();
  if (mime.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/.test(lower)) return "image";
  if (mime.startsWith("video/") || /\.(mp4|mov|webm)$/.test(lower)) return "video";
  return "doc";
}

function typeLabel(kind: string) {
  return kind === "image" ? "صورة" : kind === "video" ? "مقطع فيديو" : "مستند";
}

export function EvidenceUploadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [linkedRef, setLinkedRef] = useState("");
  const [linkedType, setLinkedType] = useState("برنامج");
  const [edate, setEdate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

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
    setLinkedRef("");
    setDescription("");
  }

  async function upload() {
    if (!file) return toast.error("اختر ملف الشاهد أولاً");
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("الجلسة منتهية، أعد تسجيل الدخول");
      const safe = file.name.replace(/[^\w.\-\u0600-\u06FF]/g, "_");
      const path = `${uid}/${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage.from("evidences").upload(path, file, {
        contentType: file.type || undefined,
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
        mime_type: file.type || null,
      } as never);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["evidences"] });
      queryClient.invalidateQueries({ queryKey: ["evidence-files"] });
      toast.success("تم رفع الشاهد وتوثيقه");
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(`تعذّر رفع الشاهد: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>رفع شاهد جديد</DialogTitle>
          <DialogDescription>صور (JPG/PNG) · مقاطع فيديو (MP4) · مستندات (PDF/Word/Excel) — حتى 50 ميجابايت.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="mb-1.5 block text-xs">ملف الشاهد</Label>
            <Input type="file" accept={ACCEPT} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
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
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {["برنامج", "حالة", "مقابلة", "اجتماع", "مهمة"].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">تاريخ الشاهد</Label>
              <Input type="date" value={edate} onChange={(e) => setEdate(e.target.value)} />
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
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">— اختر البرنامج —</option>
                {programs.map((p) => (
                  <option key={String(p.id)} value={String(p.name ?? "")}>
                    {String(p.name ?? "")}
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
          <Button onClick={upload} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} رفع الشاهد
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EvidenceGallery() {
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<{ url: string; kind: string; name: string } | null>(null);

  const { data: items = [], isLoading } = useQuery({
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
      const signed = paths.length
        ? (await supabase.storage.from("evidences").createSignedUrls(paths, 3600)).data ?? []
        : [];
      return rows.map((r, i) => ({
        ...r,
        url: signed[i]?.signedUrl ?? "",
        kind: kindOf(String(r.mime_type ?? ""), String(r.file_name ?? "")),
      }));
    },
  });

  async function removeItem(id: string, path: string) {
    if (!confirm("هل تريد حذف هذا الشاهد وملفه؟")) return;
    await supabase.storage.from("evidences").remove([path]);
    await supabase.from("evidences").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["evidence-files"] });
    queryClient.invalidateQueries({ queryKey: ["evidences"] });
    toast.success("تم حذف الشاهد");
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">جارٍ تحميل الشواهد...</p>;
  if (!items.length)
    return (
      <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        لا توجد ملفات شواهد مرفوعة بعد.
      </p>
    );

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => (
          <div key={String(it.id)} className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <button
              type="button"
              className="flex h-32 w-full items-center justify-center bg-muted/50"
              onClick={() => setPreview({ url: it.url, kind: it.kind, name: String(it.name ?? "") })}
            >
              {it.kind === "image" && it.url ? (
                <img src={it.url} alt={String(it.name ?? "شاهد")} className="h-full w-full object-cover" />
              ) : it.kind === "video" ? (
                <Film className="size-10 text-primary" />
              ) : (
                <FileText className="size-10 text-primary" />
              )}
            </button>
            <div className="space-y-1 p-3">
              <p className="truncate text-sm font-bold">{String(it.name ?? "—")}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {String(it.linked_type ?? "")} {it.linked_ref ? `· ${String(it.linked_ref)}` : ""} ·{" "}
                {String(it.edate ?? "")}
              </p>
              <div className="flex gap-1 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreview({ url: it.url, kind: it.kind, name: String(it.name ?? "") })}
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
        <DialogContent dir="rtl" className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{preview?.name}</DialogTitle>
          </DialogHeader>
          {preview?.kind === "image" && <img src={preview.url} alt={preview.name} className="max-h-[70vh] w-full object-contain" />}
          {preview?.kind === "video" && <video src={preview.url} controls className="max-h-[70vh] w-full" />}
          {preview?.kind === "doc" && (
            <iframe title={preview.name} src={preview.url} className="h-[70vh] w-full rounded-lg border" />
          )}
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
