alter table work_orders
  add column if not exists customer_id uuid references customers (id) on delete set null;
