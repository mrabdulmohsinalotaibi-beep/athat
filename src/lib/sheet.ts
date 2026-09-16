import * as XLSX from "xlsx";
import type { FieldDef } from "./records";

export function exportToExcel(
  fields: FieldDef[],
  rows: Record<string, unknown>[],
  fileName: string
) {
  const data = rows.map((row) => {
    const out: Record<string, unknown> = {};
    fields.forEach((f) => {
      out[f.label] = row[f.name] ?? "";
    });
    return out;
  });

  const ws = XLSX.utils.json_to_sheet(data);
  ws["!dir"] = "rtl";

  if (data.length > 0) {
    const headers = Object.keys(data[0] || {});
    ws["!cols"] = headers.map((header) => {
      const maxLen = data.reduce((max, row) => {
        const val = String(row[header] ?? "");
        return Math.max(max, val.length);
      }, header.length);
      return { wch: Math.min(Math.max(maxLen + 4, 12), 50) };
    });
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "بيانات");
  XLSX.writeFile(wb, `${fileName.trim() || "تصدير_بيانات"}.xlsx`);
}

/** قراءة ملف Excel أو CSV وإرجاع صفوفه */
export async function readExcel(file: File): Promise<Record<string, unknown>[]> {
  try {
    if (!file) return [];

    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { cellDates: true });

    const sheetName = wb.SheetNames[0];
    if (!sheetName) return [];

    const sheet = wb.Sheets[sheetName];
    if (!sheet) return [];

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      blankrows: false,
    });

    return rows;
  } catch (error) {
    console.error("خطأ أثناء قراءة ملف Excel:", error);
    return [];
  }
}

export function sheetHeaders(rows: Record<string, unknown>[]): string[] {
  if (!rows || rows.length === 0) return [];
  const set = new Set<string>();
  rows.forEach((r) => Object.keys(r).forEach((k) => set.add(k)));
  return Array.from(set);
}

export function toIsoDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date) {
    return !Number.isNaN(value.getTime()) ? value.toISOString().slice(0, 10) : null;
  }

  if (typeof value === "number") {
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    return !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : null;
  }

  const text = String(value).trim();
  if (!text) return null;

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}