-- Expiring member access and auditable team permission changes.

alter table public.school_members
  add column if not exists access_expires_at timestamptz;

create table if not exists public.school_access_audit (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  actor_member_id uuid references public.school_members(id) on delete set null,
  target_member_id uuid references public.school_members(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.school_access_audit enable row level security;

drop policy if exists school_access_audit_admin_read on public.school_access_audit;
create policy school_access_audit_admin_read
on public.school_access_audit for select to authenticated
using (public.is_school_admin(school_id));

create index if not exists school_access_audit_school_created_idx
  on public.school_access_audit(school_id,created_at desc);

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
          and (m.access_expires_at is null or m.access_expires_at>now())
          and (
            coalesce((m.permissions->>p_permission)::boolean,false)
            or coalesce((public.default_school_permissions(m.role)->>p_permission)::boolean,false)
          )
      )
    );
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
  v_actor_member_id uuid;
  v_old_role text;
  v_old_permissions jsonb;
  v_old_scope jsonb;
  v_old_admin boolean;
begin
  select school_id,user_id,role,permissions,data_scope,is_admin
    into v_school_id,v_user_id,v_old_role,v_old_permissions,v_old_scope,v_old_admin
  from public.school_members where id=p_member_id;

  if v_school_id is null or not public.is_school_admin(v_school_id) then
    raise exception 'ليس لديك صلاحية تعديل هذا العضو';
  end if;

  select id into v_actor_member_id
  from public.school_members
  where school_id=v_school_id and user_id=auth.uid() and member_status='active'
  order by is_admin desc,joined_at desc nulls last
  limit 1;

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

  insert into public.school_access_audit(
    school_id,actor_member_id,target_member_id,action,details
  ) values (
    v_school_id,v_actor_member_id,p_member_id,'access_updated',
    jsonb_build_object(
      'old_role',v_old_role,'new_role',p_role,
      'old_permissions',v_old_permissions,'new_permissions',coalesce(p_permissions,'{}'::jsonb),
      'old_scope',v_old_scope,'new_scope',coalesce(p_data_scope,'{"type":"school"}'::jsonb),
      'old_admin',v_old_admin,'new_admin',p_is_admin
    )
  );
end;
$$;

create or replace function public.set_school_member_access_expiry(
  p_member_id uuid,
  p_access_expires_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_school_id uuid;
  v_user_id uuid;
  v_actor_member_id uuid;
  v_old_expiry timestamptz;
begin
  select school_id,user_id,access_expires_at
    into v_school_id,v_user_id,v_old_expiry
  from public.school_members where id=p_member_id;

  if v_school_id is null or not public.is_school_admin(v_school_id) then
    raise exception 'ليس لديك صلاحية تعديل مدة الوصول';
  end if;

  if v_user_id=auth.uid() and p_access_expires_at is not null then
    raise exception 'لا يمكنك وضع انتهاء صلاحية على حساب المسؤول الحالي';
  end if;

  select id into v_actor_member_id
  from public.school_members
  where school_id=v_school_id and user_id=auth.uid() and member_status='active'
  order by is_admin desc,joined_at desc nulls last
  limit 1;

  update public.school_members
  set access_expires_at=p_access_expires_at,updated_at=now()
  where id=p_member_id;

  insert into public.school_access_audit(
    school_id,actor_member_id,target_member_id,action,details
  ) values (
    v_school_id,v_actor_member_id,p_member_id,'expiry_updated',
    jsonb_build_object('old_expiry',v_old_expiry,'new_expiry',p_access_expires_at)
  );
end;
$$;

create or replace function public.get_school_access_audit(p_limit integer default 50)
returns table (
  id uuid,
  actor_name text,
  target_name text,
  action text,
  details jsonb,
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
    raise exception 'ليس لديك صلاحية عرض سجل الصلاحيات';
  end if;

  return query
  select
    a.id,
    coalesce(actor.display_name,'مسؤول') as actor_name,
    coalesce(target.display_name,'عضو') as target_name,
    a.action,
    a.details,
    a.created_at
  from public.school_access_audit a
  left join public.school_members actor on actor.id=a.actor_member_id
  left join public.school_members target on target.id=a.target_member_id
  where a.school_id=v_member.school_id
  order by a.created_at desc
  limit greatest(1,least(coalesce(p_limit,50),200));
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

revoke all on function public.set_school_member_access_expiry(uuid,timestamptz) from public;
revoke all on function public.get_school_access_audit(integer) from public;
grant execute on function public.set_school_member_access_expiry(uuid,timestamptz) to authenticated;
grant execute on function public.get_school_access_audit(integer) to authenticated;
