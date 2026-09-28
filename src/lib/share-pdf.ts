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
  const canvas = await html2canvas(element, {
    scale: Math.min(2, window.devicePixelRatio || 1),
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    windowWidth: element.scrollWidth,
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
  const imageHeight = (canvas.height * imageWidth) / canvas.width;

  let offset = 0;
  let page = 0;

  while (offset < imageHeight) {
    if (page > 0) pdf.addPage();

    const sourceY = Math.floor((offset / imageHeight) * canvas.height);
    const sourceHeight = Math.min(
      canvas.height - sourceY,
      Math.floor((contentHeight / imageHeight) * canvas.height),
    );

    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = sourceHeight;
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

    const pageImageHeight = (sourceHeight * imageWidth) / canvas.width;
    pdf.addImage(pageCanvas.toDataURL("image/jpeg", 0.92), "JPEG", margin, margin, imageWidth, pageImageHeight);
    offset += contentHeight;
    page += 1;
  }

  if (!page) {
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", margin, margin, imageWidth, Math.min(contentHeight, imageHeight));
  }

  const blob = pdf.output("blob");
  const file = new File([blob], safeFilename(filename) + ".pdf", {
    type: "application/pdf",
  });

  return file;
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
