create or replace function public.get_my_guidance_students()
returns table(id uuid,full_name text,student_no text,stage text,grade text,classroom text)
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare m public.school_members%rowtype;
begin
 select * into m from public.school_members where user_id=auth.uid() and member_status='active' order by is_admin desc,joined_at desc nulls last limit 1;
 if m.id is null then raise exception 'لا توجد عضوية مدرسية فعالة'; end if;
 return query select distinct s.id,s.full_name,s.student_no,s.stage,s.grade,s.classroom
 from public.students s join public.school_members owner_m on owner_m.user_id=s.user_id and owner_m.school_id=m.school_id and owner_m.member_status='active'
 where m.is_admin or m.role in ('counselor','principal','student_affairs_vice','academic_vice','vice_principal','activity_leader','health_guide','registrar')
 or public.member_scope_allows_student(m.id,s.id)
 order by s.full_name;
end $$;
grant execute on function public.get_my_guidance_students() to authenticated;
notify pgrst,'reload schema';