create or replace function public.get_public_school_invite(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
declare
  i public.school_invites%rowtype;
  s public.schools%rowtype;
  ok boolean;
  why text;
begin
  select * into i
  from public.school_invites
  where token=lower(trim(p_token))
  limit 1;

  if i.id is null then
    return jsonb_build_object('valid',false,'reason','not_found');
  end if;

  select * into s from public.schools where id=i.school_id;

  if i.expires_at<=now() then
    ok:=false; why:='expired';
  elsif not i.active then
    ok:=false; why:='inactive';
  elsif i.device_secret_hash is not null then
    ok:=false; why:='claimed_other_device';
  else
    ok:=true; why:=null;
  end if;

  return jsonb_build_object(
    'valid',ok,
    'reason',why,
    'device_claimed',i.device_secret_hash is not null,
    'account_bound',i.account_bound_at is not null,
    'school_name',s.name,
    'education_dept',s.education_dept,
    'education_office',s.education_office,
    'role',i.role,
    'permissions',i.permissions,
    'data_scope',i.data_scope,
    'linked_student_count',coalesce(array_length(i.student_ids,1),0),
    'expires_at',i.expires_at
  );
end;
$$;

revoke all on function public.get_public_school_invite(text) from public;
grant execute on function public.get_public_school_invite(text) to anon,authenticated;
