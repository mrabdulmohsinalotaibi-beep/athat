ALTER TABLE public.school_settings
  ADD COLUMN IF NOT EXISTS counselor_signature text,
  ADD COLUMN IF NOT EXISTS principal_signature text;

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS summary text;