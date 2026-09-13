export function normalizeSaudiPhone(raw: unknown): string {
  let digits = String(raw ?? "").replace(/[^\d+]/g, "").replace(/\+/g, "");
  if (!digits) return "";
  if (digits.startsWith("00966")) digits = digits.slice(2);
  if (digits.startsWith("966")) return digits;
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 9 && digits.startsWith("5")) return `966${digits}`;
  if (digits.length === 10 && digits.startsWith("5")) return `966${digits.slice(0, 9)}`;
  return digits;
}

export function defaultGuardianMessage(opts: { guardian?: string; student?: string; school?: string }) {
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

export function whatsappLink(phone: unknown, message: string) {
  const number = normalizeSaudiPhone(phone);
  if (!number) return "";
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function referralMessage(opts: {
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
}) {
  const line = (label: string, value?: string) => (value && value.trim() ? `${label}: ${value.trim()}` : "");
  return [
    "السلام عليكم ورحمة الله وبركاته",
    opts.school ? `من التوجيه الطلابي بـ${opts.school}` : "من التوجيه الطلابي بالمدرسة",
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
    opts.counselor ? `الموجه الطلابي: ${opts.counselor}` : "",
    "شاكرين لكم تعاونكم.",
  ]
    .filter((item) => item !== "")
    .join("\n");
}

/** Opens WhatsApp with a message; when no number is given the user picks the chat inside WhatsApp. */
export function shareOnWhatsApp(message: string, phone?: unknown) {
  const number = normalizeSaudiPhone(phone);
  const url = number
    ? `https://wa.me/${number}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener");
}
