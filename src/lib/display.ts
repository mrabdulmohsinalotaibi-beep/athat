const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHORT_ID_PATTERN = /^[A-Z0-9]{3,8}-\d{3,8}$/i; // مثل: TASK-102 أو CASE-5541

/**
 * تنسيق وعرض أي قيمة داخل جداول المتابعة والتقارير بصيغة واضحة للمستخدم
 */
export function displayRecordValue(value: unknown): string {
  // 1. التعامل مع القيم الفارغة والغير معرفة
  if (value === null || value === undefined || value === "") return "—";

  // 2. معالجة القيم المنطقية
  if (typeof value === "boolean") return value ? "نعم" : "لا";

  // 3. معالجة المصفوفات والكائنات (Arrays & Objects)
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    return value.map((item) => displayRecordValue(item)).join("، ");
  }

  if (typeof value === "object") {
    return "مرفق / بيانات مسجلة";
  }

  const text = String(value).trim();
  if (!text) return "—";

  // 4. إخفاء المعرفات التقنية المعقدة
  if (UUID_PATTERN.test(text)) return "مرجع محفوظ";

  // 5. التحقق من التواريخ وتحويلها للتقويم الهجري (أم القرى)
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

  // 6. تنسيق الأرقام الكبيرة (إن وجدت)
  if (typeof value === "number" && !isNaN(value)) {
    return new Intl.NumberFormat("ar-SA").format(value);
  }

  return text;
}