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
