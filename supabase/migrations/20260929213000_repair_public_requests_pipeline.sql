-- Repair and harden the complete public consultation/request pipeline.
-- Safe to run repeatedly on databases that already contain the portal objects.

CREATE SEQUENCE IF NOT EXISTS public.public_requests_no_seq;

CREATE TABLE IF NOT EXISTS public.public_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  request_no text,
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

ALTER TABLE public.public_requests
  ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid(),
  ADD COLUMN IF NOT EXISTS request_no text,
  ADD COLUMN IF NOT EXISTS kind text,
  ADD COLUMN IF NOT EXISTS requester_name text,
  ADD COLUMN IF NOT EXISTS requester_role text,
  ADD COLUMN IF NOT EXISTS requester_contact text,
  ADD COLUMN IF NOT EXISTS student_name text,
  ADD COLUMN IF NOT EXISTS student_grade text,
  ADD COLUMN IF NOT EXISTS classroom text,
  ADD COLUMN IF NOT EXISTS topic text,
  ADD COLUMN IF NOT EXISTS urgency text DEFAULT 'عادي',
  ADD COLUMN IF NOT EXISTS preferred_time text,
  ADD COLUMN IF NOT EXISTS details text,
  ADD COLUMN IF NOT EXISTS is_anonymous boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'جديد',
  ADD COLUMN IF NOT EXISTS linked_table text,
  ADD COLUMN IF NOT EXISTS linked_record_id uuid,
  ADD COLUMN IF NOT EXISTS counselor_notes text,
  ADD COLUMN IF NOT EXISTS handled_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.public_requests
  DROP CONSTRAINT IF EXISTS public_requests_kind_check,
  DROP CONSTRAINT IF EXISTS public_requests_urgency_check,
  DROP CONSTRAINT IF EXISTS public_requests_status_check;

ALTER TABLE public.public_requests
  ADD CONSTRAINT public_requests_kind_check
    CHECK (kind IN ('استشارة فردية', 'إحالة طالب', 'إبلاغ سري')),
  ADD CONSTRAINT public_requests_urgency_check
    CHECK (urgency IN ('عادي', 'مهم', 'عاجل')),
  ADD CONSTRAINT public_requests_status_check
    CHECK (status IN (
      'جديد',
      'قيد المعالجة',
      'تم التحويل لمقابلة',
      'تم التحويل لإحالة',
      'تم التحويل لحالة',
      'مغلق'
    ));

CREATE OR REPLACE FUNCTION public.set_public_request_no()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.request_no IS NULL OR length(trim(NEW.request_no)) = 0 THEN
    NEW.request_no :=
      to_char(now(), 'YYMM') || '-' ||
      lpad(nextval('public.public_requests_no_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_public_requests_no ON public.public_requests;
CREATE TRIGGER trg_public_requests_no
  BEFORE INSERT ON public.public_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_public_request_no();

CREATE INDEX IF NOT EXISTS public_requests_user_created_idx
  ON public.public_requests (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS public_requests_user_status_created_idx
  ON public.public_requests (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS public_requests_linked_record_idx
  ON public.public_requests (user_id, linked_table, linked_record_id)
  WHERE linked_record_id IS NOT NULL;

ALTER TABLE public.public_requests ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.public_requests TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.public_requests_no_seq TO authenticated, service_role;
GRANT ALL ON public.public_requests TO service_role;

DROP POLICY IF EXISTS "own_public_requests" ON public.public_requests;
CREATE POLICY "own_public_requests"
  ON public.public_requests
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

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

  SELECT s.user_id, coalesce(s.public_requests_enabled, true)
    INTO target_user, requests_enabled
  FROM public.school_settings s
  WHERE (
    p_slug IS NULL
    OR trim(p_slug) = ''
    OR s.public_slug = trim(p_slug)
  )
  ORDER BY s.updated_at DESC NULLS LAST
  LIMIT 1;

  IF target_user IS NULL THEN
    RAISE EXCEPTION 'لم يتم تفعيل استقبال الطلبات لهذه المدرسة بعد';
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

REVOKE ALL ON FUNCTION public.submit_public_request(
  text, text, text, text, text, text, text, text, text, text, text, boolean, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.submit_public_request(
  text, text, text, text, text, text, text, text, text, text, text, boolean, text
) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
