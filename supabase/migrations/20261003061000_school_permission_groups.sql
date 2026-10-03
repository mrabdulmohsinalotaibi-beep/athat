-- Permission groups for school teams (e.g. third-grade teachers, discipline committee).

create table if not exists public.school_permission_groups (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  description text,
  permissions jsonb not null default '{}'::jsonb,
  created_by_member_id uuid references public.school_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(school_id,name)
);

create table if not exists public.school_permission_group_members (
  group_id uuid not null references public.school_permission_groups(id) on delete cascade,
  member_id uuid not null references public.school_members(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key(group_id,member_id)
);

alter table public.school_permission_groups enable row level security;
alter table public.school_permission_group_members enable row level security;

drop policy if exists school_permission_groups_admin_all on public.school_permission_groups;
create policy school_permission_groups_admin_all
on public.school_permission_groups for all to authenticated
using (public.is_school_admin(school_id))
with check (public.is_school_admin(school_id));

drop policy if exists school_permission_groups_member_read on public.school_permission_groups;
create policy school_permission_groups_member_read
on public.school_permission_groups for select to authenticated
using (
  exists(
    select 1 from public.school_members me
    where me.school_id=school_permission_groups.school_id
      and me.user_id=auth.uid()
      and me.member_status='active'
  )
);

drop policy if exists school_permission_group_members_admin_all on public.school_permission_group_members;
create policy school_permission_group_members_admin_all
on public.school_permission_group_members for all to authenticated
using (
  exists(
    select 1
    from public.school_permission_groups g
    where g.id=group_id and public.is_school_admin(g.school_id)
  )
)
with check (
  exists(
    select 1
    from public.school_permission_groups g
    where g.id=group_id and public.is_school_admin(g.school_id)
  )
);

drop policy if exists school_permission_group_members_self_read on public.school_permission_group_members;
create policy school_permission_group_members_self_read
on public.school_permission_group_members for select to authenticated
using (
  exists(
    select 1 from public.school_members me
    where me.id=member_id and me.user_id=auth.uid() and me.member_status='active'
  )
);

create index if not exists school_permission_groups_school_idx
  on public.school_permission_groups(school_id,created_at desc);
create index if not exists school_permission_group_members_member_idx
  on public.school_permission_group_members(member_id);

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
            or exists(
              select 1
              from public.school_permission_group_members gm
              join public.school_permission_groups g on g.id=gm.group_id
              where gm.member_id=m.id
                and g.school_id=m.school_id
                and coalesce((g.permissions->>p_permission)::boolean,false)
            )
          )
      )
    );
$$;

create or replace function public.get_school_permission_groups()
returns jsonb
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

  if v_member.id is null then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id',g.id,
        'name',g.name,
        'description',g.description,
        'permissions',g.permissions,
        'created_at',g.created_at,
        'member_ids',coalesce((
          select jsonb_agg(gm.member_id order by gm.added_at)
          from public.school_permission_group_members gm
          where gm.group_id=g.id
        ),'[]'::jsonb)
      )
      order by g.created_at desc
    )
    from public.school_permission_groups g
    where g.school_id=v_member.school_id
  ),'[]'::jsonb);
end;
$$;

create or replace function public.save_school_permission_group(
  p_group_id uuid,
  p_name text,
  p_description text,
  p_permissions jsonb,
  p_member_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_actor public.school_members%rowtype;
  v_group_id uuid;
begin
  select * into v_actor
  from public.school_members
  where user_id=auth.uid() and member_status='active'
  order by is_admin desc,joined_at desc nulls last
  limit 1;

  if v_actor.id is null or not v_actor.is_admin then
    raise exception 'ليس لديك صلاحية إدارة مجموعات الصلاحيات';
  end if;

  if char_length(trim(coalesce(p_name,''))) < 2 then
    raise exception 'اكتب اسمًا واضحًا للمجموعة';
  end if;

  if exists(
    select 1
    from unnest(coalesce(p_member_ids,'{}'::uuid[])) x(member_id)
    left join public.school_members m on m.id=x.member_id and m.school_id=v_actor.school_id
    where m.id is null
  ) then
    raise exception 'يوجد عضو خارج المدرسة';
  end if;

  if p_group_id is null then
    insert into public.school_permission_groups(
      school_id,name,description,permissions,created_by_member_id
    )
    values(
      v_actor.school_id,left(trim(p_name),120),
      nullif(left(trim(coalesce(p_description,'')),500),''),
      coalesce(p_permissions,'{}'::jsonb),v_actor.id
    )
    returning id into v_group_id;

    insert into public.school_access_audit(
      school_id,actor_member_id,target_member_id,action,details
    )
    values(
      v_actor.school_id,v_actor.id,null,'permission_group_created',
      jsonb_build_object('group_id',v_group_id,'name',trim(p_name))
    );
  else
    select id into v_group_id
    from public.school_permission_groups
    where id=p_group_id and school_id=v_actor.school_id;

    if v_group_id is null then raise exception 'المجموعة غير موجودة'; end if;

    update public.school_permission_groups
    set name=left(trim(p_name),120),
        description=nullif(left(trim(coalesce(p_description,'')),500),''),
        permissions=coalesce(p_permissions,'{}'::jsonb),
        updated_at=now()
    where id=v_group_id;

    insert into public.school_access_audit(
      school_id,actor_member_id,target_member_id,action,details
    )
    values(
      v_actor.school_id,v_actor.id,null,'permission_group_updated',
      jsonb_build_object('group_id',v_group_id,'name',trim(p_name))
    );
  end if;

  delete from public.school_permission_group_members where group_id=v_group_id;

  insert into public.school_permission_group_members(group_id,member_id)
  select v_group_id,x.member_id
  from unnest(coalesce(p_member_ids,'{}'::uuid[])) x(member_id)
  on conflict do nothing;

  return v_group_id;
end;
$$;

create or replace function public.delete_school_permission_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_actor public.school_members%rowtype;
  v_name text;
begin
  select * into v_actor
  from public.school_members
  where user_id=auth.uid() and member_status='active'
  order by is_admin desc,joined_at desc nulls last
  limit 1;

  if v_actor.id is null or not v_actor.is_admin then
    raise exception 'ليس لديك صلاحية حذف المجموعة';
  end if;

  select name into v_name
  from public.school_permission_groups
  where id=p_group_id and school_id=v_actor.school_id;

  if v_name is null then raise exception 'المجموعة غير موجودة'; end if;

  delete from public.school_permission_groups
  where id=p_group_id and school_id=v_actor.school_id;

  insert into public.school_access_audit(
    school_id,actor_member_id,target_member_id,action,details
  )
  values(
    v_actor.school_id,v_actor.id,null,'permission_group_deleted',
    jsonb_build_object('group_id',p_group_id,'name',v_name)
  );
end;
$$;

revoke all on function public.get_school_permission_groups() from public;
revoke all on function public.save_school_permission_group(uuid,text,text,jsonb,uuid[]) from public;
revoke all on function public.delete_school_permission_group(uuid) from public;
grant execute on function public.get_school_permission_groups() to authenticated;
grant execute on function public.save_school_permission_group(uuid,text,text,jsonb,uuid[]) to authenticated;
grant execute on function public.delete_school_permission_group(uuid) to authenticated;
