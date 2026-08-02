create type work_order_status as enum ('pending', 'in_progress', 'completed');

create table work_orders (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  client_name text,
  site_address text,
  work_date date,
  description text,
  assignee_id uuid references profiles (id) on delete set null,
  status work_order_status not null default 'pending',
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create table work_logs (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid references work_orders (id) on delete cascade,
  author_id uuid not null references profiles (id),
  log_date date not null default current_date,
  content text not null,
  created_at timestamptz not null default now()
);

alter table work_orders enable row level security;
alter table work_logs enable row level security;

create policy "select_work_orders_if_approved" on work_orders for select
  using (current_user_status() = 'approved');
create policy "insert_work_orders_if_owner_or_manager" on work_orders for insert
  with check (current_user_role() in ('owner', 'manager') and current_user_status() = 'approved');
create policy "update_work_orders_if_owner_manager_or_assignee" on work_orders for update
  using (
    current_user_status() = 'approved'
    and (current_user_role() in ('owner', 'manager') or assignee_id = auth.uid())
  );
create policy "delete_work_orders_if_owner_or_manager" on work_orders for delete
  using (current_user_role() in ('owner', 'manager') and current_user_status() = 'approved');

create policy "select_own_work_logs" on work_logs for select
  using (author_id = auth.uid());
create policy "select_all_work_logs_if_owner" on work_logs for select
  using (current_user_role() = 'owner' and current_user_status() = 'approved');
create policy "select_team_work_logs_if_manager" on work_logs for select
  using (
    current_user_role() = 'manager' and current_user_status() = 'approved'
    and author_id in (select id from profiles where team_id = current_user_team_id())
  );
create policy "insert_own_work_logs" on work_logs for insert
  with check (author_id = auth.uid() and current_user_status() = 'approved');
create policy "update_own_work_logs" on work_logs for update
  using (author_id = auth.uid());
create policy "delete_own_work_logs" on work_logs for delete
  using (author_id = auth.uid());
