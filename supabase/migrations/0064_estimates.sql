-- 웹 견적서: 품목 라이브러리 + 견적서 + 견적 줄
-- 계산은 리안 엑셀 양식(Ver 6.0)과 같다: 줄 금액 = 수량 × 단가(원 미만 버림)
--   경비·공과잡비 = 재료비 × 비율, 기업이윤 = (재료비 + 노무비) × 비율, 부가세 = (직접 + 간접) × 비율, 최종 = 절사 단위 미만 버림

create table if not exists estimate_items (
  id uuid primary key default gen_random_uuid(),
  category text not null,            -- 공종 (허가및공통가설, 철거및습식, ...)
  subcategory text,                  -- 세부공종 (1-1 허가사항 ...)
  name text not null,                -- 품명
  spec text,                         -- 규격
  unit text,                         -- 단위
  material_price numeric not null default 0,
  labor_price numeric not null default 0,
  price_kind text not null default '견적가',  -- 견적가 / 매입가 / 업체가
  simple_qty numeric,                -- 간단 양식 기본 수량 (null = 간단 양식에 없음)
  qty_basis text,                    -- 수량 기준 (평수, 전용면적 m2, 욕실 수 ...)
  note text,
  source text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists estimates (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'detail',          -- detail(상세) / simple(간단)
  title text not null,                          -- 공사명
  customer_name text,
  customer_phone text,
  site_address text,
  area_py numeric,
  area_m2 numeric,
  quote_date date not null default current_date,
  status text not null default 'draft',         -- draft 작성중 / sent 발송 / approved 승인
  expense_rate numeric not null default 2,      -- 경비 (재료비의 %)
  misc_rate numeric not null default 3,         -- 공과잡비 (재료비의 %)
  profit_rate numeric not null default 5,       -- 기업이윤 (재료+노무의 %)
  vat_rate numeric not null default 10,
  vat_included boolean not null default true,   -- false = 부가세 별도
  round_unit integer not null default 100000,   -- 절사 단위
  notes text,                                   -- 비고 (포함·불포함 등)
  total_amount numeric,                         -- 저장 시 계산한 최종 금액
  share_token uuid not null default gen_random_uuid() unique,
  inquiry_id uuid references inquiries(id) on delete set null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists estimate_lines (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references estimates(id) on delete cascade,
  item_id uuid references estimate_items(id) on delete set null,
  category text not null,
  subcategory text,
  name text not null,
  spec text,
  unit text,
  qty numeric not null default 1,
  material_price numeric not null default 0,
  labor_price numeric not null default 0,
  note text,
  sort_order integer not null default 0
);

create index if not exists estimate_lines_estimate_idx on estimate_lines (estimate_id);
create index if not exists estimate_items_category_idx on estimate_items (category, sort_order);

alter table estimate_items enable row level security;
alter table estimates enable row level security;
alter table estimate_lines enable row level security;

-- 승인된 직원은 모두 보고 견적을 만들 수 있다. 품목 라이브러리 수정은 대표·팀장만.
create policy "select_estimate_items" on estimate_items for select using (current_user_status() = 'approved');
create policy "manage_estimate_items" on estimate_items for all
  using (current_user_role() in ('owner', 'manager') and current_user_status() = 'approved');

create policy "select_estimates" on estimates for select using (current_user_status() = 'approved');
create policy "manage_estimates" on estimates for all using (current_user_status() = 'approved');

create policy "select_estimate_lines" on estimate_lines for select using (current_user_status() = 'approved');
create policy "manage_estimate_lines" on estimate_lines for all using (current_user_status() = 'approved');

-- ── 고객 링크 (/estimate/<share_token>) ──────────────────────────────
-- 고객은 로그인하지 않는다. 링크 주소(토큰) + 전화번호 뒤 4자리가 맞고, 보낸 뒤 3일 안일 때만 볼 수 있다.
-- 모든 확인은 아래 함수(DB) 안에서 한다.
alter table estimates add column if not exists viewed_at timestamptz;
alter table estimates add column if not exists view_count integer not null default 0;
alter table estimates add column if not exists approved_name text;
alter table estimates add column if not exists approved_at timestamptz;
alter table estimates add column if not exists share_expires_at timestamptz;   -- 보낸 시각 + 3일

-- 링크 확인 결과: ok / not_found / not_sent / expired / phone_mismatch
create or replace function public.check_shared_estimate(p_token uuid, p_phone text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  e estimates%rowtype;
begin
  select * into e from estimates where share_token = p_token;
  if not found then return 'not_found'; end if;
  if e.share_expires_at is null then return 'not_sent'; end if;
  if e.share_expires_at < now() then return 'expired'; end if;
  -- 비밀번호 = 고객 전화번호 뒤 4자리
  if length(regexp_replace(coalesce(e.customer_phone, ''), '\D', '', 'g')) < 4
     or right(regexp_replace(e.customer_phone, '\D', '', 'g'), 4) <> regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') then
    return 'phone_mismatch';
  end if;
  return 'ok';
end;
$$;

-- 링크가 만료됐을 때 안내할 회사 전화번호 (견적 내용은 주지 않는다)
create or replace function public.shared_estimate_contact()
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object('company_name', c.company_name, 'phone', c.phone) from company_settings c order by c.id limit 1;
$$;

create or replace function public.get_shared_estimate(p_token uuid, p_phone text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  if public.check_shared_estimate(p_token, p_phone) <> 'ok' then
    return null;
  end if;
  select json_build_object(
    'estimate', json_build_object(
      'kind', e.kind, 'title', e.title, 'customer_name', e.customer_name, 'site_address', e.site_address,
      'area_py', e.area_py, 'area_m2', e.area_m2, 'quote_date', e.quote_date, 'status', e.status,
      'expense_rate', e.expense_rate, 'misc_rate', e.misc_rate, 'profit_rate', e.profit_rate,
      'vat_rate', e.vat_rate, 'vat_included', e.vat_included, 'round_unit', e.round_unit, 'notes', e.notes,
      'approved_name', e.approved_name, 'approved_at', e.approved_at, 'share_expires_at', e.share_expires_at
    ),
    'lines', coalesce((
      select json_agg(json_build_object(
        'category', l.category, 'subcategory', l.subcategory, 'name', l.name, 'spec', l.spec, 'unit', l.unit,
        'qty', l.qty, 'material_price', l.material_price, 'labor_price', l.labor_price, 'note', l.note
      ) order by l.sort_order)
      from estimate_lines l where l.estimate_id = e.id
    ), '[]'::json),
    'company', (
      select json_build_object('company_name', c.company_name, 'business_registration_number', c.business_registration_number,
        'representative_name', c.representative_name, 'address', c.address, 'phone', c.phone, 'email', c.email)
      from company_settings c order by c.id limit 1
    )
  ) into result
  from estimates e
  where e.share_token = p_token;
  return result;
end;
$$;

create or replace function public.mark_estimate_viewed(p_token uuid, p_phone text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.check_shared_estimate(p_token, p_phone) = 'ok' then
    update estimates set viewed_at = now(), view_count = view_count + 1 where share_token = p_token;
  end if;
end;
$$;

create or replace function public.approve_shared_estimate(p_token uuid, p_phone text, p_name text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.check_shared_estimate(p_token, p_phone) <> 'ok' or coalesce(trim(p_name), '') = '' then
    return false;
  end if;
  update estimates
     set status = 'approved', approved_name = left(trim(p_name), 50), approved_at = now()
   where share_token = p_token and status <> 'approved';
  return found;
end;
$$;

grant execute on function public.check_shared_estimate(uuid, text) to anon, authenticated;
grant execute on function public.shared_estimate_contact() to anon, authenticated;
grant execute on function public.get_shared_estimate(uuid, text) to anon, authenticated;
grant execute on function public.mark_estimate_viewed(uuid, text) to anon, authenticated;
grant execute on function public.approve_shared_estimate(uuid, text, text) to anon, authenticated;
