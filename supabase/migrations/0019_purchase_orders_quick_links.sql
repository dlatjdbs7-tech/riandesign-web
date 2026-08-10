-- 발주서: 단순 메모형 자재/시공 발주 문서
create table purchase_orders (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  vendor_name text,
  site_address text,
  notes text,
  order_date date,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

-- 자주쓰는링크: 카테고리별로 묶어서 보여주는 제목+URL 목록
create table quick_links (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  category text,
  display_order integer not null default 0,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

alter table purchase_orders enable row level security;
alter table quick_links enable row level security;

create policy "select_purchase_orders_if_approved" on purchase_orders for select
  using (current_user_status() = 'approved');
create policy "manage_purchase_orders_if_owner_or_manager" on purchase_orders for all
  using (current_user_role() in ('owner', 'manager') and current_user_status() = 'approved');

create policy "select_quick_links_if_approved" on quick_links for select
  using (current_user_status() = 'approved');
create policy "manage_quick_links_if_owner_or_manager" on quick_links for all
  using (current_user_role() in ('owner', 'manager') and current_user_status() = 'approved');
