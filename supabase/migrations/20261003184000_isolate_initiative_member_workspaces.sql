-- Strict per-member isolation for initiative workspaces.
drop policy if exists initiative_public_entries_internal_read on public.initiative_public_entries;
create policy initiative_public_entries_internal_read on public.initiative_public_entries
for select to authenticated using (
  exists(
    select 1 from public.initiative_members im
    where im.id=initiative_public_entries.initiative_member_id
      and im.user_id=auth.uid()
      and im.status='active'
  )
  or exists(
    select 1 from public.initiatives i
    where i.id=initiative_public_entries.initiative_id
      and i.created_by=auth.uid()
  )
  or exists(
    select 1 from public.initiatives i
    join public.school_members sm on sm.school_id=i.school_id
    where i.id=initiative_public_entries.initiative_id
      and sm.user_id=auth.uid()
      and sm.member_status='active'
      and (
        sm.is_admin
        or sm.role='counselor'
        or coalesce((sm.permissions->>'reports.view')::boolean,false)
      )
  )
);

drop policy if exists initiative_public_files_internal_read on public.initiative_public_files;
create policy initiative_public_files_internal_read on public.initiative_public_files
for select to authenticated using (
  exists(
    select 1 from public.initiative_members im
    where im.id=initiative_public_files.initiative_member_id
      and im.user_id=auth.uid()
      and im.status='active'
  )
  or exists(
    select 1 from public.initiatives i
    where i.id=initiative_public_files.initiative_id
      and i.created_by=auth.uid()
  )
  or exists(
    select 1 from public.initiatives i
    join public.school_members sm on sm.school_id=i.school_id
    where i.id=initiative_public_files.initiative_id
      and sm.user_id=auth.uid()
      and sm.member_status='active'
      and (
        sm.is_admin
        or sm.role='counselor'
        or coalesce((sm.permissions->>'reports.view')::boolean,false)
      )
  )
);

drop policy if exists initiative_followups_read on public.initiative_student_followups;
create policy initiative_followups_read on public.initiative_student_followups
for select to authenticated using (
  exists(
    select 1 from public.initiative_members im
    where im.id=initiative_student_followups.initiative_member_id
      and im.user_id=auth.uid()
      and im.status='active'
  )
  or exists(
    select 1 from public.initiatives i
    where i.id=initiative_student_followups.initiative_id
      and i.created_by=auth.uid()
  )
  or exists(
    select 1 from public.initiatives i
    join public.school_members sm on sm.school_id=i.school_id
    where i.id=initiative_student_followups.initiative_id
      and sm.user_id=auth.uid()
      and sm.member_status='active'
      and (
        sm.is_admin
        or sm.role='counselor'
        or coalesce((sm.permissions->>'reports.view')::boolean,false)
      )
  )
);

create or replace function public.get_my_initiative_workspace(p_initiative_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
declare im public.initiative_members%rowtype; i public.initiatives%rowtype; s public.schools%rowtype;
begin
  select * into im
  from public.initiative_members
  where initiative_id=p_initiative_id
    and user_id=auth.uid()
    and status='active'
  limit 1;

  if im.id is null then
    raise exception 'أنت لست عضوًا فعالًا في هذه المبادرة';
  end if;

  select * into i from public.initiatives where id=im.initiative_id;
  select * into s from public.schools where id=i.school_id;

  return jsonb_build_object(
    'initiative',jsonb_build_object(
      'id',i.id,'title',i.title,'slogan',i.slogan,'idea',i.idea,'general_goal',i.general_goal,
      'objectives',i.objectives,'mechanism',i.mechanism,'expected_results',i.expected_results,
      'success_indicators',i.success_indicators,'status',i.status
    ),
    'school',jsonb_build_object('name',s.name,'education_dept',s.education_dept,'education_office',s.education_office),
    'member',jsonb_build_object(
      'id',im.id,
      'display_name',coalesce((select sm.display_name from public.school_members sm where sm.id=im.school_member_id),'عضو المبادرة'),
      'role_title',im.role_title,
      'assigned_tasks',im.assigned_tasks
    ),
    'students',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',st.id,'full_name',st.full_name,'student_no',st.student_no,'stage',st.stage,'grade',st.grade,'classroom',st.classroom
      ) order by st.full_name)
      from public.initiative_student_assignments a
      join public.students st on st.id=a.student_id
      where a.initiative_member_id=im.id and a.active
    ),'[]'::jsonb),
    'followups',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',f.id,'student_id',f.student_id,'week_start',f.week_start,
        'attendance_status',f.attendance_status,'punctuality_status',f.punctuality_status,
        'behavior_status',f.behavior_status,'homework_status',f.homework_status,
        'academic_status',f.academic_status,'meeting_held',f.meeting_held,
        'family_contacted',f.family_contacted,'strengths',f.strengths,'concerns',f.concerns,
        'advice',f.advice,'next_action',f.next_action,'notes',f.notes,'updated_at',f.updated_at
      ) order by f.week_start desc)
      from public.initiative_student_followups f
      where f.initiative_member_id=im.id
    ),'[]'::jsonb),
    'entries',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',e.id,'entry_type',e.entry_type,'title',e.title,'details',e.details,
        'progress_percent',e.progress_percent,'student_id',e.student_id,'payload',e.payload,
        'created_at',e.created_at,'updated_at',e.updated_at,
        'files',coalesce((
          select jsonb_agg(jsonb_build_object(
            'id',pf.id,'file_name',pf.file_name,'mime_type',pf.mime_type,'data_url',pf.data_url,'size_bytes',pf.size_bytes
          ))
          from public.initiative_public_files pf
          where pf.entry_id=e.id
        ),'[]'::jsonb)
      ) order by e.created_at desc)
      from public.initiative_public_entries e
      where e.initiative_member_id=im.id
    ),'[]'::jsonb)
  );
end $$;

grant execute on function public.get_my_initiative_workspace(uuid) to authenticated;
