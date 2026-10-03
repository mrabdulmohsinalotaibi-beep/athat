create table if not exists public.guidance_requests(
 id uuid primary key default gen_random_uuid(), school_id uuid not null, submitted_by uuid not null,
 student_id uuid, student_name text, kind text not null check(kind in ('referral','observation','consultation')),
 category text, subject text not null, details text not null, urgency text not null default 'normal' check(urgency in ('normal','important','urgent')),
 confidentiality text not null default 'guidance' check(confidentiality in ('team','guidance','restricted')),
 status text not null default 'submitted' check(status in ('submitted','reviewed','in_progress','completed','rejected')),
 assigned_to uuid, response text, created_at timestamptz not null default now(), reviewed_at timestamptz, completed_at timestamptz, updated_at timestamptz not null default now()
);
alter table public.guidance_requests enable row level security;
drop policy if exists guidance_requests_select on public.guidance_requests;
create policy guidance_requests_select on public.guidance_requests for select to authenticated using(
 submitted_by=auth.uid() or assigned_to=auth.uid() or exists(select 1 from public.school_members sm where sm.school_id=guidance_requests.school_id and sm.user_id=auth.uid() and sm.member_status='active' and (sm.is_admin or sm.role='counselor' or (sm.role='student_affairs_vice' and guidance_requests.confidentiality in ('team','guidance')) or (sm.role='principal' and guidance_requests.confidentiality in ('team','restricted'))))
);
drop policy if exists guidance_requests_insert on public.guidance_requests;
create policy guidance_requests_insert on public.guidance_requests for insert to authenticated with check(submitted_by=auth.uid() and exists(select 1 from public.school_members sm where sm.school_id=guidance_requests.school_id and sm.user_id=auth.uid() and sm.member_status='active'));
drop policy if exists guidance_requests_update on public.guidance_requests;
create policy guidance_requests_update on public.guidance_requests for update to authenticated using(assigned_to=auth.uid() or exists(select 1 from public.school_members sm where sm.school_id=guidance_requests.school_id and sm.user_id=auth.uid() and sm.member_status='active' and (sm.is_admin or sm.role='counselor')));

create or replace function public.submit_guidance_request(p_student_id uuid,p_student_name text,p_kind text,p_category text,p_subject text,p_details text,p_urgency text default 'normal',p_confidentiality text default 'guidance')
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare m record; rid uuid;
begin
 select * into m from public.school_members where user_id=auth.uid() and member_status='active' order by is_admin desc limit 1;
 if m.id is null then raise exception 'لا توجد عضوية مدرسية فعالة'; end if;
 if m.role not in ('teacher','activity_leader','health_guide','student_affairs_vice','academic_vice','vice_principal','counselor','principal') and not m.is_admin then raise exception 'ليس لديك صلاحية إرسال طلب توجيهي'; end if;
 if p_kind not in ('referral','observation','consultation') then raise exception 'نوع الطلب غير صالح'; end if;
 insert into public.guidance_requests(school_id,submitted_by,student_id,student_name,kind,category,subject,details,urgency,confidentiality)
 values(m.school_id,auth.uid(),p_student_id,nullif(trim(coalesce(p_student_name,'')),''),p_kind,nullif(trim(coalesce(p_category,'')),''),trim(p_subject),trim(p_details),p_urgency,p_confidentiality) returning id into rid;
 return rid;
end $$;
grant execute on function public.submit_guidance_request(uuid,text,text,text,text,text,text,text) to authenticated;

create or replace function public.respond_guidance_request(p_request_id uuid,p_status text,p_response text default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.guidance_requests%rowtype;
begin
 select * into r from public.guidance_requests where id=p_request_id;
 if r.id is null then raise exception 'الطلب غير موجود'; end if;
 if not exists(select 1 from public.school_members sm where sm.school_id=r.school_id and sm.user_id=auth.uid() and sm.member_status='active' and (sm.is_admin or sm.role='counselor')) then raise exception 'لا تملك صلاحية معالجة الطلب'; end if;
 if p_status not in ('reviewed','in_progress','completed','rejected') then raise exception 'الحالة غير صالحة'; end if;
 update public.guidance_requests set status=p_status,response=nullif(trim(coalesce(p_response,'')),''),assigned_to=coalesce(assigned_to,auth.uid()),reviewed_at=coalesce(reviewed_at,now()),completed_at=case when p_status='completed' then now() else completed_at end,updated_at=now() where id=p_request_id;
end $$;
grant execute on function public.respond_guidance_request(uuid,text,text) to authenticated;
notify pgrst,'reload schema';