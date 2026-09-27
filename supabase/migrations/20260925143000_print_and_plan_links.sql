-- جدول مهام خطة التوجيه الطلابي
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

-- جدول البرامج والأنشطة الإجرائية
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
  plan_task_id uuid REFERENCES public.plan_tasks(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_programs" ON public.programs;
CREATE POLICY "own_programs" ON public.programs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- تحديث جدول إعدادات المدرسة لإضافة خيارات ظهور الموجه ومدير المدرسة في المستندات
ALTER TABLE public.school_settings
  ADD COLUMN IF NOT EXISTS show_counselor_on_documents boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_principal_on_documents boolean NOT NULL DEFAULT true;

-- إضافة حقل الربط في جدول البرامج إذا لم يكن موجوداً مسبقاً (مع تفادي التكرار)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'programs' 
    AND column_name = 'plan_task_id'
  ) THEN
    ALTER TABLE public.programs
      ADD COLUMN plan_task_id uuid REFERENCES public.plan_tasks(id) ON DELETE SET NULL;
  END IF;
END $$;

-- إنشاء الفهارس لتحسين أداء الاستعلامات والبحث
CREATE INDEX IF NOT EXISTS programs_plan_task_id_idx ON public.programs(plan_task_id);
CREATE INDEX IF NOT EXISTS plan_tasks_user_id_idx ON public.plan_tasks(user_id);
CREATE INDEX IF NOT EXISTS programs_user_id_idx ON public.programs(user_id);
