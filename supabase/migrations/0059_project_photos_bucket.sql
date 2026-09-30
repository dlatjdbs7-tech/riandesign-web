-- 고객페이지 현장 사진을 URL 입력 대신 파일로 직접 업로드하기 위한 버킷.
insert into storage.buckets (id, name, public)
values ('project-photos', 'project-photos', true)
on conflict (id) do nothing;

create policy "select_project_photos_public" on storage.objects for select
  using (bucket_id = 'project-photos');
create policy "insert_project_photos_if_approved" on storage.objects for insert
  with check (bucket_id = 'project-photos' and current_user_status() = 'approved');
create policy "delete_project_photos_if_owner_or_manager" on storage.objects for delete
  using (bucket_id = 'project-photos' and current_user_role() in ('owner', 'manager'));
