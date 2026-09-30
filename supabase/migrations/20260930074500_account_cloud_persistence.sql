-- Durable per-account profile storage.
-- All application records are already owner-scoped by auth.uid(); these fields
-- move the expanded profile from auth metadata into the same cloud database so
-- signing in with the same account on another device restores the full profile.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS professional_email text,
  ADD COLUMN IF NOT EXISTS employee_no text,
  ADD COLUMN IF NOT EXISTS qualification text,
  ADD COLUMN IF NOT EXISTS specialization text,
  ADD COLUMN IF NOT EXISTS experience_years integer,
  ADD COLUMN IF NOT EXISTS school_name text,
  ADD COLUMN IF NOT EXISTS education_department text,
  ADD COLUMN IF NOT EXISTS education_office text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS office_location text,
  ADD COLUMN IF NOT EXISTS office_hours text,
  ADD COLUMN IF NOT EXISTS interests text;

-- Existing accounts keep their data: copy any previously saved metadata into
-- the database only when the corresponding database field is empty.
UPDATE public.user_profiles p
SET
  professional_email = coalesce(nullif(p.professional_email, ''), nullif(u.raw_user_meta_data ->> 'professional_email', '')),
  employee_no = coalesce(nullif(p.employee_no, ''), nullif(u.raw_user_meta_data ->> 'employee_no', '')),
  qualification = coalesce(nullif(p.qualification, ''), nullif(u.raw_user_meta_data ->> 'qualification', '')),
  specialization = coalesce(nullif(p.specialization, ''), nullif(u.raw_user_meta_data ->> 'specialization', '')),
  experience_years = coalesce(
    p.experience_years,
    CASE
      WHEN (u.raw_user_meta_data ->> 'experience_years') ~ '^[0-9]+$'
      THEN (u.raw_user_meta_data ->> 'experience_years')::integer
      ELSE NULL
    END
  ),
  school_name = coalesce(nullif(p.school_name, ''), nullif(u.raw_user_meta_data ->> 'school_name', '')),
  education_department = coalesce(nullif(p.education_department, ''), nullif(u.raw_user_meta_data ->> 'education_department', '')),
  education_office = coalesce(nullif(p.education_office, ''), nullif(u.raw_user_meta_data ->> 'education_office', '')),
  city = coalesce(nullif(p.city, ''), nullif(u.raw_user_meta_data ->> 'city', '')),
  office_location = coalesce(nullif(p.office_location, ''), nullif(u.raw_user_meta_data ->> 'office_location', '')),
  office_hours = coalesce(nullif(p.office_hours, ''), nullif(u.raw_user_meta_data ->> 'office_hours', '')),
  interests = coalesce(nullif(p.interests, ''), nullif(u.raw_user_meta_data ->> 'interests', ''))
FROM auth.users u
WHERE p.id = u.id;

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_manage_own_profile" ON public.user_profiles;
CREATE POLICY "users_manage_own_profile"
ON public.user_profiles
FOR ALL TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE INDEX IF NOT EXISTS user_profiles_updated_idx
  ON public.user_profiles (updated_at DESC);

COMMENT ON TABLE public.user_profiles IS
  'Cloud profile keyed by auth.users.id. The login email identifies the account; data remains attached to the stable auth user id across devices.';
