-- Staging ledger for safe, auditable Noor transfers.
-- This records prepared/manual submissions; it never bypasses Noor security controls.
CREATE TABLE IF NOT EXISTS public.noor_export_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  source_table text NOT NULL CHECK (source_table IN ('counseling_cases', 'interviews', 'behavior', 'students')),
  source_id uuid NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'paused', 'submitted', 'failed')),
  noor_reference text,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  pause_reason text,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_table, source_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.noor_export_jobs TO authenticated;
GRANT ALL ON public.noor_export_jobs TO service_role;
ALTER TABLE public.noor_export_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_noor_export_jobs" ON public.noor_export_jobs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS noor_export_jobs_user_status_idx
  ON public.noor_export_jobs (user_id, status, updated_at DESC);

DROP TRIGGER IF EXISTS trg_noor_export_jobs_updated ON public.noor_export_jobs;
CREATE TRIGGER trg_noor_export_jobs_updated
  BEFORE UPDATE ON public.noor_export_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
