import * as XLSX from "xlsx";

import {
  normalizeSaudiGrade,
  normalizeSaudiStage,
} from "@/lib/saudi-school";

export interface StudentImportField {
  name: string;
  label: string;
  aliases: string[];
  required?: boolean;
}

export type StudentImportValues = Record<string, string>;

const FIELD = (
  name: string,
  label: string,
  aliases: string[],
  required = false,
): StudentImportField => ({ name, label, aliases, required });

/** جميع حقول الطالب التي يمكن توزيع بيانات الملفات عليها داخل المنصة. */
export const STUDENT_IMPORT_FIELDS: StudentImportField[] = [
  FIELD("student_no", "رقم الطالب", [
    "رقم الطالب",
    "الرقم الطلابي",
    "رقم طالب",
    "student no",
    "student number",
    "student id",
  ]),
  FIELD(
    "full_name",
    "اسم الطالب",
    [
      "اسم الطالب",
      "الاسم",
      "اسم الطالبة",
      "اسم الطالب رباعي",
      "الاسم الرباعي",
      "اسم الطالب الرباعي",
      "الطالب",
      "اسم",
      "student name",
      "full name",
      "name",
    ],
    true,
  ),
  FIELD("national_id", "رقم الهوية / السجل المدني", [
    "رقم الهوية",
    "الهوية",
    "رقم الهوية أو الإقامة",
    "رقم الهوية الوطنية",
    "الاقامة",
    "الإقامة",
    "رقم الاقامة",
    "رقم الإقامة",
    "السجل المدني",
    "رقم السجل المدني",
    "هوية الطالب",
    "رقم السجل",
    "الرقم الوطني",
    "national id",
    "civil id",
    "identity",
  ]),
  FIELD("nationality", "الجنسية", [
    "الجنسية",
    "جنسية الطالب",
    "الجنسيه",
    "nationality",
  ]),
  FIELD("gender", "الجنس", [
    "الجنس",
    "النوع",
    "جنس الطالب",
    "ذكر/أنثى",
    "gender",
    "sex",
  ]),
  FIELD("stage", "المرحلة", [
    "المرحلة",
    "المرحله",
    "المرحلة الدراسية",
    "نوع المرحلة",
    "stage",
    "school stage",
  ]),
  FIELD("grade", "الصف الدراسي", [
    "الصف",
    "الصف الدراسي",
    "الصف/المرحلة",
    "المستوى",
    "الصف الحالي",
    "grade",
    "class grade",
  ]),
  FIELD("classroom", "الفصل", [
    "الفصل",
    "الفصل الدراسي",
    "الشعبة",
    "الشعبه",
    "فصل الطالب",
    "القسم",
    "رقم الفصل",
    "classroom",
    "section",
  ]),
  FIELD("guardian_name", "اسم ولي الأمر", [
    "ولي الأمر",
    "ولي الامر",
    "اسم ولي الأمر",
    "اسم ولي الامر",
    "ولي أمر الطالب",
    "ولي امر الطالب",
    "اسم ولي أمر الطالب",
    "الوصي",
    "guardian",
    "guardian name",
    "parent name",
  ]),
  FIELD("guardian_phone", "رقم جوال ولي الأمر", [
    "جوال ولي الأمر",
    "جوال ولي الامر",
    "رقم جوال ولي الأمر",
    "رقم جوال ولي الامر",
    "الجوال",
    "رقم الجوال",
    "رقم الهاتف",
    "الهاتف",
    "جوال",
    "جوال الطالب",
    "رقم التواصل",
    "guardian phone",
    "parent phone",
    "mobile",
    "phone",
  ]),
  FIELD("address", "السكن / العنوان", [
    "السكن",
    "العنوان",
    "عنوان الطالب",
    "الحي",
    "مكان السكن",
    "address",
  ]),
  FIELD("health_status", "الحالة الصحية", [
    "الحالة الصحية",
    "الحاله الصحيه",
    "الصحة",
    "الوضع الصحي",
    "health status",
    "health",
  ]),
  FIELD("social_status", "الحالة الاجتماعية", [
    "الحالة الاجتماعية",
    "الحاله الاجتماعيه",
    "الوضع الاجتماعي",
    "social status",
  ]),
  FIELD("status", "حالة القيد", [
    "حالة القيد",
    "الحالة",
    "حالة الطالب",
    "الحاله",
    "status",
  ]),
  FIELD("notes", "ملاحظات", [
    "ملاحظات",
    "ملاحظة",
    "ملاحظات الطالب",
    "بيان",
    "تفاصيل",
    "notes",
    "note",
  ]),
];

export const STUDENT_IMPORT_FIELD_NAMES = STUDENT_IMPORT_FIELDS.map(
  (field) => field.name,
);

function toWesternDigits(value: unknown): string {
  return String(value ?? "")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

export function cleanImportText(value: unknown): string {
  return toWesternDigits(value)
    .replace(/[_]+/g, " ")
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeHeader(value: string): string {
  return cleanImportText(value)
    .replace(/[إأآا]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\u0621-\u064Aa-zA-Z0-9]/g, "")
    .toLowerCase()
    .trim();
}

/** مطابقة محلية سريعة للعناوين المعروفة، ويكمل DeepSeek العناوين غير الواضحة. */
export function autoMap(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  const used = new Set<string>();

  for (const field of STUDENT_IMPORT_FIELDS) {
    const candidates = [field.label, field.name, ...field.aliases]
      .map(normalizeHeader)
      .filter(Boolean);

    const exact = headers.find(
      (header) =>
        !used.has(header) && candidates.includes(normalizeHeader(header)),
    );

    const partial =
      exact ??
      headers.find((header) => {
        if (used.has(header)) return false;
        const normalized = normalizeHeader(header);
        if (!normalized) return false;
        return candidates.some(
          (candidate) =>
            candidate.length > 2 &&
            (normalized.includes(candidate) || candidate.includes(normalized)),
        );
      });

    if (partial) {
      map[field.name] = partial;
      used.add(partial);
    } else {
      map[field.name] = "";
    }
  }

  return map;
}

/** دمج المطابقة المحلية مع مطابقة الذكاء الصناعي مع منع استخدام العمود مرتين. */
export function mergeMappings(
  local: Record<string, string>,
  ai: Record<string, string>,
  headers: string[],
): Record<string, string> {
  const result = { ...local };
  const validHeaders = new Set(headers);
  const used = new Set(Object.values(local).filter(Boolean));

  for (const field of STUDENT_IMPORT_FIELDS) {
    if (result[field.name]) continue;
    const suggested = ai[field.name];
    if (!suggested || !validHeaders.has(suggested) || used.has(suggested)) continue;
    result[field.name] = suggested;
    used.add(suggested);
  }

  return result;
}

export function cleanPhone(value: unknown): string {
  const digits = toWesternDigits(value).replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00966")) return `0${digits.slice(5)}`;
  if (digits.startsWith("966")) return `0${digits.slice(3)}`;
  if (digits.length === 9 && digits.startsWith("5")) return `0${digits}`;
  return digits;
}

export function cleanId(value: unknown): string {
  return toWesternDigits(value).replace(/\D/g, "");
}

function cleanGender(value: unknown): string {
  const text = cleanImportText(value).toLowerCase();
  if (!text) return "";
  if (/^(ذكر|male|m)$/i.test(text)) return "ذكر";
  if (/^(انثى|أنثى|female|f)$/i.test(text)) return "أنثى";
  return cleanImportText(value);
}

function cleanStatus(value: unknown): string {
  const text = cleanImportText(value);
  if (!text) return "نشط";
  if (/منقول/u.test(text)) return "منقول";
  if (/منقطع|مطوي/u.test(text)) return "منقطع";
  if (/نشط|منتظم|مستمر/u.test(text)) return "نشط";
  return text;
}

function cleanClassroom(value: unknown): string {
  const text = cleanImportText(value);
  if (!text) return "";
  const simple = text.match(/^(?:فصل|شعبة|الشعبة)?\s*([0-9]{1,2})$/u);
  return simple?.[1] ?? text;
}

export function normalizeStudentValues(
  values: Record<string, unknown>,
): StudentImportValues {
  const result: StudentImportValues = {};

  for (const field of STUDENT_IMPORT_FIELDS) {
    const raw = values[field.name];
    if (field.name === "guardian_phone") result[field.name] = cleanPhone(raw);
    else if (field.name === "national_id") result[field.name] = cleanId(raw);
    else if (field.name === "student_no") result[field.name] = cleanId(raw) || cleanImportText(raw);
    else if (field.name === "gender") result[field.name] = cleanGender(raw);
    else if (field.name === "status") result[field.name] = cleanStatus(raw);
    else if (field.name === "classroom") result[field.name] = cleanClassroom(raw);
    else result[field.name] = cleanImportText(raw);
  }

  const stage =
    normalizeSaudiStage(result.stage) ||
    normalizeSaudiStage(result.grade) ||
    "";
  if (stage) result.stage = stage;

  if (result.grade) {
    result.grade = normalizeSaudiGrade(result.grade, stage || result.grade);
  }

  if (!result.student_no && result.national_id) {
    result.student_no = result.national_id;
  }

  return result;
}

function normalizedName(value: unknown): string {
  return cleanImportText(value)
    .replace(/[إأآا]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase();
}

/**
 * مفاتيح مقارنة متعددة. الهوية أو الرقم الطلابي أقوى مفاتيح المطابقة،
 * ثم الاسم مع الجوال أو الصف والفصل عند عدم توفر رقم موثوق.
 */
export function studentIdentityKeys(
  values: Partial<StudentImportValues>,
): string[] {
  const keys: string[] = [];
  const nationalId = cleanId(values.national_id);
  const studentNo = cleanId(values.student_no) || cleanImportText(values.student_no);
  const name = normalizedName(values.full_name);
  const phone = cleanPhone(values.guardian_phone);
  const stage = normalizeSaudiStage(values.stage) || normalizeSaudiStage(values.grade);
  const grade = values.grade ? normalizeSaudiGrade(values.grade, stage) : "";
  const classroom = cleanClassroom(values.classroom);

  if (nationalId.length >= 8) keys.push(`nid:${nationalId}`);
  if (studentNo.length >= 3) keys.push(`sno:${studentNo}`);
  if (name && phone.length >= 9) keys.push(`name-phone:${name}|${phone}`);
  if (name && grade && classroom)
    keys.push(`name-class:${name}|${stage}|${grade}|${classroom}`);

  return Array.from(new Set(keys));
}

export function studentImportWarnings(values: StudentImportValues): string[] {
  const warnings: string[] = [];
  if (!values.full_name) return ["اسم الطالب مفقود"];
  if (values.national_id && values.national_id.length !== 10)
    warnings.push("رقم الهوية لا يتكون من 10 أرقام");
  if (values.guardian_phone && values.guardian_phone.length !== 10)
    warnings.push("رقم الجوال يحتاج مراجعة");
  if (values.grade && !normalizeSaudiStage(values.stage) && normalizeSaudiStage(values.grade))
    warnings.push("تم استنتاج المرحلة من الصف");
  if (!values.national_id && !values.student_no)
    warnings.push("لا يوجد رقم هوية أو رقم طالب؛ سيعتمد كشف التكرار على البيانات المتاحة");
  return warnings;
}

export function downloadStudentsTemplate() {
  const headers = STUDENT_IMPORT_FIELDS.map((field) => field.label);
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  ws["!cols"] = headers.map(() => ({ wch: 24 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "الطلاب");
  XLSX.writeFile(wb, "نموذج_بيانات_الطلاب.xlsx");
}
