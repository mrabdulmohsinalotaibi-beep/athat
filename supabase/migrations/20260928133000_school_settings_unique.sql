-- ضمان سجل إعدادات واحد لكل موجه، حتى يعمل زر الحفظ بثبات ولا تتكرر بيانات المدرسة.
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id
      ORDER BY updated_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM public.school_settings
  WHERE user_id IS NOT NULL
)
DELETE FROM public.school_settings s
USING ranked r
WHERE s.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS school_settings_user_id_unique
  ON public.school_settings (user_id);
