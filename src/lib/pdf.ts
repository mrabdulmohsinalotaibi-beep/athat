import { toCanvas } from "html-to-image";
import { jsPDF } from "jspdf";

const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const PAGE_MARGIN_MM = 12;
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - PAGE_MARGIN_MM * 2;
const CONTENT_HEIGHT_MM = PAGE_HEIGHT_MM - PAGE_MARGIN_MM * 2;

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

type PageZone = { top: number; bottom: number; height: number };

function copyFormValues(source: HTMLElement, target: HTMLElement) {
  const sourceControls = Array.from(
    source.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      "input, textarea, select",
    ),
  );
  const targetControls = Array.from(
    target.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      "input, textarea, select",
    ),
  );

  sourceControls.forEach((sourceControl, index) => {
    const targetControl = targetControls[index];
    if (!targetControl) return;

    if (sourceControl instanceof HTMLInputElement && targetControl instanceof HTMLInputElement) {
      targetControl.value = sourceControl.value;
      targetControl.setAttribute("value", sourceControl.value);
      targetControl.checked = sourceControl.checked;
      targetControl.toggleAttribute("checked", sourceControl.checked);
    } else if (
      sourceControl instanceof HTMLTextAreaElement &&
      targetControl instanceof HTMLTextAreaElement
    ) {
      targetControl.value = sourceControl.value;
      targetControl.textContent = sourceControl.value;
    } else if (
      sourceControl instanceof HTMLSelectElement &&
      targetControl instanceof HTMLSelectElement
    ) {
      targetControl.value = sourceControl.value;
      Array.from(targetControl.options).forEach((option) => {
        option.toggleAttribute("selected", option.value === sourceControl.value);
      });
    }
  });
}

async function waitForDocumentAssets(root: HTMLElement) {
  await document.fonts?.ready;
  await Promise.all(
    Array.from(root.querySelectorAll("img")).map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }

          const finish = () => resolve();
          image.addEventListener("load", finish, { once: true });
          image.addEventListener("error", finish, { once: true });
          window.setTimeout(finish, 5_000);
        }),
    ),
  );
}

function getPageMarkers(root: HTMLElement, canvas: HTMLCanvasElement, pagePixelHeight: number) {
  const rootTop = root.getBoundingClientRect().top;
  const scale = canvas.width / Math.max(root.getBoundingClientRect().width, 1);
  const candidates = root.querySelectorAll<HTMLElement>(
    [
      "[data-pdf-keep-together]",
      ".break-inside-avoid",
      ".report-summary",
      ".report-signatures",
      ".official-letterhead",
      "thead",
      "tfoot",
      "tr",
      "h1",
      "h2",
      "h3",
      "h4",
      "p",
      "li",
      "figure",
      "img",
      ".break-before-page",
      "[data-pdf-break-before]",
    ].join(","),
  );
  const keepTogether: PageZone[] = [];
  const breakBefore: number[] = [];

  candidates.forEach((element) => {
    const rect = element.getBoundingClientRect();
    const top = (rect.top - rootTop) * scale;
    const bottom = (rect.bottom - rootTop) * scale;
    const height = bottom - top;
    if (height <= 1) return;

    if (element.matches(".break-before-page, [data-pdf-break-before]")) {
      breakBefore.push(top);
      return;
    }

    const tag = element.tagName;
    const structuralKeep =
      ["THEAD", "TFOOT", "TR", "IMG", "FIGURE"].includes(tag) ||
      /^H[1-4]$/.test(tag) ||
      tag === "P" ||
      tag === "LI";
    const cssKeep = getComputedStyle(element).breakInside === "avoid";
    const explicitKeep = element.hasAttribute("data-pdf-keep-together");

    if (
      (structuralKeep || cssKeep || explicitKeep) &&
      height < pagePixelHeight * 0.9
    ) {
      keepTogether.push({ top, bottom, height });
    }
  });

  return { keepTogether, breakBefore };
}

function choosePageEnd(
  start: number,
  pagePixelHeight: number,
  canvasHeight: number,
  markers: { keepTogether: PageZone[]; breakBefore: number[] },
) {
  const target = Math.min(start + pagePixelHeight, canvasHeight);
  if (target >= canvasHeight) return canvasHeight;

  const minimumPageFill = start + pagePixelHeight * 0.45;
  const explicitBreak = markers.breakBefore
    .filter((position) => position >= minimumPageFill && position <= target)
    .sort((a, b) => b - a)[0];
  if (explicitBreak !== undefined) return Math.floor(explicitBreak);

  const crossingZone = markers.keepTogether
    .filter(
      (zone) =>
        zone.top > start + 2 &&
        zone.top < target &&
        zone.bottom > target,
    )
    .sort((a, b) => b.height - a.height)[0];

  return crossingZone ? Math.floor(crossingZone.top) : target;
}

/** Builds consistent A4 pages and moves cuts away from headings, rows, and short content blocks. */
async function createPdf(element: HTMLElement) {
  const captureHost = document.createElement("div");
  captureHost.setAttribute("aria-hidden", "true");
  captureHost.style.cssText = [
    "position:fixed",
    "top:0",
    "left:-100000px",
    `width:${CONTENT_WIDTH_MM}mm`,
    "height:auto",
    "overflow:visible",
    "pointer-events:none",
    "z-index:-1",
  ].join(";");

  const capture = element.cloneNode(true) as HTMLElement;
  capture.classList.add("pdf-capture");
  capture.classList.remove("hidden");
  capture.removeAttribute("hidden");
  capture.style.setProperty("display", "block", "important");
  capture.style.setProperty("position", "static", "important");
  capture.style.setProperty("transform", "none", "important");
  capture.style.setProperty("width", `${CONTENT_WIDTH_MM}mm`, "important");
  capture.style.setProperty("max-width", `${CONTENT_WIDTH_MM}mm`, "important");
  capture.style.setProperty("min-width", "0", "important");
  capture.style.setProperty("min-height", `${CONTENT_HEIGHT_MM}mm`, "important");
  capture.style.setProperty("height", "auto", "important");
  capture.style.setProperty("max-height", "none", "important");
  capture.style.setProperty("margin", "0", "important");
  capture.style.setProperty("overflow", "visible", "important");
  capture.style.setProperty("box-sizing", "border-box", "important");
  capture.style.setProperty("box-shadow", "none", "important");
  capture.style.setProperty("background", "#ffffff", "important");

  if (capture.matches(".print-area, .program-a4")) {
    capture.style.setProperty("padding", "0", "important");
    capture.style.setProperty("border", "0", "important");
    capture.style.setProperty("border-radius", "0", "important");
  }

  copyFormValues(element, capture);
  capture.querySelectorAll<HTMLElement>(".no-print, [data-pdf-exclude]").forEach((node) => {
    node.style.setProperty("display", "none", "important");
  });

  captureHost.appendChild(capture);
  document.body.appendChild(captureHost);

  try {
    await waitForDocumentAssets(capture);
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

    const pixelRatio = Math.min(2, Math.max(1.5, window.devicePixelRatio || 1));
    const canvas = await toCanvas(capture, {
      backgroundColor: "#ffffff",
      cacheBust: true,
      pixelRatio,
      width: Math.max(capture.scrollWidth, 1),
      height: Math.max(capture.scrollHeight, 1),
      style: {
        background: "#ffffff",
        boxShadow: "none",
        overflow: "visible",
      },
    });

    if (!canvas.width || !canvas.height) {
      throw new Error("تعذّر تحديد أبعاد المستند للتصدير");
    }

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const contentWidth = pageWidth - PAGE_MARGIN_MM * 2;
    const contentHeight = pageHeight - PAGE_MARGIN_MM * 2;
    const pagePixelHeight = Math.floor((canvas.width * contentHeight) / contentWidth);
    const markers = getPageMarkers(capture, canvas, pagePixelHeight);
    let sourceY = 0;
    let pageIndex = 0;

    while (sourceY < canvas.height) {
      const pageEnd = choosePageEnd(sourceY, pagePixelHeight, canvas.height, markers);
      const sliceHeight = Math.max(1, Math.min(canvas.height - sourceY, pageEnd - sourceY));
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

      const renderedHeight = Math.min(
        contentHeight,
        (sliceHeight * contentWidth) / canvas.width,
      );
      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(
        pageCanvas.toDataURL("image/jpeg", 0.94),
        "JPEG",
        PAGE_MARGIN_MM,
        PAGE_MARGIN_MM,
        contentWidth,
        renderedHeight,
        undefined,
        "FAST",
      );
      pdf.setFontSize(8);
      pdf.setTextColor(110, 110, 110);
      pdf.text(`صفحة ${pageIndex + 1}`, pageWidth - PAGE_MARGIN_MM, pageHeight - 5, {
        align: "right",
      });

      sourceY += sliceHeight;
      pageIndex += 1;
    }

    return pdf;
  } finally {
    captureHost.remove();
  }
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
