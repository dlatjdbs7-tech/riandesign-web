-- 직급별(이사/실장/팀장/과장/대리/주임/사원) 메뉴 접근 권한.
-- 대표가 체크한 메뉴만 해당 직급에게 보인다 (행이 없으면 기본값은 "숨김").
-- 직급이 아직 없는 직원(job_rank is null)은 기존 role_menu_permissions 로직을 그대로 따른다.

create table job_rank_menu_permissions (
  job_rank text not null,
  menu_key text not null,
  can_view boolean not null default true,
  primary key (job_rank, menu_key)
);

alter table job_rank_menu_permissions enable row level security;

create policy "select_job_rank_menu_permissions_if_approved" on job_rank_menu_permissions for select
  using (current_user_status() = 'approved');
create policy "manage_job_rank_menu_permissions_if_owner" on job_rank_menu_permissions for all
  using (current_user_role() = 'owner' and current_user_status() = 'approved');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, username, hire_date, department, job_rank, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'username',
    nullif(new.raw_user_meta_data ->> 'hire_date', '')::date,
    new.raw_user_meta_data ->> 'department',
    new.raw_user_meta_data ->> 'job_rank',
    'employee',
    'pending'
  );
  return new;
end;
$$;
