CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE DEFAULT auth.uid(),
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled')),
  cases_limit integer NOT NULL DEFAULT 5 CHECK (cases_limit > 0),
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create free subscription" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND plan = 'free' AND status = 'active' AND cases_limit = 5);
CREATE TRIGGER trg_subscriptions_updated BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.enforce_free_case_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  account_plan text;
  account_limit integer;
  case_count integer;
BEGIN
  SELECT plan, cases_limit INTO account_plan, account_limit
  FROM public.subscriptions
  WHERE user_id = NEW.user_id;

  account_plan := COALESCE(account_plan, 'free');
  account_limit := COALESCE(account_limit, 5);

  IF account_plan = 'free' THEN
    SELECT count(*) INTO case_count
    FROM public.counseling_cases
    WHERE user_id = NEW.user_id;

    IF case_count >= account_limit THEN
      RAISE EXCEPTION 'FREE_CASE_LIMIT_REACHED: الحد المجاني هو % حالات إرشادية', account_limit;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_free_case_limit
BEFORE INSERT ON public.counseling_cases
FOR EACH ROW EXECUTE FUNCTION public.enforce_free_case_limit();

ALTER TABLE public.referrals ADD COLUMN case_no text;