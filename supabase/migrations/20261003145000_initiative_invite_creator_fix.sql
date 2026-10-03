-- Allow an initiative manager to create a scoped, one-use school invite even when they are not a school admin.
create or replace function public.create_initiative_invite(
  p_initiative_id uuid,
  p_role_title text,
  p_tasks jsonb default '[]'::jsonb,
  p_school_role text default 'teacher',
  p_permissions jsonb default '{"dashboard.view":true,"students.view":true,"attendance.view":true,"messages.view":true,"messages.send":true}'::jsonb,
  p_data_scope jsonb default '{"type":"assigned"}'::jsonb,
  p_student_ids uuid[] default '{}'::uuid[],
  p_expires_days int default 7
) returns text
language plpgsql security definer set search_path=public,pg_temp
as $$
declare tok text; sid uuid; creator_member uuid; scope_type text;
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;
  select school_id into sid from public.initiatives where id=p_initiative_id;
  if sid is null then raise exception 'المبادرة غير موجودة'; end if;

  select id into creator_member from public.school_members
  where school_id=sid and user_id=auth.uid() and member_status='active'
  order by is_admin desc, created_at desc limit 1;

  if creator_member is null then raise exception 'حسابك ليس عضوًا فعالًا في المدرسة'; end if;
  if not exists(select 1 from public.school_members where id=creator_member and is_admin)
     and not exists(select 1 from public.initiatives where id=p_initiative_id and created_by=auth.uid()) then
    raise exception 'لا تملك صلاحية دعوة أعضاء لهذه المبادرة';
  end if;

  if p_school_role not in ('principal','vice_principal','counselor','teacher','admin_staff','guard','observer','student','parent','custom') then
    raise exception 'الدور المدرسي غير صالح';
  end if;

  scope_type:=coalesce(p_data_scope->>'type','assigned');
  if scope_type='self' and coalesce(array_length(p_student_ids,1),0)>1 then
    raise exception 'يمكن ربط الطالب بملف واحد فقط';
  end if;

  if exists(
    select 1 from unnest(coalesce(p_student_ids,'{}'::uuid[])) x(student_id)
    left join public.students s on s.id=x.student_id
    left join public.school_members owner_m on owner_m.user_id=s.user_id and owner_m.school_id=sid and owner_m.member_status='active'
    where s.id is null or owner_m.id is null
  ) then raise exception 'يوجد طالب خارج نطاق المدرسة'; end if;

  tok:=lower(replace(gen_random_uuid()::text,'-',''));
  insert into public.school_invites(
    school_id,created_by_member_id,token,role,permissions,data_scope,expires_at,max_uses,student_ids,
    initiative_id,initiative_role,initiative_tasks
  ) values (
    sid,creator_member,tok,p_school_role,coalesce(p_permissions,'{}'::jsonb),coalesce(p_data_scope,'{"type":"assigned"}'::jsonb),
    now()+make_interval(days=>greatest(1,least(coalesce(p_expires_days,7),30))),1,coalesce(p_student_ids,'{}'::uuid[]),
    p_initiative_id,coalesce(nullif(trim(p_role_title),''),'عضو المبادرة'),coalesce(p_tasks,'[]'::jsonb)
  );
  return tok;
end $$;
