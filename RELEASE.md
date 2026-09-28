# Release runbook — منصة الذات

## مسار الإنتاج

المشروع يستخدم TanStack Start + Nitro، ومخرج Cloudflare Pages يتم بناؤه بالأمر:

```bash
NITRO_PRESET=cloudflare-pages npm run build
```

مشروع Cloudflare Pages يجب أن يكون متصلاً مباشرة بالمستودع:
`mrabdulmohsinalotaibi-beep/athat`

وفرع الإنتاج هو:
`main`

يوجد فحص آلي في:
`.github/workflows/cloudflare-pages.yml`

ويتحقق من وجود:
- `dist/_worker.js`
- `dist/_routes.json`
- `dist`

## متغيرات الإنتاج

### عامة / اتصال Supabase
- `SUPABASE_URL`
- `SUPABASE_PROJECT_ID`
- `SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

### خادمية فقط
- `SUPABASE_SERVICE_ROLE_KEY`
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_MODEL`
- `LOVABLE_CRON_SECRET`
- `LOVABLE_CRON_SECRET_PREVIOUS`

لا يجوز تعريض الأسرار الخادمية ببادئة `VITE_`.

## بوابة الإصدار

لا يُعلن الإصدار Production Ready إلا بعد:

1. نجاح `npm ci`.
2. نجاح `NITRO_PRESET=cloudflare-pages npm run build`.
3. نجاح Workflow الخاص بـCloudflare Pages على `main`.
4. فتح الدومين الإنتاجي والتحقق من manifest وService Worker.
5. تسجيل الدخول بحساب اختبار.
6. إنشاء طالب تجريبي ثم حالة ثم جلسة ثم شاهد.
7. إنشاء PDF رسمي والتحقق من A4.
8. اختبار حساب ثانٍ والتأكد من عدم ظهور بيانات الحساب الأول.
9. اختبار الطلب العام والتأكد أن الزائر لا يستطيع قراءة صندوق الطلبات.
10. التحقق من الشعار والأيقونات النهائية على الويب وPWA.

## مشكلة GitHub Actions الحالية

إذا كان `main` لا يعرض أي Workflow Runs رغم وجود ملفات workflow صحيحة، افتح:
GitHub repository → Settings → Actions → General

وتأكد من السماح بتشغيل Actions لهذا المستودع. بعد تفعيلها، شغّل
`Verify Cloudflare Pages Build` يدويًا عبر `workflow_dispatch` أو ادفع commit جديدًا إلى `main`.

## قاعدة البيانات

لا تطبق migrations على الإنتاج لمجرد النشر. أي migration جديدة تُراجع منفصلة، ويجب ألا تحتوي حذف جداول أو أعمدة أو بيانات دون خطة ترحيل ونسخة احتياطية.


<!-- آخر محاولة تشغيل تلقائي للـBuild: 2026-09-29 -->
