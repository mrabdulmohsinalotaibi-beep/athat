alter table public.initiatives
  add column if not exists public_view_token_hash text,
  add column if not exists public_view_active boolean not null default false,
  add column if not exists public_view_created_at timestamptz;

create or replace function public.create_public_initiative_view_link(p_initiative_id uuid)
returns text
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare sid uuid; tok text; h text;
begin
  select school_id into sid from public.initiatives where id=p_initiative_id;
  if sid is null then raise exception 'المبادرة غير موجودة'; end if;
  if not exists(select 1 from public.initiatives where id=p_initiative_id and created_by=auth.uid())
     and not exists(select 1 from public.school_members sm where sm.school_id=sid and sm.user_id=auth.uid() and sm.member_status='active' and sm.is_admin) then
    raise exception 'لا تملك صلاحية إنشاء رابط العرض العام';
  end if;

  tok:=lower(replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''));
  h:=encode(digest(tok,'sha256'),'hex');
  update public.initiatives
  set public_view_token_hash=h,public_view_active=true,public_view_created_at=now()
  where id=p_initiative_id;
  return tok;
end $$;

create or replace function public.revoke_public_initiative_view_link(p_initiative_id uuid)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare sid uuid;
begin
  select school_id into sid from public.initiatives where id=p_initiative_id;
  if not exists(select 1 from public.initiatives where id=p_initiative_id and created_by=auth.uid())
     and not exists(select 1 from public.school_members sm where sm.school_id=sid and sm.user_id=auth.uid() and sm.member_status='active' and sm.is_admin) then
    raise exception 'لا تملك صلاحية إلغاء رابط العرض العام';
  end if;
  update public.initiatives set public_view_active=false where id=p_initiative_id;
end $$;

create or replace function public.get_public_initiative_view(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
declare h text; i public.initiatives%rowtype; s public.schools%rowtype;
begin
  h:=encode(digest(trim(coalesce(p_token,'')),'sha256'),'hex');
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
end $$;

revoke all on function public.get_public_initiative_view(text) from public;
grant execute on function public.get_public_initiative_view(text) to anon,authenticated;
grant execute on function public.create_public_initiative_view_link(uuid) to authenticated;
grant execute on function public.revoke_public_initiative_view_link(uuid) to authenticated;