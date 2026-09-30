CREATE TABLE IF NOT EXISTS public.app_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.app_admins TO authenticated;
GRANT ALL ON public.app_admins TO service_role;

DROP POLICY IF EXISTS "admins_read_own_admin_record" ON public.app_admins;
CREATE POLICY "admins_read_own_admin_record"
ON public.app_admins
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.is_app_admin(p_user uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.app_admins a
    WHERE a.user_id = p_user
      AND a.role IN ('owner', 'admin')
  );
$$;

REVOKE ALL ON FUNCTION public.is_app_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_app_admin(uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS public.global_app_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  site_name text NOT NULL DEFAULT 'الذات',
  announcement text,
  maintenance_mode boolean NOT NULL DEFAULT false,
  feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.global_app_settings (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.global_app_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.global_app_settings TO anon, authenticated;
GRANT UPDATE ON public.global_app_settings TO authenticated;
GRANT ALL ON public.global_app_settings TO service_role;

DROP POLICY IF EXISTS "everyone_reads_global_app_settings" ON public.global_app_settings;
CREATE POLICY "everyone_reads_global_app_settings"
ON public.global_app_settings
FOR SELECT TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "admins_update_global_app_settings" ON public.global_app_settings;
CREATE POLICY "admins_update_global_app_settings"
ON public.global_app_settings
FOR UPDATE TO authenticated
USING (public.is_app_admin(auth.uid()))
WITH CHECK (public.is_app_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;

DROP POLICY IF EXISTS "admins_read_audit_log" ON public.admin_audit_log;
CREATE POLICY "admins_read_audit_log"
ON public.admin_audit_log
FOR SELECT TO authenticated
USING (public.is_app_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.log_global_app_settings_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  INSERT INTO public.admin_audit_log (actor_id, action, details)
  VALUES (
    auth.uid(),
    'global_app_settings_updated',
    jsonb_build_object(
      'maintenance_mode', NEW.maintenance_mode,
      'feature_flags', NEW.feature_flags,
      'announcement', NEW.announcement
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_global_app_settings_audit ON public.global_app_settings;
CREATE TRIGGER trg_global_app_settings_audit
BEFORE UPDATE ON public.global_app_settings
FOR EACH ROW EXECUTE FUNCTION public.log_global_app_settings_change();
