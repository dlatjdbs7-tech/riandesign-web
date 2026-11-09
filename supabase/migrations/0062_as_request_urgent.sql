-- AS 요청 긴급건 표시
alter table as_requests add column if not exists is_urgent boolean not null default false;
