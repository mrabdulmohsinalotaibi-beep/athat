-- Enforce school-role access at the database layer.
-- Guidance records remain private to the counselor account; management receives
-- explicit report handoffs instead of unrestricted access to raw case notes.

create or replace function public.can_use_guidance_workspace()
returns boolean
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select
    auth.uid() is not null
    and (
      not exists (
        select 1
        from public.school_members m
        where m.user_id=auth.uid() and m.member_status='active'
      )
      or exists (
        select 1
        from public.school_members m
        where m.user_id=auth.uid()
          and m.member_status='active'
          and m.role='counselor'
      )
    );
$$;

create or replace function public.can_manage_school_configuration()
returns boolean
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select
    auth.uid() is not null
    and (
      not exists (
        select 1
        from public.school_members m
        where m.user_id=auth.uid() and m.member_status='active'
      )
      or exists (
        select 1
        from public.school_members m
        where m.user_id=auth.uid()
          and m.member_status='active'
          and (m.role='counselor' or m.is_admin=true)
      )
    );
$$;

revoke all on function public.can_use_guidance_workspace() from public;
revoke all on function public.can_manage_school_configuration() from public;
grant execute on function public.can_use_guidance_workspace() to authenticated;
grant execute on function public.can_manage_school_configuration() to authenticated;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'students',
    'counseling_cases',
    'interviews',
    'attendance',
    'behavior',
    'referrals',
    'committees',
    'plan_tasks',
    'programs',
    'evidences',
    'calendar_events',
    'reports',
    'feedback_messages',
    'lookups',
    'deleted_records',
    'audit_log'
  ]
  loop
    if to_regclass('public.' || v_table) is not null then
      execute format('drop policy if exists guidance_role_gate on public.%I', v_table);
      execute format(
        'create policy guidance_role_gate on public.%I as restrictive for all to authenticated using (public.can_use_guidance_workspace()) with check (public.can_use_guidance_workspace())',
        v_table
      );
    end if;
  end loop;
end $$;

-- Incoming public service requests may be created by public forms, so only
-- authenticated read/update/delete access is role-gated.
drop policy if exists guidance_request_read_gate on public.public_requests;
create policy guidance_request_read_gate
on public.public_requests as restrictive
for select to authenticated
using (public.can_use_guidance_workspace());

drop policy if exists guidance_request_update_gate on public.public_requests;
create policy guidance_request_update_gate
on public.public_requests as restrictive
for update to authenticated
using (public.can_use_guidance_workspace())
with check (public.can_use_guidance_workspace());

drop policy if exists guidance_request_delete_gate on public.public_requests;
create policy guidance_request_delete_gate
on public.public_requests as restrictive
for delete to authenticated
using (public.can_use_guidance_workspace());

-- Public posts must remain readable. Only authoring operations are restricted
-- to the guidance workspace.
drop policy if exists guidance_posts_insert_gate on public.posts;
create policy guidance_posts_insert_gate
on public.posts as restrictive
for insert to authenticated
with check (public.can_use_guidance_workspace());

drop policy if exists guidance_posts_update_gate on public.posts;
create policy guidance_posts_update_gate
on public.posts as restrictive
for update to authenticated
using (public.can_use_guidance_workspace())
with check (public.can_use_guidance_workspace());

drop policy if exists guidance_posts_delete_gate on public.posts;
create policy guidance_posts_delete_gate
on public.posts as restrictive
for delete to authenticated
using (public.can_use_guidance_workspace());

drop policy if exists school_configuration_role_gate on public.school_settings;
create policy school_configuration_role_gate
on public.school_settings as restrictive
for all to authenticated
using (public.can_manage_school_configuration())
with check (public.can_manage_school_configuration());
