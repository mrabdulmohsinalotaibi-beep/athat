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
      'can_view_dashboard', (
        i.created_by=auth.uid()
        or exists(select 1 from public.school_members sm where sm.school_id=i.school_id and sm.user_id=auth.uid() and sm.member_status='active' and (sm.is_admin or sm.role='counselor' or coalesce((sm.permissions->>'reports.view')::boolean,false)))
      ),
      'my_membership', (
        select jsonb_build_object('id',im.id,'role_title',im.role_title,'assigned_tasks',im.assigned_tasks,'status',im.status)
        from public.initiative_members im where im.initiative_id=i.id and im.user_id=auth.uid() limit 1
      ),
      'members', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id',im.id,'user_id',im.user_id,'school_member_id',im.school_member_id,
          'display_name',coalesce(sm.display_name,'عضو المبادرة'),'role_title',im.role_title,
          'assigned_tasks',im.assigned_tasks,'status',im.status,'joined_at',im.joined_at,
          'public_access_active',im.public_access_active,'public_access_expires_at',im.public_access_expires_at
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
       or exists(select 1 from public.initiative_members im where im.initiative_id=i.id and im.user_id=auth.uid() and im.status in ('pending','active'))
       or exists(
         select 1 from public.school_members sm
         where sm.school_id=i.school_id and sm.user_id=auth.uid() and sm.member_status='active'
           and (sm.is_admin or sm.role='counselor' or coalesce((sm.permissions->>'reports.view')::boolean,false))
       )
  ) q;
$$;
grant execute on function public.get_my_initiatives() to authenticated;