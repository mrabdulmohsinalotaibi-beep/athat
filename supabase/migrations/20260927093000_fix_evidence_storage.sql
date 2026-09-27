-- Fix evidence uploads: ensure the private Storage bucket exists and
-- keep object access scoped to the authenticated user's first path segment.

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'evidences',
  'evidences',
  false,
  52428800,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "evidences_own_read" ON storage.objects;
CREATE POLICY "evidences_own_read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'evidences'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "evidences_own_insert" ON storage.objects;
CREATE POLICY "evidences_own_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'evidences'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "evidences_own_update" ON storage.objects;
CREATE POLICY "evidences_own_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'evidences'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'evidences'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "evidences_own_delete" ON storage.objects;
CREATE POLICY "evidences_own_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'evidences'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
