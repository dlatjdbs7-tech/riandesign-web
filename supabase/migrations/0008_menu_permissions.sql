-- 역할별 메뉴 접근 권한: 대표가 팀장/직원별로 어떤 메뉴를 볼 수 있는지 설정
-- 대표(owner)는 항상 전체 접근 가능하며 이 테이블의 영향을 받지 않는다.
-- /admin(대시보드), /admin/settings(내정보), /admin/team-permissions(이 설정 화면 자체)는
-- 설정 대상이 아니라 항상 고정된 규칙을 코드에서 적용한다.

create table role_menu_permissions (
  role user_role not null,
  menu_key text not null,
  can_view boolean not null default true,
  primary key (role, menu_key)
);

alter table role_menu_permissions enable row level security;

create policy "select_menu_permissions_if_approved" on role_menu_permissions for select
  using (current_user_status() = 'approved');
create policy "manage_menu_permissions_if_owner" on role_menu_permissions for all
  using (current_user_role() = 'owner' and current_user_status() = 'approved');

-- 팀장: 기존 동작과 동일하게 전체 메뉴 접근 가능한 상태로 시작
insert into role_menu_permissions (role, menu_key, can_view)
select 'manager'::user_role, key, true
from unnest(array[
  '/admin/quotes', '/admin/work-orders', '/admin/customer-pages', '/admin/transactions',
  '/admin/customers', '/admin/as-requests', '/admin/attendance', '/admin/work-logs',
  '/admin/materials', '/admin/templates', '/admin/quick-phrases',
  '/admin/employees', '/admin/vendors', '/admin/categories',
  '/admin/site-management', '/admin/inquiries', '/admin/portfolio',
  '/admin/finance', '/admin/approvals', '/admin/work-sites',
  '/admin/company-settings', '/admin/notifications', '/admin/billing'
]) as key;

-- 직원: 기존 동작과 동일하게 "관리 전용" 항목은 안 보이는 상태로 시작
insert into role_menu_permissions (role, menu_key, can_view)
select 'employee'::user_role, key, true
from unnest(array[
  '/admin/quotes', '/admin/work-orders', '/admin/customer-pages', '/admin/transactions',
  '/admin/customers', '/admin/as-requests', '/admin/attendance', '/admin/work-logs',
  '/admin/materials', '/admin/templates', '/admin/quick-phrases',
  '/admin/vendors', '/admin/categories', '/admin/portfolio', '/admin/company-settings'
]) as key;

insert into role_menu_permissions (role, menu_key, can_view)
select 'employee'::user_role, key, false
from unnest(array[
  '/admin/employees', '/admin/site-management', '/admin/inquiries',
  '/admin/finance', '/admin/approvals', '/admin/work-sites',
  '/admin/notifications', '/admin/billing'
]) as key;
