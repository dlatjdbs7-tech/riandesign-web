-- 자주쓰는링크를 URL 중심 3단 칸반으로 전환: 상태(발주/발주대기/참조)로 구분
alter table quick_links add column status purchase_order_status not null default 'pending';
