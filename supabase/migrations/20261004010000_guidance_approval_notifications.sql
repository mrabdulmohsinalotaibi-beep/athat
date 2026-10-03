create table if not exists public.guidance_notifications(
 id uuid primary key default gen_random_uuid(),school_id uuid not null,recipient_user_id uuid not null,actor_user_id uuid,
 approval_id uuid references public.guidance_approvals(id) on delete cascade,request_id uuid references public.guidance_requests(id) on delete cascade,
 kind text not null,title text not null,body text,is_read boolean not null default false,created_at timestamptz not null default now(),read_at timestamptz);
alter table public.guidance_notifications enable row level security;
drop policy if exists guidance_notifications_select on public.guidance_notifications;
create policy guidance_notifications_select on public.guidance_notifications for select to authenticated using(recipient_user_id=auth.uid());
drop policy if exists guidance_notifications_update on public.guidance_notifications;
create policy guidance_notifications_update on public.guidance_notifications for update to authenticated using(recipient_user_id=auth.uid()) with check(recipient_user_id=auth.uid());
create or replace function public.notify_guidance_approval_submitted() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 insert into public.guidance_notifications(school_id,recipient_user_id,actor_user_id,approval_id,kind,title,body)
 select new.school_id,sm.user_id,new.submitted_by,new.id,'approval_submitted','عمل جديد بانتظار الاعتماد',new.title
 from public.school_members sm where sm.school_id=new.school_id and sm.member_status='active' and sm.user_id<>new.submitted_by and (sm.is_admin or sm.role in ('principal','student_affairs_vice'));
 return new;
end $$;
drop trigger if exists trg_guidance_approval_submitted_notify on public.guidance_approvals;
create trigger trg_guidance_approval_submitted_notify after insert on public.guidance_approvals for each row execute function public.notify_guidance_approval_submitted();
create or replace function public.notify_guidance_approval_decision() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.status is distinct from old.status and new.status in ('reviewed','approved','rejected') then
  insert into public.guidance_notifications(school_id,recipient_user_id,actor_user_id,approval_id,kind,title,body)
  values(new.school_id,new.submitted_by,auth.uid(),new.id,'approval_'||new.status,
   case new.status when 'approved' then 'تم اعتماد العمل' when 'rejected' then 'أعيد العمل بملاحظة' else 'تمت مراجعة العمل' end,
   concat(new.title,case when nullif(new.review_notes,'') is not null then ' — '||new.review_notes else '' end));
 end if; return new;
end $$;
drop trigger if exists trg_guidance_approval_decision_notify on public.guidance_approvals;
create trigger trg_guidance_approval_decision_notify after update of status on public.guidance_approvals for each row execute function public.notify_guidance_approval_decision();
create or replace function public.get_my_guidance_notifications(p_limit int default 20) returns setof public.guidance_notifications language sql security definer set search_path=public,pg_temp as $$select * from public.guidance_notifications where recipient_user_id=auth.uid() order by created_at desc limit greatest(1,least(coalesce(p_limit,20),100))$$;
create or replace function public.mark_guidance_notifications_read() returns void language sql security definer set search_path=public,pg_temp as $$update public.guidance_notifications set is_read=true,read_at=coalesce(read_at,now()) where recipient_user_id=auth.uid() and not is_read$$;
grant execute on function public.get_my_guidance_notifications(int) to authenticated;
grant execute on function public.mark_guidance_notifications_read() to authenticated;
notify pgrst,'reload schema';