alter table work_orders
  add column if not exists payment_contract_vat_included boolean not null default false,
  add column if not exists payment_start_vat_included boolean not null default false,
  add column if not exists payment_interim1_vat_included boolean not null default false,
  add column if not exists payment_interim2_vat_included boolean not null default false,
  add column if not exists payment_balance_vat_included boolean not null default false;
