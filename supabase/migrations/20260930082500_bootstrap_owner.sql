-- Bootstrap the ATHAT owner account without storing the owner's email in the public repository.
-- The SHA-256 hash below matches the owner's normalized login email.
DO $$
DECLARE
  owner_user_id uuid;
BEGIN
  SELECT id
    INTO owner_user_id
  FROM auth.users
  WHERE encode(digest(lower(trim(email)), 'sha256'), 'hex') = 'd55ab6c5dcac17983b91e7149f000d382bac33e7acb96e9493eadbb28f478488'
  LIMIT 1;

  IF owner_user_id IS NOT NULL THEN
    INSERT INTO public.app_admins (user_id, role)
    VALUES (owner_user_id, 'owner')
    ON CONFLICT (user_id)
    DO UPDATE SET role = 'owner';
  END IF;
END;
$$;
