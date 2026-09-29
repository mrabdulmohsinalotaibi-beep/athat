-- Counselor public portal: keep service forms bound to the same school/counselor.
-- Additive only: creates a new read-only SECURITY DEFINER RPC and does not alter stored data.

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
