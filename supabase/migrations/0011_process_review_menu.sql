-- 신규 관리자 메뉴(시공프로세스/고객후기) 접근 권한: 사이트관리와 동일하게 팀장만 기본 허용

insert into role_menu_permissions (role, menu_key, can_view)
values
  ('manager', '/admin/process', true),
  ('employee', '/admin/process', false),
  ('manager', '/admin/reviews', true),
  ('employee', '/admin/reviews', false);
