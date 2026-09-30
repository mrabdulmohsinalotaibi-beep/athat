-- ============= 1) school_settings: أعمدة الملف التعريفي والطلبات =============
ALTER TABLE public.school_settings
  ADD COLUMN IF NOT EXISTS public_requests_enabled boolean NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS vision text NULL,
  ADD COLUMN IF NOT EXISTS mission text NULL,
  ADD COLUMN IF NOT EXISTS announcement text NULL,
  ADD COLUMN IF NOT EXISTS contact_email text NULL,
  ADD COLUMN IF NOT EXISTS contact_phone text NULL,
  ADD COLUMN IF NOT EXISTS office_hours text NULL;

-- ============= 2) جدول الطلبات العامة =============
CREATE SEQUENCE IF NOT EXISTS public.public_requests_no_seq START 1;

CREATE TABLE IF NOT EXISTS public.public_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_no text NOT NULL DEFAULT 'طلب #' || lpad(nextval('public.public_requests_no_seq')::text, 4, '0'),
  kind text NOT NULL,
  requester_name text,
  requester_role text,
  requester_contact text,
  student_name text,
  student_grade text,
  classroom text,
  topic text,
  urgency text NOT NULL DEFAULT 'عادي',
  preferred_time text,
  details text NOT NULL,
  is_anonymous boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'جديد',
  linked_table text,
  linked_record_id uuid,
  counselor_notes text,
  handled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.public_requests TO authenticated;
GRANT ALL ON public.public_requests TO service_role;

ALTER TABLE public.public_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_requests_select_own" ON public.public_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "public_requests_update_own" ON public.public_requests
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "public_requests_delete_own" ON public.public_requests
  FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS trg_public_requests_updated ON public.public_requests;
CREATE TRIGGER trg_public_requests_updated BEFORE UPDATE ON public.public_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.public_requests;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============= 3) دوال الاستقبال العام =============
CREATE OR REPLACE FUNCTION public.submit_public_request(
  p_kind text,
  p_details text,
  p_requester_name text DEFAULT NULL,
  p_requester_role text DEFAULT NULL,
  p_requester_contact text DEFAULT NULL,
  p_student_name text DEFAULT NULL,
  p_student_grade text DEFAULT NULL,
  p_classroom text DEFAULT NULL,
  p_topic text DEFAULT NULL,
  p_urgency text DEFAULT 'عادي',
  p_preferred_time text DEFAULT NULL,
  p_is_anonymous boolean DEFAULT false,
  p_slug text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_user uuid;
  new_no text;
BEGIN
  IF length(trim(coalesce(p_details, ''))) < 3 THEN
    RAISE EXCEPTION 'التفاصيل قصيرة جداً';
  END IF;

  SELECT s.user_id INTO target_user
  FROM public.school_settings s
  WHERE s.public_slug IS NOT NULL AND s.public_slug <> ''
    AND s.public_slug = lower(trim(coalesce(p_slug, '')))
  ORDER BY s.created_at ASC
  LIMIT 1;

  IF target_user IS NULL THEN
    RAISE EXCEPTION 'لم يتم تفعيل استقبال الطلبات لهذه المدرسة بعد.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.school_settings
    WHERE user_id = target_user AND public_requests_enabled = false
  ) THEN
    RAISE EXCEPTION 'استقبال الطلبات متوقف حالياً لدى المدرسة.';
  END IF;

  INSERT INTO public.public_requests(
    user_id, kind, requester_name, requester_role, requester_contact,
    student_name, student_grade, classroom, topic, urgency, preferred_time,
    details, is_anonymous
  ) VALUES (
    target_user,
    left(trim(coalesce(p_kind, 'طلب')), 80),
    CASE WHEN p_is_anonymous THEN NULL ELSE nullif(left(trim(coalesce(p_requester_name, '')), 120), '') END,
    nullif(left(trim(coalesce(p_requester_role, '')), 80), ''),
    CASE WHEN p_is_anonymous THEN NULL ELSE nullif(left(trim(coalesce(p_requester_contact, '')), 160), '') END,
    nullif(left(trim(coalesce(p_student_name, '')), 120), ''),
    nullif(left(trim(coalesce(p_student_grade, '')), 80), ''),
    nullif(left(trim(coalesce(p_classroom, '')), 80), ''),
    nullif(left(trim(coalesce(p_topic, '')), 120), ''),
    left(trim(coalesce(p_urgency, 'عادي')), 20),
    nullif(left(trim(coalesce(p_preferred_time, '')), 120), ''),
    left(trim(p_details), 5000),
    coalesce(p_is_anonymous, false)
  )
  RETURNING request_no INTO new_no;

  RETURN new_no;
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_public_request_v2(
  p_kind text,
  p_details text,
  p_requester_name text DEFAULT NULL,
  p_requester_role text DEFAULT NULL,
  p_requester_contact text DEFAULT NULL,
  p_student_name text DEFAULT NULL,
  p_student_grade text DEFAULT NULL,
  p_classroom text DEFAULT NULL,
  p_topic text DEFAULT NULL,
  p_urgency text DEFAULT 'عادي',
  p_preferred_time text DEFAULT NULL,
  p_is_anonymous boolean DEFAULT false,
  p_slug text DEFAULT NULL,
  p_portal_token text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_user uuid;
  new_no text;
BEGIN
  IF length(trim(coalesce(p_details, ''))) < 3 THEN
    RAISE EXCEPTION 'التفاصيل قصيرة جداً';
  END IF;

  IF p_portal_token IS NOT NULL AND trim(p_portal_token) <> '' THEN
    SELECT s.user_id INTO target_user
    FROM public.school_settings s
    WHERE s.private_blog_token = trim(p_portal_token)
    ORDER BY s.created_at ASC
    LIMIT 1;
  END IF;

  IF target_user IS NULL AND p_slug IS NOT NULL AND trim(p_slug) <> '' THEN
    SELECT s.user_id INTO target_user
    FROM public.school_settings s
    WHERE s.public_slug IS NOT NULL AND s.public_slug <> ''
      AND s.public_slug = lower(trim(p_slug))
    ORDER BY s.created_at ASC
    LIMIT 1;
  END IF;

  IF target_user IS NULL THEN
    RAISE EXCEPTION 'لم يتم تفعيل استقبال الطلبات لهذه المدرسة بعد.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.school_settings
    WHERE user_id = target_user AND public_requests_enabled = false
  ) THEN
    RAISE EXCEPTION 'استقبال الطلبات متوقف حالياً لدى المدرسة.';
  END IF;

  INSERT INTO public.public_requests(
    user_id, kind, requester_name, requester_role, requester_contact,
    student_name, student_grade, classroom, topic, urgency, preferred_time,
    details, is_anonymous
  ) VALUES (
    target_user,
    left(trim(coalesce(p_kind, 'طلب')), 80),
    CASE WHEN p_is_anonymous THEN NULL ELSE nullif(left(trim(coalesce(p_requester_name, '')), 120), '') END,
    nullif(left(trim(coalesce(p_requester_role, '')), 80), ''),
    CASE WHEN p_is_anonymous THEN NULL ELSE nullif(left(trim(coalesce(p_requester_contact, '')), 160), '') END,
    nullif(left(trim(coalesce(p_student_name, '')), 120), ''),
    nullif(left(trim(coalesce(p_student_grade, '')), 80), ''),
    nullif(left(trim(coalesce(p_classroom, '')), 80), ''),
    nullif(left(trim(coalesce(p_topic, '')), 120), ''),
    left(trim(coalesce(p_urgency, 'عادي')), 20),
    nullif(left(trim(coalesce(p_preferred_time, '')), 120), ''),
    left(trim(p_details), 5000),
    coalesce(p_is_anonymous, false)
  )
  RETURNING request_no INTO new_no;

  RETURN new_no;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_guidance_profile(p_slug text)
RETURNS TABLE(
  school_name text,
  education_dept text,
  counselor_name text,
  logo_url text,
  vision text,
  mission text,
  announcement text,
  contact_email text,
  contact_phone text,
  office_hours text,
  requests_enabled boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    s.school_name,
    s.education_dept,
    s.counselor_name,
    s.logo_url,
    s.vision,
    s.mission,
    s.announcement,
    s.contact_email,
    s.contact_phone,
    s.office_hours,
    COALESCE(s.public_requests_enabled, true)
  FROM public.school_settings s
  WHERE s.public_slug IS NOT NULL AND s.public_slug <> ''
    AND s.public_slug = lower(trim(p_slug))
  LIMIT 1
$function$;

GRANT EXECUTE ON FUNCTION public.submit_public_request(text, text, text, text, text, text, text, text, text, text, text, boolean, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_request_v2(text, text, text, text, text, text, text, text, text, text, text, boolean, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_guidance_profile(text) TO anon, authenticated;