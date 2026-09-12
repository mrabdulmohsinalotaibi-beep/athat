import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/** Renders a DOM element into a high-quality multi-page A4 PDF with margins (Arabic-safe, rasterised). */
async function createPdf(element: HTMLElement) {
  const canvas = await html2canvas(element, {
    scale: Math.min(3, Math.max(2, window.devicePixelRatio * 2)),
    backgroundColor: "#ffffff",
    useCORS: true,
    windowWidth: element.scrollWidth,
  });

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const margin = 8;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;
  const imgHeight = (canvas.height * contentWidth) / canvas.width;
  const image = canvas.toDataURL("image/jpeg", 0.98);

  let remaining = imgHeight;
  let offset = 0;
  pdf.addImage(image, "JPEG", margin, margin, contentWidth, imgHeight, undefined, "FAST");
  remaining -= contentHeight;
  while (remaining > 0) {
    offset += contentHeight;
    pdf.addPage();
    pdf.addImage(image, "JPEG", margin, margin - offset, contentWidth, imgHeight, undefined, "FAST");
    remaining -= contentHeight;
  }
  return pdf;
}

export async function elementToPdf(element: HTMLElement, fileName: string) {
  const pdf = await createPdf(element);
  pdf.save(`${fileName}.pdf`);
}

export async function elementToPdfFile(element: HTMLElement, fileName: string) {
  const pdf = await createPdf(element);
  return new File([pdf.output("blob")], `${fileName}.pdf`, { type: "application/pdf" });
}
