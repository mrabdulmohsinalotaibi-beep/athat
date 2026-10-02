-- Public likes + image attachments for community contributions.
-- The counselor remains the only person who can approve/reject a contribution.

ALTER TABLE public.counselor_contributions
  ADD COLUMN IF NOT EXISTS cover_url text;

CREATE TABLE IF NOT EXISTS public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  client_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT post_likes_client_id_len CHECK (char_length(client_id) BETWEEN 8 AND 100),
  UNIQUE (post_id, client_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.post_likes FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS post_likes_post_id_idx ON public.post_likes(post_id);

CREATE OR REPLACE FUNCTION public.get_post_like_state(p_slug text, p_client_id text DEFAULT NULL)
RETURNS TABLE (like_count bigint, liked boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    count(l.id)::bigint AS like_count,
    CASE
      WHEN nullif(trim(p_client_id), '') IS NULL THEN false
      ELSE bool_or(l.client_id = trim(p_client_id))
    END AS liked
  FROM public.posts p
  LEFT JOIN public.post_likes l ON l.post_id = p.id
  WHERE p.slug = trim(p_slug)
    AND p.is_public = true
  GROUP BY p.id;
$$;

REVOKE ALL ON FUNCTION public.get_post_like_state(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_post_like_state(text,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.toggle_post_like(p_slug text, p_client_id text)
RETURNS TABLE (like_count bigint, liked boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_id uuid;
  v_client_id text := trim(p_client_id);
  v_deleted integer;
BEGIN
  IF char_length(v_client_id) < 8 OR char_length(v_client_id) > 100 THEN
    RAISE EXCEPTION 'تعذّر تسجيل الإعجاب';
  END IF;

  SELECT id INTO v_post_id
  FROM public.posts
  WHERE slug = trim(p_slug)
    AND is_public = true
  LIMIT 1;

  IF v_post_id IS NULL THEN
    RAISE EXCEPTION 'المنشور غير متاح';
  END IF;

  DELETE FROM public.post_likes
  WHERE post_id = v_post_id
    AND client_id = v_client_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted = 0 THEN
    INSERT INTO public.post_likes(post_id, client_id)
    VALUES (v_post_id, v_client_id)
    ON CONFLICT (post_id, client_id) DO NOTHING;
    liked := true;
  ELSE
    liked := false;
  END IF;

  SELECT count(*)::bigint INTO like_count
  FROM public.post_likes
  WHERE post_id = v_post_id;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_post_like(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_post_like(text,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_counselor_contribution(
  p_token text,
  p_author_name text,
  p_author_role text,
  p_title text,
  p_body text,
  p_cover_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_id uuid;
  v_cover text := nullif(trim(coalesce(p_cover_url, '')), '');
BEGIN
  SELECT user_id INTO v_owner
  FROM public.school_settings
  WHERE private_blog_token = trim(p_token)
  LIMIT 1;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'رابط المدونة غير صالح';
  END IF;

  IF length(trim(p_author_name)) < 2
     OR length(trim(p_author_role)) < 2
     OR length(trim(p_title)) < 3
     OR (length(trim(p_body)) < 10 AND v_cover IS NULL) THEN
    RAISE EXCEPTION 'أكمل بيانات المشاركة وأضف نصًا أو صورة';
  END IF;

  IF v_cover IS NOT NULL AND char_length(v_cover) > 950000 THEN
    RAISE EXCEPTION 'الصورة كبيرة جدًا بعد الضغط';
  END IF;

  INSERT INTO public.counselor_contributions(
    owner_user_id, author_name, author_role, title, body, cover_url
  )
  VALUES (
    v_owner,
    left(trim(p_author_name),100),
    left(trim(p_author_role),100),
    left(trim(p_title),180),
    left(trim(p_body),6000),
    v_cover
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_counselor_contribution(text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_counselor_contribution(text,text,text,text,text,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.approve_counselor_contribution(p_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item public.counselor_contributions%rowtype;
  v_post uuid;
BEGIN
  SELECT * INTO v_item
  FROM public.counselor_contributions
  WHERE id = p_id
    AND owner_user_id = auth.uid();

  IF v_item.id IS NULL THEN
    RAISE EXCEPTION 'المشاركة غير موجودة';
  END IF;

  INSERT INTO public.posts(
    user_id, title, slug, kind, excerpt, body, cover_url, author_name, is_public, published_at
  )
  VALUES(
    auth.uid(),
    v_item.title,
    'community-' || replace(v_item.id::text,'-',''),
    'announcement',
    CASE WHEN trim(v_item.body) <> '' THEN left(v_item.body,180) ELSE NULL END,
    v_item.body,
    v_item.cover_url,
    v_item.author_name || ' · ' || v_item.author_role,
    true,
    now()
  )
  RETURNING id INTO v_post;

  UPDATE public.counselor_contributions
  SET status = 'approved', reviewed_at = now()
  WHERE id = p_id;

  RETURN v_post;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_counselor_contribution(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_counselor_contribution(uuid) TO authenticated;

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
  is_featured boolean,
  like_count bigint
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
    COALESCE(post.is_featured, false),
    COALESCE((SELECT count(*) FROM public.post_likes likes WHERE likes.post_id = post.id), 0)::bigint
  FROM public.school_settings settings
  LEFT JOIN public.posts post
    ON post.user_id = settings.user_id
   AND post.is_public = true
  WHERE settings.private_blog_token = trim(p_token)
  ORDER BY post.published_at DESC NULLS LAST, post.created_at DESC NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.get_private_counselor_portal(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_private_counselor_portal(text) TO anon, authenticated;
