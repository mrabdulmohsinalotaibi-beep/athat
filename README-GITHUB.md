# منشور التوجيه الطلابي — النسخة النهائية

## 1. ملف الواجهة

استبدل محتوى:

`src/components/WeeklyGuidancePoster.tsx`

بالملف الموجود في:

`src/components/WeeklyGuidancePoster.tsx`

## 2. ملف الذكاء الاصطناعي

استبدل محتوى:

`src/lib/deepseek.functions.ts`

بالملف الموجود في:

`src/lib/deepseek.functions.ts`

تم تعديل التكامل بحيث:

- الواجهة ترسل `topic` و `tone`.
- DeepSeek/Lovable AI يعيد `title / intro / body / reminder / theme`.
- الذكاء الاصطناعي يختار ThemeKey فقط.
- الواجهة تحول ThemeKey إلى لوحة ألوان ثابتة ومتناسقة.
- لا توجد ألوان عشوائية أو أكواد ألوان قد ينتجها الذكاء الاصطناعي.
- المحتوى الافتراضي فارغ.

## 3. شعار وزارة التعليم

يجب أن يكون موجوداً:

`src/assets/moe-logo-official.png`

إذا كان اسم ملف الشعار مختلفاً، عدّل:

```ts
import moeLogo from "@/assets/moe-logo-official.png";
```

## 4. ملف PDF

يجب أن يبقى:

`src/lib/pdf.ts`

لأن زر PDF يستدعي:

```ts
elementToPdf(...)
```

## 5. الحزم

إذا لم تكن مثبتة:

```bash
npm install html-to-image lucide-react sonner
```

## 6. الوظائف

النسخة الجديدة تشمل:

- مقاس A4 عمودي.
- كليشة علوية احترافية.
- شعار وزارة التعليم فقط في المنتصف.
- اسم الوزارة والإدارة والمدرسة أسفل الشعار.
- عنوان "التوجيه الطلابي".
- إطار داخلي مشابه للتصميم المرفق.
- علامة مائية خفيفة.
- لون النص يتغير تلقائياً حسب موضوع التوجيه.
- الذكاء الاصطناعي يختار الثيم.
- النصوص تبدأ فارغة.
- اختيار أسلوب الصياغة.
- حفظ PNG بدقة عالية.
- PDF.
- طباعة A4.
- مشاركة عبر مشاركة النظام في Android/iOS، مع إمكانية اختيار WhatsApp.
- فتح WhatsApp كحل احتياطي في المتصفحات التي لا تدعم مشاركة الملفات.
- `الذات - منصة التوجيه الطلابي`.
- `جميع الحقوق محفوظة لـ Abdulmo7sin Alotaibi`.

## 7. الرفع إلى GitHub

في GitHub:

### الملف الأول

```text
src/components/WeeklyGuidancePoster.tsx
```

افتحه ثم Edit واستبدل الكود بالكامل.

### الملف الثاني

```text
src/lib/deepseek.functions.ts
```

افتحه ثم Edit واستبدل الكود بالكامل.

ثم اضغط:

`Commit changes`

بعدها انتظر إعادة بناء المشروع إذا كنت تستخدم Lovable أو منصة نشر مرتبطة بـ GitHub.

## 8. نقطة مهمة

لا تغيّر:

```text
LOVABLE_API_KEY
```

ولا تضع مفتاح الذكاء الاصطناعي داخل React أو داخل ملف الواجهة.

يبقى المفتاح في بيئة الخادم/Secrets كما هو في مشروعك الحالي.

## 9. إذا كان المشروع Lovable

إذا كان GitHub مربوطاً بـ Lovable، يمكنك أيضاً استخدام Lovable بعد رفع الملفات ليعيد بناء المشروع.

المسارات يجب أن تبقى كما هي:

```text
src/
├── components/
│   └── WeeklyGuidancePoster.tsx
├── lib/
│   ├── deepseek.functions.ts
│   └── pdf.ts
└── assets/
    └── moe-logo-official.png
```
