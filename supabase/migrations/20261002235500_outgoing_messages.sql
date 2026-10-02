-- Dedicated outgoing messaging center for student guardians and manually entered recipients.

CREATE TABLE IF NOT EXISTS public.outgoing_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  batch_id uuid NOT NULL,
  recipient_source text NOT NULL DEFAULT 'manual'
    CHECK (recipient_source IN ('student', 'manual')),
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  student_name text,
  recipient_name text,
  phone text NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp'
    CHECK (channel IN ('whatsapp')),
  message text NOT NULL,
  status text NOT NULL DEFAULT 'prepared'
    CHECK (status IN ('prepared', 'opened', 'sent', 'archived')),
  ai_assisted boolean NOT NULL DEFAULT false,
  opened_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.outgoing_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_outgoing_messages" ON public.outgoing_messages;
CREATE POLICY "users_manage_own_outgoing_messages" ON public.outgoing_messages
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.outgoing_messages TO authenticated;
GRANT ALL ON public.outgoing_messages TO service_role;

CREATE INDEX IF NOT EXISTS outgoing_messages_user_created_idx
  ON public.outgoing_messages (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS outgoing_messages_batch_idx
  ON public.outgoing_messages (user_id, batch_id, created_at DESC);

CREATE INDEX IF NOT EXISTS outgoing_messages_student_idx
  ON public.outgoing_messages (user_id, student_id, created_at DESC);
