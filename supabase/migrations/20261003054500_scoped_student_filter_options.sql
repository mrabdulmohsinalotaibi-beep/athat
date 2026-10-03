-- Make student filter options respect RLS-scoped visibility instead of only record ownership.

create or replace function public.get_student_filter_options()
returns jsonb
language sql
stable
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'stages', coalesce((
      select jsonb_agg(value order by sort_no)
      from (
        select value, sort_no
        from (values ('ابتدائي',1),('متوسط',2),('ثانوي',3)) s(value,sort_no)
        where exists (
          select 1 from public.students
          where stage=s.value
        )
      ) q
    ), '[]'::jsonb),
    'grades', coalesce((
      select jsonb_agg(value order by value)
      from (
        select distinct trim(grade) as value
        from public.students
        where nullif(trim(grade),'') is not null
      ) q
    ), '[]'::jsonb),
    'classrooms', coalesce((
      select jsonb_agg(value order by value)
      from (
        select distinct trim(classroom) as value
        from public.students
        where nullif(trim(classroom),'') is not null
      ) q
    ), '[]'::jsonb),
    'nationalities', coalesce((
      select jsonb_agg(value order by value)
      from (
        select distinct trim(nationality) as value
        from public.students
        where nullif(trim(nationality),'') is not null
      ) q
    ), '[]'::jsonb),
    'statuses', coalesce((
      select jsonb_agg(value order by value)
      from (
        select distinct trim(status) as value
        from public.students
        where nullif(trim(status),'') is not null
      ) q
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_student_filter_options() from public;
grant execute on function public.get_student_filter_options() to authenticated;
