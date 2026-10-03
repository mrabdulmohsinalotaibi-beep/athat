-- Let school members create their own permitted documents without weakening shared-record editing.
-- This fixes electronic-template saves for roles that have documents.view but not documents.edit.

drop policy if exists free_documents_permission_insert_gate on public.free_documents;
create policy free_documents_permission_insert_gate
on public.free_documents as restrictive
for insert to authenticated
with check (
  user_id=auth.uid()
  and (
    public.member_has_permission('documents.edit')
    or public.member_has_permission('documents.view')
  )
);

-- Owners may update/delete their own document when they can view documents.
-- Shared documents belonging to another school member still require documents.edit.
drop policy if exists free_documents_permission_update_gate on public.free_documents;
create policy free_documents_permission_update_gate
on public.free_documents as restrictive
for update to authenticated
using (
  (user_id=auth.uid() and public.member_has_permission('documents.view'))
  or public.member_has_permission('documents.edit')
)
with check (
  (user_id=auth.uid() and public.member_has_permission('documents.view'))
  or public.member_has_permission('documents.edit')
);

drop policy if exists free_documents_permission_delete_gate on public.free_documents;
create policy free_documents_permission_delete_gate
on public.free_documents as restrictive
for delete to authenticated
using (
  (user_id=auth.uid() and public.member_has_permission('documents.view'))
  or public.member_has_permission('documents.edit')
);
