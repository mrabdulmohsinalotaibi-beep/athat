import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export type SharePdfOptions = {
  element: HTMLElement;
  filename: string;
  title?: string;
};

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
  const scale = Math.min(2, window.devicePixelRatio || 1);
  const previousCaptureFlag = element.dataset["pdfCaptureTarget"];
  element.dataset["pdfCaptureTarget"] = "true";
  let clonedTargetWidth = 0;
  let clonedBreakPoints: number[] = [];

  try {
    const renderOptions: NonNullable<Parameters<typeof html2canvas>[1]> = {
      scale,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      // Force a stable desktop/A4 layout even when export is started on mobile.
      windowWidth: Math.max(1200, element.scrollWidth, element.clientWidth),
      ignoreElements: (node: Element) =>
        node instanceof HTMLElement && node.dataset["pdfExclude"] === "true",
      onclone: (clonedDocument: Document) => {
        const root = clonedDocument.documentElement;
        root.style.setProperty("--background", "#f3f0ea");
        root.style.setProperty("--foreground", "#29241f");
        root.style.setProperty("--card", "#fbf9f5");
        root.style.setProperty("--border", "#cfc4b6");
        root.style.setProperty("--primary", "#8b5736");
        root.style.setProperty("--ring", "#9b623d");
        root.style.setProperty("--paper", "#ffffff");
        root.style.setProperty("--paper-foreground", "#2c2824");
        root.style.setProperty("--paper-muted", "#f1ede7");
        root.style.setProperty("--paper-muted-foreground", "#6e655d");
        root.style.setProperty("--paper-border", "#cfc4b6");
        root.style.setProperty("--letterhead-primary", "#3d3833");
        root.style.setProperty("--letterhead-secondary", "#a6673f");

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
              '.official-letterhead, [data-pdf-block="true"], tr, .final-signatures',
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
            box-shadow: none !important;
            text-shadow: none !important;
          }
          [data-pdf-capture-target="true"] .official-school-logo {
            background-color: rgba(255,255,255,.95) !important;
          }
          [data-pdf-capture-target="true"] .official-document-title {
            background-color: rgba(255,255,255,.10) !important;
            border-color: rgba(255,255,255,.18) !important;
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

              if (prop === "color") node.style.color = "#2c2824";
              else if (prop === "backgroundColor") node.style.backgroundColor = "transparent";
              else if (prop === "fill") node.style.fill = "currentColor";
              else if (prop === "stroke") node.style.stroke = "currentColor";
              else node.style.borderColor = "#cfc4b6";
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
        Math.floor((contentHeight * canvas.width) / contentWidth),
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
          margin,
          contentWidth,
          Math.min(contentHeight, sliceHeightMm),
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
      text: "ملف PDF من منصة الذات",
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
