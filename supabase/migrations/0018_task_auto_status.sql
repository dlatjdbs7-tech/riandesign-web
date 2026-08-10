-- 공정표 단계의 상태를 기본적으로 날짜 기준 자동 계산하되, 특이사항이 있으면 수기로 고정할 수 있게 함
alter table work_order_tasks add column auto_status boolean not null default true;
