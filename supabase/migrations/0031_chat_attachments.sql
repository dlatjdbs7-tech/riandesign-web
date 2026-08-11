-- 채팅 이미지/파일 첨부 지원

alter table chat_messages add column if not exists attachment_url text;
alter table chat_messages add column if not exists attachment_name text;
alter table chat_messages add column if not exists attachment_type text;
alter table chat_messages alter column content drop not null;

insert into storage.buckets (id, name, public)
values ('chat-files', 'chat-files', true)
on conflict (id) do nothing;

create policy "select_chat_files_public" on storage.objects for select
  using (bucket_id = 'chat-files');
create policy "insert_chat_files_if_approved" on storage.objects for insert
  with check (bucket_id = 'chat-files' and current_user_status() = 'approved');
