-- 현장관리: 신규/상담/견적/진행중/마감/취소·보류 파이프라인
alter type work_order_status add value 'cancelled';
alter type work_order_status add value 'on_hold';

alter table work_orders add column contract_amount numeric;
alter table work_orders add column paid_amount numeric not null default 0;
alter table work_orders add column material_order_date date;
alter table work_orders add column work_end_date date;
