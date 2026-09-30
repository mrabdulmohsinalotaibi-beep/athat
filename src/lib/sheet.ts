import * as XLSX from "xlsx";

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

/** تصدير السجل الحالي إلى Excel بعناوين عربية، اتجاه RTL، وتنسيق قراءة مناسب. */
export function exportToExcel(
  fields: FieldDef[],
  rows: Record<string, unknown>[],
  fileName: string,
) {
  const data = rows.map((row) => {
    const out: Record<string, unknown> = {};
    fields.forEach((field) => {
      out[field.label] = row[field.name] ?? "";
    });
    return out;
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet["!dir"] = "rtl";
  if (data.length) {
    worksheet["!autofilter"] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: data.length, c: Math.max(fields.length - 1, 0) },
      }),
    };
  }

  const headers = fields.map((field) => field.label);
  worksheet["!cols"] = headers.map((header) => {
    const maxLength = data.reduce(
      (max, row) => Math.max(max, String(row[header] ?? "").length),
      header.length,
    );
    return { wch: Math.min(Math.max(maxLength + 4, 14), 55) };
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "بيانات");
  XLSX.writeFile(workbook, `${safeFileName(fileName, "تصدير_بيانات")}.xlsx`, { compression: true });
}

/** قراءة الصفوف من أول ورقة في ملف Excel أو CSV بعد تنظيف عناوين الأعمدة. */
export async function readExcel(file: File): Promise<Record<string, unknown>[]> {
  if (!file || !/\.(xlsx|xls|csv)$/i.test(file.name)) {
    throw new Error("اختر ملف Excel أو CSV صالحًا.");
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { cellDates: true, raw: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName || !workbook.Sheets[sheetName]) return [];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
    defval: "",
    blankrows: false,
  });

  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        String(key)
          .replace(/^\uFEFF/, "")
          .trim(),
        value,
      ]),
    ),
  );
}

export function sheetHeaders(rows: Record<string, unknown>[]): string[] {
  if (!rows.length) return [];
  return Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
}

/** توحيد قيم التواريخ المستوردة إلى YYYY-MM-DD، بما يشمل رقم التاريخ في Excel. */
export function toIsoDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return `${String(parsed.y).padStart(4, "0")}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }

  const text = String(value).trim();
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}
