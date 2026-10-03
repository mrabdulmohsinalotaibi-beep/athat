-- Persist the signer's explicit acknowledgement that the document was read
-- before signing, including the acknowledgement timestamp.

alter table public.document_signature_requests
  add column if not exists read_confirmed boolean not null default false,
  add column if not exists read_confirmed_at timestamptz null;

drop function if exists public.sign_document_request(uuid,text,text);

create or replace function public.sign_document_request(
  p_token uuid,
  p_signature_data text,
  p_note text default null,
  p_read_confirmed boolean default false
) returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  v_id uuid;
begin
  if length(coalesce(p_signature_data,'')) < 100 then
    raise exception 'التوقيع مطلوب';
  end if;

  if coalesce(p_read_confirmed,false) is not true then
    raise exception 'يجب تأكيد قراءة المستند قبل التوقيع';
  end if;

  select id into v_id
  from public.document_signature_requests
  where token=p_token and status='pending'
  for update;

  if v_id is null then
    raise exception 'طلب التوقيع غير متاح أو تم اعتماده مسبقًا';
  end if;

  update public.document_signature_requests
  set
    status='signed',
    signature_data=p_signature_data,
    signer_note=nullif(left(trim(coalesce(p_note,'')),1000),''),
    read_confirmed=true,
    read_confirmed_at=now(),
    signed_at=now(),
    updated_at=now()
  where id=v_id;

  return true;
end
$$;

revoke all on function public.sign_document_request(uuid,text,text,boolean) from public;
grant execute on function public.sign_document_request(uuid,text,text,boolean) to anon, authenticated;

create or replace function public.get_document_signature_request(p_token uuid)
returns table(
  document_title text,
  record_type text,
  document_snapshot jsonb,
  signer_name text,
  signer_role text,
  status text,
  signed_at timestamptz,
  read_confirmed boolean,
  read_confirmed_at timestamptz
)
language sql
security definer
set search_path=public
as $$
  select
    r.document_title,
    r.record_type,
    r.document_snapshot,
    r.signer_name,
    r.signer_role,
    r.status,
    r.signed_at,
    r.read_confirmed,
    r.read_confirmed_at
  from public.document_signature_requests r
  where r.token=p_token and r.status <> 'cancelled'
  limit 1
$$;

notify pgrst, 'reload schema';
