-- 공정(work_order_tasks) 수정 시각을 추적해서, 일정이 최근에 바뀐 현장을
-- 현장관리 카드에서 "일정 업데이트됨"으로 표시할 수 있게 한다.
alter table work_order_tasks add column if not exists updated_at timestamptz not null default now();
update work_order_tasks set updated_at = created_at;
