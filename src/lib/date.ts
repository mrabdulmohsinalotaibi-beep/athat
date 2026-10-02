const HIJRI_LOCALE = "ar-SA-u-ca-islamic-umalqura";

const hijriDateFormatter = new Intl.DateTimeFormat(HIJRI_LOCALE, {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const hijriDateTimeFormatter = new Intl.DateTimeFormat(HIJRI_LOCALE, {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function parseDateValue(value: string | Date): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const text = String(value).trim();
  if (!text) return null;

  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** عرض أي تاريخ للمستخدم بالتقويم الهجري أم القرى فقط. */
export function formatHijriDate(value: string | Date | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const date = parseDateValue(value);
  return date ? hijriDateFormatter.format(date) : String(value);
}

/** عرض التاريخ والوقت هجريًا عند الحاجة، دون إظهار التاريخ الميلادي. */
export function formatHijriDateTime(value: string | Date | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const date = parseDateValue(value);
  return date ? hijriDateTimeFormatter.format(date) : String(value);
}

/** قيمة ISO داخلية للتخزين، مع بقاء العرض للمستخدم هجريًا. */
export function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}


export const HIJRI_MONTHS = [
  "محرم","صفر","ربيع الأول","ربيع الآخر","جمادى الأولى","جمادى الآخرة",
  "رجب","شعبان","رمضان","شوال","ذو القعدة","ذو الحجة"
] as const;

function hijriParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura", {
    year:"numeric", month:"numeric", day:"numeric"
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year:get("year"), month:get("month"), day:get("day") };
}

/** تحويل تاريخ هجري أم القرى مختار من الواجهة إلى ISO للتخزين الداخلي. */
export function hijriToIso(year: number, month: number, day: number): string {
  const approxGregorianYear = year + 579;
  const start = new Date(approxGregorianYear - 2, 0, 1);
  const end = new Date(approxGregorianYear + 2, 11, 31);
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const h = hijriParts(cursor);
    if (h.year === year && h.month === month && h.day === day) {
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, "0");
      const d = String(cursor.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }
  return "";
}

export function isoToHijriParts(value?: string | null) {
  const date = value ? parseDateValue(value) : new Date();
  return hijriParts(date ?? new Date());
}
