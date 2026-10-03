-- Granular school-team permissions, scoped access, and role-specific invite links.

alter table public.school_members
  drop constraint if exists school_members_role_check;

alter table public.school_members
  add constraint school_members_role_check
  check (role in (
    'principal','vice_principal','counselor','teacher','admin_staff',
    'guard','observer','student','parent','custom'
  ));

alter table public.school_members
  add column if not exists data_scope jsonb not null default '{"type":"school"}'::jsonb;

create table if not exists public.school_invites (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  created_by_member_id uuid not null references public.school_members(id) on delete cascade,
  token text not null unique,
  role text not null,
  permissions jsonb not null default '{}'::jsonb,
  data_scope jsonb not null default '{"type":"school"}'::jsonb,
  expires_at timestamptz not null default (now() + interval '7 days'),
  max_uses integer not null default 1 check (max_uses between 1 and 100),
  used_count integer not null default 0 check (used_count >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (role in (
    'principal','vice_principal','counselor','teacher','admin_staff',
    'guard','observer','student','parent','custom'
  ))
);

alter table public.school_invites enable row level security;

drop policy if exists school_invites_admin_read on public.school_invites;
create policy school_invites_admin_read
on public.school_invites for select to authenticated
using (public.is_school_admin(school_id));

create index if not exists school_invites_school_idx
  on public.school_invites(school_id, active, expires_at desc);

create or replace function public.default_school_permissions(p_role text)
returns jsonb
language sql
immutable
as $$
  select case p_role
    when 'principal' then '{
      "dashboard.view":true,"team.view":true,"team.manage":true,
      "tasks.view":true,"tasks.manage":true,
      "reports.view":true,"reports.create":true,"reports.approve":true,
      "messages.view":true,"messages.send":true,
      "documents.view":true,"documents.edit":true,
      "settings.view":true,"settings.edit":true
    }'::jsonb
    when 'vice_principal' then '{
      "dashboard.view":true,"team.view":true,"team.manage":true,
      "tasks.view":true,"tasks.manage":true,
      "reports.view":true,"reports.create":true,"reports.approve":true,
      "messages.view":true,"messages.send":true,
      "documents.view":true,"documents.edit":true,
      "settings.view":true
    }'::jsonb
    when 'counselor' then '{
      "dashboard.view":true,"team.view":true,
      "tasks.view":true,"tasks.manage":true,
      "reports.view":true,"reports.create":true,
      "messages.view":true,"messages.send":true,
      "documents.view":true,"documents.edit":true,
      "students.view":true,"students.edit":true,
      "programs.view":true,"programs.edit":true,
      "cases.view":true,"cases.edit":true,
      "interviews.view":true,"interviews.edit":true,
      "attendance.view":true,"attendance.edit":true,
      "referrals.view":true,"referrals.edit":true,
      "posts.view":true,"posts.edit":true,
      "guidance.full":true
    }'::jsonb
    when 'teacher' then '{
      "dashboard.view":true,"team.view":true,
      "tasks.view":true,
      "messages.view":true,"messages.send":true,
      "students.view":true,"referrals.view":true,"referrals.edit":true
    }'::jsonb
    when 'admin_staff' then '{
      "dashboard.view":true,"team.view":true,
      "tasks.view":true,
      "messages.view":true,"messages.send":true,
      "documents.view":true
    }'::jsonb
    when 'guard' then '{
      "dashboard.view":true,"tasks.view":true,"messages.view":true
    }'::jsonb
    when 'observer' then '{
      "dashboard.view":true,"team.view":true,"tasks.view":true,"reports.view":true
    }'::jsonb
    when 'student' then '{
      "dashboard.view":true,"messages.view":true,"documents.view":true
    }'::jsonb
    when 'parent' then '{
      "dashboard.view":true,"messages.view":true,"documents.view":true
    }'::jsonb
    else '{}'::jsonb
  end;
$$;

create or replace function public.member_has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select
    auth.uid() is not null
    and (
      not exists(select 1 from public.school_members where user_id=auth.uid())
      or exists(
        select 1
        from public.school_members m
        where m.user_id=auth.uid()
          and m.member_status='active'
          and (
            m.is_admin=true
            or coalesce((m.permissions->>p_permission)::boolean,false)
            or coalesce((public.default_school_permissions(m.role)->>p_permission)::boolean,false)
          )
      )
    );
$$;

revoke all on function public.member_has_permission(text) from public;
grant execute on function public.member_has_permission(text) to authenticated;

create or replace function public.create_school_invite(
  p_role text,
  p_permissions jsonb default '{}'::jsonb,
  p_data_scope jsonb default '{"type":"school"}'::jsonb,
  p_expires_days integer default 7,
  p_max_uses integer default 1
)
returns text
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_member public.school_members%rowtype;
  v_token text;
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

  v_token := lower(replace(gen_random_uuid()::text,'-',''));

  insert into public.school_invites(
    school_id,created_by_member_id,token,role,permissions,data_scope,expires_at,max_uses
  )
  values(
    v_member.school_id,v_member.id,v_token,p_role,
    coalesce(p_permissions,'{}'::jsonb),
    coalesce(p_data_scope,'{"type":"school"}'::jsonb),
    now() + make_interval(days => greatest(1,least(coalesce(p_expires_days,7),30))),
    greatest(1,least(coalesce(p_max_uses,1),100))
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

  update public.school_invites
  set used_count=used_count+1,
      active=case when used_count+1>=max_uses then false else active end
  where id=v_invite.id;

  return v_member_id;
end;
$$;

create or replace function public.update_school_member_access(
  p_member_id uuid,
  p_role text,
  p_permissions jsonb,
  p_data_scope jsonb,
  p_is_admin boolean default false
)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_school_id uuid;
  v_user_id uuid;
begin
  select school_id,user_id into v_school_id,v_user_id
  from public.school_members where id=p_member_id;

  if v_school_id is null or not public.is_school_admin(v_school_id) then
    raise exception 'ليس لديك صلاحية تعديل هذا العضو';
  end if;

  if v_user_id=auth.uid() and p_is_admin=false then
    raise exception 'لا يمكنك إزالة صلاحية الإدارة عن حسابك من هنا';
  end if;

  if p_role not in (
    'principal','vice_principal','counselor','teacher','admin_staff',
    'guard','observer','student','parent','custom'
  ) then
    raise exception 'الدور غير صالح';
  end if;

  update public.school_members
  set role=p_role,
      permissions=coalesce(p_permissions,'{}'::jsonb),
      data_scope=coalesce(p_data_scope,'{"type":"school"}'::jsonb),
      is_admin=p_is_admin,
      updated_at=now()
  where id=p_member_id and school_id=v_school_id;
end;
$$;

-- Preserve the old approval API while making role presets real.
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
declare v_school_id uuid;
begin
  if p_role not in (
    'principal','vice_principal','counselor','teacher','admin_staff',
    'guard','observer','student','parent','custom'
  ) then
    raise exception 'Invalid school role';
  end if;

  select school_id into v_school_id from public.school_members where id=p_member_id;
  if v_school_id is null or not public.is_school_admin(v_school_id) then raise exception 'Not allowed'; end if;

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
      'permissions',v_member.permissions,'data_scope',v_member.data_scope
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

revoke all on function public.create_school_invite(text,jsonb,jsonb,integer,integer) from public;
revoke all on function public.request_join_school_invite(text) from public;
revoke all on function public.update_school_member_access(uuid,text,jsonb,jsonb,boolean) from public;
grant execute on function public.create_school_invite(text,jsonb,jsonb,integer,integer) to authenticated;
grant execute on function public.request_join_school_invite(text) to authenticated;
grant execute on function public.update_school_member_access(uuid,text,jsonb,jsonb,boolean) to authenticated;
