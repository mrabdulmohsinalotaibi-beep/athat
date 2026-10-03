alter table public.programs add column if not exists approval_status text not null default 'draft';
alter table public.programs add column if not exists approval_id uuid;
alter table public.programs add column if not exists approval_updated_at timestamptz;
create or replace function public.submit_program_for_approval(p_program_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.programs%rowtype; m public.school_members%rowtype; ev int; aid uuid;
begin
 select * into p from public.programs where id=p_program_id;
 if p.id is null then raise exception 'البرنامج غير موجود'; end if;
 select * into m from public.school_members where user_id=auth.uid() and member_status='active' order by is_admin desc limit 1;
 if m.id is null then raise exception 'لا توجد عضوية مدرسية فعالة'; end if;
 if p.user_id<>auth.uid() and not (m.is_admin or m.role='counselor') then raise exception 'لا تملك صلاحية رفع هذا البرنامج'; end if;
 if p.exec_status not in ('منفذ','جاهز لاعتماد التنفيذ') then raise exception 'يجب إكمال تنفيذ البرنامج أولاً'; end if;
 select count(*) into ev from public.evidences where linked_type='برنامج' and (linked_ref=p.id::text or linked_ref=coalesce(p.name,''));
 if ev=0 then raise exception 'يجب رفع شاهد واحد على الأقل قبل الاعتماد'; end if;
 aid:=public.submit_guidance_approval('program',p.id,coalesce(p.name,'برنامج توجيهي'),'اعتماد تنفيذ البرنامج وشواهده','team');
 update public.programs set exec_status='جاهز لاعتماد التنفيذ',approval_status='submitted',approval_id=aid,approval_updated_at=now(),updated_at=now() where id=p.id;
 return aid;
end $$;
grant execute on function public.submit_program_for_approval(uuid) to authenticated;
create or replace function public.sync_program_approval_status()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.item_type='program' and new.item_id is not null then
  update public.programs set approval_status=new.status,exec_status=case when new.status='approved' then 'معتمد' when new.status='rejected' then 'منفذ' else exec_status end,approval_updated_at=now(),updated_at=now() where id=new.item_id;
 end if;
 return new;
end $$;
drop trigger if exists trg_sync_program_approval on public.guidance_approvals;
create trigger trg_sync_program_approval after update of status on public.guidance_approvals for each row execute function public.sync_program_approval_status();
notify pgrst,'reload schema';