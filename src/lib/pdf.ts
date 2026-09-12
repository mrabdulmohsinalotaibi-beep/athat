import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/** Renders a DOM element into a high-quality multi-page A4 PDF with margins (Arabic-safe, rasterised). */
async function createPdf(element: HTMLElement) {
  const canvas = await html2canvas(element, {
    scale: Math.min(2.25, Math.max(2, window.devicePixelRatio)),
    backgroundColor: "#ffffff",
    useCORS: true,
    windowWidth: element.scrollWidth,
    imageTimeout: 15000,
    onclone: (document) => {
      document.querySelectorAll<HTMLElement>(".print-area").forEach((node) => {
        node.style.background = "#ffffff";
        node.style.boxShadow = "none";
      });
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
    context.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
    const renderedHeight = (sliceHeight * contentWidth) / canvas.width;
    if (pageIndex > 0) pdf.addPage();
    pdf.addImage(pageCanvas.toDataURL("image/jpeg", 0.94), "JPEG", margin, margin, contentWidth, renderedHeight, undefined, "FAST");
    sourceY += sliceHeight;
    pageIndex += 1;
  }
  return pdf;
}

export async function elementToPdf(element: HTMLElement, fileName: string) {
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

export async function elementToPdfFile(element: HTMLElement, fileName: string) {
  const pdf = await createPdf(element);
  return new File([pdf.output("blob")], `${fileName}.pdf`, { type: "application/pdf" });
}
