-- Reconcile the live Lovable Cloud schema with the generated client types.
-- Additive only: no existing rows are deleted or reassigned.

ALTER TABLE public.noor_export_jobs
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;

ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS plan_task_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'programs_plan_task_id_fkey'
      AND conrelid = 'public.programs'::regclass
  ) THEN
    ALTER TABLE public.programs
      ADD CONSTRAINT programs_plan_task_id_fkey
      FOREIGN KEY (plan_task_id)
      REFERENCES public.plan_tasks(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

ALTER TABLE public.school_settings
  ADD COLUMN IF NOT EXISTS ministry_logo_url text,
  ADD COLUMN IF NOT EXISTS show_counselor_on_documents boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_principal_on_documents boolean NOT NULL DEFAULT true;


-- Restore storage objects required by the current UI.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-media',
  'post-media',
  true,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "post_media_insert_own" ON storage.objects;
CREATE POLICY "post_media_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'post-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "post_media_update_own" ON storage.objects;
CREATE POLICY "post_media_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'post-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'post-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "post_media_delete_own" ON storage.objects;
CREATE POLICY "post_media_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'post-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "users_upload_own_avatar" ON storage.objects;
CREATE POLICY "users_upload_own_avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'user-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "users_update_own_avatar" ON storage.objects;
CREATE POLICY "users_update_own_avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'user-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'user-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "users_delete_own_avatar" ON storage.objects;
CREATE POLICY "users_delete_own_avatar"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'user-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "public_view_user_avatars" ON storage.objects;
CREATE POLICY "public_view_user_avatars"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'user-avatars');

-- Restore the public counselor portal RPC used by /blog/:token.
CREATE OR REPLACE FUNCTION public.get_private_counselor_portal(p_token text)
RETURNS TABLE (
  school_name text,
  counselor_name text,
  public_slug text,
  title text,
  kind text,
  excerpt text,
  body text,
  cover_url text,
  author_name text,
  published_at timestamptz,
  created_at timestamptz,
  slug text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    settings.school_name,
    settings.counselor_name,
    settings.public_slug,
    post.title,
    post.kind,
    post.excerpt,
    post.body,
    post.cover_url,
    post.author_name,
    post.published_at,
    post.created_at,
    post.slug
  FROM public.school_settings settings
  LEFT JOIN public.posts post
    ON post.user_id = settings.user_id
   AND post.is_public = true
  WHERE settings.private_blog_token = trim(p_token)
  ORDER BY post.published_at DESC NULLS LAST, post.created_at DESC NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.get_private_counselor_portal(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_private_counselor_portal(text) TO anon, authenticated;


-- The settings UI uses upsert(..., { onConflict: "user_id" }).
CREATE UNIQUE INDEX IF NOT EXISTS school_settings_user_id_unique
  ON public.school_settings (user_id);
