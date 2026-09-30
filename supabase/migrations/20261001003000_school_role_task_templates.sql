-- Role-based task templates can be activated safely for the current member
-- or delegated to a lower role. Existing business records are not modified.

alter table public.school_tasks
  add column if not exists template_key text;

create index if not exists school_tasks_template_idx
  on public.school_tasks(school_id,assignee_member_id,template_key,status)
  where template_key is not null;

create or replace function public.activate_school_task_template(
  p_assignee_member_id uuid,
  p_template_key text,
  p_title text,
  p_description text default null,
  p_category text default 'عام',
  p_priority text default 'متوسطة',
  p_cadence text default 'أسبوعية',
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
  v_existing uuid;
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

  if v_assignee.id<>v_creator.id
     and public.school_role_rank(v_creator.role) <= public.school_role_rank(v_assignee.role) then
    raise exception 'Task templates can only be assigned to yourself or a lower school role';
  end if;

  if nullif(trim(p_template_key),'') is null then raise exception 'Template key is required'; end if;
  if nullif(trim(p_title),'') is null then raise exception 'Task title is required'; end if;
  if p_priority not in ('منخفضة','متوسطة','عالية') then raise exception 'Invalid priority'; end if;
  if p_cadence not in ('مرة واحدة','يومية','أسبوعية','شهرية','سنوية') then raise exception 'Invalid cadence'; end if;

  select id into v_existing
  from public.school_tasks
  where school_id=v_creator.school_id
    and assignee_member_id=v_assignee.id
    and template_key=trim(p_template_key)
    and status not in ('معتمدة','ملغاة')
  order by created_at desc
  limit 1;

  if v_existing is not null then
    return v_existing;
  end if;

  insert into public.school_tasks(
    school_id,creator_member_id,assignee_member_id,title,description,category,
    priority,cadence,due_date,status,template_key
  )
  values(
    v_creator.school_id,v_creator.id,v_assignee.id,trim(p_title),nullif(trim(p_description),''),
    coalesce(nullif(trim(p_category),''),'عام'),p_priority,p_cadence,p_due_date,'مسندة',trim(p_template_key)
  )
  returning id into v_id;

  return v_id;
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
  v_next_due date;
begin
  select * into v_member
  from public.school_members
  where user_id=auth.uid() and member_status='active'
  order by is_admin desc, joined_at desc nulls last
  limit 1;
  if not found then raise exception 'Active school membership required'; end if;

  select * into v_task from public.school_tasks where id=p_task_id for update;
  if not found or v_task.school_id<>v_member.school_id then raise exception 'Task not found'; end if;
  if v_task.creator_member_id<>v_member.id and not v_member.is_admin then
    raise exception 'Only the task creator or school admin can review this task';
  end if;

  if p_action='إعادة' then
    if v_task.status<>'مكتملة' then raise exception 'Only completed tasks can be returned'; end if;
    update public.school_tasks
    set status='معادة',returned_note=nullif(trim(p_note),''),completed_at=null,
        approved_at=null,approved_by_member_id=null,updated_at=now()
    where id=p_task_id;

  elsif p_action='إلغاء' then
    if v_task.status in ('مكتملة','معتمدة') then raise exception 'Completed tasks must be reviewed instead of cancelled'; end if;
    update public.school_tasks
    set status='ملغاة',returned_note=nullif(trim(p_note),''),updated_at=now()
    where id=p_task_id;

  elsif p_action='اعتماد' then
    if v_task.status<>'مكتملة' then raise exception 'Only completed tasks can be approved'; end if;

    update public.school_tasks
    set status='معتمدة',approved_at=now(),approved_by_member_id=v_member.id,updated_at=now()
    where id=p_task_id;

    if v_task.cadence<>'مرة واحدة' then
      v_next_due := coalesce(v_task.due_date,current_date);
      v_next_due := case v_task.cadence
        when 'يومية' then v_next_due + 1
        when 'أسبوعية' then v_next_due + 7
        when 'شهرية' then (v_next_due + interval '1 month')::date
        when 'سنوية' then (v_next_due + interval '1 year')::date
        else null
      end;

      if v_next_due is not null then
        insert into public.school_tasks(
          school_id,creator_member_id,assignee_member_id,title,description,category,
          priority,cadence,due_date,status,template_key
        )
        values(
          v_task.school_id,v_task.creator_member_id,v_task.assignee_member_id,
          v_task.title,v_task.description,v_task.category,v_task.priority,v_task.cadence,
          v_next_due,'مسندة',v_task.template_key
        );
      end if;
    end if;
  else
    raise exception 'Invalid review action';
  end if;
end;
$$;

revoke all on function public.activate_school_task_template(uuid,text,text,text,text,text,text,date) from public;
grant execute on function public.activate_school_task_template(uuid,text,text,text,text,text,text,date) to authenticated;

revoke all on function public.review_school_task(uuid,text,text) from public;
grant execute on function public.review_school_task(uuid,text,text) to authenticated;
