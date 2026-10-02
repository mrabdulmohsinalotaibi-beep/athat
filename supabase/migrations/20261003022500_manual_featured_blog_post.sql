-- Let the counselor explicitly choose the featured item shown on the public blog.
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS posts_one_featured_per_user_idx
  ON public.posts (user_id)
  WHERE is_featured = true;

CREATE OR REPLACE FUNCTION public.set_featured_post(p_post_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
  END IF;

  UPDATE public.posts
  SET is_featured = false
  WHERE user_id = current_user_id
    AND is_featured = true;

  IF p_post_id IS NOT NULL THEN
    UPDATE public.posts
    SET is_featured = true
    WHERE id = p_post_id
      AND user_id = current_user_id
      AND is_public = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'لا يمكن تمييز هذا المحتوى. تأكد أنه منشور للعامة.';
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_featured_post(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_featured_post(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.get_private_counselor_portal(text);

CREATE FUNCTION public.get_private_counselor_portal(p_token text)
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
  slug text,
  is_featured boolean
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
    post.slug,
    COALESCE(post.is_featured, false)
  FROM public.school_settings settings
  LEFT JOIN public.posts post
    ON post.user_id = settings.user_id
   AND post.is_public = true
  WHERE settings.private_blog_token = trim(p_token)
  ORDER BY post.published_at DESC NULLS LAST, post.created_at DESC NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.get_private_counselor_portal(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_private_counselor_portal(text) TO anon, authenticated;
