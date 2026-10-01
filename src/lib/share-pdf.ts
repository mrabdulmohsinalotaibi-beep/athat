import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export type SharePdfOptions = {
  element: HTMLElement;
  filename: string;
  title?: string;
};

function isIOSLike() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function openNativeDocumentPrint(element: HTMLElement, title: string) {
  if (typeof window === "undefined") return false;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;

  const stylesheetLinks = Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
  )
    .map((link) => `<link rel="stylesheet" href="${link.href}">`)
    .join("");

  const inlineStyles = Array.from(document.querySelectorAll<HTMLStyleElement>("style"))
    .map((style) => `<style>${style.textContent ?? ""}</style>`)
    .join("");

  const cloned = element.cloneNode(true) as HTMLElement;
  cloned.querySelectorAll('[data-pdf-exclude="true"]').forEach((node) => node.remove());

  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <base href="${window.location.origin}/" />
  <title>${title.replace(/[<>]/g, "")}</title>
  ${stylesheetLinks}
  ${inlineStyles}
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
      color: #2f2f2f !important;
      direction: rtl !important;
      -webkit-text-size-adjust: 100% !important;
      text-size-adjust: 100% !important;
    }
    body {
      width: 190mm !important;
      margin: 0 auto !important;
      font-family: Tahoma, Arial, "Cairo Variable", "Cairo", sans-serif !important;
    }
    .record-pdf-document {
      width: 190mm !important;
      max-width: 190mm !important;
      min-width: 190mm !important;
      min-height: 277mm !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      overflow: visible !important;
      display: block !important;
      direction: rtl !important;
      font-family: Tahoma, Arial, "Cairo Variable", "Cairo", sans-serif !important;
      letter-spacing: 0 !important;
      word-spacing: normal !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .record-pdf-document *,
    .record-pdf-document p,
    .record-pdf-document div,
    .record-pdf-document span,
    .record-pdf-document td,
    .record-pdf-document th {
      letter-spacing: 0 !important;
      word-spacing: normal !important;
      text-shadow: none !important;
      transform: none !important;
    }
    .record-pdf-document p,
    .record-pdf-document li,
    .record-pdf-document dd,
    .record-pdf-document dt,
    .record-pdf-document td,
    .record-pdf-document th {
      direction: rtl !important;
      unicode-bidi: plaintext !important;
      line-height: 1.85 !important;
      word-break: normal !important;
      overflow-wrap: break-word !important;
      white-space: normal !important;
    }
    .record-pdf-document [data-pdf-block="true"] {
      min-height: 0 !important;
      height: auto !important;
      overflow: visible !important;
      break-inside: auto !important;
      page-break-inside: auto !important;
    }
    .record-pdf-document [data-pdf-block="true"] > div,
    .record-pdf-document .whitespace-pre-wrap {
      white-space: pre-wrap !important;
      line-height: 1.9 !important;
    }
    .official-letterhead,
    .final-signatures,
    .official-document-footer,
    tr {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
    .official-document-footer {
      margin-top: 8mm !important;
    }
    .athat-print-toolbar {
      position: sticky;
      top: 0;
      z-index: 2147483647;
      display: flex;
      gap: 8px;
      justify-content: center;
      padding: 10px;
      width: 100%;
      box-sizing: border-box;
      background: rgba(255,255,255,.96);
      border-bottom: 1px solid #d8d2c8;
    }
    .athat-print-toolbar button {
      appearance: none;
      border: 1px solid #07566a;
      border-radius: 10px;
      padding: 9px 14px;
      font: inherit;
      font-weight: 700;
      background: #fff;
      color: #07566a;
    }
    .athat-print-toolbar #athat-print-button {
      background: #07566a;
      color: #fff;
    }
    @media print {
      .athat-print-toolbar, [data-pdf-exclude="true"] { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="athat-print-toolbar" data-pdf-exclude="true">
    <button type="button" id="athat-back-button" aria-label="الرجوع إلى الذات">رجوع إلى الذات | ATHAT</button>
    <button type="button" id="athat-print-button" aria-label="طباعة المستند">طباعة</button>
  </div>
  ${cloned.outerHTML}
  <script>
    (() => {
      const returnToApp = () => {
        try {
          if (window.opener && !window.opener.closed) {
            window.opener.focus();
            window.close();
            setTimeout(() => window.opener && window.opener.focus(), 50);
            return;
          }
        } catch {}
        if (history.length > 1) history.back();
        else location.href = "PLACEHOLDER_ORIGIN".replace("PLACEHOLDER_ORIGIN", window.location.origin);
      };

      document.getElementById("athat-back-button")?.addEventListener("click", returnToApp);
      document.getElementById("athat-print-button")?.addEventListener("click", () => window.print());

      // Safari/iOS can leave this temporary print window in front after the
      // native print sheet is dismissed. Return focus to ATHAT after printing.
      window.addEventListener("afterprint", () => {
        setTimeout(returnToApp, 150);
      });

      (async () => {
        try {
          if (document.fonts && document.fonts.ready) await document.fonts.ready;
          const images = Array.from(document.images);
          await Promise.all(images.map((img) => img.complete ? Promise.resolve() : new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
          })));
        } catch {}
        setTimeout(() => window.print(), 350);
      })();
    })();
  <\/script>
</body>
</html>`);
  printWindow.document.close();
  return true;
}

function safeFilename(value: string) {
  return (
    value
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) || "document"
  );
}

/**
 * Generates an A4 PDF from an official document element.
 *
 * The document is captured once as a single continuous canvas. Short/normal
 * records are fitted onto one A4 page. Long records are sliced sequentially
 * without separately re-rendering the header or footer, which prevents
 * duplicated titles, repeated signatures and nearly-empty trailing pages.
 */
export async function createPdfFile({
  element,
  filename,
}: Pick<SharePdfOptions, "element" | "filename">) {
  // iOS Safari has known canvas text-shaping/page-slicing issues with Arabic.
  // Keep this function for downloadable PDF generation, but the UI uses the
  // native print/PDF path on iPhone/iPad for faithful Arabic pagination.
  const scale = Math.min(2, window.devicePixelRatio || 1);
  const previousCaptureFlag = element.dataset["pdfCaptureTarget"];
  element.dataset["pdfCaptureTarget"] = "true";
  let clonedTargetWidth = 0;
  let clonedBreakPoints: number[] = [];

  try {
    // Arabic glyph shaping can break when capture starts before the webfont has
    // finished loading. Wait explicitly for Cairo and one paint cycle.
    if (typeof document !== "undefined" && "fonts" in document) {
      try {
        await document.fonts.ready;
        await Promise.all([
          document.fonts.load('400 16px "Cairo Variable"'),
          document.fonts.load('600 16px "Cairo Variable"'),
          document.fonts.load('700 16px "Cairo Variable"'),
        ]);
      } catch {
        // The PDF can still fall back to the system Arabic font.
      }
    }
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );

    const renderOptions: NonNullable<Parameters<typeof html2canvas>[1]> = {
      scale: Math.max(2, scale),
      useCORS: true,
      // Keep one rendering path on every device. foreignObjectRendering can
      // compress Arabic line boxes and cause overlapping text in Safari/Android.
      foreignObjectRendering: false,
      backgroundColor: "#ffffff",
      logging: false,
      // Force a stable desktop/A4 layout even when export is started on mobile.
      windowWidth: Math.max(1200, element.scrollWidth, element.clientWidth),
      ignoreElements: (node: Element) =>
        node instanceof HTMLElement && node.dataset["pdfExclude"] === "true",
      onclone: (clonedDocument: Document) => {
        const root = clonedDocument.documentElement;
        root.style.setProperty("--background", "#f7f5f1");
        root.style.setProperty("--foreground", "#2f2f2f");
        root.style.setProperty("--card", "#ffffff");
        root.style.setProperty("--border", "#d8d2c8");
        root.style.setProperty("--primary", "#07566a");
        root.style.setProperty("--ring", "#07566a");
        root.style.setProperty("--paper", "#ffffff");
        root.style.setProperty("--paper-foreground", "#2f2f2f");
        root.style.setProperty("--paper-muted", "#f3efe8");
        root.style.setProperty("--paper-muted-foreground", "#6a6762");
        root.style.setProperty("--paper-border", "#d8d2c8");
        root.style.setProperty("--letterhead-primary", "#07566a");
        root.style.setProperty("--letterhead-secondary", "#c79a5b");

        const target = clonedDocument.querySelector<HTMLElement>(
          '[data-pdf-capture-target="true"]',
        );
        if (target) {
          // 794px ~= A4 width at 96dpi. Keep export independent of device width.
          target.style.width = "794px";
          target.style.maxWidth = "794px";
          target.style.minWidth = "794px";
          target.style.height = "auto";
          target.style.margin = "0";
          target.style.boxShadow = "none";
          target.style.overflow = "visible";

          const targetRect = target.getBoundingClientRect();
          clonedTargetWidth = Math.max(1, targetRect.width);
          const points = new Set<number>();
          target
            .querySelectorAll<HTMLElement>(
              '.official-letterhead, [data-pdf-block="true"], tr, .final-signatures, .official-document-footer',
            )
            .forEach((node) => {
              const rect = node.getBoundingClientRect();
              const bottom = Math.round(rect.bottom - targetRect.top);
              if (bottom > 0) points.add(bottom);
            });
          clonedBreakPoints = [...points].sort((a, b) => a - b);
        }

        const safeStyle = clonedDocument.createElement("style");
        safeStyle.textContent = `
          [data-pdf-capture-target="true"],
          [data-pdf-capture-target="true"] * {
            font-family: Tahoma, Arial, "Cairo Variable", "Cairo", sans-serif !important;
            letter-spacing: 0 !important;
            word-spacing: normal !important;
            font-kerning: normal !important;
            font-synthesis: none !important;
            text-shadow: none !important;
            box-shadow: none !important;
          }
          [data-pdf-capture-target="true"] {
            direction: rtl !important;
            text-rendering: geometricPrecision !important;
          }
          [data-pdf-capture-target="true"] p,
          [data-pdf-capture-target="true"] li,
          [data-pdf-capture-target="true"] td,
          [data-pdf-capture-target="true"] th,
          [data-pdf-capture-target="true"] dd,
          [data-pdf-capture-target="true"] dt {
            direction: rtl !important;
            unicode-bidi: isolate !important;
            letter-spacing: 0 !important;
            word-spacing: normal !important;
            line-height: 1.8 !important;
            word-break: normal !important;
            overflow-wrap: break-word !important;
            white-space: normal !important;
            height: auto !important;
            min-height: 0 !important;
          }
          [data-pdf-capture-target="true"] [data-pdf-block="true"] {
            height: auto !important;
            min-height: 58px !important;
            overflow: visible !important;
            contain: none !important;
          }
          [data-pdf-capture-target="true"] [data-pdf-block="true"] > * {
            position: relative !important;
            line-height: 1.8 !important;
          }
          [data-pdf-capture-target="true"] .whitespace-pre-wrap {
            white-space: pre-line !important;
            line-height: 1.9 !important;
          }
          [data-pdf-capture-target="true"] .official-school-logo {
            background-color: rgba(255,255,255,.95) !important;
          }
          [data-pdf-capture-target="true"] .official-document-title {
            color: #3c3c3c !important;
          }
          [data-pdf-capture-target="true"] .official-document-footer {
            margin-top: auto !important;
          }
        `;
        clonedDocument.head.appendChild(safeStyle);

        clonedDocument
          .querySelectorAll<HTMLElement>(
            '[data-pdf-capture-target="true"], [data-pdf-capture-target="true"] *',
          )
          .forEach((node) => {
            const style = clonedDocument.defaultView?.getComputedStyle(node);
            if (!style) return;

            const colorProps = [
              "color",
              "backgroundColor",
              "borderTopColor",
              "borderRightColor",
              "borderBottomColor",
              "borderLeftColor",
              "outlineColor",
              "textDecorationColor",
              "fill",
              "stroke",
            ] as const;

            for (const prop of colorProps) {
              const value = style[prop];
              if (!value || !/oklab|oklch|color-mix/i.test(value)) continue;

              if (prop === "color") node.style.color = "#2f2f2f";
              else if (prop === "backgroundColor") node.style.backgroundColor = "transparent";
              else if (prop === "fill") node.style.fill = "currentColor";
              else if (prop === "stroke") node.style.stroke = "currentColor";
              else node.style.borderColor = "#d8d2c8";
            }
          });
      },
    };

    const canvas = await html2canvas(element, renderOptions);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 8;
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = pageHeight - margin * 2;
    const pageGuardMm = 5;
    const guardedContentHeight = contentHeight - pageGuardMm * 2;

    const naturalHeightMm = (canvas.height * contentWidth) / canvas.width;
    const fitScale = Math.min(1, contentHeight / Math.max(1, naturalHeightMm));

    // Most official single records should remain one document/page. Allow a
    // modest downscale before paginating to avoid producing a nearly-empty
    // extra page just for the signatures/footer.
    if (fitScale >= 0.82) {
      const imageWidth = contentWidth * fitScale;
      const imageHeight = naturalHeightMm * fitScale;
      const x = (pageWidth - imageWidth) / 2;
      pdf.addImage(
        canvas.toDataURL("image/jpeg", 0.94),
        "JPEG",
        x,
        margin,
        imageWidth,
        imageHeight,
      );
    } else {
      const cloneToCanvasScale =
        canvas.width / Math.max(1, clonedTargetWidth || canvas.width);
      const pageCapacityPx = Math.max(
        1,
        Math.floor((guardedContentHeight * canvas.width) / contentWidth),
      );
      const breakPoints = clonedBreakPoints.map((point) =>
        Math.round(point * cloneToCanvasScale),
      );

      let sourceY = 0;
      let pageIndex = 0;

      while (sourceY < canvas.height - 1) {
        const desiredEnd = Math.min(canvas.height, sourceY + pageCapacityPx);
        let sourceEnd = desiredEnd;

        if (desiredEnd < canvas.height) {
          // Prefer a natural block/row boundary instead of cutting Arabic text,
          // but do not leave more than ~40% of a page unused.
          const minimumUsefulEnd = sourceY + pageCapacityPx * 0.6;
          const candidates = breakPoints.filter(
            (point) => point > minimumUsefulEnd && point <= desiredEnd,
          );
          if (candidates.length) sourceEnd = candidates[candidates.length - 1]!;
        }

        if (sourceEnd <= sourceY + 1) sourceEnd = desiredEnd;
        const sliceHeight = Math.max(1, Math.floor(sourceEnd - sourceY));

        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = sliceHeight;
        const context = slice.getContext("2d");
        if (!context) throw new Error("تعذّر تجهيز صفحة PDF.");

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, slice.width, slice.height);
        context.drawImage(
          canvas,
          0,
          sourceY,
          canvas.width,
          sliceHeight,
          0,
          0,
          slice.width,
          sliceHeight,
        );

        if (pageIndex > 0) pdf.addPage();

        const sliceHeightMm = (sliceHeight * contentWidth) / canvas.width;
        pdf.addImage(
          slice.toDataURL("image/jpeg", 0.94),
          "JPEG",
          margin,
          margin + pageGuardMm,
          contentWidth,
          Math.min(guardedContentHeight, sliceHeightMm),
        );

        sourceY = sourceEnd;
        pageIndex += 1;
      }
    }

    const blob = pdf.output("blob");
    return new File([blob], safeFilename(filename) + ".pdf", {
      type: "application/pdf",
    });
  } finally {
    if (previousCaptureFlag === undefined) delete element.dataset["pdfCaptureTarget"];
    else element.dataset["pdfCaptureTarget"] = previousCaptureFlag;
  }
}

export async function savePdfFile(file: File) {
  // Chromium/desktop: use the native save dialog when available.
  if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
    try {
      const picker = (
        window as Window & {
          showSaveFilePicker?: (options: {
            suggestedName?: string;
            types?: Array<{
              description: string;
              accept: Record<string, string[]>;
            }>;
          }) => Promise<{
            createWritable: () => Promise<{
              write: (data: Blob) => Promise<void>;
              close: () => Promise<void>;
            }>;
          }>;
        }
      ).showSaveFilePicker;

      if (picker) {
        const handle = await picker({
          suggestedName: file.name,
          types: [
            {
              description: "PDF",
              accept: { "application/pdf": [".pdf"] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(file);
        await writable.close();
        return "saved" as const;
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return "cancelled" as const;
      // Continue to mobile/browser fallbacks.
    }
  }

  // iPhone/iPad: the share sheet is the reliable way to save a generated PDF
  // into Files, Books, AirDrop, or another supported destination.
  if (
    isIOSLike() &&
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        title: file.name.replace(/\.pdf$/i, ""),
        files: [file],
      });
      return "shared" as const;
    } catch (error) {
      if ((error as Error).name === "AbortError") return "cancelled" as const;
    }
  }

  downloadPdfFile(file);
  return "downloaded" as const;
}

export async function sharePdfFile({
  element,
  filename,
  title,
}: SharePdfOptions) {
  const file = await createPdfFile({ element, filename });

  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  ) {
    await navigator.share({
      title: title || filename,
      text: "ملف PDF من الذات",
      files: [file],
    });
    return "shared" as const;
  }

  downloadPdfFile(file);
  return "downloaded" as const;
}

export function downloadPdfFile(file: File) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded" as const;
}
