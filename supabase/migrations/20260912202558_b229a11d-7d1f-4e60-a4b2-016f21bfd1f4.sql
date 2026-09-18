ALTER TABLE public.school_settings
ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'thaat'
CHECK (theme IN ('thaat', 'royal', 'sage', 'amber'));