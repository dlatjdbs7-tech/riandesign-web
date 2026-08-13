alter table quotes add column if not exists inquiry_id uuid references inquiries(id) on delete set null;
alter table work_orders add column if not exists quote_id uuid references quotes(id) on delete set null;
