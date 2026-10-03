-- Student assignment and weekly follow-up for initiative teams.
create table if not exists public.initiative_student_assignments (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references public.initiatives(id) on delete cascade,
  initiative_member_id uuid not null references public.initiative_members(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  assigned_by uuid not null references auth.users(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  active boolean not null default true,
  unique(initiative_id, initiative_member_id, student_id)
);

create table if not exists public.initiative_student_followups (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references public.initiatives(id) on delete cascade,
  initiative_member_id uuid not null references public.initiative_members(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  week_start date not null,
  attendance_status text,
  punctuality_status text,
  behavior_status text,
  homework_status text,
  academic_status text,
  meeting_held boolean not null default false,
  family_contacted boolean not null default false,
  strengths text,
  concerns text,
  advice text,
  next_action text,
  notes text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(initiative_id, student_id, week_start)
);

create index if not exists initiative_assignments_member_idx
  on public.initiative_student_assignments(initiative_member_id, active);
create index if not exists initiative_assignments_student_idx
  on public.initiative_student_assignments(student_id, active);
create index if not exists initiative_followups_week_idx
  on public.initiative_student_followups(initiative_id, week_start desc);
create index if not exists initiative_followups_member_idx
  on public.initiative_student_followups(initiative_member_id, week_start desc);

alter table public.initiative_student_assignments enable row level security;
alter table public.initiative_student_followups enable row level security;

drop policy if exists initiative_assignments_read on public.initiative_student_assignments;
create policy initiative_assignments_read on public.initiative_student_assignments
for select to authenticated using (
  exists(
    select 1 from public.initiative_members im
    where im.id=initiative_student_assignments.initiative_member_id
      and im.user_id=auth.uid()
      and im.status='active'
  )
  or exists(
    select 1 from public.initiatives i
    join public.school_members sm on sm.school_id=i.school_id
    where i.id=initiative_student_assignments.initiative_id
      and sm.user_id=auth.uid()
      and sm.member_status='active'
      and sm.is_admin
  )
  or exists(
    select 1 from public.initiatives i
    where i.id=initiative_student_assignments.initiative_id
      and i.created_by=auth.uid()
  )
);

drop policy if exists initiative_followups_read on public.initiative_student_followups;
create policy initiative_followups_read on public.initiative_student_followups
for select to authenticated using (
  created_by=auth.uid()
  or exists(
    select 1 from public.initiative_members im
    where im.id=initiative_student_followups.initiative_member_id
      and im.user_id=auth.uid()
      and im.status='active'
  )
  or exists(
    select 1 from public.initiatives i
    join public.school_members sm on sm.school_id=i.school_id
    where i.id=initiative_student_followups.initiative_id
      and sm.user_id=auth.uid()
      and sm.member_status='active'
      and sm.is_admin
  )
  or exists(
    select 1 from public.initiatives i
    where i.id=initiative_student_followups.initiative_id
      and i.created_by=auth.uid()
  )
);

create or replace function public.get_initiative_students(p_initiative_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
declare sid uuid;
begin
  select school_id into sid from public.initiatives where id=p_initiative_id;
  if sid is null then raise exception 'المبادرة غير موجودة'; end if;

  if not exists(select 1 from public.initiatives where id=p_initiative_id and created_by=auth.uid())
     and not exists(select 1 from public.school_members sm where sm.school_id=sid and sm.user_id=auth.uid() and sm.member_status='active' and sm.is_admin)
     and not exists(select 1 from public.initiative_members im where im.initiative_id=p_initiative_id and im.user_id=auth.uid() and im.status='active') then
    raise exception 'لا تملك صلاحية عرض طلاب هذه المبادرة';
  end if;

  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id',s.id,
      'full_name',s.full_name,
      'student_no',s.student_no,
      'stage',s.stage,
      'grade',s.grade,
      'classroom',s.classroom,
      'guardian_name',s.guardian_name,
      'guardian_phone',s.guardian_phone,
      'assigned_member_id',a.initiative_member_id,
      'assigned_member_name',coalesce(sm.display_name,''),
      'assigned_role',coalesce(im.role_title,'')
    ) order by s.full_name),'[]'::jsonb)
    from public.students s
    join public.school_members owner_m on owner_m.user_id=s.user_id and owner_m.school_id=sid and owner_m.member_status='active'
    left join public.initiative_student_assignments a on a.student_id=s.id and a.initiative_id=p_initiative_id and a.active
    left join public.initiative_members im on im.id=a.initiative_member_id
    left join public.school_members sm on sm.id=im.school_member_id
  );
end $$;

create or replace function public.assign_initiative_students(
  p_initiative_id uuid,
  p_initiative_member_id uuid,
  p_student_ids uuid[]
) returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare sid uuid;
begin
  select school_id into sid from public.initiatives where id=p_initiative_id;
  if sid is null then raise exception 'المبادرة غير موجودة'; end if;

  if not exists(select 1 from public.initiatives where id=p_initiative_id and created_by=auth.uid())
     and not exists(select 1 from public.school_members sm where sm.school_id=sid and sm.user_id=auth.uid() and sm.member_status='active' and sm.is_admin) then
    raise exception 'لا تملك صلاحية توزيع الطلاب';
  end if;

  if not exists(select 1 from public.initiative_members where id=p_initiative_member_id and initiative_id=p_initiative_id and status='active') then
    raise exception 'العضو غير فعال في هذه المبادرة';
  end if;

  if exists(
    select 1 from unnest(coalesce(p_student_ids,'{}'::uuid[])) x(student_id)
    left join public.students s on s.id=x.student_id
    left join public.school_members owner_m on owner_m.user_id=s.user_id and owner_m.school_id=sid and owner_m.member_status='active'
    where s.id is null or owner_m.id is null
  ) then
    raise exception 'يوجد طالب خارج نطاق المدرسة';
  end if;

  update public.initiative_student_assignments
    set active=false
  where initiative_id=p_initiative_id
    and initiative_member_id=p_initiative_member_id
    and active=true
    and student_id <> all(coalesce(p_student_ids,'{}'::uuid[]));

  insert into public.initiative_student_assignments(initiative_id,initiative_member_id,student_id,assigned_by,active)
  select p_initiative_id,p_initiative_member_id,x.student_id,auth.uid(),true
  from unnest(coalesce(p_student_ids,'{}'::uuid[])) x(student_id)
  on conflict(initiative_id,initiative_member_id,student_id)
  do update set active=true,assigned_by=auth.uid(),assigned_at=now();

  update public.initiative_student_assignments other
    set active=false
  where other.initiative_id=p_initiative_id
    and other.initiative_member_id<>p_initiative_member_id
    and other.student_id=any(coalesce(p_student_ids,'{}'::uuid[]))
    and other.active=true;
end $$;

create or replace function public.get_my_initiative_student_group(p_initiative_id uuid)
returns jsonb
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'assignment_id',a.id,
    'student_id',s.id,
    'full_name',s.full_name,
    'student_no',s.student_no,
    'stage',s.stage,
    'grade',s.grade,
    'classroom',s.classroom,
    'guardian_name',s.guardian_name,
    'guardian_phone',s.guardian_phone,
    'last_followup',(
      select jsonb_build_object(
        'id',f.id,'week_start',f.week_start,'attendance_status',f.attendance_status,
        'punctuality_status',f.punctuality_status,'behavior_status',f.behavior_status,
        'homework_status',f.homework_status,'academic_status',f.academic_status,
        'meeting_held',f.meeting_held,'family_contacted',f.family_contacted,
        'strengths',f.strengths,'concerns',f.concerns,'advice',f.advice,
        'next_action',f.next_action,'notes',f.notes,'updated_at',f.updated_at
      )
      from public.initiative_student_followups f
      where f.initiative_id=p_initiative_id and f.student_id=s.id
      order by f.week_start desc limit 1
    )
  ) order by s.full_name),'[]'::jsonb)
  from public.initiative_student_assignments a
  join public.initiative_members im on im.id=a.initiative_member_id
  join public.students s on s.id=a.student_id
  where a.initiative_id=p_initiative_id
    and a.active
    and im.user_id=auth.uid()
    and im.status='active';
$$;

create or replace function public.save_initiative_student_followup(
  p_initiative_id uuid,
  p_student_id uuid,
  p_week_start date,
  p_attendance_status text default null,
  p_punctuality_status text default null,
  p_behavior_status text default null,
  p_homework_status text default null,
  p_academic_status text default null,
  p_meeting_held boolean default false,
  p_family_contacted boolean default false,
  p_strengths text default null,
  p_concerns text default null,
  p_advice text default null,
  p_next_action text default null,
  p_notes text default null
) returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare imid uuid; fid uuid;
begin
  select im.id into imid
  from public.initiative_members im
  join public.initiative_student_assignments a on a.initiative_member_id=im.id
  where im.initiative_id=p_initiative_id
    and im.user_id=auth.uid()
    and im.status='active'
    and a.student_id=p_student_id
    and a.active
  limit 1;

  if imid is null then
    raise exception 'الطالب غير مسند لك في هذه المبادرة';
  end if;

  insert into public.initiative_student_followups(
    initiative_id,initiative_member_id,student_id,week_start,
    attendance_status,punctuality_status,behavior_status,homework_status,academic_status,
    meeting_held,family_contacted,strengths,concerns,advice,next_action,notes,created_by
  )
  values(
    p_initiative_id,imid,p_student_id,p_week_start,
    nullif(trim(coalesce(p_attendance_status,'')),''),
    nullif(trim(coalesce(p_punctuality_status,'')),''),
    nullif(trim(coalesce(p_behavior_status,'')),''),
    nullif(trim(coalesce(p_homework_status,'')),''),
    nullif(trim(coalesce(p_academic_status,'')),''),
    coalesce(p_meeting_held,false),coalesce(p_family_contacted,false),
    nullif(trim(coalesce(p_strengths,'')),''),
    nullif(trim(coalesce(p_concerns,'')),''),
    nullif(trim(coalesce(p_advice,'')),''),
    nullif(trim(coalesce(p_next_action,'')),''),
    nullif(trim(coalesce(p_notes,'')),''),
    auth.uid()
  )
  on conflict(initiative_id,student_id,week_start)
  do update set
    initiative_member_id=excluded.initiative_member_id,
    attendance_status=excluded.attendance_status,
    punctuality_status=excluded.punctuality_status,
    behavior_status=excluded.behavior_status,
    homework_status=excluded.homework_status,
    academic_status=excluded.academic_status,
    meeting_held=excluded.meeting_held,
    family_contacted=excluded.family_contacted,
    strengths=excluded.strengths,
    concerns=excluded.concerns,
    advice=excluded.advice,
    next_action=excluded.next_action,
    notes=excluded.notes,
    updated_at=now()
  returning id into fid;

  return fid;
end $$;

create or replace function public.get_initiative_followups(p_initiative_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
declare sid uuid;
begin
  select school_id into sid from public.initiatives where id=p_initiative_id;
  if sid is null then raise exception 'المبادرة غير موجودة'; end if;

  if not exists(select 1 from public.initiatives where id=p_initiative_id and created_by=auth.uid())
     and not exists(select 1 from public.school_members sm where sm.school_id=sid and sm.user_id=auth.uid() and sm.member_status='active' and sm.is_admin)
     and not exists(select 1 from public.initiative_members im where im.initiative_id=p_initiative_id and im.user_id=auth.uid() and im.status='active') then
    raise exception 'لا تملك صلاحية عرض المتابعة';
  end if;

  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id',f.id,'week_start',f.week_start,'student_id',s.id,'student_name',s.full_name,
      'member_id',im.id,'member_name',coalesce(sm.display_name,'عضو المبادرة'),'role_title',im.role_title,
      'attendance_status',f.attendance_status,'punctuality_status',f.punctuality_status,
      'behavior_status',f.behavior_status,'homework_status',f.homework_status,
      'academic_status',f.academic_status,'meeting_held',f.meeting_held,
      'family_contacted',f.family_contacted,'strengths',f.strengths,
      'concerns',f.concerns,'advice',f.advice,'next_action',f.next_action,
      'notes',f.notes,'updated_at',f.updated_at
    ) order by f.week_start desc,s.full_name),'[]'::jsonb)
    from public.initiative_student_followups f
    join public.students s on s.id=f.student_id
    join public.initiative_members im on im.id=f.initiative_member_id
    left join public.school_members sm on sm.id=im.school_member_id
    where f.initiative_id=p_initiative_id
      and (
        exists(select 1 from public.initiatives i where i.id=p_initiative_id and i.created_by=auth.uid())
        or exists(select 1 from public.school_members admin_m where admin_m.school_id=sid and admin_m.user_id=auth.uid() and admin_m.member_status='active' and admin_m.is_admin)
        or im.user_id=auth.uid()
      )
  );
end $$;

grant execute on function public.get_initiative_students(uuid) to authenticated;
grant execute on function public.assign_initiative_students(uuid,uuid,uuid[]) to authenticated;
grant execute on function public.get_my_initiative_student_group(uuid) to authenticated;
grant execute on function public.save_initiative_student_followup(uuid,uuid,date,text,text,text,text,text,boolean,boolean,text,text,text,text,text) to authenticated;
grant execute on function public.get_initiative_followups(uuid) to authenticated;
