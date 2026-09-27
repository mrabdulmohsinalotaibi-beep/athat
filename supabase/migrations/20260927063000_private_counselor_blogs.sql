-- Private counselor blog links: posts are only exposed through an unlisted share token.
ALTER TABLE public.school_settings
  ADD COLUMN IF NOT EXISTS private_blog_token text UNIQUE
  DEFAULT encode(gen_random_bytes(18), 'hex');

UPDATE public.school_settings
SET private_blog_token = encode(gen_random_bytes(18), 'hex')
WHERE private_blog_token IS NULL;

-- Remove the old anonymous/authenticated public table policy.
DROP POLICY IF EXISTS public_posts_read ON public.posts;
REVOKE SELECT ON public.posts FROM anon;

CREATE OR REPLACE FUNCTION public.get_private_counselor_blog(p_token text)
RETURNS TABLE (
  school_name text,
  counselor_name text,
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
  SELECT settings.school_name,
         settings.counselor_name,
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
  JOIN public.posts post ON post.user_id = settings.user_id
  WHERE settings.private_blog_token = trim(p_token)
    AND post.is_public = true
  ORDER BY post.published_at DESC NULLS LAST, post.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_private_counselor_blog(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_private_counselor_blog(text) TO anon, authenticated;
