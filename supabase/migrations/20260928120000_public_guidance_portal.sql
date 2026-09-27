-- بوابة التوجيه الطلابي العامة:
-- صفحات تعريفية عامة + استمارات تفاعلية (استشارة فردية، إحالة طالب، إبلاغ سري)
-- تصل مباشرة إلى صندوق الطلبات في لوحة تحكم الموجه الطلابي.

-- 1) بيانات الكليشة الرسمية والمحتوى العام في إعدادات المدرسة
ALTER TABLE public.school_settings
  ADD COLUMN IF NOT EXISTS ministry_logo_url text,
  ADD COLUMN IF NOT EXISTS vision text,
  ADD COLUMN IF NOT EXISTS mission text,
  ADD COLUMN IF NOT EXISTS announcement text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS office_hours text,
  ADD COLUMN IF NOT EXISTS public_requests_enabled boolean NOT NULL DEFAULT true;

-- 2) جدول الطلبات الواردة من الاستمارات العامة
CREATE SEQUENCE IF NOT EXISTS public.public_requests_no_seq;

CREATE TABLE IF NOT EXISTS public.public_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  request_no text,
  kind text NOT NULL CHECK (kind IN ('استشارة فردية', 'إحالة طالب', 'إبلاغ سري')),
  requester_name text,
  requester_role text,
  requester_contact text,
  student_name text,
  student_grade text,
  classroom text,
  topic text,
  urgency text NOT NULL DEFAULT 'عادي' CHECK (urgency IN ('عادي', 'مهم', 'عاجل')),
  preferred_time text,
  details text NOT NULL,
  is_anonymous boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'جديد' CHECK (status IN ('جديد', 'قيد المعالجة', 'تم التحويل لحالة', 'مغلق')),
  counselor_notes text,
  handled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_public_request_no()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.request_no IS NULL OR length(trim(NEW.request_no)) = 0 THEN
    NEW.request_no :=
      to_char(now(), 'YYMM') || '-' || lpad(nextval('public.public_requests_no_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_public_requests_no ON public.public_requests;
CREATE TRIGGER trg_public_requests_no
  BEFORE INSERT ON public.public_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_public_request_no();

DROP TRIGGER IF EXISTS trg_public_requests_updated ON public.public_requests;
CREATE TRIGGER trg_public_requests_updated
  BEFORE UPDATE ON public.public_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS public_requests_user_created_idx
  ON public.public_requests (user_id, created_at DESC);

ALTER TABLE public.public_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.public_requests TO authenticated;
GRANT ALL ON public.public_requests TO service_role;

-- الموجه يرى ويدير طلباته فقط؛ ولا يوجد أي وصول قراءة للزوار.
DROP POLICY IF EXISTS "own_public_requests" ON public.public_requests;
CREATE POLICY "own_public_requests" ON public.public_requests
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3) الملف التعريفي العام للتوجيه الطلابي (بدون أي بيانات سرية)
CREATE OR REPLACE FUNCTION public.get_guidance_profile(p_slug text DEFAULT NULL)
RETURNS TABLE (
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
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.school_name,
         s.education_dept,
         s.counselor_name,
         s.logo_url,
         s.vision,
         s.mission,
         s.announcement,
         s.contact_email,
         s.contact_phone,
         s.office_hours,
         s.public_requests_enabled
  FROM public.school_settings s
  WHERE p_slug IS NULL OR trim(p_slug) = '' OR s.public_slug = trim(p_slug)
  ORDER BY s.updated_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_guidance_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_guidance_profile(text) TO anon, authenticated;

-- 4) استقبال الاستمارات العامة من الزوار (إدراج فقط، بلا أي قراءة)
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
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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

  SELECT s.user_id, s.public_requests_enabled
    INTO target_user, requests_enabled
  FROM public.school_settings s
  WHERE p_slug IS NULL OR trim(p_slug) = '' OR s.public_slug = trim(p_slug)
  ORDER BY s.updated_at DESC
  LIMIT 1;

  IF target_user IS NULL THEN
    RAISE EXCEPTION 'لم يتم تفعيل استقبال الطلبات بعد';
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
    nullif(left(trim(coalesce(p_requester_name, '')), 120), ''),
    nullif(left(trim(coalesce(p_requester_role, '')), 80), ''),
    nullif(left(trim(coalesce(p_requester_contact, '')), 160), ''),
    nullif(left(trim(coalesce(p_student_name, '')), 120), ''),
    nullif(left(trim(coalesce(p_student_grade, '')), 80), ''),
    nullif(left(trim(coalesce(p_classroom, '')), 80), ''),
    nullif(left(trim(coalesce(p_topic, '')), 120), ''),
    CASE WHEN p_urgency IN ('عادي', 'مهم', 'عاجل') THEN p_urgency ELSE 'عادي' END,
    nullif(left(trim(coalesce(p_preferred_time, '')), 120), ''),
    left(trim(p_details), 5000),
    coalesce(p_is_anonymous, false)
  )
  RETURNING request_no INTO new_no;

  RETURN new_no;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_public_request(
  text, text, text, text, text, text, text, text, text, text, text, boolean, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_request(
  text, text, text, text, text, text, text, text, text, text, text, boolean, text
) TO anon, authenticated;
