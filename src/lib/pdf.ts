import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/** Renders a DOM element into a multi-page A4 PDF (works with Arabic text since it rasterises). */
export async function elementToPdf(element: HTMLElement, fileName: string) {
  const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgHeight = (canvas.height * pageWidth) / canvas.width;
  const image = canvas.toDataURL("image/jpeg", 0.95);

  let remaining = imgHeight;
  let position = 0;
  pdf.addImage(image, "JPEG", 0, position, pageWidth, imgHeight);
  remaining -= pageHeight;
  while (remaining > 0) {
    position -= pageHeight;
    pdf.addPage();
    pdf.addImage(image, "JPEG", 0, position, pageWidth, imgHeight);
    remaining -= pageHeight;
  }
  pdf.save(`${fileName}.pdf`);
}
