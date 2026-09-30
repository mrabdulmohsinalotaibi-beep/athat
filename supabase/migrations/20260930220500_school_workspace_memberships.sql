-- Multi-user school workspace foundation. Additive only: existing guidance records stay user-owned.

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  education_dept text,
  education_office text,
  owner_user_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists schools_owner_user_unique on public.schools(owner_user_id);

create table if not exists public.school_members (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null,
  display_name text,
  role text not null default 'teacher'
    check (role in ('principal','vice_principal','counselor','teacher','admin_staff','guard','observer')),
  member_status text not null default 'pending'
    check (member_status in ('pending','active','rejected','suspended')),
  is_admin boolean not null default false,
  permissions jsonb not null default '{}'::jsonb,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id,user_id)
);

create index if not exists school_members_user_idx on public.school_members(user_id,member_status);
create index if not exists school_members_school_idx on public.school_members(school_id,member_status);

create table if not exists public.school_join_codes (
  school_id uuid primary key references public.schools(id) on delete cascade,
  join_code text not null unique,
  updated_at timestamptz not null default now()
);

alter table public.schools enable row level security;
alter table public.school_members enable row level security;
alter table public.school_join_codes enable row level security;

create or replace function public.is_active_school_member(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select exists(
    select 1 from public.school_members
    where school_id=p_school_id and user_id=auth.uid() and member_status='active'
  );
$$;

create or replace function public.is_school_admin(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select exists(
    select 1 from public.school_members
    where school_id=p_school_id and user_id=auth.uid()
      and member_status='active' and is_admin=true
  );
$$;

drop policy if exists "members_read_school" on public.schools;
create policy "members_read_school" on public.schools
for select to authenticated
using (owner_user_id=auth.uid() or public.is_active_school_member(id));

drop policy if exists "members_read_school_members" on public.school_members;
create policy "members_read_school_members" on public.school_members
for select to authenticated
using (user_id=auth.uid() or public.is_active_school_member(school_id));

drop policy if exists "admins_read_join_code" on public.school_join_codes;
create policy "admins_read_join_code" on public.school_join_codes
for select to authenticated
using (public.is_school_admin(school_id));

create or replace function public.create_school_workspace(
  p_name text,
  p_education_dept text default null,
  p_education_office text default null,
  p_role text default 'counselor'
)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_school_id uuid;
  v_name text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if nullif(trim(p_name),'') is null then raise exception 'School name is required'; end if;
  if p_role not in ('principal','vice_principal','counselor','teacher','admin_staff','guard','observer') then
    raise exception 'Invalid school role';
  end if;
  if exists(select 1 from public.school_members where user_id=auth.uid() and member_status='active') then
    raise exception 'Account already belongs to an active school workspace';
  end if;

  select nullif(trim(full_name),'') into v_name
  from public.user_profiles where id=auth.uid();

  insert into public.schools(name,education_dept,education_office,owner_user_id)
  values(trim(p_name),nullif(trim(p_education_dept),''),nullif(trim(p_education_office),''),auth.uid())
  returning id into v_school_id;

  insert into public.school_members(school_id,user_id,display_name,role,member_status,is_admin,joined_at)
  values(v_school_id,auth.uid(),coalesce(v_name,'مسؤول المدرسة'),p_role,'active',true,now());

  insert into public.school_join_codes(school_id,join_code)
  values(v_school_id,upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)));

  return v_school_id;
end;
$$;

create or replace function public.request_join_school(p_join_code text)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_school_id uuid;
  v_name text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select school_id into v_school_id
  from public.school_join_codes
  where upper(join_code)=upper(trim(p_join_code));
  if v_school_id is null then raise exception 'Invalid school code'; end if;

  if exists(select 1 from public.school_members where user_id=auth.uid() and member_status='active' and school_id<>v_school_id) then
    raise exception 'Account already belongs to another active school workspace';
  end if;

  select nullif(trim(full_name),'') into v_name from public.user_profiles where id=auth.uid();

  insert into public.school_members(school_id,user_id,display_name,role,member_status,is_admin)
  values(v_school_id,auth.uid(),coalesce(v_name,'عضو مدرسة'),'teacher','pending',false)
  on conflict(school_id,user_id) do update
    set member_status=case when school_members.member_status='active' then 'active' else 'pending' end,
        display_name=coalesce(excluded.display_name,school_members.display_name),
        updated_at=now();

  return v_school_id;
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
declare v_school_id uuid;
begin
  if p_role not in ('principal','vice_principal','counselor','teacher','admin_staff','guard','observer') then
    raise exception 'Invalid school role';
  end if;
  select school_id into v_school_id from public.school_members where id=p_member_id;
  if v_school_id is null or not public.is_school_admin(v_school_id) then raise exception 'Not allowed'; end if;

  update public.school_members
  set role=p_role, is_admin=p_is_admin, member_status='active', joined_at=coalesce(joined_at,now()), updated_at=now()
  where id=p_member_id and school_id=v_school_id;
end;
$$;

create or replace function public.set_school_member_status(p_member_id uuid,p_status text)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v_school_id uuid; v_user_id uuid;
begin
  if p_status not in ('active','rejected','suspended') then raise exception 'Invalid status'; end if;
  select school_id,user_id into v_school_id,v_user_id from public.school_members where id=p_member_id;
  if v_school_id is null or not public.is_school_admin(v_school_id) then raise exception 'Not allowed'; end if;
  if v_user_id=auth.uid() then raise exception 'You cannot suspend your own administrator membership'; end if;
  update public.school_members set member_status=p_status,updated_at=now() where id=p_member_id;
end;
$$;

create or replace function public.rotate_school_join_code(p_school_id uuid)
returns text
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v_code text;
begin
  if not public.is_school_admin(p_school_id) then raise exception 'Not allowed'; end if;
  v_code:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  insert into public.school_join_codes(school_id,join_code,updated_at)
  values(p_school_id,v_code,now())
  on conflict(school_id) do update set join_code=excluded.join_code,updated_at=now();
  return v_code;
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

  if not found then return jsonb_build_object('membership',null,'school',null,'members','[]'::jsonb,'join_code',null); end if;
  select * into v_school from public.schools where id=v_member.school_id;

  if v_member.member_status='active' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id',m.id,'user_id',m.user_id,'display_name',m.display_name,'role',m.role,
      'member_status',m.member_status,'is_admin',m.is_admin,'joined_at',m.joined_at,'created_at',m.created_at
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
    'membership',jsonb_build_object('id',v_member.id,'school_id',v_member.school_id,'role',v_member.role,'member_status',v_member.member_status,'is_admin',v_member.is_admin),
    'school',jsonb_build_object('id',v_school.id,'name',v_school.name,'education_dept',v_school.education_dept,'education_office',v_school.education_office),
    'members',coalesce(v_members,'[]'::jsonb),
    'join_code',v_code
  );
end;
$$;

revoke all on function public.create_school_workspace(text,text,text,text) from public;
revoke all on function public.request_join_school(text) from public;
revoke all on function public.approve_school_member(uuid,text,boolean) from public;
revoke all on function public.set_school_member_status(uuid,text) from public;
revoke all on function public.rotate_school_join_code(uuid) from public;
revoke all on function public.get_my_school_context() from public;
grant execute on function public.create_school_workspace(text,text,text,text) to authenticated;
grant execute on function public.request_join_school(text) to authenticated;
grant execute on function public.approve_school_member(uuid,text,boolean) to authenticated;
grant execute on function public.set_school_member_status(uuid,text) to authenticated;
grant execute on function public.rotate_school_join_code(uuid) to authenticated;
grant execute on function public.get_my_school_context() to authenticated;

-- Bootstrap one workspace per existing school-settings owner without changing existing record ownership.
insert into public.schools(name,education_dept,education_office,owner_user_id)
select coalesce(nullif(trim(s.school_name),''),'مدرسة'),s.education_dept,s.education_office,s.user_id
from public.school_settings s
where not exists(select 1 from public.schools x where x.owner_user_id=s.user_id)
on conflict(owner_user_id) do nothing;

insert into public.school_members(school_id,user_id,display_name,role,member_status,is_admin,joined_at)
select sc.id,sc.owner_user_id,
  coalesce(nullif(trim(up.full_name),''),nullif(trim(ss.counselor_name),''),'مسؤول المدرسة'),
  case
    when coalesce(up.school_role,'') ilike '%مدير%' then 'principal'
    when coalesce(up.school_role,'') ilike '%وكيل%' then 'vice_principal'
    when coalesce(up.school_role,'') ilike '%موجه%' or coalesce(up.school_role,'') ilike '%مرشد%' then 'counselor'
    else 'counselor'
  end,
  'active',true,now()
from public.schools sc
left join public.user_profiles up on up.id=sc.owner_user_id
left join public.school_settings ss on ss.user_id=sc.owner_user_id
where not exists(select 1 from public.school_members m where m.school_id=sc.id and m.user_id=sc.owner_user_id)
on conflict(school_id,user_id) do nothing;

insert into public.school_join_codes(school_id,join_code)
select sc.id,upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))
from public.schools sc
where not exists(select 1 from public.school_join_codes j where j.school_id=sc.id)
on conflict(school_id) do nothing;