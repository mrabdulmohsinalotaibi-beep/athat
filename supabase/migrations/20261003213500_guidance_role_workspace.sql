-- Role-based student guidance workspace
create table if not exists public.guidance_approvals (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null,
 submitted_by uuid not null,
 reviewer_id uuid,
 item_type text not null,
 item_id uuid,
 title text not null,
 notes text,
 review_notes text,
 confidentiality text not null default 'team' check (confidentiality in ('team','guidance','restricted')),
 status text not null default 'submitted' check (status in ('submitted','reviewed','approved','rejected')),
 submitted_at timestamptz not null default now(),
 reviewed_at timestamptz,
 decided_at timestamptz
);
alter table public.guidance_approvals enable row level security;

create or replace function public.guidance_role_permissions(p_role text)
returns jsonb language sql immutable as $$
select case lower(coalesce(p_role,''))
 when 'counselor' then '{"key":"counselor","label":"الموجه الطلابي","modules":["plan","programs","cases","interviews","consultations","attendance","behavior","referrals","family","initiatives","evidence","reports","approvals"],"confidentiality":["team","guidance","restricted"],"manage":true}'::jsonb
 when 'principal' then '{"key":"principal","label":"مدير المدرسة","modules":["oversight","reports","approvals","initiatives"],"confidentiality":["team","restricted"],"manage":true}'::jsonb
 when 'student_affairs_vice' then '{"key":"student_affairs_vice","label":"وكيل شؤون الطلاب","modules":["attendance","behavior","referrals","family","reports","approvals"],"confidentiality":["team","guidance"],"manage":false}'::jsonb
 when 'academic_vice' then '{"key":"academic_vice","label":"وكيل الشؤون التعليمية","modules":["academic","remedial","teacher_referrals","reports"],"confidentiality":["team"],"manage":false}'::jsonb
 when 'teacher' then '{"key":"teacher","label":"المعلم","modules":["referrals","observations","consultation_request","initiatives","assigned_tasks","evidence"],"confidentiality":["team"],"manage":false}'::jsonb
 when 'activity_leader' then '{"key":"activity_leader","label":"رائد النشاط","modules":["initiatives","programs","activities","participants","evidence","reports"],"confidentiality":["team"],"manage":false}'::jsonb
 when 'health_guide' then '{"key":"health_guide","label":"الموجه الصحي","modules":["health_referrals","prevention","health_programs"],"confidentiality":["team"],"manage":false}'::jsonb
 when 'registrar' then '{"key":"registrar","label":"الإداري / مسجل المعلومات","modules":["students","operational_records"],"confidentiality":["team"],"manage":false}'::jsonb
 else '{"key":"member","label":"عضو المدرسة","modules":[],"confidentiality":[],"manage":false}'::jsonb end $$;

create or replace function public.get_my_guidance_workspace()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare m record; perms jsonb;
begin
 select * into m from public.school_members where user_id=auth.uid() and member_status='active' order by is_admin desc, joined_at desc limit 1;
 if m.id is null then raise exception 'لا توجد عضوية مدرسية فعالة'; end if;
 perms:=public.guidance_role_permissions(m.role);
 return jsonb_build_object('school_id',m.school_id,'member_id',m.id,'display_name',m.display_name,'role',m.role,'is_admin',m.is_admin,'permissions',perms);
end $$;
grant execute on function public.get_my_guidance_workspace() to authenticated;

drop policy if exists guidance_approvals_select on public.guidance_approvals;
create policy guidance_approvals_select on public.guidance_approvals for select to authenticated using (
 submitted_by=auth.uid() or reviewer_id=auth.uid() or exists(
  select 1 from public.school_members sm where sm.school_id=guidance_approvals.school_id and sm.user_id=auth.uid() and sm.member_status='active'
  and (sm.is_admin or sm.role='counselor' or (sm.role='student_affairs_vice' and confidentiality in ('team','guidance')) or (sm.role='principal' and confidentiality in ('team','restricted')))
 )
);
drop policy if exists guidance_approvals_insert on public.guidance_approvals;
create policy guidance_approvals_insert on public.guidance_approvals for insert to authenticated with check (
 submitted_by=auth.uid() and exists(select 1 from public.school_members sm where sm.school_id=guidance_approvals.school_id and sm.user_id=auth.uid() and sm.member_status='active')
);
drop policy if exists guidance_approvals_update on public.guidance_approvals;
create policy guidance_approvals_update on public.guidance_approvals for update to authenticated using (
 reviewer_id=auth.uid() or exists(select 1 from public.school_members sm where sm.school_id=guidance_approvals.school_id and sm.user_id=auth.uid() and sm.member_status='active' and (sm.is_admin or sm.role='counselor'))
);
notify pgrst, 'reload schema';