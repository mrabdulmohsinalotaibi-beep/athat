create or replace function public.submit_guidance_approval(p_item_type text,p_item_id uuid,p_title text,p_notes text default null,p_confidentiality text default 'team')
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare m public.school_members%rowtype; rid uuid;
begin
 select * into m from public.school_members where user_id=auth.uid() and member_status='active' order by is_admin desc,joined_at desc nulls last limit 1;
 if m.id is null then raise exception 'لا توجد عضوية مدرسية فعالة'; end if;
 if p_confidentiality not in ('team','guidance','restricted') then raise exception 'مستوى السرية غير صالح'; end if;
 if nullif(trim(coalesce(p_title,'')),'') is null then raise exception 'عنوان العمل مطلوب'; end if;
 if exists(select 1 from public.guidance_approvals where school_id=m.school_id and submitted_by=auth.uid() and item_type=p_item_type and item_id is not distinct from p_item_id and status in ('submitted','reviewed')) then raise exception 'هذا العمل مرفوع للاعتماد بالفعل'; end if;
 insert into public.guidance_approvals(school_id,submitted_by,item_type,item_id,title,notes,confidentiality,status)
 values(m.school_id,auth.uid(),trim(p_item_type),p_item_id,trim(p_title),nullif(trim(coalesce(p_notes,'')),''),p_confidentiality,'submitted') returning id into rid;
 return rid;
end $$;
grant execute on function public.submit_guidance_approval(text,uuid,text,text,text) to authenticated;
notify pgrst,'reload schema';