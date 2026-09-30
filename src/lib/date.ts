const HIJRI_LOCALES = [
  "ar-SA-u-ca-islamic-umalqura",
  "ar-SA-u-ca-islamic",
  "ar-SA",
] as const;

function createFormatter(
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat | null {
  for (const locale of HIJRI_LOCALES) {
    try {
      return new Intl.DateTimeFormat(locale, options);
    } catch {
      // Some Android WebView/browser builds do not ship the Umm al-Qura
      // calendar. Fall through instead of crashing the whole route module.
    }
  }
  return null;
}

const hijriDateFormatter = createFormatter({
  year: "numeric",
  month: "long",
  day: "numeric",
});

const hijriDateTimeFormatter = createFormatter({
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

/** عرض أي تاريخ للمستخدم، مع استخدام أم القرى عندما يدعمه الجهاز. */
export function formatHijriDate(value: string | Date | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const date = parseDateValue(value);
  if (!date) return String(value);
  try {
    return hijriDateFormatter?.format(date) ?? date.toLocaleDateString("ar-SA");
  } catch {
    return date.toLocaleDateString("ar-SA");
  }
}

/** عرض التاريخ والوقت مع التدرج الآمن للأجهزة التي لا تدعم تقويم أم القرى. */
export function formatHijriDateTime(value: string | Date | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const date = parseDateValue(value);
  if (!date) return String(value);
  try {
    return hijriDateTimeFormatter?.format(date) ?? date.toLocaleString("ar-SA");
  } catch {
    return date.toLocaleString("ar-SA");
  }
}

/** قيمة ISO داخلية للتخزين، مع بقاء العرض للمستخدم هجريًا عند الإمكان. */
export function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
