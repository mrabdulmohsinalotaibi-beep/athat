-- Community contributions for the counselor media page.
create table if not exists public.counselor_contributions (
 id uuid primary key default gen_random_uuid(), owner_user_id uuid not null references auth.users(id) on delete cascade,
 author_name text not null, author_role text not null, title text not null, body text not null,
 status text not null default 'pending' check (status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(), reviewed_at timestamptz
);
alter table public.counselor_contributions enable row level security;
create policy counselor_contributions_owner_read on public.counselor_contributions for select to authenticated using (owner_user_id=auth.uid());
create policy counselor_contributions_owner_update on public.counselor_contributions for update to authenticated using (owner_user_id=auth.uid()) with check (owner_user_id=auth.uid());

create or replace function public.submit_counselor_contribution(p_token text,p_author_name text,p_author_role text,p_title text,p_body text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_owner uuid; v_id uuid;
begin
 select user_id into v_owner from public.school_settings where private_blog_token=trim(p_token) limit 1;
 if v_owner is null then raise exception 'رابط المدونة غير صالح'; end if;
 if length(trim(p_author_name))<2 or length(trim(p_author_role))<2 or length(trim(p_title))<3 or length(trim(p_body))<10 then raise exception 'أكمل بيانات المشاركة'; end if;
 insert into public.counselor_contributions(owner_user_id,author_name,author_role,title,body)
 values(v_owner,left(trim(p_author_name),100),left(trim(p_author_role),100),left(trim(p_title),180),left(trim(p_body),6000)) returning id into v_id;
 return v_id;
end $$;
revoke all on function public.submit_counselor_contribution(text,text,text,text,text) from public;
grant execute on function public.submit_counselor_contribution(text,text,text,text,text) to anon,authenticated;

create or replace function public.approve_counselor_contribution(p_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_item public.counselor_contributions%rowtype; v_post uuid;
begin
 select * into v_item from public.counselor_contributions where id=p_id and owner_user_id=auth.uid();
 if v_item.id is null then raise exception 'المشاركة غير موجودة'; end if;
 insert into public.posts(user_id,title,slug,kind,excerpt,body,author_name,is_public,published_at)
 values(auth.uid(),v_item.title,'community-'||replace(v_item.id::text,'-',''),'post',left(v_item.body,180),v_item.body,v_item.author_name||' · '||v_item.author_role,true,now()) returning id into v_post;
 update public.counselor_contributions set status='approved',reviewed_at=now() where id=p_id;
 return v_post;
end $$;
grant execute on function public.approve_counselor_contribution(uuid) to authenticated;
