create table work_order_tasks (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_orders (id) on delete cascade,
  title text not null,
  start_date date,
  end_date date,
  display_order integer not null default 0,
  status work_order_status not null default 'pending',
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create index work_order_tasks_work_order_id_idx on work_order_tasks (work_order_id);

alter table work_order_tasks enable row level security;

create policy "select_work_order_tasks_if_approved" on work_order_tasks for select
  using (current_user_status() = 'approved');
create policy "insert_work_order_tasks_if_owner_manager_or_assignee" on work_order_tasks for insert
  with check (
    current_user_status() = 'approved'
    and (
      current_user_role() in ('owner', 'manager')
      or exists (
        select 1 from work_orders
        where work_orders.id = work_order_tasks.work_order_id
        and work_orders.assignee_id = auth.uid()
      )
    )
  );
create policy "update_work_order_tasks_if_owner_manager_or_assignee" on work_order_tasks for update
  using (
    current_user_status() = 'approved'
    and (
      current_user_role() in ('owner', 'manager')
      or exists (
        select 1 from work_orders
        where work_orders.id = work_order_tasks.work_order_id
        and work_orders.assignee_id = auth.uid()
      )
    )
  );
create policy "delete_work_order_tasks_if_owner_or_manager" on work_order_tasks for delete
  using (current_user_role() in ('owner', 'manager') and current_user_status() = 'approved');
