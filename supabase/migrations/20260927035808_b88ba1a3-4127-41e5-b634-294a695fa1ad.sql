ALTER TABLE public.school_settings ADD COLUMN IF NOT EXISTS private_blog_token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(12), 'hex');
CREATE UNIQUE INDEX IF NOT EXISTS school_settings_private_blog_token_key ON public.school_settings(private_blog_token);

CREATE OR REPLACE FUNCTION public.get_private_counselor_blog(p_token text)
RETURNS TABLE(school_name text, counselor_name text, title text, kind text, excerpt text, body text, cover_url text, author_name text, published_at timestamptz, created_at timestamptz, slug text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.school_name, s.counselor_name, p.title, p.kind, p.excerpt, p.body, p.cover_url, p.author_name, p.published_at, p.created_at, p.slug
  FROM public.school_settings s JOIN public.posts p ON p.user_id = s.user_id
  WHERE s.private_blog_token = trim(p_token) AND p.is_public = true
  ORDER BY coalesce(p.published_at, p.created_at) DESC LIMIT 100
$$;
GRANT EXECUTE ON FUNCTION public.get_private_counselor_blog(text) TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.noor_export_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'ready',
  noor_reference text, last_error text, pause_reason text,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_table, source_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.noor_export_jobs TO authenticated;
GRANT ALL ON public.noor_export_jobs TO service_role;
ALTER TABLE public.noor_export_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_noor_export_jobs ON public.noor_export_jobs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_noor_export_jobs_updated BEFORE UPDATE ON public.noor_export_jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();