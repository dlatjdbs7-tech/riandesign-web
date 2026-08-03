-- 고객페이지: 작업지시서별 공개 링크로 현장 사진을 공유하는 기능
-- 보안 설계: work_order_photos/work_orders에는 익명 사용자용 select 정책을 두지 않는다.
-- 대신 security definer 함수로 "특정 id 하나만" 조회 가능하게 해서,
-- anon 키로 테이블을 통째로 긁어가는 것을 원천 차단한다.

create table work_order_photos (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_orders (id) on delete cascade,
  image_url text not null,
  caption text,
  created_at timestamptz not null default now()
);

alter table work_order_photos enable row level security;

create policy "select_photos_if_owner_manager_or_assignee" on work_order_photos for select
  using (
    (current_user_role() in ('owner', 'manager') and current_user_status() = 'approved')
    or exists (
      select 1 from work_orders wo
      where wo.id = work_order_photos.work_order_id and wo.assignee_id = auth.uid()
    )
  );

create policy "insert_photos_if_owner_manager_or_assignee" on work_order_photos for insert
  with check (
    (current_user_role() in ('owner', 'manager') and current_user_status() = 'approved')
    or exists (
      select 1 from work_orders wo
      where wo.id = work_order_photos.work_order_id and wo.assignee_id = auth.uid()
    )
  );

create policy "delete_photos_if_owner_or_manager" on work_order_photos for delete
  using (current_user_role() in ('owner', 'manager') and current_user_status() = 'approved');

-- 공개 조회용 함수 (링크로 접속한 고객 전용, id를 모르면 아무것도 못 봄)
create or replace function public.get_public_project(project_id uuid)
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
  select wo.id, wo.title, wo.status, wo.work_date,
         coalesce(c.name, wo.client_name, '고객님') as customer_name
  from work_orders wo
  left join customers c on c.id = wo.customer_id
  where wo.id = project_id
$$;

create or replace function public.get_public_project_photos(project_id uuid)
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
  from work_order_photos
  where work_order_id = project_id
  order by created_at desc
$$;

grant execute on function public.get_public_project(uuid) to anon, authenticated;
grant execute on function public.get_public_project_photos(uuid) to anon, authenticated;
