-- Add manager approval to school tasks and only schedule recurring work after approval.

alter table public.school_tasks
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by_member_id uuid references public.school_members(id) on delete set null;

alter table public.school_tasks drop constraint if exists school_tasks_status_check;
alter table public.school_tasks
  add constraint school_tasks_status_check
  check (status in ('مسندة','قيد التنفيذ','مكتملة','معتمدة','معادة','ملغاة'));

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

  select * into v_task from public.school_tasks where id=p_task_id for update;
  if not found or v_task.assignee_member_id<>v_member.id then
    raise exception 'Task not found or not assigned to you';
  end if;
  if v_task.status in ('مكتملة','معتمدة','ملغاة') then
    raise exception 'This task is already closed';
  end if;
  if p_status not in ('قيد التنفيذ','مكتملة') then
    raise exception 'Invalid task status';
  end if;

  update public.school_tasks
  set status=p_status,
      completion_note=case when p_status='مكتملة' then nullif(trim(p_completion_note),'') else completion_note end,
      completed_at=case when p_status='مكتملة' then now() else null end,
      approved_at=null,
      approved_by_member_id=null,
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
          school_id,creator_member_id,assignee_member_id,title,description,category,priority,cadence,due_date,status
        )
        values(
          v_task.school_id,v_task.creator_member_id,v_task.assignee_member_id,
          v_task.title,v_task.description,v_task.category,v_task.priority,v_task.cadence,v_next_due,'مسندة'
        );
      end if;
    end if;
  else
    raise exception 'Invalid review action';
  end if;
end;
$$;

revoke all on function public.update_my_school_task(uuid,text,text) from public;
revoke all on function public.review_school_task(uuid,text,text) from public;
grant execute on function public.update_my_school_task(uuid,text,text) to authenticated;
grant execute on function public.review_school_task(uuid,text,text) to authenticated;