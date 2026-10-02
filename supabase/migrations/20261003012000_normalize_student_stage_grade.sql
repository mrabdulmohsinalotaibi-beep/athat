create or replace function public.normalize_student_stage_value(input_value text)
returns text
language sql
immutable
as $$
  select case
    when nullif(trim(input_value), '') is null then null
    when trim(input_value) ~ 'ابتدائ' then 'ابتدائي'
    when trim(input_value) ~ 'متوسط' then 'متوسط'
    when trim(input_value) ~ 'ثانو' then 'ثانوي'
    else trim(input_value)
  end
$$;

create or replace function public.normalize_student_grade_value(input_value text, stage_value text)
returns text
language plpgsql
immutable
as $$
declare
  v text := trim(coalesce(input_value, ''));
  s text := public.normalize_student_stage_value(stage_value);
  ordinal text;
begin
  if v = '' then return null; end if;

  if v like '%الأول%' then ordinal := 'الأول';
  elsif v like '%الثاني%' then ordinal := 'الثاني';
  elsif v like '%الثالث%' then ordinal := 'الثالث';
  elsif v like '%الرابع%' then ordinal := 'الرابع';
  elsif v like '%الخامس%' then ordinal := 'الخامس';
  elsif v like '%السادس%' then ordinal := 'السادس';
  else return v;
  end if;

  if s = 'متوسط' then return ordinal || ' متوسط'; end if;
  if s = 'ثانوي' then return ordinal || ' ثانوي'; end if;
  if s = 'ابتدائي' then return ordinal; end if;
  return ordinal;
end;
$$;

create or replace function public.normalize_student_school_fields()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.stage := public.normalize_student_stage_value(new.stage);
  new.grade := public.normalize_student_grade_value(new.grade, new.stage);
  if new.classroom is not null then new.classroom := nullif(trim(new.classroom), ''); end if;
  return new;
end;
$$;

drop trigger if exists trg_normalize_student_school_fields on public.students;
create trigger trg_normalize_student_school_fields
before insert or update of stage, grade, classroom on public.students
for each row execute function public.normalize_student_school_fields();

update public.students
set
  stage = public.normalize_student_stage_value(stage),
  grade = public.normalize_student_grade_value(grade, public.normalize_student_stage_value(stage)),
  classroom = nullif(trim(classroom), '')
where
  stage is not null
  or grade is not null
  or classroom is not null;

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
          where user_id=auth.uid() and stage=s.value
        )
      ) q
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
