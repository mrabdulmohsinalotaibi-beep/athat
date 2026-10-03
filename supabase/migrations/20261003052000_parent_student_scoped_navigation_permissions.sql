-- Allow student and parent roles to view only the student records already scoped to them.

create or replace function public.default_school_permissions(p_role text)
returns jsonb
language sql
immutable
as $$
  select case p_role
    when 'principal' then '{
      "dashboard.view":true,"team.view":true,"team.manage":true,
      "tasks.view":true,"tasks.manage":true,
      "reports.view":true,"reports.create":true,"reports.approve":true,
      "messages.view":true,"messages.send":true,
      "documents.view":true,"documents.edit":true,
      "settings.view":true,"settings.edit":true
    }'::jsonb
    when 'vice_principal' then '{
      "dashboard.view":true,"team.view":true,"team.manage":true,
      "tasks.view":true,"tasks.manage":true,
      "reports.view":true,"reports.create":true,"reports.approve":true,
      "messages.view":true,"messages.send":true,
      "documents.view":true,"documents.edit":true,
      "settings.view":true
    }'::jsonb
    when 'counselor' then '{
      "dashboard.view":true,"team.view":true,
      "tasks.view":true,"tasks.manage":true,
      "reports.view":true,"reports.create":true,
      "messages.view":true,"messages.send":true,
      "documents.view":true,"documents.edit":true,
      "students.view":true,"students.edit":true,
      "programs.view":true,"programs.edit":true,
      "cases.view":true,"cases.edit":true,
      "interviews.view":true,"interviews.edit":true,
      "attendance.view":true,"attendance.edit":true,
      "referrals.view":true,"referrals.edit":true,
      "posts.view":true,"posts.edit":true,
      "guidance.full":true
    }'::jsonb
    when 'teacher' then '{
      "dashboard.view":true,"team.view":true,
      "tasks.view":true,
      "messages.view":true,"messages.send":true,
      "students.view":true,"referrals.view":true,"referrals.edit":true
    }'::jsonb
    when 'admin_staff' then '{
      "dashboard.view":true,"team.view":true,
      "tasks.view":true,
      "messages.view":true,"messages.send":true,
      "documents.view":true
    }'::jsonb
    when 'guard' then '{
      "dashboard.view":true,"tasks.view":true,"messages.view":true
    }'::jsonb
    when 'observer' then '{
      "dashboard.view":true,"team.view":true,"tasks.view":true,"reports.view":true
    }'::jsonb
    when 'student' then '{
      "dashboard.view":true,"students.view":true,"messages.view":true,"documents.view":true
    }'::jsonb
    when 'parent' then '{
      "dashboard.view":true,"students.view":true,"messages.view":true,"documents.view":true
    }'::jsonb
    else '{}'::jsonb
  end;
$$;
