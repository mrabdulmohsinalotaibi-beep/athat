import { toCanvas } from "html-to-image";
import { jsPDF } from "jspdf";

/** استخراج اسم المستند تلقائياً من داخل العنصر */
function getDocumentTitle(element: HTMLElement, defaultName: string = "مستند"): string {
  const titleElement = element.querySelector<HTMLElement>(
    "[data-pdf-title], h1, h2, .document-title",
  );

  if (titleElement && titleElement.innerText.trim()) {
    return titleElement.innerText.trim().replace(/[/\\?%*:|"<>]/g, "-");
  }

  return defaultName;
}

/** Renders a DOM element into a high-quality multi-page A4 PDF with margins (Arabic-safe, rasterised). */
async function createPdf(element: HTMLElement) {
  const pixelRatio = Math.min(2, Math.max(1.5, window.devicePixelRatio));
  const canvas = await toCanvas(element, {
    backgroundColor: "#ffffff",
    cacheBust: true,
    pixelRatio,
    width: element.scrollWidth,
    height: element.scrollHeight,
    style: {
      background: "#ffffff",
      boxShadow: "none",
    },
  });

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const margin = 9;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;
  const pagePixelHeight = Math.floor((canvas.width * contentHeight) / contentWidth);
  let sourceY = 0;
  let pageIndex = 0;

  while (sourceY < canvas.height) {
    const sliceHeight = Math.min(pagePixelHeight, canvas.height - sourceY);
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeight;
    const context = pageCanvas.getContext("2d");
    if (!context) throw new Error("تعذّر تجهيز صفحة PDF");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    context.drawImage(
      canvas,
      0,
      sourceY,
      canvas.width,
      sliceHeight,
      0,
      0,
      canvas.width,
      sliceHeight,
    );
    const renderedHeight = (sliceHeight * contentWidth) / canvas.width;
    if (pageIndex > 0) pdf.addPage();
    pdf.addImage(
      pageCanvas.toDataURL("image/jpeg", 0.94),
      "JPEG",
      margin,
      margin,
      contentWidth,
      renderedHeight,
      undefined,
      "FAST",
    );
    pdf.setFontSize(8);
    pdf.setTextColor(110, 110, 110);
    pdf.text(`صفحة ${pageIndex + 1}`, pageWidth - margin, pageHeight - 4, { align: "right" });
    sourceY += sliceHeight;
    pageIndex += 1;
  }
  return pdf;
}

/** تحويل العنصر إلى PDF وتنزيله باسم المستند المكتوب داخله */
export async function elementToPdf(
  element: HTMLElement,
  fallbackFileName: string = "تقرير_إرشادي",
) {
  const fileName = getDocumentTitle(element, fallbackFileName);
  const pdf = await createPdf(element);
  const url = URL.createObjectURL(pdf.output("blob"));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${fileName}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** تحويل العنصر إلى ملف File باسم المستند المكتوب داخله */
export async function elementToPdfFile(
  element: HTMLElement,
  fallbackFileName: string = "تقرير_إرشادي",
) {
  const fileName = getDocumentTitle(element, fallbackFileName);
  const pdf = await createPdf(element);
  return new File([pdf.output("blob")], `${fileName}.pdf`, { type: "application/pdf" });
}
