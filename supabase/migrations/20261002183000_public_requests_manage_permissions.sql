-- Ensure counselors can edit and delete their own incoming consultations/requests.
-- Public visitors retain submission-only access through SECURITY DEFINER functions.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.public_requests TO authenticated;
ALTER TABLE public.public_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_public_requests" ON public.public_requests;
CREATE POLICY "own_public_requests" ON public.public_requests
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Legacy inbox items may still come from feedback_messages.
GRANT SELECT, UPDATE, DELETE ON public.feedback_messages TO authenticated;
ALTER TABLE public.feedback_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_feedback_messages_manage" ON public.feedback_messages;
CREATE POLICY "own_feedback_messages_manage" ON public.feedback_messages
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
