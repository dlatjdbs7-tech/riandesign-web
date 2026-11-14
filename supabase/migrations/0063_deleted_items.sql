-- 휴지통: 관리자페이지에서 지운 항목을 보관했다가 "되돌리기"로 복구한다.
-- payload = { row: 지운 행, children: { 테이블: [같이 지워진 하위 행] }, refs: [{ table, column, ids }] }
create table if not exists deleted_items (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  label text,
  payload jsonb not null,
  deleted_by uuid references profiles(id) on delete set null,
  deleted_at timestamptz not null default now()
);

create index if not exists deleted_items_deleted_at_idx on deleted_items (deleted_at desc);

alter table deleted_items enable row level security;

-- 본인이 지운 것은 본인이, 대표·팀장은 전부 보고 되돌릴 수 있다.
create policy "select_deleted_items" on deleted_items for select
  using (current_user_status() = 'approved' and (deleted_by = auth.uid() or current_user_role() in ('owner', 'manager')));

create policy "insert_deleted_items" on deleted_items for insert
  with check (current_user_status() = 'approved' and deleted_by = auth.uid());

create policy "delete_deleted_items" on deleted_items for delete
  using (current_user_status() = 'approved' and (deleted_by = auth.uid() or current_user_role() in ('owner', 'manager')));
