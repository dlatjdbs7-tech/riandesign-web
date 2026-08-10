alter table work_orders
  add column if not exists payment_contract_date date,
  add column if not exists payment_start_date date,
  add column if not exists payment_interim1_date date,
  add column if not exists payment_interim2_date date,
  add column if not exists payment_balance_date date;
