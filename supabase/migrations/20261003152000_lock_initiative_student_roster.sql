create or replace function public.get_initiative_students(p_initiative_id uuid)
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
     and not exists(select 1 from public.school_members sm where sm.school_id=sid and sm.user_id=auth.uid() and sm.member_status='active' and sm.is_admin) then
    raise exception 'لا تملك صلاحية توزيع طلاب هذه المبادرة';
  end if;

  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id',s.id,'full_name',s.full_name,'student_no',s.student_no,'stage',s.stage,'grade',s.grade,'classroom',s.classroom,
      'guardian_name',s.guardian_name,'guardian_phone',s.guardian_phone,
      'assigned_member_id',a.initiative_member_id,'assigned_member_name',coalesce(sm.display_name,''),'assigned_role',coalesce(im.role_title,'')
    ) order by s.full_name),'[]'::jsonb)
    from public.students s
    join public.school_members owner_m on owner_m.user_id=s.user_id and owner_m.school_id=sid and owner_m.member_status='active'
    left join public.initiative_student_assignments a on a.student_id=s.id and a.initiative_id=p_initiative_id and a.active
    left join public.initiative_members im on im.id=a.initiative_member_id
    left join public.school_members sm on sm.id=im.school_member_id
  );
end $$;