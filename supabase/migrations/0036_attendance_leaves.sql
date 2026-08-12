-- 반차/휴무 등록: 근태 월간 달력에서 특정 날짜를 반차/휴무로 표시하기 위한 테이블.
-- 본인 것은 스스로 등록/삭제할 수 있고, 대표/팀장은 팀원 것도 등록/삭제할 수 있다.

create table attendance_leaves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  leave_date date not null,
  leave_type text not null check (leave_type in ('반차', '휴무')),
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  unique (user_id, leave_date)
);

alter table attendance_leaves enable row level security;

create policy "select_own_leave" on attendance_leaves for select
  using (user_id = auth.uid());
create policy "select_all_leave_if_owner" on attendance_leaves for select
  using (current_user_role() = 'owner' and current_user_status() = 'approved');
create policy "select_team_leave_if_manager" on attendance_leaves for select
  using (
    current_user_role() = 'manager' and current_user_status() = 'approved'
    and user_id in (select id from profiles where team_id = current_user_team_id())
  );

create policy "insert_own_leave" on attendance_leaves for insert
  with check (user_id = auth.uid() and current_user_status() = 'approved');
create policy "insert_any_leave_if_owner_or_manager" on attendance_leaves for insert
  with check (current_user_role() in ('owner', 'manager') and current_user_status() = 'approved');

create policy "delete_own_leave" on attendance_leaves for delete
  using (user_id = auth.uid());
create policy "delete_any_leave_if_owner_or_manager" on attendance_leaves for delete
  using (current_user_role() in ('owner', 'manager') and current_user_status() = 'approved');
