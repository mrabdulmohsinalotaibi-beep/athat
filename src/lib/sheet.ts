import ExcelJS from "exceljs";

import type { FieldDef } from "./records";

function safeFileName(value: string, fallback: string) {
  return (
    (value || fallback)
      .trim()
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, " ")
      .slice(0, 120) || fallback
  );
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("result" in value) return cellText(value.result);
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => String(part.text ?? "")).join("");
    }
    return "";
  }
  return String(value);
}

function parseDelimited(value: string, delimiter: "," | "\t"): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    const next = value[index + 1];
    if (character === '"') {
      if (quoted && next === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && character === delimiter) {
      row.push(cell);
      cell = "";
    } else if (!quoted && (character === "\n" || character === "\r")) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((current) => current.some((item) => item.trim()));
}

async function readFileMatrix(file: File): Promise<unknown[][]> {
  if (!file || !/\.(xlsx|csv)$/i.test(file.name)) {
    throw new Error("اختر ملف XLSX أو CSV صالحًا. ملفات XLS القديمة غير مدعومة.");
  }
  if (/\.csv$/i.test(file.name)) {
    const text = await file.text();
    const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
    const delimiter = firstLine.includes("\t") ? "\t" : ",";
    return parseDelimited(text.replace(/^\uFEFF/, ""), delimiter);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const matrix: unknown[][] = [];
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const values: unknown[] = [];
    for (let column = 1; column <= worksheet.columnCount; column += 1) {
      values.push(row.getCell(column).value);
    }
    matrix.push(values);
  });
  return matrix;
}

/** تصدير السجل الحالي إلى Excel بعناوين عربية واتجاه RTL. */
export async function exportToExcel(
  fields: FieldDef[],
  rows: Record<string, unknown>[],
  fileName: string,
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("بيانات", { views: [{ rightToLeft: true }] });
  const headers = fields.map((field) => field.label);
  worksheet.addRow(headers);
  rows.forEach((row) => worksheet.addRow(fields.map((field) => row[field.name] ?? "")));
  worksheet.autoFilter = {
    from: "A1",
    to: `${String.fromCharCode(65 + Math.max(fields.length - 1, 0))}${Math.max(rows.length + 1, 1)}`,
  };
  worksheet.columns = headers.map((header, index) => ({
    header,
    key: String(index),
    width: Math.min(
      Math.max(
        header.length + 4,
        ...rows.map((row) => String(row[fields[index]?.name ?? ""] ?? "").length + 2),
      ),
      55,
    ),
  }));
  worksheet.getRow(1).font = { bold: true };
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${safeFileName(fileName, "تصدير_بيانات")}.xlsx`,
  );
}

/** قراءة الصفوف من أول ورقة في ملف XLSX أو CSV بعد تنظيف عناوين الأعمدة. */
export async function readExcel(file: File): Promise<Record<string, unknown>[]> {
  const matrix = await readFileMatrix(file);
  const headers = (matrix[0] ?? []).map((value) =>
    cellText(value)
      .replace(/^\uFEFF/, "")
      .trim(),
  );
  return matrix
    .slice(1)
    .map((values) =>
      Object.fromEntries(
        headers.map((header, index) => [
          header,
          values[index] instanceof Date ? values[index] : cellText(values[index]),
        ]),
      ),
    );
}

/** قراءة ملف XLSX أو CSV كصفوف مصفوفة لمستوردي المصادر الخارجية. */
export async function readExcelMatrix(file: File): Promise<unknown[][]> {
  return readFileMatrix(file);
}

export function sheetHeaders(rows: Record<string, unknown>[]): string[] {
  if (!rows.length) return [];
  return Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
}

/** توحيد قيم التواريخ المستوردة إلى YYYY-MM-DD، بما يشمل رقم التاريخ في Excel. */
export function toIsoDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(Date.UTC(1899, 11, 30) + value * 86_400_000);
    return date.toISOString().slice(0, 10);
  }
  const parsed = new Date(String(value).trim());
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}
