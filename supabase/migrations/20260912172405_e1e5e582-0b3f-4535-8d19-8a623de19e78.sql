CREATE OR REPLACE FUNCTION public.enforce_free_evidence_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  account_plan text;
  evidence_count integer;
BEGIN
  SELECT plan INTO account_plan FROM public.subscriptions WHERE user_id = NEW.user_id;
  account_plan := COALESCE(account_plan, 'free');
  IF account_plan = 'free' THEN
    SELECT count(*) INTO evidence_count FROM public.evidences WHERE user_id = NEW.user_id;
    IF evidence_count >= 10 THEN
      RAISE EXCEPTION 'FREE_EVIDENCE_LIMIT_REACHED: الحد المجاني هو 10 شواهد';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_free_evidence_limit() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_enforce_free_evidence_limit BEFORE INSERT ON public.evidences FOR EACH ROW EXECUTE FUNCTION public.enforce_free_evidence_limit();