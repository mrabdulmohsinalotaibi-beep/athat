-- Let a sender acknowledge/archive a report returned to them.
-- The immutable timeline remains the source of truth for the return decision.

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
  where user_id=auth.uid()
    and member_status='active'
    and school_id=v_handoff.school_id
    and id in (v_handoff.recipient_member_id,v_handoff.sender_member_id)
  order by case when id=v_handoff.recipient_member_id then 0 else 1 end
  limit 1;

  if not found then raise exception 'Report not found or not available to you'; end if;

  if v_member.id=v_handoff.sender_member_id and v_handoff.status<>'returned' then
    raise exception 'Only a returned report can be archived by its sender';
  end if;

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

revoke all on function public.archive_school_report_handoff(uuid) from public;
grant execute on function public.archive_school_report_handoff(uuid) to authenticated;
