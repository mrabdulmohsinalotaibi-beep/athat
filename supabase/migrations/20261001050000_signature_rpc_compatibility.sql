-- Compatibility RPC for the document signature UI.
-- PostgREST resolves overloaded RPCs by the exact set of JSON argument names.
-- Keep this 7-argument wrapper aligned with SendForSignatureDialog.

CREATE OR REPLACE FUNCTION public.create_document_signature_request(
  p_record_table text,
  p_record_id uuid,
  p_record_type text,
  p_document_title text,
  p_document_snapshot jsonb,
  p_signer_name text,
  p_signer_role text,
  p_signer_phone text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE v_token uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'يجب تسجيل الدخول'; END IF;
  IF length(trim(coalesce(p_signer_name,''))) < 2 THEN RAISE EXCEPTION 'أدخل اسم الموقّع'; END IF;
  IF length(trim(coalesce(p_signer_role,''))) < 2 THEN RAISE EXCEPTION 'حدد صفة الموقّع'; END IF;

  INSERT INTO public.document_signature_requests(
    owner_user_id, record_table, record_id, record_type, document_title,
    document_snapshot, signer_name, signer_role, signer_phone
  ) VALUES (
    auth.uid(), left(p_record_table,80), p_record_id, left(p_record_type,120),
    left(p_document_title,200), p_document_snapshot,
    left(trim(p_signer_name),160), left(trim(p_signer_role),100),
    nullif(left(trim(coalesce(p_signer_phone,'')),40),'')
  ) RETURNING token INTO v_token;

  RETURN v_token;
END $$;

REVOKE ALL ON FUNCTION public.create_document_signature_request(text,uuid,text,text,jsonb,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_document_signature_request(text,uuid,text,text,jsonb,text,text,text) TO authenticated;

NOTIFY pgrst, 'reload schema';
