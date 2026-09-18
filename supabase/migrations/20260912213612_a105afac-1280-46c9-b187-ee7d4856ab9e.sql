CREATE OR REPLACE FUNCTION public.assign_counseling_case_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  next_number integer;
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;

  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'تعذّر تحديد حساب الموجه لإنشاء رقم الحالة';
  END IF;

  IF NEW.case_no IS NULL OR btrim(NEW.case_no) = '' THEN
    PERFORM pg_advisory_xact_lock(hashtext(NEW.user_id::text));

    SELECT COALESCE(
      MAX((regexp_match(case_no, '^حالة #([0-9]+)$'))[1]::integer),
      0
    ) + 1
    INTO next_number
    FROM public.counseling_cases
    WHERE user_id = NEW.user_id
      AND case_no ~ '^حالة #[0-9]+$';

    NEW.case_no := 'حالة #' || next_number;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_assign_counseling_case_number ON public.counseling_cases;
CREATE TRIGGER trg_assign_counseling_case_number
BEFORE INSERT ON public.counseling_cases
FOR EACH ROW
EXECUTE FUNCTION public.assign_counseling_case_number();