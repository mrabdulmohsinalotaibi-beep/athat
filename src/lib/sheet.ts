import * as XLSX from "xlsx";
import type { FieldDef } from "./records";

export function exportToExcel(fields: FieldDef[], rows: Record<string, unknown>[], fileName: string) {
  const data = rows.map((row) => {
    const out: Record<string, unknown> = {};
    fields.forEach((f) => {
      out[f.label] = row[f.name] ?? "";
    });
    return out;
  });
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "بيانات");
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

/** Reads a workbook file and returns the first sheet rows as objects keyed by header text. */
export async function readExcel(file: File): Promise<Record<string, unknown>[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  return rows;
}

export function sheetHeaders(rows: Record<string, unknown>[]): string[] {
  const set = new Set<string>();
  rows.forEach((r) => Object.keys(r).forEach((k) => set.add(k)));
  return [...set];
}

export function toIsoDate(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value).trim();
  if (!text) return null;
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}
