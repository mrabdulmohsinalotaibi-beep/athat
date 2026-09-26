CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  kind text NOT NULL DEFAULT 'article',
  excerpt text,
  body text NOT NULL DEFAULT '',
  cover_url text,
  author_name text,
  is_public boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT SELECT ON public.posts TO anon;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_posts ON public.posts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY public_posts_read ON public.posts FOR SELECT TO anon, authenticated USING (is_public = true);
CREATE INDEX posts_public_idx ON public.posts (is_public, published_at DESC);
CREATE INDEX posts_user_idx ON public.posts (user_id);
CREATE TRIGGER trg_posts_updated BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.school_settings ADD COLUMN public_slug text UNIQUE;

CREATE OR REPLACE FUNCTION public.get_public_school(p_slug text)
RETURNS TABLE(user_id uuid, school_name text, education_dept text, logo_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.user_id, s.school_name, s.education_dept, s.logo_url
  FROM public.school_settings s
  WHERE s.public_slug = lower(trim(p_slug))
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.get_public_school(text) TO anon, authenticated;