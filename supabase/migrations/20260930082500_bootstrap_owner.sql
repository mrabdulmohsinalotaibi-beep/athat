-- Bootstrap the ATHAT owner account without storing the owner's email in the public repository.
-- The SHA-256 hash below matches the owner's normalized login email.
DO $$
DECLARE
  owner_user_id uuid;
BEGIN
  SELECT id
    INTO owner_user_id
  FROM auth.users
  WHERE encode(digest(lower(trim(email)), 'sha256'), 'hex') = 'f85fb6c59825f60fcd934e427128495266b9031d300f51d8fb33aa6f1f209d00'
  LIMIT 1;

  IF owner_user_id IS NOT NULL THEN
    INSERT INTO public.app_admins (user_id, role)
    VALUES (owner_user_id, 'owner')
    ON CONFLICT (user_id)
    DO UPDATE SET role = 'owner';
  END IF;
END;
$$;
