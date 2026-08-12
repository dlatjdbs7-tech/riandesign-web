-- 작업지시(work_directives): 대표/팀장이 직원에게 내리는 업무 지시.
-- 기존 work_orders(현장/시공 추적용)와는 완전히 별개의 기능이다.

create type work_directive_status as enum ('pending', 'in_progress', 'completed');

create table work_directives (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text,
  assignee_id uuid references profiles (id) on delete set null,
  due_date date,
  status work_directive_status not null default 'pending',
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

alter table work_directives enable row level security;

create policy "select_directives_if_approved" on work_directives for select
  using (current_user_status() = 'approved');

create policy "insert_directives_if_owner_or_manager" on work_directives for insert
  with check (current_user_role() in ('owner', 'manager') and current_user_status() = 'approved');

create policy "update_directives_if_owner_manager_or_involved" on work_directives for update
  using (
    (current_user_role() in ('owner', 'manager') and current_user_status() = 'approved')
    or assignee_id = auth.uid()
    or created_by = auth.uid()
  );

create policy "delete_directives_if_owner_manager_or_creator" on work_directives for delete
  using (
    (current_user_role() in ('owner', 'manager') and current_user_status() = 'approved')
    or created_by = auth.uid()
  );
