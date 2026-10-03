-- Public initiative capability links and scoped public workspace.
alter table public.initiative_members
  add column if not exists public_access_token_hash text,
  add column if not exists public_access_active boolean not null default false,
  add column if not exists public_access_expires_at timestamptz,
  add column if not exists public_access_last_used_at timestamptz;

create table if not exists public.initiative_public_entries (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references public.initiatives(id) on delete cascade,
  initiative_member_id uuid not null references public.initiative_members(id) on delete cascade,
  entry_type text not null default 'note' check (entry_type in ('note','progress','meeting','student_followup','evidence')),
  title text not null,
  details text,
  progress_percent int check (progress_percent between 0 and 100),
  student_id uuid references public.students(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.initiative_public_files (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references public.initiatives(id) on delete cascade,
  initiative_member_id uuid not null references public.initiative_members(id) on delete cascade,
  entry_id uuid references public.initiative_public_entries(id) on delete cascade,
  file_name text not null,
  mime_type text not null,
  data_url text not null,
  size_bytes int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists initiative_public_entries_idx on public.initiative_public_entries(initiative_id,created_at desc);
create index if not exists initiative_public_files_idx on public.initiative_public_files(initiative_id,created_at desc);

alter table public.initiative_public_entries enable row level security;
alter table public.initiative_public_files enable row level security;

drop policy if exists initiative_public_entries_internal_read on public.initiative_public_entries;
create policy initiative_public_entries_internal_read on public.initiative_public_entries
for select to authenticated using (
  exists(select 1 from public.initiatives i where i.id=initiative_public_entries.initiative_id and i.created_by=auth.uid())
  or exists(select 1 from public.initiative_members im where im.initiative_id=initiative_public_entries.initiative_id and im.user_id=auth.uid() and im.status='active')
  or exists(
    select 1 from public.initiatives i
    join public.school_members sm on sm.school_id=i.school_id
    where i.id=initiative_public_entries.initiative_id and sm.user_id=auth.uid() and sm.member_status='active' and sm.is_admin
  )
);

drop policy if exists initiative_public_files_internal_read on public.initiative_public_files;
create policy initiative_public_files_internal_read on public.initiative_public_files
for select to authenticated using (
  exists(select 1 from public.initiatives i where i.id=initiative_public_files.initiative_id and i.created_by=auth.uid())
  or exists(select 1 from public.initiative_members im where im.initiative_id=initiative_public_files.initiative_id and im.user_id=auth.uid() and im.status='active')
  or exists(
    select 1 from public.initiatives i
    join public.school_members sm on sm.school_id=i.school_id
    where i.id=initiative_public_files.initiative_id and sm.user_id=auth.uid() and sm.member_status='active' and sm.is_admin
  )
);

create or replace function public.create_initiative_public_link(
  p_initiative_member_id uuid,
  p_expires_days int default 30
) returns text
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare iid uuid; sid uuid; tok text; h text;
begin
  select im.initiative_id,i.school_id into iid,sid
  from public.initiative_members im join public.initiatives i on i.id=im.initiative_id
  where im.id=p_initiative_member_id;
  if iid is null then raise exception 'عضو المبادرة غير موجود'; end if;

  if not exists(select 1 from public.initiatives where id=iid and created_by=auth.uid())
     and not exists(select 1 from public.school_members sm where sm.school_id=sid and sm.user_id=auth.uid() and sm.member_status='active' and sm.is_admin) then
    raise exception 'لا تملك صلاحية إنشاء رابط العمل العام';
  end if;

  tok:=lower(replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''));
  h:=encode(digest(tok,'sha256'),'hex');

  update public.initiative_members
  set public_access_token_hash=h,
      public_access_active=true,
      public_access_expires_at=case when coalesce(p_expires_days,30)<=0 then null else now()+make_interval(days=>least(p_expires_days,365)) end,
      public_access_last_used_at=null
  where id=p_initiative_member_id;

  return tok;
end $$;

create or replace function public.revoke_initiative_public_link(p_initiative_member_id uuid)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare iid uuid; sid uuid;
begin
  select im.initiative_id,i.school_id into iid,sid
  from public.initiative_members im join public.initiatives i on i.id=im.initiative_id
  where im.id=p_initiative_member_id;

  if not exists(select 1 from public.initiatives where id=iid and created_by=auth.uid())
     and not exists(select 1 from public.school_members sm where sm.school_id=sid and sm.user_id=auth.uid() and sm.member_status='active' and sm.is_admin) then
    raise exception 'لا تملك صلاحية إلغاء الرابط';
  end if;

  update public.initiative_members set public_access_active=false where id=p_initiative_member_id;
end $$;

create or replace function public.get_public_initiative_workspace(p_token text)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare h text; im public.initiative_members%rowtype; i public.initiatives%rowtype; s public.schools%rowtype;
begin
  h:=encode(digest(trim(coalesce(p_token,'')),'sha256'),'hex');
  select * into im from public.initiative_members
  where public_access_token_hash=h and public_access_active=true
    and status='active'
    and (public_access_expires_at is null or public_access_expires_at>now())
  limit 1;

  if im.id is null then return jsonb_build_object('valid',false); end if;
  select * into i from public.initiatives where id=im.initiative_id;
  select * into s from public.schools where id=i.school_id;

  update public.initiative_members set public_access_last_used_at=now() where id=im.id;

  return jsonb_build_object(
    'valid',true,
    'initiative',jsonb_build_object(
      'id',i.id,'title',i.title,'slogan',i.slogan,'idea',i.idea,'general_goal',i.general_goal,
      'objectives',i.objectives,'mechanism',i.mechanism,'expected_results',i.expected_results,
      'success_indicators',i.success_indicators,'status',i.status
    ),
    'school',jsonb_build_object('name',s.name,'education_dept',s.education_dept,'education_office',s.education_office),
    'member',jsonb_build_object(
      'id',im.id,'role_title',im.role_title,'assigned_tasks',im.assigned_tasks,
      'display_name',coalesce((select sm.display_name from public.school_members sm where sm.id=im.school_member_id),'عضو المبادرة')
    ),
    'students',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',st.id,'full_name',st.full_name,'student_no',st.student_no,'stage',st.stage,'grade',st.grade,'classroom',st.classroom
      ) order by st.full_name)
      from public.initiative_student_assignments a
      join public.students st on st.id=a.student_id
      where a.initiative_member_id=im.id and a.active
    ),'[]'::jsonb),
    'entries',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',e.id,'entry_type',e.entry_type,'title',e.title,'details',e.details,'progress_percent',e.progress_percent,
        'student_id',e.student_id,'payload',e.payload,'created_at',e.created_at,'updated_at',e.updated_at,
        'files',coalesce((
          select jsonb_agg(jsonb_build_object('id',f.id,'file_name',f.file_name,'mime_type',f.mime_type,'data_url',f.data_url,'size_bytes',f.size_bytes))
          from public.initiative_public_files f where f.entry_id=e.id
        ),'[]'::jsonb)
      ) order by e.created_at desc)
      from public.initiative_public_entries e where e.initiative_member_id=im.id
    ),'[]'::jsonb)
  );
end $$;

create or replace function public.save_public_initiative_entry(
  p_token text,
  p_entry_id uuid default null,
  p_entry_type text default 'note',
  p_title text default '',
  p_details text default null,
  p_progress_percent int default null,
  p_student_id uuid default null,
  p_payload jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare h text; im public.initiative_members%rowtype; eid uuid;
begin
  h:=encode(digest(trim(coalesce(p_token,'')),'sha256'),'hex');
  select * into im from public.initiative_members
  where public_access_token_hash=h and public_access_active=true and status='active'
    and (public_access_expires_at is null or public_access_expires_at>now())
  limit 1;
  if im.id is null then raise exception 'رابط العمل غير صالح أو منتهي'; end if;
  if p_entry_type not in ('note','progress','meeting','student_followup','evidence') then raise exception 'نوع السجل غير صالح'; end if;
  if p_student_id is not null and not exists(
    select 1 from public.initiative_student_assignments a
    where a.initiative_member_id=im.id and a.student_id=p_student_id and a.active
  ) then raise exception 'الطالب ليس ضمن نطاق هذا العضو'; end if;

  if p_entry_id is null then
    insert into public.initiative_public_entries(initiative_id,initiative_member_id,entry_type,title,details,progress_percent,student_id,payload)
    values(im.initiative_id,im.id,p_entry_type,trim(p_title),nullif(trim(coalesce(p_details,'')),''),p_progress_percent,p_student_id,coalesce(p_payload,'{}'::jsonb))
    returning id into eid;
  else
    update public.initiative_public_entries
      set entry_type=p_entry_type,title=trim(p_title),details=nullif(trim(coalesce(p_details,'')),''),
          progress_percent=p_progress_percent,student_id=p_student_id,payload=coalesce(p_payload,'{}'::jsonb),updated_at=now()
    where id=p_entry_id and initiative_member_id=im.id
    returning id into eid;
    if eid is null then raise exception 'لا يمكن تعديل هذا السجل'; end if;
  end if;

  update public.initiative_members set public_access_last_used_at=now() where id=im.id;
  return eid;
end $$;

create or replace function public.delete_public_initiative_entry(p_token text,p_entry_id uuid)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare h text; mid uuid;
begin
  h:=encode(digest(trim(coalesce(p_token,'')),'sha256'),'hex');
  select id into mid from public.initiative_members
  where public_access_token_hash=h and public_access_active=true and status='active'
    and (public_access_expires_at is null or public_access_expires_at>now())
  limit 1;
  if mid is null then raise exception 'رابط العمل غير صالح أو منتهي'; end if;
  delete from public.initiative_public_entries where id=p_entry_id and initiative_member_id=mid;
end $$;

create or replace function public.add_public_initiative_file(
  p_token text,p_entry_id uuid,p_file_name text,p_mime_type text,p_data_url text,p_size_bytes int
) returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare h text; im public.initiative_members%rowtype; fid uuid;
begin
  if coalesce(p_size_bytes,0)>4000000 then raise exception 'حجم الملف يتجاوز 4MB'; end if;
  if length(coalesce(p_data_url,''))>6000000 then raise exception 'الملف كبير جدًا'; end if;

  h:=encode(digest(trim(coalesce(p_token,'')),'sha256'),'hex');
  select * into im from public.initiative_members
  where public_access_token_hash=h and public_access_active=true and status='active'
    and (public_access_expires_at is null or public_access_expires_at>now())
  limit 1;
  if im.id is null then raise exception 'رابط العمل غير صالح أو منتهي'; end if;
  if not exists(select 1 from public.initiative_public_entries where id=p_entry_id and initiative_member_id=im.id) then
    raise exception 'السجل غير صالح';
  end if;

  insert into public.initiative_public_files(initiative_id,initiative_member_id,entry_id,file_name,mime_type,data_url,size_bytes)
  values(im.initiative_id,im.id,p_entry_id,trim(p_file_name),trim(p_mime_type),p_data_url,coalesce(p_size_bytes,0))
  returning id into fid;
  return fid;
end $$;

create or replace function public.get_initiative_dashboard(p_initiative_id uuid)
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
     and not exists(select 1 from public.school_members sm where sm.school_id=sid and sm.user_id=auth.uid() and sm.member_status='active' and (sm.is_admin or sm.role='counselor' or coalesce((sm.permissions->>'reports.view')::boolean,false))) then
    raise exception 'لا تملك صلاحية لوحة المبادرة';
  end if;

  return jsonb_build_object(
    'members_total',(select count(*) from public.initiative_members where initiative_id=p_initiative_id and status='active'),
    'students_total',(select count(distinct student_id) from public.initiative_student_assignments where initiative_id=p_initiative_id and active),
    'followups_total',(select count(*) from public.initiative_student_followups where initiative_id=p_initiative_id),
    'public_entries_total',(select count(*) from public.initiative_public_entries where initiative_id=p_initiative_id),
    'files_total',(select count(*) from public.initiative_public_files where initiative_id=p_initiative_id),
    'avg_progress',coalesce((select round(avg(progress_percent)::numeric,1) from public.initiative_public_entries where initiative_id=p_initiative_id and progress_percent is not null),0),
    'members',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',im.id,'display_name',coalesce(sm.display_name,'عضو المبادرة'),'role_title',im.role_title,'status',im.status,
        'student_count',(select count(*) from public.initiative_student_assignments a where a.initiative_member_id=im.id and a.active),
        'entry_count',(select count(*) from public.initiative_public_entries e where e.initiative_member_id=im.id),
        'file_count',(select count(*) from public.initiative_public_files f where f.initiative_member_id=im.id),
        'last_activity',greatest(im.public_access_last_used_at,(select max(e.updated_at) from public.initiative_public_entries e where e.initiative_member_id=im.id)),
        'public_link_active',im.public_access_active,
        'public_link_expires_at',im.public_access_expires_at
      ) order by coalesce(sm.display_name,'عضو المبادرة'))
      from public.initiative_members im left join public.school_members sm on sm.id=im.school_member_id
      where im.initiative_id=p_initiative_id
    ),'[]'::jsonb),
    'recent_entries',coalesce((
      select jsonb_agg(x) from (
        select jsonb_build_object(
          'id',e.id,'member_name',coalesce(sm.display_name,'عضو المبادرة'),'role_title',im.role_title,
          'entry_type',e.entry_type,'title',e.title,'details',e.details,'progress_percent',e.progress_percent,
          'student_name',st.full_name,'created_at',e.created_at,'updated_at',e.updated_at,
          'files_count',(select count(*) from public.initiative_public_files f where f.entry_id=e.id)
        ) x
        from public.initiative_public_entries e
        join public.initiative_members im on im.id=e.initiative_member_id
        left join public.school_members sm on sm.id=im.school_member_id
        left join public.students st on st.id=e.student_id
        where e.initiative_id=p_initiative_id
        order by e.updated_at desc limit 100
      ) q
    ),'[]'::jsonb)
  );
end $$;

revoke all on function public.get_public_initiative_workspace(text) from public;
revoke all on function public.save_public_initiative_entry(text,uuid,text,text,text,int,uuid,jsonb) from public;
revoke all on function public.delete_public_initiative_entry(text,uuid) from public;
revoke all on function public.add_public_initiative_file(text,uuid,text,text,text,int) from public;
grant execute on function public.get_public_initiative_workspace(text) to anon,authenticated;
grant execute on function public.save_public_initiative_entry(text,uuid,text,text,text,int,uuid,jsonb) to anon,authenticated;
grant execute on function public.delete_public_initiative_entry(text,uuid) to anon,authenticated;
grant execute on function public.add_public_initiative_file(text,uuid,text,text,text,int) to anon,authenticated;
grant execute on function public.create_initiative_public_link(uuid,int) to authenticated;
grant execute on function public.revoke_initiative_public_link(uuid) to authenticated;
grant execute on function public.get_initiative_dashboard(uuid) to authenticated;
