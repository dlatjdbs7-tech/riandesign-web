-- PROJECTS / PEOPLE
create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  address text,
  memo text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create type quote_status as enum ('draft', 'sent', 'accepted', 'rejected');
create table quotes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers (id) on delete set null,
  title text not null,
  amount numeric,
  status quote_status not null default 'draft',
  quote_date date not null default current_date,
  memo text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create type transaction_status as enum ('unpaid', 'partial', 'paid');
create table transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers (id) on delete set null,
  title text not null,
  amount numeric not null default 0,
  status transaction_status not null default 'unpaid',
  transaction_date date not null default current_date,
  memo text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create type as_status as enum ('received', 'in_progress', 'completed');
create table as_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers (id) on delete set null,
  title text not null,
  description text,
  status as_status not null default 'received',
  request_date date not null default current_date,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

-- LIBRARY
create table materials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  spec text,
  unit text,
  unit_price numeric,
  supplier text,
  created_at timestamptz not null default now()
);

create table quick_phrases (
  id uuid primary key default gen_random_uuid(),
  category text,
  content text not null,
  created_at timestamptz not null default now()
);

-- PEOPLE
create table vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text,
  category text,
  memo text,
  created_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text,
  created_at timestamptz not null default now()
);

-- MARKETING
create type inquiry_status as enum ('new', 'contacted', 'closed');
create table inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  message text,
  status inquiry_status not null default 'new',
  created_at timestamptz not null default now()
);

create table portfolio_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  image_url text,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

-- SETTINGS
create table company_settings (
  id int primary key default 1,
  company_name text,
  business_registration_number text,
  representative_name text,
  address text,
  phone text,
  email text,
  logo_url text,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into company_settings (id, company_name, business_registration_number, representative_name, address, phone, email)
values (1, '리안디자인', '592-05-01726', '임상혁', '대전광역시 서구 도안중로305번안길 7-17, 101호', '042-721-9714', 'red7@hanmail.net');

alter table customers enable row level security;
alter table quotes enable row level security;
alter table transactions enable row level security;
alter table as_requests enable row level security;
alter table materials enable row level security;
alter table quick_phrases enable row level security;
alter table vendors enable row level security;
alter table categories enable row level security;
alter table inquiries enable row level security;
alter table portfolio_items enable row level security;
alter table company_settings enable row level security;

-- 승인된 직원 누구나 열람, 등록/수정/삭제는 대표·팀장만
do $$
declare
  t text;
begin
  foreach t in array array['customers', 'quotes', 'transactions', 'as_requests', 'materials', 'quick_phrases', 'vendors', 'categories']
  loop
    execute format('create policy "select_%1$s_if_approved" on %1$s for select using (current_user_status() = ''approved'')', t);
    execute format('create policy "manage_%1$s_if_owner_or_manager" on %1$s for all using (current_user_role() in (''owner'', ''manager'') and current_user_status() = ''approved'')', t);
  end loop;
end $$;

-- 접수관리: 홈페이지 방문자가 로그인 없이 문의를 등록할 수 있어야 함
create policy "anyone_can_submit_inquiry" on inquiries for insert
  with check (true);
create policy "select_inquiries_if_owner_or_manager" on inquiries for select
  using (current_user_role() in ('owner', 'manager') and current_user_status() = 'approved');
create policy "manage_inquiries_if_owner_or_manager" on inquiries for update
  using (current_user_role() in ('owner', 'manager') and current_user_status() = 'approved');
create policy "delete_inquiries_if_owner_or_manager" on inquiries for delete
  using (current_user_role() in ('owner', 'manager') and current_user_status() = 'approved');

-- 포트폴리오: 홈페이지 방문자가 로그인 없이 볼 수 있어야 함
create policy "anyone_can_view_portfolio" on portfolio_items for select
  using (true);
create policy "manage_portfolio_if_owner_or_manager" on portfolio_items for all
  using (current_user_role() in ('owner', 'manager') and current_user_status() = 'approved');

-- 회사설정: 승인된 직원 누구나 조회, 수정은 대표만
create policy "select_company_settings_if_approved" on company_settings for select
  using (current_user_status() = 'approved');
create policy "update_company_settings_if_owner" on company_settings for update
  using (current_user_role() = 'owner' and current_user_status() = 'approved');
