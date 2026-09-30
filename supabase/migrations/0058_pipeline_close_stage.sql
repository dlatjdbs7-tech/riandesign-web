-- 신규/상담 단계에서 마감(포기)된 문의는 같은 inquiries.status='closed'로 모이기 때문에,
-- 어느 단계에서 마감됐는지 별도로 기록해야 유입분석에서 단계별로 구분할 수 있다.
alter table inquiries add column if not exists closed_stage text;

-- work_orders.status='cancelled'는 "계약 성사 전 마감"과 "시공 도중 취소"를 구분하지 못하므로,
-- 계약(pending) 단계에서 마감 버튼으로 취소된 경우만 표시해둔다.
alter table work_orders add column if not exists cancelled_at_stage text;
