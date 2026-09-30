-- Multi-step administrative approval workflow for immutable school report handoffs.
-- Counselor -> vice principal -> principal, with return notes and a visible audit timeline.

alter table public.school_report_handoffs
  add column if not exists root_handoff_id uuid,
  add column if not exists parent_handoff_id uuid,
  add column if not exists decision_note text,
  add column if not exists decision_at timestamptz,
  add column if not exists decision_by_member_id uuid references public.school_members(id) on delete set null;

update public.school_report_handoffs
set root_handoff_id=id
where root_handoff_id is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='school_report_handoffs_root_fk'
  ) then
    alter table public.school_report_handoffs
      add constraint school_report_handoffs_root_fk
      foreign key (root_handoff_id) references public.school_report_handoffs(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname='school_report_handoffs_parent_fk'
  ) then
    alter table public.school_report_handoffs
      add constraint school_report_handoffs_parent_fk
      foreign key (parent_handoff_id) references public.school_report_handoffs(id) on delete set null;
  end if;
end $$;

alter table public.school_report_handoffs
  alter column root_handoff_id set not null;

alter table public.school_report_handoffs
  drop constraint if exists school_report_handoffs_status_check;

alter table public.school_report_handoffs
  add constraint school_report_handoffs_status_check
  check (status in ('sent','read','returned','forwarded','approved','archived'));

create index if not exists school_report_handoffs_root_idx
  on public.school_report_handoffs(root_handoff_id,sent_at);

create table if not exists public.school_report_handoff_events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  root_handoff_id uuid not null references public.school_report_handoffs(id) on delete cascade,
  handoff_id uuid not null references public.school_report_handoffs(id) on delete cascade,
  actor_member_id uuid references public.school_members(id) on delete set null,
  actor_name text not null,
  actor_role text not null,
  event_type text not null check (event_type in ('sent','read','returned','forwarded','approved','archived')),
  note text,
  target_member_id uuid references public.school_members(id) on delete set null,
  target_name text,
  target_role text,
  created_at timestamptz not null default now()
);

create index if not exists school_report_handoff_events_root_idx
  on public.school_report_handoff_events(root_handoff_id,created_at);

alter table public.school_report_handoff_events enable row level security;

drop policy if exists "handoff_chain_participants_read" on public.school_report_handoffs;
drop policy if exists "handoff_participants_read" on public.school_report_handoffs;
create policy "handoff_chain_participants_read"
on public.school_report_handoffs
for select to authenticated
using (
  public.is_school_admin(school_id)
  or exists (
    select 1
    from public.school_report_handoffs chain
    join public.school_members m
      on (m.id=chain.sender_member_id or m.id=chain.recipient_member_id)
    where chain.root_handoff_id=school_report_handoffs.root_handoff_id
      and m.user_id=auth.uid()
      and m.member_status='active'
  )
);

drop policy if exists "handoff_events_chain_read" on public.school_report_handoff_events;
create policy "handoff_events_chain_read"
on public.school_report_handoff_events
for select to authenticated
using (
  public.is_school_admin(school_id)
  or exists (
    select 1
    from public.school_report_handoffs chain
    join public.school_members m
      on (m.id=chain.sender_member_id or m.id=chain.recipient_member_id)
    where chain.root_handoff_id=school_report_handoff_events.root_handoff_id
      and m.user_id=auth.uid()
      and m.member_status='active'
  )
);

-- Backfill one "sent" event for existing handoffs without an event.
insert into public.school_report_handoff_events(
  school_id,root_handoff_id,handoff_id,actor_member_id,actor_name,actor_role,
  event_type,note,target_member_id,target_name,target_role,created_at
)
select
  h.school_id,h.root_handoff_id,h.id,h.sender_member_id,h.sender_name,h.sender_role,
  'sent',h.note,h.recipient_member_id,h.recipient_name,h.recipient_role,h.sent_at
from public.school_report_handoffs h
where not exists (
  select 1 from public.school_report_handoff_events e
  where e.handoff_id=h.id and e.event_type='sent'
);

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
  v_id uuid := gen_random_uuid();
  v_has_vice boolean := false;
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

  -- Follow the school hierarchy when a vice principal is available.
  if v_sender.role='counselor' then
    select exists(
      select 1 from public.school_members m
      where m.school_id=v_sender.school_id
        and m.member_status='active'
        and m.role='vice_principal'
    ) into v_has_vice;

    if v_has_vice and v_recipient.role<>'vice_principal' then
      raise exception 'Send the report to the vice principal first';
    end if;

    if not v_has_vice and v_recipient.role<>'principal' then
      raise exception 'Send the report to the school principal';
    end if;
  end if;

  if nullif(trim(p_title),'') is null then raise exception 'Report title is required'; end if;
  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' then raise exception 'Report snapshot is required'; end if;
  if pg_column_size(p_snapshot) > 2500000 then raise exception 'Report is too large. Narrow the date range or selected sections'; end if;

  insert into public.school_report_handoffs(
    id,school_id,root_handoff_id,parent_handoff_id,
    sender_member_id,recipient_member_id,
    sender_name,sender_role,recipient_name,recipient_role,
    title,note,snapshot,status
  )
  values(
    v_id,v_sender.school_id,v_id,null,
    v_sender.id,v_recipient.id,
    coalesce(nullif(trim(v_sender.display_name),''),'عضو المدرسة'),v_sender.role,
    coalesce(nullif(trim(v_recipient.display_name),''),'مسؤول المدرسة'),v_recipient.role,
    trim(p_title),nullif(trim(p_note),''),p_snapshot,'sent'
  );

  insert into public.school_report_handoff_events(
    school_id,root_handoff_id,handoff_id,actor_member_id,actor_name,actor_role,
    event_type,note,target_member_id,target_name,target_role
  )
  values(
    v_sender.school_id,v_id,v_id,v_sender.id,
    coalesce(nullif(trim(v_sender.display_name),''),'عضو المدرسة'),v_sender.role,
    'sent',nullif(trim(p_note),''),v_recipient.id,
    coalesce(nullif(trim(v_recipient.display_name),''),'مسؤول المدرسة'),v_recipient.role
  );

  return v_id;
end;
$$;

create or replace function public.mark_school_report_handoff_read(p_handoff_id uuid)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_handoff public.school_report_handoffs%rowtype;
  v_reader public.school_members%rowtype;
  v_first_read boolean := false;
begin
  select * into v_handoff
  from public.school_report_handoffs
  where id=p_handoff_id
  for update;

  if not found then raise exception 'Report not found'; end if;

  select * into v_reader
  from public.school_members
  where id=v_handoff.recipient_member_id
    and user_id=auth.uid()
    and member_status='active';

  if not found then raise exception 'Report not found or not addressed to you'; end if;

  v_first_read := v_handoff.read_at is null;

  update public.school_report_handoffs
  set read_at=coalesce(read_at,now()),
      status=case when status='sent' then 'read' else status end
  where id=p_handoff_id;

  if v_first_read then
    insert into public.school_report_handoff_events(
      school_id,root_handoff_id,handoff_id,actor_member_id,actor_name,actor_role,event_type
    )
    values(
      v_handoff.school_id,v_handoff.root_handoff_id,v_handoff.id,v_reader.id,
      coalesce(nullif(trim(v_reader.display_name),''),'عضو المدرسة'),v_reader.role,'read'
    );
  end if;
end;
$$;

create or replace function public.review_school_report_handoff(
  p_handoff_id uuid,
  p_action text,
  p_note text default null,
  p_forward_to_member_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_handoff public.school_report_handoffs%rowtype;
  v_reviewer public.school_members%rowtype;
  v_target public.school_members%rowtype;
  v_new_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into v_handoff
  from public.school_report_handoffs
  where id=p_handoff_id
  for update;

  if not found then raise exception 'Report not found'; end if;

  select * into v_reviewer
  from public.school_members
  where id=v_handoff.recipient_member_id
    and user_id=auth.uid()
    and member_status='active';

  if not found then raise exception 'Only the current recipient can review this report'; end if;
  if v_handoff.status not in ('sent','read') then raise exception 'This report has already been reviewed'; end if;

  if p_action='return' then
    if nullif(trim(p_note),'') is null then raise exception 'A return note is required'; end if;

    update public.school_report_handoffs
    set status='returned',
        decision_note=trim(p_note),
        decision_at=now(),
        decision_by_member_id=v_reviewer.id
    where id=v_handoff.id;

    insert into public.school_report_handoff_events(
      school_id,root_handoff_id,handoff_id,actor_member_id,actor_name,actor_role,event_type,note,
      target_member_id,target_name,target_role
    )
    values(
      v_handoff.school_id,v_handoff.root_handoff_id,v_handoff.id,v_reviewer.id,
      coalesce(nullif(trim(v_reviewer.display_name),''),'مسؤول المدرسة'),v_reviewer.role,
      'returned',trim(p_note),v_handoff.sender_member_id,v_handoff.sender_name,v_handoff.sender_role
    );

    return v_handoff.id;

  elsif p_action='approve' then
    if v_reviewer.role<>'principal' then
      raise exception 'Final approval is reserved for the school principal';
    end if;

    update public.school_report_handoffs
    set status='approved',
        decision_note=nullif(trim(p_note),''),
        decision_at=now(),
        decision_by_member_id=v_reviewer.id
    where id=v_handoff.id;

    insert into public.school_report_handoff_events(
      school_id,root_handoff_id,handoff_id,actor_member_id,actor_name,actor_role,event_type,note
    )
    values(
      v_handoff.school_id,v_handoff.root_handoff_id,v_handoff.id,v_reviewer.id,
      coalesce(nullif(trim(v_reviewer.display_name),''),'مدير المدرسة'),v_reviewer.role,
      'approved',nullif(trim(p_note),'')
    );

    return v_handoff.id;

  elsif p_action='approve_and_forward' then
    if v_reviewer.role<>'vice_principal' then
      raise exception 'Only the vice principal can approve and forward to the principal';
    end if;
    if p_forward_to_member_id is null then raise exception 'Choose the school principal'; end if;

    select * into v_target
    from public.school_members
    where id=p_forward_to_member_id
      and school_id=v_handoff.school_id
      and member_status='active'
      and role='principal';

    if not found then raise exception 'The selected principal is not active in this school'; end if;

    v_new_id := gen_random_uuid();

    update public.school_report_handoffs
    set status='forwarded',
        decision_note=nullif(trim(p_note),''),
        decision_at=now(),
        decision_by_member_id=v_reviewer.id
    where id=v_handoff.id;

    insert into public.school_report_handoffs(
      id,school_id,root_handoff_id,parent_handoff_id,
      sender_member_id,recipient_member_id,
      sender_name,sender_role,recipient_name,recipient_role,
      title,note,snapshot,status
    )
    values(
      v_new_id,v_handoff.school_id,v_handoff.root_handoff_id,v_handoff.id,
      v_reviewer.id,v_target.id,
      coalesce(nullif(trim(v_reviewer.display_name),''),'وكيل المدرسة'),v_reviewer.role,
      coalesce(nullif(trim(v_target.display_name),''),'مدير المدرسة'),v_target.role,
      v_handoff.title,nullif(trim(p_note),''),v_handoff.snapshot,'sent'
    );

    insert into public.school_report_handoff_events(
      school_id,root_handoff_id,handoff_id,actor_member_id,actor_name,actor_role,event_type,note,
      target_member_id,target_name,target_role
    )
    values(
      v_handoff.school_id,v_handoff.root_handoff_id,v_handoff.id,v_reviewer.id,
      coalesce(nullif(trim(v_reviewer.display_name),''),'وكيل المدرسة'),v_reviewer.role,
      'forwarded',nullif(trim(p_note),''),v_target.id,
      coalesce(nullif(trim(v_target.display_name),''),'مدير المدرسة'),v_target.role
    );

    insert into public.school_report_handoff_events(
      school_id,root_handoff_id,handoff_id,actor_member_id,actor_name,actor_role,event_type,note,
      target_member_id,target_name,target_role
    )
    values(
      v_handoff.school_id,v_handoff.root_handoff_id,v_new_id,v_reviewer.id,
      coalesce(nullif(trim(v_reviewer.display_name),''),'وكيل المدرسة'),v_reviewer.role,
      'sent',nullif(trim(p_note),''),v_target.id,
      coalesce(nullif(trim(v_target.display_name),''),'مدير المدرسة'),v_target.role
    );

    return v_new_id;
  else
    raise exception 'Invalid review action';
  end if;
end;
$$;

create or replace function public.archive_school_report_handoff(p_handoff_id uuid)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_handoff public.school_report_handoffs%rowtype;
  v_member public.school_members%rowtype;
begin
  select * into v_handoff
  from public.school_report_handoffs
  where id=p_handoff_id
  for update;

  if not found then raise exception 'Report not found'; end if;

  select * into v_member
  from public.school_members
  where id=v_handoff.recipient_member_id
    and user_id=auth.uid()
    and member_status='active';

  if not found then raise exception 'Report not found or not addressed to you'; end if;

  update public.school_report_handoffs
  set status='archived',archived_at=coalesce(archived_at,now())
  where id=p_handoff_id;

  insert into public.school_report_handoff_events(
    school_id,root_handoff_id,handoff_id,actor_member_id,actor_name,actor_role,event_type
  )
  values(
    v_handoff.school_id,v_handoff.root_handoff_id,v_handoff.id,v_member.id,
    coalesce(nullif(trim(v_member.display_name),''),'عضو المدرسة'),v_member.role,'archived'
  );
end;
$$;

revoke all on function public.create_school_report_handoff(uuid,text,text,jsonb) from public;
revoke all on function public.mark_school_report_handoff_read(uuid) from public;
revoke all on function public.review_school_report_handoff(uuid,text,text,uuid) from public;
revoke all on function public.archive_school_report_handoff(uuid) from public;
grant execute on function public.create_school_report_handoff(uuid,text,text,jsonb) to authenticated;
grant execute on function public.mark_school_report_handoff_read(uuid) to authenticated;
grant execute on function public.review_school_report_handoff(uuid,text,text,uuid) to authenticated;
grant execute on function public.archive_school_report_handoff(uuid) to authenticated;
