import * as XLSX from "xlsx";
import type { FieldDef } from "./records";

// دالة لاستدعاء DeepSeek API وتصحيح البيانات
async function cleanDataWithDeepSeek(
  rows: Record<string, unknown>[],
  apiKey: string
): Promise<Record<string, unknown>[]> {
  if (!rows.length) return [];

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `أنت مساعد ذكي لتنظيف وتصحيح بيانات ملفات Excel. 
قم بتصحيح الأخطاء الإملائية في الأسماء العربية، توحيد صيغ التواريخ، وتصحيح الأرقام دون التعديل على بنية المفاتيح (Keys). 
قم بإرجاع النتيجة بصيغة JSON Array فقط وبدون أي شرح أو نصوص إضافية.`,
          },
          {
            role: "user",
            content: JSON.stringify(rows),
          },
        ],
        temperature: 0.1,
      }),
    });

    const result = await response.json();
    const cleanedText = result.choices?.[0]?.message?.content;

    if (cleanedText) {
      // تنظيف أي زوائد Markdown إذا وجدت في الرد
      const jsonString = cleanedText.replace(/```json|```/g, "").trim();
      return JSON.parse(jsonString);
    }
  } catch (error) {
    console.error("خطأ أثناء التصحيح بالذكاء الاصطناعي، تم إرجاع البيانات الأصلية:", error);
  }

  return rows; // إرجاع البيانات الأصلية في حال فشل API
}

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

/** 
 * قراءة ملف Excel مع التصحيح التلقائي للأخطاء باستخدام DeepSeek AI
 * @param file ملف الإكسل
 * @param deepseekApiKey مفتاح API الخاص بـ DeepSeek (اختياري)
 */
export async function readExcel(
  file: File,
  deepseekApiKey?: string
): Promise<Record<string, unknown>[]> {
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

    // إذا تم إرسال مفتاح DeepSeek API، يتم تصحيح البيانات عبر الذكاء الاصطناعي
    if (deepseekApiKey && rows.length > 0) {
      return await cleanDataWithDeepSeek(rows, deepseekApiKey);
    }

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