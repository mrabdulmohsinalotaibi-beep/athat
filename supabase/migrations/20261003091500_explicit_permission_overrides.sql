-- Make per-member permission toggles authoritative:
-- explicit false removes a role-default permission, while group grants remain additive.

create or replace function public.member_has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select
    auth.uid() is not null
    and (
      not exists(select 1 from public.school_members where user_id=auth.uid())
      or exists(
        select 1
        from public.school_members m
        where m.user_id=auth.uid()
          and m.member_status='active'
          and (m.access_expires_at is null or m.access_expires_at>now())
          and (
            exists(
              select 1
              from public.school_permission_group_members gm
              join public.school_permission_groups g on g.id=gm.group_id
              where gm.member_id=m.id
                and g.school_id=m.school_id
                and coalesce((g.permissions->>p_permission)::boolean,false)
            )
            or case
              when m.permissions ? p_permission
                then coalesce((m.permissions->>p_permission)::boolean,false)
              else coalesce((public.default_school_permissions(m.role)->>p_permission)::boolean,false)
            end
          )
      )
    );
$$;

revoke all on function public.member_has_permission(text) from public;
grant execute on function public.member_has_permission(text) to authenticated;
