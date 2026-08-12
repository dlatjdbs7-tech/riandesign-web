-- 상담 신청 폼을 reandesign.kr 실제 폼과 동일한 항목으로 확장
-- (성함/연락처 외 주소·평형·예산·공사예정일·입주예정일·공사내용·유입경로·첨부파일)

alter table inquiries
  add column address text,
  add column size_py text,
  add column budget text,
  add column construction_date text,
  add column move_in_date text,
  add column construction_items text[],
  add column referral_source text,
  add column floor_plan_url text,
  add column reference_url text;

insert into storage.buckets (id, name, public)
values ('inquiry-files', 'inquiry-files', true)
on conflict (id) do nothing;

create policy "select_inquiry_files_public" on storage.objects for select
  using (bucket_id = 'inquiry-files');
create policy "anyone_can_upload_inquiry_files" on storage.objects for insert
  with check (bucket_id = 'inquiry-files');
create policy "delete_inquiry_files_if_owner_or_manager" on storage.objects for delete
  using (bucket_id = 'inquiry-files' and current_user_role() in ('owner', 'manager'));
