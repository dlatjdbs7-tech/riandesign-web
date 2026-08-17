alter table work_logs add column if not exists week_start_date date;
create unique index if not exists work_logs_author_week_unique on work_logs (author_id, week_start_date);
