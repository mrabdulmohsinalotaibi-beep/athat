-- Manager/counselor read-only view for one initiative member.
create or replace function public.get_initiative_member_review(p_member_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
declare im public.initiative_members%rowtype; i public.initiatives%rowtype; s public.schools%rowtype;
begin
  select * into im from public.initiative_members where id=p_member_id;
  if im.id is null then raise exception 'عضو المبادرة غير موجود'; end if;

  select * into i from public.initiatives where id=im.initiative_id;
  select * into s from public.schools where id=i.school_id;

  if not (
    i.created_by=auth.uid()
    or exists(
      select 1 from public.school_members sm
      where sm.school_id=i.school_id
        and sm.user_id=auth.uid()
        and sm.member_status='active'
        and (
          sm.is_admin
          or sm.role='counselor'
          or coalesce((sm.permissions->>'reports.view')::boolean,false)
        )
    )
  ) then
    raise exception 'لا تملك صلاحية عرض أعمال هذا العضو';
  end if;

  return jsonb_build_object(
    'initiative',jsonb_build_object(
      'id',i.id,'title',i.title,'slogan',i.slogan,'status',i.status
    ),
    'school',jsonb_build_object(
      'name',s.name,'education_dept',s.education_dept,'education_office',s.education_office
    ),
    'member',jsonb_build_object(
      'id',im.id,
      'display_name',coalesce((select sm.display_name from public.school_members sm where sm.id=im.school_member_id),'عضو المبادرة'),
      'role_title',im.role_title,
      'assigned_tasks',im.assigned_tasks,
      'status',im.status,
      'joined_at',im.joined_at,
      'public_access_active',im.public_access_active,
      'public_access_expires_at',im.public_access_expires_at,
      'public_access_last_used_at',im.public_access_last_used_at
    ),
    'students',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',st.id,'full_name',st.full_name,'student_no',st.student_no,
        'stage',st.stage,'grade',st.grade,'classroom',st.classroom,
        'guardian_name',st.guardian_name,'guardian_phone',st.guardian_phone,
        'last_followup',(
          select jsonb_build_object(
            'id',f.id,'week_start',f.week_start,
            'attendance_status',f.attendance_status,'punctuality_status',f.punctuality_status,
            'behavior_status',f.behavior_status,'homework_status',f.homework_status,
            'academic_status',f.academic_status,'meeting_held',f.meeting_held,
            'family_contacted',f.family_contacted,'strengths',f.strengths,
            'concerns',f.concerns,'advice',f.advice,'next_action',f.next_action,'notes',f.notes
          )
          from public.initiative_student_followups f
          where f.initiative_member_id=im.id and f.student_id=st.id
          order by f.week_start desc,f.updated_at desc limit 1
        )
      ) order by st.full_name)
      from public.initiative_student_assignments a
      join public.students st on st.id=a.student_id
      where a.initiative_member_id=im.id and a.active
    ),'[]'::jsonb),
    'followups',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',f.id,'student_id',f.student_id,'student_name',st.full_name,
        'week_start',f.week_start,'attendance_status',f.attendance_status,
        'punctuality_status',f.punctuality_status,'behavior_status',f.behavior_status,
        'homework_status',f.homework_status,'academic_status',f.academic_status,
        'meeting_held',f.meeting_held,'family_contacted',f.family_contacted,
        'strengths',f.strengths,'concerns',f.concerns,'advice',f.advice,
        'next_action',f.next_action,'notes',f.notes,'updated_at',f.updated_at
      ) order by f.week_start desc,f.updated_at desc)
      from public.initiative_student_followups f
      join public.students st on st.id=f.student_id
      where f.initiative_member_id=im.id
    ),'[]'::jsonb),
    'entries',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',e.id,'entry_type',e.entry_type,'title',e.title,'details',e.details,
        'progress_percent',e.progress_percent,'student_id',e.student_id,
        'student_name',(select st.full_name from public.students st where st.id=e.student_id),
        'created_at',e.created_at,'updated_at',e.updated_at,
        'files',coalesce((
          select jsonb_agg(jsonb_build_object(
            'id',pf.id,'file_name',pf.file_name,'mime_type',pf.mime_type,
            'data_url',pf.data_url,'size_bytes',pf.size_bytes
          ) order by pf.created_at desc)
          from public.initiative_public_files pf
          where pf.entry_id=e.id
        ),'[]'::jsonb)
      ) order by e.updated_at desc)
      from public.initiative_public_entries e
      where e.initiative_member_id=im.id
    ),'[]'::jsonb),
    'stats',jsonb_build_object(
      'students',(select count(*) from public.initiative_student_assignments a where a.initiative_member_id=im.id and a.active),
      'followups',(select count(*) from public.initiative_student_followups f where f.initiative_member_id=im.id),
      'followed_students',(select count(distinct f.student_id) from public.initiative_student_followups f where f.initiative_member_id=im.id),
      'entries',(select count(*) from public.initiative_public_entries e where e.initiative_member_id=im.id),
      'files',(select count(*) from public.initiative_public_files pf where pf.initiative_member_id=im.id),
      'family_contacts',(select count(*) from public.initiative_student_followups f where f.initiative_member_id=im.id and f.family_contacted),
      'meetings',(select count(*) from public.initiative_student_followups f where f.initiative_member_id=im.id and f.meeting_held),
      'avg_progress',coalesce((select round(avg(e.progress_percent)::numeric,1) from public.initiative_public_entries e where e.initiative_member_id=im.id and e.progress_percent is not null),0)
    )
  );
end $$;

grant execute on function public.get_initiative_member_review(uuid) to authenticated;
