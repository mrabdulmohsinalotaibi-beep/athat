-- Link guidance workflow records to a counseling case and keep case follow-up state synchronized.

alter table public.interviews
  add column if not exists case_id uuid references public.counseling_cases(id) on delete set null;

alter table public.referrals
  add column if not exists case_id uuid references public.counseling_cases(id) on delete set null;

create index if not exists interviews_case_id_idx on public.interviews(case_id);
create index if not exists referrals_case_id_idx on public.referrals(case_id);

create or replace function public.normalize_counseling_case_state()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.case_status = 'مغلقة' and new.closed_at is null then
    new.closed_at := current_date;
  elsif new.case_status is distinct from 'مغلقة' then
    new.closed_at := null;
  end if;

  if new.opened_at is null then
    new.opened_at := current_date;
  end if;

  return new;
end;
$$;

drop trigger if exists normalize_counseling_case_state on public.counseling_cases;
create trigger normalize_counseling_case_state
before insert or update of case_status, opened_at, closed_at
on public.counseling_cases
for each row execute function public.normalize_counseling_case_state();

create or replace function public.sync_case_from_interview()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.case_id is null then return new; end if;

  update public.counseling_cases
  set
    last_followup = coalesce(new.idate, current_date),
    followup_at = new.followup_at,
    next_action = case
      when nullif(trim(coalesce(new.recommendations, '')), '') is not null
        then new.recommendations
      else next_action
    end,
    case_status = case
      when case_status = 'مغلقة' then case_status
      else 'قيد المتابعة'
    end,
    updated_at = now()
  where id = new.case_id
    and user_id = new.user_id;

  return new;
end;
$$;

drop trigger if exists sync_case_from_interview on public.interviews;
create trigger sync_case_from_interview
after insert or update of case_id, idate, followup_at, recommendations
on public.interviews
for each row execute function public.sync_case_from_interview();

create or replace function public.sync_case_from_referral()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.case_id is null then return new; end if;

  update public.counseling_cases
  set
    next_action = case
      when new.status = 'منتهية' then coalesce(nullif(new.result, ''), next_action)
      when nullif(trim(coalesce(new.referred_to, '')), '') is not null
        then 'متابعة الإحالة إلى ' || new.referred_to
      else next_action
    end,
    case_status = case
      when case_status = 'مغلقة' then case_status
      else 'قيد المتابعة'
    end,
    updated_at = now()
  where id = new.case_id
    and user_id = new.user_id;

  return new;
end;
$$;

drop trigger if exists sync_case_from_referral on public.referrals;
create trigger sync_case_from_referral
after insert or update of case_id, status, result, referred_to
on public.referrals
for each row execute function public.sync_case_from_referral();
