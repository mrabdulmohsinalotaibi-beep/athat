-- Reconcile the live Lovable Cloud schema with the generated client types.
-- Additive only: no existing rows are deleted or reassigned.

ALTER TABLE public.noor_export_jobs
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;

ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS plan_task_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'programs_plan_task_id_fkey'
      AND conrelid = 'public.programs'::regclass
  ) THEN
    ALTER TABLE public.programs
      ADD CONSTRAINT programs_plan_task_id_fkey
      FOREIGN KEY (plan_task_id)
      REFERENCES public.plan_tasks(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

ALTER TABLE public.school_settings
  ADD COLUMN IF NOT EXISTS ministry_logo_url text,
  ADD COLUMN IF NOT EXISTS show_counselor_on_documents boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_principal_on_documents boolean NOT NULL DEFAULT true;
