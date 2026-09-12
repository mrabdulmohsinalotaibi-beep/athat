ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS noor_synced_at timestamptz, ADD COLUMN IF NOT EXISTS noor_sync_ref text;
ALTER TABLE public.evidences ADD COLUMN IF NOT EXISTS mime_type text, ADD COLUMN IF NOT EXISTS file_name text, ADD COLUMN IF NOT EXISTS file_path text;

DROP POLICY IF EXISTS "evidences_own_read" ON storage.objects;
CREATE POLICY "evidences_own_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'evidences' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "evidences_own_insert" ON storage.objects;
CREATE POLICY "evidences_own_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'evidences' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "evidences_own_update" ON storage.objects;
CREATE POLICY "evidences_own_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'evidences' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "evidences_own_delete" ON storage.objects;
CREATE POLICY "evidences_own_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'evidences' AND auth.uid()::text = (storage.foldername(name))[1]);