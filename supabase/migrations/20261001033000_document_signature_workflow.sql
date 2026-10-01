-- Electronic document approval and signature workflow.
-- A frozen JSON snapshot is stored when the request is created so the signer
-- always approves the exact document version that was sent.

CREATE TABLE IF NOT EXISTS public.document_signature_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id uuid NULL,
  record_table text NOT NULL,
  record_id uuid NOT NULL,
  record_type text NOT NULL,
  document_title text NOT NULL,
  document_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  signer_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  signer_name text NOT NULL,
  signer_role text NOT NULL,
  signer_phone text NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','signed','declined','cancelled')),
  signature_data text NULL,
  signer_note text NULL,
  signed_at timestamptz NULL,
  declined_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.document_signature_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners read signature requests" ON public.document_signature_requests;
CREATE POLICY "owners read signature requests"
ON public.document_signature_requests FOR SELECT TO authenticated
USING (owner_user_id = auth.uid() OR signer_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.create_document_signature_request(
  p_record_table text,
  p_record_id uuid,
  p_record_type text,
  p_document_title text,
  p_document_snapshot jsonb,
  p_signer_name text,
  p_signer_role text,
  p_signer_phone text DEFAULT NULL,
  p_signer_user_id uuid DEFAULT NULL,
  p_school_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE v_token uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'يجب تسجيل الدخول'; END IF;
  IF length(trim(coalesce(p_signer_name,''))) < 2 THEN RAISE EXCEPTION 'أدخل اسم الموقّع'; END IF;
  IF length(trim(coalesce(p_signer_role,''))) < 2 THEN RAISE EXCEPTION 'حدد صفة الموقّع'; END IF;
  INSERT INTO public.document_signature_requests(
    owner_user_id, school_id, record_table, record_id, record_type, document_title,
    document_snapshot, signer_user_id, signer_name, signer_role, signer_phone
  ) VALUES (
    auth.uid(), p_school_id, left(p_record_table,80), p_record_id, left(p_record_type,120),
    left(p_document_title,200), p_document_snapshot, p_signer_user_id,
    left(trim(p_signer_name),160), left(trim(p_signer_role),100), nullif(left(trim(coalesce(p_signer_phone,'')),40),'')
  ) RETURNING token INTO v_token;
  RETURN v_token;
END $$;

CREATE OR REPLACE FUNCTION public.get_document_signature_request(p_token uuid)
RETURNS TABLE(
  document_title text, record_type text, document_snapshot jsonb,
  signer_name text, signer_role text, status text, signed_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path=public
AS $$
  SELECT r.document_title, r.record_type, r.document_snapshot,
         r.signer_name, r.signer_role, r.status, r.signed_at
  FROM public.document_signature_requests r
  WHERE r.token=p_token AND r.status <> 'cancelled'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.sign_document_request(
  p_token uuid,
  p_signature_data text,
  p_note text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE v_id uuid;
BEGIN
  IF length(coalesce(p_signature_data,'')) < 100 THEN RAISE EXCEPTION 'التوقيع مطلوب'; END IF;
  SELECT id INTO v_id FROM public.document_signature_requests
  WHERE token=p_token AND status='pending' FOR UPDATE;
  IF v_id IS NULL THEN RAISE EXCEPTION 'طلب التوقيع غير متاح أو تم اعتماده مسبقًا'; END IF;
  UPDATE public.document_signature_requests
  SET status='signed', signature_data=p_signature_data,
      signer_note=nullif(left(trim(coalesce(p_note,'')),1000),''),
      signed_at=now(), updated_at=now()
  WHERE id=v_id;
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.create_document_signature_request(text,uuid,text,text,jsonb,text,text,text,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_document_signature_request(text,uuid,text,text,jsonb,text,text,text,uuid,uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.get_document_signature_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_document_signature_request(uuid) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.sign_document_request(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sign_document_request(uuid,text,text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
