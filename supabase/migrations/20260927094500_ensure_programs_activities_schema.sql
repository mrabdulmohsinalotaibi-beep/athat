-- Ensure the programs/activities feature is deploy-safe even when older database migrations
-- were partially applied or the tables already existed with an earlier schema.

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

ALTER TABLE public.plan_tasks ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();
ALTER TABLE public.plan_tasks ADD COLUMN IF NOT EXISTS seq text;
ALTER TABLE public.plan_tasks ADD COLUMN IF NOT EXISTS task text;
ALTER TABLE public.plan_tasks ADD COLUMN IF NOT EXISTS domain text;
ALTER TABLE public.plan_tasks ADD COLUMN IF NOT EXISTS target_group text;
ALTER TABLE public.plan_tasks ADD COLUMN IF NOT EXISTS term text;
ALTER TABLE public.plan_tasks ADD COLUMN IF NOT EXISTS indicator text;
ALTER TABLE public.plan_tasks ADD COLUMN IF NOT EXISTS exec_status text;
ALTER TABLE public.plan_tasks ADD COLUMN IF NOT EXISTS doc_status text;
ALTER TABLE public.plan_tasks ADD COLUMN IF NOT EXISTS required_evidence text;
ALTER TABLE public.plan_tasks ADD COLUMN IF NOT EXISTS due_date date;
ALTER TABLE public.plan_tasks ADD COLUMN IF NOT EXISTS done_date date;
ALTER TABLE public.plan_tasks ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.plan_tasks ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.plan_tasks ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

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
  plan_task_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS program_no text;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS ptype text;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS domain text;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS target_group text;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS term text;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS goal text;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS indicator text;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS exec_status text;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS beneficiaries integer;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS required_evidence text;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS plan_task_id uuid;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.programs
  DROP CONSTRAINT IF EXISTS programs_plan_task_id_fkey;
ALTER TABLE public.programs
  ADD CONSTRAINT programs_plan_task_id_fkey
  FOREIGN KEY (plan_task_id) REFERENCES public.plan_tasks(id) ON DELETE SET NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.programs TO authenticated;
GRANT ALL ON public.plan_tasks TO service_role;
GRANT ALL ON public.programs TO service_role;

ALTER TABLE public.plan_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_plan_tasks" ON public.plan_tasks;
CREATE POLICY "own_plan_tasks" ON public.plan_tasks
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_programs" ON public.programs;
CREATE POLICY "own_programs" ON public.programs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS plan_tasks_user_id_idx ON public.plan_tasks(user_id);
CREATE INDEX IF NOT EXISTS programs_user_id_idx ON public.programs(user_id);
CREATE INDEX IF NOT EXISTS programs_plan_task_id_idx ON public.programs(plan_task_id);


-- إعادة ضمان تحديث updated_at إذا كانت الجداول موجودة من ترحيل سابق.
DROP TRIGGER IF EXISTS trg_plan_tasks_updated ON public.plan_tasks;
CREATE TRIGGER trg_plan_tasks_updated BEFORE UPDATE ON public.plan_tasks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_programs_updated ON public.programs;
CREATE TRIGGER trg_programs_updated BEFORE UPDATE ON public.programs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
