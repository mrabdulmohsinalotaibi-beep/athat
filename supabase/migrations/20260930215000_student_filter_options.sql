create or replace function public.get_student_filter_options()
returns jsonb
language sql
stable
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'stages', coalesce((
      select jsonb_agg(value order by value)
      from (select distinct trim(stage) as value from public.students where user_id=auth.uid() and nullif(trim(stage),'') is not null) q
    ), '[]'::jsonb),
    'grades', coalesce((
      select jsonb_agg(value order by value)
      from (select distinct trim(grade) as value from public.students where user_id=auth.uid() and nullif(trim(grade),'') is not null) q
    ), '[]'::jsonb),
    'classrooms', coalesce((
      select jsonb_agg(value order by value)
      from (select distinct trim(classroom) as value from public.students where user_id=auth.uid() and nullif(trim(classroom),'') is not null) q
    ), '[]'::jsonb),
    'nationalities', coalesce((
      select jsonb_agg(value order by value)
      from (select distinct trim(nationality) as value from public.students where user_id=auth.uid() and nullif(trim(nationality),'') is not null) q
    ), '[]'::jsonb),
    'statuses', coalesce((
      select jsonb_agg(value order by value)
      from (select distinct trim(status) as value from public.students where user_id=auth.uid() and nullif(trim(status),'') is not null) q
    ), '[]'::jsonb)
  );
$$;
revoke all on function public.get_student_filter_options() from public;
grant execute on function public.get_student_filter_options() to authenticated;