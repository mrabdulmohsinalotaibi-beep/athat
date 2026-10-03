create or replace function public.review_guidance_approval(p_approval_id uuid,p_action text,p_notes text default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.guidance_approvals%rowtype; m public.school_members%rowtype;
begin
 select * into a from public.guidance_approvals where id=p_approval_id;
 if a.id is null then raise exception 'طلب الاعتماد غير موجود'; end if;
 select * into m from public.school_members where school_id=a.school_id and user_id=auth.uid() and member_status='active' order by is_admin desc limit 1;
 if m.id is null then raise exception 'لا توجد عضوية فعالة'; end if;
 if p_action not in ('reviewed','approved','rejected') then raise exception 'الإجراء غير صالح'; end if;
 if p_action='reviewed' and not (m.is_admin or m.role in ('counselor','student_affairs_vice','principal')) then raise exception 'لا تملك صلاحية المراجعة'; end if;
 if p_action in ('approved','rejected') and not (m.is_admin or m.role='principal' or (m.role='student_affairs_vice' and a.confidentiality in ('team','guidance'))) then raise exception 'لا تملك صلاحية الاعتماد'; end if;
 update public.guidance_approvals set reviewer_id=auth.uid(),status=p_action,review_notes=nullif(trim(coalesce(p_notes,'')),''),
 reviewed_at=coalesce(reviewed_at,now()),decided_at=case when p_action in ('approved','rejected') then now() else decided_at end where id=p_approval_id;
end $$;
grant execute on function public.review_guidance_approval(uuid,text,text) to authenticated;
notify pgrst,'reload schema';