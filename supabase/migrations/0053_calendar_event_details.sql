alter table calendar_events add column if not exists category text not null default '행사';
alter table calendar_events add column if not exists meeting_type text;
alter table calendar_events add column if not exists event_time text;
alter table calendar_events add column if not exists site_name text;
alter table calendar_events add column if not exists team text;
