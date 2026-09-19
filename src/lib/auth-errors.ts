/** Maps Supabase email-auth errors to clear Arabic text. */
export function arabicAuthError(message: string): string {
  const m = message.toLowerCase();

  if (m.includes("invalid login credentials")) return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
  if (m.includes("email not confirmed")) return "لم يتم تأكيد البريد الإلكتروني بعد. تفقّد بريدك.";
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "هذا البريد مسجّل مسبقاً. استخدم تسجيل الدخول بدلاً من إنشاء حساب.";
  }
  if (m.includes("password should be at least") || m.includes("weak password")) {
    return "كلمة المرور قصيرة جداً، استخدم 8 أحرف على الأقل.";
  }
  if (m.includes("unable to validate email") || m.includes("invalid email")) {
    return "صيغة البريد الإلكتروني غير صحيحة.";
  }
  if (
    m.includes("email rate limit") ||
    m.includes("email send rate limit") ||
    m.includes("rate limit")
  ) {
    return "تم إرسال عدد كبير من الرسائل. انتظر قليلاً ثم أعد المحاولة.";
  }
  if (m.includes("signups not allowed") || m.includes("signup is disabled")) {
    return "تسجيل الحسابات الجديدة غير متاح حالياً.";
  }
  if (m.includes("recovery session missing")) {
    return "انتهت صلاحية رابط الاستعادة أو لم يكتمل فتحه. اطلب رابط استعادة جديداً وافتحه من نفس المتصفح.";
  }
  if (m.includes("expired") || m.includes("token has expired")) {
    return "انتهت صلاحية الرابط. اطلب رابط استعادة جديداً.";
  }
  if (m.includes("same password") || m.includes("different from the old password")) {
    return "كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور الحالية.";
  }
  if (m.includes("network") || m.includes("failed to fetch")) {
    return "تعذّر الاتصال بالخادم. تحقق من اتصال الإنترنت وحاول مجدداً.";
  }

  return "تعذّر إتمام العملية. " + message;
}
