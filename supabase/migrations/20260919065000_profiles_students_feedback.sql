-- Personal accounts, durable student links, and actionable beneficiary messages.
-- This migration is additive: existing records stay available through their legacy
-- student_no / student_name values while new records store a real student_id link.

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  job_title text NOT NULL DEFAULT 'الموجه الطلابي',
  phone text,
  avatar_path text,
  bio text,
  school_role text NOT NULL DEFAULT 'الموجه الطلابي',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_manage_own_profile" ON public.user_profiles;
CREATE POLICY "users_manage_own_profile" ON public.user_profiles
  FOR ALL TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name)
  VALUES (NEW.id, coalesce(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_profile();

INSERT INTO public.user_profiles (id, full_name)
SELECT id, coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS trg_user_profiles_updated ON public.user_profiles;
CREATE TRIGGER trg_user_profiles_updated
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-avatars',
  'user-avatars',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = 2097152,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "users_upload_own_avatar" ON storage.objects;
CREATE POLICY "users_upload_own_avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "users_update_own_avatar" ON storage.objects;
CREATE POLICY "users_update_own_avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "users_delete_own_avatar" ON storage.objects;
CREATE POLICY "users_delete_own_avatar" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "public_view_user_avatars" ON storage.objects;
CREATE POLICY "public_view_user_avatars" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'user-avatars');

ALTER TABLE public.counseling_cases ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.students(id) ON DELETE SET NULL;
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.students(id) ON DELETE SET NULL;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.students(id) ON DELETE SET NULL;
ALTER TABLE public.behavior ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.students(id) ON DELETE SET NULL;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.students(id) ON DELETE SET NULL;

UPDATE public.counseling_cases r SET student_id = s.id
FROM public.students s
WHERE r.student_id IS NULL AND r.user_id = s.user_id AND r.student_no IS NOT NULL AND r.student_no = s.student_no;
UPDATE public.interviews r SET student_id = s.id
FROM public.students s
WHERE r.student_id IS NULL AND r.user_id = s.user_id AND r.student_no IS NOT NULL AND r.student_no = s.student_no;
UPDATE public.attendance r SET student_id = s.id
FROM public.students s
WHERE r.student_id IS NULL AND r.user_id = s.user_id AND r.student_no IS NOT NULL AND r.student_no = s.student_no;
UPDATE public.behavior r SET student_id = s.id
FROM public.students s
WHERE r.student_id IS NULL AND r.user_id = s.user_id AND r.student_no IS NOT NULL AND r.student_no = s.student_no;
UPDATE public.referrals r SET student_id = s.id
FROM public.students s
WHERE r.student_id IS NULL AND r.user_id = s.user_id AND r.student_no IS NOT NULL AND r.student_no = s.student_no;

CREATE INDEX IF NOT EXISTS counseling_cases_student_id_idx ON public.counseling_cases (user_id, student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS interviews_student_id_idx ON public.interviews (user_id, student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS attendance_student_id_idx ON public.attendance (user_id, student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS behavior_student_id_idx ON public.behavior (user_id, student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS referrals_student_id_idx ON public.referrals (user_id, student_id, created_at DESC);

ALTER TABLE public.feedback_messages
  ADD COLUMN IF NOT EXISTS assigned_to text NOT NULL DEFAULT 'الموجه الطلابي',
  ADD COLUMN IF NOT EXISTS assigned_channel text,
  ADD COLUMN IF NOT EXISTS response_note text,
  ADD COLUMN IF NOT EXISTS responded_at timestamptz;

CREATE INDEX IF NOT EXISTS feedback_messages_assigned_status_idx
  ON public.feedback_messages (user_id, assigned_to, status, created_at DESC);

CREATE OR REPLACE FUNCTION public.submit_public_feedback(
  p_token text,
  p_sender_name text,
  p_sender_contact text,
  p_sender_role text,
  p_category text,
  p_satisfaction smallint,
  p_message text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  target_user uuid;
  new_id uuid;
  target_role text;
BEGIN
  IF length(trim(coalesce(p_message, ''))) < 3 THEN
    RAISE EXCEPTION 'الرسالة قصيرة جداً';
  END IF;
  IF p_satisfaction IS NOT NULL AND (p_satisfaction < 1 OR p_satisfaction > 5) THEN
    RAISE EXCEPTION 'قيمة التقييم غير صحيحة';
  END IF;

  SELECT user_id INTO target_user
  FROM public.school_settings
  WHERE public_feedback_token = trim(p_token)
  ORDER BY created_at ASC
  LIMIT 1;
  IF target_user IS NULL THEN
    RAISE EXCEPTION 'رابط الاستبانة غير صالح أو متوقف';
  END IF;

  target_role := CASE trim(coalesce(p_category, 'رأي'))
    WHEN 'طلب مساعدة' THEN 'الموجه الطلابي'
    WHEN 'استفسار' THEN 'الموجه الطلابي'
    WHEN 'ملاحظة' THEN 'إدارة المدرسة'
    ELSE 'الموجه الطلابي'
  END;

  INSERT INTO public.feedback_messages (
    user_id, sender_name, sender_contact, sender_role, category, satisfaction, message, assigned_to
  ) VALUES (
    target_user,
    left(trim(coalesce(p_sender_name, 'مستفيد')), 120),
    left(trim(coalesce(p_sender_contact, '')), 160),
    left(trim(coalesce(p_sender_role, 'مستفيد')), 80),
    left(trim(coalesce(p_category, 'رأي')), 80),
    p_satisfaction,
    left(trim(p_message), 5000),
    target_role
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;
