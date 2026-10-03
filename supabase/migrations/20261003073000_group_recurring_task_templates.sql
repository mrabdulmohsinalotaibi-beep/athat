-- Activate recurring role-based task templates for all eligible members of a permission group.

create or replace function public.activate_school_task_template_for_group(
  p_group_id uuid,
  p_target_role text,
  p_template_key text,
  p_title text,
  p_description text default null,
  p_category text default 'عام',
  p_priority text default 'متوسطة',
  p_cadence text default 'أسبوعية',
  p_due_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_creator public.school_members%rowtype;
  v_group public.school_permission_groups%rowtype;
  v_member public.school_members%rowtype;
  v_existing uuid;
  v_created integer := 0;
  v_existing_count integer := 0;
  v_skipped integer := 0;
begin
  select * into v_creator
  from public.school_members
  where user_id=auth.uid()
    and member_status='active'
    and (access_expires_at is null or access_expires_at>now())
  order by is_admin desc,joined_at desc nulls last
  limit 1;

  if v_creator.id is null then raise exception 'Active school membership required'; end if;
  if not public.member_has_permission('tasks.manage') then raise exception 'ليس لديك صلاحية تفعيل قوالب المهام للمجموعة'; end if;

  select * into v_group
  from public.school_permission_groups
  where id=p_group_id and school_id=v_creator.school_id;

  if v_group.id is null then raise exception 'المجموعة غير موجودة'; end if;
  if nullif(trim(p_target_role),'') is null then raise exception 'حدد الدور المستهدف داخل المجموعة'; end if;
  if nullif(trim(p_template_key),'') is null then raise exception 'Template key is required'; end if;
  if nullif(trim(p_title),'') is null then raise exception 'Task title is required'; end if;
  if p_priority not in ('منخفضة','متوسطة','عالية') then raise exception 'Invalid priority'; end if;
  if p_cadence not in ('مرة واحدة','يومية','أسبوعية','شهرية','سنوية') then raise exception 'Invalid cadence'; end if;

  for v_member in
    select m.*
    from public.school_permission_group_members gm
    join public.school_members m on m.id=gm.member_id
    where gm.group_id=v_group.id
      and m.school_id=v_creator.school_id
      and m.member_status='active'
      and (m.access_expires_at is null or m.access_expires_at>now())
      and m.role=trim(p_target_role)
  loop
    if v_member.id<>v_creator.id
       and public.school_role_rank(v_creator.role) <= public.school_role_rank(v_member.role) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    v_existing := null;
    select id into v_existing
    from public.school_tasks
    where school_id=v_creator.school_id
      and assignee_member_id=v_member.id
      and template_key=trim(p_template_key)
      and status not in ('معتمدة','ملغاة')
    order by created_at desc
    limit 1;

    if v_existing is not null then
      v_existing_count := v_existing_count + 1;
      continue;
    end if;

    insert into public.school_tasks(
      school_id,creator_member_id,assignee_member_id,title,description,category,
      priority,cadence,due_date,status,template_key
    )
    values(
      v_creator.school_id,v_creator.id,v_member.id,trim(p_title),nullif(trim(p_description),''),
      coalesce(nullif(trim(p_category),''),'عام'),p_priority,p_cadence,p_due_date,'مسندة',trim(p_template_key)
    );

    v_created := v_created + 1;
  end loop;

  insert into public.school_access_audit(
    school_id,actor_member_id,target_member_id,action,details
  )
  values(
    v_creator.school_id,v_creator.id,null,'group_task_templates_activated',
    jsonb_build_object(
      'group_id',v_group.id,
      'group_name',v_group.name,
      'target_role',trim(p_target_role),
      'template_key',trim(p_template_key),
      'title',trim(p_title),
      'created',v_created,
      'existing',v_existing_count,
      'skipped',v_skipped
    )
  );

  return jsonb_build_object(
    'group_name',v_group.name,
    'target_role',trim(p_target_role),
    'created',v_created,
    'existing',v_existing_count,
    'skipped',v_skipped
  );
end;
$$;

revoke all on function public.activate_school_task_template_for_group(uuid,text,text,text,text,text,text,text,date) from public;
grant execute on function public.activate_school_task_template_for_group(uuid,text,text,text,text,text,text,text,date) to authenticated;
