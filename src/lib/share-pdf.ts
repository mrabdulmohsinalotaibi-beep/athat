import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export type SharePdfOptions = {
  element: HTMLElement;
  filename: string;
  title?: string;
};

function safeFilename(value: string) {
  return value
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "document";
}

/**
 * Generates an A4 PDF from an official document element and shares the
 * actual PDF file through the device share sheet when supported.
 * Falls back to downloading the PDF when file sharing is unavailable.
 */
export async function createPdfFile({ element, filename }: Pick<SharePdfOptions, "element" | "filename">) {
  const scale = Math.min(2, window.devicePixelRatio || 1);
  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    windowWidth: Math.max(element.scrollWidth, element.clientWidth),
    ignoreElements: (node) =>
      node instanceof HTMLElement && node.dataset.pdfExclude === "true",
  });

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;
  const imageWidth = contentWidth;
  const pixelsPerMm = canvas.width / imageWidth;

  const header = element.querySelector<HTMLElement>(".official-letterhead");
  const footer = element.querySelector<HTMLElement>(".final-signatures");
  let headerCanvas: HTMLCanvasElement | null = null;
  let headerHeightMm = 0;
  let headerBottomPx = 0;
  let footerTopPx = Number.POSITIVE_INFINITY;

  if (header) {
    headerCanvas = await html2canvas(header, {
      scale,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: Math.max(element.scrollWidth, element.clientWidth),
      ignoreElements: (node) =>
        node instanceof HTMLElement && node.dataset.pdfExclude === "true",
    });
    headerHeightMm = (headerCanvas.height * imageWidth) / headerCanvas.width;
    const elementRect = element.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();
    headerBottomPx = Math.max(
      0,
      Math.round((headerRect.bottom - elementRect.top) * pixelsPerMm),
    );
  }

  if (footer) {
    const elementRect = element.getBoundingClientRect();
    const footerRect = footer.getBoundingClientRect();
    footerTopPx = Math.max(
      0,
      Math.round((footerRect.top - elementRect.top) * pixelsPerMm),
    );
  }

  let sourceY = 0;
  let page = 0;

  while (sourceY < canvas.height - 1) {
    if (page > 0) pdf.addPage();

    const repeatedHeader = page > 0 && headerCanvas;
    const bodyTopMm = margin + (repeatedHeader ? headerHeightMm : 0);
    const availableMm = contentHeight - (repeatedHeader ? headerHeightMm : 0);
    const availablePx = Math.max(1, Math.floor(availableMm * pixelsPerMm));

    let sourceHeight = Math.min(canvas.height - sourceY, availablePx);

    // Keep the final signature block together and only show it on the last page.
    if (footerTopPx > sourceY && footerTopPx < sourceY + sourceHeight) {
      const beforeFooter = footerTopPx - sourceY;
      if (beforeFooter > pixelsPerMm * 12) {
        sourceHeight = beforeFooter;
      }
    }

    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = Math.max(1, sourceHeight);
    const context = pageCanvas.getContext("2d");
    if (!context) throw new Error("تعذّر تجهيز صفحة PDF.");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    context.drawImage(
      canvas,
      0,
      sourceY,
      canvas.width,
      sourceHeight,
      0,
      0,
      pageCanvas.width,
      sourceHeight,
    );

    if (repeatedHeader && headerCanvas) {
      const headerImageHeight = headerHeightMm;
      pdf.addImage(
        headerCanvas.toDataURL("image/png"),
        "PNG",
        margin,
        margin,
        imageWidth,
        headerImageHeight,
      );
      const bodyImageHeight = (sourceHeight * imageWidth) / canvas.width;
      pdf.addImage(
        pageCanvas.toDataURL("image/jpeg", 0.92),
        "JPEG",
        margin,
        bodyTopMm,
        imageWidth,
        Math.min(availableMm, bodyImageHeight),
      );
    } else {
      const pageImageHeight = (sourceHeight * imageWidth) / canvas.width;
      pdf.addImage(
        pageCanvas.toDataURL("image/jpeg", 0.92),
        "JPEG",
        margin,
        margin,
        imageWidth,
        Math.min(contentHeight, pageImageHeight),
      );
    }

    sourceY += sourceHeight;
    page += 1;
  }

  const blob = pdf.output("blob");
  return new File([blob], safeFilename(filename) + ".pdf", {
    type: "application/pdf",
  });
}
export async function sharePdfFile({ element, filename, title }: SharePdfOptions) {
  const file = await createPdfFile({ element, filename });
  if (typeof navigator !== "undefined" && typeof navigator.share === "function" && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    await navigator.share({ title: title || filename, text: "ملف PDF من منصة الذات", files: [file] });
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
