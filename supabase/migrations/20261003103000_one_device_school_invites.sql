alter table public.school_invites
  add column if not exists device_secret_hash text,
  add column if not exists device_claimed_at timestamptz,
  add column if not exists claimed_user_id uuid,
  add column if not exists account_bound_at timestamptz;

create or replace function public.claim_school_invite_device(p_token text,p_device_secret text)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  i public.school_invites%rowtype;
  s public.schools%rowtype;
  h text;
  ok boolean;
  why text;
begin
  if char_length(trim(coalesce(p_device_secret,''))) < 24 then raise exception 'تعذر تأمين الدعوة على هذا الجهاز'; end if;
  h := encode(digest(trim(p_device_secret),'sha256'),'hex');

  select * into i from public.school_invites where token=lower(trim(p_token)) for update;
  if i.id is null then return jsonb_build_object('valid',false,'reason','not_found'); end if;
  select * into s from public.schools where id=i.school_id;

  if i.expires_at<=now() then ok:=false; why:='expired';
  elsif not i.active then ok:=false; why:='inactive';
  elsif i.device_secret_hash is null then
    update public.school_invites
      set device_secret_hash=h,device_claimed_at=now(),max_uses=1
      where id=i.id;
    i.device_secret_hash:=h; i.device_claimed_at:=now(); i.max_uses:=1;
    ok:=true; why:='claimed_here';
  elsif i.device_secret_hash=h then
    ok:=true; why:=case when i.account_bound_at is null then 'claimed_here' else 'bound' end;
  else
    ok:=false; why:='claimed_other_device';
  end if;

  return jsonb_build_object(
    'valid',ok,'reason',why,'device_bound',i.device_secret_hash=h,
    'account_bound',i.account_bound_at is not null,
    'school_name',s.name,'education_dept',s.education_dept,'education_office',s.education_office,
    'role',i.role,'permissions',i.permissions,'data_scope',i.data_scope,
    'linked_student_count',coalesce(array_length(i.student_ids,1),0),'expires_at',i.expires_at
  );
end;
$$;

create or replace function public.bind_claimed_school_invite(p_token text,p_device_secret text)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  i public.school_invites%rowtype;
  h text;
  n text;
  mid uuid;
  rel text;
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

  if exists(select 1 from public.school_members where user_id=auth.uid() and member_status='active' and school_id<>i.school_id)
  then raise exception 'الحساب مرتبط بمدرسة أخرى'; end if;

  select nullif(trim(full_name),'') into n from public.user_profiles where id=auth.uid();

  insert into public.school_members(school_id,user_id,display_name,role,member_status,is_admin,permissions,data_scope)
  values(i.school_id,auth.uid(),coalesce(n,'عضو مدرسة'),i.role,'pending',false,i.permissions,i.data_scope)
  on conflict(school_id,user_id) do update
    set display_name=coalesce(excluded.display_name,school_members.display_name),
        role=case when school_members.member_status='active' then school_members.role else excluded.role end,
        permissions=case when school_members.member_status='active' then school_members.permissions else excluded.permissions end,
        data_scope=case when school_members.member_status='active' then school_members.data_scope else excluded.data_scope end,
        member_status=case when school_members.member_status='active' then 'active' else 'pending' end,
        updated_at=now()
  returning id into mid;

  rel := case coalesce(i.data_scope->>'type','') when 'self' then 'self' when 'children' then 'child' else 'assigned' end;
  delete from public.school_member_student_links where member_id=mid;
  if coalesce(i.data_scope->>'type','') in ('assigned','self','children') then
    insert into public.school_member_student_links(school_id,member_id,student_id,relation)
    select i.school_id,mid,x.student_id,rel
    from unnest(coalesce(i.student_ids,'{}'::uuid[])) x(student_id)
    on conflict(member_id,student_id,relation) do nothing;
  end if;

  update public.school_invites
    set claimed_user_id=auth.uid(),account_bound_at=coalesce(account_bound_at,now()),used_count=1,max_uses=1
    where id=i.id;
  return mid;
end;
$$;

revoke all on function public.claim_school_invite_device(text,text) from public;
revoke all on function public.bind_claimed_school_invite(text,text) from public;
grant execute on function public.claim_school_invite_device(text,text) to anon,authenticated;
grant execute on function public.bind_claimed_school_invite(text,text) to authenticated;