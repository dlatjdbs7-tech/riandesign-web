-- 1. 메뉴 권한 헬퍼: role_menu_permissions에 명시적으로 false가 없으면 허용 (미들웨어 로직과 동일 기준)
create or replace function public.current_user_can_view_menu(key text)
returns boolean
language sql security definer set search_path = public stable
as $$
  select case
    when current_user_role() = 'owner' then true
    else coalesce(
      (select can_view from role_menu_permissions where role = current_user_role() and menu_key = key),
      true
    )
  end
$$;

-- 2. 캘린더 수기 일정
create table calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  memo text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

alter table calendar_events enable row level security;

create policy "select_calendar_events_if_approved" on calendar_events for select
  using (current_user_status() = 'approved');
create policy "insert_calendar_events_if_approved" on calendar_events for insert
  with check (current_user_status() = 'approved' and created_by = auth.uid());
create policy "update_calendar_events_if_owner_manager_or_creator" on calendar_events for update
  using (
    current_user_status() = 'approved'
    and (current_user_role() in ('owner', 'manager') or created_by = auth.uid())
  );
create policy "delete_calendar_events_if_owner_manager_or_creator" on calendar_events for delete
  using (
    current_user_status() = 'approved'
    and (current_user_role() in ('owner', 'manager') or created_by = auth.uid())
  );

-- 3. 작업지시서 없이 만드는 수기 고객페이지(프로젝트)
create table customer_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  customer_name text,
  status work_order_status not null default 'in_progress',
  work_date date,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create table customer_project_photos (
  id uuid primary key default gen_random_uuid(),
  customer_project_id uuid not null references customer_projects (id) on delete cascade,
  image_url text not null,
  caption text,
  created_at timestamptz not null default now()
);

alter table customer_projects enable row level security;
alter table customer_project_photos enable row level security;

create policy "select_customer_projects_if_permitted" on customer_projects for select
  using (current_user_can_view_menu('/admin/customer-pages'));
create policy "insert_customer_projects_if_permitted" on customer_projects for insert
  with check (current_user_can_view_menu('/admin/customer-pages') and current_user_status() = 'approved');
create policy "delete_customer_projects_if_permitted" on customer_projects for delete
  using (current_user_can_view_menu('/admin/customer-pages') and current_user_status() = 'approved');

create policy "select_customer_project_photos_if_permitted" on customer_project_photos for select
  using (current_user_can_view_menu('/admin/customer-pages'));
create policy "insert_customer_project_photos_if_permitted" on customer_project_photos for insert
  with check (current_user_can_view_menu('/admin/customer-pages') and current_user_status() = 'approved');
create policy "delete_customer_project_photos_if_permitted" on customer_project_photos for delete
  using (current_user_can_view_menu('/admin/customer-pages') and current_user_status() = 'approved');

-- 4. 기존 work_order_photos도 담당자 기준 대신 "고객페이지" 메뉴 권한 기준으로 통일
drop policy "select_photos_if_owner_manager_or_assignee" on work_order_photos;
drop policy "insert_photos_if_owner_manager_or_assignee" on work_order_photos;
drop policy "delete_photos_if_owner_or_manager" on work_order_photos;

create policy "select_photos_if_permitted" on work_order_photos for select
  using (current_user_can_view_menu('/admin/customer-pages'));
create policy "insert_photos_if_permitted" on work_order_photos for insert
  with check (current_user_can_view_menu('/admin/customer-pages') and current_user_status() = 'approved');
create policy "delete_photos_if_permitted" on work_order_photos for delete
  using (current_user_can_view_menu('/admin/customer-pages') and current_user_status() = 'approved');

-- 5. 공개 페이지용 함수 (수기 프로젝트)
create or replace function public.get_public_manual_project(project_id uuid)
returns table (
  id uuid,
  title text,
  status work_order_status,
  work_date date,
  customer_name text
)
language sql
security definer
set search_path = public
stable
as $$
  select id, title, status, work_date, coalesce(customer_name, '고객님')
  from customer_projects
  where id = project_id
$$;

create or replace function public.get_public_manual_project_photos(project_id uuid)
returns table (
  id uuid,
  image_url text,
  caption text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select id, image_url, caption, created_at
  from customer_project_photos
  where customer_project_id = project_id
  order by created_at desc
$$;

grant execute on function public.get_public_manual_project(uuid) to anon, authenticated;
grant execute on function public.get_public_manual_project_photos(uuid) to anon, authenticated;
