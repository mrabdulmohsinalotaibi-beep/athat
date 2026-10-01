import { useEffect, useState, type RefObject } from "react";
import { Eye, Download, Share2, Loader2, ExternalLink, Save } from "lucide-react";
import { toast } from "sonner";

import { createPdfFile, downloadPdfFile, savePdfFile, openNativeDocumentPrint } from "@/lib/share-pdf";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PdfPreviewButtonProps = {
  elementRef: RefObject<HTMLElement | null>;
  filename: string;
  title: string;
  disabled?: boolean;
};

export function PdfPreviewButton({
  elementRef,
  filename,
  title,
  disabled = false,
}: PdfPreviewButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  async function openPreview() {
    if (!elementRef.current || loading) return;

    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const iosLike =
      /iPad|iPhone|iPod/i.test(ua) ||
      (typeof navigator !== "undefined" &&
        navigator.platform === "MacIntel" &&
        navigator.maxTouchPoints > 1);

    if (iosLike) {
      const opened = openNativeDocumentPrint(elementRef.current, title);
      if (!opened) {
        toast.info("اسمح بفتح النافذة لعرض المستند وطباعته أو حفظه PDF.");
      }
      return;
    }

    setLoading(true);
    try {
      const nextFile = await createPdfFile({ element: elementRef.current, filename });
      if (url) URL.revokeObjectURL(url);
      setFile(nextFile);
      setUrl(URL.createObjectURL(nextFile));
      setOpen(true);
    } catch (error) {
      toast.error((error as Error).message || "تعذّرت تجهيز المعاينة.");
    } finally {
      setLoading(false);
    }
  }

  async function downloadDirect() {
    if (!elementRef.current || loading) return;

    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const iosLike =
      /iPad|iPhone|iPod/i.test(ua) ||
      (typeof navigator !== "undefined" &&
        navigator.platform === "MacIntel" &&
        navigator.maxTouchPoints > 1);

    if (iosLike) {
      const opened = openNativeDocumentPrint(elementRef.current, title);
      if (!opened) {
        toast.info("اسمح بفتح النافذة، ثم اختر مشاركة/حفظ PDF من معاينة الطباعة.");
      }
      return;
    }

    if (file) {
      const result = await savePdfFile(file);
      if (result !== "cancelled") toast.success("تم تجهيز ملف PDF للحفظ.");
      return;
    }

    setLoading(true);
    try {
      const nextFile = await createPdfFile({ element: elementRef.current, filename });
      const result = await savePdfFile(nextFile);
      if (result !== "cancelled") toast.success("تم تجهيز ملف PDF للحفظ.");
    } catch (error) {
      toast.error((error as Error).message || "تعذّر تنزيل ملف PDF.");
    } finally {
      setLoading(false);
    }
  }

  async function share() {
    if (!file) return;
    try {
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({ title, text: "ملف PDF من منصة الذات", files: [file] });
      } else {
        downloadPdfFile(file);
        toast.success("تم تنزيل ملف PDF؛ يمكنك مشاركته من جهازك.");
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        toast.error((error as Error).message || "تعذّرت مشاركة الملف.");
      }
    }
  }

  function openFullPreview() {
    if (!url) return;
    const nextWindow = window.open(url, "_blank", "noopener,noreferrer");
    if (!nextWindow) {
      toast.info("اسمح بفتح النوافذ المنبثقة لعرض المستند في صفحة مستقلة.");
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => void openPreview()} disabled={disabled || loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
          {loading ? "جارٍ تجهيز المعاينة..." : "معاينة المستند"}
        </Button>
        <Button type="button" variant="outline" onClick={() => void downloadDirect()} disabled={disabled || loading}>
          <Download className="size-4" />
          تنزيل PDF
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="flex h-[94vh] w-[96vw] max-w-6xl flex-col overflow-hidden p-3 sm:p-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="size-5" />
              معاينة {title}
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-hidden rounded-xl border bg-muted/30">
            {url ? (
              <object
                data={url}
                type="application/pdf"
                aria-label={title}
                className="block h-full min-h-0 w-full border-0 bg-white"
              >
                <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    لا يدعم هذا المتصفح عرض PDF داخل النافذة.
                  </p>
                  <Button type="button" onClick={openFullPreview}>
                    <ExternalLink className="size-4" />
                    فتح المستند
                  </Button>
                </div>
              </object>
            ) : (
              <div className="flex h-full min-h-[70vh] items-center justify-center text-sm text-muted-foreground">
                جارٍ تجهيز المعاينة...
              </div>
            )}
          </div>
          <DialogFooter className="shrink-0 flex-wrap gap-2 border-t bg-background pt-3">
            <Button type="button" variant="outline" onClick={openFullPreview} disabled={!url}>
              <ExternalLink className="size-4" /> فتح كامل
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => file && void savePdfFile(file)}
              disabled={!file}
            >
              <Save className="size-4" /> حفظ PDF
            </Button>
            <Button type="button" onClick={() => void share()} disabled={!file}>
              <Share2 className="size-4" /> مشاركة PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
