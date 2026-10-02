alter table public.free_documents
  add column if not exists document_kind text not null default 'free',
  add column if not exists template_id text,
  add column if not exists student_id uuid references public.students(id) on delete set null,
  add column if not exists student_name text,
  add column if not exists student_no text,
  add column if not exists grade text,
  add column if not exists classroom text,
  add column if not exists form_values jsonb not null default '{}'::jsonb;

create index if not exists free_documents_student_idx
  on public.free_documents(user_id, student_id, updated_at desc);

create index if not exists free_documents_kind_idx
  on public.free_documents(user_id, document_kind, updated_at desc);
