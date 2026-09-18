import * as XLSX from "xlsx";

export interface StudentImportField {
  name: string;
  label: string;
  aliases: string[];
  required?: boolean;
}

/** حقول بيانات الطالب المعتمدة في المنصة */
export const STUDENT_IMPORT_FIELDS: StudentImportField[] = [
  {
    name: "full_name",
    label: "اسم الطالب",
    required: true,
    aliases: ["اسم الطالب", "الاسم", "اسم الطالبة", "اسم الطالب رباعي", "الاسم الرباعي", "اسم الطالب الرباعي", "الطالب"],
  },
  {
    name: "national_id",
    label: "رقم الهوية / السجل المدني",
    required: true,
    aliases: [
      "رقم الهوية",
      "الهوية",
      "رقم الهوية أو الإقامة",
      "رقم الهوية الوطنية",
      "الاقامة",
      "رقم الاقامة",
      "السجل المدني",
      "رقم السجل المدني",
      "هوية الطالب",
      "رقم السجل",
      "الرقم الوطني",
    ],
  },
  {
    name: "nationality",
    label: "الجنسية",
    aliases: ["الجنسية", "جنسية الطالب", "الجنسيه"],
  },
  {
    name: "grade",
    label: "الصف الدراسي",
    aliases: ["الصف", "الصف الدراسي", "الصف/المرحلة", "المستوى", "الصف الحالي"],
  },
  {
    name: "classroom",
    label: "الفصل",
    aliases: ["الفصل", "الفصل الدراسي", "الشعبة", "فصل الطالب", "القسم"],
  },
  {
    name: "guardian_name",
    label: "اسم ولي الأمر",
    aliases: ["ولي الأمر", "اسم ولي الأمر", "ولي أمر الطالب", "اسم ولي أمر الطالب", "الوصي"],
  },
  {
    name: "guardian_phone",
    label: "رقم جوال ولي الأمر",
    aliases: [
      "جوال ولي الأمر",
      "رقم جوال ولي الأمر",
      "الجوال",
      "رقم الجوال",
      "رقم الهاتف",
      "الهاتف",
      "جوال",
      "جوال الطالب",
      "رقم التواصل",
    ],
  },
];

export function normalizeHeader(value: string): string {
  return String(value)
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\u0621-\u064Aa-zA-Z0-9]/g, "")
    .toLowerCase()
    .trim();
}

/** مطابقة عناوين الأعمدة البرمجية */
export function autoMap(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  const used = new Set<string>();
  for (const field of STUDENT_IMPORT_FIELDS) {
    const candidates = [field.label, field.name, ...field.aliases].map(normalizeHeader);
    const exact = headers.find((h) => !used.has(h) && candidates.includes(normalizeHeader(h)));
    const partial =
      exact ??
      headers.find(
        (h) =>
          !used.has(h) &&
          candidates.some((c) => c.length > 2 && (normalizeHeader(h).includes(c) || c.includes(normalizeHeader(h)))),
      );
    if (partial) {
      map[field.name] = partial;
      used.add(partial);
    } else {
      map[field.name] = "";
    }
  }
  return map;
}

export function cleanPhone(value: unknown): string {
  const digits = String(value ?? "")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("966")) return `0${digits.slice(3)}`;
  if (digits.length === 9 && digits.startsWith("5")) return `0${digits}`;
  return digits;
}

export function cleanId(value: unknown): string {
  return String(value ?? "")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/\D/g, "");
}

export function downloadStudentsTemplate() {
  const headers = STUDENT_IMPORT_FIELDS.map((field) => field.label);
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  ws["!cols"] = headers.map(() => ({ wch: 24 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "الطلاب");
  XLSX.writeFile(wb, "نموذج_بيانات_الطلاب.xlsx");
}
