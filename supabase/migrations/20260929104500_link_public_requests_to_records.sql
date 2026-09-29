-- Link inbound public requests to the internal record created from them.
-- Additive only; existing requests remain unchanged.
ALTER TABLE public.public_requests
  ADD COLUMN IF NOT EXISTS linked_table text,
  ADD COLUMN IF NOT EXISTS linked_record_id uuid;

CREATE INDEX IF NOT EXISTS public_requests_linked_record_idx
  ON public.public_requests(user_id, linked_table, linked_record_id)
  WHERE linked_record_id IS NOT NULL;
