-- 거래명세서 첨부파일 업로드 지원
alter table transactions add column attachment_url text;
alter table transactions add column attachment_name text;

insert into storage.buckets (id, name, public)
values ('transaction-files', 'transaction-files', true)
on conflict (id) do nothing;

create policy "select_transaction_files_public" on storage.objects for select
  using (bucket_id = 'transaction-files');
create policy "insert_transaction_files_if_approved" on storage.objects for insert
  with check (bucket_id = 'transaction-files' and current_user_status() = 'approved');
create policy "delete_transaction_files_if_owner_or_manager" on storage.objects for delete
  using (bucket_id = 'transaction-files' and current_user_role() in ('owner', 'manager'));
