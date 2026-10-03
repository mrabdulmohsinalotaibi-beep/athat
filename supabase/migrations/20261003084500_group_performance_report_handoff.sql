create or replace function public.create_school_group_performance_report(
  p_group_id uuid,
  p_days integer default 30,
  p_recipient_member_id uuid default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_sender public.school_members%rowtype;
  v_group public.school_permission_groups%rowtype;
  v_recipient public.school_members%rowtype;
  v_payload jsonb;
  v_id uuid := gen_random_uuid();
begin
  select * into v_sender
  from public.school_members
  where user_id=auth.uid()
    and member_status='active'
    and (access_expires_at is null or access_expires_at>now())
  order by is_admin desc,joined_at desc nulls last
  limit 1;

  if v_sender.id is null then raise exception 'Active school membership required'; end if;
  if not public.member_has_permission('reports.create') then
    raise exception 'ليس لديك صلاحية إنشاء تقرير أداء المجموعة';
  end if;

  select * into v_group
  from public.school_permission_groups
  where id=p_group_id and school_id=v_sender.school_id;

  if v_group.id is null then raise exception 'المجموعة غير موجودة'; end if;

  v_payload := public.get_school_group_task_performance(p_group_id,p_days);

  if p_recipient_member_id is null then
    select * into v_recipient
    from public.school_members
    where school_id=v_sender.school_id
      and member_status='active'
      and id<>v_sender.id
      and public.school_role_rank(role)>public.school_role_rank(v_sender.role)
    order by public.school_role_rank(role) asc
    limit 1;
  else
    select * into v_recipient
    from public.school_members
    where id=p_recipient_member_id
      and school_id=v_sender.school_id
      and member_status='active';
  end if;

  if v_recipient.id is null then raise exception 'لا يوجد مسؤول أعلى مناسب لاستلام التقرير'; end if;
  if public.school_role_rank(v_recipient.role)<=public.school_role_rank(v_sender.role) then
    raise exception 'يجب رفع التقرير إلى دور إداري أعلى';
  end if;

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
    'تقرير أداء مجموعة - ' || v_group.name,
    nullif(trim(p_note),''),
    jsonb_build_object(
      'version',1,
      'report_type','school_group_performance',
      'group_name',v_group.name,
      'period_days',greatest(1,least(coalesce(p_days,30),365)),
      'generated_at',now(),
      'performance',v_payload
    ),
    'sent'
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

  return v_id;
end;
$$;

revoke all on function public.create_school_group_performance_report(uuid,integer,uuid,text) from public;
grant execute on function public.create_school_group_performance_report(uuid,integer,uuid,text) to authenticated;
