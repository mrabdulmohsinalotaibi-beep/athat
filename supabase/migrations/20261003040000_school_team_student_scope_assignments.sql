-- Practical student/classroom scope assignment for school-team permissions.

alter table public.school_invites
  add column if not exists student_ids uuid[] not null default '{}'::uuid[];

create or replace function public.get_school_permission_students()
returns table (
  id uuid,
  full_name text,
  student_no text,
  stage text,
  grade text,
  classroom text,
  guardian_name text
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
  order by is_admin desc, joined_at desc nulls last
  limit 1;

  if v_member.id is null or not v_member.is_admin then
    raise exception 'ليس لديك صلاحية إدارة نطاق الطلاب';
  end if;

  return query
  select distinct on (s.id)
    s.id,s.full_name,s.student_no,s.stage,s.grade,s.classroom,s.guardian_name
  from public.students s
  join public.school_members owner_m
    on owner_m.user_id=s.user_id
   and owner_m.school_id=v_member.school_id
   and owner_m.member_status='active'
  order by s.id,s.full_name;
end;
$$;

create or replace function public.set_school_member_student_links(
  p_member_id uuid,
  p_student_ids uuid[],
  p_relation text
)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_school_id uuid;
begin
  if p_relation not in ('assigned','self','child') then
    raise exception 'نوع الربط غير صالح';
  end if;

  select school_id into v_school_id
  from public.school_members
  where id=p_member_id;

  if v_school_id is null or not public.is_school_admin(v_school_id) then
    raise exception 'ليس لديك صلاحية تعديل نطاق الطلاب';
  end if;

  if p_relation='self' and coalesce(array_length(p_student_ids,1),0)>1 then
    raise exception 'يمكن ربط الطالب بملف طالب واحد فقط';
  end if;

  if exists(
    select 1
    from unnest(coalesce(p_student_ids,'{}'::uuid[])) x(student_id)
    left join public.students s on s.id=x.student_id
    left join public.school_members owner_m
      on owner_m.user_id=s.user_id
     and owner_m.school_id=v_school_id
     and owner_m.member_status='active'
    where s.id is null or owner_m.id is null
  ) then
    raise exception 'يوجد طالب خارج نطاق المدرسة';
  end if;

  delete from public.school_member_student_links
  where member_id=p_member_id;

  insert into public.school_member_student_links(school_id,member_id,student_id,relation)
  select v_school_id,p_member_id,x.student_id,p_relation
  from unnest(coalesce(p_student_ids,'{}'::uuid[])) x(student_id)
  on conflict(member_id,student_id,relation) do nothing;
end;
$$;

drop function if exists public.create_school_invite(text,jsonb,jsonb,integer,integer);

create function public.create_school_invite(
  p_role text,
  p_permissions jsonb default '{}'::jsonb,
  p_data_scope jsonb default '{"type":"school"}'::jsonb,
  p_expires_days integer default 7,
  p_max_uses integer default 1,
  p_student_ids uuid[] default '{}'::uuid[]
)
returns text
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_member public.school_members%rowtype;
  v_token text;
  v_scope_type text := coalesce(p_data_scope->>'type','school');
begin
  select * into v_member
  from public.school_members
  where user_id=auth.uid() and member_status='active'
  order by is_admin desc, joined_at desc nulls last
  limit 1;

  if v_member.id is null or not v_member.is_admin then
    raise exception 'ليس لديك صلاحية إنشاء دعوات';
  end if;

  if p_role not in (
    'principal','vice_principal','counselor','teacher','admin_staff',
    'guard','observer','student','parent','custom'
  ) then
    raise exception 'الدور غير صالح';
  end if;

  if v_scope_type='self' and coalesce(array_length(p_student_ids,1),0)>1 then
    raise exception 'دعوة الطالب تسمح بملف طالب واحد فقط';
  end if;

  if exists(
    select 1
    from unnest(coalesce(p_student_ids,'{}'::uuid[])) x(student_id)
    left join public.students s on s.id=x.student_id
    left join public.school_members owner_m
      on owner_m.user_id=s.user_id
     and owner_m.school_id=v_member.school_id
     and owner_m.member_status='active'
    where s.id is null or owner_m.id is null
  ) then
    raise exception 'يوجد طالب خارج نطاق المدرسة';
  end if;

  v_token := lower(replace(gen_random_uuid()::text,'-',''));

  insert into public.school_invites(
    school_id,created_by_member_id,token,role,permissions,data_scope,
    expires_at,max_uses,student_ids
  )
  values(
    v_member.school_id,v_member.id,v_token,p_role,
    coalesce(p_permissions,'{}'::jsonb),
    coalesce(p_data_scope,'{"type":"school"}'::jsonb),
    now() + make_interval(days => greatest(1,least(coalesce(p_expires_days,7),30))),
    greatest(1,least(coalesce(p_max_uses,1),100)),
    coalesce(p_student_ids,'{}'::uuid[])
  );

  return v_token;
end;
$$;

create or replace function public.request_join_school_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_invite public.school_invites%rowtype;
  v_name text;
  v_member_id uuid;
  v_relation text;
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول أولاً'; end if;

  select * into v_invite
  from public.school_invites
  where token=lower(trim(p_token))
    and active=true
    and expires_at>now()
    and used_count<max_uses
  limit 1;

  if v_invite.id is null then raise exception 'رابط الدعوة غير صالح أو منتهي'; end if;

  if exists(
    select 1 from public.school_members
    where user_id=auth.uid() and member_status='active' and school_id<>v_invite.school_id
  ) then
    raise exception 'الحساب مرتبط بمدرسة أخرى';
  end if;

  select nullif(trim(full_name),'') into v_name
  from public.user_profiles where id=auth.uid();

  insert into public.school_members(
    school_id,user_id,display_name,role,member_status,is_admin,permissions,data_scope
  )
  values(
    v_invite.school_id,auth.uid(),coalesce(v_name,'عضو مدرسة'),
    v_invite.role,'pending',false,v_invite.permissions,v_invite.data_scope
  )
  on conflict(school_id,user_id) do update
    set display_name=coalesce(excluded.display_name,school_members.display_name),
        role=case when school_members.member_status='active' then school_members.role else excluded.role end,
        permissions=case when school_members.member_status='active' then school_members.permissions else excluded.permissions end,
        data_scope=case when school_members.member_status='active' then school_members.data_scope else excluded.data_scope end,
        member_status=case when school_members.member_status='active' then 'active' else 'pending' end,
        updated_at=now()
  returning id into v_member_id;

  v_relation := case coalesce(v_invite.data_scope->>'type','')
    when 'self' then 'self'
    when 'children' then 'child'
    else 'assigned'
  end;

  delete from public.school_member_student_links where member_id=v_member_id;

  if coalesce(v_invite.data_scope->>'type','') in ('assigned','self','children') then
    insert into public.school_member_student_links(school_id,member_id,student_id,relation)
    select v_invite.school_id,v_member_id,x.student_id,v_relation
    from unnest(coalesce(v_invite.student_ids,'{}'::uuid[])) x(student_id)
    on conflict(member_id,student_id,relation) do nothing;
  end if;

  update public.school_invites
  set used_count=used_count+1,
      active=case when used_count+1>=max_uses then false else active end
  where id=v_invite.id;

  return v_member_id;
end;
$$;

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

revoke all on function public.get_school_permission_students() from public;
revoke all on function public.set_school_member_student_links(uuid,uuid[],text) from public;
revoke all on function public.create_school_invite(text,jsonb,jsonb,integer,integer,uuid[]) from public;
grant execute on function public.get_school_permission_students() to authenticated;
grant execute on function public.set_school_member_student_links(uuid,uuid[],text) to authenticated;
grant execute on function public.create_school_invite(text,jsonb,jsonb,integer,integer,uuid[]) to authenticated;
