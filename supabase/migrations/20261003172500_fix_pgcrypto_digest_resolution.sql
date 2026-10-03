-- Fix pgcrypto function resolution for security-definer capability links.
-- pgcrypto is installed in the extensions schema, while these functions intentionally restrict search_path.

CREATE OR REPLACE FUNCTION public.add_public_initiative_file(p_token text, p_entry_id uuid, p_file_name text, p_mime_type text, p_data_url text, p_size_bytes integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare h text; im public.initiative_members%rowtype; fid uuid;
begin
  if coalesce(p_size_bytes,0)>4000000 then raise exception 'حجم الملف يتجاوز 4MB'; end if;
  if length(coalesce(p_data_url,''))>6000000 then raise exception 'الملف كبير جدًا'; end if;

  h:=encode(extensions.digest(trim(coalesce(p_token,'')),'sha256'),'hex');
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
end $function$;

CREATE OR REPLACE FUNCTION public.bind_claimed_school_invite(p_token text, p_device_secret text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare i public.school_invites%rowtype; h text; n text; mid uuid; rel text;
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول لربط الدعوة بالحساب'; end if;
  if char_length(trim(coalesce(p_device_secret,''))) < 24 then raise exception 'تعذر التحقق من الجهاز'; end if;
  h := encode(extensions.digest(trim(p_device_secret),'sha256'),'hex');
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
end $function$;

CREATE OR REPLACE FUNCTION public.claim_school_invite_device(p_token text, p_device_secret text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare i public.school_invites%rowtype; s public.schools%rowtype; h text; ok boolean; why text; ititle text; islogan text;
begin
  if char_length(trim(coalesce(p_device_secret,''))) < 24 then raise exception 'تعذر تأمين الدعوة على هذا الجهاز'; end if;
  h := encode(extensions.digest(trim(p_device_secret),'sha256'),'hex');
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
end $function$;

CREATE OR REPLACE FUNCTION public.create_initiative_public_link(p_initiative_member_id uuid, p_expires_days integer DEFAULT 30)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
  h:=encode(extensions.digest(tok,'sha256'),'hex');

  update public.initiative_members
  set public_access_token_hash=h,
      public_access_active=true,
      public_access_expires_at=case when coalesce(p_expires_days,30)<=0 then null else now()+make_interval(days=>least(p_expires_days,365)) end,
      public_access_last_used_at=null
  where id=p_initiative_member_id;

  return tok;
end $function$;

CREATE OR REPLACE FUNCTION public.create_public_initiative_view_link(p_initiative_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare sid uuid; tok text; h text;
begin
  select school_id into sid from public.initiatives where id=p_initiative_id;
  if sid is null then raise exception 'المبادرة غير موجودة'; end if;
  if not exists(select 1 from public.initiatives where id=p_initiative_id and created_by=auth.uid())
     and not exists(select 1 from public.school_members sm where sm.school_id=sid and sm.user_id=auth.uid() and sm.member_status='active' and sm.is_admin) then
    raise exception 'لا تملك صلاحية إنشاء رابط العرض العام';
  end if;

  tok:=lower(replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''));
  h:=encode(extensions.digest(tok,'sha256'),'hex');
  update public.initiatives
  set public_view_token_hash=h,public_view_active=true,public_view_created_at=now()
  where id=p_initiative_id;
  return tok;
end $function$;

CREATE OR REPLACE FUNCTION public.delete_public_initiative_entry(p_token text, p_entry_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare h text; mid uuid;
begin
  h:=encode(extensions.digest(trim(coalesce(p_token,'')),'sha256'),'hex');
  select id into mid from public.initiative_members
  where public_access_token_hash=h and public_access_active=true and status='active'
    and (public_access_expires_at is null or public_access_expires_at>now())
  limit 1;
  if mid is null then raise exception 'رابط العمل غير صالح أو منتهي'; end if;
  delete from public.initiative_public_entries where id=p_entry_id and initiative_member_id=mid;
end $function$;

CREATE OR REPLACE FUNCTION public.get_public_initiative_view(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare h text; i public.initiatives%rowtype; s public.schools%rowtype;
begin
  h:=encode(extensions.digest(trim(coalesce(p_token,'')),'sha256'),'hex');
  select * into i from public.initiatives where public_view_token_hash=h and public_view_active=true limit 1;
  if i.id is null then return jsonb_build_object('valid',false); end if;
  select * into s from public.schools where id=i.school_id;

  return jsonb_build_object(
    'valid',true,
    'school',jsonb_build_object('name',s.name,'education_dept',s.education_dept,'education_office',s.education_office),
    'initiative',jsonb_build_object(
      'title',i.title,'slogan',i.slogan,'idea',i.idea,'general_goal',i.general_goal,
      'objectives',i.objectives,'mechanism',i.mechanism,'expected_results',i.expected_results,
      'success_indicators',i.success_indicators,'status',i.status
    ),
    'team',coalesce((
      select jsonb_agg(jsonb_build_object(
        'display_name',coalesce(sm.display_name,'عضو المبادرة'),'role_title',im.role_title
      ) order by coalesce(sm.display_name,'عضو المبادرة'))
      from public.initiative_members im
      left join public.school_members sm on sm.id=im.school_member_id
      where im.initiative_id=i.id and im.status='active'
    ),'[]'::jsonb),
    'stats',jsonb_build_object(
      'members',(select count(*) from public.initiative_members where initiative_id=i.id and status='active'),
      'students',(select count(distinct student_id) from public.initiative_student_assignments where initiative_id=i.id and active),
      'entries',(select count(*) from public.initiative_public_entries where initiative_id=i.id),
      'evidences',(select count(*) from public.initiative_public_files where initiative_id=i.id),
      'avg_progress',coalesce((select round(avg(progress_percent)::numeric,1) from public.initiative_public_entries where initiative_id=i.id and progress_percent is not null),0)
    )
  );
end $function$;

CREATE OR REPLACE FUNCTION public.get_public_initiative_workspace(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare h text; im public.initiative_members%rowtype; i public.initiatives%rowtype; s public.schools%rowtype;
begin
  h:=encode(extensions.digest(trim(coalesce(p_token,'')),'sha256'),'hex');
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
end $function$;

CREATE OR REPLACE FUNCTION public.save_public_initiative_entry(p_token text, p_entry_id uuid DEFAULT NULL::uuid, p_entry_type text DEFAULT 'note'::text, p_title text DEFAULT ''::text, p_details text DEFAULT NULL::text, p_progress_percent integer DEFAULT NULL::integer, p_student_id uuid DEFAULT NULL::uuid, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare h text; im public.initiative_members%rowtype; eid uuid;
begin
  h:=encode(extensions.digest(trim(coalesce(p_token,'')),'sha256'),'hex');
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
end $function$;
