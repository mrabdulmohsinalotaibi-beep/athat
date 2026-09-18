-- Embedded public feedback questionnaire for the student-counselor platform.
-- Anonymous visitors can submit through a token only; they can never read responses.

ALTER TABLE public.school_settings
  ADD COLUMN IF NOT EXISTS public_feedback_token text NOT NULL DEFAULT encode(gen_random_bytes(18), 'hex');

CREATE TABLE IF NOT EXISTS public.feedback_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  sender_name text NOT NULL,
  sender_contact text,
  sender_role text NOT NULL DEFAULT 'مستفيد',
  category text NOT NULL DEFAULT 'رأي',
  satisfaction smallint CHECK (satisfaction IS NULL OR satisfaction BETWEEN 1 AND 5),
  message text NOT NULL,
  status text NOT NULL DEFAULT 'جديد' CHECK (status IN ('جديد', 'قيد المراجعة', 'تم الرد', 'محفوظ')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_messages
  ADD COLUMN IF NOT EXISTS sender_role text NOT NULL DEFAULT 'مستفيد',
  ADD COLUMN IF NOT EXISTS satisfaction smallint CHECK (satisfaction IS NULL OR satisfaction BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS internal_notes text;

ALTER TABLE public.feedback_messages
  DROP COLUMN IF EXISTS ai_summary,
  DROP COLUMN IF EXISTS ai_category;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback_messages TO authenticated;
GRANT ALL ON public.feedback_messages TO service_role;
ALTER TABLE public.feedback_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_feedback_messages" ON public.feedback_messages;
CREATE POLICY "own_feedback_messages" ON public.feedback_messages
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.feedback_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id uuid NOT NULL REFERENCES public.feedback_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  action text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_feedback_actions" ON public.feedback_actions;
CREATE POLICY "own_feedback_actions" ON public.feedback_actions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON public.feedback_actions TO authenticated;
GRANT ALL ON public.feedback_actions TO service_role;

CREATE OR REPLACE FUNCTION public.log_feedback_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status OR OLD.internal_notes IS DISTINCT FROM NEW.internal_notes THEN
    INSERT INTO public.feedback_actions (feedback_id, user_id, action, notes)
    VALUES (NEW.id, NEW.user_id, CASE WHEN OLD.status IS DISTINCT FROM NEW.status THEN 'تغيير الحالة' ELSE 'تحديث الملاحظات' END,
      CASE WHEN OLD.status IS DISTINCT FROM NEW.status THEN OLD.status || ' ← ' || NEW.status ELSE NEW.internal_notes END);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_feedback_status_action ON public.feedback_messages;
CREATE TRIGGER trg_feedback_status_action
  AFTER UPDATE ON public.feedback_messages
  FOR EACH ROW EXECUTE FUNCTION public.log_feedback_status_change();

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

  INSERT INTO public.feedback_messages (
    user_id, sender_name, sender_contact, sender_role, category, satisfaction, message
  ) VALUES (
    target_user,
    left(trim(coalesce(p_sender_name, 'مستفيد')), 120),
    left(trim(coalesce(p_sender_contact, '')), 160),
    left(trim(coalesce(p_sender_role, 'مستفيد')), 80),
    left(trim(coalesce(p_category, 'رأي')), 80),
    p_satisfaction,
    left(trim(p_message), 5000)
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_public_feedback(text, text, text, text, text, smallint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_feedback(text, text, text, text, text, smallint, text) TO anon, authenticated;

CREATE INDEX IF NOT EXISTS feedback_messages_user_created_idx
  ON public.feedback_messages (user_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_feedback_messages_updated ON public.feedback_messages;
CREATE TRIGGER trg_feedback_messages_updated
  BEFORE UPDATE ON public.feedback_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- There is intentionally no anonymous SELECT or UPDATE policy on this table.
