# منشور التوجيه الطلابي A4

## الملفات

### 1) WeeklyGuidancePoster.tsx

المسار:

`src/components/WeeklyGuidancePoster.tsx`

استبدل المكوّن الحالي `WeeklyGuidancePoster` بهذا الملف.

### 2) deepseek.functions.ts

لا تستبدل الملف الحالي بالكامل الآن.

افتح:

`src/lib/deepseek.functions.ts`

وتأكد أن `draftWeeklyGuidance` يعيد:

- title
- intro
- body
- reminder
- theme

تفاصيل الـPrompt موجودة في:

`src/lib/README-DEEPSEEK.md`

## شعار وزارة التعليم

يجب أن يكون الملف:

`src/assets/moe-logo-official.png`

وإذا كان الاسم أو المسار مختلفاً عندك، عدّل سطر import في المكوّن:

```ts
import moeLogo from "@/assets/moe-logo-official.png";
```

## الأدوات المطلوبة

المكوّن يستخدم الحزم الموجودة غالباً في مشروعك:

- html-to-image
- lucide-react
- sonner

إذا كانت غير موجودة:

```bash
npm install html-to-image lucide-react sonner
```

## PDF

المكوّن يستدعي:

```ts
import { elementToPdf } from "@/lib/pdf";
```

لذلك يجب أن يبقى ملف:

`src/lib/pdf.ts`

موجوداً في المشروع.

## وظائف المنشور

- A4 Portrait
- طباعة A4
- PNG عالي الدقة
- PDF
- مشاركة من Android عبر Web Share
- فتح WhatsApp كحل احتياطي
- النصوص تبدأ فارغة
- الذكاء الاصطناعي يختار لوحة الألوان
- شعار وزارة التعليم فقط في الكليشة
- الذات - منصة التوجيه الطلابي
- الحقوق في أسفل الصفحة

## ملاحظة مهمة

إذا ظهر خطأ TypeScript في `React.CSSProperties`، أضف:

```ts
import type { CSSProperties } from "react";
```

ثم استبدل:

```ts
as React.CSSProperties
```

بـ:

```ts
as CSSProperties
```

## GitHub

إذا كنت تستخدم GitHub مباشرة:

1. افتح المستودع.
2. افتح `src`.
3. افتح `components`.
4. افتح `WeeklyGuidancePoster.tsx`.
5. Replace / Edit واستبدل محتواه بالكود الموجود في الملف.
6. Commit changes.

ثم:

1. افتح `src/lib/deepseek.functions.ts`.
2. لا تستبدله بالكامل.
3. عدّل `draftWeeklyGuidance` بحيث يعيد `theme` بالإضافة إلى النصوص.
4. ارفع التعديل.

إذا كنت تستخدم Lovable، من الأفضل ربط المشروع بـ GitHub ثم إجراء التعديل في GitHub أو عبر Lovable مع الحفاظ على نفس مسارات الملفات.
