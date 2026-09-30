-- Avoid recursive RLS evaluation while still allowing participants to follow
-- the complete immutable approval chain.

create or replace function public.can_read_school_handoff_chain(
  p_school_id uuid,
  p_root_handoff_id uuid
)
returns boolean
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select
    auth.uid() is not null
    and (
      public.is_school_admin(p_school_id)
      or exists (
        select 1
        from public.school_report_handoffs h
        join public.school_members m
          on (m.id=h.sender_member_id or m.id=h.recipient_member_id)
        where h.school_id=p_school_id
          and h.root_handoff_id=p_root_handoff_id
          and m.user_id=auth.uid()
          and m.member_status='active'
      )
    );
$$;

revoke all on function public.can_read_school_handoff_chain(uuid,uuid) from public;
grant execute on function public.can_read_school_handoff_chain(uuid,uuid) to authenticated;

drop policy if exists "handoff_chain_participants_read" on public.school_report_handoffs;
create policy "handoff_chain_participants_read"
on public.school_report_handoffs
for select to authenticated
using (public.can_read_school_handoff_chain(school_id,root_handoff_id));

drop policy if exists "handoff_events_chain_read" on public.school_report_handoff_events;
create policy "handoff_events_chain_read"
on public.school_report_handoff_events
for select to authenticated
using (public.can_read_school_handoff_chain(school_id,root_handoff_id));
