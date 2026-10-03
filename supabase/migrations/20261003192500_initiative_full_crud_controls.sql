-- Full CRUD controls for initiative managers and members
create or replace function public.delete_initiative(p_initiative_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare sid uuid;
begin
  select school_id into sid from public.initiatives where id=p_initiative_id;
  if sid is null then raise exception 'المبادرة غير موجودة'; end if;
  if not exists(select 1 from public.initiatives where id=p_initiative_id and created_by=auth.uid())
     and not exists(select 1 from public.school_members where school_id=sid and user_id=auth.uid() and member_status='active' and is_admin)
  then raise exception 'لا تملك صلاحية حذف المبادرة'; end if;
  delete from public.initiatives where id=p_initiative_id;
end $$;

create or replace function public.delete_initiative_member(p_member_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare iid uuid; sid uuid; target_uid uuid;
begin
  select im.initiative_id,i.school_id,im.user_id into iid,sid,target_uid
  from public.initiative_members im join public.initiatives i on i.id=im.initiative_id where im.id=p_member_id;
  if iid is null then raise exception 'العضو غير موجود'; end if;
  if not exists(select 1 from public.initiatives where id=iid and created_by=auth.uid())
     and not exists(select 1 from public.school_members where school_id=sid and user_id=auth.uid() and member_status='active' and is_admin)
  then raise exception 'لا تملك صلاحية حذف عضو المبادرة'; end if;
  if exists(select 1 from public.initiatives where id=iid and created_by=target_uid)
  then raise exception 'لا يمكن حذف قائد المبادرة من الفريق'; end if;
  delete from public.initiative_members where id=p_member_id;
end $$;

create or replace function public.delete_initiative_update(p_update_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare iid uuid; sid uuid; owner_uid uuid;
begin
  select u.initiative_id,i.school_id,u.created_by into iid,sid,owner_uid
  from public.initiative_updates u join public.initiatives i on i.id=u.initiative_id where u.id=p_update_id;
  if iid is null then raise exception 'السجل غير موجود'; end if;
  if owner_uid<>auth.uid()
     and not exists(select 1 from public.initiatives where id=iid and created_by=auth.uid())
     and not exists(select 1 from public.school_members where school_id=sid and user_id=auth.uid() and member_status='active' and is_admin)
  then raise exception 'لا تملك صلاحية حذف هذا السجل'; end if;
  delete from public.initiative_updates where id=p_update_id;
end $$;

create or replace function public.delete_initiative_followup(p_followup_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare iid uuid; sid uuid; owner_uid uuid;
begin
  select f.initiative_id,i.school_id,f.created_by into iid,sid,owner_uid
  from public.initiative_student_followups f join public.initiatives i on i.id=f.initiative_id where f.id=p_followup_id;
  if iid is null then raise exception 'المتابعة غير موجودة'; end if;
  if owner_uid<>auth.uid()
     and not exists(select 1 from public.initiatives where id=iid and created_by=auth.uid())
     and not exists(select 1 from public.school_members where school_id=sid and user_id=auth.uid() and member_status='active' and is_admin)
  then raise exception 'لا تملك صلاحية حذف هذه المتابعة'; end if;
  delete from public.initiative_student_followups where id=p_followup_id;
end $$;

create or replace function public.unassign_initiative_student(p_initiative_id uuid,p_student_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare sid uuid;
begin
  select school_id into sid from public.initiatives where id=p_initiative_id;
  if sid is null then raise exception 'المبادرة غير موجودة'; end if;
  if not exists(select 1 from public.initiatives where id=p_initiative_id and created_by=auth.uid())
     and not exists(select 1 from public.school_members where school_id=sid and user_id=auth.uid() and member_status='active' and is_admin)
  then raise exception 'لا تملك صلاحية إدارة طلاب المبادرة'; end if;
  update public.initiative_student_assignments set active=false
  where initiative_id=p_initiative_id and student_id=p_student_id and active;
end $$;

grant execute on function public.delete_initiative(uuid) to authenticated;
grant execute on function public.delete_initiative_member(uuid) to authenticated;
grant execute on function public.delete_initiative_update(uuid) to authenticated;
grant execute on function public.delete_initiative_followup(uuid) to authenticated;
grant execute on function public.unassign_initiative_student(uuid,uuid) to authenticated;
