-- School task delegation workflow: higher role assigns, assignee executes, creator follows progress.

create table if not exists public.school_tasks (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  creator_member_id uuid not null references public.school_members(id) on delete restrict,
  assignee_member_id uuid not null references public.school_members(id) on delete restrict,
  title text not null,
  description text,
  category text not null default 'عام',
  priority text not null default 'متوسطة' check (priority in ('منخفضة','متوسطة','عالية')),
  cadence text not null default 'مرة واحدة' check (cadence in ('مرة واحدة','يومية','أسبوعية','شهرية','سنوية')),
  due_date date,
  status text not null default 'مسندة' check (status in ('مسندة','قيد التنفيذ','مكتملة','معادة','ملغاة')),
  completion_note text,
  completed_at timestamptz,
  returned_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists school_tasks_school_idx
  on public.school_tasks(school_id,status,due_date);
create index if not exists school_tasks_assignee_idx
  on public.school_tasks(assignee_member_id,status,due_date);
create index if not exists school_tasks_creator_idx
  on public.school_tasks(creator_member_id,created_at desc);

alter table public.school_tasks enable row level security;

drop policy if exists "school_task_participants_read" on public.school_tasks;
create policy "school_task_participants_read"
on public.school_tasks
for select to authenticated
using (
  exists (
    select 1 from public.school_members m
    where m.id=creator_member_id and m.user_id=auth.uid() and m.member_status='active'
  )
  or exists (
    select 1 from public.school_members m
    where m.id=assignee_member_id and m.user_id=auth.uid() and m.member_status='active'
  )
  or public.is_school_admin(school_id)
);

create or replace function public.create_school_task(
  p_assignee_member_id uuid,
  p_title text,
  p_description text default null,
  p_category text default 'عام',
  p_priority text default 'متوسطة',
  p_cadence text default 'مرة واحدة',
  p_due_date date default null
)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_creator public.school_members%rowtype;
  v_assignee public.school_members%rowtype;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into v_creator
  from public.school_members
  where user_id=auth.uid() and member_status='active'
  order by is_admin desc, joined_at desc nulls last
  limit 1;

  if not found then raise exception 'Active school membership required'; end if;

  select * into v_assignee
  from public.school_members
  where id=p_assignee_member_id
    and school_id=v_creator.school_id
    and member_status='active';

  if not found then raise exception 'Assignee is not an active member of your school'; end if;
  if v_assignee.id=v_creator.id then raise exception 'Choose another team member'; end if;
  if public.school_role_rank(v_creator.role) <= public.school_role_rank(v_assignee.role) then
    raise exception 'Tasks can only be assigned to a lower school role';
  end if;
  if nullif(trim(p_title),'') is null then raise exception 'Task title is required'; end if;
  if p_priority not in ('منخفضة','متوسطة','عالية') then raise exception 'Invalid priority'; end if;
  if p_cadence not in ('مرة واحدة','يومية','أسبوعية','شهرية','سنوية') then raise exception 'Invalid cadence'; end if;

  insert into public.school_tasks(
    school_id,creator_member_id,assignee_member_id,title,description,category,priority,cadence,due_date
  )
  values(
    v_creator.school_id,v_creator.id,v_assignee.id,trim(p_title),nullif(trim(p_description),''),
    coalesce(nullif(trim(p_category),''),'عام'),p_priority,p_cadence,p_due_date
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.update_my_school_task(
  p_task_id uuid,
  p_status text,
  p_completion_note text default null
)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_task public.school_tasks%rowtype;
  v_member public.school_members%rowtype;
begin
  select * into v_member
  from public.school_members
  where user_id=auth.uid() and member_status='active'
  order by is_admin desc, joined_at desc nulls last
  limit 1;
  if not found then raise exception 'Active school membership required'; end if;

  select * into v_task from public.school_tasks where id=p_task_id;
  if not found or v_task.assignee_member_id<>v_member.id then
    raise exception 'Task not found or not assigned to you';
  end if;
  if p_status not in ('قيد التنفيذ','مكتملة') then
    raise exception 'Invalid task status';
  end if;

  update public.school_tasks
  set status=p_status,
      completion_note=case when p_status='مكتملة' then nullif(trim(p_completion_note),'') else completion_note end,
      completed_at=case when p_status='مكتملة' then now() else null end,
      returned_note=case when p_status='قيد التنفيذ' then null else returned_note end,
      updated_at=now()
  where id=p_task_id;
end;
$$;

create or replace function public.review_school_task(
  p_task_id uuid,
  p_action text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_task public.school_tasks%rowtype;
  v_member public.school_members%rowtype;
begin
  select * into v_member
  from public.school_members
  where user_id=auth.uid() and member_status='active'
  order by is_admin desc, joined_at desc nulls last
  limit 1;
  if not found then raise exception 'Active school membership required'; end if;

  select * into v_task from public.school_tasks where id=p_task_id;
  if not found or v_task.school_id<>v_member.school_id then raise exception 'Task not found'; end if;
  if v_task.creator_member_id<>v_member.id and not v_member.is_admin then
    raise exception 'Only the task creator or school admin can review this task';
  end if;

  if p_action='إعادة' then
    update public.school_tasks
    set status='معادة',returned_note=nullif(trim(p_note),''),completed_at=null,updated_at=now()
    where id=p_task_id;
  elsif p_action='إلغاء' then
    update public.school_tasks
    set status='ملغاة',returned_note=nullif(trim(p_note),''),updated_at=now()
    where id=p_task_id;
  elsif p_action='اعتماد' then
    if v_task.status<>'مكتملة' then raise exception 'Only completed tasks can be approved'; end if;
    update public.school_tasks set updated_at=now() where id=p_task_id;
  else
    raise exception 'Invalid review action';
  end if;
end;
$$;

revoke all on function public.create_school_task(uuid,text,text,text,text,text,date) from public;
revoke all on function public.update_my_school_task(uuid,text,text) from public;
revoke all on function public.review_school_task(uuid,text,text) from public;
grant execute on function public.create_school_task(uuid,text,text,text,text,text,date) to authenticated;
grant execute on function public.update_my_school_task(uuid,text,text) to authenticated;
grant execute on function public.review_school_task(uuid,text,text) to authenticated;