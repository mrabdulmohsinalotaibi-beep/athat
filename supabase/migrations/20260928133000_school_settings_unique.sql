-- ضمان سجل إعدادات واحد لكل موجه، حتى يعمل زر الحفظ بثبات ولا تتكرر بيانات المدرسة.
DO $$
BEGIN
  DELETE FROM public.school_settings a
  USING public.school_settings b
  WHERE a.user_id = b.user_id
    AND a.updated_at < b.updated_at;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS school_settings_user_id_unique
  ON public.school_settings (user_id);
