CREATE TABLE IF NOT EXISTS public.plan_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  seq text,
  task text,
  domain text,
  target_group text,
  term text,
  indicator text,
  exec_status text,
  doc_status text,
  required_evidence text,
  due_date date,
  done_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_plan_tasks" ON public.plan_tasks;
CREATE POLICY "own_plan_tasks" ON public.plan_tasks FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  program_no text,
  name text,
  ptype text,
  domain text,
  target_group text,
  term text,
  goal text,
  indicator text,
  start_date date,
  end_date date,
  exec_status text,
  beneficiaries integer,
  required_evidence text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_programs" ON public.programs;
CREATE POLICY "own_programs" ON public.programs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.school_settings
  ADD COLUMN IF NOT EXISTS show_counselor_on_documents boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_principal_on_documents boolean NOT NULL DEFAULT true;

ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS plan_task_id uuid REFERENCES public.plan_tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS programs_plan_task_id_idx ON public.programs(plan_task_id);
