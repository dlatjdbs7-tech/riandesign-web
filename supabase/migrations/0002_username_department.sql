alter table profiles
  add column if not exists username text,
  add column if not exists hire_date date,
  add column if not exists department text;

create unique index if not exists profiles_username_key on profiles (username);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, username, hire_date, department, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'username',
    nullif(new.raw_user_meta_data ->> 'hire_date', '')::date,
    new.raw_user_meta_data ->> 'department',
    'employee',
    'pending'
  );
  return new;
end;
$$;
