create or replace function public.get_initiative_dashboard(p_initiative_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
declare sid uuid;
begin
  select school_id into sid from public.initiatives where id=p_initiative_id;
  if sid is null then raise exception 'المبادرة غير موجودة'; end if;

  if not exists(select 1 from public.initiatives where id=p_initiative_id and created_by=auth.uid())
     and not exists(
       select 1 from public.school_members sm
       where sm.school_id=sid
         and sm.user_id=auth.uid()
         and sm.member_status='active'
         and (sm.is_admin or sm.role='counselor' or coalesce((sm.permissions->>'reports.view')::boolean,false))
     ) then
    raise exception 'لا تملك صلاحية لوحة المبادرة';
  end if;

  return jsonb_build_object(
    'members_total',(select count(*) from public.initiative_members where initiative_id=p_initiative_id and status='active'),
    'students_total',(select count(distinct student_id) from public.initiative_student_assignments where initiative_id=p_initiative_id and active),
    'followups_total',(select count(*) from public.initiative_student_followups where initiative_id=p_initiative_id),
    'public_entries_total',(select count(*) from public.initiative_public_entries where initiative_id=p_initiative_id),
    'files_total',(select count(*) from public.initiative_public_files where initiative_id=p_initiative_id),
    'avg_progress',coalesce((select round(avg(progress_percent)::numeric,1) from public.initiative_public_entries where initiative_id=p_initiative_id and progress_percent is not null),0),
    'students_with_followup',(
      select count(distinct student_id)
      from public.initiative_student_followups
      where initiative_id=p_initiative_id
    ),
    'students_without_followup',greatest(
      (select count(distinct student_id) from public.initiative_student_assignments where initiative_id=p_initiative_id and active)
      -
      (select count(distinct student_id) from public.initiative_student_followups where initiative_id=p_initiative_id),
      0
    ),
    'followups_this_month',(
      select count(*)
      from public.initiative_student_followups
      where initiative_id=p_initiative_id
        and week_start >= date_trunc('month',current_date)::date
    ),
    'family_contacts_this_month',(
      select count(*)
      from public.initiative_student_followups
      where initiative_id=p_initiative_id
        and week_start >= date_trunc('month',current_date)::date
        and family_contacted
    ),
    'meetings_this_month',(
      select count(*)
      from public.initiative_student_followups
      where initiative_id=p_initiative_id
        and week_start >= date_trunc('month',current_date)::date
        and meeting_held
    ),
    'members',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',im.id,
        'display_name',coalesce(sm.display_name,'عضو المبادرة'),
        'role_title',im.role_title,
        'status',im.status,
        'student_count',(select count(*) from public.initiative_student_assignments a where a.initiative_member_id=im.id and a.active),
        'entry_count',(select count(*) from public.initiative_public_entries e where e.initiative_member_id=im.id),
        'file_count',(select count(*) from public.initiative_public_files f where f.initiative_member_id=im.id),
        'followup_count',(select count(*) from public.initiative_student_followups f where f.initiative_member_id=im.id),
        'followed_students',(select count(distinct f.student_id) from public.initiative_student_followups f where f.initiative_member_id=im.id),
        'meeting_count',(select count(*) from public.initiative_student_followups f where f.initiative_member_id=im.id and f.meeting_held),
        'family_contact_count',(select count(*) from public.initiative_student_followups f where f.initiative_member_id=im.id and f.family_contacted),
        'last_followup',(select max(f.week_start) from public.initiative_student_followups f where f.initiative_member_id=im.id),
        'last_activity',greatest(
          im.public_access_last_used_at,
          (select max(e.updated_at) from public.initiative_public_entries e where e.initiative_member_id=im.id),
          (select max(f.updated_at) from public.initiative_student_followups f where f.initiative_member_id=im.id)
        ),
        'public_link_active',im.public_access_active,
        'public_link_expires_at',im.public_access_expires_at
      ) order by coalesce(sm.display_name,'عضو المبادرة'))
      from public.initiative_members im
      left join public.school_members sm on sm.id=im.school_member_id
      where im.initiative_id=p_initiative_id
    ),'[]'::jsonb),
    'recent_entries',coalesce((
      select jsonb_agg(x) from (
        select jsonb_build_object(
          'id',e.id,
          'member_name',coalesce(sm.display_name,'عضو المبادرة'),
          'role_title',im.role_title,
          'entry_type',e.entry_type,
          'title',e.title,
          'details',e.details,
          'progress_percent',e.progress_percent,
          'student_name',st.full_name,
          'created_at',e.created_at,
          'updated_at',e.updated_at,
          'files_count',(select count(*) from public.initiative_public_files f where f.entry_id=e.id)
        ) x
        from public.initiative_public_entries e
        join public.initiative_members im on im.id=e.initiative_member_id
        left join public.school_members sm on sm.id=im.school_member_id
        left join public.students st on st.id=e.student_id
        where e.initiative_id=p_initiative_id
        order by e.updated_at desc limit 100
      ) q
    ),'[]'::jsonb),
    'recent_followups',coalesce((
      select jsonb_agg(x) from (
        select jsonb_build_object(
          'id',f.id,
          'week_start',f.week_start,
          'student_id',f.student_id,
          'student_name',s.full_name,
          'member_name',coalesce(sm.display_name,'عضو المبادرة'),
          'role_title',im.role_title,
          'attendance_status',f.attendance_status,
          'punctuality_status',f.punctuality_status,
          'behavior_status',f.behavior_status,
          'homework_status',f.homework_status,
          'academic_status',f.academic_status,
          'meeting_held',f.meeting_held,
          'family_contacted',f.family_contacted,
          'strengths',f.strengths,
          'concerns',f.concerns,
          'advice',f.advice,
          'next_action',f.next_action,
          'notes',f.notes,
          'updated_at',f.updated_at
        ) x
        from public.initiative_student_followups f
        join public.students s on s.id=f.student_id
        join public.initiative_members im on im.id=f.initiative_member_id
        left join public.school_members sm on sm.id=im.school_member_id
        where f.initiative_id=p_initiative_id
        order by f.week_start desc,f.updated_at desc
        limit 100
      ) q
    ),'[]'::jsonb)
  );
end $$;

grant execute on function public.get_initiative_dashboard(uuid) to authenticated;