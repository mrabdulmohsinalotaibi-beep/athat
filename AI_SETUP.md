# تفعيل Gemini بأمان

يستخدم الموقع وظيفة Supabase باسم `ai-assist` حتى لا يظهر مفتاح Gemini في المتصفح أو مستودع GitHub.

## إعداد المفتاح

من لوحة Supabase افتح **Project Settings → Edge Functions → Secrets**، ثم أضف السر التالي:

- الاسم: `GEMINI_API_KEY`
- القيمة: مفتاح Gemini الخاص بالمشروع

بعد تطبيق migration `supabase/migrations/20260918194000_feedback_and_ai.sql` ونشر وظيفة `supabase/functions/ai-assist/index.ts` ستعمل أزرار **المساعدة الذكية** في صفحة الآراء والتوجيه الأسبوعي.

لا تضع المفتاح في `.env` المرفوع أو داخل ملفات TypeScript أو GitHub. إذا سبق نشر المفتاح في مكان عام، أنشئ مفتاحًا جديدًا من Google AI Studio وألغِ القديم.
