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
  const renderOptions = {
    scale,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    windowWidth: Math.max(element.scrollWidth, element.clientWidth),
    ignoreElements: (node: Element) =>
      node instanceof HTMLElement && node.dataset.pdfExclude === "true",
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
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;
  const pixelsPerMm = canvas.width / contentWidth;

  const elementRect = element.getBoundingClientRect();
  const header = element.querySelector<HTMLElement>(".official-letterhead");
  const footer = element.querySelector<HTMLElement>(".final-signatures");

  let headerCanvas: HTMLCanvasElement | null = null;
  let headerHeightPx = 0;
  let headerHeightMm = 0;
  let headerBottomPx = 0;
  let footerCanvas: HTMLCanvasElement | null = null;
  let footerTopPx = canvas.height;
  let footerHeightPx = 0;
  let footerHeightMm = 0;

  if (header) {
    headerCanvas = await html2canvas(header, renderOptions);
    const headerRect = header.getBoundingClientRect();
    headerBottomPx = Math.max(0, Math.round((headerRect.bottom - elementRect.top) * pixelsPerMm));
    headerHeightPx = headerCanvas.height;
    headerHeightMm = (headerHeightPx * contentWidth) / headerCanvas.width;
  }

  if (footer) {
    footerCanvas = await html2canvas(footer, renderOptions);
    const footerRect = footer.getBoundingClientRect();
    footerTopPx = Math.max(0, Math.round((footerRect.top - elementRect.top) * pixelsPerMm));
    footerHeightPx = footerCanvas.height;
    footerHeightMm = (footerHeightPx * contentWidth) / footerCanvas.width;
  }

  const bodyStartPx = Math.min(headerBottomPx, footerTopPx);
  const bodyEndPx = Math.max(bodyStartPx, footerTopPx);
  const bodyAvailableFirstPx = Math.max(
    1,
    Math.floor((contentHeight - (headerCanvas ? headerHeightMm : 0)) * pixelsPerMm),
  );
  const bodyAvailableLaterPx = Math.max(
    1,
    Math.floor((contentHeight - (headerCanvas ? headerHeightMm : 0) - (footerCanvas ? footerHeightMm : 0)) * pixelsPerMm),
  );

  function addSlice(
    sourceCanvas: HTMLCanvasElement,
    sourceY: number,
    sourceHeight: number,
    targetY: number,
    targetMaxHeightMm: number,
  ) {
    const slice = document.createElement("canvas");
    slice.width = sourceCanvas.width;
    slice.height = Math.max(1, Math.floor(sourceHeight));
    const context = slice.getContext("2d");
    if (!context) throw new Error("تعذّر تجهيز صفحة PDF.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, slice.width, slice.height);
    context.drawImage(
      sourceCanvas,
      0,
      sourceY,
      sourceCanvas.width,
      sourceHeight,
      0,
      0,
      slice.width,
      sourceHeight,
    );
    const heightMm = Math.min(targetMaxHeightMm, (slice.height * contentWidth) / sourceCanvas.width);
    pdf.addImage(
      slice.toDataURL("image/jpeg", 0.92),
      "JPEG",
      margin,
      targetY,
      contentWidth,
      heightMm,
    );
  }

  let page = 0;
  let bodyY = bodyStartPx;

  while (bodyY < bodyEndPx - 1) {
    if (page > 0) pdf.addPage();

    const hasHeader = Boolean(headerCanvas);
    const hasFooter = Boolean(footerCanvas);
    const headerMm = hasHeader ? headerHeightMm : 0;
    const footerMm = hasFooter ? footerHeightMm : 0;
    const isFirstPage = page === 0;
    const isLastBodyPage =
      bodyY + (isFirstPage ? bodyAvailableFirstPx : bodyAvailableLaterPx) >= bodyEndPx;

    if (hasHeader && (isFirstPage || page > 0)) {
      pdf.addImage(
        headerCanvas!.toDataURL("image/png"),
        "PNG",
        margin,
        margin,
        contentWidth,
        headerMm,
      );
    }

    const availablePx = isFirstPage ? bodyAvailableFirstPx : bodyAvailableLaterPx;
    const remainingPx = bodyEndPx - bodyY;
    const sourceHeight = Math.min(remainingPx, availablePx);

    addSlice(
      canvas,
      bodyY,
      sourceHeight,
      margin + headerMm,
      contentHeight - headerMm - (isLastBodyPage && hasFooter ? footerMm : 0),
    );

    bodyY += sourceHeight;

    if (isLastBodyPage && hasFooter) {
      const footerY = pageHeight - margin - footerMm;
      pdf.addImage(
        footerCanvas!.toDataURL("image/png"),
        "PNG",
        margin,
        footerY,
        contentWidth,
        footerMm,
      );
    }

    page += 1;
  }

  if (page === 0) {
    pdf.addPage();
    if (headerCanvas) {
      pdf.addImage(
        headerCanvas.toDataURL("image/png"),
        "PNG",
        margin,
        margin,
        contentWidth,
        headerHeightMm,
      );
    }
    if (footerCanvas) {
      pdf.addImage(
        footerCanvas.toDataURL("image/png"),
        "PNG",
        margin,
        pageHeight - margin - footerHeightMm,
        contentWidth,
        footerHeightMm,
      );
    }
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
