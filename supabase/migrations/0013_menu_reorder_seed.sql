-- 새로 추가된 메뉴(유입분석/리안메뉴얼/캘린더/현장관리/할일/알림센터)의 기본 권한 설정
-- 팀장은 전체 접근, 직원은 유입분석(경영 데이터)만 제외하고 접근 가능하게 시작

insert into role_menu_permissions (role, menu_key, can_view)
select 'manager'::user_role, key, true
from unnest(array[
  '/admin/analytics', '/admin/manual', '/admin/calendar',
  '/admin/field-management', '/admin/todos', '/admin/notification-center'
]) as key
on conflict (role, menu_key) do nothing;

insert into role_menu_permissions (role, menu_key, can_view)
select 'employee'::user_role, key, true
from unnest(array[
  '/admin/manual', '/admin/calendar',
  '/admin/field-management', '/admin/todos', '/admin/notification-center'
]) as key
on conflict (role, menu_key) do nothing;

insert into role_menu_permissions (role, menu_key, can_view)
values ('employee', '/admin/analytics', false)
on conflict (role, menu_key) do nothing;
