-- Initiative full edit controls
create or replace function public.update_initiative(
  p_initiative_id uuid,p_title text,p_slogan text default null,p_idea text default null,p_general_goal text default null,
  p_objectives jsonb default '[]'::jsonb,p_mechanism jsonb default '[]'::jsonb,p_expected_results jsonb default '[]'::jsonb,
  p_success_indicators text default null,p_status text default 'active',p_starts_at date default null,p_ends_at date default null
) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare sid uuid;
begin
 select school_id into sid from public.initiatives where id=p_initiative_id;
 if sid is null then raise exception 'المبادرة غير موجودة'; end if;
 if not exists(select 1 from public.initiatives where id=p_initiative_id and created_by=auth.uid())
 and not exists(select 1 from public.school_members where school_id=sid and user_id=auth.uid() and member_status='active' and is_admin)
 then raise exception 'لا تملك صلاحية تعديل المبادرة'; end if;
 if trim(coalesce(p_title,''))='' then raise exception 'اسم المبادرة مطلوب'; end if;
 if p_status not in ('draft','active','completed','archived') then raise exception 'حالة المبادرة غير صالحة'; end if;
 update public.initiatives set title=trim(p_title),slogan=nullif(trim(coalesce(p_slogan,'')),''),
 idea=nullif(trim(coalesce(p_idea,'')),''),general_goal=nullif(trim(coalesce(p_general_goal,'')),''),
 objectives=coalesce(p_objectives,'[]'::jsonb),mechanism=coalesce(p_mechanism,'[]'::jsonb),
 expected_results=coalesce(p_expected_results,'[]'::jsonb),success_indicators=nullif(trim(coalesce(p_success_indicators,'')),''),
 status=p_status,starts_at=p_starts_at,ends_at=p_ends_at,updated_at=now() where id=p_initiative_id;
end $$;

create or replace function public.update_initiative_member(p_member_id uuid,p_role_title text,p_tasks jsonb default '[]'::jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare iid uuid; sid uuid;
begin
 select im.initiative_id,i.school_id into iid,sid from public.initiative_members im join public.initiatives i on i.id=im.initiative_id where im.id=p_member_id;
 if iid is null then raise exception 'العضو غير موجود'; end if;
 if not exists(select 1 from public.initiatives where id=iid and created_by=auth.uid())
 and not exists(select 1 from public.school_members where school_id=sid and user_id=auth.uid() and member_status='active' and is_admin)
 then raise exception 'لا تملك صلاحية تعديل العضو'; end if;
 update public.initiative_members set role_title=coalesce(nullif(trim(p_role_title),''),'عضو المبادرة'),assigned_tasks=coalesce(p_tasks,'[]'::jsonb) where id=p_member_id;
end $$;

create or replace function public.update_initiative_update(p_update_id uuid,p_title text,p_details text default null,p_progress_percent int default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare iid uuid; sid uuid; owner_uid uuid;
begin
 select u.initiative_id,i.school_id,u.created_by into iid,sid,owner_uid from public.initiative_updates u join public.initiatives i on i.id=u.initiative_id where u.id=p_update_id;
 if iid is null then raise exception 'السجل غير موجود'; end if;
 if owner_uid<>auth.uid() and not exists(select 1 from public.initiatives where id=iid and created_by=auth.uid())
 and not exists(select 1 from public.school_members where school_id=sid and user_id=auth.uid() and member_status='active' and is_admin)
 then raise exception 'لا تملك صلاحية تعديل هذا السجل'; end if;
 if trim(coalesce(p_title,''))='' then raise exception 'عنوان السجل مطلوب'; end if;
 update public.initiative_updates set title=trim(p_title),details=nullif(trim(coalesce(p_details,'')),''),progress_percent=p_progress_percent where id=p_update_id;
end $$;

grant execute on function public.update_initiative(uuid,text,text,text,text,jsonb,jsonb,jsonb,text,text,date,date) to authenticated;
grant execute on function public.update_initiative_member(uuid,text,jsonb) to authenticated;
grant execute on function public.update_initiative_update(uuid,text,text,int) to authenticated;
