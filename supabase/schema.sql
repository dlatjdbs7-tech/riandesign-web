-- 리안디자인 관리자 시스템 DB 스키마
-- Supabase SQL Editor에서 전체를 한 번에 실행합니다.

create type user_role as enum ('owner', 'manager', 'employee');
create type approval_status as enum ('pending', 'approved', 'rejected');

create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone text,
  role user_role not null default 'employee',
  status approval_status not null default 'pending',
  team_id uuid references teams (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table teams
  add column manager_id uuid references profiles (id) on delete set null;

create table work_sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  latitude double precision not null,
  longitude double precision not null,
  radius_meters int not null default 200,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create table attendance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  work_site_id uuid references work_sites (id),
  check_in_at timestamptz,
  check_out_at timestamptz,
  check_in_lat double precision,
  check_in_lng double precision,
  check_out_lat double precision,
  check_out_lng double precision,
  created_at timestamptz not null default now()
);

-- 회원가입 시 자동으로 profiles 행 생성 (기본값: 일반직원 / 승인대기)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.raw_user_meta_data ->> 'phone',
    'employee',
    'pending'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- RLS 정책에서 profiles를 재귀 조회하면 무한루프가 나기 때문에,
-- security definer 함수로 현재 로그인한 사용자의 권한을 우회 조회한다.
create or replace function public.current_user_role()
returns user_role
language sql security definer set search_path = public stable
as $$ select role from profiles where id = auth.uid() $$;

create or replace function public.current_user_status()
returns approval_status
language sql security definer set search_path = public stable
as $$ select status from profiles where id = auth.uid() $$;

create or replace function public.current_user_team_id()
returns uuid
language sql security definer set search_path = public stable
as $$ select team_id from profiles where id = auth.uid() $$;

-- 일반 직원이 본인 프로필의 role/status/team_id를 스스로 바꾸지 못하도록 차단
create or replace function public.prevent_self_privilege_escalation()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if public.current_user_role() <> 'owner' then
    if new.role is distinct from old.role
       or new.status is distinct from old.status
       or (new.team_id is distinct from old.team_id and public.current_user_role() <> 'manager') then
      raise exception '권한 변경은 대표만 가능합니다';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_prevent_privilege_escalation
before update on profiles
for each row execute function public.prevent_self_privilege_escalation();

alter table profiles enable row level security;
alter table teams enable row level security;
alter table work_sites enable row level security;
alter table attendance_records enable row level security;

-- profiles
create policy "select_own_profile" on profiles for select
  using (id = auth.uid());
create policy "select_all_if_owner" on profiles for select
  using (current_user_role() = 'owner' and current_user_status() = 'approved');
create policy "select_team_if_manager" on profiles for select
  using (current_user_role() = 'manager' and current_user_status() = 'approved' and team_id = current_user_team_id());
create policy "insert_own_profile" on profiles for insert
  with check (id = auth.uid());
create policy "update_own_profile" on profiles for update
  using (id = auth.uid());
create policy "update_all_if_owner" on profiles for update
  using (current_user_role() = 'owner' and current_user_status() = 'approved');
create policy "update_team_if_manager" on profiles for update
  using (current_user_role() = 'manager' and current_user_status() = 'approved' and team_id = current_user_team_id());

-- teams (팀 이름은 승인된 사용자라면 누구나 조회 가능, 생성/관리는 대표만)
create policy "select_teams_if_approved" on teams for select
  using (current_user_status() = 'approved');
create policy "manage_teams_if_owner" on teams for all
  using (current_user_role() = 'owner' and current_user_status() = 'approved');

-- work_sites (조회는 승인된 사용자, 등록/관리는 대표·팀장)
create policy "select_work_sites_if_approved" on work_sites for select
  using (current_user_status() = 'approved');
create policy "manage_work_sites_if_owner_or_manager" on work_sites for all
  using (current_user_role() in ('owner', 'manager') and current_user_status() = 'approved');

-- attendance_records
create policy "select_own_attendance" on attendance_records for select
  using (user_id = auth.uid());
create policy "select_all_attendance_if_owner" on attendance_records for select
  using (current_user_role() = 'owner' and current_user_status() = 'approved');
create policy "select_team_attendance_if_manager" on attendance_records for select
  using (
    current_user_role() = 'manager' and current_user_status() = 'approved'
    and user_id in (select id from profiles where team_id = current_user_team_id())
  );
create policy "insert_own_attendance" on attendance_records for insert
  with check (user_id = auth.uid() and current_user_status() = 'approved');
create policy "update_own_attendance" on attendance_records for update
  using (user_id = auth.uid());
