alter table work_orders
  add column if not exists progress_percent smallint not null default 0
  check (progress_percent between 0 and 100);
