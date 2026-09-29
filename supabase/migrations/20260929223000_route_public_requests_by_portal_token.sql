-- Route public guidance requests to the exact counselor portal.
-- The private blog token is unique to the counselor account and is therefore
-- safer than relying only on a mutable/public school slug.

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
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user uuid;
  requests_enabled boolean;
  new_no text;
BEGIN
  IF p_kind NOT IN ('استشارة فردية', 'إحالة طالب', 'إبلاغ سري') THEN
    RAISE EXCEPTION 'نوع الاستمارة غير معروف';
  END IF;

  IF length(trim(coalesce(p_details, ''))) < 10 THEN
    RAISE EXCEPTION 'يرجى كتابة تفاصيل أوضح للطلب';
  END IF;

  -- Prefer the portal token because it identifies exactly the counselor page
  -- from which the visitor opened the form.
  IF nullif(trim(coalesce(p_portal_token, '')), '') IS NOT NULL THEN
    SELECT s.user_id, coalesce(s.public_requests_enabled, true)
      INTO target_user, requests_enabled
    FROM public.school_settings s
    WHERE s.private_blog_token = trim(p_portal_token)
    ORDER BY s.updated_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  -- Backward-compatible fallback for older shared links.
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
  RETURNING request_no INTO new_no;

  RETURN new_no;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_public_request_v2(
  text,text,text,text,text,text,text,text,text,text,text,boolean,text,text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.submit_public_request_v2(
  text,text,text,text,text,text,text,text,text,text,text,boolean,text,text
) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
