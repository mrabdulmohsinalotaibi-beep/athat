-- Counselor portal v2: privacy-safe request tracking.
-- Additive only: no existing requests are deleted or rewritten beyond assigning
-- a random tracking code where one does not already exist.

ALTER TABLE public.public_requests
  ADD COLUMN IF NOT EXISTS tracking_code text;

UPDATE public.public_requests
SET tracking_code = encode(extensions.gen_random_bytes(6), 'hex')
WHERE tracking_code IS NULL OR trim(tracking_code) = '';

ALTER TABLE public.public_requests
  ALTER COLUMN tracking_code SET DEFAULT encode(extensions.gen_random_bytes(6), 'hex');

CREATE UNIQUE INDEX IF NOT EXISTS public_requests_tracking_code_key
  ON public.public_requests (tracking_code);

CREATE OR REPLACE FUNCTION public.submit_public_request_v3(
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
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  target_user uuid;
  requests_enabled boolean;
  new_no text;
  new_tracking_code text;
BEGIN
  IF p_kind NOT IN ('استشارة فردية', 'إحالة طالب', 'إبلاغ سري') THEN
    RAISE EXCEPTION 'نوع الاستمارة غير معروف';
  END IF;

  IF length(trim(coalesce(p_details, ''))) < 10 THEN
    RAISE EXCEPTION 'يرجى كتابة تفاصيل أوضح للطلب';
  END IF;

  IF nullif(trim(coalesce(p_portal_token, '')), '') IS NOT NULL THEN
    SELECT s.user_id, coalesce(s.public_requests_enabled, true)
      INTO target_user, requests_enabled
    FROM public.school_settings s
    WHERE s.private_blog_token = trim(p_portal_token)
    ORDER BY s.updated_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  IF target_user IS NULL AND nullif(trim(coalesce(p_slug, '')), '') IS NOT NULL THEN
    SELECT s.user_id, coalesce(s.public_requests_enabled, true)
      INTO target_user, requests_enabled
    FROM public.school_settings s
    WHERE s.public_slug = trim(p_slug)
    ORDER BY s.updated_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  IF target_user IS NULL THEN
    RAISE EXCEPTION 'تعذر تحديد الموجه المستلم. افتح الاستمارة من رابط مدونة الموجه مرة أخرى';
  END IF;

  IF requests_enabled IS FALSE THEN
    RAISE EXCEPTION 'استقبال الطلبات متوقف حالياً';
  END IF;

  INSERT INTO public.public_requests (
    user_id, kind, requester_name, requester_role, requester_contact,
    student_name, student_grade, classroom, topic, urgency,
    preferred_time, details, is_anonymous
  ) VALUES (
    target_user,
    p_kind,
    CASE WHEN coalesce(p_is_anonymous,false) THEN NULL ELSE nullif(left(trim(coalesce(p_requester_name,'')),120),'') END,
    nullif(left(trim(coalesce(p_requester_role,'')),80),''),
    CASE WHEN coalesce(p_is_anonymous,false) THEN NULL ELSE nullif(left(trim(coalesce(p_requester_contact,'')),160),'') END,
    nullif(left(trim(coalesce(p_student_name,'')),120),''),
    nullif(left(trim(coalesce(p_student_grade,'')),80),''),
    nullif(left(trim(coalesce(p_classroom,'')),80),''),
    nullif(left(trim(coalesce(p_topic,'')),120),''),
    CASE WHEN p_urgency IN ('عادي','مهم','عاجل') THEN p_urgency ELSE 'عادي' END,
    nullif(left(trim(coalesce(p_preferred_time,'')),120),''),
    left(trim(p_details),5000),
    coalesce(p_is_anonymous,false)
  )
  RETURNING request_no, tracking_code INTO new_no, new_tracking_code;

  RETURN jsonb_build_object(
    'request_no', new_no,
    'tracking_code', new_tracking_code
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_public_request_v3(
  text,text,text,text,text,text,text,text,text,text,text,boolean,text,text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_request_v3(
  text,text,text,text,text,text,text,text,text,text,text,boolean,text,text
) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_request_status(
  p_request_no text,
  p_tracking_code text
) RETURNS TABLE (
  request_no text,
  kind text,
  topic text,
  status text,
  created_at timestamptz,
  handled_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.request_no, r.kind, r.topic, r.status, r.created_at, r.handled_at
  FROM public.public_requests r
  WHERE r.request_no = trim(p_request_no)
    AND r.tracking_code = lower(trim(p_tracking_code))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_request_status(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_request_status(text,text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
