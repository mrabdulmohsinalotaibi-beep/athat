-- Persistent outgoing-message log for the beneficiary messaging center.
-- Incoming messages remain in feedback_messages; records with status='محفوظ'
-- are treated as the received-message archive.

CREATE TABLE IF NOT EXISTS public.feedback_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id uuid NOT NULL REFERENCES public.feedback_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  action text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_feedback_actions_select" ON public.feedback_actions;
CREATE POLICY "own_feedback_actions_select" ON public.feedback_actions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_feedback_actions_insert" ON public.feedback_actions;
CREATE POLICY "own_feedback_actions_insert" ON public.feedback_actions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON public.feedback_actions TO authenticated;
GRANT ALL ON public.feedback_actions TO service_role;

CREATE INDEX IF NOT EXISTS feedback_actions_user_created_idx
  ON public.feedback_actions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS feedback_actions_feedback_created_idx
  ON public.feedback_actions (feedback_id, created_at DESC);
