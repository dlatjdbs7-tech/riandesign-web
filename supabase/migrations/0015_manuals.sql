create table manuals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  created_by uuid references profiles (id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table manuals enable row level security;

create policy "select_manuals_if_approved" on manuals for select
  using (current_user_status() = 'approved');

create policy "manage_manuals_if_owner_or_manager" on manuals for all
  using (current_user_role() in ('owner', 'manager') and current_user_status() = 'approved');
