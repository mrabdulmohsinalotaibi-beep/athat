-- Make inbound public consultations visible immediately in the counselor inbox.
-- Safe when the table is already part of the realtime publication.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'public_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.public_requests;
  END IF;
END
$$;
