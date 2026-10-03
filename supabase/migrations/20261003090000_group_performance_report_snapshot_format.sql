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
  v_performance jsonb;
  v_summary jsonb;
  v_members jsonb;
  v_snapshot jsonb;
  v_id uuid := gen_random_uuid();
  v_period integer := greatest(1,least(coalesce(p_days,30),365));
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

  v_performance := public.get_school_group_task_performance(p_group_id,v_period);
  v_summary := coalesce(v_performance->'summary','{}'::jsonb);
  v_members := coalesce(v_performance->'members','[]'::jsonb);

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

  v_snapshot := jsonb_build_object(
    'version',1,
    'report_title','تقرير أداء مجموعة - ' || v_group.name,
    'period','آخر ' || v_period || ' يومًا',
    'from_date',(current_date-v_period)::text,
    'to_date',current_date::text,
    'created_at',now(),
    'total_rows',jsonb_array_length(v_members),
    'narrative',
      'ملخص متابعة تشغيلية للمجموعة. عدد الأعضاء: ' || coalesce(v_summary->>'members','0') ||
      '، إجمالي المهام: ' || coalesce(v_summary->>'total_tasks','0') ||
      '، المكتملة: ' || coalesce(v_summary->>'completed_tasks','0') ||
      '، المفتوحة: ' || coalesce(v_summary->>'open_tasks','0') ||
      '، المتأخرة: ' || coalesce(v_summary->>'overdue_tasks','0') ||
      '، نسبة الإكمال: ' || coalesce(v_summary->>'completion_rate','0') || '٪.',
    'sections',jsonb_build_array(
      jsonb_build_object(
        'key','summary',
        'title','ملخص المؤشرات',
        'columns',jsonb_build_array(
          jsonb_build_object('key','members','label','الأعضاء'),
          jsonb_build_object('key','total_tasks','label','كل المهام'),
          jsonb_build_object('key','completed_tasks','label','مكتملة'),
          jsonb_build_object('key','approved_tasks','label','معتمدة'),
          jsonb_build_object('key','open_tasks','label','مفتوحة'),
          jsonb_build_object('key','overdue_tasks','label','متأخرة'),
          jsonb_build_object('key','completion_rate','label','نسبة الإكمال %')
        ),
        'rows',jsonb_build_array(v_summary)
      ),
      jsonb_build_object(
        'key','members',
        'title','أداء أعضاء المجموعة',
        'columns',jsonb_build_array(
          jsonb_build_object('key','display_name','label','العضو'),
          jsonb_build_object('key','role','label','الدور'),
          jsonb_build_object('key','total_tasks','label','كل المهام'),
          jsonb_build_object('key','completed_tasks','label','مكتملة'),
          jsonb_build_object('key','approved_tasks','label','معتمدة'),
          jsonb_build_object('key','open_tasks','label','مفتوحة'),
          jsonb_build_object('key','overdue_tasks','label','متأخرة'),
          jsonb_build_object('key','completion_rate','label','نسبة الإكمال %'),
          jsonb_build_object('key','last_completed_at','label','آخر إنجاز')
        ),
        'rows',v_members
      )
    )
  );

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
    v_snapshot,
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
