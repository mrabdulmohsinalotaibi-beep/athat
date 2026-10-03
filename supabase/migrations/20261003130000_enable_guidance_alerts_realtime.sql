-- Enable Supabase Realtime for the tables used by ATHAT's live dashboard
-- and notification center. Safe to re-run: each table is added only when it
-- is not already a member of the supabase_realtime publication.

do $$
declare
  t text;
begin
  foreach t in array array[
    'feedback_messages',
    'counseling_cases',
    'interviews',
    'behavior',
    'attendance',
    'school_tasks',
    'school_report_handoffs',
    'plan_tasks'
  ]
  loop
    if to_regclass('public.' || t) is not null
       and not exists (
         select 1
         from pg_publication_tables
         where pubname = 'supabase_realtime'
           and schemaname = 'public'
           and tablename = t
       )
    then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end
$$;
