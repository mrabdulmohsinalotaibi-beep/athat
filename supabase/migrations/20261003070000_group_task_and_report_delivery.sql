-- Batch task assignment and report delivery using school permission groups.

create or replace function public.create_school_task_for_group(
  p_group_id uuid,
  p_title text,
  p_description text default null,
  p_category text default 'عام',
  p_priority text default 'متوسطة',
  p_cadence text default 'مرة واحدة',
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
  v_created integer := 0;
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
  if not public.member_has_permission('tasks.manage') then raise exception 'ليس لديك صلاحية إسناد المهام'; end if;
  if nullif(trim(p_title),'') is null then raise exception 'اكتب عنوان المهمة'; end if;

  select * into v_group
  from public.school_permission_groups
  where id=p_group_id and school_id=v_creator.school_id;

  if v_group.id is null then raise exception 'المجموعة غير موجودة'; end if;

  for v_member in
    select m.*
    from public.school_permission_group_members gm
    join public.school_members m on m.id=gm.member_id
    where gm.group_id=v_group.id
      and m.school_id=v_creator.school_id
      and m.member_status='active'
      and (m.access_expires_at is null or m.access_expires_at>now())
      and m.id<>v_creator.id
  loop
    if public.school_role_rank(v_creator.role) > public.school_role_rank(v_member.role) then
      insert into public.school_tasks(
        school_id,creator_member_id,assignee_member_id,title,description,category,priority,cadence,due_date
      )
      values(
        v_creator.school_id,v_creator.id,v_member.id,trim(p_title),
        nullif(trim(p_description),''),
        coalesce(nullif(trim(p_category),''),'عام'),
        p_priority,p_cadence,p_due_date
      );
      v_created := v_created + 1;
    else
      v_skipped := v_skipped + 1;
    end if;
  end loop;

  insert into public.school_access_audit(
    school_id,actor_member_id,target_member_id,action,details
  )
  values(
    v_creator.school_id,v_creator.id,null,'group_task_assigned',
    jsonb_build_object(
      'group_id',v_group.id,'group_name',v_group.name,
      'title',trim(p_title),'created',v_created,'skipped',v_skipped
    )
  );

  return jsonb_build_object('created',v_created,'skipped',v_skipped,'group_name',v_group.name);
end;
$$;

create or replace function public.create_school_report_handoff_for_group(
  p_group_id uuid,
  p_title text,
  p_note text,
  p_snapshot jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_sender public.school_members%rowtype;
  v_group public.school_permission_groups%rowtype;
  v_recipient public.school_members%rowtype;
  v_id uuid;
  v_created integer := 0;
  v_skipped integer := 0;
  v_has_vice boolean := false;
begin
  select * into v_sender
  from public.school_members
  where user_id=auth.uid()
    and member_status='active'
    and (access_expires_at is null or access_expires_at>now())
  order by is_admin desc,joined_at desc nulls last
  limit 1;

  if v_sender.id is null then raise exception 'Active school membership required'; end if;
  if not public.member_has_permission('reports.create') then raise exception 'ليس لديك صلاحية رفع التقارير'; end if;
  if nullif(trim(p_title),'') is null then raise exception 'اكتب عنوان التقرير'; end if;
  if p_snapshot is null or jsonb_typeof(p_snapshot)<>'object' then raise exception 'Report snapshot is required'; end if;
  if pg_column_size(p_snapshot)>2500000 then raise exception 'Report is too large'; end if;

  select * into v_group
  from public.school_permission_groups
  where id=p_group_id and school_id=v_sender.school_id;

  if v_group.id is null then raise exception 'المجموعة غير موجودة'; end if;

  if v_sender.role='counselor' then
    select exists(
      select 1 from public.school_members m
      where m.school_id=v_sender.school_id
        and m.member_status='active'
        and m.role='vice_principal'
        and (m.access_expires_at is null or m.access_expires_at>now())
    ) into v_has_vice;
  end if;

  for v_recipient in
    select m.*
    from public.school_permission_group_members gm
    join public.school_members m on m.id=gm.member_id
    where gm.group_id=v_group.id
      and m.school_id=v_sender.school_id
      and m.member_status='active'
      and (m.access_expires_at is null or m.access_expires_at>now())
      and m.id<>v_sender.id
  loop
    if public.school_role_rank(v_recipient.role) <= public.school_role_rank(v_sender.role) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    if v_sender.role='counselor' then
      if v_has_vice and v_recipient.role<>'vice_principal' then
        v_skipped := v_skipped + 1;
        continue;
      elsif not v_has_vice and v_recipient.role<>'principal' then
        v_skipped := v_skipped + 1;
        continue;
      end if;
    end if;

    v_id := gen_random_uuid();

    insert into public.school_report_handoffs(
      id,school_id,root_handoff_id,parent_handoff_id,
      sender_member_id,recipient_member_id,
      sender_name,sender_role,recipient_name,recipient_role,
      title,note,snapshot,status
    )
    values(
      v_id,v_sender.school_id,v_id,null,
      v_sender.id,v_recipient.id,
      coalesce(nullif(trim(v_sender.display_name),''),'عضو المدرسة'),v_sender.role,
      coalesce(nullif(trim(v_recipient.display_name),''),'مسؤول المدرسة'),v_recipient.role,
      trim(p_title),nullif(trim(p_note),''),p_snapshot,'sent'
    );

    insert into public.school_report_handoff_events(
      school_id,root_handoff_id,handoff_id,actor_member_id,actor_name,actor_role,
      event_type,note,target_member_id,target_name,target_role
    )
    values(
      v_sender.school_id,v_id,v_id,v_sender.id,
      coalesce(nullif(trim(v_sender.display_name),''),'عضو المدرسة'),v_sender.role,
      'sent',nullif(trim(p_note),''),v_recipient.id,
      coalesce(nullif(trim(v_recipient.display_name),''),'مسؤول المدرسة'),v_recipient.role
    );

    v_created := v_created + 1;
  end loop;

  insert into public.school_access_audit(
    school_id,actor_member_id,target_member_id,action,details
  )
  values(
    v_sender.school_id,v_sender.id,null,'group_report_sent',
    jsonb_build_object(
      'group_id',v_group.id,'group_name',v_group.name,
      'title',trim(p_title),'created',v_created,'skipped',v_skipped
    )
  );

  return jsonb_build_object('created',v_created,'skipped',v_skipped,'group_name',v_group.name);
end;
$$;

revoke all on function public.create_school_task_for_group(uuid,text,text,text,text,text,date) from public;
revoke all on function public.create_school_report_handoff_for_group(uuid,text,text,jsonb) from public;
grant execute on function public.create_school_task_for_group(uuid,text,text,text,text,text,date) to authenticated;
grant execute on function public.create_school_report_handoff_for_group(uuid,text,text,jsonb) to authenticated;
