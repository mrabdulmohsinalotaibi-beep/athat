-- Expose effective group grants in school context so the client navigation matches RLS.

create or replace function public.get_my_school_context()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
declare
  v_member public.school_members%rowtype;
  v_school public.schools%rowtype;
  v_code text;
  v_members jsonb;
begin
  select * into v_member from public.school_members
  where user_id=auth.uid()
  order by (member_status='active') desc, created_at desc
  limit 1;

  if not found then
    return jsonb_build_object('membership',null,'school',null,'members','[]'::jsonb,'join_code',null);
  end if;

  select * into v_school from public.schools where id=v_member.school_id;

  if v_member.member_status='active' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id',m.id,'user_id',m.user_id,'display_name',m.display_name,'role',m.role,
      'member_status',m.member_status,'is_admin',m.is_admin,
      'permissions',m.permissions,'data_scope',m.data_scope,
      'group_permissions',coalesce((
        select jsonb_object_agg(key,true)
        from (
          select distinct e.key
          from public.school_permission_group_members gm
          join public.school_permission_groups g on g.id=gm.group_id
          cross join lateral jsonb_each(g.permissions) e(key,value)
          where gm.member_id=m.id
            and coalesce((e.value #>> '{}')::boolean,false)
        ) enabled
      ),'{}'::jsonb),
      'group_ids',coalesce((
        select jsonb_agg(gm.group_id order by gm.added_at)
        from public.school_permission_group_members gm
        where gm.member_id=m.id
      ),'[]'::jsonb),
      'access_expires_at',m.access_expires_at,
      'access_expired',(m.access_expires_at is not null and m.access_expires_at<=now()),
      'linked_student_ids',coalesce((
        select jsonb_agg(l.student_id order by l.created_at)
        from public.school_member_student_links l
        where l.member_id=m.id
      ),'[]'::jsonb),
      'joined_at',m.joined_at,'created_at',m.created_at
    ) order by m.created_at),'[]'::jsonb)
    into v_members
    from public.school_members m where m.school_id=v_member.school_id;
  else
    v_members:='[]'::jsonb;
  end if;

  if v_member.member_status='active' and v_member.is_admin then
    select join_code into v_code from public.school_join_codes where school_id=v_member.school_id;
  end if;

  return jsonb_build_object(
    'membership',jsonb_build_object(
      'id',v_member.id,'school_id',v_member.school_id,'role',v_member.role,
      'member_status',v_member.member_status,'is_admin',v_member.is_admin,
      'permissions',v_member.permissions,'data_scope',v_member.data_scope,
      'group_permissions',coalesce((
        select jsonb_object_agg(key,true)
        from (
          select distinct e.key
          from public.school_permission_group_members gm
          join public.school_permission_groups g on g.id=gm.group_id
          cross join lateral jsonb_each(g.permissions) e(key,value)
          where gm.member_id=v_member.id
            and coalesce((e.value #>> '{}')::boolean,false)
        ) enabled
      ),'{}'::jsonb),
      'group_ids',coalesce((
        select jsonb_agg(gm.group_id order by gm.added_at)
        from public.school_permission_group_members gm
        where gm.member_id=v_member.id
      ),'[]'::jsonb),
      'access_expires_at',v_member.access_expires_at,
      'access_expired',(v_member.access_expires_at is not null and v_member.access_expires_at<=now()),
      'linked_student_ids',coalesce((
        select jsonb_agg(l.student_id order by l.created_at)
        from public.school_member_student_links l
        where l.member_id=v_member.id
      ),'[]'::jsonb)
    ),
    'school',jsonb_build_object(
      'id',v_school.id,'name',v_school.name,'education_dept',v_school.education_dept,
      'education_office',v_school.education_office
    ),
    'members',coalesce(v_members,'[]'::jsonb),
    'join_code',v_code
  );
end;
$$;
