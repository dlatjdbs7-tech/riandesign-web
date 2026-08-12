-- 상담 신청 폼 재구성: 고객정보/공간정보 섹션에 필요한 항목 추가
alter table inquiries add column floor_plan_type text; -- 평면 타입 (예: 84A)
alter table inquiries add column visit_date text; -- 상담·방문 희망일
alter table inquiries add column visit_time text; -- 상담 희망 시간
alter table inquiries add column space_type text; -- 공간유형 (아파트/단독주택/빌라 등)
