-- Manage outstanding team invitations and audit approval/status changes.

create or replace function public.get_school_invites()
returns table (
  id uuid,
  role text,
  permissions jsonb,
  data_scope jsonb,
  student_ids uuid[],
  expires_at timestamptz,
  max_uses integer,
  used_count integer,
  active boolean,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
declare
  v_member public.school_members%rowtype;
begin
  select * into v_member
  from public.school_members
  where user_id=auth.uid() and member_status='active'
  order by is_admin desc,joined_at desc nulls last
  limit 1;

  if v_member.id is null or not v_member.is_admin then
    raise exception 'ليس لديك صلاحية عرض الدعوات';
  end if;

  return query
  select i.id,i.role,i.permissions,i.data_scope,i.student_ids,i.expires_at,
         i.max_uses,i.used_count,i.active,i.created_at
  from public.school_invites i
  where i.school_id=v_member.school_id
  order by i.created_at desc
  limit 100;
end;
$$;

create or replace function public.revoke_school_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_school_id uuid;
  v_actor_member_id uuid;
begin
  select school_id into v_school_id
  from public.school_invites
  where id=p_invite_id;

  if v_school_id is null or not public.is_school_admin(v_school_id) then
    raise exception 'ليس لديك صلاحية إلغاء هذه الدعوة';
  end if;

  select id into v_actor_member_id
  from public.school_members
  where school_id=v_school_id and user_id=auth.uid() and member_status='active'
  order by is_admin desc,joined_at desc nulls last
  limit 1;

  update public.school_invites
  set active=false
  where id=p_invite_id;

  insert into public.school_access_audit(
    school_id,actor_member_id,target_member_id,action,details
  ) values (
    v_school_id,v_actor_member_id,null,'invite_revoked',
    jsonb_build_object('invite_id',p_invite_id)
  );
end;
$$;

create or replace function public.approve_school_member(
  p_member_id uuid,
  p_role text,
  p_is_admin boolean default false
)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_school_id uuid;
  v_actor_member_id uuid;
begin
  if p_role not in (
    'principal','vice_principal','counselor','teacher','admin_staff',
    'guard','observer','student','parent','custom'
  ) then
    raise exception 'Invalid school role';
  end if;

  select school_id into v_school_id
  from public.school_members
  where id=p_member_id;

  if v_school_id is null or not public.is_school_admin(v_school_id) then
    raise exception 'Not allowed';
  end if;

  select id into v_actor_member_id
  from public.school_members
  where school_id=v_school_id and user_id=auth.uid() and member_status='active'
  order by is_admin desc,joined_at desc nulls last
  limit 1;

  update public.school_members
  set role=p_role,
      is_admin=p_is_admin,
      permissions=case
        when permissions='{}'::jsonb then public.default_school_permissions(p_role)
        else permissions
      end,
      member_status='active',
      joined_at=coalesce(joined_at,now()),
      updated_at=now()
  where id=p_member_id and school_id=v_school_id;

  insert into public.school_access_audit(
    school_id,actor_member_id,target_member_id,action,details
  ) values (
    v_school_id,v_actor_member_id,p_member_id,'member_approved',
    jsonb_build_object('role',p_role,'is_admin',p_is_admin)
  );
end;
$$;

create or replace function public.set_school_member_status(p_member_id uuid,p_status text)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_school_id uuid;
  v_user_id uuid;
  v_actor_member_id uuid;
  v_old_status text;
begin
  if p_status not in ('active','rejected','suspended') then
    raise exception 'Invalid status';
  end if;

  select school_id,user_id,member_status
    into v_school_id,v_user_id,v_old_status
  from public.school_members
  where id=p_member_id;

  if v_school_id is null or not public.is_school_admin(v_school_id) then
    raise exception 'Not allowed';
  end if;

  if v_user_id=auth.uid() then
    raise exception 'You cannot suspend your own administrator membership';
  end if;

  select id into v_actor_member_id
  from public.school_members
  where school_id=v_school_id and user_id=auth.uid() and member_status='active'
  order by is_admin desc,joined_at desc nulls last
  limit 1;

  update public.school_members
  set member_status=p_status,updated_at=now()
  where id=p_member_id;

  insert into public.school_access_audit(
    school_id,actor_member_id,target_member_id,action,details
  ) values (
    v_school_id,v_actor_member_id,p_member_id,'member_status_changed',
    jsonb_build_object('old_status',v_old_status,'new_status',p_status)
  );
end;
$$;

revoke all on function public.get_school_invites() from public;
revoke all on function public.revoke_school_invite(uuid) from public;
grant execute on function public.get_school_invites() to authenticated;
grant execute on function public.revoke_school_invite(uuid) to authenticated;
