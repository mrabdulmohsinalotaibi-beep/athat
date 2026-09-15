export function normalizeSaudiPhone(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  
  // استخراج الأرقام فقط
  let digits = String(raw).replace(/\D/g, "");
  if (!digits) return "";

  // إزالة البادئة الدولية 00966 إن وجدت
  if (digits.startsWith("00966")) {
    digits = digits.slice(2);
  }

  // إذا كان الرقم يبدأ بـ 966 مسبقاً، نتحقق من صحة الطول المقبول
  if (digits.startsWith("966")) {
    return digits.length === 12 ? digits : digits.slice(0, 12);
  }

  // إزالة الصفر المحلي 05XXXXXXXX -> 5XXXXXXXX
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // التحقق من رقم الجوال السعودي (يبدأ بـ 5 وتكمله 8 أرقام)
  if (digits.startsWith("5")) {
    const mobileDigits = digits.slice(0, 9);
    if (mobileDigits.length === 9) {
      return `966${mobileDigits}`;
    }
  }

  return digits;
}

export interface GuardianMessageOptions {
  guardian?: string;
  student?: string;
  school?: string;
}

export function defaultGuardianMessage(opts: GuardianMessageOptions = {}): string {
  const guardian = opts.guardian?.trim();
  const student = opts.student?.trim();
  const school = opts.school?.trim();

  return [
    `السلام عليكم ورحمة الله وبركاته${guardian ? `، الأستاذ/ ${guardian}` : ""}`,
    school ? `معكم الموجه الطلابي بـ${school}.` : "معكم الموجه الطلابي بالمدرسة.",
    student ? `بخصوص الطالب: ${student}` : "",
    "نأمل التواصل معنا لمناقشة ما يخص ابنكم. شاكرين لكم تعاونكم.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function whatsappLink(phone: unknown, message: string): string {
  const number = normalizeSaudiPhone(phone);
  const encodedText = encodeURIComponent(message);
  
  return number
    ? `https://wa.me/${number}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;
}

export interface ReferralMessageOptions {
  student?: string;
  studentNo?: string;
  grade?: string;
  destination?: string;
  reason?: string;
  actions?: string;
  recommendations?: string;
  date?: string;
  school?: string;
  counselor?: string;
}

export function referralMessage(opts: ReferralMessageOptions = {}): string {
  const line = (label: string, value?: string) => {
    const trimmed = value?.trim();
    return trimmed ? `${label}: ${trimmed}` : "";
  };

  return [
    "السلام عليكم ورحمة الله وبركاته",
    opts.school ? `من التوجيه الطلابي بـ${opts.school.trim()}` : "من التوجيه الطلابي بالمدرسة",
    "نرفع لكم نموذج إحالة طالب وفق التالي:",
    "",
    line("اسم الطالب", opts.student),
    line("رقم الطالب", opts.studentNo),
    line("الصف", opts.grade),
    line("الجهة المحال إليها", opts.destination),
    line("تاريخ الإحالة", opts.date),
    line("سبب الإحالة", opts.reason),
    line("الإجراءات السابقة", opts.actions),
    line("التوصيات", opts.recommendations),
    "",
    opts.counselor?.trim() ? `الموجه الطلابي: ${opts.counselor.trim()}` : "",
    "شاكرين لكم تعاونكم.",
  ]
    .filter((item) => item !== "")
    .join("\n");
}

/** Opens WhatsApp with a message; when no number is given the user picks the chat inside WhatsApp. */
export function shareOnWhatsApp(message: string, phone?: unknown): void {
  const url = whatsappLink(phone, message);
  if (typeof window !== "undefined" && url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}