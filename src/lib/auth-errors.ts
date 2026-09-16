/** Maps Supabase auth error messages to clear Arabic text. */
export function arabicAuthError(message: string): string {
  const m = message.toLowerCase();

  if (m.includes("invalid login credentials")) return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
  if (m.includes("email not confirmed")) return "لم يتم تأكيد البريد الإلكتروني بعد. تفقّد بريدك.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "هذا البريد مسجّل مسبقاً. استخدم تسجيل الدخول بدلاً من إنشاء حساب.";
  if (m.includes("password should be at least")) return "كلمة المرور قصيرة جداً، استخدم 6 أحرف على الأقل.";
  if (m.includes("unable to validate email") || m.includes("invalid email")) return "صيغة البريد الإلكتروني غير صحيحة.";
  if (m.includes("rate limit") || m.includes("too many")) return "تم تجاوز عدد المحاولات المسموح، حاول بعد قليل.";
  if (m.includes("signups not allowed") || m.includes("signup is disabled"))
    return "تسجيل الحسابات الجديدة غير متاح حالياً.";
  if (m.includes("provider is not enabled") || m.includes("unsupported provider"))
    return "طريقة تسجيل الدخول هذه غير مفعلة حالياً.";
  if (m.includes("network") || m.includes("failed to fetch"))
    return "تعذّر الاتصال بالخادم. تحقق من اتصال الإنترنت وحاول مجدداً.";
  if (m.includes("weak password")) return "كلمة المرور ضعيفة، اختر كلمة أقوى.";

  // الإضافات الجديدة المقترحة لتغطية حالات الروابط والصلاحيات:
  if (m.includes("expired") || m.includes("token has expired"))
    return "انتهت صلاحية الرابط أو رمز التحقق، يرجى طلب رابط جديد.";
  if (m.includes("same password") || m.includes("different from the old password"))
    return "كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور الحالية.";

  return "تعذّر إتمام العملية. " + message;
}
