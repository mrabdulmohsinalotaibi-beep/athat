-- Public feedback inbox with a school-specific share token.
ALTER TABLE public.school_settings
  ADD COLUMN IF NOT EXISTS public_feedback_token text NOT NULL DEFAULT encode(gen_random_bytes(18), 'hex');

CREATE TABLE IF NOT EXISTS public.feedback_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  sender_name text NOT NULL,
  sender_contact text,
  category text NOT NULL DEFAULT 'رأي',
  message text NOT NULL,
  status text NOT NULL DEFAULT 'جديد',
  ai_summary text,
  ai_category text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback_messages TO authenticated;
GRANT ALL ON public.feedback_messages TO service_role;
ALTER TABLE public.feedback_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_feedback_messages" ON public.feedback_messages;
CREATE POLICY "own_feedback_messages" ON public.feedback_messages
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.submit_public_feedback(
  p_token text,
  p_sender_name text,
  p_sender_contact text,
  p_category text,
  p_message text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  target_user uuid;
  new_id uuid;
BEGIN
  IF length(trim(coalesce(p_message, ''))) < 3 THEN
    RAISE EXCEPTION 'الرسالة قصيرة جداً';
  END IF;

  SELECT user_id INTO target_user
  FROM public.school_settings
  WHERE public_feedback_token = trim(p_token)
  ORDER BY created_at ASC LIMIT 1;

  IF target_user IS NULL THEN
    RAISE EXCEPTION 'رابط النموذج غير صالح أو متوقف';
  END IF;

  INSERT INTO public.feedback_messages (user_id, sender_name, sender_contact, category, message)
  VALUES (
    target_user,
    left(trim(coalesce(p_sender_name, 'مستفيد')), 120),
    left(trim(coalesce(p_sender_contact, '')), 160),
    left(trim(coalesce(p_category, 'رأي')), 80),
    left(trim(p_message), 5000)
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_public_feedback(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_feedback(text, text, text, text, text) TO anon, authenticated;

CREATE INDEX IF NOT EXISTS feedback_messages_user_created_idx
  ON public.feedback_messages (user_id, created_at DESC);

CREATE TRIGGER trg_feedback_messages_updated
  BEFORE UPDATE ON public.feedback_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- No anonymous SELECT/UPDATE policies: public visitors can submit only through the RPC above.
