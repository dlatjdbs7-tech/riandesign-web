create table page_views (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  path text not null,
  created_at timestamptz not null default now()
);

create index page_views_created_at_idx on page_views (created_at);
create index page_views_visitor_id_idx on page_views (visitor_id);

alter table page_views enable row level security;

create policy "anyone_can_log_page_view" on page_views for insert
  with check (true);
create policy "select_page_views_if_owner_or_manager" on page_views for select
  using (current_user_role() in ('owner', 'manager') and current_user_status() = 'approved');
