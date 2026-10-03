-- Initiative teams for ATHAT
create table if not exists public.initiatives (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  slogan text,
  idea text,
  general_goal text,
  objectives jsonb not null default '[]'::jsonb,
  mechanism jsonb not null default '[]'::jsonb,
  expected_results jsonb not null default '[]'::jsonb,
  success_indicators text,
  status text not null default 'active' check (status in ('draft','active','completed','archived')),
  starts_at date,
  ends_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.initiative_members (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references public.initiatives(id) on delete cascade,
  school_member_id uuid references public.school_members(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade,
  role_title text not null default 'عضو',
  assigned_tasks jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending','active','rejected','suspended')),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  unique(initiative_id,user_id)
);

create table if not exists public.initiative_updates (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references public.initiatives(id) on delete cascade,
  member_id uuid references public.initiative_members(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  update_type text not null default 'progress' check (update_type in ('progress','meeting','note','metric','evidence')),
  title text not null,
  details text,
  progress_percent int check (progress_percent between 0 and 100),
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists initiatives_school_idx on public.initiatives(school_id,created_at desc);
create index if not exists initiative_members_initiative_idx on public.initiative_members(initiative_id,status);
create index if not exists initiative_updates_initiative_idx on public.initiative_updates(initiative_id,created_at desc);

alter table public.school_invites
  add column if not exists initiative_id uuid references public.initiatives(id) on delete set null,
  add column if not exists initiative_role text,
  add column if not exists initiative_tasks jsonb not null default '[]'::jsonb;

alter table public.initiatives enable row level security;
alter table public.initiative_members enable row level security;
alter table public.initiative_updates enable row level security;

drop policy if exists initiatives_read on public.initiatives;
create policy initiatives_read on public.initiatives for select to authenticated using (
  created_by=auth.uid()
  or exists(select 1 from public.school_members sm where sm.school_id=initiatives.school_id and sm.user_id=auth.uid() and sm.member_status='active' and sm.is_admin)
  or exists(select 1 from public.initiative_members im where im.initiative_id=initiatives.id and im.user_id=auth.uid() and im.status='active')
);

drop policy if exists initiative_members_read on public.initiative_members;
create policy initiative_members_read on public.initiative_members for select to authenticated using (
  user_id=auth.uid()
  or exists(
    select 1 from public.initiatives i
    join public.school_members sm on sm.school_id=i.school_id
    where i.id=initiative_members.initiative_id and sm.user_id=auth.uid() and sm.member_status='active' and sm.is_admin
  )
);

drop policy if exists initiative_updates_read on public.initiative_updates;
create policy initiative_updates_read on public.initiative_updates for select to authenticated using (
  created_by=auth.uid()
  or exists(select 1 from public.initiative_members im where im.initiative_id=initiative_updates.initiative_id and im.user_id=auth.uid() and im.status='active')
  or exists(
    select 1 from public.initiatives i
    join public.school_members sm on sm.school_id=i.school_id
    where i.id=initiative_updates.initiative_id and sm.user_id=auth.uid() and sm.member_status='active' and sm.is_admin
  )
);

create or replace function public.create_initiative(
  p_title text,
  p_slogan text default null,
  p_idea text default null,
  p_general_goal text default null,
  p_objectives jsonb default '[]'::jsonb,
  p_mechanism jsonb default '[]'::jsonb,
  p_expected_results jsonb default '[]'::jsonb,
  p_success_indicators text default null,
  p_starts_at date default null,
  p_ends_at date default null
) returns uuid
language plpgsql security definer set search_path=public,pg_temp
as $$
declare sid uuid; iid uuid; mid uuid;
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;
  select school_id,id into sid,mid from public.school_members
  where user_id=auth.uid() and member_status='active'
  order by is_admin desc, created_at limit 1;
  if sid is null then raise exception 'الحساب غير مرتبط بمدرسة فعالة'; end if;
  if not exists(select 1 from public.school_members where id=mid and (is_admin or coalesce((permissions->>'programs.edit')::boolean,false) or role in ('principal','vice_principal','counselor'))) then
    raise exception 'لا تملك صلاحية إنشاء مبادرة';
  end if;

  insert into public.initiatives(school_id,created_by,title,slogan,idea,general_goal,objectives,mechanism,expected_results,success_indicators,starts_at,ends_at)
  values(sid,auth.uid(),trim(p_title),nullif(trim(coalesce(p_slogan,'')),''),nullif(trim(coalesce(p_idea,'')),''),nullif(trim(coalesce(p_general_goal,'')),''),
    coalesce(p_objectives,'[]'::jsonb),coalesce(p_mechanism,'[]'::jsonb),coalesce(p_expected_results,'[]'::jsonb),
    nullif(trim(coalesce(p_success_indicators,'')),''),p_starts_at,p_ends_at)
  returning id into iid;

  insert into public.initiative_members(initiative_id,school_member_id,user_id,role_title,assigned_tasks,status,joined_at)
  values(iid,mid,auth.uid(),'قائد المبادرة','["إدارة المبادرة","متابعة الأعضاء","مراجعة النتائج"]'::jsonb,'active',now())
  on conflict(initiative_id,user_id) do nothing;
  return iid;
end $$;

create or replace function public.get_my_initiatives()
returns jsonb
language sql stable security definer set search_path=public,pg_temp
as $$
  select coalesce(jsonb_agg(obj order by (obj->>'created_at') desc),'[]'::jsonb)
  from (
    select jsonb_build_object(
      'id',i.id,'school_id',i.school_id,'title',i.title,'slogan',i.slogan,'idea',i.idea,
      'general_goal',i.general_goal,'objectives',i.objectives,'mechanism',i.mechanism,
      'expected_results',i.expected_results,'success_indicators',i.success_indicators,
      'status',i.status,'starts_at',i.starts_at,'ends_at',i.ends_at,'created_at',i.created_at,
      'is_manager', (
        i.created_by=auth.uid() or exists(select 1 from public.school_members sm where sm.school_id=i.school_id and sm.user_id=auth.uid() and sm.member_status='active' and sm.is_admin)
      ),
      'my_membership', (
        select jsonb_build_object('id',im.id,'role_title',im.role_title,'assigned_tasks',im.assigned_tasks,'status',im.status)
        from public.initiative_members im where im.initiative_id=i.id and im.user_id=auth.uid() limit 1
      ),
      'members', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id',im.id,'user_id',im.user_id,'school_member_id',im.school_member_id,
          'display_name',coalesce(sm.display_name,'عضو المبادرة'),'role_title',im.role_title,
          'assigned_tasks',im.assigned_tasks,'status',im.status,'joined_at',im.joined_at
        ) order by im.created_at)
        from public.initiative_members im
        left join public.school_members sm on sm.id=im.school_member_id
        where im.initiative_id=i.id
      ),'[]'::jsonb),
      'updates', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id',u.id,'update_type',u.update_type,'title',u.title,'details',u.details,
          'progress_percent',u.progress_percent,'metrics',u.metrics,'created_at',u.created_at,
          'created_by_name',coalesce(sm2.display_name,'عضو الفريق')
        ) order by u.created_at desc)
        from public.initiative_updates u
        left join public.school_members sm2 on sm2.user_id=u.created_by and sm2.school_id=i.school_id
        where u.initiative_id=i.id
      ),'[]'::jsonb),
      'latest_progress', coalesce((select max(u.progress_percent) from public.initiative_updates u where u.initiative_id=i.id and u.progress_percent is not null),0)
    ) obj
    from public.initiatives i
    where i.created_by=auth.uid()
       or exists(select 1 from public.school_members sm where sm.school_id=i.school_id and sm.user_id=auth.uid() and sm.member_status='active' and sm.is_admin)
       or exists(select 1 from public.initiative_members im where im.initiative_id=i.id and im.user_id=auth.uid() and im.status in ('pending','active'))
  ) q;
$$;

create or replace function public.create_initiative_invite(
  p_initiative_id uuid,
  p_role_title text,
  p_tasks jsonb default '[]'::jsonb,
  p_school_role text default 'teacher',
  p_permissions jsonb default '{"dashboard.view":true,"students.view":true,"attendance.view":true,"messages.view":true,"messages.send":true}'::jsonb,
  p_data_scope jsonb default '{"type":"assigned"}'::jsonb,
  p_student_ids uuid[] default '{}'::uuid[],
  p_expires_days int default 7
) returns text
language plpgsql security definer set search_path=public,pg_temp
as $$
declare tok text; sid uuid;
begin
  select school_id into sid from public.initiatives where id=p_initiative_id;
  if sid is null then raise exception 'المبادرة غير موجودة'; end if;
  if not exists(select 1 from public.school_members where school_id=sid and user_id=auth.uid() and member_status='active' and is_admin)
     and not exists(select 1 from public.initiatives where id=p_initiative_id and created_by=auth.uid()) then
    raise exception 'لا تملك صلاحية دعوة أعضاء لهذه المبادرة';
  end if;

  tok := public.create_school_invite(
    p_role=>p_school_role,
    p_permissions=>coalesce(p_permissions,'{}'::jsonb),
    p_data_scope=>coalesce(p_data_scope,'{"type":"assigned"}'::jsonb),
    p_expires_days=>greatest(1,least(coalesce(p_expires_days,7),30)),
    p_max_uses=>1,
    p_student_ids=>coalesce(p_student_ids,'{}'::uuid[])
  );
  update public.school_invites set initiative_id=p_initiative_id, initiative_role=nullif(trim(coalesce(p_role_title,'')),''), initiative_tasks=coalesce(p_tasks,'[]'::jsonb)
  where token=tok;
  return tok;
end $$;

create or replace function public.set_initiative_member_status(p_member_id uuid,p_status text)
returns void language plpgsql security definer set search_path=public,pg_temp
as $$
declare iid uuid; sid uuid;
begin
  if p_status not in ('active','rejected','suspended') then raise exception 'حالة غير صالحة'; end if;
  select im.initiative_id,i.school_id into iid,sid from public.initiative_members im join public.initiatives i on i.id=im.initiative_id where im.id=p_member_id;
  if not exists(select 1 from public.school_members where school_id=sid and user_id=auth.uid() and member_status='active' and is_admin)
     and not exists(select 1 from public.initiatives where id=iid and created_by=auth.uid()) then
    raise exception 'لا تملك صلاحية إدارة الفريق';
  end if;
  update public.initiative_members set status=p_status, joined_at=case when p_status='active' then coalesce(joined_at,now()) else joined_at end where id=p_member_id;
end $$;

create or replace function public.add_initiative_update(
  p_initiative_id uuid,p_title text,p_details text default null,p_progress_percent int default null,
  p_update_type text default 'progress',p_metrics jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer set search_path=public,pg_temp
as $$
declare mid uuid; uid uuid;
begin
  uid:=auth.uid();
  select id into mid from public.initiative_members where initiative_id=p_initiative_id and user_id=uid and status='active';
  if mid is null and not exists(select 1 from public.initiatives i join public.school_members sm on sm.school_id=i.school_id where i.id=p_initiative_id and sm.user_id=uid and sm.member_status='active' and sm.is_admin) then
    raise exception 'أنت لست عضوًا فعالًا في هذه المبادرة';
  end if;
  insert into public.initiative_updates(initiative_id,member_id,created_by,update_type,title,details,progress_percent,metrics)
  values(p_initiative_id,mid,uid,coalesce(nullif(p_update_type,''),'progress'),trim(p_title),nullif(trim(coalesce(p_details,'')),''),p_progress_percent,coalesce(p_metrics,'{}'::jsonb))
  returning id into mid;
  return mid;
end $$;

-- Add initiative preview to one-device invitation flow.
create or replace function public.claim_school_invite_device(p_token text,p_device_secret text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $$
declare i public.school_invites%rowtype; s public.schools%rowtype; h text; ok boolean; why text; ititle text; islogan text;
begin
  if char_length(trim(coalesce(p_device_secret,''))) < 24 then raise exception 'تعذر تأمين الدعوة على هذا الجهاز'; end if;
  h := encode(digest(trim(p_device_secret),'sha256'),'hex');
  select * into i from public.school_invites where token=lower(trim(p_token)) for update;
  if i.id is null then return jsonb_build_object('valid',false,'reason','not_found'); end if;
  select * into s from public.schools where id=i.school_id;
  if i.initiative_id is not null then select title,slogan into ititle,islogan from public.initiatives where id=i.initiative_id; end if;

  if i.expires_at<=now() then ok:=false; why:='expired';
  elsif not i.active then ok:=false; why:='inactive';
  elsif i.device_secret_hash is null then
    update public.school_invites set device_secret_hash=h,device_claimed_at=now(),max_uses=1 where id=i.id;
    i.device_secret_hash:=h; i.device_claimed_at:=now(); i.max_uses:=1; ok:=true; why:='claimed_here';
  elsif i.device_secret_hash=h then ok:=true; why:=case when i.account_bound_at is null then 'claimed_here' else 'bound' end;
  else ok:=false; why:='claimed_other_device'; end if;

  return jsonb_build_object(
    'valid',ok,'reason',why,'device_bound',i.device_secret_hash=h,'account_bound',i.account_bound_at is not null,
    'school_name',s.name,'education_dept',s.education_dept,'education_office',s.education_office,
    'role',i.role,'permissions',i.permissions,'data_scope',i.data_scope,'linked_student_count',coalesce(array_length(i.student_ids,1),0),
    'expires_at',i.expires_at,'initiative_id',i.initiative_id,'initiative_title',ititle,'initiative_slogan',islogan,
    'initiative_role',i.initiative_role,'initiative_tasks',i.initiative_tasks
  );
end $$;

create or replace function public.bind_claimed_school_invite(p_token text,p_device_secret text)
returns uuid language plpgsql security definer set search_path=public,pg_temp
as $$
declare i public.school_invites%rowtype; h text; n text; mid uuid; rel text;
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول لربط الدعوة بالحساب'; end if;
  if char_length(trim(coalesce(p_device_secret,''))) < 24 then raise exception 'تعذر التحقق من الجهاز'; end if;
  h := encode(digest(trim(p_device_secret),'sha256'),'hex');
  select * into i from public.school_invites where token=lower(trim(p_token)) for update;
  if i.id is null then raise exception 'رابط الدعوة غير صالح'; end if;
  if i.expires_at<=now() then raise exception 'انتهت صلاحية رابط الدعوة'; end if;
  if not i.active then raise exception 'تم إلغاء رابط الدعوة'; end if;
  if i.device_secret_hash is null or i.device_secret_hash<>h then raise exception 'هذه الدعوة مرتبطة بجهاز آخر'; end if;
  if i.claimed_user_id is not null and i.claimed_user_id<>auth.uid() then raise exception 'تم ربط هذه الدعوة بحساب آخر'; end if;
  if exists(select 1 from public.school_members where user_id=auth.uid() and member_status='active' and school_id<>i.school_id) then raise exception 'الحساب مرتبط بمدرسة أخرى'; end if;

  select nullif(trim(full_name),'') into n from public.user_profiles where id=auth.uid();
  insert into public.school_members(school_id,user_id,display_name,role,member_status,is_admin,permissions,data_scope)
  values(i.school_id,auth.uid(),coalesce(n,'عضو مدرسة'),i.role,'pending',false,i.permissions,i.data_scope)
  on conflict(school_id,user_id) do update set
    display_name=coalesce(excluded.display_name,school_members.display_name),
    role=case when school_members.member_status='active' then school_members.role else excluded.role end,
    permissions=case when school_members.member_status='active' then school_members.permissions else excluded.permissions end,
    data_scope=case when school_members.member_status='active' then school_members.data_scope else excluded.data_scope end,
    member_status=case when school_members.member_status='active' then 'active' else 'pending' end,updated_at=now()
  returning id into mid;

  rel := case coalesce(i.data_scope->>'type','') when 'self' then 'self' when 'children' then 'child' else 'assigned' end;
  delete from public.school_member_student_links where member_id=mid;
  if coalesce(i.data_scope->>'type','') in ('assigned','self','children') then
    insert into public.school_member_student_links(school_id,member_id,student_id,relation)
    select i.school_id,mid,x.student_id,rel from unnest(coalesce(i.student_ids,'{}'::uuid[])) x(student_id)
    on conflict(member_id,student_id,relation) do nothing;
  end if;

  if i.initiative_id is not null then
    insert into public.initiative_members(initiative_id,school_member_id,user_id,role_title,assigned_tasks,status)
    values(i.initiative_id,mid,auth.uid(),coalesce(nullif(i.initiative_role,''),'عضو المبادرة'),coalesce(i.initiative_tasks,'[]'::jsonb),'pending')
    on conflict(initiative_id,user_id) do update set school_member_id=excluded.school_member_id,role_title=excluded.role_title,assigned_tasks=excluded.assigned_tasks,
      status=case when initiative_members.status='active' then 'active' else 'pending' end;
  end if;

  update public.school_invites set claimed_user_id=auth.uid(),account_bound_at=coalesce(account_bound_at,now()),used_count=1,max_uses=1 where id=i.id;
  return mid;
end $$;

revoke all on function public.create_initiative(text,text,text,text,jsonb,jsonb,jsonb,text,date,date) from public;
revoke all on function public.get_my_initiatives() from public;
revoke all on function public.create_initiative_invite(uuid,text,jsonb,text,jsonb,jsonb,uuid[],int) from public;
revoke all on function public.set_initiative_member_status(uuid,text) from public;
revoke all on function public.add_initiative_update(uuid,text,text,int,text,jsonb) from public;
grant execute on function public.create_initiative(text,text,text,text,jsonb,jsonb,jsonb,text,date,date) to authenticated;
grant execute on function public.get_my_initiatives() to authenticated;
grant execute on function public.create_initiative_invite(uuid,text,jsonb,text,jsonb,jsonb,uuid[],int) to authenticated;
grant execute on function public.set_initiative_member_status(uuid,text) to authenticated;
grant execute on function public.add_initiative_update(uuid,text,text,int,text,jsonb) to authenticated;
grant execute on function public.claim_school_invite_device(text,text) to anon,authenticated;
grant execute on function public.bind_claimed_school_invite(text,text) to authenticated;
