create type todo_status as enum ('pending', 'in_progress', 'done');

create table todos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  assignee_id uuid references profiles (id) on delete set null,
  due_date date,
  status todo_status not null default 'pending',
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

alter table todos enable row level security;

create policy "select_todos_if_approved" on todos for select
  using (current_user_status() = 'approved');

create policy "insert_todos_if_approved" on todos for insert
  with check (current_user_status() = 'approved' and created_by = auth.uid());

create policy "update_todos_if_owner_manager_or_involved" on todos for update
  using (
    (current_user_role() in ('owner', 'manager') and current_user_status() = 'approved')
    or assignee_id = auth.uid()
    or created_by = auth.uid()
  );

create policy "delete_todos_if_owner_manager_or_creator" on todos for delete
  using (
    (current_user_role() in ('owner', 'manager') and current_user_status() = 'approved')
    or created_by = auth.uid()
  );
