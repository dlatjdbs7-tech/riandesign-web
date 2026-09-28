alter table page_views add column if not exists referrer_host text;
alter table page_views add column if not exists utm_source text;
