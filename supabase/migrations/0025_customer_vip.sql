-- 고객·우수회원: VIP 표시
alter table customers add column is_vip boolean not null default false;
