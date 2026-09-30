-- Immutable, read-only administrative report handoffs inside one school workspace.

create table if not exists public.school_report_handoffs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  sender_member_id uuid not null references public.school_members(id) on delete restrict,
  recipient_member_id uuid not null references public.school_members(id) on delete restrict,
  sender_name text not null,
  sender_role text not null,
  recipient_name text not null,
  recipient_role text not null,
  title text not null,
  note text,
  snapshot jsonb not null,
  status text not null default 'sent' check (status in ('sent','read','archived')),
  sent_at timestamptz not null default now(),
  read_at timestamptz,
  archived_at timestamptz
);

create index if not exists school_report_handoffs_school_idx
  on public.school_report_handoffs(school_id,sent_at desc);
create index if not exists school_report_handoffs_recipient_idx
  on public.school_report_handoffs(recipient_member_id,status,sent_at desc);
create index if not exists school_report_handoffs_sender_idx
  on public.school_report_handoffs(sender_member_id,sent_at desc);

alter table public.school_report_handoffs enable row level security;

drop policy if exists "handoff_participants_read" on public.school_report_handoffs;
create policy "handoff_participants_read"
on public.school_report_handoffs
for select to authenticated
using (
  exists (
    select 1 from public.school_members m
    where m.id=sender_member_id and m.user_id=auth.uid() and m.member_status='active'
  )
  or exists (
    select 1 from public.school_members m
    where m.id=recipient_member_id and m.user_id=auth.uid() and m.member_status='active'
  )
  or public.is_school_admin(school_id)
);

create or replace function public.school_role_rank(p_role text)
returns integer
language sql
immutable
set search_path=public,pg_temp
as $$
  select case p_role
    when 'principal' then 50
    when 'vice_principal' then 40
    when 'counselor' then 30
    when 'teacher' then 20
    when 'admin_staff' then 20
    when 'guard' then 10
    when 'observer' then 0
    else 0
  end;
$$;

create or replace function public.create_school_report_handoff(
  p_recipient_member_id uuid,
  p_title text,
  p_note text,
  p_snapshot jsonb
)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_sender public.school_members%rowtype;
  v_recipient public.school_members%rowtype;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into v_sender
  from public.school_members
  where user_id=auth.uid() and member_status='active'
  order by is_admin desc, joined_at desc nulls last
  limit 1;

  if not found then raise exception 'Active school membership required'; end if;

  select * into v_recipient
  from public.school_members
  where id=p_recipient_member_id
    and school_id=v_sender.school_id
    and member_status='active';

  if not found then raise exception 'Recipient is not an active member of your school'; end if;
  if v_recipient.user_id=auth.uid() then raise exception 'Choose another recipient'; end if;
  if public.school_role_rank(v_recipient.role) <= public.school_role_rank(v_sender.role) then
    raise exception 'Administrative reports can only be raised to a higher school role';
  end if;
  if nullif(trim(p_title),'') is null then raise exception 'Report title is required'; end if;
  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' then raise exception 'Report snapshot is required'; end if;
  if pg_column_size(p_snapshot) > 2500000 then raise exception 'Report is too large. Narrow the date range or selected sections'; end if;

  insert into public.school_report_handoffs(
    school_id,sender_member_id,recipient_member_id,
    sender_name,sender_role,recipient_name,recipient_role,
    title,note,snapshot
  )
  values(
    v_sender.school_id,v_sender.id,v_recipient.id,
    coalesce(nullif(trim(v_sender.display_name),''),'عضو المدرسة'),v_sender.role,
    coalesce(nullif(trim(v_recipient.display_name),''),'مسؤول المدرسة'),v_recipient.role,
    trim(p_title),nullif(trim(p_note),''),p_snapshot
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.mark_school_report_handoff_read(p_handoff_id uuid)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  update public.school_report_handoffs h
  set status='read',read_at=coalesce(read_at,now())
  where h.id=p_handoff_id
    and exists(
      select 1 from public.school_members m
      where m.id=h.recipient_member_id
        and m.user_id=auth.uid()
        and m.member_status='active'
    );
  if not found then raise exception 'Report not found or not addressed to you'; end if;
end;
$$;

create or replace function public.archive_school_report_handoff(p_handoff_id uuid)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  update public.school_report_handoffs h
  set status='archived',archived_at=coalesce(archived_at,now())
  where h.id=p_handoff_id
    and exists(
      select 1 from public.school_members m
      where m.id=h.recipient_member_id
        and m.user_id=auth.uid()
        and m.member_status='active'
    );
  if not found then raise exception 'Report not found or not addressed to you'; end if;
end;
$$;

revoke all on function public.create_school_report_handoff(uuid,text,text,jsonb) from public;
revoke all on function public.mark_school_report_handoff_read(uuid) from public;
revoke all on function public.archive_school_report_handoff(uuid) from public;
grant execute on function public.create_school_report_handoff(uuid,text,text,jsonb) to authenticated;
grant execute on function public.mark_school_report_handoff_read(uuid) to authenticated;
grant execute on function public.archive_school_report_handoff(uuid) to authenticated;