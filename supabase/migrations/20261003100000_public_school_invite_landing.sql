create or replace function public.get_public_school_invite(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
declare
  v_invite public.school_invites%rowtype;
  v_school public.schools%rowtype;
begin
  select * into v_invite
  from public.school_invites
  where token=lower(trim(p_token))
  limit 1;

  if v_invite.id is null then
    return jsonb_build_object('valid',false,'reason','not_found');
  end if;

  select * into v_school from public.schools where id=v_invite.school_id;

  return jsonb_build_object(
    'valid',
      v_invite.active
      and v_invite.expires_at>now()
      and v_invite.used_count<v_invite.max_uses,
    'reason',
      case
        when not v_invite.active then 'inactive'
        when v_invite.expires_at<=now() then 'expired'
        when v_invite.used_count>=v_invite.max_uses then 'used'
        else null
      end,
    'school_name',v_school.name,
    'education_dept',v_school.education_dept,
    'education_office',v_school.education_office,
    'role',v_invite.role,
    'permissions',v_invite.permissions,
    'data_scope',v_invite.data_scope,
    'linked_student_count',coalesce(array_length(v_invite.student_ids,1),0),
    'expires_at',v_invite.expires_at,
    'max_uses',v_invite.max_uses,
    'used_count',v_invite.used_count
  );
end;
$$;

revoke all on function public.get_public_school_invite(text) from public;
grant execute on function public.get_public_school_invite(text) to anon,authenticated;
