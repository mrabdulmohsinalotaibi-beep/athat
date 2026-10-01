create table if not exists public.free_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default 'مستند جديد',
  document_no text,
  content text not null default '',
  status text not null default 'مسودة' check (status in ('مسودة','نهائي')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.free_documents enable row level security;
drop policy if exists "free_documents_owner_all" on public.free_documents;
create policy "free_documents_owner_all" on public.free_documents for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());
create index if not exists free_documents_user_updated_idx on public.free_documents(user_id, updated_at desc);
grant select, insert, update, delete on public.free_documents to authenticated;
