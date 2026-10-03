create or replace function public.get_school_group_task_performance(
  p_group_id uuid,
  p_days integer default 30
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
declare
  v_member public.school_members%rowtype;
  v_group public.school_permission_groups%rowtype;
  v_days integer := greatest(1,least(coalesce(p_days,30),365));
begin
  select * into v_member
  from public.school_members
  where user_id=auth.uid()
    and member_status='active'
    and (access_expires_at is null or access_expires_at>now())
  order by is_admin desc,joined_at desc nulls last
  limit 1;

  if v_member.id is null then raise exception 'Active school membership required'; end if;
  if not (v_member.is_admin or public.member_has_permission('tasks.manage') or public.member_has_permission('reports.view')) then
    raise exception 'ليس لديك صلاحية عرض أداء المجموعة';
  end if;

  select * into v_group
  from public.school_permission_groups
  where id=p_group_id and school_id=v_member.school_id;
  if v_group.id is null then raise exception 'المجموعة غير موجودة'; end if;

  return jsonb_build_object(
    'group_id',v_group.id,
    'group_name',v_group.name,
    'days',v_days,
    'generated_at',now(),
    'members',coalesce((
      select jsonb_agg(jsonb_build_object(
        'member_id',x.member_id,
        'display_name',x.display_name,
        'role',x.role,
        'total_tasks',x.total_tasks,
        'completed_tasks',x.completed_tasks,
        'approved_tasks',x.approved_tasks,
        'open_tasks',x.open_tasks,
        'overdue_tasks',x.overdue_tasks,
        'completion_rate',case when x.total_tasks=0 then 0 else round((x.completed_tasks::numeric/x.total_tasks::numeric)*100,1) end,
        'last_completed_at',x.last_completed_at
      ) order by x.overdue_tasks desc,x.display_name)
      from (
        select
          m.id member_id,
          coalesce(nullif(trim(m.display_name),''),'عضو المدرسة') display_name,
          m.role,
          count(t.id) filter (where t.created_at >= now() - make_interval(days=>v_days))::int total_tasks,
          count(t.id) filter (where t.created_at >= now() - make_interval(days=>v_days) and t.status in ('مكتملة','معتمدة'))::int completed_tasks,
          count(t.id) filter (where t.created_at >= now() - make_interval(days=>v_days) and t.status='معتمدة')::int approved_tasks,
          count(t.id) filter (where t.created_at >= now() - make_interval(days=>v_days) and t.status not in ('مكتملة','معتمدة','ملغاة'))::int open_tasks,
          count(t.id) filter (where t.created_at >= now() - make_interval(days=>v_days) and t.status not in ('مكتملة','معتمدة','ملغاة') and t.due_date is not null and t.due_date<current_date)::int overdue_tasks,
          max(t.completed_at) filter (where t.status in ('مكتملة','معتمدة')) last_completed_at
        from public.school_permission_group_members gm
        join public.school_members m on m.id=gm.member_id
        left join public.school_tasks t on t.assignee_member_id=m.id and t.school_id=v_member.school_id
        where gm.group_id=v_group.id and m.member_status='active'
        group by m.id,m.display_name,m.role
      ) x
    ),'[]'::jsonb),
    'summary',(
      select jsonb_build_object(
        'members',count(*)::int,
        'total_tasks',coalesce(sum(total_tasks),0)::int,
        'completed_tasks',coalesce(sum(completed_tasks),0)::int,
        'approved_tasks',coalesce(sum(approved_tasks),0)::int,
        'open_tasks',coalesce(sum(open_tasks),0)::int,
        'overdue_tasks',coalesce(sum(overdue_tasks),0)::int,
        'completion_rate',case when coalesce(sum(total_tasks),0)=0 then 0 else round((coalesce(sum(completed_tasks),0)::numeric/sum(total_tasks)::numeric)*100,1) end
      )
      from (
        select
          m.id,
          count(t.id) filter (where t.created_at >= now() - make_interval(days=>v_days)) total_tasks,
          count(t.id) filter (where t.created_at >= now() - make_interval(days=>v_days) and t.status in ('مكتملة','معتمدة')) completed_tasks,
          count(t.id) filter (where t.created_at >= now() - make_interval(days=>v_days) and t.status='معتمدة') approved_tasks,
          count(t.id) filter (where t.created_at >= now() - make_interval(days=>v_days) and t.status not in ('مكتملة','معتمدة','ملغاة')) open_tasks,
          count(t.id) filter (where t.created_at >= now() - make_interval(days=>v_days) and t.status not in ('مكتملة','معتمدة','ملغاة') and t.due_date is not null and t.due_date<current_date) overdue_tasks
        from public.school_permission_group_members gm
        join public.school_members m on m.id=gm.member_id
        left join public.school_tasks t on t.assignee_member_id=m.id and t.school_id=v_member.school_id
        where gm.group_id=v_group.id and m.member_status='active'
        group by m.id
      ) s
    )
  );
end;
$$;
revoke all on function public.get_school_group_task_performance(uuid,integer) from public;
grant execute on function public.get_school_group_task_performance(uuid,integer) to authenticated;
