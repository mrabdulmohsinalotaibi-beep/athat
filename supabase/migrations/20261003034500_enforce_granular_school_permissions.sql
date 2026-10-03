-- Enforce granular team permissions at the database layer.
-- Explicit permissions are required for sensitive guidance data even for school admins.

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
            coalesce((m.permissions->>p_permission)::boolean,false)
            or coalesce((public.default_school_permissions(m.role)->>p_permission)::boolean,false)
          )
      )
    );
$$;

create table if not exists public.school_member_student_links (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  member_id uuid not null references public.school_members(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  relation text not null check (relation in ('assigned','self','child')),
  created_at timestamptz not null default now(),
  unique(member_id,student_id,relation)
);

alter table public.school_member_student_links enable row level security;

drop policy if exists school_member_student_links_admin_all on public.school_member_student_links;
create policy school_member_student_links_admin_all
on public.school_member_student_links for all to authenticated
using (public.is_school_admin(school_id))
with check (public.is_school_admin(school_id));

drop policy if exists school_member_student_links_self_read on public.school_member_student_links;
create policy school_member_student_links_self_read
on public.school_member_student_links for select to authenticated
using (
  exists(
    select 1 from public.school_members m
    where m.id=member_id and m.user_id=auth.uid() and m.member_status='active'
  )
);

create or replace function public.is_same_school_record_owner(p_record_owner uuid)
returns boolean
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select exists(
    select 1
    from public.school_members me
    join public.school_members owner_m on owner_m.school_id=me.school_id
    where me.user_id=auth.uid()
      and me.member_status='active'
      and owner_m.user_id=p_record_owner
      and owner_m.member_status='active'
  );
$$;

create or replace function public.member_scope_allows_student(
  p_record_owner uuid,
  p_student_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
declare
  v_member public.school_members%rowtype;
  v_scope_type text;
  v_student public.students%rowtype;
begin
  select * into v_member
  from public.school_members
  where user_id=auth.uid() and member_status='active'
  order by is_admin desc, joined_at desc nulls last
  limit 1;

  if v_member.id is null then return false; end if;
  if not public.is_same_school_record_owner(p_record_owner) then return false; end if;

  v_scope_type := coalesce(v_member.data_scope->>'type','school');

  if v_scope_type='school' then return true; end if;
  if p_student_id is null then return false; end if;

  if v_scope_type in ('assigned','self','children') then
    return exists(
      select 1
      from public.school_member_student_links l
      where l.member_id=v_member.id
        and l.student_id=p_student_id
        and l.relation=case
          when v_scope_type='assigned' then 'assigned'
          when v_scope_type='self' then 'self'
          else 'child'
        end
    );
  end if;

  select * into v_student
  from public.students
  where id=p_student_id and user_id=p_record_owner
  limit 1;

  if v_student.id is null then return false; end if;

  if v_scope_type='stage' then
    return coalesce(v_student.stage,'')=coalesce(v_member.data_scope->>'stage','');
  elsif v_scope_type='grade' then
    return coalesce(v_student.grade,'')=coalesce(v_member.data_scope->>'grade','');
  elsif v_scope_type='classroom' then
    return coalesce(v_student.classroom,'')=coalesce(v_member.data_scope->>'classroom','');
  end if;

  return false;
end;
$$;

revoke all on function public.is_same_school_record_owner(uuid) from public;
revoke all on function public.member_scope_allows_student(uuid,uuid) from public;
grant execute on function public.is_same_school_record_owner(uuid) to authenticated;
grant execute on function public.member_scope_allows_student(uuid,uuid) to authenticated;

-- Helper: replace old blanket restrictive policy with action-aware gates.
do $$
declare
  t text;
begin
  foreach t in array array[
    'students','counseling_cases','interviews','attendance','behavior','referrals',
    'programs','plan_tasks','evidences','reports'
  ]
  loop
    execute format('drop policy if exists guidance_role_gate on public.%I',t);
  end loop;
end $$;

-- Students
create policy students_permission_select_gate on public.students as restrictive
for select to authenticated using (public.member_has_permission('students.view'));
create policy students_permission_insert_gate on public.students as restrictive
for insert to authenticated with check (public.member_has_permission('students.edit'));
create policy students_permission_update_gate on public.students as restrictive
for update to authenticated using (public.member_has_permission('students.edit')) with check (public.member_has_permission('students.edit'));
create policy students_permission_delete_gate on public.students as restrictive
for delete to authenticated using (public.member_has_permission('students.edit'));

create policy school_students_shared_select on public.students
for select to authenticated
using (
  public.is_same_school_record_owner(user_id)
  and public.member_scope_allows_student(user_id,id)
);
create policy school_students_shared_update on public.students
for update to authenticated
using (
  public.is_same_school_record_owner(user_id)
  and public.member_scope_allows_student(user_id,id)
)
with check (
  public.is_same_school_record_owner(user_id)
  and public.member_scope_allows_student(user_id,id)
);

-- Student-linked guidance tables
do $$
declare
  t text;
  view_perm text;
  edit_perm text;
begin
  for t,view_perm,edit_perm in
    select * from (values
      ('counseling_cases','cases.view','cases.edit'),
      ('interviews','interviews.view','interviews.edit'),
      ('attendance','attendance.view','attendance.edit'),
      ('behavior','attendance.view','attendance.edit'),
      ('referrals','referrals.view','referrals.edit')
    ) v(t,view_perm,edit_perm)
  loop
    execute format('create policy %I on public.%I as restrictive for select to authenticated using (public.member_has_permission(%L))',
      t||'_permission_select_gate',t,view_perm);
    execute format('create policy %I on public.%I as restrictive for insert to authenticated with check (public.member_has_permission(%L))',
      t||'_permission_insert_gate',t,edit_perm);
    execute format('create policy %I on public.%I as restrictive for update to authenticated using (public.member_has_permission(%L)) with check (public.member_has_permission(%L))',
      t||'_permission_update_gate',t,edit_perm,edit_perm);
    execute format('create policy %I on public.%I as restrictive for delete to authenticated using (public.member_has_permission(%L))',
      t||'_permission_delete_gate',t,edit_perm);

    execute format('create policy %I on public.%I for select to authenticated using (public.is_same_school_record_owner(user_id) and public.member_scope_allows_student(user_id,student_id))',
      'school_'||t||'_shared_select',t);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_same_school_record_owner(user_id) and public.member_scope_allows_student(user_id,student_id)) with check (public.is_same_school_record_owner(user_id) and public.member_scope_allows_student(user_id,student_id))',
      'school_'||t||'_shared_update',t);
  end loop;
end $$;

-- School-wide modules without student scoping.
do $$
declare
  t text;
  view_perm text;
  edit_perm text;
begin
  for t,view_perm,edit_perm in
    select * from (values
      ('programs','programs.view','programs.edit'),
      ('plan_tasks','programs.view','programs.edit'),
      ('evidences','programs.view','programs.edit'),
      ('reports','reports.view','reports.create')
    ) v(t,view_perm,edit_perm)
  loop
    execute format('create policy %I on public.%I as restrictive for select to authenticated using (public.member_has_permission(%L))',
      t||'_permission_select_gate',t,view_perm);
    execute format('create policy %I on public.%I as restrictive for insert to authenticated with check (public.member_has_permission(%L))',
      t||'_permission_insert_gate',t,edit_perm);
    execute format('create policy %I on public.%I as restrictive for update to authenticated using (public.member_has_permission(%L)) with check (public.member_has_permission(%L))',
      t||'_permission_update_gate',t,edit_perm,edit_perm);
    execute format('create policy %I on public.%I as restrictive for delete to authenticated using (public.member_has_permission(%L))',
      t||'_permission_delete_gate',t,edit_perm);

    execute format('create policy %I on public.%I for select to authenticated using (public.is_same_school_record_owner(user_id))',
      'school_'||t||'_shared_select',t);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_same_school_record_owner(user_id)) with check (public.is_same_school_record_owner(user_id))',
      'school_'||t||'_shared_update',t);
  end loop;
end $$;

-- Free documents
drop policy if exists free_documents_permission_select_gate on public.free_documents;
create policy free_documents_permission_select_gate on public.free_documents as restrictive
for select to authenticated using (public.member_has_permission('documents.view'));
drop policy if exists free_documents_permission_insert_gate on public.free_documents;
create policy free_documents_permission_insert_gate on public.free_documents as restrictive
for insert to authenticated with check (public.member_has_permission('documents.edit'));
drop policy if exists free_documents_permission_update_gate on public.free_documents;
create policy free_documents_permission_update_gate on public.free_documents as restrictive
for update to authenticated using (public.member_has_permission('documents.edit')) with check (public.member_has_permission('documents.edit'));
drop policy if exists free_documents_permission_delete_gate on public.free_documents;
create policy free_documents_permission_delete_gate on public.free_documents as restrictive
for delete to authenticated using (public.member_has_permission('documents.edit'));

drop policy if exists school_free_documents_shared_select on public.free_documents;
create policy school_free_documents_shared_select on public.free_documents
for select to authenticated
using (
  public.is_same_school_record_owner(user_id)
  and (
    student_id is null
    or public.member_scope_allows_student(user_id,student_id)
  )
);

-- Blog authoring remains explicit.
drop policy if exists guidance_posts_insert_gate on public.posts;
create policy guidance_posts_insert_gate on public.posts as restrictive
for insert to authenticated with check (public.member_has_permission('posts.edit'));
drop policy if exists guidance_posts_update_gate on public.posts;
create policy guidance_posts_update_gate on public.posts as restrictive
for update to authenticated using (public.member_has_permission('posts.edit')) with check (public.member_has_permission('posts.edit'));
drop policy if exists guidance_posts_delete_gate on public.posts;
create policy guidance_posts_delete_gate on public.posts as restrictive
for delete to authenticated using (public.member_has_permission('posts.edit'));

drop policy if exists school_posts_shared_update on public.posts;
create policy school_posts_shared_update on public.posts
for update to authenticated
using (public.is_same_school_record_owner(user_id))
with check (public.is_same_school_record_owner(user_id));

-- Keep legacy helper aligned with the new explicit full-guidance permission.
create or replace function public.can_use_guidance_workspace()
returns boolean
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select public.member_has_permission('guidance.full');
$$;
