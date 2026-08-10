-- 수금액을 단일 금액 대신 5단계 분할 입금으로 관리
alter table work_orders add column payment_contract numeric;
alter table work_orders add column payment_start numeric;
alter table work_orders add column payment_interim1 numeric;
alter table work_orders add column payment_interim2 numeric;
alter table work_orders add column payment_balance numeric;
