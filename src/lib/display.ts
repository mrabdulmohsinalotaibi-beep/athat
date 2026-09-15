const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function displayRecordValue(value: unknown): string {
  // التعامل مع القيم الفارغة
  if (value === null || value === undefined || value === "") return "—";

  // معالجة القيم المنطقية (Boolean)
  if (typeof value === "boolean") return value ? "نعم" : "لا";

  const text = String(value).trim();
  if (!text) return "—";

  // إخفاء المعرفات التقنية
  if (UUID_PATTERN.test(text)) return "مرجع محفوظ";

  // التحقق مما إذا كانت القيمة تاريخاً (صيغة ISO أو تاريخ عادي) وتحويله للهجري
  if (text.match(/^\d{4}-\d{2}-\d{2}/)) {
    try {
      const date = new Date(text);
      if (!isNaN(date.getTime())) {
        return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }).format(date);
      }
    } catch {
      return text;
    }
  }

  return text;
}
